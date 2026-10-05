import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';

export interface SqlLogEntry {
  timestamp: string;
  type: 'WRITE_QUERY' | 'READ_QUERY' | 'TX_BEGIN' | 'TX_COMMIT' | 'TX_ROLLBACK' | 'SQL_ERROR';
  query?: string;
  paramsSummary?: string;
  rowCount?: number;
  durationMs?: number;
  error?: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
}

export interface RequestLogContext {
  reqId: string;
  method: string;
  url: string;
  startTime: number;
  ip?: string;
  userId?: string;
  bodySummary?: any;
  sqlLogs: SqlLogEntry[];
  hasTransaction: boolean;
  txCommitted: boolean;
  txRolledBack: boolean;
}

export const requestContextStorage = new AsyncLocalStorage<RequestLogContext>();

let reqCounter = 0;

/**
 * Redact sensitive fields like passwords, PINs, secret keys from logs
 */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const clean: Record<string, any> = {};
  const sensitiveKeys = new Set(['password', 'pin', 'password_hash', 'pinHash', 'secret', 'qr_secret', 'qrSecret', 'authorization']);

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizePayload(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Record a SQL query or transaction event to the active HTTP request context
 */
export function recordSqlEvent(entry: Omit<SqlLogEntry, 'timestamp'>) {
  const context = requestContextStorage.getStore();
  const fullEntry: SqlLogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };

  if (entry.type === 'TX_BEGIN') {
    if (context) context.hasTransaction = true;
    console.log(`\x1b[36m[SQL TX START]\x1b[0m ${context ? `[${context.reqId}]` : ''} Transaction BEGIN`);
  } else if (entry.type === 'TX_COMMIT') {
    if (context) {
      context.hasTransaction = true;
      context.txCommitted = true;
    }
    console.log(`\x1b[32m[SQL TX COMMIT]\x1b[0m ${context ? `[${context.reqId}]` : ''} Transaction COMMITTED successfully (${entry.durationMs ?? 0}ms)`);
  } else if (entry.type === 'TX_ROLLBACK') {
    if (context) {
      context.hasTransaction = true;
      context.txRolledBack = true;
    }
    console.log(`\x1b[31m[SQL TX ROLLBACK]\x1b[0m ${context ? `[${context.reqId}]` : ''} Transaction ROLLED BACK ${entry.error ? `(Reason: ${entry.error})` : ''}`);
  } else if (entry.type === 'WRITE_QUERY') {
    const preview = (entry.query || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    console.log(`\x1b[33m[SQL WRITE]\x1b[0m ${context ? `[${context.reqId}]` : ''} ${preview} -> Rows: ${entry.rowCount ?? 0} (${entry.durationMs ?? 0}ms)`);
  } else if (entry.type === 'SQL_ERROR') {
    console.error(`\x1b[41m\x1b[37m[SQL ERROR]\x1b[0m ${context ? `[${context.reqId}]` : ''} Query failed: ${entry.error}`);
  }

  if (context) {
    context.sqlLogs.push(fullEntry);
  }
}

/**
 * Express middleware to capture and log SQL transactions and HTTP response status
 * for every POST, PUT, PATCH, DELETE (and optionally all mutation) requests.
 */
export function httpSqlAuditLogger(req: Request, res: Response, next: NextFunction) {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  const isApi = req.path.startsWith('/api/');

  // We audit all API mutations with high detail, plus can log general API requests
  reqCounter++;
  const reqId = `REQ-${Date.now().toString().slice(-6)}-${reqCounter}`;
  const startTime = Date.now();

  const context: RequestLogContext = {
    reqId,
    method: req.method,
    url: req.originalUrl || req.url,
    startTime,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    bodySummary: sanitizePayload(req.body),
    sqlLogs: [],
    hasTransaction: false,
    txCommitted: false,
    txRolledBack: false
  };

  if (isMutation && isApi) {
    console.log(`\n\x1b[35m┌─── [HTTP REQUEST START]\x1b[0m \x1b[1m${req.method} ${context.url}\x1b[0m (${reqId})`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`\x1b[35m│\x1b[0m Body:`, JSON.stringify(context.bodySummary));
    }
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const statusColor = isSuccess ? '\x1b[32m' : '\x1b[31m';

    if (isMutation && isApi) {
      let txStatusText = '';
      if (context.hasTransaction) {
        if (context.txCommitted) {
          txStatusText = '\x1b[32m[DB TX: COMMITTED SUCCESS]\x1b[0m';
        } else if (context.txRolledBack) {
          txStatusText = '\x1b[31m[DB TX: ROLLED BACK]\x1b[0m';
        } else {
          txStatusText = '\x1b[33m[DB TX: UNFINISHED/IN-FLIGHT]\x1b[0m';
        }
      } else {
        const writeCount = context.sqlLogs.filter(l => l.type === 'WRITE_QUERY').length;
        if (writeCount > 0) {
          txStatusText = `\x1b[32m[DB DIRECT WRITES: ${writeCount} COMMITTED]\x1b[0m`;
        } else {
          txStatusText = `\x1b[90m[DB: NO WRITES DETECTED]\x1b[0m`;
        }
      }

      console.log(
        `\x1b[35m└─── [HTTP RESPONSE FINISH]\x1b[0m \x1b[1m${req.method} ${context.url}\x1b[0m → ${statusColor}Status ${statusCode}\x1b[0m (${duration}ms) | ${txStatusText}`
      );

      // If there were SQL queries during this request, summarize them
      if (context.sqlLogs.length > 0) {
        console.log(`     \x1b[90mTotal SQL Operations: ${context.sqlLogs.length} (Writes: ${context.sqlLogs.filter(l => l.type === 'WRITE_QUERY').length})\x1b[0m`);
      }
      console.log(''); // Blank line for readability
    }
  });

  requestContextStorage.run(context, () => {
    next();
  });
}

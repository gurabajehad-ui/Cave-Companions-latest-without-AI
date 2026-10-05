import pg from 'pg';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { recordSqlEvent } from './logger.js';

const { Pool } = pg;

declare global {
  var _sqliteDb: any;
  var _sqliteInitPromise: Promise<any> | undefined;
}

function resolveSqlHost(): string {
  const configuredHost = process.env.SQL_HOST;
  
  if (!configuredHost) {
    return '127.0.0.1';
  }

  // If it's a Unix socket path
  if (configuredHost.startsWith('/') || configuredHost.includes('cloudsql')) {
    const socketFile = path.join(configuredHost, '.s.PGSQL.5432');
    if (fs.existsSync(socketFile)) {
      return configuredHost;
    }

    // Try to auto-detect the active Unix socket in common paths
    const searchDirs = ['/app/cloudsql', '/cloudsql'];
    for (const searchDir of searchDirs) {
      if (fs.existsSync(searchDir)) {
        try {
          const items = fs.readdirSync(searchDir);
          for (const item of items) {
            const fullPath = path.join(searchDir, item);
            if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, '.s.PGSQL.5432'))) {
              console.log(`[PostgreSQL Self-Healing] Auto-detected active SQL socket at: ${fullPath}`);
              return fullPath;
            }
          }
        } catch (err: any) {
          console.warn(`[PostgreSQL Self-Healing] Error reading directory ${searchDir}:`, err.message);
        }
      }
    }
  }

  return configuredHost;
}

export const pool = new Pool({
  host: resolveSqlHost(),
  user: process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
  password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
  port: Number(process.env.SQL_PORT) || 5432,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased from 5000ms to 15000ms for Cloud Run cold starts
});

pool.on('error', (err) => {
  console.error('\x1b[41m\x1b[37m[PostgreSQL Pool Error]\x1b[0m', err);
});

// Cache the original non-overridden connection and query methods
const originalConnect = pool.connect.bind(pool);
const originalPoolQuery = pool.query.bind(pool);

// Resilient Fallback Database State
export let useSqliteFallback = false;
let dbInitializationDone = false;
let initializingPromise: Promise<void> | null = null;
let lastHealCheckTime = 0;
let isHealingInProgress = false;

export function isProductionDatabaseMode(): boolean {
  return process.env.REQUIRE_POSTGRES === 'true';
}

function saveSqliteDb(db: any) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dbPath = path.join(process.cwd(), 'cave_companions.db');
    fs.writeFileSync(dbPath, buffer);
  } catch (err: any) {
    console.error('[SQLite Fallback] Error saving database to disk:', err.message);
  }
}

// Low-overhead single-probe helper
async function probePostgres(sqlHost: string): Promise<boolean> {
  const tempPool = new Pool({
    host: sqlHost,
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
    port: Number(process.env.SQL_PORT) || 5432,
    connectionTimeoutMillis: 1500,
  });

  try {
    await Promise.race([
      tempPool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 1500))
    ]);
    return true;
  } catch (err) {
    return false;
  } finally {
    await tempPool.end().catch(() => {});
  }
}

// Background healer to check if Postgres became available and switch back
export async function runDbSelfHealing(): Promise<void> {
  if (!useSqliteFallback || isHealingInProgress) return;
  const now = Date.now();
  if (now - lastHealCheckTime < 30000) return; // Check at most every 30 seconds

  isHealingInProgress = true;
  lastHealCheckTime = now;

  try {
    const sqlHost = resolveSqlHost();
    const isHealthy = await probePostgres(sqlHost);
    if (isHealthy) {
      console.log('\x1b[42m\x1b[37m[PostgreSQL Self-Healing]\x1b[0m PostgreSQL connection is now online! Switching back to persistent database.');
      useSqliteFallback = false;
    }
  } catch (err: any) {
    console.warn('[PostgreSQL Self-Healing] Background check error:', err.message);
  } finally {
    isHealingInProgress = false;
  }
}

async function ensureDatabase(): Promise<void> {
  if (dbInitializationDone) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    const isProd = isProductionDatabaseMode();
    const sqlHost = resolveSqlHost();
    const isCloudEnvironment = Boolean(process.env.K_SERVICE || process.env.K_REVISION || sqlHost.includes('cloudsql'));
    
    console.log(`[Database Router] Target Engine: PostgreSQL (${sqlHost}) | Mode: ${isProd ? 'PRODUCTION (Fail-Fast)' : 'DEVELOPMENT'}`);

    let isPostgresHealthy = false;
    const maxAttempts = isProd ? 3 : (process.env.SQL_HOST ? 2 : 1);
    const retryIntervalMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      isPostgresHealthy = await probePostgres(sqlHost);
      if (isPostgresHealthy) {
        console.log(`[Database Router] PostgreSQL connection probe successful on attempt ${attempt}. Running on live Cloud SQL PostgreSQL.`);
        break;
      }

      if (attempt < maxAttempts) {
        console.log(`[Database Router] PostgreSQL probe attempt ${attempt}/${maxAttempts} timed out. Retrying in ${retryIntervalMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
      }
    }

    if (isPostgresHealthy) {
      useSqliteFallback = false;
    } else {
      if (isProd) {
        console.error(`\x1b[41m\x1b[37m[Database Router FATAL]\x1b[0m Cloud SQL PostgreSQL connection failed in PRODUCTION mode after ${maxAttempts} attempts.`);
        console.error('[Database Router] Production Fail-Fast: SQLite fallback is strictly disallowed in production.');
        useSqliteFallback = false;
        throw new Error(`[Database Router FATAL] Cloud SQL PostgreSQL connection failed after ${maxAttempts} attempts in production.`);
      }

      console.log(`[Database Router] PostgreSQL is not reachable in local dev environment. Seamlessly activating local SQLite engine.`);
      useSqliteFallback = true;

      // Initialize the WASM SQLite engine if not already loaded
      if (!global._sqliteDb) {
        const SQL = await initSqlJs();
        const dbPath = path.join(process.cwd(), 'cave_companions.db');
        if (fs.existsSync(dbPath)) {
          console.log(`[Database Router] Local development environment: using persistent SQLite database at ${dbPath}`);
          const fileBuffer = fs.readFileSync(dbPath);
          global._sqliteDb = new SQL.Database(fileBuffer);
        } else {
          console.log(`[Database Router] Local development environment: initializing new SQLite database at ${dbPath}`);
          global._sqliteDb = new SQL.Database();
        }
      }
    }

    dbInitializationDone = true;
  })();

  return initializingPromise;
}

function isWriteStatement(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return (
    trimmed.startsWith('INSERT') ||
    trimmed.startsWith('UPDATE') ||
    trimmed.startsWith('DELETE') ||
    trimmed.startsWith('CREATE') ||
    trimmed.startsWith('DROP') ||
    trimmed.startsWith('ALTER')
  );
}

function translatePgToSqlite(sql: string, params?: any[]): string {
  const upperTrimmed = sql.trim().toUpperCase();
  if (
    upperTrimmed === 'BEGIN' || 
    upperTrimmed === 'COMMIT' || 
    upperTrimmed === 'ROLLBACK' || 
    upperTrimmed === 'BEGIN TRANSACTION' || 
    upperTrimmed === 'COMMIT TRANSACTION' ||
    upperTrimmed === 'ROLLBACK TRANSACTION'
  ) {
    return 'SELECT 1;';
  }

  let s = sql;

  // Replace postgres data types with SQLite affinities
  s = s.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');
  s = s.replace(/\bTIMESTAMP\b/gi, 'TEXT');
  s = s.replace(/\bJSONB\b/gi, 'TEXT');
  s = s.replace(/\bBYTEA\b/gi, 'BLOB');
  s = s.replace(/\bDOUBLE PRECISION\b/gi, 'REAL');
  s = s.replace(/\bSERIAL PRIMARY KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/\bSERIAL\b/gi, 'INTEGER');
  
  // Replace NOW() with CURRENT_TIMESTAMP
  s = s.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
  
  // Replace INTERVAL additions and subtractions
  s = s.replace(/(?:CURRENT_TIMESTAMP|NOW\(\))\s*([+-])\s*INTERVAL\s*'(\d+)\s+minutes'/gi, (_, sign, mins) => `datetime('now', '${sign}${mins} minutes')`);
  s = s.replace(/(?:CURRENT_TIMESTAMP|NOW\(\))\s*([+-])\s*INTERVAL\s*'(\d+)\s+hours'/gi, (_, sign, hrs) => `datetime('now', '${sign}${hrs} hours')`);
  s = s.replace(/(?:CURRENT_TIMESTAMP|NOW\(\))\s*([+-])\s*INTERVAL\s*'(\d+)\s+days'/gi, (_, sign, days) => `datetime('now', '${sign}${days} days')`);
  
  // Replace postgres ILIKE with LIKE
  s = s.replace(/\bILIKE\b/gi, 'LIKE');
  
  // Replace REGEXP_REPLACE(col, pattern, replacement, flags) with col in SQLite
  s = s.replace(/REGEXP_REPLACE\s*\(([^,]+),[^)]+\)/gi, '$1');
  s = s.replace(/RIGHT\s*\(([^,]+),\s*\d+\)/gi, '$1');
  
  // Replace ADD COLUMN IF NOT EXISTS -> ADD COLUMN (as SQLite does not support IF NOT EXISTS in alter column)
  s = s.replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN');

  // Neutralize unsupported ALTER COLUMN or DROP/RENAME constraints with a safe SELECT 1; no-op
  s = s.replace(/ALTER\s+TABLE\s+[\w_]+\s+(?:ALTER\s+COLUMN|DROP\s+CONSTRAINT|RENAME\s+CONSTRAINT|ADD\s+CONSTRAINT|DROP\s+DEFAULT|SET\s+DEFAULT|DROP\s+NOT\s+NULL|SET\s+NOT\s+NULL)[^;]+;/gi, 'SELECT 1;');

  // Handle Postgres = ANY(...) or IN (...) with array parameters for SQLite compatibility
  if (params && params.length > 0) {
    s = s.replace(/([a-zA-Z0-9_"\.]+)\s*=\s*ANY\s*\(\s*\$(\d+)(?:::[\w_\[\]]+)?\s*\)/gi, (match, col, pNumStr) => {
      const idx = parseInt(pNumStr, 10) - 1;
      const val = params[idx];
      if (Array.isArray(val)) {
        if (val.length === 0) return '1=0';
        const safeValues = val.map(v => typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`).join(', ');
        return `${col} IN (${safeValues})`;
      }
      return match;
    });

    s = s.replace(/([a-zA-Z0-9_"\.]+)\s+IN\s*\(\s*\$(\d+)\s*\)/gi, (match, col, pNumStr) => {
      const idx = parseInt(pNumStr, 10) - 1;
      const val = params[idx];
      if (Array.isArray(val)) {
        if (val.length === 0) return '1=0';
        const safeValues = val.map(v => typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`).join(', ');
        return `${col} IN (${safeValues})`;
      }
      return match;
    });
  }

  // Fallback translation for any remaining = ANY(...) patterns
  s = s.replace(/([a-zA-Z0-9_"\.]+)\s*=\s*ANY\s*\(\s*(['"]?\[.*?\]['"]?|'\{\}'|ARRAY\[\])\s*\)/gi, '1=0');
  s = s.replace(/([a-zA-Z0-9_"\.]+)\s*=\s*ANY\s*\(\s*\$(\d+)(?:::[\w_\[\]]+)?\s*\)/gi, '$1 = $2');

  // Translate postgres type-casts (e.g., ::jsonb or ::text) to empty string as SQLite has dynamic affinity
  s = s.replace(/::[a-zA-Z_]+/g, '');

  // Replace TO_CHAR(col AT TIME ZONE '...', 'YYYY-MM-DD') or TO_CHAR(col, 'YYYY-MM-DD') with SUBSTR(col, 1, 10) for SQLite
  s = s.replace(/TO_CHAR\s*\(\s*([^,]+?)\s+AT\s+TIME\s+ZONE\s+'[^']+'\s*,\s*'YYYY-MM-DD'\s*\)/gi, 'SUBSTR($1, 1, 10)');
  s = s.replace(/TO_CHAR\s*\(\s*([^,]+?)\s*,\s*'YYYY-MM-DD'\s*\)/gi, 'SUBSTR($1, 1, 10)');

  // Strip any remaining postgres AT TIME ZONE clauses for SQLite compatibility
  s = s.replace(/\s+AT\s+TIME\s+ZONE\s+'[^']+'/gi, '');

  // Translate postgres COUNT(...) FILTER (WHERE cond) to SQLite SUM(CASE WHEN cond THEN 1 ELSE 0 END)
  s = s.replace(/COUNT\s*\(([^)]*)\)\s+FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi, 'COALESCE(SUM(CASE WHEN $2 THEN 1 ELSE 0 END), 0)');

  // Translate PostgreSQL JSON aggregation functions to SQLite equivalents
  s = s.replace(/\bjson_build_object\b/gi, 'json_object');
  s = s.replace(/\bjson_agg\b/gi, 'json_group_array');

  // Translate PostgreSQL system metadata functions for SQLite compatibility
  s = s.replace(/\bcurrent_database\(\)/gi, "'cloud_sql_development_database'");
  s = s.replace(/\bcurrent_user\b/gi, "'ai_studio_app_user'");
  s = s.replace(/\bversion\(\)/gi, "'PostgreSQL 15.0 (SQLite Fallback)'");

  // Translate information_schema.tables to sqlite_master
  if (/information_schema\.tables/i.test(s)) {
    s = "SELECT name AS table_name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC";
  }
  
  return s;
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function runSqliteQuery(sqlText: string, params?: any[]): any {
  const db = global._sqliteDb;
  const translated = translatePgToSqlite(sqlText, params);
  const statements = splitSqlStatements(translated);
  
  let lastResult: any = { rows: [], rowCount: 0 };
  const isWrite = isWriteStatement(sqlText);

  for (const statement of statements) {
    const upper = statement.trim().toUpperCase();
    if (!upper) continue;

    try {
      const paramsObj: any = {};
      if (params) {
        params.forEach((val: any, idx: number) => {
          paramsObj[`$${idx + 1}`] = val;
        });
      }

      const execRes = db.exec(statement, paramsObj);
      
      if (execRes && execRes.length > 0) {
        const { columns, values } = execRes[0];
        const rows: any[] = [];
        if (values) {
          values.forEach((rowValues: any[]) => {
            const row: any = {};
            columns.forEach((col: string, idx: number) => {
              let val = rowValues[idx];
              if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                try {
                  val = JSON.parse(val);
                } catch {
                  // Keep as string
                }
              }
              row[col] = val;
            });
            rows.push(row);
          });
          lastResult = { rows, rowCount: values.length };
        }
      } else {
        lastResult = { rows: [], rowCount: db.getRowsModified() };
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      if (
        msg.includes('duplicate column name') || 
        msg.includes('already exists') || 
        msg.includes('duplicate key') ||
        (upper.startsWith('ALTER TABLE') && msg.includes('no such column'))
      ) {
        console.log(`[SQLite Fallback] Ignored safe schema mismatch: ${msg} for statement "${statement.slice(0, 100)}..."`);
        continue;
      }
      throw err;
    }
  }

  if (isWrite) {
    saveSqliteDb(db);
  }

  return lastResult;
}

// Override Pool methods to ensure transactions or direct pool usage fallback gracefully
pool.connect = (async () => {
  await ensureDatabase();
  if (useSqliteFallback) {
    return mockClient;
  }
  return originalConnect();
}) as any;

pool.query = (async (...args: any[]) => {
  await ensureDatabase();
  if (useSqliteFallback) {
    runDbSelfHealing().catch(err => console.error('[PostgreSQL Self-Healing] Background check error:', err));
    const firstArg = args[0];
    const sqlText = typeof firstArg === 'string' ? firstArg : firstArg?.text || '';
    const params = Array.isArray(args[1]) ? args[1] : (firstArg?.values || undefined);
    return runSqliteQuery(sqlText, params);
  }
  return (originalPoolQuery as any)(...args);
}) as any;

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  await ensureDatabase();
  
  if (useSqliteFallback) {
    runDbSelfHealing().catch(err => console.error('[PostgreSQL Self-Healing] Background check error:', err));
    const start = Date.now();
    try {
      const result = runSqliteQuery(text, params);
      const duration = Date.now() - start;
      
      if (isWriteStatement(text)) {
        recordSqlEvent({
          type: 'WRITE_QUERY',
          query: text,
          rowCount: result.rowCount ?? 0,
          durationMs: duration,
          status: 'SUCCESS'
        });
      }
      
      return result as pg.QueryResult<T>;
    } catch (err: any) {
      const duration = Date.now() - start;
      recordSqlEvent({
        type: 'SQL_ERROR',
        query: text,
        durationMs: duration,
        error: err.message || String(err),
        status: 'FAILED'
      });
      throw err;
    }
  }

  const start = Date.now();
  const isWrite = isWriteStatement(text);

  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (isWrite) {
      recordSqlEvent({
        type: 'WRITE_QUERY',
        query: text,
        rowCount: res.rowCount ?? 0,
        durationMs: duration,
        status: 'SUCCESS'
      });
    }

    if (duration > 500) {
      console.warn(`\x1b[33m[Slow Query ${duration}ms]\x1b[0m`, text.slice(0, 100));
    }

    return res;
  } catch (err: any) {
    const duration = Date.now() - start;
    recordSqlEvent({
      type: 'SQL_ERROR',
      query: text,
      durationMs: duration,
      error: err.message || String(err),
      status: 'FAILED'
    });
    throw err;
  }
}

const mockClient: pg.PoolClient = {
  query: (async (...args: any[]) => {
    const firstArg = args[0];
    const sqlText = typeof firstArg === 'string' ? firstArg : firstArg?.text || '';
    const params = Array.isArray(args[1]) ? args[1] : (firstArg?.values || undefined);
    
    const start = Date.now();
    const upper = sqlText.trim().toUpperCase();
    
    try {
      const result = runSqliteQuery(sqlText, params);
      const duration = Date.now() - start;
      
      if (upper === 'BEGIN') {
        recordSqlEvent({ type: 'TX_BEGIN', query: 'BEGIN', status: 'SUCCESS' });
      } else if (upper === 'COMMIT') {
        recordSqlEvent({ type: 'TX_COMMIT', query: 'COMMIT', durationMs: duration, status: 'SUCCESS' });
      } else if (upper === 'ROLLBACK') {
        recordSqlEvent({ type: 'TX_ROLLBACK', query: 'ROLLBACK', durationMs: duration, status: 'ROLLED_BACK' });
      } else if (isWriteStatement(sqlText)) {
        recordSqlEvent({ type: 'WRITE_QUERY', query: sqlText, rowCount: result.rowCount, durationMs: duration, status: 'SUCCESS' });
      }
      
      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      recordSqlEvent({ type: 'SQL_ERROR', query: sqlText, durationMs: duration, error: err.message || String(err), status: 'FAILED' });
      throw err;
    }
  }) as any,
  release: () => {},
  on: () => {},
  once: () => {},
  emit: () => false,
} as any;

/**
 * Returns a PoolClient with full SQL transaction logging. Falls back transparently to SQLite.
 */
export async function getClient(): Promise<pg.PoolClient> {
  await ensureDatabase();
  if (useSqliteFallback) {
    return mockClient;
  }

  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  let txStartTime = 0;

  // Wrap query method to capture transaction lifecycle
  client.query = (async (...args: any[]) => {
    const firstArg = args[0];
    const sqlText = typeof firstArg === 'string' ? firstArg : firstArg?.text || '';
    const upper = sqlText.trim().toUpperCase();
    const start = Date.now();

    if (upper === 'BEGIN') {
      txStartTime = Date.now();
      recordSqlEvent({
        type: 'TX_BEGIN',
        query: 'BEGIN',
        status: 'SUCCESS'
      });
    }

    try {
      const result = await (originalQuery as any)(...args);
      const duration = Date.now() - start;

      if (upper === 'COMMIT') {
        const txTotalDuration = txStartTime > 0 ? Date.now() - txStartTime : duration;
        recordSqlEvent({
          type: 'TX_COMMIT',
          query: 'COMMIT',
          durationMs: txTotalDuration,
          status: 'SUCCESS'
        });
      } else if (upper === 'ROLLBACK') {
        recordSqlEvent({
          type: 'TX_ROLLBACK',
          query: 'ROLLBACK',
          durationMs: duration,
          status: 'ROLLED_BACK'
        });
      } else if (isWriteStatement(sqlText)) {
        recordSqlEvent({
          type: 'WRITE_QUERY',
          query: sqlText,
          rowCount: result?.rowCount ?? 0,
          durationMs: duration,
          status: 'SUCCESS'
        });
      }

      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      if (upper === 'COMMIT') {
        recordSqlEvent({
          type: 'TX_ROLLBACK',
          query: 'COMMIT_FAILED',
          durationMs: duration,
          error: err.message || String(err),
          status: 'FAILED'
        });
      } else {
        recordSqlEvent({
          type: 'SQL_ERROR',
          query: sqlText,
          durationMs: duration,
          error: err.message || String(err),
          status: 'FAILED'
        });
      }
      throw err;
    }
  }) as any;

  return client;
}

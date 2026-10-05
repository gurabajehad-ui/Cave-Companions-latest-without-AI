import { pool, query, useSqliteFallback } from './pg.js';

export interface DbDiagnosticResult {
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  pingMs: number;
  database: string;
  user: string;
  host: string;
  port: number;
  serverTime: string;
  pgVersion: string;
  pool: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    maxLimit: number;
  };
  schema: {
    schemaVisible: boolean;
    tablesFound: string[];
    missingTables: string[];
    tableCounts: Record<string, number>;
  };
  error?: string;
}

const EXPECTED_TABLES = [
  'users',
  'mosques',
  'prayer_attendances',
  'otps',
  'tokens',
  'shops',
  'merchants',
  'redemptions',
  'notifications',
  'support_tickets',
  'admin_accounts',
  'security_audit_logs',
  'global_config',
  'nasiha',
  'blogs'
];

/**
 * Diagnostic tool function that executes a 'SELECT 1' test query,
 * checks connection pool status, and verifies schema visibility and table counts.
 */
export async function runPostgresDiagnostic(): Promise<DbDiagnosticResult> {
  const startTime = Date.now();
  const host = process.env.SQL_HOST || '127.0.0.1';
  const port = Number(process.env.SQL_PORT) || 5432;
  const dbName = process.env.SQL_DB_NAME || 'cloud_sql_development_database';
  const dbUser = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres';

  try {
    // 1. Execute SELECT 1 and check basic database metadata
    const pingRes = await query<{
      ping: number;
      db: string;
      usr: string;
      server_time: string;
      ver: string;
    }>(`
      SELECT 
        1 as ping, 
        current_database() as db, 
        current_user as usr, 
        NOW()::text as server_time, 
        version() as ver
    `);

    const pingDuration = Date.now() - startTime;
    const meta = pingRes.rows[0];

    // 2. Read connection pool metrics
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      maxLimit: (pool as any).options?.max || 25
    };

    // 3. Inspect information_schema to verify schema visibility
    const tablesRes = await query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);

    const foundTables = tablesRes.rows.map(r => r.table_name.toLowerCase());
    const missingTables = EXPECTED_TABLES.filter(t => !foundTables.includes(t.toLowerCase()));

    // 4. Query record counts for key verified tables
    const tableCounts: Record<string, number> = {};
    for (const table of foundTables) {
      if (EXPECTED_TABLES.includes(table)) {
        try {
          const countRes = await query<{ count: string }>(`SELECT COUNT(*) as count FROM ${table}`);
          tableCounts[table] = Number(countRes.rows[0]?.count || 0);
        } catch {
          tableCounts[table] = -1;
        }
      }
    }

    const isHealthy = pingRes.rowCount !== null && missingTables.length === 0;

    const result: DbDiagnosticResult = {
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      pingMs: pingDuration,
      database: useSqliteFallback ? 'cave_companions.db' : (meta?.db || dbName),
      user: useSqliteFallback ? 'local_dev' : (meta?.usr || dbUser),
      host: useSqliteFallback ? 'local (SQLite Fallback)' : host,
      port: useSqliteFallback ? 0 : port,
      serverTime: meta?.server_time || new Date().toISOString(),
      pgVersion: useSqliteFallback ? 'SQLite 3 (WASM Development Fallback)' : (meta?.ver ? meta.ver.split(' on ')[0] : 'PostgreSQL'),
      pool: poolStats,
      schema: {
        schemaVisible: foundTables.length > 0,
        tablesFound: foundTables,
        missingTables,
        tableCounts
      }
    };

    // Log diagnostic summary to console
    logDiagnosticReport(result);
    return result;
  } catch (err: any) {
    const pingDuration = Date.now() - startTime;
    const errorResult: DbDiagnosticResult = {
      status: 'FAILED',
      pingMs: pingDuration,
      database: dbName,
      user: dbUser,
      host,
      port,
      serverTime: new Date().toISOString(),
      pgVersion: 'Unknown',
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        maxLimit: 25
      },
      schema: {
        schemaVisible: false,
        tablesFound: [],
        missingTables: EXPECTED_TABLES,
        tableCounts: {}
      },
      error: err.message || String(err)
    };

    logDiagnosticReport(errorResult);
    return errorResult;
  }
}

/**
 * Formats and prints diagnostic results cleanly to the server console.
 */
function logDiagnosticReport(result: DbDiagnosticResult) {
  const line = '═'.repeat(64);
  const headerTitle = useSqliteFallback ? 'DATABASE DIAGNOSTIC (SQLITE DEV FALLBACK)' : 'POSTGRESQL CONNECTION & SCHEMA DIAGNOSTIC';
  const padding = Math.max(0, Math.floor((64 - headerTitle.length) / 2));
  console.log(`\n\x1b[36m╔${line}╗\x1b[0m`);
  console.log(`\x1b[36m║\x1b[1m\x1b[37m${' '.repeat(padding)}${headerTitle}${' '.repeat(64 - padding - headerTitle.length)}\x1b[0m\x1b[36m║\x1b[0m`);
  console.log(`\x1b[36m╠${line}╣\x1b[0m`);

  if (result.status === 'HEALTHY') {
    const statusText = useSqliteFallback ? 'ACTIVE & HEALTHY (Local SQLite Fallback)' : 'ACTIVE & HEALTHY';
    console.log(`\x1b[36m║\x1b[0m  \x1b[32m✔ Status:\x1b[0m \x1b[1m\x1b[32m${statusText}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[32m✔ Query Test (SELECT 1):\x1b[0m \x1b[32mSUCCESS\x1b[0m (${result.pingMs}ms)`);
  } else if (result.status === 'DEGRADED') {
    console.log(`\x1b[36m║\x1b[0m  \x1b[33m⚠ Status:\x1b[0m \x1b[1m\x1b[33mDEGRADED\x1b[0m (Missing tables: ${result.schema.missingTables.join(', ')})`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[32m✔ Query Test (SELECT 1):\x1b[0m \x1b[32mSUCCESS\x1b[0m (${result.pingMs}ms)`);
  } else {
    console.log(`\x1b[36m║\x1b[0m  \x1b[31m✖ Status:\x1b[0m \x1b[1m\x1b[31mCONNECTION FAILED\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[31m✖ Error:\x1b[0m ${result.error}`);
  }

  console.log(`\x1b[36m║\x1b[0m  \x1b[34m• Target DB:\x1b[0m ${result.database} | \x1b[34mUser:\x1b[0m ${result.user} | \x1b[34mHost:\x1b[0m ${result.host}${result.port ? `:${result.port}` : ''}`);
  console.log(`\x1b[36m║\x1b[0m  \x1b[34m• Engine:\x1b[0m ${result.pgVersion}`);
  console.log(`\x1b[36m║\x1b[0m  \x1b[34m• Pool Status:\x1b[0m Total: ${result.pool.totalCount} | Idle: ${result.pool.idleCount} | Waiting: ${result.pool.waitingCount} | Max: ${result.pool.maxLimit}`);
  
  if (result.schema.schemaVisible) {
    console.log(`\x1b[36m║\x1b[0m  \x1b[35m• Schema Visibility:\x1b[0m ${result.schema.tablesFound.length} public tables detected`);
    const countsStr = Object.entries(result.schema.tableCounts)
      .map(([tbl, cnt]) => `${tbl}: ${cnt}`)
      .join(' | ');
    console.log(`\x1b[36m║\x1b[0m  \x1b[35m• Row Counts:\x1b[0m ${countsStr}`);
  } else {
    console.log(`\x1b[36m║\x1b[0m  \x1b[31m• Schema Visibility:\x1b[0m No tables visible in 'public' schema`);
  }

  console.log(`\x1b[36m╚${line}╝\x1b[0m\n`);

  // Also emit structured JSON for production Cloud Logging / Cloud Run log sinks
  const cloudRunService = process.env.K_SERVICE || 'local';
  const cloudRunRevision = process.env.K_REVISION || 'local';
  console.log(JSON.stringify({
    severity: result.status === 'HEALTHY' ? 'INFO' : result.status === 'DEGRADED' ? 'WARNING' : 'ERROR',
    message: `[Database Diagnostic] Status: ${result.status} (${result.pingMs}ms, ${result.schema.tablesFound.length} tables verified)`,
    component: 'db-diagnostic',
    engine: useSqliteFallback ? 'sqlite-fallback' : 'postgresql',
    cloudRun: {
      service: cloudRunService,
      revision: cloudRunRevision
    },
    database: {
      name: result.database,
      user: result.user,
      host: result.host,
      port: result.port,
      version: result.pgVersion,
      pingMs: result.pingMs
    },
    pool: result.pool,
    schema: result.schema
  }));
}

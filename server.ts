import fs from 'fs';
import path from 'path';

// Universal Server Entrypoint
// - In Production (Cloud Run / npm start / node server.ts): Executes pre-bundled CommonJS server with full module resolution
// - In Development (npm run dev / tsx server.ts): Executes server/index.ts with live Vite middleware

const distBundle = path.join(process.cwd(), 'dist', 'server.cjs');
const rootBundle = path.join(process.cwd(), 'server.cjs');
const buildBundle = path.join(process.cwd(), 'build', 'server.cjs');

// Explicit production flag only (e.g. node server.ts --production or SERVE_STATIC_BUILD=true)
const isExplicitProd = process.argv.includes('--production') || process.env.SERVE_STATIC_BUILD === 'true';

if (isExplicitProd && fs.existsSync(distBundle)) {
  await import(`file://${distBundle}`);
} else if (isExplicitProd && fs.existsSync(rootBundle)) {
  await import(`file://${rootBundle}`);
} else if (isExplicitProd && fs.existsSync(buildBundle)) {
  await import(`file://${buildBundle}`);
} else {
  // Always run live dev server with Vite middleware
  try {
    await import('./server/index.ts');
  } catch (err: any) {
    if (fs.existsSync(distBundle)) {
      await import(`file://${distBundle}`);
    } else if (fs.existsSync(rootBundle)) {
      await import(`file://${rootBundle}`);
    } else {
      throw err;
    }
  }
}


const fs = require('fs');
const path = require('path');

try {
  const adhanCjsDir = path.join(process.cwd(), 'node_modules', 'adhan', 'lib', 'cjs');
  if (fs.existsSync(adhanCjsDir)) {
    const pkgPath = path.join(adhanCjsDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ type: 'commonjs' }, null, 2));
    console.log('[fix-adhan] Successfully configured node_modules/adhan/lib/cjs/package.json for Node 22 CommonJS compatibility.');
  }
} catch (err) {
  console.warn('[fix-adhan] Warning: Failed to apply adhan CJS fix:', err);
}

import * as esbuild from 'esbuild';
import fs from 'fs';

const adhanCjsDir = './node_modules/adhan/lib/cjs';
if (fs.existsSync(adhanCjsDir)) {
  fs.writeFileSync(`${adhanCjsDir}/package.json`, JSON.stringify({ type: 'commonjs' }, null, 2));
}

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const bundledDeps = ['adhan'];
const externals = [
  ...Object.keys(pkg.dependencies || {}).filter(dep => !bundledDeps.includes(dep)),
  'sqlite3',
  'esbuild',
  'pg-native',
  'canvas',
  'fsevents',
  'onnxruntime-node',
  'sharp',
  '@xenova/transformers',
  '*.node'
];

const serverEntry = fs.existsSync('server/index.ts') ? 'server/index.ts' : 'server.ts';

await esbuild.build({
  entryPoints: [serverEntry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  loader: {
    '.node': 'empty'
  },
  external: externals,
  sourcemap: true,
  outfile: 'dist/server.cjs',
});
console.log('Built dist/server.cjs successfully.');

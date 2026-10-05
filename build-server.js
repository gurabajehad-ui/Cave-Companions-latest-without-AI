import * as esbuild from 'esbuild';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const externals = [
  ...Object.keys(pkg.dependencies || {}),
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
  packages: 'external',
  loader: {
    '.node': 'empty'
  },
  external: externals,
  sourcemap: true,
  outfile: 'dist/server.cjs',
});
console.log('Built dist/server.cjs successfully.');

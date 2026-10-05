import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';

async function buildAndCopy() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const buildDir = path.join(rootDir, 'build');

  // 1. Build server with esbuild for CommonJS compatibility
  const serverEntry = fs.existsSync(path.join(rootDir, 'server/index.ts')) 
    ? path.join(rootDir, 'server/index.ts') 
    : path.join(rootDir, 'server.ts');

  if (fs.existsSync(serverEntry)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
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
        outfile: path.join(distDir, 'server.cjs'),
      });
      console.log(`Successfully bundled ${serverEntry} to dist/server.cjs`);

      // Copy server.cjs and map to root and build for maximum platform compatibility
      if (fs.existsSync(path.join(distDir, 'server.cjs'))) {
        fs.copyFileSync(path.join(distDir, 'server.cjs'), path.join(rootDir, 'server.cjs'));
        if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
        fs.copyFileSync(path.join(distDir, 'server.cjs'), path.join(buildDir, 'server.cjs'));
      }
      if (fs.existsSync(path.join(distDir, 'server.cjs.map'))) {
        fs.copyFileSync(path.join(distDir, 'server.cjs.map'), path.join(rootDir, 'server.cjs.map'));
        fs.copyFileSync(path.join(distDir, 'server.cjs.map'), path.join(buildDir, 'server.cjs.map'));
      }
    } catch (e) {
      console.warn('Server bundling warning:', e);
    }
  }

  // 2. Copy fonts
  const srcFonts = path.join(rootDir, 'server/assets/fonts');
  const distFonts = path.join(distDir, 'fonts');
  if (fs.existsSync(srcFonts)) {
    fs.mkdirSync(distFonts, { recursive: true });
    const files = fs.readdirSync(srcFonts);
    for (const f of files) {
      fs.copyFileSync(path.join(srcFonts, f), path.join(distFonts, f));
    }
    console.log(`Copied ${files.length} font file(s) to dist/fonts`);
  }

  // 3. Ensure favicon.ico exists in root and dist
  const publicFavicon = path.join(rootDir, 'public/favicon.ico');
  const rootFavicon = path.join(rootDir, 'favicon.ico');
  const distFavicon = path.join(distDir, 'favicon.ico');
  if (fs.existsSync(publicFavicon)) {
    if (!fs.existsSync(rootFavicon)) {
      fs.copyFileSync(publicFavicon, rootFavicon);
    }
    if (!fs.existsSync(distFavicon)) {
      fs.copyFileSync(publicFavicon, distFavicon);
    }
  }

  // 4. Mirror dist/ to build/
  function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  if (fs.existsSync(distDir)) {
    copyRecursiveSync(distDir, buildDir);
    console.log('Successfully mirrored dist/ to build/ for artifact upload compatibility.');

    const artifactDir = path.join(rootDir, '.aistudio/artifacts/brain/9eef18c5-5c63-4dd5-8806-597523e22507');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    copyRecursiveSync(distDir, artifactDir);
    console.log('Successfully mirrored dist/ to .aistudio artifact directory.');
  }
}

buildAndCopy().catch((err) => {
  console.warn('Asset copying / build mirroring warning:', err);
});

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Prevent EPIPE / stream errors from crashing Node process when stdout/stderr pipes close
if (process.stdout && typeof process.stdout.on === 'function') {
  process.stdout.on('error', (err: any) => {
    if (err && (err.code === 'EPIPE' || err.code === 'EOF' || err.code === 'ECONNRESET')) return;
  });
}

if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (err: any) => {
    if (err && (err.code === 'EPIPE' || err.code === 'EOF' || err.code === 'ECONNRESET')) return;
  });
}

process.on('uncaughtException', (err: any) => {
  if (err && (err.code === 'EPIPE' || err.code === 'EOF' || err.code === 'ECONNRESET')) return;
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason: any) => {
  if (reason && (reason.code === 'EPIPE' || reason.code === 'EOF' || reason.code === 'ECONNRESET')) return;
  console.error('Unhandled Rejection:', reason);
});

import authRoutes from './routes/authRoutes.js';
import { requireAdmin } from './auth.js';
import prayerRoutes from './routes/prayerRoutes.js';
import mosqueRoutes from './routes/mosqueRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import { shopRoutes } from './routes/shopRoutes.js';
import { merchantRoutes } from './routes/merchantRoutes.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import { supportRoutes } from './routes/supportRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { cartRoutes } from './routes/cartRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { mediaRoutes } from './routes/mediaRoutes.js';
import { adRoutes } from './routes/adRoutes.js';
import circleRoutes from './routes/circleRoutes.js';
import riderRoutes from "./routes/riderRoutes.js";
import { mapRoutes } from './routes/mapRoutes.js';
import { initPostgresSchema } from './pgInit.js';
import { runPostgresDiagnostic } from './pgDiagnostics.js';
import { httpSqlAuditLogger } from './logger.js';
import { PDFVerificationService } from './services/pdfVerificationService.js';

dotenv.config({ override: true });

console.log('==================================================');
console.log('[Server Startup Diagnostic]');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`JWT_SECRET configured: ${Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32)} (length: ${process.env.JWT_SECRET?.trim().length || 0})`);
console.log(`SQL_HOST configured: ${Boolean(process.env.SQL_HOST)}`);
console.log(`APP_URL configured: ${Boolean(process.env.APP_URL || process.env.VITE_APP_URL)}`);
console.log('==================================================');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure trust proxy safely for reverse proxy / Cloud Run container environment
  const rawTrustProxy = process.env.TRUST_PROXY?.trim();
  if (rawTrustProxy === 'false' || rawTrustProxy === '0') {
    app.set('trust proxy', false);
  } else if (rawTrustProxy && !isNaN(Number(rawTrustProxy))) {
    app.set('trust proxy', Number(rawTrustProxy));
  } else if (rawTrustProxy === 'loopback' || rawTrustProxy === 'linklocal' || rawTrustProxy === 'uniquelocal') {
    app.set('trust proxy', rawTrustProxy);
  } else {
    // Default safe for Cloud Run container ingress / reverse proxy
    app.set('trust proxy', 1);
  }

  // Middlewares
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));
  app.use(httpSqlAuditLogger);

  // Root health check endpoint for Cloud Run / load balancers
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // API Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Cave Companions API',
      version: '2.0.0 (Phase 1-7)',
      time: new Date().toISOString()
    });
  });

  // Dedicated DB Diagnostic endpoint
  app.get('/api/health/db', async (req, res) => {
    try {
      const diag = await runPostgresDiagnostic();
      res.status(diag.status === 'FAILED' ? 503 : 200).json(diag);
    } catch (err: any) {
      res.status(500).json({ status: 'FAILED', error: err.message });
    }
  });

  // Security Diagnostic endpoint
  app.get('/api/security-diagnostic', (req, res) => {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtConfigured = Boolean(jwtSecret && jwtSecret.trim().length > 0);
    const jwtValidLength = Boolean(jwtSecret && jwtSecret.trim().length >= 32);
    const nodeEnv = process.env.NODE_ENV || 'development';
    const databaseConfigured = Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);
    const appUrlConfigured = Boolean(process.env.APP_URL || process.env.VITE_APP_URL);
    const adminSecretConfigured = Boolean(process.env.ADMIN_SECRET_KEY);

    console.log('==================================================');
    console.log('[Security Diagnostic Endpoint Request]');
    console.log(`JWT_SECRET configured: ${jwtConfigured}`);
    console.log(`JWT_SECRET valid length (>=32): ${jwtValidLength}`);
    console.log(`NODE_ENV: ${nodeEnv}`);
    console.log(`DATABASE configured: ${databaseConfigured}`);
    console.log(`APP_URL configured: ${appUrlConfigured}`);
    console.log(`ADMIN_SECRET_KEY configured: ${adminSecretConfigured}`);
    console.log('==================================================');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics: {
        jwtSecretConfigured: jwtConfigured,
        jwtValidLength: jwtValidLength,
        jwtSecretLength: jwtSecret?.trim().length || 0,
        nodeEnv,
        databaseConfigured,
        appUrlConfigured,
        adminSecretConfigured
      }
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/prayers', prayerRoutes);
  app.use('/api/mosques', mosqueRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/shops', shopRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/merchant', merchantRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/ads', adRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/circles', circleRoutes);
  app.use('/api/rider', riderRoutes);
  app.use('/api/maps', mapRoutes);

  // Public PDF Verification API endpoint
  app.get('/api/verify/pdf/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const verification = await PDFVerificationService.getVerification(id);
      if (!verification) {
        return res.status(404).json({ success: false, message: 'Invalid verification ID' });
      }
      res.json({ success: true, verification });
    } catch (err: any) {
      console.error('PDF verification error:', err);
      res.status(500).json({ success: false, message: 'Failed to verify document authenticity' });
    }
  });

  // Public Helpline API endpoint
  app.get('/api/helpline', async (req, res) => {
    try {
      const { db } = await import('./db.js');
      const settings = await db.getHelplineSettings();
      res.json({
        success: true,
        isActive: settings.isActive,
        primaryPhone: settings.primaryPhone,
        secondaryPhone: settings.secondaryPhone || '',
        whatsappNumber: settings.whatsappNumber || '',
        supportEmail: settings.supportEmail || '',
        supportMessage: settings.supportMessage || 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
        isWhatsappEnabled: Boolean(settings.isWhatsappEnabled)
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        isActive: true,
        primaryPhone: '+880 1700-000000',
        secondaryPhone: '',
        whatsappNumber: '',
        supportEmail: 'support@cavecompanions.org',
        supportMessage: 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
        isWhatsappEnabled: false
      });
    }
  });

  // Public Delivery Charges API endpoint

  app.get('/api/delivery-charges', async (req, res) => {
    try {
      const { db } = await import('./db.js');
      const charges = await db.getDeliveryCharges();
      res.json({
        success: true,
        charges
      });
    } catch (err: any) {
      res.status(500).json({ success: false, charges: {} });
    }
  });

  // Public Geo Districts API endpoint
  app.get('/api/geo/districts', async (req, res) => {
    try {
      const { BANGLADESH_DISTRICTS } = await import('../src/data/bangladeshGeo.js');
      res.json({ success: true, districts: BANGLADESH_DISTRICTS });
    } catch (err: any) {
      res.status(500).json({ success: false, districts: [] });
    }
  });

  // Debug DB connection and seeding state (Admin-only)
  app.get('/api/debug-db', requireAdmin, async (req, res) => {
    try {
      const pgModule = await import('./pg.js');
      const start = Date.now();
      const usersRes = await pgModule.query('SELECT id, full_name, phone, email, password_hash FROM users');
      const duration = Date.now() - start;
      res.json({
        success: true,
        fallbackMode: (pgModule as any).useSqliteFallback,
        activeDatabase: (pgModule as any).useSqliteFallback ? 'SQLite fallback' : 'PostgreSQL',
        durationMs: duration,
        usersCount: usersRes.rows.length,
        users: usersRes.rows.map((u: any) => ({
          id: u.id,
          fullName: u.full_name || u.fullName,
          phone: u.phone,
          email: u.email,
          hasPasswordHash: !!u.password_hash || !!u.passwordHash
        }))
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        stack: err.stack
      });
    }
  });

  // Public Nasiha API endpoint alias
  app.get('/api/nasiha', async (req, res) => {
    try {
      const { db } = await import('./db.js');
      const list = await db.getActiveNasihaList();
      res.json({ success: true, list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'নসিহা লোড করতে সমস্যা হয়েছে।' });
    }
  });

  // Dedicated PWA Manifest & Service Worker Header Handlers
  app.get('/manifest.json', (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const folder = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
    res.sendFile(path.join(process.cwd(), folder, 'manifest.json'));
  });

  app.get('/sw.js', (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const folder = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
    res.sendFile(path.join(process.cwd(), folder, 'sw.js'));
  });

  app.use((req, res, next) => {
    if (req.path.endsWith('.png') || req.path.endsWith('.jpg') || req.path.endsWith('.ico') || req.path.endsWith('.json')) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
    next();
  });

  // Vite middleware in dev / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const buildPath = path.join(process.cwd(), 'build');
    const staticRoot = (await import('fs')).default.existsSync(distPath) ? distPath : buildPath;

    // Cache-control headers to prevent stale HTML and SW caching
    app.use((req, res, next) => {
      if (req.path === '/' || req.path.endsWith('.html') || req.path === '/sw.js' || req.path === '/manifest.json') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (req.path.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      next();
    });

    app.use(express.static(staticRoot, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(staticRoot, 'index.html'));
    });
  }

  // Bind the port immediately to satisfy Cloud Run health checks and prevent 503 timeouts
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cave Companions] Server running on http://0.0.0.0:${PORT}`);
    
    // Run database initialization asynchronously AFTER the server is listening
    initPostgresSchema()
      .then(() => runPostgresDiagnostic())
      .catch(dbErr => {
        console.error('[PostgreSQL] Database initialization warning:', dbErr);
      });
  });

  server.on('error', (err: any) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

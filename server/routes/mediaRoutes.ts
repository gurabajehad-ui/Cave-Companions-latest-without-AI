import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';

export const mediaRoutes = Router();

const MEDIA_CACHE_DIR = path.join(process.cwd(), 'uploads', 'media');
if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}

/**
 * GET /api/media/images/:id
 * Retrieve persistent product or media image.
 * 1. Checks memory/disk cache first for ultra-fast streaming.
 * 2. If not on disk (e.g. fresh container deploy / restart), fetches BYTEA from PostgreSQL, reconstitutes cache, and streams to client.
 */
mediaRoutes.get('/images/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      res.status(400).send('Missing media ID');
      return;
    }

    const cleanId = path.basename(rawId);
    const diskPath = path.join(MEDIA_CACHE_DIR, cleanId);

    // If already in local cache, send file directly
    if (fs.existsSync(diskPath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(diskPath);
    }

    // Retrieve from PostgreSQL database persistent media table
    const media = await db.getUploadedMedia(cleanId);
    if (!media || !media.data) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    // Write to disk cache for subsequent rapid access
    try {
      fs.writeFileSync(diskPath, media.data);
    } catch (writeErr) {
      console.warn('[Media Cache] Disk write warning:', writeErr);
    }

    res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
    res.setHeader('Content-Length', media.data.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(media.data);
  } catch (err: any) {
    console.error('Serve media image error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * GET /api/media/videos/:id
 * Retrieve persistent video file with Range header (206 Partial Content) streaming.
 */
mediaRoutes.get('/videos/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      res.status(400).send('Missing video media ID');
      return;
    }

    const cleanId = path.basename(rawId);
    const diskPath = path.join(MEDIA_CACHE_DIR, cleanId);

    // If file is not yet on disk cache, fetch from PostgreSQL and write to disk
    if (!fs.existsSync(diskPath)) {
      const media = await db.getUploadedMedia(cleanId);
      if (!media || !media.data) {
        res.status(404).json({ success: false, message: 'Video not found' });
        return;
      }
      try {
        fs.writeFileSync(diskPath, media.data);
      } catch (writeErr) {
        console.warn('[Media Cache] Disk write warning for video:', writeErr);
      }
    }

    if (!fs.existsSync(diskPath)) {
      res.status(404).send('Video file unreadable');
      return;
    }

    const stat = fs.statSync(diskPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(cleanId).toLowerCase();
    const mimeType = ext === '.mp4' ? 'video/mp4' 
                   : ext === '.webm' ? 'video/webm' 
                   : ext === '.mov' ? 'video/quicktime' 
                   : ext === '.ogg' ? 'video/ogg'
                   : 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(diskPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      };
      res.writeHead(200, head);
      fs.createReadStream(diskPath).pipe(res);
    }
  } catch (err: any) {
    console.error('Serve video error:', err);
    res.status(500).send('Internal Server Error');
  }
});

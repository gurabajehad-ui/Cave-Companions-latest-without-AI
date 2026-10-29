import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { db } from '../db.js';

export const mediaRoutes = Router();

const MEDIA_CACHE_DIR = path.join(process.cwd(), 'uploads', 'media');
if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}

// Standard Multer multipart memory storage for binary streaming & persistence
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max for video, 15MB for images
  }
});

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

/**
 * POST /api/media/upload
 * Standard browser-native multipart/form-data upload using multer.
 * Accepts binary file in FormData field 'file' or 'media', with base64 JSON fallback.
 */
mediaRoutes.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (req.file) {
      // 1. Standard browser-native multipart binary upload
      buffer = req.file.buffer;
      fileName = req.file.originalname || `upload_${Date.now()}`;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body && req.body.fileData) {
      // 2. Backward compatibility JSON base64 fallback
      const { fileData, fileName: bodyFileName } = req.body;
      const base64Data = String(fileData).replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const mimeMatch = String(fileData).match(/^data:([A-Za-z-+/]+);base64,/);
      mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      buffer = Buffer.from(base64Data, 'base64');
      fileName = bodyFileName || `upload_${Date.now()}`;
    } else {
      res.status(400).json({ success: false, message: 'ফাইল প্রদান করা হয়নি (No file provided in form-data or JSON)' });
      return;
    }

    const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|ogg)$/i.test(fileName);
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;

    if (buffer.length > maxSize) {
      res.status(400).json({
        success: false,
        message: isVideo ? 'ভিডিও ফাইলটি ১০০ মেগাবাইটের বেশি হতে পারবে না (File exceeds 100MB)' : 'ফাইলটি ১৫ মেগাবাইটের বেশি হতে পারবে না (File exceeds 15MB)'
      });
      return;
    }

    const cleanExt = path.extname(fileName) || (isVideo ? '.mp4' : '.jpg');
    const mediaId = `${crypto.randomUUID()}${cleanExt}`;
    const diskPath = path.join(MEDIA_CACHE_DIR, mediaId);

    // Write to disk cache for instantaneous streaming
    fs.writeFileSync(diskPath, buffer);

    // Durable persistence in PostgreSQL uploaded_media table
    await db.saveUploadedMedia({ id: mediaId, filename: fileName, mimeType, buffer });

    const mediaUrl = isVideo ? `/api/media/videos/${mediaId}` : `/api/media/images/${mediaId}`;
    res.json({
      success: true,
      url: mediaUrl,
      fileName,
      mimeType,
      size: buffer.length
    });
  } catch (err: any) {
    console.error('Media upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed: ' + (err.message || 'Server error') });
  }
});

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';
import { verifyUserToken } from '../auth.js';
import { NotificationService } from '../services/notificationService.js';

const router = Router();

const MEDIA_CACHE_DIR = path.join(process.cwd(), 'uploads', 'media');
if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}

// 1. Get all active registered mosques (for User app directory & navigation)
router.get('/', async (req, res) => {
  try {
    const mosques = await db.getMosques(true);
    res.json({
      success: true,
      count: mosques.length,
      mosques
    });
  } catch (err: any) {
    console.error('mosques get error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'মসজিদ তালিকা আনতে সমস্যা হয়েছে।'
    });
  }
});

// 1.2 Check for duplicate mosques (used during user or admin registration)
router.get('/check-duplicates', async (req, res) => {
  try {
    const { name, nameBn, latitude, longitude } = req.query;
    const duplicates = await db.findDuplicateMosques({
      name: name ? String(name) : undefined,
      nameBn: nameBn ? String(nameBn) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });
    res.json({
      success: true,
      count: duplicates.length,
      duplicates
    });
  } catch (err: any) {
    console.error('check duplicates error:', err);
    res.status(500).json({
      success: false,
      message: 'ডুপ্লিকেট যাচাইকরণে ত্রুটি।'
    });
  }
});

// 1.3 Photo upload endpoint for Mosque & Imam photos
router.post('/upload-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, filename, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ success: false, message: 'ছবির ডাটা (Base64) প্রদান করুন।' });
      return;
    }

    let pureBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (imageBase64.includes('base64,')) {
      const parts = imageBase64.split('base64,');
      const prefix = parts[0];
      pureBase64 = parts[1];
      const match = prefix.match(/data:([a-zA-Z0-9/+-]+);/);
      if (match) detectedMime = match[1];
    }

    const buffer = Buffer.from(pureBase64, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট হতে পারবে।' });
      return;
    }

    const mediaId = `media_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const cleanFilename = filename ? path.basename(filename) : `${mediaId}.jpg`;

    // Save to PostgreSQL uploaded_media
    await db.saveUploadedMedia({
      id: mediaId,
      filename: cleanFilename,
      mimeType: detectedMime,
      buffer: buffer,
      createdBy: 'user_mosque_submission'
    });

    // Write to local disk cache
    try {
      const diskPath = path.join(MEDIA_CACHE_DIR, mediaId);
      fs.writeFileSync(diskPath, buffer);
    } catch (diskErr) {
      console.warn('Disk cache write warning:', diskErr);
    }

    const mediaUrl = `/api/media/images/${mediaId}`;
    res.json({
      success: true,
      mediaId,
      url: mediaUrl,
      message: 'ছবি সফলভাবে আপলোড হয়েছে।'
    });
  } catch (err: any) {
    console.error('Mosque photo upload error:', err);
    res.status(500).json({ success: false, message: 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' });
  }
});

// 1.5 Lookup Mosque by ID or Name
router.get('/find/lookup', async (req, res) => {
  try {
    const { id, name } = req.query;
    let mosque = null;
    if (id && typeof id === 'string') {
      mosque = await db.getMosqueById(id);
    }
    if (!mosque && name && typeof name === 'string') {
      mosque = await db.getMosqueByName(name);
    }
    if (!mosque) {
      res.status(404).json({
        success: false,
        message: 'মসজিদ খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    res.json({
      success: true,
      mosque
    });
  } catch (err: any) {
    console.error('mosque lookup error:', err);
    res.status(500).json({
      success: false,
      message: 'মসজিদ তথ্য আনতে সমস্যা হয়েছে।'
    });
  }
});

// 2. User submits Mosque Registration Application (Status: Pending)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      name, nameBn, address, area, district,
      imamName, contactNumber, latitude, longitude,
      description, imageUrl, imamImageUrl,
      applicantName, applicantPhone
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'মসজিদের নাম (ইংরেজি বা বাংলা) আবশ্যক।' });
      return;
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      res.status(400).json({ success: false, message: 'মসজিদের পূর্ণ ঠিকানা আবশ্যক।' });
      return;
    }

    // Capture User identity from Auth Token if logged in
    let requestedByUserId = '';
    let requestedByName = applicantName?.trim() || '';
    let requestedByPhone = applicantPhone?.trim() || '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const payload = verifyUserToken(token);
      if (payload && payload.sub) {
        requestedByUserId = payload.sub;
        const user = await db.getUserById(payload.sub);
        if (user) {
          requestedByName = requestedByName || user.fullName || '';
          requestedByPhone = requestedByPhone || user.phone || '';
        }
      }
    }

    // Check duplicate detection
    const duplicates = await db.findDuplicateMosques({
      name: name.trim(),
      nameBn: nameBn ? nameBn.trim() : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });

    const created = await db.createMosque({
      name: name.trim(),
      nameBn: (nameBn || name).trim(),
      address: address.trim(),
      area: (area || 'Dhaka').trim(),
      district: (district || 'Dhaka').trim(),
      imamName: imamName?.trim(),
      contactNumber: contactNumber?.trim(),
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      description: description?.trim(),
      imageUrl: imageUrl?.trim(),
      imamImageUrl: imamImageUrl?.trim(),
      status: 'pending', // IMPORTANT: Pending until Admin reviews and approves
      requestedByUserId: requestedByUserId || undefined,
      requestedByName: requestedByName || undefined,
      requestedByPhone: requestedByPhone || undefined
    });

    if (created.requestedByUserId) {
      try {
        await NotificationService.sendFromTemplate(
          'MOSQUE_APPLICATION_SUBMITTED',
          created.requestedByUserId,
          {
            user_name: requestedByName || 'প্রিয় ব্যবহারকারী',
            mosque_name: created.nameBn || created.name,
            application_id: created.id
          },
          { mosqueId: created.id }
        );
      } catch (notifErr) {
        console.warn('[Notification Warning] Could not notify applicant on mosque submission:', notifErr);
      }
    }

    res.status(201).json({
      success: true,
      message: 'আপনার নতুন মসজিদ যুক্ত করার আবেদন সফলভাবে জমা হয়েছে! অ্যাডমিন পর্যালোচনার পর এটি অনুমোদিত হলে ডিরেক্টরিতে লাইভ হবে।',
      mosque: created,
      duplicateWarnings: duplicates.length > 0 ? duplicates : undefined
    });
  } catch (err: any) {
    console.error('mosque request error:', err);
    res.status(500).json({
      success: false,
      message: 'মসজিদ আবেদন জমা দিতে সমস্যা হয়েছে: ' + err.message
    });
  }
});

// 2.5 Get current user's submitted mosque applications
router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'অননুমোদিত অনুরোধ।' });
      return;
    }

    const token = authHeader.substring(7).trim();
    const payload = verifyUserToken(token);
    if (!payload || !payload.sub) {
      res.status(401).json({ success: false, message: 'অবৈধ টোকেন।' });
      return;
    }

    const requests = await db.getUserMosqueRequests(payload.sub);
    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    console.error('get user mosque requests error:', err);
    res.status(500).json({ success: false, message: 'আবেদন তালিকা আনতে সমস্যা।' });
  }
});

// 3. Get single mosque by ID
router.get('/:id', async (req, res) => {
  try {
    const mosque = await db.getMosqueById(req.params.id);
    if (!mosque) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'মসজিদটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    res.json({
      success: true,
      mosque
    });
  } catch (err: any) {
    console.error('mosque get error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'মসজিদ তথ্য আনতে সমস্যা হয়েছে।'
    });
  }
});

// 4. Deprecated QR code endpoint (System now strictly uses Prayer Time + Location Verification)
router.get('/:id/qr-dataurl', async (req, res) => {
  res.status(410).json({
    success: false,
    error: 'QR_REMOVED',
    message: 'মসজিদ ভেরিফিকেশনে QR কোডের প্রয়োজন নেই। সময় ও লোকেশনের ভিত্তিতে স্বয়ংক্রিয়ভাবে যাচাই করা হয়।'
  });
});

export default router;

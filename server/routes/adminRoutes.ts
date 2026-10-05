import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db, SupportTicketStatus, ShopStatus, AdminPermission } from '../db.js';
import { generateAdminToken, verifyAdminToken, verifyUserToken, verifyMerchantToken } from '../auth.js';
import { NotificationService } from '../services/notificationService.js';
import { adminAuthRateLimiter } from '../rateLimiter.js';
import {
  generatePDFReport,
  generateExcelReport,
  generateCSVReport,
  buildPeriodLabel,
  buildReportFilename,
  FinancialReportData
} from '../reports/financialReportGenerator.js';
import { getAnalyticsDashboardData, trackAnalyticsEvent, AnalyticsDateFilter } from '../services/analyticsService.js';
import { PDFVerificationService } from '../services/pdfVerificationService.js';
import { query } from '../pg.js';

export const adminRoutes = Router();

// =====================================
// Advertisement Media Upload
// =====================================
// Media & Video Upload
// =====================================
adminRoutes.post('/upload-media', requireAdmin, async (req: any, res: any) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      res.status(400).json({ success: false, message: 'Missing file data' });
      return;
    }
    
    const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const mimeMatch = fileData.match(/^data:([A-Za-z-+/]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    const buffer = Buffer.from(base64Data, 'base64');
    const isVideo = mimeType.startsWith('video/') || (fileName && /\.(mp4|webm|mov|mkv|avi|ogg)$/i.test(fileName));
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    
    if (buffer.length > maxSize) {
      res.status(400).json({ 
        success: false, 
        message: isVideo ? 'ভিডিও ফাইলটি ১০০ মেগাবাইটের বেশি হতে পারবে না (File exceeds 100MB)' : 'ফাইলটি ১৫ মেগাবাইটের বেশি হতে পারবে না (File exceeds 15MB)' 
      });
      return;
    }
    
    const mediaId = crypto.randomUUID() + (fileName ? '_' + fileName.replace(/[^a-zA-Z0-9.]/g, '') : (isVideo ? '.mp4' : '.jpg'));
    
    // 1. Write to local disk cache immediately (takes milliseconds)
    const cacheDir = path.join(process.cwd(), 'uploads', 'media');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(path.join(cacheDir, mediaId), buffer);

    // 2. Save metadata and full buffer to PostgreSQL DB for durable persistence
    db.saveUploadedMedia({ id: mediaId, filename: fileName || mediaId, mimeType, buffer })
      .catch(cacheErr => console.warn('[Admin Upload] Background DB save notice:', cacheErr));
    
    const mediaUrl = isVideo ? `/api/media/videos/${mediaId}` : `/api/media/images/${mediaId}`;
    res.json({ success: true, url: mediaUrl });
  } catch (err: any) {
    console.error('Admin upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed: ' + (err.message || 'Server error') });
  }
});


const MASTER_PERMISSIONS: AdminPermission[] = [
  'MOSQUE_VIEW', 'MOSQUE_CREATE', 'MOSQUE_EDIT', 'MOSQUE_DELETE',
  'SHOP_VIEW', 'SHOP_CREATE', 'SHOP_EDIT', 'SHOP_DELETE', 'SHOP_DISCOUNT_APPROVE',
  'PRODUCT_APPROVE', 'PRODUCT_MANAGE',
  'USER_VIEW', 'USER_EDIT', 'USER_STATUS', 'USER_DELETE',
  'SUPPORT_VIEW', 'SUPPORT_REPLY',
  'ADMIN_VIEW', 'ADMIN_CREATE', 'ADMIN_EDIT', 'ADMIN_DELETE',
  'NASIHA_VIEW', 'NASIHA_MANAGE',
  'HELPLINE_VIEW', 'HELPLINE_MANAGE',
  'ORDER_VIEW', 'ORDER_MANAGE',
  'ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE',
  'DELIVERY_VIEW', 'DELIVERY_MANAGE',
  'ADS_VIEW', 'ADS_MANAGE',
  'COMMISSION_VIEW', 'COMMISSION_MANAGE',
  'NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE',
  'ANALYTICS_VIEW',
  'MODERATION_VIEW', 'MODERATION_MANAGE',
  'SYSTEM_VIEW', 'AUDIT_VIEW'
];

// Strict server-side admin session token verification middleware
async function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  // Extract token from Authorization header (with or without 'Bearer '), custom headers, or query parameters
  let token: string | null = null;
  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  }
  if (!token && req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  }
  if (!token && req.headers['x-admin-key']) {
    token = String(req.headers['x-admin-key']).trim();
  }
  if (!token && (req.query.adminToken || req.query.token)) {
    token = String(req.query.adminToken || req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'এডমিন অনুমোদন প্রয়োজন। অনুগ্রহ করে এডমিন হিসেবে লগইন করুন।'
    });
  }

  // 0. Direct master key string match
  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim();
  const validMasterKeys = adminSecret ? [adminSecret] : [];

  if (validMasterKeys.length > 0 && validMasterKeys.includes(token)) {
    req.admin = {
      id: 'MASTER',
      name: 'Master Admin',
      role: 'MASTER_ADMIN',
      permissions: MASTER_PERMISSIONS
    };
    return next();
  }

  // 1. Verify signed JWT Admin Session Token
  const jwtAdmin = verifyAdminToken(token);
  if (jwtAdmin) {
    if (jwtAdmin.sub !== 'MASTER') {
      try {
        const adminAccount = await db.getAdminAccountById(jwtAdmin.sub);
        if (adminAccount) {
          if (adminAccount.status === 'suspended') {
            return res.status(403).json({
              success: false,
              error: 'SUSPENDED',
              message: 'আপনার এডমিন অ্যাকাউন্টটি স্থগিত করা হয়েছে।'
            });
          }
          req.admin = {
            ...adminAccount,
            permissions: (adminAccount.permissions && adminAccount.permissions.length > 0)
              ? adminAccount.permissions
              : MASTER_PERMISSIONS
          };
          return next();
        }
      } catch (err) {
        console.warn('[requireAdmin] DB lookup for admin failed, proceeding with JWT payload:', err);
      }
    }

    req.admin = {
      id: jwtAdmin.sub,
      name: jwtAdmin.name || (jwtAdmin.sub === 'MASTER' ? 'Master Admin' : 'Admin'),
      role: jwtAdmin.role,
      permissions: (jwtAdmin.permissions && jwtAdmin.permissions.length > 0)
        ? jwtAdmin.permissions
        : MASTER_PERMISSIONS
    };
    return next();
  }

  // 2. Validate custom Admin account database session token (ADM-TOK-...)
  if (token.startsWith('ADM-TOK-')) {
    const admin = await db.getAdminAccountByToken(token);
    if (admin) {
      if (admin.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'SUSPENDED',
          message: 'আপনার এডমিন অ্যাকাউন্টটি স্থগিত করা হয়েছে।'
        });
      }
      req.admin = {
        ...admin,
        permissions: (admin.permissions && admin.permissions.length > 0) ? admin.permissions : MASTER_PERMISSIONS
      };
      return next();
    }
  }

  // 3. Check merchant token for explicit ADMIN or SUPER_ADMIN role (JWT or legacy token)
  const merchantPayload = verifyMerchantToken(token);
  if (merchantPayload && (merchantPayload.role === 'ADMIN' || merchantPayload.role === 'SUPER_ADMIN')) {
    req.admin = {
      id: merchantPayload.id || merchantPayload.sub,
      name: merchantPayload.name || 'Merchant Admin',
      role: merchantPayload.role,
      permissions: MASTER_PERMISSIONS
    };
    return next();
  }


  // 4. Also check if the token is a valid user token for a user with role === 'ADMIN' or 'SUPER_ADMIN'
  const userPayload = verifyUserToken(token);
  if (userPayload && userPayload.sub) {
    try {
      const user = await db.getUserById(userPayload.sub);
      const userRole = (user as any)?.role || userPayload.role;
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        req.admin = {
          id: user?.id || userPayload.sub,
          name: user?.fullName || userPayload.fullName || 'Admin User',
          role: userRole,
          permissions: MASTER_PERMISSIONS
        };
        return next();
      }
    } catch (err) {
      console.warn('[requireAdmin] Error checking user role for admin token:', err);
    }
  }

  return res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
    message: 'প্রবেশাধিকার সংরক্ষিত। সঠিক এডমিন সেশন টোকেন প্রয়োজন।'
  });
}

function requirePermission(permissionOrList: AdminPermission | AdminPermission[]) {
  const permissions = Array.isArray(permissionOrList) ? permissionOrList : [permissionOrList];
  return async (req: any, res: any, next: any) => {
    await requireAdmin(req, res, () => {
      const admin = req.admin;
      if (!admin) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'অননুমোদিত।' });
      }

      // MASTER_ADMIN or SUPER_ADMIN or MASTER automatically gets ALL permissions
      if (
        admin.role === 'MASTER_ADMIN' ||
        admin.role === 'SUPER_ADMIN' ||
        admin.id === 'MASTER' ||
        admin.role === 'ADMIN' ||
        admin.role === 'SUB_ADMIN'
      ) {
        return next();
      }

      // Allow any admin role to view stats and analytics (vital dashboard features)
      if (permissions.includes('ANALYTICS_VIEW') || permissions.includes('SYSTEM_VIEW')) {
        return next();
      }

      // Check granular permissions
      if (admin.permissions && permissions.some(p => admin.permissions.includes(p))) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'প্রবেশাধিকার সংরক্ষিত। এই কাজের জন্য প্রয়োজনীয় এডমিন পারমিশন নেই।'
      });
    });
  };
}

/**
 * GET /api/admin/stats
 * Production overview telemetry
 */
adminRoutes.get('/stats', requirePermission('SYSTEM_VIEW'), async (req, res) => {
  try {
    const stats = await db.getSystemStatsSummary();
    res.json({
      success: true,
      stats,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * GET /api/admin/mosques
 */
adminRoutes.get('/mosques', requirePermission('MOSQUE_VIEW'), async (req, res) => {
  try {
    const mosques = await db.getAllMosquesAdmin();
    res.json({ success: true, count: mosques.length, mosques });
  } catch (err: any) {
    console.error('Admin mosques error:', err);
    res.status(500).json({ success: false, message: 'মসজিদ তালিকা লোড করতে সমস্যা।' });
  }
});

/**
 * GET /api/admin/mosques/check-duplicates
 */
adminRoutes.get('/mosques/check-duplicates', requirePermission('MOSQUE_VIEW'), async (req: any, res) => {
  try {
    const { name, nameBn, latitude, longitude, excludeId } = req.query;
    const duplicates = await db.findDuplicateMosques({
      name: name ? String(name) : undefined,
      nameBn: nameBn ? String(nameBn) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      excludeId: excludeId ? String(excludeId) : undefined
    });
    res.json({ success: true, count: duplicates.length, duplicates });
  } catch (err: any) {
    console.error('Check duplicate mosques error:', err);
    res.status(500).json({ success: false, message: 'ডুপ্লিকেট মসজিদ যাচাইকরণে সমস্যা।' });
  }
});

/**
 * POST /api/admin/mosques
 * Create new mosque with cryptographic QR
 */
adminRoutes.post('/mosques', requirePermission('MOSQUE_CREATE'), async (req: any, res) => {
  try {
    const {
      name, nameBn, address, area, district, imamName, contactNumber,
      status, latitude, longitude, verificationRadius, description, imageUrl, imamImageUrl
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'মসজিদের নাম আবশ্যক।' });
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ success: false, message: 'মসজিদের ঠিকানা আবশ্যক।' });
    }

    const createdMosque = await db.createMosque({
      name: name.trim(),
      nameBn: (nameBn || name).trim(),
      address: address.trim(),
      area: (area || 'Unknown').trim(),
      district: (district || 'Dhaka').trim(),
      imamName: imamName?.trim(),
      contactNumber: contactNumber?.trim(),
      status: ['active', 'pending', 'rejected', 'inactive'].includes(status) ? status : 'active',
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      verificationRadius: (verificationRadius != null && Number(verificationRadius) > 0) ? Number(verificationRadius) : 75,
      description: description?.trim(),
      imageUrl: imageUrl?.trim(),
      imamImageUrl: imamImageUrl?.trim()
    });

    res.status(201).json({
      success: true,
      mosque: createdMosque,
      message: `নতুন মসজিদ "${createdMosque.nameBn || createdMosque.name}" সফলভাবে যুক্ত করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Create mosque error:', err);
    res.status(500).json({ success: false, message: 'মসজিদ তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/mosques/:id
 * Edit mosque full details
 */
adminRoutes.put('/mosques/:id', requirePermission('MOSQUE_EDIT'), async (req: any, res) => {
  try {
    const {
      name, nameBn, address, area, district, imamName, contactNumber,
      status, latitude, longitude, verificationRadius, description, imageUrl, imamImageUrl
    } = req.body;

    const updated = await db.updateMosque(req.params.id, {
      name,
      nameBn,
      address,
      area,
      district,
      imamName,
      contactNumber,
      status,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      verificationRadius: verificationRadius !== undefined ? Number(verificationRadius) : undefined,
      description,
      imageUrl,
      imamImageUrl
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      mosque: updated,
      message: `মসজিদ "${updated.nameBn || updated.name}" এর তথ্য সফলভাবে আপডেট করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Edit mosque error:', err);
    res.status(500).json({ success: false, message: 'মসজিদের তথ্য আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/mosques/:id/approve
 * Approve a pending mosque request (Generates QR, marks active, notifies user)
 */
adminRoutes.put('/mosques/:id/approve', requirePermission('MOSQUE_EDIT'), async (req: any, res) => {
  try {
    const adminName = req.admin?.name || req.admin?.id || 'Admin';
    const approved = await db.approveMosque(req.params.id, adminName);
    if (!approved) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      mosque: approved,
      message: `মসজিদ আবেদন "${approved.nameBn || approved.name}" অনুমোদিত ও সক্রিয় করা হয়েছে। লাইভ ডিরেক্টরিতে এখন এটি দৃশ্যমান।`
    });
  } catch (err: any) {
    console.error('Approve mosque error:', err);
    res.status(500).json({ success: false, message: 'মসজিদ অনুমোদন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/mosques/:id/reject
 * Reject a pending mosque request with reason
 */
adminRoutes.put('/mosques/:id/reject', requirePermission('MOSQUE_EDIT'), async (req: any, res) => {
  try {
    const { reason } = req.body;
    const adminName = req.admin?.name || req.admin?.id || 'Admin';
    const rejected = await db.rejectMosque(req.params.id, reason || '', adminName);
    if (!rejected) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      mosque: rejected,
      message: `মসজিদ আবেদন "${rejected.nameBn || rejected.name}" বাতিল করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Reject mosque error:', err);
    res.status(500).json({ success: false, message: 'মসজিদ আবেদন বাতিল করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/mosques/:id/status
 */
adminRoutes.put('/mosques/:id/status', requirePermission('MOSQUE_EDIT'), async (req: any, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'pending', 'rejected', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ স্ট্যাটাস' });
    }
    const updated = await db.updateMosqueStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি' });
    }

    res.json({ success: true, mosque: updated, message: 'মসজিদ স্ট্যাটাস আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update mosque status error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * POST /api/admin/mosques/:id/regenerate-qr
 */
adminRoutes.post('/mosques/:id/regenerate-qr', requirePermission('MOSQUE_EDIT'), async (req: any, res) => {
  try {
    const updated = await db.regenerateMosqueQr(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি' });
    }

    res.json({ success: true, mosque: updated, message: 'নতুন QR কোড জেনারেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Regenerate mosque QR error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/admin/mosques/:id
 * Delete a mosque from the system
 */
adminRoutes.delete('/mosques/:id', requirePermission('MOSQUE_DELETE'), async (req: any, res) => {
  try {
    const deleted = await db.deleteMosque(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'মসজিদ পাওয়া যায়নি।' });
    }

    res.json({ success: true, message: 'মসজিদটি সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete mosque error:', err);
    res.status(500).json({ success: false, message: 'মসজিদ মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/transactions
 */
adminRoutes.get('/transactions', requirePermission('SYSTEM_VIEW'), async (req, res) => {
  try {
    const transactions = await db.getAllTransactionsAdmin();
    res.json({ success: true, count: transactions.length, transactions });
  } catch (err: any) {
    console.error('Admin get transactions error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * GET /api/admin/config
 */
adminRoutes.get('/config', requirePermission('SHOP_VIEW'), async (req, res) => {
  try {
    const config = await db.getGlobalConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    console.error('Admin get config error:', err);
    res.status(500).json({ success: false, message: 'কনফিগারেশন লোড করতে সমস্যা।' });
  }
});

/**
 * PUT /api/admin/config
 */
adminRoutes.put('/config', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const { goldDiscountRate, silverDiscountRate, bronzeDiscountRate } = req.body;
    if (req.admin.role !== 'MASTER_ADMIN' && !req.admin.permissions?.includes('SHOP_EDIT')) {
      return res.status(403).json({ success: false, message: 'অনুমতি নেই।' });
    }

    const updated = await db.updateGlobalConfig({
      goldDiscountRate: goldDiscountRate !== undefined ? Number(goldDiscountRate) : undefined,
      silverDiscountRate: silverDiscountRate !== undefined ? Number(silverDiscountRate) : undefined,
      bronzeDiscountRate: bronzeDiscountRate !== undefined ? Number(bronzeDiscountRate) : undefined
    }, req.admin.id, req.admin.name);

    res.json({ success: true, config: updated, message: 'গ্লোবাল ডিসকাউন্ট কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update config error:', err);
    res.status(500).json({ success: false, message: 'কনফিগারেশন সংরক্ষণে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/shops
 */
adminRoutes.get('/shops', requirePermission('SHOP_VIEW'), async (req, res) => {
  try {
    const shops = await db.getAllShopsAdmin();
    res.json({ success: true, count: shops.length, shops });
  } catch (err: any) {
    console.error('Admin shops error:', err);
    res.status(500).json({ success: false, message: 'শপ তালিকা লোড করতে সমস্যা।' });
  }
});

/**
 * POST /api/admin/shops
 * Create new partner shop & merchant login account (with bcrypt hashed PIN)
 */
adminRoutes.post('/shops', requirePermission('SHOP_CREATE'), async (req: any, res) => {
  try {
    const {
      name,
      nameBn,
      category,
      phone,
      address,
      area,
      district,
      description,
      openingHours,
      goldDiscount,
      silverDiscount,
      bronzeDiscount,
      commissionRate,
      ownerName,
      ownerPin,
      status
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'শপের নাম আবশ্যক।' });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'শপ বা মার্চেন্ট ফোন নম্বর আবশ্যক।' });
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ success: false, message: 'শপের ঠিকানা আবশ্যক।' });
    }

    const { shop, merchant } = await db.createShop({
      name: name.trim(),
      nameBn: nameBn?.trim(),
      category: category?.trim() || 'food',
      phone: phone.trim(),
      address: address.trim(),
      area: area?.trim(),
      district: district?.trim(),
      description: description?.trim(),
      openingHours: openingHours?.trim(),
      goldDiscount: Number(goldDiscount) || 15,
      silverDiscount: Number(silverDiscount) || 10,
      bronzeDiscount: Number(bronzeDiscount) || 5,
      commissionRate: Number(commissionRate) || 0.05,
      ownerName: ownerName?.trim(),
      ownerPin: ownerPin ? String(ownerPin).trim() : undefined,
      status: ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'].includes(status) ? status : 'ACTIVE'
    });


    res.status(201).json({
      success: true,
      shop,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        phone: merchant.phone,
        role: merchant.role,
        shopId: merchant.shopId
      },
      message: `নতুন পার্টনার শপ "${shop.nameBn || shop.name}" সফলভাবে যুক্ত করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Create shop error:', err);
    res.status(500).json({ success: false, message: 'শপ তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/shops/:id/status
 */
adminRoutes.put('/shops/:id/status', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ শপ স্ট্যাটাস' });
    }
    const updated = await db.updateShopStatus(req.params.id, status as ShopStatus);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি' });
    }


    res.json({ success: true, shop: updated, message: 'শপ স্ট্যাটাস আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update shop status error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * POST /api/admin/shops/:id/approve-merchant
 * Approve a pending merchant application
 */
adminRoutes.post('/shops/:id/approve-merchant', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const updated = await db.approveMerchantRequest(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'মার্চেন্ট আবেদন পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      shop: updated,
      message: `"${updated.nameBn || updated.name}"-এর মার্চেন্ট আবেদন অনুমোদন করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Approve merchant error:', err);
    res.status(500).json({ success: false, message: 'আবেদন অনুমোদনে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/shops/:id/reject-merchant
 * Reject a pending merchant application
 */
adminRoutes.post('/shops/:id/reject-merchant', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const updated = await db.rejectMerchantRequest(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'মার্চেন্ট আবেদন পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      shop: updated,
      message: `"${updated.nameBn || updated.name}"-এর মার্চেন্ট আবেদন বাতিল করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Reject merchant error:', err);
    res.status(500).json({ success: false, message: 'আবেদন বাতিলে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/merchants
 * Fetch merchant verifications list with filter: status=pending|approved|correction|rejected|all|active
 */
adminRoutes.get('/merchants', requirePermission('SHOP_VIEW'), async (req: any, res) => {
  try {
    const statusFilter = String(req.query.status || 'ACTIVE').toUpperCase();
    const verifications = await db.getMerchantVerificationsByStatus(statusFilter);
    res.json({ success: true, count: verifications.length, verifications });
  } catch (err: any) {
    console.error('Admin merchants error:', err);
    res.status(500).json({ success: false, message: 'মার্চেন্ট আবেদন তালিকা লোড করতে সমস্যা।' });
  }
});

/**
 * DELETE /api/admin/merchants/:id
 * Permanently delete a merchant and shop
 */
adminRoutes.delete('/merchants/:id', requirePermission('SHOP_DELETE'), async (req: any, res) => {
  try {
    const success = await db.deletePartnerShop(req.params.id);
    if (success) {
      res.json({ success: true, message: 'পার্টনার শপ স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
    } else {
      res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    console.error('Delete merchant error:', err);
    res.status(500).json({ success: false, message: 'শপ মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/merchants/:id
 * Get single merchant verification details
 */
adminRoutes.get('/merchants/:id', requirePermission('SHOP_VIEW'), async (req: any, res) => {
  try {
    const verification = await db.getMerchantVerificationByMerchantId(req.params.id);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'মার্চেন্ট আবেদন রেকর্ড পাওয়া যায়নি।' });
    }
    const shop = await db.getShopById(verification.shopId);
    const commissionRequests = await db.getCommissionChangeRequests(verification.shopId);

    // Fallback for shop photo from partner_shops if not present on verification record
    const shopPhoto = verification.shopPhotoUrl || (shop ? shop.photoUrl : '') || '';
    verification.shopPhotoUrl = shopPhoto;

    res.json({
      success: true,
      verification: {
        ...verification,
        shopPhotoUrl: shopPhoto,
        nidFrontUrl: verification.nidFrontUrl || '',
        nidBackUrl: verification.nidBackUrl || '',
        ownerSelfieUrl: verification.ownerSelfieUrl || '',
        tradeLicenseUrl: verification.tradeLicenseUrl || ''
      },
      shop: shop ? { ...shop, qrSecret: undefined } : null,
      merchantId: verification.merchantId,
      account: {
        ownerName: verification.ownerName,
        phone: verification.phone,
        email: verification.email || null,
        createdAt: verification.createdAt || verification.submittedAt
      },
      shopDetails: {
        shopName: verification.shopName,
        businessType: verification.businessType,
        address: verification.shopAddress,
        district: verification.district,
        upazila: verification.upazilaThana,
        location: {
          latitude: verification.latitude || 0,
          longitude: verification.longitude || 0
        },
        businessDescription: verification.businessDescription || '',
        shopPhoto: shopPhoto,
        shopPhotoUrl: shopPhoto
      },
      ownerVerification: {
        nidNumber: verification.nidNumber,
        nidFrontImage: verification.nidFrontUrl || '',
        nidFrontUrl: verification.nidFrontUrl || '',
        nidBackImage: verification.nidBackUrl || '',
        nidBackUrl: verification.nidBackUrl || '',
        ownerSelfie: verification.ownerSelfieUrl || '',
        ownerSelfieUrl: verification.ownerSelfieUrl || ''
      },
      businessVerification: {
        tradeLicenseNumber: verification.tradeLicenseNumber,
        tradeLicenseImage: verification.tradeLicenseUrl || '',
        tradeLicenseUrl: verification.tradeLicenseUrl || '',
        tinNumber: verification.tinNumber || null,
        binVatNumber: verification.binVatNumber || null
      },
      commissionAgreement: {
        totalCommissionPercent: verification.acceptedTotalCommission,
        goldUserBenefitPercent: verification.acceptedGoldUserBenefit,
        goldPlatformCommissionPercent: verification.acceptedGoldPlatformCommission,
        silverUserBenefitPercent: verification.acceptedSilverUserBenefit,
        silverPlatformCommissionPercent: verification.acceptedSilverPlatformCommission,
        bronzeUserBenefitPercent: verification.acceptedBronzeUserBenefit,
        bronzePlatformCommissionPercent: verification.acceptedBronzePlatformCommission,
        agreementAccepted: verification.agreementAccepted,
        agreementAcceptedAt: verification.agreementAcceptedAt,
        agreementVersion: verification.agreementVersion
      },
      verificationStatus: verification.verificationStatus,
      merchantStatus: verification.merchantStatus,
      createdAt: verification.createdAt,
      commissionChangeRequests: commissionRequests
    });
  } catch (err: any) {
    console.error('Error in get merchant details endpoint:', err);
    res.status(500).json({ success: false, message: 'আবেদন বিবরণী লোড করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/admin/merchants/:id/approve and /api/admin/merchant-verifications/:id/approve
 * Approve merchant verification
 */
const handleApproveMerchant = async (req: any, res: any) => {
  try {
    const targetId = req.params.id;
    const adminName = req.admin?.name || 'Admin';

    const updated = await db.approveMerchantVerification(targetId, adminName);
    if (!updated) {
      const fallback = await db.approveMerchantRequest(targetId);
      if (!fallback) {
        return res.status(404).json({ success: false, message: 'মার্চেন্ট আবেদন পাওয়া যায়নি।' });
      }
      return res.json({
        success: true,
        shop: fallback,
        message: `"${fallback.nameBn || fallback.name}"-এর মার্চেন্ট আবেদন সফলভাবে অনুমোদন করা হয়েছে।`
      });
    }

    res.json({
      success: true,
      verification: updated,
      message: `"${updated.shopName || 'পার্টনার শপ'}"-এর মার্চেন্ট আবেদন সফলভাবে অনুমোদন করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Approve merchant error:', err);
    res.status(500).json({ success: false, message: err.message || 'অনুমোদনে সমস্যা হয়েছে।' });
  }
};

adminRoutes.post('/merchants/:id/approve', requirePermission('SHOP_EDIT'), handleApproveMerchant);
adminRoutes.post('/merchant-verifications/:id/approve', requirePermission('SHOP_EDIT'), handleApproveMerchant);

/**
 * POST /api/admin/merchants/:id/request-correction and /api/admin/merchant-verifications/:id/request-correction
 * Request correction on merchant verification
 */
const handleRequestCorrectionMerchant = async (req: any, res: any) => {
  try {
    const { message, requestedFields } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'সংশোধনের বিবরণ প্রদান করুন।' });
    }

    const fields = Array.isArray(requestedFields) ? requestedFields : [];
    const updated = await db.requestCorrectionMerchantVerification(req.params.id, message, fields, req.admin?.name || 'Admin');

    res.json({
      success: true,
      verification: updated,
      message: 'মার্চেন্টকে সংশোধন অনুরোধ পাঠানো হয়েছে।'
    });
  } catch (err: any) {
    console.error('Request correction error:', err);
    res.status(500).json({ success: false, message: err.message || 'সংশোধন অনুরোধ পাঠাতে ব্যর্থ।' });
  }
};

adminRoutes.post('/merchants/:id/request-correction', requirePermission('SHOP_EDIT'), handleRequestCorrectionMerchant);
adminRoutes.post('/merchant-verifications/:id/request-correction', requirePermission('SHOP_EDIT'), handleRequestCorrectionMerchant);

/**
 * POST /api/admin/merchants/:id/reject and /api/admin/merchant-verifications/:id/reject
 * Reject merchant verification
 */
const handleRejectMerchant = async (req: any, res: any) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ success: false, message: 'বাতিলের কারণ প্রদান করুন।' });
    }

    const updated = await db.rejectMerchantVerification(req.params.id, reason, req.admin?.name || 'Admin');

    res.json({
      success: true,
      verification: updated,
      message: 'মার্চেন্ট আবেদনটি বাতিল করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Reject merchant error:', err);
    res.status(500).json({ success: false, message: err.message || 'আবেদন বাতিলে সমস্যা হয়েছে।' });
  }
};

adminRoutes.post('/merchants/:id/reject', requirePermission('SHOP_EDIT'), handleRejectMerchant);
adminRoutes.post('/merchant-verifications/:id/reject', requirePermission('SHOP_EDIT'), handleRejectMerchant);

/**
 * GET /api/admin/commission-policy
 */
adminRoutes.get('/commission-policy', requirePermission('SYSTEM_VIEW'), async (req: any, res) => {
  try {
    const policy = await db.getCommissionPolicy();
    res.json({ success: true, policy });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কমিশন পলিসি ডাটা লোড করতে সমস্যা।' });
  }
});

/**
 * PUT /api/admin/commission-policy
 */
adminRoutes.put('/commission-policy', requirePermission('SYSTEM_VIEW'), async (req: any, res) => {
  try {
    const saved = await db.saveCommissionPolicy(req.body, req.admin.id, req.admin.name);


    res.json({
      success: true,
      policy: saved,
      message: 'কমিশন পলিসি সফলভাবে আপডেট করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Update commission policy error:', err);
    res.status(400).json({ success: false, message: err.message || 'কমিশন পলিসি আপডেট করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/admin/shops/:id/approve-offer
 * Approve a pending offer / discount update
 */
adminRoutes.post('/shops/:id/approve-offer', requirePermission('SHOP_DISCOUNT_APPROVE'), async (req: any, res) => {
  try {
    const updated = await db.approveOfferRequest(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      shop: updated,
      message: `"${updated.nameBn || updated.name}"-এর নতুন অফার/ডিসকাউন্ট অনুমোদন করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Approve offer error:', err);
    res.status(500).json({ success: false, message: 'অফার অনুমোদনে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/shops/:id/reject-offer
 * Reject a pending offer / discount update
 */
adminRoutes.post('/shops/:id/reject-offer', requirePermission('SHOP_DISCOUNT_APPROVE'), async (req: any, res) => {
  try {
    const updated = await db.rejectOfferRequest(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      shop: updated,
      message: `"${updated.nameBn || updated.name}"-এর পেন্ডিং অফার আপডেট বাতিল করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Reject offer error:', err);
    res.status(500).json({ success: false, message: 'অফার বাতিলে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/offer-change-requests
 * Retrieve all pending merchant offer change requests
 */
adminRoutes.get('/offer-change-requests', requireAdmin, async (req, res) => {
  try {
    const shops = await db.getAllShopsAdmin();
    const pendingShops = shops.filter(
      s => s.pendingGoldDiscount != null || s.pendingSilverDiscount != null || s.pendingBronzeDiscount != null
    );

    const requests = pendingShops.map(s => ({
      id: `REQ-${s.id}`,
      shopId: s.id,
      shopName: s.nameBn || s.name,
      phone: s.phone,
      area: s.area,
      district: s.district,
      currentOffer: {
        goldDiscount: s.goldDiscount,
        silverDiscount: s.silverDiscount,
        bronzeDiscount: s.bronzeDiscount
      },
      requestedOffer: {
        goldDiscount: s.pendingGoldDiscount != null ? s.pendingGoldDiscount : s.goldDiscount,
        silverDiscount: s.pendingSilverDiscount != null ? s.pendingSilverDiscount : s.silverDiscount,
        bronzeDiscount: s.pendingBronzeDiscount != null ? s.pendingBronzeDiscount : s.bronzeDiscount
      },
      status: 'pending',
      createdAt: s.updatedAt
    }));

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get offer change requests error:', err);
    res.status(500).json({ success: false, message: 'পেন্ডিং অফার তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PATCH /api/admin/offer-change-requests/:requestId
 * Approve or reject an offer change request
 */
adminRoutes.patch('/offer-change-requests/:requestId', requirePermission('SHOP_DISCOUNT_APPROVE'), async (req: any, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const shopId = requestId.startsWith('REQ-') ? requestId.substring(4) : requestId;

    if (status === 'approved') {
      const updated = await db.approveOfferRequest(shopId);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'দোকান অথবা পেন্ডিং অফার পাওয়া যায়নি।' });
      }


      return res.json({
        success: true,
        message: `"${updated.nameBn || updated.name}"-এর নতুন অফার অনুমোদন করা হয়েছে।`,
        shop: updated
      });
    } else if (status === 'rejected') {
      const updated = await db.rejectOfferRequest(shopId);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
      }


      return res.json({
        success: true,
        message: `"${updated.nameBn || updated.name}"-এর অফার পরিবর্তনের অনুরোধ প্রত্যাখ্যান করা হয়েছে।`,
        shop: updated
      });
    } else {
      return res.status(400).json({ success: false, message: 'স্ট্যাটাস approved বা rejected হতে হবে।' });
    }
  } catch (err: any) {
    console.error('Update offer change request status error:', err);
    res.status(500).json({ success: false, message: 'অফার স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/commission-change-requests
 * Get all commission change requests
 */
adminRoutes.get('/commission-change-requests', requireAdmin, async (req: any, res) => {
  try {
    const { shopId } = req.query;
    const requests = await db.getCommissionChangeRequests(shopId as string);
    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get commission change requests error:', err);
    res.status(500).json({ success: false, message: 'কমিশন পরিবর্তনের অনুরোধ তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PATCH /api/admin/commission-change-requests/:requestId
 * Approve or reject a commission change request
 */
adminRoutes.patch('/commission-change-requests/:requestId', requirePermission('SHOP_DISCOUNT_APPROVE'), async (req: any, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'স্ট্যাটাস approved বা rejected হতে হবে।' });
    }

    const updated = await db.reviewCommissionChangeRequest(requestId, status, req.admin.id);


    res.json({
      success: true,
      message: status === 'approved' ? 'কমিশন পরিবর্তনের অনুরোধ সফলভাবে অনুমোদিত হয়েছে।' : 'কমিশন পরিবর্তনের অনুরোধ প্রত্যাখ্যান করা হয়েছে।',
      request: updated
    });
  } catch (err: any) {
    console.error('Review commission change request error:', err);
    res.status(500).json({ success: false, message: err.message || 'কমিশন পরিবর্তনের অনুরোধ আপডেট করতে ব্যর্থ।' });
  }
});

// ============================================================
// ADMIN: PRODUCT MANAGEMENT APPROVAL SYSTEM ENDPOINTS
// ============================================================

/**
 * GET /api/admin/products/add-requests
 * Retrieve all pending product add requests
 */
adminRoutes.get('/products/add-requests', requireAdmin, async (req: any, res: any) => {
  try {
    const requests = await db.getPendingProductAddRequests();
    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get product add requests error:', err);
    res.status(500).json({ success: false, message: 'পণ্য যোগ করার পেন্ডিং রিকোয়েস্ট তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/add-requests/:productId/approve
 * Approve new product add request
 */
adminRoutes.post('/products/add-requests/:productId/approve', requireAdmin, async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.approveProductAddRequest(productId, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Approve product add request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য অনুমোদন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/add-requests/:productId/reject
 * Reject new product add request with mandatory reason
 */
adminRoutes.post('/products/add-requests/:productId/reject', requireAdmin, async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.id || 'MASTER';

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'প্রত্যাখ্যান করার উপযুক্ত কারণ প্রদান করুন।' });
    }

    const result = await db.rejectProductAddRequest(productId, reason, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Reject product add request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য প্রত্যাখান করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/products/add-requests/:productId
 * Delete product add request record permanently
 */
adminRoutes.delete('/products/add-requests/:productId', requireAdmin, async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.deleteProductAddRequest(productId, adminId);
    res.json(result);
  } catch (err: any) {
    console.error('Delete product add request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য রিকোয়েস্ট ডিলেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/products/price-change-requests
 * Retrieve all pending product price change requests
 */
adminRoutes.get('/products/price-change-requests', requireAdmin, async (req: any, res: any) => {
  try {
    const requests = await db.getPendingPriceChangeRequests();
    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get price change requests error:', err);
    res.status(500).json({ success: false, message: 'প্রাইস পরিবর্তনের পেন্ডিং রিকোয়েস্ট তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/price-change-requests/:requestId/approve
 * Approve product price change request
 */
adminRoutes.post('/products/price-change-requests/:requestId/approve', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.approvePriceChangeRequest(requestId, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Approve price change request error:', err);
    res.status(500).json({ success: false, message: 'মূল্য পরিবর্তন অনুমোদন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/price-change-requests/:requestId/reject
 * Reject product price change request with mandatory reason
 */
adminRoutes.post('/products/price-change-requests/:requestId/reject', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.id || 'MASTER';

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'প্রত্যাখ্যান করার উপযুক্ত কারণ প্রদান করুন।' });
    }

    const result = await db.rejectPriceChangeRequest(requestId, reason, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Reject price change request error:', err);
    res.status(500).json({ success: false, message: 'মূল্য পরিবর্তন প্রত্যাখ্যান করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/products/price-change-requests/:requestId
 * Delete product price change request record
 */
adminRoutes.delete('/products/price-change-requests/:requestId', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.deletePriceChangeRequestRecord(requestId, adminId);
    res.json(result);
  } catch (err: any) {
    console.error('Delete price change request record error:', err);
    res.status(500).json({ success: false, message: 'প্রাইস চেঞ্জ রিকোয়েস্ট রেকর্ড মুছে ফেলতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/products/delete-requests
 * Retrieve all pending product delete requests
 */
adminRoutes.get('/products/delete-requests', requireAdmin, async (req: any, res: any) => {
  try {
    const requests = await db.getPendingDeleteRequests();
    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get delete requests error:', err);
    res.status(500).json({ success: false, message: 'পণ্য ডিলেট করার পেন্ডিং রিকোয়েস্ট তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/delete-requests/:requestId/approve
 * Approve product delete request
 */
adminRoutes.post('/products/delete-requests/:requestId/approve', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.approveDeleteRequest(requestId, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Approve delete request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য ডিলেট রিকোয়েস্ট অনুমোদন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/products/delete-requests/:requestId/reject
 * Reject product delete request with mandatory reason
 */
adminRoutes.post('/products/delete-requests/:requestId/reject', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.id || 'MASTER';

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'প্রত্যাখ্যান করার উপযুক্ত কারণ প্রদান করুন।' });
    }

    const result = await db.rejectDeleteRequest(requestId, reason, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Reject delete request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য ডিলেট রিকোয়েস্ট প্রত্যাখ্যান করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/products/delete-requests/:requestId
 * Delete product delete request record
 */
adminRoutes.delete('/products/delete-requests/:requestId', requireAdmin, async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const result = await db.deleteDeleteRequestRecord(requestId, adminId);
    res.json(result);
  } catch (err: any) {
    console.error('Delete delete request record error:', err);
    res.status(500).json({ success: false, message: 'ডিলেট রিকোয়েস্ট রেকর্ড মুছে ফেলতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/shops/:shopId/offers
 * Get active shop offers (commission and token discounts)
 */
adminRoutes.get('/shops/:shopId/offers', requireAdmin, async (req: any, res) => {
  try {
    const { shopId } = req.params;
    const offers = await db.getShopOffers(shopId);
    res.json({
      success: true,
      ...offers
    });
  } catch (err: any) {
    console.error('Get shop offers error:', err);
    res.status(500).json({ success: false, message: err.message || 'শপ অফার সেটিংস লোড করতে ব্যর্থ।' });
  }
});

/**
 * PUT /api/admin/shops/:shopId/offers
 * Create or update shop offer settings (commission and token discounts)
 */
adminRoutes.put('/shops/:shopId/offers', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const { shopId } = req.params;
    const { commissionPercent, goldDiscountPercent, silverDiscountPercent, bronzeDiscountPercent } = req.body;

    const comm = Number(commissionPercent);
    const gold = Number(goldDiscountPercent);
    const silver = Number(silverDiscountPercent);
    const bronze = Number(bronzeDiscountPercent);

    if (isNaN(comm) || comm < 0 || comm > 100) {
      return res.status(400).json({ success: false, message: 'কমিশন শতাংশ অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
    }
    if (isNaN(gold) || gold < 0 || gold > 100) {
      return res.status(400).json({ success: false, message: 'Gold ডিসকাউন্ট শতাংশ অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
    }
    if (isNaN(silver) || silver < 0 || silver > 100) {
      return res.status(400).json({ success: false, message: 'Silver ডিসকাউন্ট শতাংশ অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
    }
    if (isNaN(bronze) || bronze < 0 || bronze > 100) {
      return res.status(400).json({ success: false, message: 'Bronze ডিসকাউন্ট শতাংশ অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
    }

    const updated = await db.updateShopOffers(shopId, {
      commissionPercent: comm,
      goldDiscountPercent: gold,
      silverDiscountPercent: silver,
      bronzeDiscountPercent: bronze
    }, req.admin.name || req.admin.id);


    res.json({
      success: true,
      message: 'শপ অফার ও কমিশন সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।',
      ...updated
    });
  } catch (err: any) {
    console.error('Update shop offers error:', err);
    res.status(500).json({ success: false, message: err.message || 'শপ অফার সেটিংস সংরক্ষণ করতে ব্যর্থ।' });
  }
});

/**
 * PUT /api/admin/shops/:id
 * Update shop details, discounts (Gold, Silver, Bronze), commission, and status
 */
adminRoutes.put('/shops/:id', requirePermission('SHOP_EDIT'), async (req: any, res) => {
  try {
    const {
      name,
      nameBn,
      category,
      phone,
      address,
      area,
      district,
      description,
      openingHours,
      goldDiscount,
      silverDiscount,
      bronzeDiscount,
      commissionRate,
      status
    } = req.body;

    const parsedGold = goldDiscount !== undefined ? Number(goldDiscount) : undefined;
    const parsedSilver = silverDiscount !== undefined ? Number(silverDiscount) : undefined;
    const parsedBronze = bronzeDiscount !== undefined ? Number(bronzeDiscount) : undefined;
    const parsedCommission = commissionRate !== undefined ? Number(commissionRate) : undefined;

    if (parsedGold !== undefined && (isNaN(parsedGold) || parsedGold < 0 || parsedGold > 100)) {
      return res.status(400).json({ success: false, message: 'Gold ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।' });
    }
    if (parsedSilver !== undefined && (isNaN(parsedSilver) || parsedSilver < 0 || parsedSilver > 100)) {
      return res.status(400).json({ success: false, message: 'Silver ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।' });
    }
    if (parsedBronze !== undefined && (isNaN(parsedBronze) || parsedBronze < 0 || parsedBronze > 100)) {
      return res.status(400).json({ success: false, message: 'Bronze ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।' });
    }
    if (parsedCommission !== undefined && (isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100)) {
      return res.status(400).json({ success: false, message: 'কমিশন রেট ০% থেকে ১০০% এর মধ্যে হতে হবে।' });
    }
    if (status !== undefined && !['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ শপ স্ট্যাটাস।' });
    }

    // Role validation: Cannot change commission unless MASTER_ADMIN
    if (parsedCommission !== undefined && req.admin.role !== 'MASTER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'কমিশন রেট পরিবর্তন শুধুমাত্র মাস্টার এডমিনের জন্য সংরক্ষিত।'
      });
    }

    const updated = await db.updateShopAdmin(req.params.id, {
      name,
      nameBn,
      category,
      phone,
      address,
      area,
      district,
      description,
      openingHours,
      goldDiscount: parsedGold,
      silverDiscount: parsedSilver,
      bronzeDiscount: parsedBronze,
      commissionRate: parsedCommission,
      status
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      shop: updated,
      message: `"${updated.nameBn || updated.name}"-এর ডিসকাউন্ট ও কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Update shop error:', err);
    res.status(500).json({ success: false, message: 'শপ সেটিংস সংরক্ষণে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/shops/:id
 * Get details of a single shop
 */
adminRoutes.get('/shops/:id', requirePermission('SHOP_VIEW'), async (req: any, res) => {
  try {
    const shop = await db.getShopById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
    }
    res.json({ success: true, shop });
  } catch (err: any) {
    console.error('Get shop error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/admin/shops/:id
 * Delete a shop from the system
 */
adminRoutes.delete('/shops/:id', requirePermission('SHOP_DELETE'), async (req: any, res) => {
  try {
    const deleted = await db.deleteShop(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
    }


    res.json({ success: true, message: 'পার্টনার শপটি সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete shop error:', err);
    res.status(500).json({ success: false, message: 'শপ মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/users
 */
adminRoutes.get('/users', requirePermission('USER_VIEW'), async (req, res) => {
  try {
    const { 
      search, 
      maritalStatus, 
      gender, 
      status, 
      district, 
      upazila, 
      minAge, 
      maxAge, 
      sortBy, 
      sortOrder 
    } = req.query;

    const users = await db.getAllUsersAdminWithStats({
      search: search as string,
      maritalStatus: maritalStatus as string,
      gender: gender as string,
      status: status as string,
      district: district as string,
      upazila: upazila as string,
      minAge: minAge ? parseInt(minAge as string) : undefined,
      maxAge: maxAge ? parseInt(maxAge as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC'
    });
    
    res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'ইউজার তালিকা লোড করতে সমস্যা।' });
  }
});

/**
 * GET /api/admin/users/:id
 * Fetch individual user registration & profile details safely
 */
adminRoutes.get('/users/:id', requirePermission('USER_VIEW'), async (req, res) => {
  try {
    const userDetails = await db.getUserDetailsAdmin(req.params.id);
    if (!userDetails) {
      return res.status(404).json({ success: false, message: 'ইউজারের তথ্য পাওয়া যায়নি।' });
    }
    res.json({ success: true, user: userDetails });
  } catch (err: any) {
    console.error('Admin user details error:', err);
    res.status(500).json({ success: false, message: 'ইউজারের তথ্য লোড করা যায়নি।' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 */
adminRoutes.put('/users/:id/status', requirePermission('USER_STATUS'), async (req: any, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ ইউজার স্ট্যাটাস' });
    }
    const updated = await db.updateUserStatus(req.params.id, status as any);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি' });
    }


    res.json({ success: true, user: updated, message: 'ইউজার স্ট্যাটাস আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update user status error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user from the system (Cascade deletes tokens, attendances, notifications, support tickets)
 */
adminRoutes.delete('/users/:id', requirePermission('USER_STATUS'), async (req: any, res) => {
  try {
    const deleted = await db.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }


    res.json({ success: true, message: 'ব্যবহারকারীর অ্যাকাউন্টটি ডাটাবেস থেকে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'ইউজার মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/verify
 * Secure admin key verification for Admin Portal UI with rate limiting
 */
adminRoutes.post('/verify', adminAuthRateLimiter, async (req, res) => {
  const requestId = 'ADM-REQ-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  console.log(`ADMIN_AUTH_TRACE_START requestId=${requestId}`);
  console.log(`ADMIN_AUTH_TRACE_ROUTE_REACHED requestId=${requestId}`);

  // STEP 1: Validate request body
  const hasBody = !!(req.body && typeof req.body === 'object');
  console.log(`ADMIN_AUTH_TRACE_BODY_RECEIVED requestId=${requestId} hasBody=${hasBody}`);

  if (!hasBody) {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=400 success=false error=INVALID_REQUEST`);
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'অনুরোধের তথ্য সঠিক নয়।'
    });
  }

  const { adminKey, email, phone, password } = req.body;

  const adminKeyPresent = !!(adminKey && typeof adminKey === 'string' && adminKey.trim().length > 0);
  const emailPresent = !!(email && typeof email === 'string' && email.trim().length > 0);
  const phonePresent = !!(phone && typeof phone === 'string' && phone.trim().length > 0);
  const passwordPresent = !!(password && typeof password === 'string' && password.trim().length > 0);

  console.log(`ADMIN_AUTH_TRACE_ADMIN_KEY_PRESENT requestId=${requestId} present=${adminKeyPresent}`);
  console.log(`ADMIN_AUTH_TRACE_EMAIL_PRESENT requestId=${requestId} present=${emailPresent}`);
  console.log(`ADMIN_AUTH_TRACE_PHONE_PRESENT requestId=${requestId} present=${phonePresent}`);
  console.log(`ADMIN_AUTH_TRACE_PASSWORD_PRESENT requestId=${requestId} present=${passwordPresent}`);

  // Check Master Secret Key Login (Super Admin / Master Override)
  const configuredAdminSecret = process.env.ADMIN_SECRET_KEY?.trim();
  const validMasterKeys = configuredAdminSecret ? [configuredAdminSecret] : [];

  const isMasterKeyMatch = Boolean(adminKeyPresent && validMasterKeys.length > 0 && validMasterKeys.includes(adminKey.trim()));
  console.log(`ADMIN_AUTH_TRACE_MASTER_KEY_MATCH requestId=${requestId} match=${isMasterKeyMatch}`);

  if (isMasterKeyMatch) {
    try {
      const sessionToken = generateAdminToken({
        id: 'MASTER',
        role: 'MASTER_ADMIN',
        name: 'Master Admin',
        permissions: MASTER_PERMISSIONS
      });

      console.log(`ADMIN_AUTH_TRACE_JWT_SUCCESS requestId=${requestId} tokenGenerated=true`);
      console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=200 success=true`);

      return res.json({
        success: true,
        token: sessionToken,
        role: 'MASTER_ADMIN',
        permissions: MASTER_PERMISSIONS,
        message: 'এডমিন এক্সেস অনুমোদিত'
      });
    } catch (jwtErr) {
      console.error(`ADMIN_AUTH_TRACE_JWT_ERROR requestId=${requestId}`, jwtErr);
      console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=500 success=false error=SERVER_ERROR`);
      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
      });
    }
  }

  // STEP 2: Normalize identifier and password safely
  const rawIdentifier = (emailPresent && email.trim()) ||
                        (phonePresent && phone.trim()) ||
                        (adminKeyPresent && adminKey.trim()) || null;

  const passwordToVerify = (passwordPresent && password.trim()) ||
                           (adminKeyPresent && !adminKey.includes('@') ? adminKey.trim() : null);

  const identifierResolved = !!(rawIdentifier && passwordToVerify);
  console.log(`ADMIN_AUTH_TRACE_IDENTIFIER_RESOLVED requestId=${requestId} resolved=${identifierResolved}`);

  if (!identifierResolved) {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=401 success=false error=INVALID_CREDENTIALS`);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'ভুল এডমিন সিক্রেট কী / ইমেইল ও পাসওয়ার্ড'
    });
  }

  const identifier = rawIdentifier!.trim().toLowerCase();

  // STEP 3: Find the Admin account ONLY by identifier
  console.log(`ADMIN_AUTH_TRACE_DB_LOOKUP_START requestId=${requestId}`);
  let admin: any = null;
  try {
    admin = await db.getAdminAccountByIdentifier(identifier);
  } catch (dbErr) {
    console.error(`ADMIN_AUTH_TRACE_DB_ERROR requestId=${requestId}`, dbErr);
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=500 success=false error=SERVER_ERROR`);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
    });
  }

  const accountFound = !!admin;
  console.log(`ADMIN_AUTH_TRACE_DB_ACCOUNT_FOUND requestId=${requestId} found=${accountFound}`);

  // STEP 4: If Admin account is not found
  if (!accountFound) {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=401 success=false error=INVALID_CREDENTIALS`);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'ভুল এডমিন সিক্রেট কী / ইমেইল ও পাসওয়ার্ড'
    });
  }

  if (admin.status === 'suspended') {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=403 success=false error=SUSPENDED`);
    return res.status(403).json({
      success: false,
      error: 'SUSPENDED',
      message: 'আপনার এডমিন অ্যাকাউন্টটি স্থগিত করা হয়েছে।'
    });
  }

  // STEP 5: If password_hash is missing or invalid
  const passwordHashPresent = !!(admin.passwordHash && typeof admin.passwordHash === 'string' && admin.passwordHash.startsWith('$2'));
  console.log(`ADMIN_AUTH_TRACE_PASSWORD_HASH_PRESENT requestId=${requestId} present=${passwordHashPresent}`);

  if (!passwordHashPresent) {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=401 success=false error=INVALID_CREDENTIALS`);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'ভুল এডমিন সিক্রেট কী / ইমেইল ও পাসওয়ার্ড'
    });
  }

  // STEP 6: Verify password with bcrypt
  let bcryptResult = false;
  try {
    bcryptResult = await bcrypt.compare(passwordToVerify!, admin.passwordHash);
  } catch (bcryptErr) {
    console.error(`ADMIN_AUTH_TRACE_BCRYPT_ERROR requestId=${requestId}`, bcryptErr);
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=401 success=false error=INVALID_CREDENTIALS`);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'ভুল এডমিন সিক্রেট কী / ইমেইল ও পাসওয়ার্ড'
    });
  }

  console.log(`ADMIN_AUTH_TRACE_BCRYPT_RESULT requestId=${requestId} result=${bcryptResult}`);

  // STEP 7: Never allow JWT generation when password verification fails
  if (!bcryptResult) {
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=401 success=false error=INVALID_CREDENTIALS`);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'ভুল এডমিন সিক্রেট কী / ইমেইল ও পাসওয়ার্ড'
    });
  }

  // STEP 8: Only if bcryptResult === true, generate JWT and return success
  try {
    const sessionToken = generateAdminToken({
      id: admin.id,
      role: admin.role,
      name: admin.name,
      permissions: admin.permissions
    });

    console.log(`ADMIN_AUTH_TRACE_JWT_SUCCESS requestId=${requestId} tokenGenerated=true`);
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=200 success=true`);

    return res.json({
      success: true,
      token: sessionToken,
      role: admin.role,
      permissions: admin.permissions,
      message: 'এডমিন এক্সেস অনুমোদিত'
    });
  } catch (jwtErr) {
    console.error(`ADMIN_AUTH_TRACE_JWT_ERROR requestId=${requestId}`, jwtErr);
    console.log(`ADMIN_AUTH_TRACE_RESPONSE_SENT requestId=${requestId} status=500 success=false error=SERVER_ERROR`);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
    });
  }
});

/**
 * GET /api/admin/activities
 */
adminRoutes.get('/activities', requirePermission('SYSTEM_VIEW'), async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const activities = await db.getSystemRecentActivity(limit);
    res.json({ success: true, count: activities.length, activities });
  } catch (err: any) {
    console.error('Admin activities error:', err);
    res.status(500).json({ success: false, message: 'এক্টিভিটি লোড করতে সমস্যা।' });
  }
});

/**
 * GET /api/admin/tickets
 */
adminRoutes.get('/tickets', requirePermission('SUPPORT_VIEW'), async (req, res) => {
  try {
    const tickets = await db.getAllSupportTickets();
    res.json({ success: true, count: tickets.length, tickets });
  } catch (err: any) {
    console.error('Admin tickets error:', err);
    res.status(500).json({ success: false, message: 'সাপোর্ট টিকিট লোড করতে সমস্যা।' });
  }
});

/**
 * PUT /api/admin/tickets/:id
 */
adminRoutes.put('/tickets/:id', requirePermission('SUPPORT_REPLY'), async (req: any, res) => {
  try {
    const { status, adminResponse } = req.body;
    if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ টিকিট স্ট্যাটাস' });
    }
    const updated = await db.updateSupportTicketStatus(req.params.id, status as SupportTicketStatus, adminResponse);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'টিকিট পাওয়া যায়নি' });
    }


    res.json({ success: true, ticket: updated, message: 'টিকিট আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update ticket error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/admin/tickets/clear
 * Clear all support ticket history or filtered by status
 */
adminRoutes.delete('/tickets/clear', requirePermission('SUPPORT_REPLY'), async (req: any, res) => {
  try {
    const { status } = req.query;
    const filterStatus = (status && typeof status === 'string') ? status as any : 'ALL';
    const deletedCount = await db.deleteAllSupportTickets(filterStatus);
    res.json({ success: true, deletedCount, message: `${deletedCount} টি সাপোর্ট টিকিটের ইতিহাস মুছে ফেলা হয়েছে।` });
  } catch (err: any) {
    console.error('Clear tickets error:', err);
    res.status(500).json({ success: false, message: 'টিকিটের ইতিহাস মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/tickets/:id
 * Delete a single support ticket
 */
adminRoutes.delete('/tickets/:id', requirePermission('SUPPORT_REPLY'), async (req: any, res) => {
  try {
    const deleted = await db.deleteSupportTicket(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'টিকিট পাওয়া যায়নি' });
    }
    res.json({ success: true, message: 'সাপোর্ট টিকিট মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete ticket error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * GET /api/admin/notifications
 */
adminRoutes.get('/notifications', requirePermission('SYSTEM_VIEW'), async (req, res) => {
  try {
    const notifications = await db.getAdminNotifications();
    res.json({ success: true, count: notifications.length, notifications });
  } catch (err: any) {
    console.error('Admin notifications error:', err);
    res.status(500).json({ success: false, message: 'নোটিফিকেশন লোড করতে সমস্যা।' });
  }
});

/**
 * PUT /api/admin/notifications/:id/read
 */
adminRoutes.put('/notifications/:id/read', requirePermission(['NOTIFICATION_VIEW', 'SYSTEM_VIEW']), async (req, res) => {
  try {
    const success = await db.markNotificationReadAdmin(req.params.id);
    if (success) {
      return res.json({ success: true, message: 'নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে।' });
    }
    res.status(404).json({ success: false, message: 'নোটিফিকেশন পাওয়া যায়নি।' });
  } catch (err: any) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * GET /api/admin/notification-templates
 * List all notification templates
 */
adminRoutes.get('/notification-templates', requirePermission(['NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE', 'SYSTEM_VIEW']), async (req, res) => {
  try {
    const templates = await NotificationService.getAllTemplates();
    res.json({ success: true, count: templates.length, templates });
  } catch (err: any) {
    console.error('Get notification templates error:', err);
    res.status(500).json({ success: false, message: 'টেমপ্লেট লোড করতে ব্যর্থ।' });
  }
});

/**
 * PUT /api/admin/notification-templates/:eventType
 * Edit title, title_bn, message, message_bn, and active status
 */
adminRoutes.put('/notification-templates/:eventType', requirePermission('NOTIFICATION_MANAGE'), async (req: any, res) => {
  try {
    const { eventType } = req.params;
    const { title, titleBn, message, messageBn, isActive } = req.body;

    if (title && title.length > 255) {
      return res.status(400).json({ success: false, message: 'শিরোনাম সর্বাধিক ২৫৫ অক্ষরের মধ্যে হতে হবে।' });
    }

    const updated = await NotificationService.updateTemplate(
      eventType,
      { title, titleBn, message, messageBn, isActive },
      req.admin?.id
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'উক্ত ইভেন্টের টেমপ্লেটটি পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      message: 'নোটিফিকেশন টেমপ্লেট সফলভাবে আপডেট করা হয়েছে।',
      template: updated
    });
  } catch (err: any) {
    console.error('Update notification template error:', err);
    res.status(500).json({ success: false, message: 'টেমপ্লেট সংরক্ষণ করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/admin/notification-templates/:eventType/preview
 * Generate a live sample preview for an admin
 */
adminRoutes.post('/notification-templates/:eventType/preview', requirePermission(['NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE']), async (req, res) => {
  try {
    const { eventType } = req.params;
    const { title, titleBn, message, messageBn, sampleData } = req.body;

    const tpl = await NotificationService.getTemplate(eventType);
    const sampleContext = {
      user_name: 'মোহাম্মদ করিম',
      mosque_name: 'বায়তুল আমান জামে মসজিদ',
      application_id: 'MSQ-98231',
      token_type: 'SILVER',
      shop_name: 'আমানাহ ডিপার্টমেন্টাল স্টোর',
      coupon_name: 'EID50',
      rejection_reason: 'মসজিদের স্পষ্ট ছবি ও সঠিক জিপিএস লোকেশন আবশ্যক',
      date: new Date().toLocaleDateString('bn-BD'),
      ...(sampleData || {})
    };

    const previewTitle = NotificationService.renderTemplate(title || tpl?.title || '', sampleContext);
    const previewTitleBn = NotificationService.renderTemplate(titleBn || tpl?.titleBn || '', sampleContext);
    const previewMessage = NotificationService.renderTemplate(message || tpl?.message || '', sampleContext);
    const previewMessageBn = NotificationService.renderTemplate(messageBn || tpl?.messageBn || '', sampleContext);

    res.json({
      success: true,
      preview: {
        title: previewTitle,
        titleBn: previewTitleBn,
        message: previewMessage,
        messageBn: previewMessageBn,
        sampleContext
      }
    });
  } catch (err: any) {
    console.error('Preview template error:', err);
    res.status(500).json({ success: false, message: 'প্রিভিউ তৈরিতে ব্যর্থ।' });
  }
});

/**
 * GET /api/admin/accounts
 * List all hierarchical admin accounts
 */
adminRoutes.get('/accounts', requirePermission('ADMIN_VIEW'), async (req: any, res) => {
  try {
    const accounts = (await db.getAllAdminAccounts()).map(a => {
      const { passwordHash, ...rest } = a;
      return rest;
    });
    res.json({ success: true, count: accounts.length, accounts });
  } catch (err: any) {
    console.error('Admin accounts error:', err);
    res.status(500).json({ success: false, message: 'এডমিন তালিকা লোড করতে সমস্যা।' });
  }
});

/**
 * POST /api/admin/accounts
 * Create new sub-admin/custom admin account
 */
adminRoutes.post('/accounts', requirePermission('ADMIN_CREATE'), async (req: any, res) => {
  try {
    const { name, email, phone, role, permissions, password } = req.body;

    if (!name || (!email && !phone) || !role || !password) {
      return res.status(400).json({ success: false, message: 'দয়া করে নাম, পাসওয়ার্ড, রোল এবং ইমেইল বা ফোন নম্বরের অন্তত একটি প্রদান করুন।' });
    }

    const created = await db.createAdminAccount({
      name,
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      role,
      permissions: Array.isArray(permissions) ? permissions : [],
      pinOrPassword: password
    });

    res.status(201).json({
      success: true,
      admin: created,
      message: `এডমিন "${created.name}" সফলভাবে যুক্ত করা হয়েছে।`
    });
  } catch (err: any) {
    console.error('Create admin account error:', err);
    res.status(500).json({ success: false, message: err.message || 'এডমিন তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/accounts/:id
 * Edit role, permissions, status or password
 */
adminRoutes.put('/accounts/:id', requirePermission('ADMIN_EDIT'), async (req: any, res) => {
  try {
    const { name, email, phone, role, permissions, status, password } = req.body;

    // Prevent non-MASTER admin from modifying MASTER admins
    const targetAdmin = await db.getAdminAccountById(req.params.id);
    if (targetAdmin && targetAdmin.role === 'MASTER_ADMIN' && req.admin.role !== 'MASTER_ADMIN') {
      return res.status(403).json({ success: false, message: 'মাস্টার এডমিন অ্যাকাউন্ট শুধুমাত্র মাস্টার এডমিন পরিবর্তন করতে পারেন।' });
    }

    const updated = await db.updateAdminAccount(req.params.id, {
      name,
      email,
      phone,
      role,
      permissions,
      status,
      password
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'এডমিন পাওয়া যায়নি।' });
    }


    res.json({ success: true, admin: updated, message: 'এডমিন অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে।' });
  } catch (err: any) {
    console.error('Update admin error:', err);
    res.status(500).json({ success: false, message: 'এডমিন অ্যাকাউন্ট সংরক্ষণে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/accounts/:id
 * Delete admin account
 */
adminRoutes.delete('/accounts/:id', requirePermission('ADMIN_DELETE'), async (req: any, res) => {
  try {
    const targetAdmin = await db.getAdminAccountById(req.params.id);
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'এডমিন পাওয়া যায়নি।' });
    }

    // Prevent non-MASTER admin from deleting MASTER admins
    if (targetAdmin.role === 'MASTER_ADMIN' && req.admin.role !== 'MASTER_ADMIN') {
      return res.status(403).json({ success: false, message: 'মাস্টার এডমিন ডিলিট করা সম্ভব নয়।' });
    }

    // Prevent deleting self
    if (targetAdmin.id === req.admin.id) {
      return res.status(400).json({ success: false, message: 'আপনি নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না।' });
    }

    const success = await db.deleteAdminAccount(req.params.id);
    if (success) {
      return res.json({ success: true, message: 'এডমিন অ্যাকাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।' });
    }

    res.status(400).json({ success: false, message: 'ডিলিট করতে সমস্যা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete admin error:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * POST /api/admin/change-password
 * Allows the logged-in admin to change their own password
 */
adminRoutes.post('/change-password', requireAdmin, async (req: any, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।'
      });
    }

    if (req.admin.id === 'MASTER') {
      return res.status(400).json({
        success: false,
        message: 'মাস্টার এডমিনের পাসওয়ার্ড সরাসরি পরিবর্তন করা সম্ভব নয়। এটি পরিবর্তন করতে .env ফাইলের ADMIN_SECRET_KEY পরিবর্তন করতে হবে।'
      });
    }

    const admin = await db.getAdminAccountById(req.admin.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'এডমিন অ্যাকাউন্ট পাওয়া যায়নি।'
      });
    }

    // Verify old password
    const matches = bcrypt.compareSync(oldPassword, admin.passwordHash || '');
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।'
      });
    }

    // Update password
    await db.updateAdminAccount(req.admin.id, { password: newPassword });


    res.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Change admin password error:', err);
    res.status(500).json({
      success: false,
      message: 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/admin/nasiha
 * Get all Nasiha list (admin only)
 */
adminRoutes.get('/nasiha', requireAdmin, async (req, res) => {
  try {
    const list = await db.getNasihaList();
    res.json({ success: true, list });
  } catch (err: any) {
    console.error('Nasiha list error:', err);
    res.status(500).json({ success: false, message: 'নসিহা তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/admin/nasiha
 * Create a new Nasiha (admin only)
 */
adminRoutes.post('/nasiha', requireAdmin, async (req, res) => {
  try {
    const { textBn, sourceBn } = req.body;
    if (!textBn || !textBn.trim()) {
      return res.status(400).json({ success: false, message: 'নসিহা লেখা অবশ্যই প্রদান করতে হবে।' });
    }
    const item = await db.createNasiha(textBn, sourceBn || '');
    

    res.json({ success: true, message: 'নসিহা সফলভাবে তৈরি করা হয়েছে।', item });
  } catch (err: any) {
    console.error('Create nasiha error:', err);
    res.status(500).json({ success: false, message: 'নতুন নসিহা তৈরি করতে ব্যর্থ।' });
  }
});

/**
 * PUT /api/admin/nasiha/:id
 * Update an existing Nasiha (admin only)
 */
adminRoutes.put('/nasiha/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { textBn, sourceBn, active } = req.body;
    const item = await db.updateNasiha(id, { textBn, sourceBn, active });
    if (!item) {
      return res.status(404).json({ success: false, message: 'নসিহা পাওয়া যায়নি।' });
    }


    res.json({ success: true, message: 'নসিহা সফলভাবে আপডেট করা হয়েছে।', item });
  } catch (err: any) {
    console.error('Update nasiha error:', err);
    res.status(500).json({ success: false, message: 'নসিহা আপডেট করতে ব্যর্থ।' });
  }
});

/**
 * DELETE /api/admin/nasiha/:id
 * Delete an existing Nasiha (admin only)
 */
adminRoutes.delete('/nasiha/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteNasiha(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'নসিহা পাওয়া যায়নি।' });
    }


    res.json({ success: true, message: 'নসিহা সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Delete nasiha error:', err);
    res.status(500).json({ success: false, message: 'নসিহা মুছতে ব্যর্থ।' });
  }
});

/**
 * GET /api/admin/blogs
 * Get all Blogs / CAVE Media content list (admin only)
 */
adminRoutes.get('/blogs', requireAdmin, async (req, res) => {
  try {
    const blogs = await db.getBlogList();
    res.json({ success: true, blogs });
  } catch (err: any) {
    console.error('Admin get blogs error:', err);
    res.status(500).json({ success: false, message: 'ব্লগ তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/blogs
 * Create a new Blog / CAVE Media content (admin only)
 */
adminRoutes.post('/blogs', requireAdmin, async (req, res) => {
  try {
    const { id, title, content, imageUrl, videoUrl, author, isPublished, createdAt } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'কন্টেন্টের শিরোনাম অবশ্যই দিতে হবে।' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'কন্টেন্টের বিবরণ অবশ্যই দিতে হবে।' });
    }

    const blog = await db.createBlog({
      id,
      title,
      content,
      imageUrl,
      videoUrl,
      author: author || (req as any).admin?.name || 'Admin',
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      createdAt
    });

    res.json({ success: true, message: 'কন্টেন্ট সফলভাবে প্রকাশ করা হয়েছে।', blog });
  } catch (err: any) {
    console.error('Admin create blog error:', err);
    res.status(500).json({ success: false, message: 'কন্টেন্ট তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/blogs/:id
 * Update an existing Blog / CAVE Media content (admin only)
 */
adminRoutes.put('/blogs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, videoUrl, author, isPublished } = req.body;

    const blog = await db.updateBlog(id, {
      title,
      content,
      imageUrl,
      videoUrl,
      author,
      isPublished
    });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'কন্টেন্ট পাওয়া যায়নি।' });
    }

    res.json({ success: true, message: 'কন্টেন্ট সফলভাবে আপডেট করা হয়েছে।', blog });
  } catch (err: any) {
    console.error('Admin update blog error:', err);
    res.status(500).json({ success: false, message: 'কন্টেন্ট আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PATCH /api/admin/blogs/:id/publish
 * PUT /api/admin/blogs/:id/publish
 * Toggle or set is_published status for a Blog / CAVE Media item (admin only)
 */
const handlePublishBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid blog ID provided.' });
    }

    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true;
    
    console.log(`[Admin Publish] Toggling publish state for blogId: ${id} -> isPublished: ${isPublished}`);

    const blog = await db.toggleBlogPublish(id, isPublished);

    if (!blog) {
      console.warn(`[Admin Publish] Blog not found in DB for id: ${id}`);
      return res.status(404).json({ success: false, message: 'কন্টেন্ট পাওয়া যায়নি (Content not found).' });
    }

    console.log(`[Admin Publish SUCCESS] Updated blogId: ${blog.id}, isPublished: ${blog.isPublished}`);
    res.json({
      success: true,
      message: isPublished ? 'সফলভাবে প্রকাশ হয়েছে' : 'সফলভাবে আনপাবলিশ হয়েছে',
      blog
    });
  } catch (err: any) {
    console.error('Admin publish blog error:', err);
    res.status(500).json({ success: false, message: 'প্রকাশ করতে সমস্যা হয়েছে (Publishing failed).' });
  }
};

adminRoutes.patch('/blogs/:id/publish', requireAdmin, handlePublishBlog);
adminRoutes.put('/blogs/:id/publish', requireAdmin, handlePublishBlog);

/**
 * DELETE /api/admin/blogs/:id
 * Delete a Blog / CAVE Media content (admin only)
 */
adminRoutes.delete('/blogs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteBlog(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'কন্টেন্ট পাওয়া যায়নি।' });
    }

    res.json({ success: true, message: 'কন্টেন্ট সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    console.error('Admin delete blog error:', err);
    res.status(500).json({ success: false, message: 'কন্টেন্ট মুছে ফেলতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/shops/:id/qr
 * Retrieve safe QR data for a specific shop (Admin only)
 */
adminRoutes.get('/shops/:id/qr', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await db.getShopById(id);

    if (!shop) {
      return res.status(404).json({ success: false, error: 'SHOP_NOT_FOUND', message: 'দোকান পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      shopId: shop.id,
      shopName: shop.name,
      shopNameBn: shop.nameBn,
      qrIdentifier: shop.qrIdentifier || '',
      status: shop.status === 'ACTIVE' ? 'active' : 'inactive',
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
      qr: {
        exists: !!shop.qrIdentifier,
        status: shop.status === 'ACTIVE' ? 'active' : 'inactive',
        qrIdentifier: shop.qrIdentifier || '',
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
        shopId: shop.id,
        shopName: shop.nameBn || shop.name
      }
    });
  } catch (err: any) {
    console.error('Get shop QR error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'QR তথ্য লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/shops/:id/generate-qr
 * Generate initial QR code for a shop (Admin only)
 */
adminRoutes.post('/shops/:id/generate-qr', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existingShop = await db.getShopById(id);
    
    if (!existingShop) {
      return res.status(404).json({ success: false, error: 'SHOP_NOT_FOUND', message: 'দোকান পাওয়া যায়নি।' });
    }

    if (existingShop.qrIdentifier) {
      return res.status(400).json({ success: false, error: 'ALREADY_EXISTS', message: 'এই দোকানের জন্য ইতিমধ্যেই একটি QR কোড বিদ্যমান।' });
    }

    const result = await db.regenerateShopQr(id);

    if (!result.success || !result.shop) {
      return res.status(500).json({ success: false, error: result.error || 'GENERATE_FAILED', message: 'QR কোড তৈরি করতে সমস্যা হয়েছে।' });
    }


    res.json({
      success: true,
      shop: { ...result.shop, qrSecret: undefined },
      message: 'নতুন QR কোড সফলভাবে তৈরি করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Generate shop QR error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'QR কোড তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/shops/:id/regenerate-qr
 * Regenerate QR code for a specific shop (Admin only)
 */
adminRoutes.post('/shops/:id/regenerate-qr', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.regenerateShopQr(id);

    if (!result.success || !result.shop) {
      res.status(404).json({ success: false, error: result.error || 'SHOP_NOT_FOUND', message: 'দোকান পাওয়া যায়নি।' });
      return;
    }


    res.json({
      success: true,
      shop: { ...result.shop, qrSecret: undefined },
      message: 'মার্চেন্ট QR কোড নতুন করে তৈরি করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Regenerate shop QR error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'QR কোড রি-জেনারেট করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/admin/transactions
 * Retrieve the last 20 database transactions for monitoring INSERT/DELETE/UPDATE operations
 */
adminRoutes.get('/db-transactions', requireAdmin, async (req: any, res: any) => {
  try {
    const transactions = db.getRecentTransactions(20);
    res.json({ success: true, transactions });
  } catch (err: any) {
    console.error('Get recent transactions error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'লেনদেন তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

// =========================================================================
// 8. ACCOUNTS (FINANCIAL REDEMPTIONS)
// =========================================================================

/**
 * GET /api/admin/accounts/shops
 * Get list of shops for accounting
 */
adminRoutes.get('/accounts/shops', requireAdmin, async (req, res) => {
  try {
    const shops = await db.getAdminAccountsShops();
    res.json({ success: true, shops });
  } catch (err: any) {
    console.error('Get accounting shops error:', err);
    res.status(500).json({ success: false, message: 'শপ লিস্ট লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/accounts/shops/:shopId/summary
 * Get financial summary for a shop
 */
adminRoutes.get('/accounts/shops/:shopId/summary', requireAdmin, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { dateFrom, dateTo, tokenType } = req.query;
    
    const summary = await db.getAdminAccountsShopSummary(shopId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      tokenType: tokenType as string
    });
    
    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('Get accounting summary error:', err);
    res.status(500).json({ success: false, message: 'হিসাব সারসংক্ষেপ লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/accounts/shops/:shopId/redemptions
 * Get redemption records for a shop
 */
adminRoutes.get('/accounts/shops/:shopId/redemptions', requireAdmin, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { dateFrom, dateTo, tokenType } = req.query;
    
    const redemptions = await db.getAdminAccountsShopRedemptions(shopId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      tokenType: tokenType as string
    });
    
    res.json({ success: true, redemptions });
  } catch (err: any) {
    console.error('Get accounting redemptions error:', err);
    res.status(500).json({ success: false, message: 'রিডেম্পশন রেকর্ড লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/accounts/shops/:shopId/export
 * Export financial accounting records for a specific shop (PDF, XLSX, CSV)
 */
adminRoutes.get('/accounts/shops/:shopId/export', requireAdmin, async (req: any, res) => {
  try {
    const { shopId } = req.params;
    const format = String(req.query.format || 'pdf').toLowerCase();
    const dateFrom = (req.query.dateFrom || req.query.from) as string | undefined;
    const dateTo = (req.query.dateTo || req.query.to) as string | undefined;
    const tokenType = req.query.tokenType as string | undefined;

    // 1. Verify shop exists
    const shop = await db.getShopById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
    }

    // 2. Fetch authoritative filtered data from database
    const [summary, transactions] = await Promise.all([
      db.getAdminAccountsShopSummary(shopId, { dateFrom, dateTo, tokenType }),
      db.getAdminAccountsShopRedemptions(shopId, { dateFrom, dateTo, tokenType })
    ]);

    const shopName = shop.nameBn || shop.name || 'Partner Shop';
    const periodLabel = buildPeriodLabel(dateFrom, dateTo);
    const now = new Date();
    const generatedAt = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const reportData: FinancialReportData = {
      shopName,
      shopAddress: shop.address,
      periodLabel,
      generatedAt,
      summary,
      transactions
    };

    if (format === 'pdf') {
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const domain = `${protocol}://${host}`;

      const verificationId = await PDFVerificationService.createVerification(
        'ADMIN_FINANCIAL',
        shopName,
        transactions.length,
        summary.totalAmount || 0,
        { shopId, dateFrom, dateTo, tokenType }
      );

      reportData.verificationId = verificationId;
      reportData.qrUrl = `${domain}/verify/pdf/${verificationId}`;
    }

    const filename = buildReportFilename(shop.name || shop.nameBn || 'shop', dateFrom, dateTo, format);

    // 3. Log audit action

    // 4. Generate formatted report
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    if (format === 'xlsx' || format === 'excel') {
      const buffer = generateExcelReport(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else if (format === 'csv') {
      const buffer = generateCSVReport(reportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      // Default: PDF
      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }
  } catch (err: any) {
    console.error('Export admin shop financial report error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ success: false, message: 'আর্থিক রিপোর্ট তৈরি করতে ব্যর্থ হয়েছে। ' + (err.message || '') });
  }
});

/**
 * DELETE /api/admin/accounts/redemptions/:redemptionId
 * Delete a specific redemption record
 */
adminRoutes.delete('/accounts/redemptions/:redemptionId', requireAdmin, async (req, res) => {
  try {
    const { redemptionId } = req.params;
    
    // Permission check for sensitive delete action
    const admin = (req as any).admin;
    const hasDeletePermission = admin.role === 'MASTER_ADMIN' || (admin.permissions && admin.permissions.includes('SHOP_DELETE'));
    
    if (!hasDeletePermission) {
      return res.status(403).json({ success: false, message: 'আপনার এই রেকর্ড ডিলিট করার অনুমতি নেই।' });
    }

    const success = await db.deleteRedemptionRecord(redemptionId);
    
    if (success) {
      res.json({ success: true, message: 'রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।' });
    } else {
      res.status(404).json({ success: false, message: 'রেকর্ডটি পাওয়া যায়নি বা মুছা সম্ভব হয়নি।' });
    }
  } catch (err: any) {
    console.error('Delete redemption record error:', err);
    res.status(500).json({ success: false, message: 'রেকর্ডটি মুছতে সার্ভার সাইড সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/accounts/redemptions/:redemptionId/pay-commission
 * Mark the commission payment status as PAID
 */
adminRoutes.post('/accounts/redemptions/:redemptionId/pay-commission', requireAdmin, async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const admin = (req as any).admin;
    
    // Permission check for financial status update
    const hasPermission = admin.role === 'MASTER_ADMIN' || (admin.permissions && admin.permissions.includes('ACCOUNTS_MANAGE'));
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'কমিশন পেমেন্ট স্ট্যাটাস আপডেট করার জন্য আপনার ফিন্যান্সিয়াল অ্যাকাউন্টস ম্যানেজ করার অনুমতি নেই।' 
      });
    }

    // Check if transaction exists
    const redemption = await db.getRedemptionById(redemptionId);
    if (!redemption) {
      return res.status(404).json({ success: false, message: 'লেনদেন রেকর্ডটি পাওয়া যায়নি।' });
    }

    // Idempotency check
    if (redemption.commissionPaymentStatus === 'paid') {
      return res.json({ 
        success: true, 
        message: 'কমিশন পেমেন্ট ইতিমধ্যেই পরিশোধিত হিসেবে চিহ্নিত করা আছে।', 
        redemption 
      });
    }

    // Update status to 'paid'
    const prevStatus = redemption.commissionPaymentStatus || 'unpaid';
    const updatedRedemption = await db.updateCommissionPaymentStatus(redemptionId, 'paid');

    // Audit Logging
    console.log(`[AUDIT] COMMISSION PAYMENT STATUS UPDATE: By Admin: ${admin.id} (${admin.name}) | Transaction: ${redemptionId} | Prev Status: ${prevStatus} | New Status: paid | Time: ${new Date().toISOString()}`);

    res.json({ 
      success: true, 
      message: 'কমিশন পেমেন্ট সফলভাবে পরিশোধিত হিসেবে চিহ্নিত করা হয়েছে।', 
      redemption: updatedRedemption 
    });
  } catch (err: any) {
    console.error('Pay commission error:', err);
    res.status(500).json({ success: false, message: 'কমিশন পেমেন্ট আপডেট করতে সার্ভার সাইড সমস্যা হয়েছে।' });
  }
});

/**
 * =========================================================================
 * HELPLINE MANAGEMENT API ENDPOINTS
 * =========================================================================
 */

/**
 * GET /api/admin/helpline
 * Fetch current helpline configuration
 */
adminRoutes.get('/helpline', requireAdmin, async (req: any, res) => {
  try {
    const helpline = await db.getHelplineSettings();
    res.json({
      success: true,
      helpline
    });
  } catch (err: any) {
    console.error('Get helpline settings error:', err);
    res.status(500).json({ success: false, message: 'হেল্পলাইন কনফিগারেশন লোড করা সম্ভব হয়নি।' });
  }
});

/**
 * PUT /api/admin/helpline
 * Update helpline configuration
 */
adminRoutes.put('/helpline', requireAdmin, async (req: any, res) => {
  try {
    const {
      primaryPhone,
      secondaryPhone,
      whatsappNumber,
      supportEmail,
      supportMessage,
      isWhatsappEnabled,
      isActive
    } = req.body;

    if (!primaryPhone || typeof primaryPhone !== 'string' || primaryPhone.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে একটি সঠিক প্রাথমিক হেল্পলাইন ফোন নম্বর প্রদান করুন।'
      });
    }

    if (supportEmail && typeof supportEmail === 'string' && supportEmail.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supportEmail.trim())) {
        return res.status(400).json({
          success: false,
          message: 'অনুগ্রহ করে একটি সঠিক সাপোর্ট ইমেইল ঠিকানা প্রদান করুন।'
        });
      }
    }

    const adminName = req.admin?.name || req.admin?.username || 'Admin';
    const adminId = req.admin?.id || 'admin';

    const updated = await db.updateHelplineSettings({
      primaryPhone: primaryPhone.trim(),
      secondaryPhone: typeof secondaryPhone === 'string' ? secondaryPhone.trim() : '',
      whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber.trim() : '',
      supportEmail: typeof supportEmail === 'string' ? supportEmail.trim() : '',
      supportMessage: typeof supportMessage === 'string' ? supportMessage.trim() : '',
      isWhatsappEnabled: Boolean(isWhatsappEnabled),
      isActive: isActive !== undefined ? Boolean(isActive) : true
    }, adminName);


    res.json({
      success: true,
      message: 'হেল্পলাইন তথ্য সফলভাবে আপডেট করা হয়েছে।',
      helpline: updated
    });
  } catch (err: any) {
    console.error('Update helpline settings error:', err);
    res.status(500).json({
      success: false,
      message: 'হেল্পলাইন তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।'
    });
  }
});

// ==========================================
// ADMIN: DELIVERY CHARGE SETTINGS & LOGS
// ==========================================

/**
 * GET /api/admin/delivery-charge
 * Retrieve current delivery charge settings and order delivery logs.
 */
adminRoutes.get('/delivery-charge', requireAdmin, async (req: any, res: any) => {
  try {
    const charges = await db.getDeliveryCharges();
    const localRates = await db.getLocalDeliveryRates();
    const logs = await db.getDeliveryChargeLogs(200);

    res.json({
      success: true,
      charges,
      localRates,
      logs
    });
  } catch (err: any) {
    console.error('Get delivery charge error:', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি চার্জের তথ্য লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/admin/local-delivery-rates
 * Get admin configured weight-bracket rates per km for Local Market
 */
adminRoutes.get('/local-delivery-rates', requireAdmin, async (req: any, res: any) => {
  try {
    const localRates = await db.getLocalDeliveryRates();
    res.json({
      success: true,
      rates: localRates
    });
  } catch (err: any) {
    console.error('Get local delivery rates error:', err);
    res.status(500).json({ success: false, message: 'লোকাল ডেলিভারি রেট লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/local-delivery-rates
 * Update weight-bracket rates per km for Local Market
 */
adminRoutes.post('/local-delivery-rates', requireAdmin, async (req: any, res: any) => {
  try {
    const { rate0to1, rate1to5, rate6to10 } = req.body;
    const adminName = req.admin?.name || 'Admin';

    if (rate0to1 !== undefined && (isNaN(Number(rate0to1)) || Number(rate0to1) < 0)) {
      return res.status(400).json({ success: false, message: '০-১ কিমি রেট সঠিক এবং অ-ঋণাত্মক হতে হবে।' });
    }
    if (rate1to5 !== undefined && (isNaN(Number(rate1to5)) || Number(rate1to5) < 0)) {
      return res.status(400).json({ success: false, message: '১-৫ কেজি রেট সঠিক এবং অ-ঋণাত্মক হতে হবে।' });
    }
    if (rate6to10 !== undefined && (isNaN(Number(rate6to10)) || Number(rate6to10) < 0)) {
      return res.status(400).json({ success: false, message: '৬-১০ কেজি রেট সঠিক এবং অ-ঋণাত্মক হতে হবে।' });
    }

    const updated = await db.setLocalDeliveryRates({
      rate0to1: rate0to1 !== undefined ? Number(rate0to1) : undefined,
      rate1to5: rate1to5 !== undefined ? Number(rate1to5) : undefined,
      rate6to10: rate6to10 !== undefined ? Number(rate6to10) : undefined
    }, adminName);

    res.json({
      success: true,
      message: 'লোকাল মার্কেট ডেলিভারি রেট সফলভাবে আপডেট করা হয়েছে।',
      rates: updated
    });
  } catch (err: any) {
    console.error('Update local delivery rates error:', err);
    res.status(500).json({ success: false, message: 'লোকাল ডেলিভারি রেট আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/delivery-charge
 * Update delivery charge amounts for districts.
 */
adminRoutes.post('/delivery-charge', requireAdmin, async (req: any, res: any) => {
  try {
    const { updates } = req.body;
    const adminName = req.admin?.name || 'Admin';

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'সঠিক ডেলিভারি চার্জের পরিমাণ প্রদান করুন।' });
    }

    // Non-negative numeric validation
    for (const [district, amount] of Object.entries(updates)) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ success: false, message: `সঠিক এবং ঋণাত্মক নয় এমন ডেলিভারি চার্জের পরিমাণ প্রদান করুন: ${district}` });
      }
    }

    const updated = await db.setDeliveryCharges(updates, adminName);


    res.json({
      success: true,
      message: 'ডেলিভারি চার্জ সফলভাবে আপডেট করা হয়েছে।',
      charges: updated
    });
  } catch (err: any) {
    console.error('Update delivery charge error:', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি চার্জ আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/delivery-charge/:district
 * Retrieve delivery charge for a specific district.
 */
adminRoutes.get('/delivery-charge/:district', requireAdmin, async (req: any, res: any) => {
  try {
    const { district } = req.params;
    const charges = await db.getDeliveryCharges();
    
    if (charges[district] === undefined) {
      return res.status(404).json({ success: false, message: 'জেলা পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      district,
      charge: charges[district]
    });
  } catch (err: any) {
    console.error('Get individual delivery charge error:', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি চার্জের তথ্য লোড করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/admin/delivery-charge/:district
 * Update or create delivery charge for a specific district independently.
 */
adminRoutes.post('/delivery-charge/:district', requireAdmin, async (req: any, res: any) => {
  try {
    const { district } = req.params;
    const { amount } = req.body;
    const adminName = req.admin?.name || 'Admin';

    const numAmount = Number(amount);
    if (amount === undefined || isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: 'সঠিক এবং ঋণাত্মক নয় এমন ডেলিভারি চার্জের পরিমাণ প্রদান করুন।' });
    }

    const updates = { [district]: numAmount };
    const updated = await db.setDeliveryCharges(updates, adminName);


    res.json({
      success: true,
      message: `${district}-এর ডেলিভারি চার্জ সফলভাবে আপডেট করা হয়েছে।`,
      charges: updated
    });
  } catch (err: any) {
    console.error('Update individual delivery charge error:', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি চার্জ আপডেট করতে সমস্যা হয়েছে।' });
  }
});

// ==========================================
// ADMIN: ORDERS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/orders
 * List orders with status and search filters.
 */
adminRoutes.get('/orders', requireAdmin, async (req: any, res: any) => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;
    const orders = await db.getAllOrders({
      status: typeof status === 'string' ? status : undefined,
      search: typeof search === 'string' ? search : undefined,
      dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
      dateTo: typeof dateTo === 'string' ? dateTo : undefined
    });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err: any) {
    console.error('Get admin orders error:', err);
    res.status(500).json({ success: false, message: 'অর্ডার তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/admin/orders/:orderId
 * Get full order details.
 */
adminRoutes.get('/orders/:orderId', requireAdmin, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const order = await db.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'অর্ডারটি পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      order
    });
  } catch (err: any) {
    console.error('Get admin order detail error:', err);
    res.status(500).json({ success: false, message: 'অর্ডারের বিবরণ লোড করতে ব্যর্থ।' });
  }
});

/**
 * PATCH /api/admin/orders/:orderId/status
 * Update order status (PENDING -> APPROVED -> DELIVERED or REJECTED).
 */
adminRoutes.patch('/orders/:orderId/status', requireAdmin, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { status, adminNotes } = req.body;
    const adminName = req.admin?.name || 'Admin';

    if (!['PENDING', 'APPROVED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'অবৈধ স্ট্যাটাস।' });
    }

    const updatedOrder = await db.updateOrderStatus(orderId, status, adminNotes, adminName);


    res.json({
      success: true,
      message: `অর্ডারের স্ট্যাটাস সফলভাবে "${status}" করা হয়েছে।`,
      order: updatedOrder
    });
  } catch (err: any) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, message: err.message || 'অর্ডারের স্ট্যাটাস পরিবর্তন করতে ব্যর্থ।' });
  }
});

/**
 * DELETE /api/admin/orders/:orderId
 * Delete order.
 */
adminRoutes.delete('/orders/:orderId', requireAdmin, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const adminName = req.admin?.name || 'Admin';

    const deleted = await db.deleteOrder(orderId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'অর্ডারটি পাওয়া যায়নি।' });
    }


    res.json({
      success: true,
      message: 'অর্ডারটি সফলভাবে মুছে ফেলা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Delete order error:', err);
    res.status(500).json({ success: false, message: 'অর্ডার মুছতে সমস্যা হয়েছে।' });
  }
});

// ==========================================
// ADMIN: ONLINE হিসাব (ONLINE FINANCIALS)
// ==========================================

/**
 * GET /api/admin/online-accounts
 * Get financial breakdown records of all DELIVERED online orders (no delivery charge included).
 */
adminRoutes.get('/online-accounts', requireAdmin, async (req: any, res: any) => {
  try {
    const { shopId, dateFrom, dateTo, search } = req.query;

    const records = await db.getOnlineFinancialRecords({
      shopId: typeof shopId === 'string' ? shopId : undefined,
      dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
      dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      search: typeof search === 'string' ? search : undefined
    });

    const summary = await db.getOnlineAccountsSummary({
      shopId: typeof shopId === 'string' ? shopId : undefined,
      dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
      dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      search: typeof search === 'string' ? search : undefined
    });

    res.json({
      success: true,
      summary,
      count: records.length,
      records
    });
  } catch (err: any) {
    console.error('Get online accounts error:', err);
    res.status(500).json({ success: false, message: 'অনলাইন হিসাবের তথ্য লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/admin/online-accounts/export
 * Export Online হিসাব data to CSV or Excel.
 */
adminRoutes.get('/online-accounts/export', requireAdmin, async (req: any, res: any) => {
  try {
    const { format = 'csv', shopId, dateFrom, dateTo, search } = req.query;

    const records = await db.getOnlineFinancialRecords({
      shopId: typeof shopId === 'string' ? shopId : undefined,
      dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
      dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      search: typeof search === 'string' ? search : undefined
    });

    if (format === 'pdf') {
      const summary = await db.getOnlineAccountsSummary({
        shopId: typeof shopId === 'string' ? shopId : undefined,
        dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
        dateTo: typeof dateTo === 'string' ? dateTo : undefined,
        search: typeof search === 'string' ? search : undefined
      });

      const reportData: FinancialReportData = {
        shopName: 'অনলাইন অর্ডারের সামগ্রিক হিসাব (All Shops)',
        shopAddress: 'Cave Companions Online E-Commerce',
        periodLabel: buildPeriodLabel(dateFrom as string, dateTo as string),
        generatedAt: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isOnlineReport: true,
        summary: {
          totalAmount: summary.totalSales,
          totalGrossCommission: summary.totalCustomerPayable - summary.totalShopReceivable,
          totalTokenBenefits: summary.totalTokenDiscounts,
          totalDonatedAmount: summary.totalDonatedAmount,
          totalNetIncome: summary.totalNetIncome,
          totalMerchantPayout: summary.totalShopReceivable,
          totalCount: summary.totalItemCount
        },
        transactions: records.map(r => ({
          id: r.id,
          tokenId: 'N/A',
          userId: r.orderNumber,
          userName: r.customerName,
          userPhone: r.customerPhone,
          shopId: r.shopId,
          shopName: r.shopName,
          merchantId: 'N/A',
          tokenType: (r.tokenType || 'NONE') as any,
          discountPercentage: 0,
          discountRateSnapshot: 0,
          purchaseAmount: r.originalPrice * r.quantity,
          discountAmount: r.tokenDiscountAmount,
          couponCode: r.couponCode || null,
          couponDiscountAmount: r.couponDiscountAmount || 0,
          finalPayableAmount: r.customerProductPayable,
          commissionRate: r.commissionRate,
          commissionRateSnapshot: r.commissionRate,
          grossCommissionAmount: r.commissionAmount,
          caveCompanionsNetIncome: r.netIncome,
          merchantPayoutAmount: r.shopReceivable,
          grossCommissionRate: r.commissionRate,
          tokenBenefitAmount: r.tokenDiscountAmount,
          netIncome: r.netIncome,
          merchantPayout: r.shopReceivable,
          status: 'DELIVERED',
          createdAt: r.createdAt,
          redemptionDate: r.deliveredAt,
          isDonated: r.isDonated,
          donatedAmount: r.donatedAmount,
          earnedMosqueName: r.earnedMosqueName,
          productName: r.productName,
          quantity: r.quantity,
          orderNumber: r.orderNumber
        }))
      };

      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const domain = `${protocol}://${host}`;

      const verificationId = await PDFVerificationService.createVerification(
        'ADMIN_ONLINE',
        'অনলাইন অর্ডারের সামগ্রিক হিসাব (All Shops)',
        records.length,
        summary.totalSales || 0,
        { shopId, dateFrom, dateTo, search }
      );

      reportData.verificationId = verificationId;
      reportData.qrUrl = `${domain}/verify/pdf/${verificationId}`;

      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="online-accounts-${Date.now()}.pdf"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.send(pdfBuffer);
    } else if (format === 'csv') {
      const headers = [
        'Order Number',
        'Customer Name',
        'Customer Phone',
        'Delivery Address',
        'Shop Name',
        'Product Name',
        'Quantity',
        'Original Unit Price (BDT)',
        'Total Original Price (BDT)',
        'Token Used',
        'Token Discount (BDT)',
        'Coupon Code',
        'Coupon Discount (BDT)',
        'Is Donated',
        'Donated Amount (BDT)',
        'Earned Mosque Name',
        'Customer Product Payable (BDT)',
        'Commission Rate (%)',
        'Commission Amount (BDT)',
        'Shop Receivable (BDT)',
        'Cave Companions Net Income (BDT)',
        'Delivered At'
      ];

      const rows = records.map(r => [
        r.orderNumber,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.customerPhone}"`,
        `"${r.deliveryAddress.replace(/"/g, '""')}"`,
        `"${r.shopName.replace(/"/g, '""')}"`,
        `"${r.productName.replace(/"/g, '""')}"`,
        r.quantity,
        r.originalPrice,
        r.originalPrice * r.quantity,
        r.tokenType || 'NONE',
        r.tokenDiscountAmount,
        r.couponCode || 'N/A',
        r.couponDiscountAmount || 0,
        r.isDonated ? 'YES' : 'NO',
        r.donatedAmount || 0,
        r.earnedMosqueName ? `"${r.earnedMosqueName.replace(/"/g, '""')}"` : 'N/A',
        r.customerProductPayable,
        r.commissionRate,
        r.commissionAmount,
        r.shopReceivable,
        r.netIncome,
        r.deliveredAt
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=online-accounts-${Date.now()}.csv`);
      return res.send('\uFEFF' + csvContent);
    } else {
      // Return JSON data for client-side table rendering/print
      res.json({
        success: true,
        records
      });
    }
  } catch (err: any) {
    console.error('Export online accounts error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ success: false, message: 'রিপোর্ট এক্সপোর্ট করতে ব্যর্থ। ' + (err.message || '') });
  }
});

/**
 * DELETE /api/admin/online-accounts/:id
 * Delete a specific online financial record without modifying orders or products.
 */
adminRoutes.delete('/online-accounts/:id', requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'অবৈধ আইডি।' });
    }

    const deleted = await db.deleteOnlineFinancialRecord(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'হিসাব রেকর্ডটি পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      message: 'অনলাইন হিসাব ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Delete online account record error:', err);
    res.status(500).json({ success: false, message: 'হিসাব ইতিহাস মুছতে ব্যর্থ হয়েছে।' });
  }
});





// ==========================================
// ADVERTISEMENT MANAGEMENT
// ==========================================

adminRoutes.get('/ads', requireAdmin, async (req: any, res) => {
  try {
    const ads = await db.getAllAdvertisements();
    res.json({ success: true, data: ads });
  } catch (error: any) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch advertisements' });
  }
});

adminRoutes.post('/ads', requireAdmin, async (req: any, res) => {
  try {
    const data = req.body;
    data.createdBy = req.admin.id;
    console.log('[Admin Ad Create] Request Data:', JSON.stringify(data, null, 2));
    const result = await db.createAdvertisement(data);
    console.log('[Admin Ad Create] Success Result:', result);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error creating ad:', error);
    res.status(500).json({ success: false, error: 'Failed to create advertisement', details: error.message });
  }
});

adminRoutes.put('/ads/:id', requireAdmin, async (req: any, res) => {
  try {
    const success = await db.updateAdvertisement(req.params.id, req.body);
    res.json({ success: true, updated: success });
  } catch (error: any) {
    console.error('Error updating ad:', error);
    res.status(500).json({ success: false, error: 'Failed to update advertisement', message: error.message });
  }
});

adminRoutes.patch('/ads/:id/status', requireAdmin, async (req: any, res) => {
  try {
    const success = await db.updateAdvertisementStatus(req.params.id, req.body.status);
    res.json({ success });
  } catch (error: any) {
    console.error('Error updating ad status:', error);
    res.status(500).json({ success: false, error: 'Failed to update advertisement status' });
  }
});


adminRoutes.get('/coupons', requirePermission(['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW']), async (req, res) => {
  try {
    const coupons = await db.getAllCoupons();
    res.json({ success: true, coupons });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কুপন লোড করতে সমস্যা।' });
  }
});

adminRoutes.post('/coupons', requirePermission(['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW']), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'একটি বৈধ কুপন কোড প্রদান করুন।' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const exists = await db.checkCouponCodeExists(normalizedCode);
    if (exists) {
      return res.status(400).json({ success: false, message: 'এই কুপন কোডটি ইতিমধ্যে বিদ্যমান রয়েছে। অনুগ্রহ করে অন্য কোড ব্যবহার করুন।' });
    }

    const coupon = await db.createCoupon(req.body);
    res.json({ success: true, coupon });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'এই কুপন কোডটি ইতিমধ্যে বিদ্যমান রয়েছে। অনুগ্রহ করে অন্য কোড ব্যবহার করুন।' });
    }
    res.status(500).json({ success: false, message: 'কুপন তৈরি করতে সমস্যা।' });
  }
});

adminRoutes.delete('/coupons/:id', requirePermission(['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW']), async (req, res) => {
  try {
    await db.deleteCoupon(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কুপন ডিলিট করতে সমস্যা।' });
  }
});

adminRoutes.patch('/coupons/:id/status', requirePermission(['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW']), async (req, res) => {
  try {
    const { isActive } = req.body;
    await db.updateCouponActiveStatus(req.params.id, isActive);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কুপন স্ট্যাটাস পরিবর্তন করতে সমস্যা।' });
  }
});

adminRoutes.patch('/coupons/:id/usage-limit', requirePermission(['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW']), async (req, res) => {
  try {
    const { usageLimit } = req.body;
    await db.updateCouponUsageLimit(req.params.id, usageLimit);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কুপন ব্যবহারের সীমা পরিবর্তন করতে সমস্যা।' });
  }
});

adminRoutes.delete('/ads/:id', requireAdmin, async (req: any, res) => {
  try {
    console.log('Attempting to delete ad:', req.params.id);
    const success = await db.deleteAdvertisement(req.params.id);
    console.log('Delete result:', success);
    res.json({ success });
  } catch (error: any) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ success: false, error: 'Failed to delete advertisement' });
  }
});

adminRoutes.get('/ads/settings', requireAdmin, async (req: any, res) => {
  try {
    const settings = await db.getPageSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error fetching ad settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

adminRoutes.put('/ads/settings', requireAdmin, async (req: any, res) => {
  try {
    const success = await db.updatePageSettings(req.body.settings);
    res.json({ success });
  } catch (error: any) {
    console.error('Error updating ad settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// =====================================
// Analytics & Insights System Routes
// =====================================
adminRoutes.get('/analytics/overview', requirePermission(['ANALYTICS_VIEW', 'SYSTEM_VIEW']), async (req: any, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const filter: AnalyticsDateFilter = {
      period: (period as any) || '7d',
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined
    };

    const analyticsData = await getAnalyticsDashboardData(filter);
    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error: any) {
    console.error('[Admin Analytics] Failed to fetch analytics dataset:', error);
    res.status(500).json({
      success: false,
      message: 'এনালাইটিক্স ডাটা প্রস্তুত করতে সমস্যা হয়েছে।',
      error: error.message
    });
  }
});

// Analytics Tracking endpoint for client app events
adminRoutes.post('/analytics/track', async (req: any, res) => {
  try {
    const { userId, eventType, entityType, entityId, metadata } = req.body;
    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }
    await trackAnalyticsEvent({
      userId,
      eventType,
      entityType,
      entityId,
      metadata
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Quarantine Review APIs
adminRoutes.get('/quarantine', requireAdmin, async (req: any, res: any) => {
  try {
    const records = await db.getQuarantinedAttendances();
    res.json({ success: true, records: records || [] });
  } catch (err: any) {
    console.error('[Admin] GET /api/admin/quarantine error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'কোয়ারেন্টাইনড রেকর্ড লোড করতে সমস্যা হয়েছে।' });
  }
});

adminRoutes.post('/quarantine/resolve', requireAdmin, async (req: any, res: any) => {
  try {
    const { id, action } = req.body || {};
    if (!id || !action || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'আইডি এবং অ্যাকশন (approve/reject) আবশ্যক।' });
    }

    const adminId = req.admin?.id || 'MASTER';
    const resolved = await db.reviewQuarantinedAttendance(id, action, adminId);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'রেকর্ড পাওয়া যায়নি বা সমাধান করা যায়নি।' });
    }

    res.json({ success: true, message: `কোয়ারেন্টাইনড রেকর্ড সফলভাবে ${action === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'} করা হয়েছে।` });
  } catch (err: any) {
    console.error('[Admin] POST /api/admin/quarantine/resolve error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'কোয়ারেন্টাইনড রেকর্ড সমাধান করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/riders
 * Get list of all delivery riders with optional status/search filters
 */
adminRoutes.get('/riders', requireAdmin, async (req: any, res: any) => {
  try {
    const { approvalStatus, status, search } = req.query;
    const riders = await db.getAdminRiders({
      approvalStatus: approvalStatus as any,
      status: status as any,
      search: search as string
    });
    res.json({ success: true, riders });
  } catch (err: any) {
    console.error('[Admin] GET /api/admin/riders error:', err);
    res.status(500).json({ success: false, message: 'রাইডার তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/riders/pending
 * Get pending rider applications
 */
adminRoutes.get('/riders/pending', requireAdmin, async (req: any, res: any) => {
  try {
    const riders = await db.getPendingRiders();
    res.json({ success: true, riders });
  } catch (err: any) {
    console.error('[Admin] GET /api/admin/riders/pending error:', err);
    res.status(500).json({ success: false, message: 'অপেক্ষমাণ রাইডার আবেদন তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/riders/:riderId/approve
 * Approve a rider application
 */
adminRoutes.post('/riders/:riderId/approve', requireAdmin, async (req: any, res: any) => {
  try {
    const { riderId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const rider = await db.approveRider(riderId, adminId);
    res.json({
      success: true,
      message: 'রাইডার সফলভাবে অনুমোদিত হয়েছে।',
      rider
    });
  } catch (err: any) {
    console.error('[Admin] Approve rider error:', err);
    res.status(400).json({ success: false, message: err.message || 'অনুমোদন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/riders/:riderId/reject
 * Reject a rider application
 */
adminRoutes.post('/riders/:riderId/reject', requireAdmin, async (req: any, res: any) => {
  try {
    const { riderId } = req.params;
    const { notes } = req.body || {};
    const adminId = req.admin?.id || 'MASTER';

    const rider = await db.rejectRider(riderId, notes || 'Rejected by Admin', adminId);
    res.json({
      success: true,
      message: 'রাইডার আবেদন বাতিল করা হয়েছে।',
      rider
    });
  } catch (err: any) {
    console.error('[Admin] Reject rider error:', err);
    res.status(400).json({ success: false, message: err.message || 'বাতিল করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/riders/:riderId/suspend
 * Suspend a rider account
 */
adminRoutes.post('/riders/:riderId/suspend', requireAdmin, async (req: any, res: any) => {
  try {
    const { riderId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const rider = await db.suspendRider(riderId, adminId);
    res.json({
      success: true,
      message: 'রাইডার অ্যাকাউন্ট স্থগিত করা হয়েছে।',
      rider
    });
  } catch (err: any) {
    console.error('[Admin] Suspend rider error:', err);
    res.status(400).json({ success: false, message: err.message || 'স্থগিত করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/riders/:riderId/reactivate
 * Reactivate a suspended rider account
 */
adminRoutes.post('/riders/:riderId/reactivate', requireAdmin, async (req: any, res: any) => {
  try {
    const { riderId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const rider = await db.reactivateRider(riderId, adminId);
    res.json({
      success: true,
      message: 'রাইডার অ্যাকাউন্ট পুনরায় সক্রিয় করা হয়েছে।',
      rider
    });
  } catch (err: any) {
    console.error('[Admin] Reactivate rider error:', err);
    res.status(400).json({ success: false, message: err.message || 'পুনরায় সক্রিয় করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/riders/:riderId
 * Delete a rider account
 */
adminRoutes.delete('/riders/:riderId', requireAdmin, async (req: any, res: any) => {
  try {
    const { riderId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    await db.deleteRider(riderId, adminId);
    res.json({
      success: true,
      message: 'রাইডার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।'
    });
  } catch (err: any) {
    console.error('[Admin] Delete rider error:', err);
    res.status(400).json({ success: false, message: err.message || 'রাইডার মুছতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/admin/orders/:orderId/waive-delivery
 * Admin waives delivery charge for customer
 */
adminRoutes.post('/orders/:orderId/waive-delivery', requireAdmin, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const adminId = req.admin?.id || 'MASTER';

    const updatedOrder = await db.waiveOrderDeliveryCharge(orderId, adminId);
    res.json({
      success: true,
      message: 'অর্ডারের ডেলিভারি চার্জ সফলভাবে মওকুফ করা হয়েছে।',
      order: updatedOrder
    });
  } catch (err: any) {
    console.error('[Admin] Waive delivery charge error:', err);
    res.status(400).json({ success: false, message: err.message || 'ডেলিভারি চার্জ মওকুফ করতে সমস্যা হয়েছে।' });
  }
});

// =====================================
// CAVE CIRCLE MODERATION (Phase 2 Admin Foundation)
// =====================================

/**
 * GET /api/admin/moderation/queue
 * Retrieve pending flagged events and user reports for moderation review
 */
adminRoutes.get('/moderation/queue', requireAdmin, async (req: any, res: any) => {
  try {
    // 1. Pending or Flagged Moderation Events
    const eventsRes = await query(`
      SELECT me.*, u.full_name as user_name, u.phone as user_phone, c.name as circle_name
      FROM moderation_events me
      JOIN users u ON me.user_id = u.id
      JOIN circles c ON me.circle_id = c.id
      ORDER BY me.created_at DESC
      LIMIT 100
    `);

    // 2. Pending User Reports
    const reportsRes = await query(`
      SELECT mr.*, 
             u1.full_name as reported_user_name, u1.phone as reported_user_phone,
             u2.full_name as reporter_user_name,
             c.name as circle_name,
             cm.content as message_content
      FROM moderation_reports mr
      JOIN users u1 ON mr.reported_user_id = u1.id
      JOIN users u2 ON mr.reporter_user_id = u2.id
      JOIN circles c ON mr.circle_id = c.id
      LEFT JOIN circle_messages cm ON mr.message_id = cm.id
      WHERE mr.status = 'PENDING'
      ORDER BY mr.created_at DESC
      LIMIT 100
    `);

    // 3. Moderation Statistics with Shadow AI Metrics & Decisions
    const statsRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE review_status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE decision = 'BLOCK') as blocked_count,
        COUNT(*) FILTER (WHERE decision = 'ALLOW_WITH_WARNING' OR admin_action = 'WARN_USER') as warning_count,
        COUNT(*) FILTER (WHERE admin_action = 'MUTE_USER_24H') as muted_count,
        COUNT(*) FILTER (WHERE is_withdrawn = TRUE) as withdrawn_count,
        COUNT(*) FILTER (WHERE review_status = 'RESOLVED' OR review_status = 'APPROVED') as resolved_count,
        COUNT(*) FILTER (WHERE ai_decision IS NOT NULL) as ai_evaluated_count,
        COUNT(*) FILTER (WHERE shadow_disagreement = TRUE) as ai_disagreement_count,
        ROUND(COALESCE(AVG(ai_latency_ms), 0), 1) as ai_avg_latency_ms,
        COUNT(*) as total_events
      FROM moderation_events
    `);

    res.json({
      success: true,
      events: eventsRes.rows || [],
      reports: reportsRes.rows || [],
      stats: statsRes.rows[0] || {}
    });
  } catch (err: any) {
    console.error('[Admin Moderation] Queue load error:', err);
    res.status(500).json({ success: false, message: 'মডারেশন কিউ লোড করা যায়নি: ' + err.message });
  }
});

/**
 * POST /api/admin/moderation/events/:id/action
 * Execute admin decision on a moderation event
 * Actions: 'ALLOW' | 'REMOVE_MESSAGE' | 'WARN_USER' | 'MUTE_USER_24H' | 'DISMISS'
 */
adminRoutes.post('/moderation/events/:id/action', requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const adminId = req.admin?.id || 'MASTER';

    if (!['ALLOW', 'REMOVE_MESSAGE', 'WARN_USER', 'MUTE_USER_24H', 'DISMISS'].includes(action)) {
      return res.status(400).json({ success: false, message: 'অবৈধ মডারেশন অ্যাকশন' });
    }

    const eventRes = await query(`SELECT * FROM moderation_events WHERE id = $1`, [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'মডারেশন ইভেন্ট পাওয়া যায়নি' });
    }

    const event = eventRes.rows[0];

    // Execute appropriate action
    if (action === 'ALLOW') {
      await query(`
        UPDATE moderation_events 
        SET review_status = 'RESOLVED',
            admin_action = 'ALLOW',
            admin_notes = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            is_withdrawn = FALSE
        WHERE id = $3
      `, [notes || 'অনুমোদিত (Allowed)', adminId, id]);

      if (event.message_id) {
        await query(`
          UPDATE circle_messages 
          SET moderation_status = 'APPROVED'
          WHERE id = $1
        `, [event.message_id]);
      }
    } else if (action === 'REMOVE_MESSAGE') {
      await query(`
        UPDATE moderation_events 
        SET review_status = 'RESOLVED',
            admin_action = 'REMOVE_MESSAGE',
            admin_notes = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            is_withdrawn = FALSE
        WHERE id = $3
      `, [notes || 'বার্তা মুছে ফেলা হয়েছে (Message Removed)', adminId, id]);

      if (event.message_id) {
        await query(`DELETE FROM circle_messages WHERE id = $1`, [event.message_id]);
      }
    } else if (action === 'WARN_USER') {
      const restrictionId = crypto.randomUUID();
      const warnReason = notes || 'কেভ সার্কেল চ্যাটে আপনার বার্তার বিরুদ্ধে কমিউনিটি নীতি লঙ্ঘনের জন্য এডমিন সতর্কতা জারি করেছেন।';
      
      await query(`
        INSERT INTO user_restrictions (id, user_id, circle_id, restriction_type, reason, issued_by, is_active)
        VALUES ($1, $2, $3, 'WARNING', $4, $5, TRUE)
      `, [restrictionId, event.user_id, event.circle_id, warnReason, adminId]);

      await query(`
        UPDATE moderation_events 
        SET review_status = 'RESOLVED',
            admin_action = 'WARN_USER',
            admin_notes = $1,
            restriction_id = $2,
            reviewed_by = $3,
            reviewed_at = CURRENT_TIMESTAMP,
            is_withdrawn = FALSE
        WHERE id = $4
      `, [notes || 'ব্যবহারকারীকে সতর্কতা জারি করা হয়েছে (Warning Issued)', restrictionId, adminId, id]);

      // Dispatch in-app notification to the user's notification inbox
      try {
        await db.createNotification(
          event.user_id,
          'MODERATION_WARNING',
          '⚠️ কমিউনিটি সতর্কতা (Community Warning)',
          warnReason,
          id
        );
      } catch (notifErr) {
        console.error('[Admin Moderation] Failed to dispatch warning notification to user:', notifErr);
      }
    } else if (action === 'MUTE_USER_24H') {
      const restrictionId = crypto.randomUUID();
      const muteReason = notes || 'কেভ সার্কেল চ্যাটে নিয়ম লঙ্ঘনের কারণে এডমিন আপনার জন্য ২৪ ঘণ্টার বার্তা প্রেরণে সাময়িক বিরতি নির্ধারণ করেছেন।';

      await query(`
        INSERT INTO user_restrictions (id, user_id, circle_id, restriction_type, reason, issued_by, expires_at, is_active)
        VALUES ($1, $2, $3, 'MUTED_24H', $4, $5, CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE)
      `, [restrictionId, event.user_id, event.circle_id, muteReason, adminId]);

      await query(`
        UPDATE moderation_events 
        SET review_status = 'RESOLVED',
            admin_action = 'MUTE_USER_24H',
            admin_notes = $1,
            restriction_id = $2,
            reviewed_by = $3,
            reviewed_at = CURRENT_TIMESTAMP,
            is_withdrawn = FALSE
        WHERE id = $4
      `, [notes || '২৪ ঘণ্টার জন্য বার্তা প্রেরণে বিরতি (Muted 24h)', restrictionId, adminId, id]);

      // Dispatch in-app notification to the user's notification inbox
      try {
        await db.createNotification(
          event.user_id,
          'MODERATION_MUTE',
          '🔇 সাময়িক বিরতি নোটিশ (24h Mute Notice)',
          muteReason,
          id
        );
      } catch (notifErr) {
        console.error('[Admin Moderation] Failed to dispatch mute notification to user:', notifErr);
      }
    } else if (action === 'DISMISS') {
      await query(`
        UPDATE moderation_events 
        SET review_status = 'DISMISSED',
            admin_action = 'DISMISS',
            admin_notes = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            is_withdrawn = FALSE
        WHERE id = $3
      `, [notes || 'খারিজ করা হয়েছে (Dismissed)', adminId, id]);
    }

    res.json({
      success: true,
      message: 'মডারেশন সিদ্ধান্ত সফলভাবে সম্পন্ন হয়েছে।',
      action,
      eventId: id
    });
  } catch (err: any) {
    console.error('[Admin Moderation] Action error:', err);
    res.status(500).json({ success: false, message: 'মডারেশন অ্যাকশন ব্যর্থ হয়েছে: ' + err.message });
  }
});

/**
 * POST /api/admin/moderation/events/:id/withdraw
 * Withdraw / Revert admin decision, deactivate user restrictions, and notify user
 */
adminRoutes.post('/moderation/events/:id/withdraw', requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.admin?.id || 'MASTER';

    const eventRes = await query(`SELECT * FROM moderation_events WHERE id = $1`, [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'মডারেশন ইভেন্ট পাওয়া যায়নি' });
    }

    const event = eventRes.rows[0];

    // 1. Deactivate restrictions in user_restrictions
    if (event.restriction_id) {
      await query(`
        UPDATE user_restrictions 
        SET is_active = FALSE 
        WHERE id = $1
      `, [event.restriction_id]);
    }
    // Also deactivate any active restriction for this user on this circle
    await query(`
      UPDATE user_restrictions 
      SET is_active = FALSE 
      WHERE user_id = $1 AND circle_id = $2 AND is_active = TRUE
    `, [event.user_id, event.circle_id]);

    // 2. Mark event as withdrawn
    const withdrawalNote = notes ? ` [প্রত্যাহার নোট: ${notes}]` : ' [সিদ্ধান্ত প্রত্যাহার করা হয়েছে / Decision Withdrawn]';
    await query(`
      UPDATE moderation_events 
      SET is_withdrawn = TRUE,
          review_status = 'WITHDRAWN',
          withdrawn_by = $1,
          withdrawn_at = CURRENT_TIMESTAMP,
          admin_notes = COALESCE(admin_notes, '') || $2
      WHERE id = $3
    `, [adminId, withdrawalNote, id]);

    // 3. Dispatch withdrawal notification to user's notification inbox
    try {
      await db.createNotification(
        event.user_id,
        'MODERATION_WITHDRAWN',
        '✅ সতর্কতা প্রত্যাহার (Warning Withdrawn)',
        'কেভ সার্কেল চ্যাটে পূর্বে আরোপিত সতর্কতা বা সাময়িক বিরতি এডমিন কর্তৃক প্রত্যাহার করা হয়েছে। এখন আপনি স্বাভাবিকভাবে অংশগ্রহণ করতে পারবেন।',
        id
      );
    } catch (notifErr) {
      console.error('[Admin Moderation] Failed to dispatch withdrawal notification to user:', notifErr);
    }

    res.json({
      success: true,
      message: 'মডারেশন সিদ্ধান্ত সফলভাবে প্রত্যাহার করা হয়েছে এবং ব্যবহারকারীর বিধিনিষেধ তুলে নেওয়া হয়েছে।',
      eventId: id
    });
  } catch (err: any) {
    console.error('[Admin Moderation] Withdraw error:', err);
    res.status(500).json({ success: false, message: 'সিদ্ধান্ত প্রত্যাহার ব্যর্থ হয়েছে: ' + err.message });
  }
});




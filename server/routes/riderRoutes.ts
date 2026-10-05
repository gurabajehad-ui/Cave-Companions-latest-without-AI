import express, { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import {
  generateRiderToken,
  requireRiderAuth,
  AuthRequest
} from '../auth.js';
import { normalizePhoneNumber } from '../timezone.js';
import { authRateLimiter, otpRequestRateLimiter } from '../rateLimiter.js';
import { smsService } from '../services/smsService.js';

const riderRoutes = express.Router();

/**
 * POST /api/rider/register
 * Public registration for new CC Delivery Riders
 */
riderRoutes.post('/register', authRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      phone,
      emergencyPhone,
      nidNumber,
      drivingLicense,
      vehicleType,
      vehiclePlate,
      serviceDistrict,
      serviceThana,
      pin,
      profilePhoto,
      nidFrontImage,
      nidBackImage
    } = req.body;

    if (!fullName || !phone || !pin || !profilePhoto || !nidFrontImage || !nidBackImage) {
      res.status(400).json({ success: false, message: 'পূর্ণ নাম, মোবাইল নম্বর, পিন, রাইডারের ছবি এবং এনআইডি (সামনের ও পিছনের) ছবি বাধ্যতামূলক।' });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'সঠিক ১০/১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন।' });
      return;
    }

    if (!/^\d{4,6}$/.test(pin.toString())) {
      res.status(400).json({ success: false, message: 'পিন অবশ্যই ৪ থেকে ৬ ডিজিটের সংখ্যা হতে হবে।' });
      return;
    }

    const existingRider = await db.getRiderByPhone(cleanPhone);
    if (existingRider) {
      res.status(400).json({ success: false, message: 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একজন রাইডার নিবন্ধিত রয়েছে।' });
      return;
    }

    const newRider = await db.createRider({
      fullName: fullName.trim(),
      phone: cleanPhone,
      pinCode: pin.toString().trim(),
      nidNumber: nidNumber ? nidNumber.trim() : undefined,
      vehicleType: vehicleType || 'BICYCLE',
      photoUrl: profilePhoto || undefined,
      nidFrontUrl: nidFrontImage || undefined,
      nidBackUrl: nidBackImage || undefined
    });

    res.status(201).json({
      success: true,
      message: 'রাইডার হিসেবে আপনার আবেদন সফলভাবে গৃহীত হয়েছে। এডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।',
      rider: {
        id: newRider.id,
        fullName: newRider.fullName,
        phone: newRider.phone,
        approvalStatus: newRider.approvalStatus
      }
    });
  } catch (err: any) {
    console.error('[Rider Register Error]', err);
    res.status(500).json({ success: false, message: err.message || 'নিবন্ধনে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/rider/login
 * Rider login with phone + pin
 */
riderRoutes.post('/login', authRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর ও পিন প্রদান করুন।' });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const rider = await db.authenticateRider(cleanPhone, pin.toString().trim());
    if (!rider) {
      res.status(401).json({ success: false, message: 'ভুল মোবাইল নম্বর অথবা পিন।' });
      return;
    }

    if (rider.approvalStatus === 'PENDING') {
      res.status(403).json({
        success: false,
        approvalStatus: 'PENDING',
        message: 'আপনার রাইডার প্রোফাইলটি এখনও এডমিন অনুমোদনের অপেক্ষায় রয়েছে।'
      });
      return;
    }

    if (rider.approvalStatus === 'REJECTED') {
      res.status(403).json({
        success: false,
        approvalStatus: 'REJECTED',
        message: 'আপনার রাইডার আবেদনটি এডমিন কর্তৃক বাতিল করা হয়েছে।'
      });
      return;
    }

    if (rider.approvalStatus === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        approvalStatus: 'SUSPENDED',
        message: 'আপনার রাইডার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত রাখা হয়েছে। অনুগ্রহ করে হেল্পলাইনে যোগাযোগ করুন।'
      });
      return;
    }

    const token = generateRiderToken(rider);

    res.json({
      success: true,
      token,
      rider: {
        id: rider.id,
        fullName: rider.fullName,
        phone: rider.phone,
        approvalStatus: rider.approvalStatus,
        availabilityStatus: rider.availabilityStatus,
        vehicleType: rider.vehicleType,
        serviceDistrict: rider.serviceDistrict,
        serviceThana: rider.serviceThana,
        totalEarnings: rider.totalEarnings,
        balance: rider.balance,
        rating: rider.rating
      }
    });
  } catch (err: any) {
    console.error('[Rider Login Error]', err);
    res.status(500).json({ success: false, message: err.message || 'লগইনে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/rider/password-reset/request
 * Forgot Password Step 1: Send OTP to Rider phone
 */
riderRoutes.post('/password-reset/request', otpRequestRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, phone } = req.body;
    const rawInput = identifier || phone;

    if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_IDENTIFIER',
        message: 'আপনার রাইডার মোবাইল নম্বর প্রদান করুন।'
      });
      return;
    }

    const cleanPhone = normalizePhoneNumber(rawInput.trim());
    const rider = await db.getRiderByPhone(cleanPhone);

    const otpCode = crypto.randomInt(100000, 1000000).toString();

    let isValidRider = false;
    const isDev = process.env.NODE_ENV !== 'production';

    if (rider) {
      const approval = (rider.approvalStatus || '').toUpperCase();
      if (approval !== 'SUSPENDED' && approval !== 'REJECTED') {
        isValidRider = true;
        await db.saveOtp(cleanPhone, otpCode, 'RIDER_PASSWORD_RESET', 5);
        await smsService.sendOtp(cleanPhone, otpCode, 'Rider Password Reset');
        if (isDev) {
          console.log(`[RIDER AUTH] Password Reset OTP for ${cleanPhone}: ${otpCode}`);
        }
      }
    }

    // Generic safe response to prevent phone enumeration
    res.json({
      success: true,
      message: 'যদি এই তথ্যে কোনো রাইডার অ্যাকাউন্ট থেকে থাকে, তবে মোবাইল নম্বরে ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।',
      ...(isDev && isValidRider ? { devOtpCode: otpCode } : {}),
      identifier: cleanPhone
    });
  } catch (err: any) {
    console.error('Rider password-reset/request error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'ওটিপি পাঠাতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/rider/password-reset/verify
 * Forgot Password Step 2: Verify OTP
 */
riderRoutes.post('/password-reset/verify', authRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, phone, code, otpCode } = req.body;
    const rawInput = identifier || phone;
    const inputCode = code || otpCode;

    if (!rawInput || !inputCode) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'মোবাইল নম্বর এবং ওটিপি কোড প্রদান করুন।'
      });
      return;
    }

    const cleanPhone = normalizePhoneNumber(String(rawInput).trim());
    const cleanCode = String(inputCode).trim();

    const verification = await db.verifyOtp(cleanPhone, cleanCode, 'RIDER_PASSWORD_RESET', false);

    if (!verification.valid) {
      let errMsg = 'ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।';
      if (verification.error === 'MAX_ATTEMPTS') {
        errMsg = 'সর্বোচ্চ বার ভুল কোড দেওয়া হয়েছে। নতুন ওটিপি অনুরোধ করুন।';
      }
      res.status(400).json({
        success: false,
        error: 'INVALID_OTP',
        message: errMsg
      });
      return;
    }

    res.json({
      success: true,
      message: 'ওটিপি সফলভাবে যাচাই করা হয়েছে। এবার নতুন পিন সেট করুন।',
      identifier: cleanPhone
    });
  } catch (err: any) {
    console.error('Rider password-reset/verify error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'ওটিপি যাচাইয়ে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/rider/password-reset/reset
 * Forgot Password Step 3: Complete PIN / Password Reset
 */
riderRoutes.post('/password-reset/reset', authRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, phone, code, otpCode, newPin, newPassword, confirmPin, confirmPassword } = req.body;
    const rawInput = identifier || phone;
    const inputCode = code || otpCode;
    const inputPass = newPassword || newPin;
    const inputConfirm = confirmPassword || confirmPin;

    if (!rawInput || !inputPass) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'সকল তথ্য সঠিকভাবে প্রদান করুন।'
      });
      return;
    }

    if (!/^\d{4,6}$/.test(String(inputPass).trim())) {
      res.status(400).json({
        success: false,
        error: 'WEAK_PIN',
        message: 'পিন অবশ্যই ৪ থেকে ৬ ডিজিটের সংখ্যা হতে হবে।'
      });
      return;
    }

    if (inputConfirm && String(inputPass).trim() !== String(inputConfirm).trim()) {
      res.status(400).json({
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: 'নতুন পিন এবং কনফার্ম পিন মিলছে না।'
      });
      return;
    }

    const cleanPhone = normalizePhoneNumber(String(rawInput).trim());

    if (!inputCode) {
      res.status(400).json({
        success: false,
        error: 'INVALID_OTP',
        message: 'ভেরিফিকেশন ওটিপি কোড প্রদান করা বাধ্যতামূলক।'
      });
      return;
    }

    const cleanCode = String(inputCode).trim();
    const verification = await db.verifyOtp(cleanPhone, cleanCode, 'RIDER_PASSWORD_RESET');
    if (!verification.valid) {
      let errMsg = 'ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।';
      if (verification.error === 'MAX_ATTEMPTS') {
        errMsg = 'সর্বোচ্চ চেষ্টার সীমা অতিক্রম করেছে। নতুন ওটিপি পাঠান।';
      }
      res.status(400).json({
        success: false,
        error: 'INVALID_OTP',
        message: errMsg
      });
      return;
    }

    const rider = await db.getRiderByPhone(cleanPhone);
    if (!rider) {
      res.status(400).json({
        success: false,
        error: 'RIDER_NOT_FOUND',
        message: 'রাইডার অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    const approval = (rider.approvalStatus || '').toUpperCase();
    if (approval === 'SUSPENDED' || approval === 'REJECTED') {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_RESTRICTED',
        message: 'আপনার রাইডার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত বা বাতিল রয়েছে। পাসওয়ার্ড রিসেটের জন্য হেল্পলাইনে যোগাযোগ করুন।'
      });
      return;
    }

    await db.updateRiderPassword(rider.id, String(inputPass).trim());
    console.log(`[SECURITY AUDIT] Rider Password Reset successful for ${rider.id} (${cleanPhone})`);

    res.json({
      success: true,
      message: 'রাইডার পিন সফলভাবে পরিবর্তন করা হয়েছে! নতুন পিন দিয়ে লগইন করুন।'
    });
  } catch (err: any) {
    console.error('Rider password-reset/reset error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পিন পরিবর্তন করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/rider/me
 * Get current rider profile and statistics
 */
riderRoutes.get('/me', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rider = req.rider!;
    const stats = await db.getRiderOverallStats();
    res.json({
      success: true,
      rider,
      stats: {
        totalDeliveries: rider.totalDeliveries || 0,
        totalDelivered: rider.totalDelivered || 0,
        totalDone: rider.totalDone || 0,
        totalProductBack: rider.totalProductBack || 0,
        totalEarnings: rider.totalEarnings || 0,
        overallStats: stats
      }
    });
  } catch (err: any) {
    console.error('[Rider Me Error]', err);
    res.status(500).json({ success: false, message: 'প্রোফাইল লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/rider/status
 * Update rider online/offline status and GPS location
 */
riderRoutes.post('/status', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { availabilityStatus, latitude, longitude } = req.body;

    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;

    await db.updateRiderStatus(riderId, availabilityStatus, lat, lng);
    res.json({
      success: true,
      availabilityStatus,
      lastActiveAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Rider Status Error]', err);
    res.status(500).json({ success: false, message: err.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' });
  }
});

/**
 * GET /api/rider/delivery-requests
 * Get pending broadcast delivery requests for this rider
 */
riderRoutes.get('/delivery-requests', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;

    const requests = await db.getRiderDeliveryRequests(riderId);
    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    console.error('[Rider Delivery Requests Error]', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি রিকোয়েস্ট লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/accept
 * Accept a delivery order
 */
riderRoutes.post('/orders/:orderId/accept', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;

    const order = await db.acceptRiderDeliveryOrder(riderId, orderId);
    res.json({
      success: true,
      message: 'অর্ডার সফলভাবে গ্রহণ করা হয়েছে।',
      order
    });
  } catch (err: any) {
    console.error('[Rider Accept Order Error]', err);
    res.status(400).json({ success: false, message: err.message || 'অর্ডার গ্রহণ করা সম্ভব হয়নি।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/decline
 * Decline a delivery order
 */
riderRoutes.post('/orders/:orderId/decline', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;

    await db.declineRiderDeliveryOrder(riderId, orderId);
    res.json({
      success: true,
      message: 'রিকোয়েস্ট বাতিল করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('[Rider Decline Order Error]', err);
    res.status(400).json({ success: false, message: err.message || 'বাতিল করা সম্ভব হয়নি।' });
  }
});

function sanitizeOrderForRider(order: any) {
  if (!order) return order;
  return {
    ...order,
    rejectionCode: order.rejectionCode ? '******' : null,
    deliveryOtp: undefined
  };
}

/**
 * GET /api/rider/active-order
 * Get currently accepted/ongoing delivery order
 */
riderRoutes.get('/active-order', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const order = await db.getRiderActiveOrder(riderId);
    res.json({
      success: true,
      order: order ? sanitizeOrderForRider(order) : null
    });
  } catch (err: any) {
    console.error('[Rider Active Order Error]', err);
    res.status(500).json({ success: false, message: 'চলমান অর্ডার লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/pickup
 * Confirm pickup using Merchant Pickup OTP
 */
riderRoutes.post('/orders/:orderId/pickup', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;
    const { pickupOtp, shopId } = req.body;

    if (!pickupOtp) {
      res.status(400).json({ success: false, message: 'পিকআপ ওটিপি প্রদান করুন।' });
      return;
    }

    const order = await db.pickupRiderOrder(riderId, orderId, pickupOtp.toString().trim(), shopId);
    res.json({
      success: true,
      message: 'পিকআপ সফলভাবে নিশ্চিত করা হয়েছে।',
      order
    });
  } catch (err: any) {
    console.error('[Rider Pickup Order Error]', err);
    res.status(400).json({ success: false, message: err.message || 'পিকআপ নিশ্চিত করা সম্ভব হয়নি।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/deliver
 * Confirm customer delivery using Customer Delivery OTP
 */
riderRoutes.post('/orders/:orderId/deliver', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;
    const { deliveryOtp, shopId } = req.body;

    if (!deliveryOtp) {
      res.status(400).json({ success: false, message: 'ডেলিভারি ওটিপি প্রদান করুন।' });
      return;
    }

    const order = await db.deliverRiderOrder(riderId, orderId, deliveryOtp.toString().trim(), shopId);
    res.json({
      success: true,
      message: 'গ্রাহককে পণ্য সফলভাবে হস্তান্তর করা হয়েছে। মার্চেন্ট ক্যাশ বা হিসাব বুঝে পেয়ে সম্পন্ন (DONE) করলেই ডেলিভারি ফি অ্যাকাউন্টে যুক্ত হবে।',
      order
    });
  } catch (err: any) {
    console.error('[Rider Deliver Order Error]', err);
    res.status(400).json({ success: false, message: err.message || 'ডেলিভারি নিশ্চিত করা সম্ভব হয়নি।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/request-reject-code
 * Rider requests a parcel rejection code when user refuses to take the product
 */
riderRoutes.post('/orders/:orderId/request-reject-code', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;

    const order = await db.requestOrderRejectionCode(riderId, orderId);
    res.json({
      success: true,
      message: 'পার্সেল রিজেক্ট কোড জেনারেট করা হয়েছে। গ্রাহক তাদের অ্যাপে এই কোড দেখতে পাবেন।',
      order: sanitizeOrderForRider(order)
    });
  } catch (err: any) {
    console.error('[Rider Request Reject Code Error]', err);
    res.status(400).json({ success: false, message: err.message || 'রিজেক্ট কোড জেনারেট করা সম্ভব হয়নি।' });
  }
});

/**
 * POST /api/rider/orders/:orderId/reject-order
 * Rider confirms parcel rejection using rejection code provided by user
 */
riderRoutes.post('/orders/:orderId/reject-order', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const { orderId } = req.params;
    const { rejectCode } = req.body;

    if (!rejectCode) {
      res.status(400).json({ success: false, message: 'রিজেক্ট কোড প্রদান করুন।' });
      return;
    }

    const order = await db.confirmOrderRejection(riderId, orderId, rejectCode.toString().trim());
    res.json({
      success: true,
      message: 'পার্সেল রিজেক্ট বা বাতিল সফলভাবে নিশ্চিত করা হয়েছে।',
      order
    });
  } catch (err: any) {
    console.error('[Rider Reject Order Error]', err);
    res.status(400).json({ success: false, message: err.message || 'পার্সেল রিজেক্ট নিশ্চিত করা সম্ভব হয়নি।' });
  }
});

/**
 * GET /api/rider/history
 * Get completed deliveries history & earnings summary
 */
riderRoutes.get('/history', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.rider!.id;
    const orders = await db.getRiderHistory(riderId);
    res.json({
      success: true,
      orders,
      stats: {
        totalDeliveries: req.rider!.totalDeliveries || 0,
        totalDelivered: req.rider!.totalDelivered || 0,
        totalDone: req.rider!.totalDone || 0,
        totalProductBack: req.rider!.totalProductBack || 0,
        totalEarnings: req.rider!.totalEarnings || 0
      }
    });
  } catch (err: any) {
    console.error('[Rider History Error]', err);
    res.status(500).json({ success: false, message: 'ডেলিভারি ইতিহাস লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/rider/stats
 * Get detailed stats and settlement totals
 */
riderRoutes.get('/stats', requireRiderAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await db.getRiderOverallStats();
    res.json({
      success: true,
      stats: {
        totalDeliveries: req.rider!.totalDeliveries || 0,
        totalDelivered: req.rider!.totalDelivered || 0,
        totalDone: req.rider!.totalDone || 0,
        totalProductBack: req.rider!.totalProductBack || 0,
        totalEarnings: req.rider!.totalEarnings || 0,
        overallStats: stats
      }
    });
  } catch (err: any) {
    console.error('[Rider Stats Error]', err);
    res.status(500).json({ success: false, message: 'পরিসংখ্যান লোড করতে সমস্যা হয়েছে।' });
  }
});

export default riderRoutes;

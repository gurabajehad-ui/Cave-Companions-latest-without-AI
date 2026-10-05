import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { getTodayDateString, getGracePeriodInfo } from '../timezone.js';
import { redemptionRateLimiter } from '../rateLimiter.js';

const router = Router();

/**
 * 1. Get all tokens for authenticated user
 * Returns available tokens, used tokens (history), counts, and today's redemption eligibility.
 * IDOR safe: relies exclusively on req.user.id
 */
router.get('/my-tokens', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const todayStr = getTodayDateString();

    // Auto-evaluate previous day during morning grace period
    const graceStatus = await db.evaluatePreviousDayGracePeriodToken(user.id);
    const tokenData = await db.getUserTokens(user.id);
    const dailyCheck = await db.canUserRedeemToday(user.id, todayStr);
    const graceInfo = getGracePeriodInfo();

    res.json({
      success: true,
      todayDate: todayStr,
      canRedeemToday: dailyCheck.canRedeem,
      dailyRedeemWarning: !dailyCheck.canRedeem ? dailyCheck.reason : null,
      availableCount: tokenData.totalAvailable,
      availableTokens: tokenData.available,
      usedCount: tokenData.totalUsed,
      usedTokens: tokenData.used,
      gracePeriod: {
        inGracePeriod: graceInfo.inGracePeriod,
        yesterdayDate: graceInfo.yesterdayDateStr,
        remainingMinutes: graceInfo.remainingMinutes,
        yesterdayRewardStatus: graceStatus
      },
      rules: {
        gold: {
          tier: 'GOLD',
          requiredPrayers: 5,
          labelBn: 'গোল্ড টোকেন (Gold Token)',
          descriptionBn: 'দৈনিক ৫ ওয়াক্ত জামাতে নামাজ সম্পন্ন'
        },
        silver: {
          tier: 'SILVER',
          requiredPrayers: 4,
          labelBn: 'সিলভার টোকেন (Silver Token)',
          descriptionBn: 'দৈনিক ৪ ওয়াক্ত জামাতে নামাজ সম্পন্ন'
        },
        bronze: {
          tier: 'BRONZE',
          requiredPrayers: 3,
          labelBn: 'ব্রোঞ্জ টোকেন (Bronze Token)',
          descriptionBn: 'দৈনিক ৩ ওয়াক্ত জামাতে নামাজ সম্পন্ন'
        }
      }
    });
  } catch (err: any) {
    console.error('get my-tokens error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 2. Check previous day token reward status (Grace Period: 00:00 -> 11:59 AM Asia/Dhaka)
 */
router.get('/previous-day-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const status = await db.evaluatePreviousDayGracePeriodToken(user.id);
    const graceInfo = getGracePeriodInfo();

    res.json({
      success: true,
      gracePeriod: graceInfo,
      status
    });
  } catch (err: any) {
    console.error('previous-day-status error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পূর্ববর্তী দিনের রিওয়ার্ড তথ্য আনতে ত্রুটি হয়েছে।'
    });
  }
});

/**
 * 3. Explicitly claim yesterday's earned token during morning grace period (00:00 - 11:59 AM)
 */
router.post('/claim-previous-day', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const graceInfo = getGracePeriodInfo();

    if (!graceInfo.inGracePeriod) {
      res.status(400).json({
        success: false,
        error: 'GRACE_PERIOD_EXPIRED',
        message: 'পূর্ববর্তী দিনের রিওয়ার্ড ক্লেইম করার সময়সীমা (রাত ১২:০০ - দুপুর ১১:৫৯ বাংলাদেশ সময়) পার হয়ে গেছে।'
      });
      return;
    }

    const result = await db.evaluatePreviousDayGracePeriodToken(user.id);

    if (!result.eligible && result.action === 'none') {
      res.status(400).json({
        success: false,
        error: 'NOT_ELIGIBLE',
        message: 'গতকাল ৩ ওয়াক্ত বা ততোধিক জামাতে সালাত আদায় না করায় কোনো টোকেন অর্জিত হয়নি।'
      });
      return;
    }

    res.json({
      success: true,
      action: result.action,
      token: result.token,
      yesterdayDateStr: result.yesterdayDateStr,
      prayerCount: result.prayerCount,
      message: result.message
    });
  } catch (err: any) {
    console.error('claim-previous-day error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পূর্ববর্তী দিনের টোকেন ক্লেইম করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 4. Get specific token by ID
 * IDOR safe: validates that token belongs to req.user.id
 */
router.get('/:tokenId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;

    const token = await db.getUserTokenById(user.id, tokenId);
    if (!token) {
      res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: 'টোকেনটি খুঁজে পাওয়া যায়নি বা আপনার একাউন্টের সাথে সম্পর্কিত নয়।'
      });
      return;
    }

    res.json({
      success: true,
      token
    });
  } catch (err: any) {
    console.error('get token error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেনের বিস্তারিত আনতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 5. Prepare Token Usage (Phase 5 Flow)
 */
router.post('/:tokenId/prepare-use', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;
    const todayStr = getTodayDateString();

    const token = await db.getUserTokenById(user.id, tokenId);
    if (!token) {
      res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: 'টোকেনটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    if (token.status === 'USED') {
      res.status(400).json({
        success: false,
        error: 'TOKEN_ALREADY_USED',
        message: 'এই Token টি ইতোমধ্যে ব্যবহার করা হয়েছে।'
      });
      return;
    }

    res.json({
      success: true,
      canProceed: true,
      token,
      todayDate: todayStr,
      message: 'Token ব্যবহার করতে পার্টনার দোকানের QR Code scan করতে হবে। (Phase 6 Architecture)'
    });
  } catch (err: any) {
    console.error('prepare-use error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন প্রস্তুত করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 5.5. Donate Token (Set is_donated = true)
 */
router.post('/:tokenId/donate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;

    const result = await db.donateToken(user.id, tokenId);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      token: result.token
    });
  } catch (err: any) {
    console.error('donate token error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন দান করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 6. Generate/evaluate token for today or evaluate historical tokens
 */
router.post('/evaluate-today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const todayStr = getTodayDateString();

    const result = await db.generateOrUpdateDailyToken(user.id, todayStr);
    const tokenData = await db.getUserTokens(user.id);

    res.json({
      success: true,
      action: result.action,
      token: result.token,
      availableCount: tokenData.totalAvailable,
      todayDate: todayStr
    });
  } catch (err: any) {
    console.error('evaluate-today error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন মূল্যায়ন করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 7. Future-Ready / Test Token Redemption endpoint
 */
router.post('/:tokenId/redeem', requireAuth, redemptionRateLimiter, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;
    const todayStr = getTodayDateString();
    const { shopId, merchantId, discount, transactionAmount } = req.body || {};

    const result = await db.redeemToken(user.id, tokenId, todayStr, {
      shopId,
      merchantId,
      discount,
      transactionAmount
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: 'টোকেন সফলভাবে ব্যবহার করা হয়েছে!',
      token: result.token,
      redemption: result.redemption
    });
  } catch (err: any) {
    console.error('redeem error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন রিডিম করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 8. Delete used token usage history (single or all)
 */
router.delete('/history/used', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const result = await db.deleteUserUsedTokenHistory(user.id);
    res.json({
      success: true,
      message: 'সকল ব্যবহারের ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।',
      deletedCount: result.deletedCount
    });
  } catch (err: any) {
    console.error('delete used history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'ব্যবহারের ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

router.delete('/history/used/:tokenId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;

    const result = await db.deleteUserUsedTokenHistory(user.id, tokenId);
    res.json({
      success: true,
      message: 'ব্যবহারের ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।',
      deletedCount: result.deletedCount
    });
  } catch (err: any) {
    console.error('delete used token history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'ব্যবহারের ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 9. Delete donated token history (single or all)
 */
router.delete('/history/donated', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const result = await db.deleteUserDonatedTokenHistory(user.id);
    res.json({
      success: true,
      message: 'সকল দান করার ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।',
      deletedCount: result.deletedCount
    });
  } catch (err: any) {
    console.error('delete donated history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দান করার ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

router.delete('/history/donated/:tokenId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { tokenId } = req.params;

    const result = await db.deleteUserDonatedTokenHistory(user.id, tokenId);
    res.json({
      success: true,
      message: 'দান করার ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।',
      deletedCount: result.deletedCount
    });
  } catch (err: any) {
    console.error('delete donated token history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দান করার ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

export default router;

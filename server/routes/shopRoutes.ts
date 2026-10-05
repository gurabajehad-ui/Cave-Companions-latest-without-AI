import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireMerchantAuth, AuthRequest } from '../auth.js';
import { getTodayDateString } from '../timezone.js';
import { redemptionRateLimiter } from '../rateLimiter.js';

export const shopRoutes = Router();

/**
 * GET /api/shops
 * List all active partner shops for users with search, category & location distance calculation.
 */
shopRoutes.get('/', async (req, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const shops = await db.getActiveShopsForUser({
      category,
      search,
      userLat: isNaN(lat!) ? undefined : lat,
      userLng: isNaN(lng!) ? undefined : lng
    });

    res.json({
      success: true,
      count: shops.length,
      shops
    });
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দোকান তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/all-products
 * Public endpoint to list all active products for the Cave Market.
 */
shopRoutes.get('/all-products', async (req, res: Response) => {
  try {
    const marketType = (req.query.marketType as string) || 'NATIONWIDE';
    const products = await db.getAllMarketProducts(false, marketType);
    res.json({
      success: true,
      products
    });
  } catch (err: any) {
    console.error('Error fetching all products:', err);
    res.status(500).json({
      success: false,
      message: 'পণ্য তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/:shopId
 * Get detailed public profile of a single shop.
 */
shopRoutes.get('/:shopId', async (req, res: Response) => {
  try {
    let { shopId } = req.params;
    shopId = decodeURIComponent(shopId || '').trim();

    let shop = await db.getPublicShopById(shopId);
    if (!shop) {
      shop = await db.getShopById(shopId);
    }
    if (!shop && shopId.toLowerCase().startsWith('shop-')) {
      const cleanId = shopId.replace(/^shop-/i, '');
      shop = (await db.getPublicShopById(cleanId)) || (await db.getShopById(cleanId));
    }

    if (!shop) {
      res.status(404).json({
        success: false,
        error: 'SHOP_NOT_FOUND',
        message: 'দোকানটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    res.json({
      success: true,
      shop
    });
  } catch (err: any) {
    console.error('Error fetching shop detail:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দোকানের তথ্য লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/:shopId/reviews/:reviewId/reply
 * Merchant reply to a shop review.
 */
shopRoutes.post('/:shopId/reviews/:reviewId/reply', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, reviewId } = req.params;
    const { reply } = req.body;
    const merchant = req.merchant!;

    // Ensure merchant belongs to this shop
    if (merchant.shopId !== shopId) {
      res.status(403).json({
        success: false,
        message: 'আপনি শুধুমাত্র আপনার নিজের দোকানের রিভিউতে রিপ্লাই দিতে পারবেন।'
      });
      return;
    }

    if (!reply || !reply.trim()) {
      res.status(400).json({
        success: false,
        message: 'রিপ্লাই টেক্সট প্রদান করুন।'
      });
      return;
    }

    const success = await db.replyToShopReview(reviewId, shopId, reply);
    if (success) {
      res.json({
        success: true,
        message: 'সফলভাবে রিপ্লাই দেওয়া হয়েছে।'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'রিভিউটি পাওয়া যায়নি।'
      });
    }
  } catch (err: any) {
    console.error('Error replying to review:', err);
    res.status(500).json({
      success: false,
      message: 'সার্ভার ত্রুটি, অনুগ্রহ করে পরে চেষ্টা করুন।'
    });
  }
});

/**
 * GET /api/shops/:shopId/qr
 * Retrieve authoritative active QR code data for a shop.
 */
shopRoutes.get('/:shopId/qr', async (req, res: Response) => {
  try {
    const { shopId } = req.params;
    const shop = await db.getShopById(shopId);

    if (!shop) {
      res.status(404).json({
        success: false,
        error: 'SHOP_NOT_FOUND',
        message: 'দোকানটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    res.json({
      success: true,
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
    console.error('Error fetching shop QR:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'QR কোড লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/verify-qr
 * Validates a scanned shop QR code string and returns a secure verificationId.
 */
shopRoutes.post('/verify-qr', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { qrPayload } = req.body;
    const user = req.user!;

    if (!qrPayload || typeof qrPayload !== 'string') {
      res.status(400).json({
        success: false,
        error: 'MISSING_QR',
        message: 'QR কোড ডাটা প্রদান করা হয়নি।'
      });
      return;
    }

    const verification = await db.verifyShopQr(qrPayload, user.id);

    if (!verification.valid || !verification.shop) {
      res.status(400).json({
        success: false,
        error: verification.error || 'INVALID_SHOP_QR',
        message: verification.message || 'ভুল বা অকার্যকর দোকানের QR কোড স্ক্যান করা হয়েছে। অনুগ্রহ করে সঠিক দোকানের QR কোড স্ক্যান করুন।'
      });
      return;
    }

    const { commissionRate, qrSecret, ...safeShop } = verification.shop;

    res.json({
      success: true,
      shop: safeShop,
      verificationId: verification.verificationId,
      message: 'পার্টনার শপ সফলভাবে শনাক্ত করা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Error verifying shop QR:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'QR কোড যাচাইকরণে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/request-redemption
 * User initiates an offline partner shop token redemption request.
 * Merchant Approval Gate: Creates pending request, reserves token, requires merchant approval before consuming token.
 */
shopRoutes.post('/request-redemption', requireAuth, redemptionRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { tokenId, verificationId, purchaseAmount } = req.body;

    if (!tokenId || !verificationId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'টোকেন আইডি ও ভেরিফিকেশন আইডি প্রদান করতে হবে।'
      });
      return;
    }

    const parsedAmount = Math.max(0, Number(purchaseAmount) || 0);
    if (parsedAmount <= 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'সঠিক বিলের পরিমাণ উল্লেখ করুন।'
      });
      return;
    }

    const result = await db.createTokenRedemptionRequest({
      userId: user.id,
      tokenId,
      verificationId,
      purchaseAmount: parsedAmount
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
      request: result.request,
      message: result.message
    });
  } catch (err: any) {
    console.error('Error creating redemption request:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন অফার রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/redemption-requests/:requestId
 * Check status of a specific redemption request (User / Merchant polling).
 */
shopRoutes.get('/redemption-requests/:requestId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { requestId } = req.params;

    const request = await db.getRedemptionRequestById(requestId);
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'অনুরোধটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    // Ensure only the request owner can view it
    if (request.userId !== user.id) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'এই অনুরোধটি দেখার অনুমতি আপনার নেই।'
      });
      return;
    }

    res.json({
      success: true,
      request
    });
  } catch (err: any) {
    console.error('Error fetching redemption request:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধের তথ্য লোড করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/redemption-requests/:requestId/cancel
 * User cancels their pending redemption request before merchant processes it.
 */
shopRoutes.post('/redemption-requests/:requestId/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { requestId } = req.params;

    const result = await db.cancelTokenRedemptionRequest({
      requestId,
      userId: user.id
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
      message: result.message
    });
  } catch (err: any) {
    console.error('Error cancelling redemption request:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধ বাতিল করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/my/redemption-requests
 * Logged-in user's pending and historical redemption requests.
 */
shopRoutes.get('/my/redemption-requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const requests = await db.getUserRedemptionRequests(user.id);

    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    console.error('Error fetching user redemption requests:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধের ইতিহাস লোড করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/redeem
 * Legacy/Direct atomic token redemption endpoint (kept backward-compatible).
 */
shopRoutes.post('/redeem', requireAuth, redemptionRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { tokenId, verificationId, purchaseAmount } = req.body;

    if (!tokenId || !verificationId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'টোকেন আইডি ও ভেরিফিকেশন আইডি উভয়ই প্রদান করতে হবে।'
      });
      return;
    }

    const parsedAmount = Math.max(0, Number(purchaseAmount) || 0);
    const todayDateStr = getTodayDateString();

    const result = await db.executeRedemptionTransaction({
      userId: user.id,
      tokenId,
      verificationId,
      purchaseAmount: parsedAmount,
      todayDateStr
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
      redemption: result.redemption,
      message: result.message
    });
  } catch (err: any) {
    console.error('Error executing redemption:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'টোকেন রিডেম্পশন সম্পন্ন করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/my/redemptions
 * Logged-in user's redemption history.
 */
shopRoutes.get('/my/redemptions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const redemptions = await db.getUserRedemptions(user.id);

    res.json({
      success: true,
      count: redemptions.length,
      redemptions
    });
  } catch (err: any) {
    console.error('Error fetching user redemptions:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'রিডেম্পশন ইতিহাস লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/:shopId/products
 * Public endpoint to list products for a partner shop.
 */
shopRoutes.get('/:shopId/products', async (req, res: Response) => {
  try {
    let { shopId } = req.params;
    shopId = decodeURIComponent(shopId || '').trim();

    let shop = await db.getPublicShopById(shopId);
    if (!shop) {
      shop = await db.getShopById(shopId);
    }
    if (!shop && shopId.toLowerCase().startsWith('shop-')) {
      const cleanId = shopId.replace(/^shop-/i, '');
      shop = (await db.getPublicShopById(cleanId)) || (await db.getShopById(cleanId));
    }

    // Graceful fallback to the first active partner shop if the specific ID is not found
    if (!shop) {
      const activeShops = await db.getActiveShopsForUser({});
      if (activeShops && activeShops.length > 0) {
        shop = activeShops[0];
      }
    }

    if (!shop) {
      res.json({
        success: true,
        shop: null,
        products: []
      });
      return;
    }

    const products = await db.getProductsByShop(shop.id);
    res.json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        nameBn: shop.nameBn,
        address: shop.address,
        area: shop.area,
        district: shop.district,
        phone: shop.phone,
        goldDiscount: shop.goldDiscount,
        silverDiscount: shop.silverDiscount,
        bronzeDiscount: shop.bronzeDiscount,
        commissionRate: shop.commissionRate,
        averageRating: shop.averageRating,
        totalReviews: shop.totalReviews
      },
      products
    });
  } catch (err: any) {
    console.error('Error fetching shop products:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পণ্যের তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/shops/:shopId/reviews
 * Public endpoint to fetch all reviews and aggregate rating for a shop.
 */
shopRoutes.get('/:shopId/reviews', async (req, res: Response) => {
  try {
    const { shopId } = req.params;
    const { reviews, averageRating, totalReviews, ratingDistribution } = await db.getShopReviews(shopId);

    res.json({
      success: true,
      shopId,
      averageRating,
      totalReviews,
      ratingDistribution,
      reviews
    });
  } catch (err: any) {
    console.error('Error fetching shop reviews:', err);
    res.status(500).json({
      success: false,
      message: 'দোকানের রিভিউ লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/shops/:shopId/reviews
 * Submit or update a review for a shop by authenticated user.
 */
shopRoutes.post('/:shopId/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { shopId } = req.params;
    const userId = req.user!.id;
    const { rating, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      res.status(400).json({
        success: false,
        message: 'দয়া করে ১ থেকে ৫ এর মধ্যে রেটিং প্রদান করুন।'
      });
      return;
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      res.status(400).json({
        success: false,
        message: 'দয়া করে আপনার বাস্তব অভিজ্ঞতা বা মতামত লিখুন।'
      });
      return;
    }

    const result = await db.addShopReview(shopId, userId, {
      rating: Number(rating),
      comment: comment.trim()
    });

    res.json({
      success: true,
      message: result.message,
      review: result.review
    });
  } catch (err: any) {
    console.error('Error submitting shop review:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'রিভিউ সংরক্ষণ করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * DELETE /api/shops/:shopId/reviews/:reviewId
 * Delete a review by owner or admin.
 */
shopRoutes.delete('/:shopId/reviews/:reviewId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!.id;
    const isAdmin = (req.user as any)?.role === 'ADMIN' || (req.user as any)?.role === 'SUPER_ADMIN';

    const result = await db.deleteShopReview(reviewId, userId, isAdmin);

    if (!result.success) {
      res.status(403).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Error deleting shop review:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'রিভিউ মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/products/:productId/reviews
 * Public endpoint to fetch all reviews and aggregate rating for a product.
 */
shopRoutes.get('/products/:productId/reviews', async (req, res: Response) => {
  try {
    const { productId } = req.params;
    const { reviews, averageRating, totalReviews, ratingDistribution } = await db.getProductReviews(productId);

    res.json({
      success: true,
      productId,
      averageRating,
      totalReviews,
      ratingDistribution,
      reviews
    });
  } catch (err: any) {
    console.error('Error fetching product reviews:', err);
    res.status(500).json({
      success: false,
      message: 'পণ্যের রিভিউ লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/products/:productId/reviews
 * Submit or update a review for a product by authenticated user.
 */
shopRoutes.post('/products/:productId/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const { rating, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      res.status(400).json({
        success: false,
        message: 'দয়া করে ১ থেকে ৫ এর মধ্যে রেটিং প্রদান করুন।'
      });
      return;
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      res.status(400).json({
        success: false,
        message: 'দয়া করে আপনার মন্তব্য লিখুন।'
      });
      return;
    }

    const result = await db.addProductReview(productId, userId, {
      rating: Number(rating),
      comment: comment.trim()
    });

    res.json({
      success: true,
      message: result.message,
      review: result.review
    });
  } catch (err: any) {
    console.error('Error submitting product review:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'রিভিউ সংরক্ষণ করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * DELETE /api/products/:productId/reviews/:reviewId
 * Delete a product review by user or admin.
 */
shopRoutes.delete('/products/:productId/reviews/:reviewId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!.id;
    const isAdmin = (req.user as any)?.role === 'ADMIN' || (req.user as any)?.role === 'SUPER_ADMIN';

    const result = await db.deleteProductReview(reviewId, userId, isAdmin);

    if (!result.success) {
      res.status(403).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Error deleting product review:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'রিভিউ মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});



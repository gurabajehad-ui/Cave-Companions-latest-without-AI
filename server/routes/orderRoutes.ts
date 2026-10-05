import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';

export const orderRoutes = Router();

// All order routes require user authentication
orderRoutes.use(requireAuth);

orderRoutes.get('/local-delivery-fee', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      return;
    }

    const feeData = await db.calculateLocalDeliveryFee(userId, Number(lat), Number(lng));
    res.json({
      success: true,
      fee: feeData.fee,
      distanceKm: feeData.distanceKm,
      totalWeightKg: feeData.totalWeightKg,
      farthestShopName: feeData.farthestShopName,
      farthestShopDistanceKm: feeData.farthestShopDistanceKm,
      ratePerKm: feeData.ratePerKm,
      shopBreakdowns: feeData.shopBreakdowns,
      nearbyRiderAvailable: feeData.nearbyRiderAvailable,
      activeRidersCount: feeData.activeRidersCount,
      nearbyRiders: feeData.nearbyRiders,
      message: feeData.message
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

orderRoutes.get('/check-rider-availability', async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      return;
    }
    const nearbyRiders = await db.getNearbyActiveRiders(Number(lat), Number(lng), 20.0);
    const available = nearbyRiders.length > 0;
    res.json({
      success: true,
      available,
      count: nearbyRiders.length,
      riders: nearbyRiders,
      message: available ? `${nearbyRiders.length} জন রাইডার সক্রিয় আছেন` : 'দুঃখিত আমাদের সকল rider ব্যস্ত আছে'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/orders/checkout
 * Checkout the user's cart to place a Cash On Delivery order.
 * Body: { customerName: string, customerPhone: string, deliveryAddress: string, deliveryNotes?: string }
 */
orderRoutes.post('/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { customerName, customerPhone, deliveryAddress, district, upazila, deliveryNotes, couponCode, orderType, latitude, longitude } = req.body;

    if (!customerName?.trim() || !customerPhone?.trim() || !deliveryAddress?.trim()) {
      res.status(400).json({
        success: false,
        message: 'গ্রাহকের নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন।'
      });
      return;
    }

    const order = await db.checkoutCart(userId, {
      customerName,
      customerPhone,
      deliveryAddress,
      district,
      upazila,
      deliveryNotes,
      couponCode,
      orderType,
      latitude,
      longitude
    });

    res.json({
      success: true,
      message: 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!',
      order
    });
  } catch (err: any) {
    console.error('Error in checkout:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/orders/my-orders
 * Retrieve the authenticated user's order history.
 */
orderRoutes.get('/my-orders', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orders = await db.getUserOrders(userId);

    res.json({
      success: true,
      orders
    });
  } catch (err: any) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'অর্ডারের তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/orders/:orderId
 * Retrieve single order details for user.
 */
orderRoutes.get('/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const order = await db.getOrderById(orderId);
    if (!order || order.userId !== userId) {
      res.status(404).json({
        success: false,
        message: 'অর্ডারটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    let riderInfo = null;
    if (order.riderId) {
      const rider = await db.getRiderById(order.riderId);
      if (rider) {
        riderInfo = {
          id: rider.id,
          fullName: rider.fullName,
          phone: rider.phone,
          vehicleType: rider.vehicleType,
          vehiclePlate: rider.vehiclePlate,
          currentLatitude: rider.currentLatitude,
          currentLongitude: rider.currentLongitude,
          rating: rider.rating,
          photoUrl: rider.photoUrl
        };
      }
    }

    res.json({
      success: true,
      order: {
        ...order,
        riderInfo
      }
    });
  } catch (err: any) {
    console.error('Error fetching order detail:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'অর্ডারের বিবরণ লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/orders/validate-coupon
 * Validate a coupon code for checkout
 */
orderRoutes.post('/validate-coupon', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'কুপন কোড প্রদান করুন।' });
      return;
    }
    const coupon = await db.getCouponByCode(code);
    if (!coupon) {
      res.status(404).json({ success: false, message: 'কুপনটি সঠিক নয় বা বর্তমানে সক্রিয় নেই।' });
      return;
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ success: false, message: 'কুপনটির ব্যবহারের সর্বোচ্চ সীমা শেষ হয়েছে।' });
      return;
    }
    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (err: any) {
    console.error('Coupon validation error:', err);
    res.status(500).json({ success: false, message: 'কুপন যাচাই করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/orders/:orderId
 * Soft delete user order history entry without affecting merchant/admin financial records.
 */
orderRoutes.delete('/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const order = await db.getOrderById(orderId);
    if (!order || order.userId !== userId) {
      res.status(404).json({ success: false, message: 'অর্ডারটি খুঁজে পাওয়া যায়নি।' });
      return;
    }

    const deleted = await db.softDeleteUserOrderHistory(userId, orderId);
    if (!deleted) {
      res.status(400).json({ success: false, message: 'অর্ডার হিস্ট্রি মুছে ফেলতে ব্যর্থ হয়েছে।' });
      return;
    }

    res.json({
      success: true,
      message: 'অর্ডার হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে।'
    });
  } catch (err: any) {
    console.error('Error soft deleting user order history:', err);
    res.status(500).json({ success: false, message: err.message || 'অর্ডার হিস্ট্রি মুছতে সমস্যা হয়েছে।' });
  }
});

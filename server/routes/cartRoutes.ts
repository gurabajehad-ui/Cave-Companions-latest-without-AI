import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, optionalAuth, AuthRequest } from '../auth.js';

export const cartRoutes = Router();

/**
 * GET /api/cart
 * Returns the current authenticated user's cart summary with calculated prices & tokens.
 * For guests / unauthenticated users, returns an empty cart gracefully without throwing 401.
 */
cartRoutes.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({
        success: true,
        cart: {
          items: [],
          totalQuantity: 0,
          productOriginalTotal: 0,
          tokenDiscountTotal: 0,
          tokenDonationTotal: 0,
          productPayableTotal: 0,
          deliveryCharge: 0,
          totalCodAmount: 0
        }
      });
      return;
    }
    console.log(`[Cart API] GET /api/cart for userId: ${userId}`);
    const summary = await db.getCartSummary(userId);
    console.log(`[Cart API] Retrieved cart with ${summary.items.length} items, totalPayable: ${summary.productPayableTotal}`);
    res.json({
      success: true,
      cart: summary
    });
  } catch (err: any) {
    console.error('Error fetching cart:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'কার্টের তথ্য লোড করতে সমস্যা হয়েছে।'
    });
  }
});

// Remaining mutation routes require user authentication
cartRoutes.use(requireAuth);

/**
 * POST /api/cart/add
 * Add a product to user's cart with optional token reservation.
 * Body: { productId: string, quantity?: number, tokenId?: string }
 */
cartRoutes.post('/add', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, quantity = 1, tokenId } = req.body;
    console.log(`[Cart API] POST /api/cart/add for userId: ${userId}, productId: ${productId}, quantity: ${quantity}, tokenId: ${tokenId}`);

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'পণ্যের আইডি প্রদান করুন।'
      });
      return;
    }

    await db.addToCart(userId, productId, Math.max(1, Number(quantity) || 1), tokenId);
    const summary = await db.getCartSummary(userId);
    console.log(`[Cart API] Added item. Updated cart items count: ${summary.items.length}`);

    res.json({
      success: true,
      message: 'পণ্যটি কার্টে সফলভাবে যুক্ত হয়েছে।',
      cart: summary
    });
  } catch (err: any) {
    console.error('Error adding to cart:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'কার্টে পণ্য যোগ করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * PATCH /api/cart/items/:itemId
 * Update quantity for a cart line item.
 * Body: { quantity: number }
 */
cartRoutes.patch('/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    await db.updateCartItemQuantity(userId, itemId, Number(quantity) || 1);
    const summary = await db.getCartSummary(userId);

    res.json({
      success: true,
      cart: summary
    });
  } catch (err: any) {
    console.error('Error updating cart item:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'কার্ট আপডেট করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * PATCH /api/cart/items/:itemId/weight
 * Update weight for a cart line item.
 * Body: { weightKg: number }
 */
cartRoutes.patch('/items/:itemId/weight', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { weightKg } = req.body;

    await db.updateCartItemWeight(userId, itemId, Number(weightKg) || 1.0);
    const summary = await db.getCartSummary(userId);

    res.json({
      success: true,
      cart: summary
    });
  } catch (err: any) {
    console.error('Error updating cart item weight:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'পণ্যের ওজন আপডেট করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove a specific item from cart.
 */
cartRoutes.delete('/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    await db.removeCartItem(userId, itemId);
    const summary = await db.getCartSummary(userId);

    res.json({
      success: true,
      message: 'পণ্যটি কার্ট থেকে মুছে ফেলা হয়েছে।',
      cart: summary
    });
  } catch (err: any) {
    console.error('Error removing cart item:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'কার্ট থেকে পণ্য মুছতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * DELETE /api/cart/clear
 * Clear all items from cart.
 */
cartRoutes.delete('/clear', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.clearCart(userId);
    const summary = await db.getCartSummary(userId);

    res.json({
      success: true,
      message: 'কার্ট খালি করা হয়েছে।',
      cart: summary
    });
  } catch (err: any) {
    console.error('Error clearing cart:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'কার্ট খালি করতে সমস্যা হয়েছে।'
    });
  }
});

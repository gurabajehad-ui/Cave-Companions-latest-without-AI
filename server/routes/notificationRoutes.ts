import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const notificationRoutes = Router();

/**
 * GET /api/notifications
 * Get notifications for the authenticated user with unread badge count.
 */
notificationRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const notifications = await db.getUserNotifications(userId, limit, unreadOnly);
    const unreadCount = await db.getUnreadNotificationCount(userId);

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'বিজ্ঞপ্তি লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
notificationRoutes.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Notification ID required' });
    }

    const updated = await db.markNotificationAsRead(userId, notificationId);
    const unreadCount = await db.getUnreadNotificationCount(userId);

    if (updated) {
      res.json({ success: true, message: 'চিহ্নিত করা হয়েছে', unreadCount });
    } else {
      res.status(404).json({ success: false, message: 'বিজ্ঞপ্তিটি পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user.
 */
notificationRoutes.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const count = await db.markAllNotificationsAsRead(userId);
    res.json({
      success: true,
      message: 'সকল বিজ্ঞপ্তি পড়া হয়েছে হিসেবে চিহ্নিত করা হয়েছে।',
      markedCount: count,
      unreadCount: 0
    });
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a single notification.
 */
notificationRoutes.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Notification ID required' });
    }

    const deleted = await db.deleteNotification(userId, notificationId);
    const unreadCount = await db.getUnreadNotificationCount(userId);

    if (deleted) {
      res.json({ success: true, message: 'বিজ্ঞপ্তিটি ডিলিট করা হয়েছে।', unreadCount });
    } else {
      res.status(404).json({ success: false, message: 'বিজ্ঞপ্তিটি পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications for the authenticated user.
 */
notificationRoutes.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const count = await db.deleteAllNotifications(userId);
    res.json({
      success: true,
      message: 'সকল বিজ্ঞপ্তি ডিলিট করা হয়েছে।',
      deletedCount: count,
      unreadCount: 0
    });
  } catch (err: any) {
    console.error('Error deleting all notifications:', err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';

export const adRoutes = Router();

adRoutes.get('/', async (req, res) => {
  try {
    const { page, slot } = req.query;
    if (!page) {
      return res.status(400).json({ success: false, error: 'Page name is required' });
    }
    
    // Fetch active ads for this page (and optionally slot)
    const ads = await db.getActiveAdsForPage(String(page), slot ? String(slot) : undefined);
    res.json({ success: true, data: ads });
  } catch (error: any) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ads' });
  }
});

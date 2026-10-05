import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const supportRoutes = Router();

export const CAVE_FAQS = [
  {
    id: 'faq-1',
    questionBn: 'কীভাবে জামাতে সালাত ভেরিফাই করব?',
    questionEn: 'How do I verify a congregational prayer?',
    answerBn: 'সালাতের ওয়াক্তের সময় নির্ধারিত মসজিদে উপস্থিত হয়ে অ্যাপে "উপস্থিতি ভেরিফাই করুন" বাটনে ট্যাপ করুন। পুরুষের জন্য সালাতের ওয়াক্ত ও মসজিদের জিপিএস লোকেশন এবং মহিলাদের জন্য সালাতের ওয়াক্তের ভিত্তিতে স্বয়ংক্রিয়ভাবে জামাত উপস্থিতি ভেরিফাই হয়ে যাবে।'
  },
  {
    id: 'faq-2',
    questionBn: 'টোকেন কীভাবে অর্জন করা যায়?',
    questionEn: 'How do I earn tokens?',
    answerBn: 'একই ক্যালেন্ডার দিনে (বাংলাদেশ সময় অনুযায়ী) ৩ বা ততোধিক ওয়াক্ত জামাতে সালাত ভেরিফাই করলে দিনশেষে স্বয়ংক্রিয়ভাবে টোকেন অর্জিত হয়।'
  },
  {
    id: 'faq-3',
    questionBn: 'গোল্ড, সিলভার এবং ব্রোঞ্জ টোকেনের পার্থক্য কী?',
    questionEn: 'What are Gold/Silver/Bronze tokens?',
    answerBn: 'এক দিনে ৫ ওয়াক্ত জামাত = গোল্ড টোকেন (সর্বোচ্চ ছাড়), ৪ ওয়াক্ত জামাত = সিলভার টোকেন (মাঝারি ছাড়), ৩ ওয়াক্ত জামাত = ব্রোঞ্জ টোকেন (মানসম্মত ছাড়)। ০–২ ওয়াক্তে কোনো টোকেন দেওয়া হয় না।'
  },
  {
    id: 'faq-4',
    questionBn: 'টোকেন কীভাবে ব্যবহার বা রিডিম করব?',
    questionEn: 'How do I use / redeem a token?',
    answerBn: 'যেকোনো পার্টনার দোকানে কেনাকাটা করার সময় দোকানদারের কাউন্টারে থাকা পার্টনার শপ QR কোড স্ক্যান করুন এবং আপনার বিলের পরিমাণ লিখুন। টোকেন অনুযায়ী তাৎক্ষণিক ছাড় পাবেন।'
  },
  {
    id: 'faq-5',
    questionBn: 'একদিনে একাধিক টোকেন ব্যবহার করা যায় কি?',
    questionEn: 'Can I redeem multiple tokens in one day?',
    answerBn: 'হ্যাঁ! টোকেন ব্যবহারের কোনো দৈনিক সীমা নেই। আপনার ওয়ালেটে থাকা সকল ব্যবহারযোগ্য (AVAILABLE) টোকেন আপনি একই দিনে রিডিম করতে পারবেন। তবে প্রতিটি টোকেন শুধুমাত্র ১ বারই ব্যবহার করা যাবে।'
  },
  {
    id: 'faq-6',
    questionBn: 'পার্টনার শপ কীভাবে খুঁজে পাব?',
    questionEn: 'How do I find partner shops?',
    answerBn: 'অ্যাপের "Shops" ট্যাবে গিয়ে ক্যাটাগরি, এলাকা বা নাম দিয়ে সার্চ করতে পারেন। আপনার নিকটবর্তী দোকানগুলো দূরত্বের ক্রমানুসারে দেখতে পারবেন।'
  },
  {
    id: 'faq-7',
    questionBn: 'দোকানের ডিসকাউন্ট QR স্ক্যান কাজ না করলে কী করণীয়?',
    questionEn: 'What happens if partner shop QR scanning fails?',
    answerBn: 'ক্যামেরা লেন্স পরিষ্কার করুন এবং পর্যাপ্ত আলো নিশ্চিত করুন। ডিভাইসের ক্যামেরা পারমিশন দেওয়া আছে কিনা চেক করুন। সমস্যা অব্যাহত থাকলে আমাদের সাপোর্টে মেসেজ পাঠান।'
  },
  {
    id: 'faq-8',
    questionBn: 'সাপোর্টে কীভাবে যোগাযোগ করব?',
    questionEn: 'How do I contact support?',
    answerBn: 'এই সাপোর্ট পেজের "Contact Support" অপশন থেকে আপনার সমস্যার বিবরণ দিয়ে একটি সাপোর্ট টিকিট ওপেন করুন। আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে।'
  }
];

/**
 * GET /api/support/faqs
 * Public FAQs
 */
supportRoutes.get('/faqs', (req, res) => {
  res.json({
    success: true,
    faqs: CAVE_FAQS
  });
});

/**
 * POST /api/support/tickets
 * Create a new support ticket (requires auth).
 */
supportRoutes.post('/tickets', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject, message } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'বিষয়বস্তু (Subject) কমপক্ষে ৩ অক্ষরের হতে হবে।'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'বার্তার বিবরণ (Message) কমপক্ষে ১০ অক্ষরের হতে হবে।'
      });
    }

    // Sanitize input
    const cleanSubject = subject.trim().slice(0, 150);
    const cleanMessage = message.trim().slice(0, 2000);

    const ticket = await db.createSupportTicket(userId, cleanSubject, cleanMessage);

    res.json({
      success: true,
      ticket,
      message: 'আপনার সাপোর্ট টিকিট সফলভাবে জমা হয়েছে। টিকিট আইডি: ' + ticket.id
    });
  } catch (err: any) {
    console.error('Error creating support ticket:', err);
    res.status(500).json({ success: false, message: 'সাপোর্ট টিকিট সাবমিট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/support/tickets
 * Get tickets for the authenticated user.
 */
supportRoutes.get('/tickets', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const tickets = await db.getUserSupportTickets(userId);
    res.json({
      success: true,
      tickets
    });
  } catch (err: any) {
    console.error('Error fetching support tickets:', err);
    res.status(500).json({ success: false, message: 'টিকেট লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/support/nasiha
 * Public endpoint to fetch active published Nasiha list for users from PostgreSQL.
 */
supportRoutes.get('/nasiha', async (req, res) => {
  try {
    const list = await db.getActiveNasihaList();
    res.json({ success: true, list });
  } catch (err: any) {
    console.error('Fetch active nasiha error:', err);
    res.status(500).json({ success: false, message: 'নসিহা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/support/blogs
 * Public endpoint to fetch active published Blogs / CAVE Media posts for all users from PostgreSQL.
 */
supportRoutes.get('/blogs', async (req, res) => {
  try {
    const blogs = await db.getActiveBlogList();
    res.json({ success: true, blogs });
  } catch (err: any) {
    console.error('Fetch active blogs error:', err);
    res.status(500).json({ success: false, message: 'ব্লগ ও কন্টেন্ট লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/support/helpline
 * Public endpoint to fetch active Helpline configuration for the User App
 */
supportRoutes.get('/helpline', async (req, res) => {
  try {
    const settings = await db.getHelplineSettings();
    res.json({
      success: true,
      isActive: settings.isActive,
      primaryPhone: settings.primaryPhone,
      secondaryPhone: settings.secondaryPhone || '',
      whatsappNumber: settings.whatsappNumber || '',
      supportEmail: settings.supportEmail || '',
      supportMessage: settings.supportMessage || 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
      isWhatsappEnabled: Boolean(settings.isWhatsappEnabled)
    });
  } catch (err: any) {
    console.error('Fetch helpline settings error:', err);
    res.status(500).json({
      success: false,
      isActive: true,
      primaryPhone: '+880 1700-000000',
      secondaryPhone: '',
      whatsappNumber: '',
      supportEmail: 'support@cavecompanions.org',
      supportMessage: 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
      isWhatsappEnabled: false
    });
  }
});


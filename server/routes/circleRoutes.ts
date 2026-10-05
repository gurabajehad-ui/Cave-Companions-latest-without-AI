import express from 'express';
import { requireAuth } from '../auth.js';
import { db, normalizePhoneNumber } from '../db.js';
import { query, useSqliteFallback } from '../pg.js';
import { circleTextMessageRateLimiter } from '../rateLimiter.js';
import { moderationPipeline } from '../moderation/ModerationPipeline.js';
import crypto from 'crypto';

export const circleRoutes = express.Router();

// ==========================================
// STATIC & GLOBAL CIRCLE ROUTES (MUST BE DEFINED BEFORE /:id)
// ==========================================

// Check current user's active circle restrictions / cooldowns
circleRoutes.get('/my-restrictions', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const restriction = await moderationPipeline.checkUserActiveRestriction(userId);
        res.json({
            success: true,
            isRestricted: Boolean(restriction),
            restriction: restriction || null
        });
    } catch (error) {
        console.error('Error fetching user restrictions:', error);
        res.status(500).json({ success: false, message: 'সীমাবদ্ধতা তথ্য লোড করা যায়নি' });
    }
});

// 1. Get user's circles
circleRoutes.get('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        // Fetch circles where the user is a member
        const result = await query(`
            SELECT c.*, cm.role, cm.joined_at, cm.status,
            (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND status = 'ACTIVE') as member_count
            FROM circles c
            JOIN circle_members cm ON c.id = cm.circle_id
            WHERE cm.user_id = $1 AND cm.status = 'ACTIVE'
            ORDER BY c.created_at DESC
        `, [userId]);

        res.json({ success: true, circles: result.rows });
    } catch (error) {
        console.error('Error fetching circles:', error);
        res.status(500).json({ success: false, message: 'সার্কেল তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।' });
    }
});

// 2. Create a circle
circleRoutes.post('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'সার্কেলের নাম আবশ্যক' });
        }

        const categoryVal = req.body.category || 'Islamic';
        const streakVal = req.body.jamaatStreak !== undefined ? Number(req.body.jamaatStreak) : 7;

        // Transaction
        const circleId = crypto.randomUUID();
        const memberId = crypto.randomUUID();
        
        await query('BEGIN');
        
        await query(`
            INSERT INTO circles (id, name, description, admin_id, category, jamaat_streak)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [circleId, name, description, userId, categoryVal, streakVal]);

        await query(`
            INSERT INTO circle_members (id, circle_id, user_id, role, status)
            VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
        `, [memberId, circleId, userId]);

        await query('COMMIT');

        res.json({ success: true, circleId, message: 'সার্কেল তৈরি করা হয়েছে' });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Error creating circle:', error);
        res.status(500).json({ success: false, message: 'সার্কেল তৈরি করা যায়নি। আবার চেষ্টা করুন।' });
    }
});

// 3. Search User by Phone Number for Direct Circle Invitation
circleRoutes.get('/search-user', requireAuth, async (req, res) => {
    try {
        const { phone, circleId } = req.query;
        const currentUserId = (req as any).user.id;

        if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'সঠিক ফোন নম্বর প্রদান করুন' });
        }

        const rawPhone = phone.trim();
        const foundUserRecord = await db.getUserByPhone(rawPhone);

        if (!foundUserRecord) {
            return res.status(404).json({ success: false, message: 'এই ফোন নম্বরে কোনো নিবন্ধিত ইউজার পাওয়া যায়নি' });
        }

        const foundUser = {
            id: foundUserRecord.id,
            full_name: foundUserRecord.fullName,
            phone: foundUserRecord.phone,
            gender: foundUserRecord.gender,
            photo_url: foundUserRecord.photoUrl || null
        };

        if (foundUser.id === currentUserId) {
            return res.status(400).json({ success: false, message: 'আপনি নিজেকে আমন্ত্রণ পাঠাতে পারবেন না' });
        }

        // Check if already in circle
        let isAlreadyMember = false;
        let isInvitePending = false;

        if (circleId && typeof circleId === 'string' && circleId !== 'undefined') {
            const memberCheck = await query(`
                SELECT id FROM circle_members 
                WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
            `, [circleId, foundUser.id]);
            if (memberCheck.rows.length > 0) {
                isAlreadyMember = true;
            }

            const inviteCheck = await query(`
                SELECT id FROM circle_direct_invitations 
                WHERE circle_id = $1 AND invitee_id = $2 AND status = 'PENDING'
            `, [circleId, foundUser.id]);
            if (inviteCheck.rows.length > 0) {
                isInvitePending = true;
            }
        }

        res.json({
            success: true,
            user: {
                id: foundUser.id,
                fullName: foundUser.full_name,
                phone: foundUser.phone,
                gender: foundUser.gender,
                photoUrl: foundUser.photo_url,
                isAlreadyMember,
                isInvitePending
            }
        });
    } catch (error) {
        console.error('Error searching user by phone:', error);
        res.status(500).json({ success: false, message: 'ইউজার খোঁজা সম্ভব হয়নি' });
    }
});

// 4. GET Pending Circle Invitations for Logged-In User
circleRoutes.get('/pending-invitations', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const invitesRes = await query(`
            SELECT 
                ci.id,
                ci.circle_id,
                ci.inviter_id,
                ci.status,
                ci.created_at,
                c.name as circle_name,
                c.description as circle_description,
                u.full_name as inviter_name,
                u.photo_url as inviter_photo_url,
                (SELECT COUNT(*) FROM circle_members WHERE circle_id = ci.circle_id AND status = 'ACTIVE') as member_count
            FROM circle_direct_invitations ci
            JOIN circles c ON ci.circle_id = c.id
            JOIN users u ON ci.inviter_id = u.id
            WHERE ci.invitee_id = $1 AND ci.status = 'PENDING'
            ORDER BY ci.created_at DESC
        `, [userId]);

        res.json({ 
            success: true, 
            invitations: invitesRes.rows 
        });
    } catch (error) {
        console.error('Error fetching pending circle invitations:', error);
        res.status(500).json({ success: false, message: 'পেন্ডিং আমন্ত্রণ লোড করা যায়নি' });
    }
});

// Helper: Ensure circle_battles table exists
let battlesTableChecked = false;
async function ensureBattlesTable() {
    if (battlesTableChecked) return;
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS circle_battles (
                id VARCHAR(255) PRIMARY KEY,
                challenger_circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
                challenged_circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
                challenger_admin_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                battle_type VARCHAR(100) NOT NULL DEFAULT 'ALL_ROUND',
                duration_days INTEGER NOT NULL DEFAULT 3,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                start_time TIMESTAMP WITH TIME ZONE,
                end_time TIMESTAMP WITH TIME ZONE,
                challenger_points NUMERIC DEFAULT 0,
                challenged_points NUMERIC DEFAULT 0,
                challenger_salah_points NUMERIC DEFAULT 0,
                challenged_salah_points NUMERIC DEFAULT 0,
                challenger_quran_points NUMERIC DEFAULT 0,
                challenged_quran_points NUMERIC DEFAULT 0,
                challenger_dhikr_points NUMERIC DEFAULT 0,
                challenged_dhikr_points NUMERIC DEFAULT 0,
                winner_circle_id VARCHAR(255),
                rules_note TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_circle_battles_challenger ON circle_battles(challenger_circle_id);
            CREATE INDEX IF NOT EXISTS idx_circle_battles_challenged ON circle_battles(challenged_circle_id);
            CREATE INDEX IF NOT EXISTS idx_circle_battles_status ON circle_battles(status);
        `);
        battlesTableChecked = true;
    } catch (e) {
        console.warn('Could not auto-create circle_battles table:', e);
    }
}

// 4b. GET All Public Circles (For lobby filters and search)
circleRoutes.get('/all-public', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const result = await query(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND status = 'ACTIVE') as member_count,
            (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND user_id = $1 AND status = 'ACTIVE') > 0 as is_joined
            FROM circles c
            ORDER BY c.created_at DESC
        `, [userId]);
        res.json({ success: true, circles: result.rows });
    } catch (error) {
        console.error('Error fetching all public circles:', error);
        res.status(500).json({ success: false, message: 'সার্কেল তথ্য লোড করা যায়নি' });
    }
});

// 4c. Search ANY Circle (Global Search for Competitions & Challenges)
circleRoutes.get('/search-all', requireAuth, async (req, res) => {
    try {
        await ensureBattlesTable();
        const userId = (req as any).user.id;
        const q = String(req.query.q || '').trim().toLowerCase();
        
        let querySql = `
            SELECT c.*,
                   u.full_name as admin_name,
                   u.photo_url as admin_photo_url,
                   (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND status = 'ACTIVE') as member_count,
                   (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND user_id = $1 AND status = 'ACTIVE') > 0 as is_joined,
                   (SELECT COUNT(*) FROM circle_battles cb 
                    WHERE (cb.challenger_circle_id = c.id OR cb.challenged_circle_id = c.id) 
                      AND cb.status = 'ACTIVE') as active_battles_count
            FROM circles c
            LEFT JOIN users u ON c.admin_id = u.id
        `;
        const params: any[] = [userId];

        if (q) {
            querySql += ` WHERE LOWER(c.name) LIKE $2 OR LOWER(c.description) LIKE $2 OR LOWER(c.category) LIKE $2`;
            params.push(`%${q}%`);
        }

        querySql += ` ORDER BY c.created_at DESC LIMIT 30`;

        const result = await query(querySql, params);

        // Also fetch the user's active/created circles so frontend knows which circle to challenge from
        const myCirclesRes = await query(`
            SELECT c.id, c.name, c.category, cm.role
            FROM circles c
            JOIN circle_members cm ON c.id = cm.circle_id
            WHERE cm.user_id = $1 AND cm.status = 'ACTIVE'
            ORDER BY c.name ASC
        `, [userId]);

        res.json({ 
            success: true, 
            circles: result.rows,
            myCircles: myCirclesRes.rows 
        });
    } catch (error) {
        console.error('Error searching circles:', error);
        res.status(500).json({ success: false, message: 'সার্কেল সার্চ করা যায়নি' });
    }
});

// 5. Respond to Circle Invitation (ACCEPT / REJECT)
circleRoutes.post('/invitations/:id/respond', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const inviteId = req.params.id;
        const { action } = req.body; // 'ACCEPT' | 'REJECT'

        if (!['ACCEPT', 'REJECT'].includes(action)) {
            return res.status(400).json({ success: false, message: 'অবৈধ একশন' });
        }

        // Verify invite
        const inviteCheck = await query(`
            SELECT ci.*, c.name as circle_name, u.full_name as current_user_name
            FROM circle_direct_invitations ci
            JOIN circles c ON ci.circle_id = c.id
            JOIN users u ON u.id = $2
            WHERE ci.id = $1 AND ci.invitee_id = $2 AND ci.status = 'PENDING'
        `, [inviteId, userId]);

        if (inviteCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'আমন্ত্রণ পাওয়া যায়নি বা ইতোমধ্যে উত্তর দেওয়া হয়েছে' });
        }

        const invite = inviteCheck.rows[0];

        if (action === 'ACCEPT') {
            await query('BEGIN');

            // 1. Update invite status
            await query(`
                UPDATE circle_direct_invitations 
                SET status = 'ACCEPTED', updated_at = NOW() 
                WHERE id = $1
            `, [inviteId]);

            // 2. Add or activate member in circle_members
            const memberId = crypto.randomUUID();
            await query(`
                INSERT INTO circle_members (id, circle_id, user_id, role, status, joined_at)
                VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE', NOW())
                ON CONFLICT (circle_id, user_id) 
                DO UPDATE SET status = 'ACTIVE', role = 'MEMBER', joined_at = NOW()
            `, [memberId, invite.circle_id, userId]);

            // 3. Post a welcome message in circle chat
            const msgId = crypto.randomUUID();
            await query(`
                INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
                VALUES ($1, $2, $3, $4, 'NUDGE', $5)
            `, [
                msgId, 
                invite.circle_id, 
                userId, 
                invite.current_user_name || 'সাথী', 
                `মাশাআল্লাহ! ${invite.current_user_name} সার্কেলে যুক্ত হয়েছেন। সবাইকে আন্তরিক স্বাগতম! 🌸✨`
            ]);

            // 4. Notify inviter
            const notifId = crypto.randomUUID();
            await query(`
                INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
                VALUES ($1, $2, 'CIRCLE_MESSAGE', $3, $3, $4, $4, FALSE, $5, NOW())
            `, [
                notifId,
                invite.inviter_id,
                `🎉 ${invite.circle_name} • আমন্ত্রণ গৃহীত`,
                `মাশাআল্লাহ! ${invite.current_user_name} আপনার "${invite.circle_name}" সার্কেলে যোগদানের আমন্ত্রণ গ্রহণ করেছেন।`,
                JSON.stringify({ circleId: invite.circle_id, url: '/cave_circle' })
            ]);

            await query('COMMIT');

            return res.json({ 
                success: true, 
                circleId: invite.circle_id,
                message: `আলহামদুলিল্লাহ! আপনি "${invite.circle_name}" সার্কেলে সফলভাবে যুক্ত হয়েছেন।` 
            });
        } else {
            // REJECT
            await query(`
                UPDATE circle_direct_invitations 
                SET status = 'REJECTED', updated_at = NOW() 
                WHERE id = $1
            `, [inviteId]);

            // Sync notification status to read
            await query(`
                UPDATE notifications 
                SET read = TRUE, 
                    message = 'সার্কেল আমন্ত্রণটি প্রত্যাখ্যান করা হয়েছে।',
                    message_bn = 'সার্কেল আমন্ত্রণটি প্রত্যাখ্যান করা হয়েছে।'
                WHERE user_id = $1 
                  AND type = 'CIRCLE_INVITE' 
                  AND (metadata::text LIKE $2)
            `, [userId, `%"invitationId":"${inviteId}"%`]).catch(() => {});

            return res.json({ 
                success: true, 
                message: 'সার্কেল আমন্ত্রণ বাতিল করা হয়েছে' 
            });
        }
    } catch (error) {
        await query('ROLLBACK').catch(() => {});
        console.error('Error responding to circle invitation:', error);
        res.status(500).json({ success: false, message: 'আমন্ত্রণের উত্তর সংরক্ষণ করা যায়নি' });
    }
});

// 5.1 Delete / Dismiss Circle Invitation
circleRoutes.delete('/invitations/:id', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const inviteId = req.params.id;

        await query(`
            UPDATE circle_direct_invitations 
            SET status = 'CANCELLED', updated_at = NOW() 
            WHERE id = $1 AND (invitee_id = $2 OR inviter_id = $2)
        `, [inviteId, userId]);

        // Delete associated notification if exists
        await query(`
            DELETE FROM notifications 
            WHERE user_id = $1 
              AND type = 'CIRCLE_INVITE' 
              AND (metadata::text LIKE $2)
        `, [userId, `%"invitationId":"${inviteId}"%`]).catch(() => {});

        res.json({ success: true, message: 'সার্কেল আমন্ত্রণটি মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error('Error deleting circle invitation:', error);
        res.status(500).json({ success: false, message: 'আমন্ত্রণ মুছে ফেলা যায়নি' });
    }
});

// 6. Join Circle via Shareable Invite Code
circleRoutes.post('/join', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ success: false, message: 'ইনভাইট কোড আবশ্যক' });
        }

        const inviteRes = await query(`
            SELECT * FROM circle_invites 
            WHERE invite_code = $1 AND revoked_at IS NULL
        `, [inviteCode]);

        if (inviteRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ইনভাইট কোড সঠিক নয় বা মেয়াদোত্তীর্ণ' });
        }

        const invite = inviteRes.rows[0];

        // Check if user is already a member
        const existingMember = await query(`
            SELECT * FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2
        `, [invite.circle_id, userId]);

        if (existingMember.rows.length > 0) {
            if (existingMember.rows[0].status === 'ACTIVE') {
                return res.status(400).json({ success: false, message: 'আপনি ইতোমধ্যে এই সার্কেলের সদস্য' });
            } else {
                // Reactivate membership
                await query(`
                    UPDATE circle_members 
                    SET status = 'ACTIVE', joined_at = CURRENT_TIMESTAMP 
                    WHERE circle_id = $1 AND user_id = $2
                `, [invite.circle_id, userId]);
            }
        } else {
            // Add member
            const memberId = crypto.randomUUID();
            await query(`
                INSERT INTO circle_members (id, circle_id, user_id, role, status)
                VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE')
            `, [memberId, invite.circle_id, userId]);
        }

        // Post join message in circle chat
        const userRes = await query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        const userName = userRes.rows[0]?.full_name || 'নতুন সাথী';
        const msgId = crypto.randomUUID();
        await query(`
            INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
            VALUES ($1, $2, $3, $4, 'NUDGE', $5)
        `, [msgId, invite.circle_id, userId, userName, `মাশাআল্লাহ! ${userName} সার্কেলে যুক্ত হয়েছেন। সবাইকে স্বাগতম! 🌸✨`]);

        res.json({ success: true, circleId: invite.circle_id, message: 'সার্কেলে সফলভাবে যুক্ত হয়েছেন' });
    } catch (error) {
        console.error('Error joining circle:', error);
        res.status(500).json({ success: false, message: 'সার্কেলে যুক্ত হওয়া যায়নি' });
    }
});

// Check for Active Incoming Call (Polled globally across the app)
circleRoutes.get('/active-call', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // Check for direct calls or group calls in user's circles within last 30 minutes
        const callRes = await query(`
            SELECT cac.*, c.name as circle_name, u.full_name as caller_name, u.photo_url as caller_photo_url
            FROM circle_active_calls cac
            JOIN circles c ON cac.circle_id = c.id
            JOIN users u ON cac.caller_user_id = u.id
            WHERE cac.status IN ('RINGING', 'CONNECTED')
              AND cac.caller_user_id != $1
              AND cac.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 minutes')
              AND (
                  cac.target_user_id = $1
                  OR (
                      cac.target_user_id IS NULL 
                      AND cac.circle_id IN (
                          SELECT circle_id FROM circle_members WHERE user_id = $1 AND status = 'ACTIVE'
                      )
                  )
              )
            ORDER BY cac.created_at DESC
            LIMIT 1
        `, [userId]);

        if (callRes.rows.length === 0) {
            return res.json({ success: true, activeCall: null });
        }

        res.json({ success: true, activeCall: callRes.rows[0] });
    } catch (error) {
        console.error('Error checking active call:', error);
        res.status(500).json({ success: false, message: 'কল তথ্য লোড করা যায়নি' });
    }
});

// ==========================================
// PARAMETERIZED CIRCLE ROUTES (/:id)
// ==========================================

// Get circle details
circleRoutes.get('/:id', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const circleRes = await query(`SELECT * FROM circles WHERE id = $1`, [circleId]);
        if (circleRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'সার্কেল পাওয়া যায়নি' });
        }

        const membersRes = await query(`
            SELECT cm.user_id, cm.role, u.full_name, u.gender, u.photo_url, u.last_login_at 
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE'
        `, [circleId]);

        // Get aggregate Salah data for today for all members
        const todayStr = new Date().toISOString().split('T')[0];
        const attendancesRes = await query(`
            SELECT pa.prayer_type, COUNT(DISTINCT pa.user_id) as count
            FROM prayer_attendances pa
            JOIN circle_members cm ON pa.user_id = cm.user_id
            WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE' 
              AND pa.date = $2
            GROUP BY pa.prayer_type
        `, [circleId, todayStr]);

        const aggregateProgress: Record<string, number> = {
            fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
        };

        attendancesRes.rows.forEach(r => {
            aggregateProgress[r.prayer_type] = parseInt(r.count, 10);
        });

        res.json({ 
            success: true, 
            circle: circleRes.rows[0],
            members: membersRes.rows,
            aggregateProgress
        });
    } catch (error) {
        console.error('Error fetching circle details:', error);
        res.status(500).json({ success: false, message: 'সার্কেল তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।' });
    }
});

// Create Shareable Invite Code for Circle
circleRoutes.post('/:id/invites', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const inviteId = crypto.randomUUID();
        const inviteCode = crypto.randomUUID().substring(0, 8).toUpperCase();
        
        await query(`
            INSERT INTO circle_invites (id, circle_id, invite_code, created_by)
            VALUES ($1, $2, $3, $4)
        `, [inviteId, circleId, inviteCode, userId]);

        res.json({ success: true, inviteCode });
    } catch (error) {
        console.error('Error creating invite:', error);
        res.status(500).json({ success: false, message: 'ইনভাইট তৈরি করা যায়নি' });
    }
});

// Send Direct Circle Invitation to a User via Phone or Target User ID
circleRoutes.post('/:id/invite-user', requireAuth, async (req, res) => {
    try {
        const inviterId = (req as any).user.id;
        const circleId = req.params.id;
        const { targetUserId, phone } = req.body;

        // Verify inviter is an active member of this circle
        const inviterCheck = await query(`
            SELECT cm.role, u.full_name as inviter_name, c.name as circle_name
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            JOIN circles c ON cm.circle_id = c.id
            WHERE cm.circle_id = $1 AND cm.user_id = $2 AND cm.status = 'ACTIVE'
        `, [circleId, inviterId]);

        if (inviterCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'আপনি এই সার্কেলের সদস্য নন' });
        }

        const { inviter_name, circle_name } = inviterCheck.rows[0];

        // Find target user
        let targetUser: any = null;
        if (targetUserId) {
            const userRes = await query(`SELECT id, full_name, phone FROM users WHERE id = $1`, [targetUserId]);
            targetUser = userRes.rows[0];
        } else if (phone) {
            const rawPhone = phone.trim();
            const foundRecord = await db.getUserByPhone(rawPhone);
            if (foundRecord) {
                targetUser = {
                    id: foundRecord.id,
                    full_name: foundRecord.fullName,
                    phone: foundRecord.phone
                };
            }
        }

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'আমন্ত্রিত সাথীকে পাওয়া যায়নি' });
        }

        if (targetUser.id === inviterId) {
            return res.status(400).json({ success: false, message: 'নিজেকে আমন্ত্রণ পাঠানো যাবে না' });
        }

        // Check if already active member
        const memberCheck = await query(`
            SELECT id FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, targetUser.id]);

        if (memberCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: `${targetUser.full_name} ইতোমধ্যে এই সার্কেলের সদস্য!` });
        }

        // Check or revoke existing pending invitation
        await query(`
            DELETE FROM circle_direct_invitations 
            WHERE circle_id = $1 AND invitee_id = $2 AND status = 'PENDING'
        `, [circleId, targetUser.id]);

        // Insert new direct invitation
        const inviteId = crypto.randomUUID();
        await query(`
            INSERT INTO circle_direct_invitations (id, circle_id, inviter_id, invitee_id, invitee_phone, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())
        `, [inviteId, circleId, inviterId, targetUser.id, targetUser.phone]);

        // Dispatch persistent notification to invitee
        const notifId = crypto.randomUUID();
        await query(`
            INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
            VALUES ($1, $2, 'CIRCLE_INVITE', $3, $3, $4, $4, FALSE, $5, NOW())
        `, [
            notifId,
            targetUser.id,
            `🏕️ ${circle_name} • নতুন সার্কেল আমন্ত্রণ`,
            `${inviter_name} আপনাকে "${circle_name}" সার্কেলে যোগদানের আমন্ত্রণ পাঠিয়েছেন।`,
            JSON.stringify({ 
                invitationId: inviteId, 
                circleId, 
                circleName: circle_name, 
                inviterName: inviter_name, 
                type: 'circle_invite',
                url: '/cave_circle'
            })
        ]);

        res.json({ 
            success: true, 
            message: `মাশাআল্লাহ! ${targetUser.full_name}-কে সার্কেলে যোগদানের আমন্ত্রণ পাঠানো হয়েছে।` 
        });
    } catch (error) {
        console.error('Error sending direct circle invitation:', error);
        res.status(500).json({ success: false, message: 'আমন্ত্রণ পাঠানো সম্ভব হয়নি' });
    }
});

// Leave Circle
circleRoutes.post('/:id/leave', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const memberCheck = await query(`SELECT role FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'`, [circleId, userId]);
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const role = memberCheck.rows[0].role;

        // If admin, check if there are other members
        if (role === 'ADMIN') {
            const otherMembers = await query(`SELECT user_id FROM circle_members WHERE circle_id = $1 AND user_id != $2 AND status = 'ACTIVE'`, [circleId, userId]);
            if (otherMembers.rows.length > 0) {
                // Promote first other member to admin
                await query('BEGIN');
                await query(`UPDATE circle_members SET role = 'ADMIN' WHERE circle_id = $1 AND user_id = $2`, [circleId, otherMembers.rows[0].user_id]);
                await query(`UPDATE circle_members SET status = 'INACTIVE' WHERE circle_id = $1 AND user_id = $2`, [circleId, userId]);
                await query('COMMIT');
            } else {
                // Last member, delete circle
                await query(`DELETE FROM circles WHERE id = $1`, [circleId]);
            }
        } else {
            await query(`UPDATE circle_members SET status = 'INACTIVE' WHERE circle_id = $1 AND user_id = $2`, [circleId, userId]);
        }

        res.json({ success: true, message: 'সার্কেল ত্যাগ করা হয়েছে' });
    } catch (error) {
        await query('ROLLBACK').catch(() => {});
        console.error('Error leaving circle:', error);
        res.status(500).json({ success: false, message: 'সার্কেল ত্যাগ করা যায়নি' });
    }
});

// Delete Circle
circleRoutes.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND role = 'ADMIN' AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        await query(`DELETE FROM circles WHERE id = $1`, [circleId]);
        res.json({ success: true, message: 'সার্কেল মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error('Error deleting circle:', error);
        res.status(500).json({ success: false, message: 'সার্কেল মুছে ফেলা যায়নি' });
    }
});

// Post reminder / encouragement / nosiha
circleRoutes.post('/:id/notify', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;
        const { type, message } = req.body; 
        // type: 'REMINDER' | 'ENCOURAGEMENT' | 'NOSIHA'

        // verify membership
        const membershipCheck = await query(`SELECT role FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'`, [circleId, userId]);
        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const circleRes = await query(`SELECT name FROM circles WHERE id = $1`, [circleId]);
        const circleName = circleRes.rows[0]?.name || 'Cave Circle';

        // Get other members
        const members = await query(`SELECT user_id FROM circle_members WHERE circle_id = $1 AND user_id != $2 AND status = 'ACTIVE'`, [circleId, userId]);
        
        let titleBn = '';
        let messageBn = '';

        if (type === 'REMINDER') {
            titleBn = 'মসজিদের আহ্বান 🕌';
            messageBn = `আপনার Circle (${circleName}) থেকে একজন Companion আপনাকে মসজিদের সালাতের কথা মনে করিয়ে দিয়েছেন।`;
        } else if (type === 'ENCOURAGEMENT') {
            titleBn = 'Circle থেকে উৎসাহ 🤍';
            messageBn = message || `Circle (${circleName}) থেকে একজন Companion আপনাকে উৎসাহ পাঠিয়েছেন।`;
        } else if (type === 'NOSIHA') {
            titleBn = 'Circle থেকে নসিহা 🤍';
            messageBn = message || `Circle (${circleName}) থেকে একজন Companion নসিহা পাঠিয়েছেন।`;
        } else {
             return res.status(400).json({ success: false, message: 'Invalid type' });
        }

        // Send notifications using existing db.createNotification
        for (const m of members.rows) {
            await db.createNotification(m.user_id, 'SYSTEM_ANNOUNCEMENT' as any, titleBn, messageBn, circleId);
        }

        res.json({ success: true, message: 'বার্তা পাঠানো হয়েছে' });
    } catch (error) {
        console.error('Error sending circle notification:', error);
        res.status(500).json({ success: false, message: 'বার্তা পাঠানো যায়নি' });
    }
});

// GET Circle Messages
circleRoutes.get('/:id/messages', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        // Mark unread messages in this circle as seen by the current user
        try {
            if (useSqliteFallback) {
                // Fetch messages that might need unread update
                const unreadMsgs = await query(`
                    SELECT id, read_by FROM circle_messages 
                    WHERE circle_id = $1 AND user_id != $2
                `, [circleId, userId]);

                for (const msg of unreadMsgs.rows) {
                    let readByList: string[] = [];
                    if (msg.read_by) {
                        try {
                            readByList = typeof msg.read_by === 'string' ? JSON.parse(msg.read_by) : msg.read_by;
                            if (!Array.isArray(readByList)) {
                                readByList = [];
                            }
                        } catch {
                            readByList = [];
                        }
                    }
                    if (!readByList.includes(userId)) {
                        readByList.push(userId);
                        await query(`
                            UPDATE circle_messages 
                            SET read_by = $1 
                            WHERE id = $2
                        `, [JSON.stringify(readByList), msg.id]);
                    }
                }
            } else {
                // PostgreSQL native jsonb operators
                await query(`
                    UPDATE circle_messages
                    SET read_by = CASE 
                        WHEN read_by IS NULL OR read_by = 'null'::jsonb THEN jsonb_build_array($2::text)
                        WHEN NOT (read_by @> jsonb_build_array($2::text)) THEN read_by || jsonb_build_array($2::text)
                        ELSE read_by
                    END
                    WHERE circle_id = $1 AND user_id != $2
                `, [circleId, userId]);
            }
        } catch (markErr) {
            console.warn('Failed to update read_by on circle messages:', markErr);
        }

        const messagesRes = await query(`
            SELECT cm.*, u.full_name, u.gender, u.photo_url 
            FROM circle_messages cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.circle_id = $1
            ORDER BY cm.created_at ASC
            LIMIT 150
        `, [circleId]);

        res.json({ success: true, messages: messagesRes.rows });
    } catch (error) {
        console.error('Error fetching circle messages:', error);
        res.status(500).json({ success: false, message: 'মেসেজ লোড করা যায়নি' });
    }
});

// POST Circle Message (Text, Nudge, Audio)
circleRoutes.post('/:id/messages', requireAuth, circleTextMessageRateLimiter, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;
        const { messageType = 'TEXT', content, audioUrl, audioDurationSec } = req.body;

        if (!content && !audioUrl) {
            return res.status(400).json({ success: false, message: 'মেসেজ বা অডিও দেওয়া আবশ্যক' });
        }

        // Verify membership
        const membershipCheck = await query(`
            SELECT cm.role, u.full_name, c.name as circle_name
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            JOIN circles c ON cm.circle_id = c.id
            WHERE cm.circle_id = $1 AND cm.user_id = $2 AND cm.status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const senderName = membershipCheck.rows[0].full_name || 'সাথী';
        const circleName = membershipCheck.rows[0].circle_name || 'Cave Circle';
        const msgId = crypto.randomUUID();

        // -------------------------------------------------------------
        // TEXT MESSAGE MODERATION PIPELINE (Phase 2)
        // -------------------------------------------------------------
        let textToSave = content || '';
        let moderationStatus = 'APPROVED';
        let moderationReason: string | null = null;
        let warningNotice: string | undefined = undefined;

        if (messageType === 'TEXT') {
            const modResult = await moderationPipeline.evaluateTextMessage(content, {
                userId,
                circleId,
                messageType: 'TEXT',
                senderName
            });

            // If Blocked or Active Restriction in place
            if (!modResult.isPermitted) {
                return res.status(403).json({
                    success: false,
                    error: 'MODERATION_BLOCKED',
                    message: modResult.userFacingMessage || 'আপনার বার্তাটি কেভ সার্কেলের শালীনতা ও কমিউনিটি নির্দেশিকার সাথে সংগতিপূর্ণ না হওয়ায় পোস্ট করা সম্ভব হয়নি।'
                });
            }

            // If requires Admin Review before display
            if (modResult.outcome.decision === 'REVIEW') {
                return res.status(202).json({
                    success: true,
                    pendingModeration: true,
                    message: {
                        id: 'pending-' + msgId,
                        circle_id: circleId,
                        user_id: userId,
                        sender_name: senderName,
                        message_type: 'TEXT',
                        content: modResult.cleanedText,
                        moderation_status: 'PENDING_REVIEW',
                        created_at: new Date().toISOString()
                    },
                    userNotice: modResult.userFacingMessage || 'আপনার বার্তাটি পর্যালোচনার জন্য জমা রাখা হয়েছে।'
                });
            }

            textToSave = modResult.cleanedText;
            moderationStatus = modResult.outcome.moderationStatus;
            moderationReason = modResult.outcome.reason;
            if (modResult.outcome.decision === 'ALLOW_WITH_WARNING') {
                warningNotice = modResult.userFacingMessage;
            }
        }

        const insertRes = await query(`
            INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content, audio_url, audio_duration_sec, read_by, status, moderation_status, moderation_reason)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, 'SENT', $9, $10)
            RETURNING *
        `, [msgId, circleId, userId, senderName, messageType, textToSave, audioUrl || null, audioDurationSec || null, moderationStatus, moderationReason]);

        // Push real-time notification to all active companions in this circle (except sender)
        try {
            const companions = await query(`
                SELECT user_id FROM circle_members 
                WHERE circle_id = $1 AND user_id != $2 AND status = 'ACTIVE'
            `, [circleId, userId]);

            let notifMessage = textToSave;
            if (messageType === 'AUDIO') {
                notifMessage = `🎙️ ${senderName} একটি ভয়েস বার্তা পাঠিয়েছেন (${audioDurationSec || 3} সেকেন্ড)`;
            } else if (messageType === 'NUDGE') {
                notifMessage = `✨ ${senderName}: ${content}`;
            } else {
                notifMessage = `${senderName}: ${textToSave && textToSave.length > 80 ? textToSave.substring(0, 80) + '...' : textToSave}`;
            }

            for (const c of companions.rows) {
                const notifId = crypto.randomUUID();
                await query(`
                    INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
                    VALUES ($1, $2, 'CIRCLE_MESSAGE', $3, $3, $4, $4, FALSE, $5, NOW())
                `, [
                    notifId,
                    c.user_id,
                    `💬 ${circleName} • ${senderName}`,
                    notifMessage,
                    JSON.stringify({
                        relatedId: circleId,
                        circleId,
                        senderId: userId,
                        messageType,
                        url: '/cave_circle'
                    })
                ]);
            }
        } catch (notifErr) {
            console.error('Failed to dispatch companion message notifications:', notifErr);
        }

        res.json({
            success: true,
            message: insertRes.rows[0],
            warningNotice
        });
    } catch (error) {
        console.error('Error posting circle message:', error);
        res.status(500).json({ success: false, message: 'মেসেজ পাঠানো যায়নি' });
    }
});

// POST Report a Circle Message
circleRoutes.post('/:id/messages/:messageId/report', requireAuth, async (req, res) => {
    try {
        const reporterId = (req as any).user.id;
        const circleId = req.params.id;
        const messageId = req.params.messageId;
        const { category = 'HARASSMENT', description = '' } = req.body;

        // Verify reporter is an active member in this circle
        const membershipCheck = await query(`
            SELECT id FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, reporterId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'আপনি এই সার্কেলের সক্রিয় সদস্য নন' });
        }

        // Verify target message exists in this circle
        const msgRes = await query(`
            SELECT id, user_id FROM circle_messages 
            WHERE id = $1 AND circle_id = $2
        `, [messageId, circleId]);

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'রিপোর্ট করার জন্য মেসেজটি পাওয়া যায়নি' });
        }

        const reportedUserId = msgRes.rows[0].user_id;

        // Prevent reporting oneself
        if (reportedUserId === reporterId) {
            return res.status(400).json({ success: false, message: 'নিজের বার্তায় রিপোর্ট করা সম্ভব নয়' });
        }

        // Check if already reported by this user
        const existingReport = await query(`
            SELECT id FROM moderation_reports 
            WHERE message_id = $1 AND reporter_user_id = $2
        `, [messageId, reporterId]);

        if (existingReport.rows.length > 0) {
            return res.json({
                success: true,
                message: 'আপনি ইতিপূর্বে এই বার্তাটিতে রিপোর্ট করেছেন। আমাদের টিম বিষয়টি পর্যালোচনা করছে।'
            });
        }

        const reportId = crypto.randomUUID();
        await query(`
            INSERT INTO moderation_reports (
                id, circle_id, message_id, reported_user_id, reporter_user_id, category, description, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
        `, [reportId, circleId, messageId, reportedUserId, reporterId, category, description]);

        res.json({
            success: true,
            message: 'রিপোর্টটি সফলভাবে জমা নেওয়া হয়েছে। জাযাকাল্লাহু খাইরান।'
        });
    } catch (error) {
        console.error('Error reporting circle message:', error);
        res.status(500).json({ success: false, message: 'রিপোর্ট জমা দেওয়া সম্ভব হয়নি' });
    }
});

// GET Quran Goals for Circle
circleRoutes.get('/:id/quran-goals', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        let goalsRes = await query(`
            SELECT * FROM circle_quran_goals 
            WHERE circle_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [circleId]);

        // If no goal exists yet, auto-create a default 30-Juz Khatam Goal for the circle
        if (goalsRes.rows.length === 0) {
            const goalId = crypto.randomUUID();
            const newGoal = await query(`
                INSERT INTO circle_quran_goals (id, circle_id, title, total_juz, completed_juz)
                VALUES ($1, $2, $3, 30, '[]'::jsonb)
                RETURNING *
            `, [goalId, circleId, 'যৌথ কুরআন খতম গোল']);
            goalsRes = newGoal;
        }

        res.json({ success: true, goal: goalsRes.rows[0] });
    } catch (error) {
        console.error('Error fetching Quran goals:', error);
        res.status(500).json({ success: false, message: 'কুরআন খতম লোড করা যায়নি' });
    }
});

// Toggle a Juz as completed by current user
circleRoutes.post('/:id/quran-goals/toggle-juz', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;
        const { juzNumber } = req.body;

        if (!juzNumber || juzNumber < 1 || juzNumber > 30) {
            return res.status(400).json({ success: false, message: 'সঠিক পারা নম্বর দিন (১-৩০)' });
        }

        // Verify membership
        const membershipCheck = await query(`
            SELECT cm.role, u.full_name 
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.circle_id = $1 AND cm.user_id = $2 AND cm.status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const userName = membershipCheck.rows[0].full_name || 'সাথী';

        // Fetch or create goal
        let goalsRes = await query(`
            SELECT * FROM circle_quran_goals 
            WHERE circle_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [circleId]);

        let goal = goalsRes.rows[0];
        if (!goal) {
            const goalId = crypto.randomUUID();
            const newGoal = await query(`
                INSERT INTO circle_quran_goals (id, circle_id, title, total_juz, completed_juz)
                VALUES ($1, $2, $3, 30, '[]'::jsonb)
                RETURNING *
            `, [goalId, circleId, 'যৌথ কুরআন খতম গোল']);
            goal = newGoal.rows[0];
        }

        let completedList: any[] = goal.completed_juz || [];
        if (typeof completedList === 'string') {
            try { completedList = JSON.parse(completedList); } catch { completedList = []; }
        }

        const existingIdx = completedList.findIndex((item: any) => item.juz === juzNumber);

        let actionDone = '';
        if (existingIdx >= 0) {
            const existing = completedList[existingIdx];
            // If completed by current user, toggle off
            if (existing.userId === userId) {
                completedList.splice(existingIdx, 1);
                actionDone = 'uncompleted';
            } else {
                // If claimed by someone else, update or take over
                completedList[existingIdx] = {
                    juz: juzNumber,
                    userId,
                    userName,
                    completedAt: new Date().toISOString()
                };
                actionDone = 'reclaimed';
            }
        } else {
            completedList.push({
                juz: juzNumber,
                userId,
                userName,
                completedAt: new Date().toISOString()
            });
            actionDone = 'completed';

            // Post an automatic milestone message in circle chat
            const msgId = crypto.randomUUID();
            await query(`
                INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
                VALUES ($1, $2, $3, $4, 'QURAN_MILESTONE', $5)
            `, [msgId, circleId, userId, userName, `আলহামদুলিল্লাহ! ${userName} পারা ${juzNumber} তিলাওয়াত সম্পন্ন করেছেন। 📖✨`]);

            // Notify all active companions
            try {
                const circleRes = await query(`SELECT name FROM circles WHERE id = $1`, [circleId]);
                const circleName = circleRes.rows[0]?.name || 'Cave Circle';
                const membersRes = await query(`
                    SELECT user_id FROM circle_members 
                    WHERE circle_id = $1 AND user_id != $2 AND status = 'ACTIVE'
                `, [circleId, userId]);

                for (const m of membersRes.rows) {
                    const notifId = crypto.randomUUID();
                    await query(`
                        INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
                        VALUES ($1, $2, 'CIRCLE_MESSAGE', $3, $3, $4, $4, FALSE, $5, NOW())
                    `, [
                        notifId,
                        m.user_id,
                        `📖 ${circleName} • কুরআন খতম`,
                        `আলহামদুলিল্লাহ! ${userName} পারা ${juzNumber} তিলাওয়াত সম্পন্ন করেছেন।`,
                        JSON.stringify({ relatedId: circleId, circleId, url: '/cave_circle' })
                    ]);
                }
            } catch (khatamNotifErr) {
                console.error('Failed to dispatch Quran milestone notification:', khatamNotifErr);
            }
        }

        const updateRes = await query(`
            UPDATE circle_quran_goals 
            SET completed_juz = $1::jsonb, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [JSON.stringify(completedList), goal.id]);

        res.json({ 
            success: true, 
            goal: updateRes.rows[0], 
            action: actionDone,
            message: actionDone === 'uncompleted' 
                ? `পারা ${juzNumber} তালিকা থেকে অপসারিত হয়েছে`
                : `মাশাআল্লাহ! পারা ${juzNumber} সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে`
        });
    } catch (error) {
        console.error('Error toggling Quran Juz:', error);
        res.status(500).json({ success: false, message: 'পারা আপডেট করা যায়নি' });
    }
});

// ==========================================
// INTER-CIRCLE CHALLENGES & COMPETITIONS (BATTLES)
// ==========================================

// Helper: Calculate points for a circle in a battle window
async function calculateCircleBattlePoints(circleId: string, startTime: Date, endTime: Date) {
    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();
    const startDateStr = startIso.split('T')[0];
    const endDateStr = endIso.split('T')[0];

    // 1. Salah Points from prayer_attendances for circle members
    const salahRes = await query(`
        SELECT pa.prayer_type, COUNT(*) as count
        FROM prayer_attendances pa
        JOIN circle_members cm ON pa.user_id = cm.user_id
        WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE'
          AND pa.date >= $2 AND pa.date <= $3
        GROUP BY pa.prayer_type
    `, [circleId, startDateStr, endDateStr]);

    let salahPoints = 0;
    let fajrCount = 0;
    let ishaCount = 0;
    let otherCount = 0;
    salahRes.rows.forEach(r => {
        const c = parseInt(r.count, 10) || 0;
        if (r.prayer_type === 'fajr') {
            salahPoints += c * 50;
            fajrCount += c;
        } else if (r.prayer_type === 'isha') {
            salahPoints += c * 40;
            ishaCount += c;
        } else {
            salahPoints += c * 30;
            otherCount += c;
        }
    });

    // 2. Quran Points: check completed juz in circle_quran_goals
    const quranGoalsRes = await query(`
        SELECT completed_juz FROM circle_quran_goals
        WHERE circle_id = $1
    `, [circleId]);

    let quranPoints = 0;
    let juzCount = 0;
    quranGoalsRes.rows.forEach(g => {
        let list = g.completed_juz || [];
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch { list = []; }
        }
        list.forEach((item: any) => {
            if (item.completedAt) {
                const itemTime = new Date(item.completedAt).getTime();
                if (itemTime >= startTime.getTime() && itemTime <= endTime.getTime()) {
                    quranPoints += 100;
                    juzCount++;
                }
            } else {
                quranPoints += 100;
                juzCount++;
            }
        });
    });

    // 3. Dhikr / Token Points:
    const tokenRes = await query(`
        SELECT COALESCE(SUM(t.amount), 0) as total_tokens
        FROM tokens t
        JOIN circle_members cm ON t.user_id = cm.user_id
        WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE'
          AND t.created_at >= $2 AND t.created_at <= $3
    `, [circleId, startIso, endIso]);
    const dhikrPoints = Math.round(parseFloat(tokenRes.rows[0]?.total_tokens || 0));

    const totalPoints = salahPoints + quranPoints + dhikrPoints;

    return {
        totalPoints,
        salahPoints,
        quranPoints,
        dhikrPoints,
        fajrCount,
        ishaCount,
        otherCount,
        juzCount
    };
}

// 1. Send Inter-Circle Challenge
circleRoutes.post('/:id/challenge-battle', requireAuth, async (req, res) => {
    try {
        await ensureBattlesTable();
        const userId = (req as any).user.id;
        const challengerCircleId = req.params.id;
        const { opponentCircleId, battleType = 'ALL_ROUND', durationDays = 3, title, rulesNote } = req.body;

        if (!opponentCircleId || opponentCircleId === challengerCircleId) {
            return res.status(400).json({ success: false, message: 'সঠিক প্রতিপক্ষ সার্কেল নির্বাচন করুন' });
        }

        // Verify membership in challenger circle
        const membershipCheck = await query(`
            SELECT cm.role, u.full_name as user_name, c.name as circle_name
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            JOIN circles c ON cm.circle_id = c.id
            WHERE cm.circle_id = $1 AND cm.user_id = $2 AND cm.status = 'ACTIVE'
        `, [challengerCircleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'আপনার এই সার্কেলে চ্যালেঞ্জ পাঠানোর অনুমতি নেই' });
        }

        const challengerCircleName = membershipCheck.rows[0].circle_name;
        const challengerUserName = membershipCheck.rows[0].user_name || 'সাথী';

        // Check opponent circle
        const opponentCircleRes = await query(`
            SELECT c.*, u.full_name as admin_name
            FROM circles c
            LEFT JOIN users u ON c.admin_id = u.id
            WHERE c.id = $1
        `, [opponentCircleId]);

        if (opponentCircleRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'প্রতিপক্ষ সার্কেল খুঁজে পাওয়া যায়নি' });
        }

        const opponentCircle = opponentCircleRes.rows[0];

        // Check for existing active or pending battle between these two circles
        const existingBattle = await query(`
            SELECT id, status FROM circle_battles
            WHERE ((challenger_circle_id = $1 AND challenged_circle_id = $2)
               OR (challenger_circle_id = $2 AND challenged_circle_id = $1))
              AND status IN ('PENDING', 'ACTIVE')
            LIMIT 1
        `, [challengerCircleId, opponentCircleId]);

        if (existingBattle.rows.length > 0) {
            const currentStatus = existingBattle.rows[0].status;
            return res.status(400).json({ 
                success: false, 
                message: currentStatus === 'ACTIVE' 
                    ? 'এই দুই সার্কেলের মধ্যে ইতোমধ্যে একটি প্রতিযোগিতা চলছে!'
                    : 'এই দুই সার্কেলের মধ্যে ইতোমধ্যে একটি চ্যালেঞ্জ পাঠানো হয়েছে এবং উত্তর অপেক্ষমাণ!'
            });
        }

        const battleId = crypto.randomUUID();
        const duration = Number(durationDays) || 3;
        const battleTitle = title || `নামায, কুরআন ও যিকির পয়েন্ট প্রতিযোগিতা (${duration} দিন)`;
        const note = rulesNote || 'ওয়াক্তমত নামায, কুরআন তিলাওয়াত ও যিকিরে অর্জিত পয়েন্টের ভিত্তিতে বিজয়ী নির্ধারণ হবে।';

        await query(`
            INSERT INTO circle_battles (
                id, challenger_circle_id, challenged_circle_id, challenger_admin_id,
                title, battle_type, duration_days, status, rules_note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)
        `, [battleId, challengerCircleId, opponentCircleId, userId, battleTitle, battleType, duration, note]);

        // Automated announcement in Challenger Circle Chat
        const msgId1 = crypto.randomUUID();
        await query(`
            INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
            VALUES ($1, $2, $3, $4, 'TEXT', $5)
        `, [msgId1, challengerCircleId, userId, challengerUserName, `⚔️ আমরা "${opponentCircle.name}" সার্কেলকে ${duration} দিনের পয়েন্ট প্রতিযোগিতার চ্যালেঞ্জ পাঠিয়েছি!`]);

        // Automated announcement in Opponent Circle Chat
        const msgId2 = crypto.randomUUID();
        await query(`
            INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
            VALUES ($1, $2, $3, $4, 'TEXT', $5)
        `, [msgId2, opponentCircleId, userId, challengerUserName, `⚔️ "${challengerCircleName}" সার্কেল আমাদের ${duration} দিনের পয়েন্ট প্রতিযোগিতার চ্যালেঞ্জ পাঠিয়েছে! আমীর বা সাথীরা চ্যালেঞ্জ গ্রহণ করতে পারবেন।`]);

        // Notify Opponent Circle Admin & Companions
        try {
            const opponentMembers = await query(`
                SELECT user_id FROM circle_members WHERE circle_id = $1 AND status = 'ACTIVE'
            `, [opponentCircleId]);

            for (const m of opponentMembers.rows) {
                const notifId = crypto.randomUUID();
                await query(`
                    INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
                    VALUES ($1, $2, 'CIRCLE_BATTLE_CHALLENGE', $3, $3, $4, $4, FALSE, $5, NOW())
                `, [
                    notifId,
                    m.user_id,
                    `⚔️ নতুন সার্কেল চ্যালেঞ্জ!`,
                    `"${challengerCircleName}" আপনাদের সাথে ${duration} দিনের পয়েন্ট প্রতিযোগিতার চ্যালেঞ্জ জানিয়েছে!`,
                    JSON.stringify({ relatedId: challengerCircleId, battleId, url: '/cave_circle' })
                ]);
            }
        } catch (notifErr) {
            console.error('Error dispatching battle notifications:', notifErr);
        }

        res.json({
            success: true,
            battleId,
            message: `"${opponentCircle.name}" সার্কেলকে সফলভাবে প্রতিযোগিতার চ্যালেঞ্জ জানানো হয়েছে!`
        });
    } catch (error) {
        console.error('Error creating circle battle challenge:', error);
        res.status(500).json({ success: false, message: 'চ্যালেঞ্জ পাঠানো যায়নি' });
    }
});

// 2. Get Battles for a specific Circle (Active, Pending, Completed)
circleRoutes.get('/:id/battles', requireAuth, async (req, res) => {
    try {
        await ensureBattlesTable();
        const userId = (req as any).user.id;
        const circleId = req.params.id;

        // Verify membership
        const membershipCheck = await query(`
            SELECT role FROM circle_members 
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [circleId, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'অনুমতি নেই' });
        }

        const battlesRes = await query(`
            SELECT cb.*,
                   c1.name as challenger_circle_name,
                   c1.category as challenger_circle_category,
                   u1.full_name as challenger_admin_name,
                   u1.photo_url as challenger_admin_photo,
                   (SELECT COUNT(*) FROM circle_members WHERE circle_id = c1.id AND status = 'ACTIVE') as challenger_member_count,
                   c2.name as challenged_circle_name,
                   c2.category as challenged_circle_category,
                   u2.full_name as challenged_admin_name,
                   u2.photo_url as challenged_admin_photo,
                   (SELECT COUNT(*) FROM circle_members WHERE circle_id = c2.id AND status = 'ACTIVE') as challenged_member_count
            FROM circle_battles cb
            JOIN circles c1 ON cb.challenger_circle_id = c1.id
            JOIN users u1 ON cb.challenger_admin_id = u1.id
            JOIN circles c2 ON cb.challenged_circle_id = c2.id
            LEFT JOIN users u2 ON c2.admin_id = u2.id
            WHERE cb.challenger_circle_id = $1 OR cb.challenged_circle_id = $1
            ORDER BY cb.created_at DESC
        `, [circleId]);

        // Process live points for active battles and auto-complete expired ones
        const battles = await Promise.all(battlesRes.rows.map(async (battle) => {
            if (battle.status === 'ACTIVE') {
                const now = new Date();
                const endTime = new Date(battle.end_time);

                const challengerStats = await calculateCircleBattlePoints(
                    battle.challenger_circle_id, 
                    new Date(battle.start_time), 
                    now > endTime ? endTime : now
                );
                const challengedStats = await calculateCircleBattlePoints(
                    battle.challenged_circle_id, 
                    new Date(battle.start_time), 
                    now > endTime ? endTime : now
                );

                let status = battle.status;
                let winnerCircleId = battle.winner_circle_id;

                if (now >= endTime) {
                    status = 'COMPLETED';
                    if (challengerStats.totalPoints > challengedStats.totalPoints) {
                        winnerCircleId = battle.challenger_circle_id;
                    } else if (challengedStats.totalPoints > challengerStats.totalPoints) {
                        winnerCircleId = battle.challenged_circle_id;
                    } else {
                        winnerCircleId = 'DRAW';
                    }

                    // Update in database
                    await query(`
                        UPDATE circle_battles
                        SET status = 'COMPLETED',
                            challenger_points = $1,
                            challenged_points = $2,
                            challenger_salah_points = $3,
                            challenged_salah_points = $4,
                            challenger_quran_points = $5,
                            challenged_quran_points = $6,
                            challenger_dhikr_points = $7,
                            challenged_dhikr_points = $8,
                            winner_circle_id = $9,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $10
                    `, [
                        challengerStats.totalPoints, challengedStats.totalPoints,
                        challengerStats.salahPoints, challengedStats.salahPoints,
                        challengerStats.quranPoints, challengedStats.quranPoints,
                        challengerStats.dhikrPoints, challengedStats.dhikrPoints,
                        winnerCircleId, battle.id
                    ]);
                }

                return {
                    ...battle,
                    status,
                    winner_circle_id: winnerCircleId,
                    challenger_points: challengerStats.totalPoints,
                    challenged_points: challengedStats.totalPoints,
                    challenger_salah_points: challengerStats.salahPoints,
                    challenged_salah_points: challengedStats.salahPoints,
                    challenger_quran_points: challengerStats.quranPoints,
                    challenged_quran_points: challengedStats.quranPoints,
                    challenger_dhikr_points: challengerStats.dhikrPoints,
                    challenged_dhikr_points: challengedStats.dhikrPoints
                };
            }
            return battle;
        }));

        res.json({ success: true, battles });
    } catch (error) {
        console.error('Error fetching circle battles:', error);
        res.status(500).json({ success: false, message: 'প্রতিযোগিতার তালিকা লোড করা যায়নি' });
    }
});

// 3. Respond to Inter-Circle Challenge (ACCEPT / DECLINE)
circleRoutes.post('/battles/:battleId/respond', requireAuth, async (req, res) => {
    try {
        await ensureBattlesTable();
        const userId = (req as any).user.id;
        const battleId = req.params.battleId;
        const { action } = req.body; // 'ACCEPT' | 'DECLINE'

        if (!['ACCEPT', 'DECLINE'].includes(action)) {
            return res.status(400).json({ success: false, message: 'অবৈধ একশন' });
        }

        const battleRes = await query(`
            SELECT cb.*, 
                   c1.name as challenger_name, 
                   c2.name as challenged_name,
                   u.full_name as responder_name
            FROM circle_battles cb
            JOIN circles c1 ON cb.challenger_circle_id = c1.id
            JOIN circles c2 ON cb.challenged_circle_id = c2.id
            JOIN users u ON u.id = $2
            WHERE cb.id = $1 AND cb.status = 'PENDING'
        `, [battleId, userId]);

        if (battleRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'চ্যালেঞ্জ পাওয়া যায়নি বা ইতোমধ্যে সম্পন্ন হয়েছে' });
        }

        const battle = battleRes.rows[0];

        // Verify user is in challenged circle
        const membershipCheck = await query(`
            SELECT role FROM circle_members
            WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'
        `, [battle.challenged_circle_id, userId]);

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'শুধুমাত্র প্রতিপক্ষ সার্কেলের সদস্যরা উত্তর দিতে পারবেন' });
        }

        if (action === 'ACCEPT') {
            const duration = Number(battle.duration_days) || 3;
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000);

            await query(`
                UPDATE circle_battles
                SET status = 'ACTIVE',
                    start_time = $1,
                    end_time = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [startTime.toISOString(), endTime.toISOString(), battleId]);

            // Announcement in Challenger Circle Chat
            const msg1 = crypto.randomUUID();
            await query(`
                INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
                VALUES ($1, $2, $3, $4, 'TEXT', $5)
            `, [msg1, battle.challenger_circle_id, userId, battle.responder_name, `🎉 মাশাআল্লাহ! "${battle.challenged_name}" আমাদের চ্যালেঞ্জ গ্রহণ করেছে! আগামী ${duration} দিনের পয়েন্ট প্রতিযোগিতা শুরু হয়েছে!`]);

            // Announcement in Challenged Circle Chat
            const msg2 = crypto.randomUUID();
            await query(`
                INSERT INTO circle_messages (id, circle_id, user_id, sender_name, message_type, content)
                VALUES ($1, $2, $3, $4, 'TEXT', $5)
            `, [msg2, battle.challenged_circle_id, userId, battle.responder_name, `⚔️ "${battle.challenger_name}"-এর সাথে আমাদের ${duration} দিনের পয়েন্ট প্রতিযোগিতা শুরু হয়েছে! নামায, কুরআন ও যিকিরে সবাই এগিয়ে থাকুন!`]);

            res.json({ success: true, message: 'প্রতিযোগিতা শুরু হয়েছে! শুভকামনা!' });
        } else {
            await query(`
                UPDATE circle_battles
                SET status = 'DECLINED', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [battleId]);

            res.json({ success: true, message: 'চ্যালেঞ্জ প্রত্যাখ্যান করা হয়েছে' });
        }
    } catch (error) {
        console.error('Error responding to battle challenge:', error);
        res.status(500).json({ success: false, message: 'উত্তর প্রক্রিয়াকরণ করা যায়নি' });
    }
});

// 4. Get Detailed Live Arena Stats for a Battle
circleRoutes.get('/battles/:battleId/stats', requireAuth, async (req, res) => {
    try {
        await ensureBattlesTable();
        const battleId = req.params.battleId;

        const battleRes = await query(`
            SELECT cb.*,
                   c1.name as challenger_name,
                   c1.category as challenger_category,
                   c2.name as challenged_name,
                   c2.category as challenged_category
            FROM circle_battles cb
            JOIN circles c1 ON cb.challenger_circle_id = c1.id
            JOIN circles c2 ON cb.challenged_circle_id = c2.id
            WHERE cb.id = $1
        `, [battleId]);

        if (battleRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'প্রতিযোগিতা পাওয়া যায়নি' });
        }

        const battle = battleRes.rows[0];
        const now = new Date();
        const startTime = battle.start_time ? new Date(battle.start_time) : now;
        const endTime = battle.end_time ? new Date(battle.end_time) : now;

        const challengerStats = await calculateCircleBattlePoints(
            battle.challenger_circle_id, 
            startTime, 
            now > endTime ? endTime : now
        );
        const challengedStats = await calculateCircleBattlePoints(
            battle.challenged_circle_id, 
            startTime, 
            now > endTime ? endTime : now
        );

        // Top contributors from Challenger Circle
        const topChallengers = await query(`
            SELECT u.id, u.full_name, u.photo_url,
                   (SELECT COUNT(*) FROM prayer_attendances pa WHERE pa.user_id = u.id AND pa.date >= $2 AND pa.date <= $3) as salah_count
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE'
            LIMIT 5
        `, [battle.challenger_circle_id, startTime.toISOString().split('T')[0], endTime.toISOString().split('T')[0]]);

        // Top contributors from Challenged Circle
        const topChallenged = await query(`
            SELECT u.id, u.full_name, u.photo_url,
                   (SELECT COUNT(*) FROM prayer_attendances pa WHERE pa.user_id = u.id AND pa.date >= $2 AND pa.date <= $3) as salah_count
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.circle_id = $1 AND cm.status = 'ACTIVE'
            LIMIT 5
        `, [battle.challenged_circle_id, startTime.toISOString().split('T')[0], endTime.toISOString().split('T')[0]]);

        res.json({
            success: true,
            battle,
            challengerStats,
            challengedStats,
            topChallengers: topChallengers.rows,
            topChallenged: topChallenged.rows
        });
    } catch (error) {
        console.error('Error fetching battle stats:', error);
        res.status(500).json({ success: false, message: 'পরিসংখ্যান লোড করা যায়নি' });
    }
});

// =========================================================================
// REAL AUDIO CALL SIGNALING ENDPOINTS (Multi-User, Manual Answer & Polling)
// =========================================================================

// 1. Initiate Audio Call (Direct or Group Call)
circleRoutes.post('/:id/calls', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const circleId = req.params.id;
        const { targetUserId } = req.body;

        // Verify caller is an active member
        const memberRes = await query(`
            SELECT cm.role, u.full_name, u.photo_url, c.name as circle_name
            FROM circle_members cm
            JOIN users u ON cm.user_id = u.id
            JOIN circles c ON cm.circle_id = c.id
            WHERE cm.circle_id = $1 AND cm.user_id = $2 AND cm.status = 'ACTIVE'
        `, [circleId, userId]);

        if (memberRes.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'আপনি এই সার্কেলের সক্রিয় সদস্য নন' });
        }

        const callerName = memberRes.rows[0].full_name || 'সাথী';
        const callerPhoto = memberRes.rows[0].photo_url || null;
        const callId = crypto.randomUUID();

        // End any stale dangling calls from this user
        await query(`
            UPDATE circle_active_calls 
            SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP 
            WHERE caller_user_id = $1 AND status IN ('RINGING', 'CONNECTED')
        `, [userId]);

        await query(`
            INSERT INTO circle_active_calls (id, circle_id, caller_user_id, caller_name, caller_photo_url, target_user_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'RINGING')
        `, [callId, circleId, userId, callerName, callerPhoto, targetUserId || null]);

        res.json({
            success: true,
            callId,
            status: 'RINGING',
            circleId,
            callerName
        });
    } catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ success: false, message: 'কল শুরু করা সম্ভব হয়নি' });
    }
});

// 3. Get Status of a Specific Call Session (Polled by Caller & Recipient)
circleRoutes.get('/calls/:callId/status', requireAuth, async (req, res) => {
    try {
        const callId = req.params.callId;
        const callRes = await query(`
            SELECT id, circle_id, caller_user_id, caller_name, caller_photo_url, target_user_id, status, created_at, connected_at, ended_at
            FROM circle_active_calls
            WHERE id = $1
        `, [callId]);

        if (callRes.rows.length === 0) {
            return res.json({ success: true, status: 'ENDED' });
        }

        res.json({ success: true, call: callRes.rows[0], status: callRes.rows[0].status });
    } catch (error) {
        console.error('Error getting call status:', error);
        res.status(500).json({ success: false, message: 'কলের স্ট্যাটাস পাওয়া যায়নি' });
    }
});

// 4. Answer Incoming Call (Sets status = 'CONNECTED')
circleRoutes.post('/calls/:callId/answer', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const callId = req.params.callId;

        const updateRes = await query(`
            UPDATE circle_active_calls
            SET status = 'CONNECTED', connected_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'RINGING'
            RETURNING *
        `, [callId]);

        if (updateRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'কলটি ইতোমধ্যে সমাপ্ত বা নিষ্ক্রিয়' });
        }

        res.json({ success: true, call: updateRes.rows[0], message: 'কল রিসিভ হয়েছে' });
    } catch (error) {
        console.error('Error answering call:', error);
        res.status(500).json({ success: false, message: 'কল রিসিভ করা যায়নি' });
    }
});

// 5. Decline Incoming Call (Sets status = 'REJECTED')
circleRoutes.post('/calls/:callId/decline', requireAuth, async (req, res) => {
    try {
        const callId = req.params.callId;

        await query(`
            UPDATE circle_active_calls
            SET status = 'REJECTED', ended_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'RINGING'
        `, [callId]);

        res.json({ success: true, message: 'কল প্রত্যাখ্যান করা হয়েছে' });
    } catch (error) {
        console.error('Error declining call:', error);
        res.status(500).json({ success: false, message: 'কল রিজেক্ট করা যায়নি' });
    }
});

// 6. End Active Call (Sets status = 'ENDED')
circleRoutes.post('/calls/:callId/end', requireAuth, async (req, res) => {
    try {
        const callId = req.params.callId;

        await query(`
            UPDATE circle_active_calls
            SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [callId]);

        res.json({ success: true, message: 'কল সমাপ্ত হয়েছে' });
    } catch (error) {
        console.error('Error ending call:', error);
        res.status(500).json({ success: false, message: 'কল বন্ধ করা সম্ভব হয়নি' });
    }
});

export default circleRoutes;

import crypto from 'crypto';
import { query } from '../pg.js';
import {
  ModerationContext,
  ModerationPolicyOutcome,
  UserRestrictionRecord,
  ModerationResult
} from './moderationTypes.js';
import { sanitizeAndNormalizeText } from './normalization.js';
import { defaultRuleClassifier, RuleBasedClassifier } from './RuleBasedClassifier.js';
import { defaultPolicyEngine, PolicyEngine } from './policyEngine.js';

export interface PipelineEvaluationResult {
  isPermitted: boolean;
  outcome: ModerationPolicyOutcome;
  cleanedText: string;
  userFacingMessage?: string;
  restriction?: UserRestrictionRecord;
}

export class ModerationPipeline {
  private ruleClassifier: RuleBasedClassifier;
  private policyEngine: PolicyEngine;

  constructor(
    ruleClassifier: RuleBasedClassifier = defaultRuleClassifier,
    policyEngine: PolicyEngine = defaultPolicyEngine
  ) {
    this.ruleClassifier = ruleClassifier;
    this.policyEngine = policyEngine;
  }

  /**
   * Set custom rule classifier
   */
  public setRuleClassifier(classifier: RuleBasedClassifier) {
    this.ruleClassifier = classifier;
  }

  /**
   * Check whether a user currently has an active chat restriction or cooldown
   */
  public async checkUserActiveRestriction(
    userId: string,
    circleId?: string
  ): Promise<UserRestrictionRecord | null> {
    try {
      const res = await query(`
        SELECT * FROM user_restrictions
        WHERE user_id = $1 
          AND is_active = TRUE
          AND (circle_id IS NULL OR circle_id = $2)
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId, circleId || '']);

      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          circleId: row.circle_id,
          restrictionType: row.restriction_type,
          reason: row.reason,
          issuedBy: row.issued_by,
          expiresAt: row.expires_at,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at
        };
      }
      return null;
    } catch (err) {
      console.warn('[ModerationPipeline] Restriction check error:', err);
      return null;
    }
  }

  /**
   * Evaluate a TEXT message before it is posted to a Cave Circle
   */
  public async evaluateTextMessage(
    rawContent: string,
    context: ModerationContext
  ): Promise<PipelineEvaluationResult> {
    // 1. Check for Active User Restriction
    const activeRestriction = await this.checkUserActiveRestriction(context.userId, context.circleId);
    if (activeRestriction) {
      let restrictionNotice = 'আপনার অ্যাকাউন্টে সাময়িক মেসেজ পাঠানোর সীমাবদ্ধতা (Cooldown) সক্রিয় রয়েছে।';
      if (activeRestriction.restrictionType === 'MUTED_24H') {
        restrictionNotice = 'আপনার অ্যাকাউন্টে ২৪ ঘণ্টার জন্য বার্তা প্রেরণে সাময়িক বিরতি দেওয়া হয়েছে।';
      } else if (activeRestriction.restrictionType === 'MUTED_7D') {
        restrictionNotice = 'আপনার অ্যাকাউন্টে ৭ দিনের জন্য বার্তা প্রেরণে সাময়িক বিরতি দেওয়া হয়েছে।';
      } else if (activeRestriction.restrictionType === 'SUSPENDED_CHAT') {
        restrictionNotice = 'আপনার সার্কেল চ্যাট সুবিধা সাময়িকভাবে স্থগিত রয়েছে। এডমিনের সাথে যোগাযোগ করুন।';
      }

      return {
        isPermitted: false,
        cleanedText: '',
        userFacingMessage: restrictionNotice,
        restriction: activeRestriction,
        outcome: {
          decision: 'BLOCK',
          moderationStatus: 'BLOCKED',
          riskScore: 1.0,
          categories: ['HARASSMENT'],
          reason: `Active User Restriction: ${activeRestriction.restrictionType}`,
          userFacingMessage: restrictionNotice,
          requiresAdminReview: false,
          shouldStoreMessage: false
        }
      };
    }

    // 2. Validate and Normalize Text
    const normalized = sanitizeAndNormalizeText(rawContent);
    if (!normalized.isValid) {
      return {
        isPermitted: false,
        cleanedText: '',
        userFacingMessage: normalized.rejectReason || 'অবৈধ বার্তা',
        outcome: {
          decision: 'BLOCK',
          moderationStatus: 'BLOCKED',
          riskScore: 1.0,
          categories: ['SPAM'],
          reason: normalized.rejectReason || 'Validation failure',
          userFacingMessage: normalized.rejectReason || 'অবৈধ বার্তা',
          requiresAdminReview: false,
          shouldStoreMessage: false
        }
      };
    }

    // 3. Run Deterministic Rule Classification
    const ruleResult = await this.ruleClassifier.classify(normalized.cleaned, context);

    // 4. Evaluate Policy Decision
    const outcome = this.policyEngine.evaluatePolicy(ruleResult, context);

    // 5. Audit Logging for Non-Trivial Decisions
    if (outcome.decision !== 'ALLOW') {
      try {
        await this.recordModerationEvent({
          circleId: context.circleId,
          userId: context.userId,
          decision: outcome.decision,
          riskScore: outcome.riskScore,
          categories: outcome.categories,
          reason: outcome.reason,
          messageSnippet: normalized.cleaned.slice(0, 100),
          classifierId: ruleResult.classifierId
        });

        // Progressive auto-cooldown: If user triggered 3 or more BLOCK events in 24 hours
        if (outcome.decision === 'BLOCK') {
          const recentBlocks = await query(`
            SELECT COUNT(*) as block_count 
            FROM moderation_events
            WHERE user_id = $1 
              AND decision = 'BLOCK'
              AND created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')
          `, [context.userId]);

          const blockCount = parseInt(recentBlocks.rows[0]?.block_count || '0', 10);
          if (blockCount >= 3) {
            // Apply a temporary 24-hour cooldown
            const restrictionId = crypto.randomUUID();
            await query(`
              INSERT INTO user_restrictions (id, user_id, circle_id, restriction_type, reason, issued_by, expires_at, is_active)
              VALUES ($1, $2, $3, 'MUTED_24H', 'স্বয়ংক্রিয় সাময়িক বিরতি: একাধিকবার কমিউনিটি নিয়ম লঙ্ঘনের কারণে ২৪ ঘণ্টা মেসেজ পাঠানো স্থগিত।', 'SYSTEM_AUTO', CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE)
            `, [restrictionId, context.userId, context.circleId]);
          }
        }
      } catch (logErr) {
        console.warn('[ModerationPipeline] Failed to log moderation event:', logErr);
      }
    }

    const isPermitted = outcome.decision === 'ALLOW' || outcome.decision === 'ALLOW_WITH_WARNING';

    return {
      isPermitted,
      outcome,
      cleanedText: normalized.cleaned,
      userFacingMessage: outcome.userFacingMessage
    };
  }

  /**
   * Log an audit event in moderation_events
   */
  public async recordModerationEvent(data: {
    messageId?: string | null;
    circleId: string;
    userId: string;
    decision: string;
    riskScore: number;
    categories: string[];
    reason: string;
    messageSnippet: string;
    classifierId: string;
  }): Promise<string> {
    const eventId = crypto.randomUUID();
    await query(`
      INSERT INTO moderation_events (
        id, message_id, circle_id, user_id, decision, risk_score, categories, reason, message_snippet, classifier_id, review_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING'
      )
    `, [
      eventId,
      data.messageId || null,
      data.circleId,
      data.userId,
      data.decision,
      data.riskScore,
      JSON.stringify(data.categories),
      data.reason,
      data.messageSnippet,
      data.classifierId
    ]);
    return eventId;
  }
}

export const moderationPipeline = new ModerationPipeline();

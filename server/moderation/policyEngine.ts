import {
  ModerationResult,
  ModerationPolicyOutcome,
  ModerationContext
} from './moderationTypes.js';

export class PolicyEngine {
  /**
   * Translates classifier detection signals into community policy decisions
   */
  public evaluatePolicy(
    result: ModerationResult,
    context: ModerationContext
  ): ModerationPolicyOutcome {
    const { riskScore, categories, isReligiousEducationalContext, reason } = result;

    // 1. Clear Severe Violation (Risk >= 0.75) -> BLOCK
    if (riskScore >= 0.75) {
      return {
        decision: 'BLOCK',
        moderationStatus: 'BLOCKED',
        riskScore,
        categories,
        reason,
        userFacingMessage: 'আপনার বার্তাটি কেভ সার্কেলের শালীনতা ও কমিউনিটি নির্দেশিকার সাথে সংগতিপূর্ণ না হওয়ায় পোস্ট করা সম্ভব হয়নি।',
        requiresAdminReview: true,
        shouldStoreMessage: false // Do not show in normal chat feed
      };
    }

    // 2. Ambiguous or Moderate Risk (0.35 <= Risk < 0.75) -> REVIEW
    if (riskScore >= 0.35) {
      return {
        decision: 'REVIEW',
        moderationStatus: 'PENDING_REVIEW',
        riskScore,
        categories,
        reason,
        userFacingMessage: 'আপনার বার্তাটি পর্যালোচনার জন্য জমা রাখা হয়েছে। অনুমোদিত হলে এটি স্বয়ংক্রিয়ভাবে সার্কেলে প্রদর্শিত হবে।',
        requiresAdminReview: true,
        shouldStoreMessage: false // Held in moderation queue until Admin approves
      };
    }

    // 3. Low-level Warning Pattern (0.20 <= Risk < 0.35) -> ALLOW_WITH_WARNING
    if (riskScore >= 0.20) {
      return {
        decision: 'ALLOW_WITH_WARNING',
        moderationStatus: 'WARNING_ISSUED',
        riskScore,
        categories,
        reason,
        userFacingMessage: 'কমিউনিটি সতর্কতা: অনুগ্রহ করে সার্কেলে কথা বলার সময় মার্জিত ও শালীন ভাষা বজায় রাখুন।',
        requiresAdminReview: false,
        shouldStoreMessage: true // Delivered to chat feed with warning recorded
      };
    }

    // 4. Safe Content (Risk < 0.20) -> ALLOW
    return {
      decision: 'ALLOW',
      moderationStatus: 'APPROVED',
      riskScore,
      categories,
      reason,
      requiresAdminReview: false,
      shouldStoreMessage: true
    };
  }
}

export const defaultPolicyEngine = new PolicyEngine();

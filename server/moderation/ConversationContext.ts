import { sanitizeAndNormalizeText } from './normalization.js';
import { query } from '../pg.js';

export const MAX_CONTEXT_MESSAGES = 6;
export const MAX_CONTEXT_AGE_MINUTES = 10;
export const MAX_CONTEXT_CHARS = 3000;

export interface ContextMessage {
  id: string;
  userId: string;
  content: string;
  messageType: 'TEXT';
  createdAt: string;
  replyToMessageId?: string;
  normalizedContent?: string;
}

export interface ConversationContext {
  circleId: string;
  messageId?: string;
  currentUserId: string;
  recentMessages: ContextMessage[];
  participantCount?: number;
  replyToMessageId?: string;
}

export interface ContextAnalysisResult {
  contextCategories: string[];
  contextualSignals: string[];
  escalationDetected: boolean;
  quotationDetected: boolean;
  educationalContextDetected: boolean;
  fiqhContextDetected: boolean;
  contextRiskScoreModifier: number; // -0.3 to +0.3
  confidence: number;
}

/**
 * Privacy-safe context retrieval.
 * STRICTLY scoped to circleId (zero cross-circle leakage).
 * Bounded by age (10m), count (6 messages), and chars (3000 max).
 */
export async function retrieveConversationContext(
  circleId: string,
  currentUserId: string,
  excludeMessageId?: string
): Promise<ConversationContext> {
  const fallbackContext: ConversationContext = {
    circleId,
    currentUserId,
    recentMessages: []
  };

  if (!circleId) return fallbackContext;

  try {
    const tenMinutesAgo = new Date(Date.now() - MAX_CONTEXT_AGE_MINUTES * 60 * 1000).toISOString();
    
    // Strict circleId filter for cross-circle isolation
    let queryStr = `
      SELECT id, user_id, content, message_type, created_at
      FROM circle_messages
      WHERE circle_id = $1
        AND message_type = 'TEXT'
        AND created_at >= $2
    `;
    const params: any[] = [circleId, tenMinutesAgo];

    if (excludeMessageId) {
      queryStr += ` AND id != $3`;
      params.push(excludeMessageId);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(MAX_CONTEXT_MESSAGES);

    const res = await query(queryStr, params);
    const rows = res.rows || [];

    let totalChars = 0;
    const recentMessages: ContextMessage[] = [];

    // Process from oldest to newest in window
    for (const row of (rows || []).reverse()) {
      const rawText = row.content || '';
      if (totalChars + rawText.length > MAX_CONTEXT_CHARS) break;

      totalChars += rawText.length;
      const normalized = sanitizeAndNormalizeText(rawText);

      recentMessages.push({
        id: String(row.id),
        userId: String(row.user_id),
        content: rawText,
        messageType: 'TEXT',
        createdAt: String(row.created_at),
        replyToMessageId: row.reply_to_message_id ? String(row.reply_to_message_id) : undefined,
        normalizedContent: normalized.normalizedForAnalysis
      });
    }

    return {
      circleId,
      currentUserId,
      recentMessages
    };
  } catch (err: any) {
    console.warn('[ConversationContext] Non-fatal context fetch fallback:', err.message);
    return fallbackContext;
  }
}

/**
 * Analyzes conversation context signals for quotation, educational, Fiqh, or escalation patterns.
 */
export function analyzeContextSignals(
  currentContent: string,
  context: ConversationContext,
  isFiqhContext: boolean
): ContextAnalysisResult {
  const categories: string[] = [];
  const signals: string[] = [];

  let escalationDetected = false;
  let quotationDetected = false;
  let educationalContextDetected = false;
  let fiqhContextDetected = isFiqhContext;
  let contextRiskScoreModifier = 0.0;

  const currentNorm = sanitizeAndNormalizeText(currentContent).normalizedForAnalysis;

  // 1. Quotation & Reference Detection
  const quotationRegex = /^(?:সে|তিনি|ও|তারা|he|she|they|user)\s+(?:বলল|বলেছে|বলেছিল|বলে|said|stated|wrote|asked)|["'«»“”']|ওই কথা|উক্তি|কোড|quote/i;
  const questionRegex = /\?|কি|কেন|কীভাবে|কেনো|কেমনে|কেনন/i;

  if (quotationRegex.test(currentContent) || context.recentMessages.some(m => m.content.includes('"') || m.content.includes("'"))) {
    quotationDetected = true;
    categories.push('QUOTATION');
    signals.push('QUOTATION_PATTERN_DETECTED');
    contextRiskScoreModifier -= 0.15; // Soften risk if quoting or reporting speech
  }

  // 2. Educational & Fiqh Context
  const educationalKeywords = /নিয়ম|বিধান|হাদিস|আয়াত|ফিকহ|মাসআলা|তাফসির|ব্যাখ্যা|শিক্ষা|rules|definition|explanation|meaning/i;
  if (educationalKeywords.test(currentContent) || context.recentMessages.some(m => educationalKeywords.test(m.content))) {
    educationalContextDetected = true;
    categories.push('EDUCATIONAL');
    signals.push('EDUCATIONAL_DISCUSSION_ACTIVE');
    contextRiskScoreModifier -= 0.15;
  }

  if (fiqhContextDetected) {
    categories.push('ISLAMIC_FIQH');
    signals.push('ISLAMIC_FIQH_GUARD_ACTIVE');
    contextRiskScoreModifier -= 0.20;
  }

  // 3. Question Containing Sensitive Language
  if (questionRegex.test(currentContent) && quotationDetected) {
    signals.push('QUESTION_CONTAINING_QUOTATION');
    contextRiskScoreModifier -= 0.10;
  }

  // 4. Escalation Detection across recent messages
  if (context.recentMessages.length >= 2) {
    const abuseRegex = /মার|মারব|মারামারি|কাটব|শেষ|মারো|কুত্তা|শুয়োর|কিল|kill|hurt|attack|fuck|bitch/i;
    let recentAbuseCount = 0;
    for (const msg of context.recentMessages) {
      if (abuseRegex.test(msg.content)) recentAbuseCount++;
    }

    if (recentAbuseCount >= 2 && abuseRegex.test(currentContent)) {
      escalationDetected = true;
      categories.push('HARASSMENT_PATTERN');
      signals.push('MULTI_MESSAGE_ESCALATION_DETECTED');
      contextRiskScoreModifier += 0.25; // Increase risk for escalating pattern
    }
  }

  if (categories.length === 0) {
    categories.push('NORMAL_CONVERSATION');
  }

  return {
    contextCategories: categories,
    contextualSignals: signals,
    escalationDetected,
    quotationDetected,
    educationalContextDetected,
    fiqhContextDetected,
    contextRiskScoreModifier: Number(contextRiskScoreModifier.toFixed(2)),
    confidence: 0.85
  };
}

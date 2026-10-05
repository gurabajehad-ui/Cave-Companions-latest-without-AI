import {
  IModerationClassifier,
  ModerationContext,
  ModerationResult,
  ModerationCategory
} from './moderationTypes.js';
import { sanitizeAndNormalizeText } from './normalization.js';
import {
  DETERMINISTIC_RULES,
  ISLAMIC_FIQH_EDUCATIONAL_MARKERS,
  DeterministicRule
} from './moderationRules.js';

export class RuleBasedClassifier implements IModerationClassifier {
  public async classify(
    content: string,
    context: ModerationContext
  ): Promise<ModerationResult> {
    const normalizationResult = sanitizeAndNormalizeText(content);

    // If text failed basic normalization
    if (!normalizationResult.isValid) {
      return {
        decision: 'BLOCK',
        riskScore: 1.0,
        categories: ['SPAM'],
        reason: normalizationResult.rejectReason || 'অবৈধ মেসেজ ফরম্যাট',
        isReligiousEducationalContext: false,
        classifierId: 'RULE_ENGINE_V1',
        matchedRuleSnippets: []
      };
    }

    const textToAnalyze = normalizationResult.normalizedForAnalysis;

    // 1. Detect Islamic Fiqh & Educational Context
    let isReligiousEducationalContext = false;
    for (const marker of ISLAMIC_FIQH_EDUCATIONAL_MARKERS) {
      if (marker.test(textToAnalyze)) {
        isReligiousEducationalContext = true;
        break;
      }
    }

    // 2. Scan text with Deterministic Rules
    const matchedRules: DeterministicRule[] = [];
    const matchedCategories = new Set<ModerationCategory>();
    const matchedSnippets: string[] = [];

    for (const rule of DETERMINISTIC_RULES) {
      if (rule.pattern.test(textToAnalyze)) {
        matchedRules.push(rule);
        matchedCategories.add(rule.category);
        matchedSnippets.push(rule.id);
      }
    }

    // 3. If no rules matched: clearly SAFE
    if (matchedRules.length === 0) {
      return {
        decision: 'ALLOW',
        riskScore: 0.0,
        categories: ['SAFE'],
        reason: 'কোনো ক্ষতিকর বা আপত্তিকর প্যাটার্ন পাওয়া যায়নি',
        isReligiousEducationalContext,
        classifierId: 'RULE_ENGINE_V1',
        matchedRuleSnippets: []
      };
    }

    // 4. Calculate Risk Score based on highest severity and matched weights
    let maxWeight = 0;
    let hasCriticalSeverity = false;

    for (const rule of matchedRules) {
      if (rule.weight > maxWeight) {
        maxWeight = rule.weight;
      }
      if (rule.severity === 'CRITICAL') {
        hasCriticalSeverity = true;
      }
    }

    // Composite risk score: primary max weight + small delta for multiple matches
    let riskScore = Math.min(1.0, maxWeight + (matchedRules.length - 1) * 0.05);

    // 5. Apply Context-Aware Disambiguation for Islamic Fiqh / Educational content
    // If religious context is present, avoid false-positive blocking for ambiguous or educational inquiries
    if (isReligiousEducationalContext && !hasCriticalSeverity) {
      // Scale down risk score significantly for educational discussions
      riskScore = Math.min(0.30, riskScore * 0.4);
    }

    // 6. Preliminary decision
    let decision: ModerationResult['decision'] = 'ALLOW';
    if (riskScore >= 0.75) {
      decision = 'BLOCK';
    } else if (riskScore >= 0.35) {
      decision = 'REVIEW';
    } else if (riskScore >= 0.20) {
      decision = 'ALLOW_WITH_WARNING';
    }

    const categoriesArray = Array.from(matchedCategories);
    const reason = `শনাক্তকৃত ক্যাটাগরি: ${categoriesArray.join(', ')} (${matchedRules.map(r => r.description).join('; ')})`;

    return {
      decision,
      riskScore: Number(riskScore.toFixed(3)),
      categories: categoriesArray,
      reason,
      isReligiousEducationalContext,
      classifierId: 'RULE_ENGINE_V1',
      matchedRuleSnippets: matchedSnippets
    };
  }
}

export const defaultRuleClassifier = new RuleBasedClassifier();

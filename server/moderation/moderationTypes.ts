export type ModerationCategory =
  | 'EXPLICIT_SEXUAL'
  | 'HARASSMENT'
  | 'HATE_ABUSE'
  | 'MALICIOUS_LINK'
  | 'SPAM'
  | 'INAPPROPRIATE_SOLICITATION'
  | 'SAFE'
  | 'UNCERTAIN';

export type ModerationDecision =
  | 'ALLOW'
  | 'ALLOW_WITH_WARNING'
  | 'REVIEW'
  | 'BLOCK';

export type ModerationStatus =
  | 'APPROVED'
  | 'PENDING_REVIEW'
  | 'BLOCKED'
  | 'WARNING_ISSUED';

export type UserRestrictionType =
  | 'WARNING'
  | 'MUTED_24H'
  | 'MUTED_7D'
  | 'SUSPENDED_CHAT';

export interface ModerationContext {
  userId: string;
  circleId: string;
  messageType: 'TEXT';
  senderName?: string;
  recentMessages?: {
    senderName: string;
    content: string;
    createdAt: string;
  }[];
}

export type ClassifierIdentifier = 'RULE_ENGINE_V1';

export interface ModerationResult {
  decision: ModerationDecision;
  riskScore: number; // 0.00 to 1.00
  categories: ModerationCategory[];
  reason: string;
  isReligiousEducationalContext: boolean;
  classifierId: ClassifierIdentifier;
  matchedRuleSnippets?: string[];
  latencyMs?: number;
}

export interface IModerationClassifier {
  classify(content: string, context: ModerationContext): Promise<ModerationResult>;
}

export interface ModerationPolicyOutcome {
  decision: ModerationDecision;
  moderationStatus: ModerationStatus;
  riskScore: number;
  categories: ModerationCategory[];
  reason: string;
  userFacingMessage?: string;
  requiresAdminReview: boolean;
  shouldStoreMessage: boolean;
}

export interface UserRestrictionRecord {
  id: string;
  userId: string;
  circleId?: string | null;
  restrictionType: UserRestrictionType;
  reason: string;
  issuedBy: string;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ModerationEventRecord {
  id: string;
  messageId?: string | null;
  circleId: string;
  userId: string;
  decision: ModerationDecision;
  riskScore: number;
  categories: string[];
  reason: string;
  messageSnippet: string;
  classifierId: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'DISMISSED' | 'ESCALATED';
  createdAt: string;
}

export interface ModerationReportRecord {
  id: string;
  circleId: string;
  messageId: string;
  reportedUserId: string;
  reporterUserId: string;
  category: ModerationCategory;
  description?: string | null;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}


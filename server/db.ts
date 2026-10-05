import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getTodayDateString, getYesterdayDateString, getGracePeriodInfo } from './timezone.js';
import { pool, query, getClient } from './pg.js';
import { CommissionPolicy, MerchantVerificationRecord } from '../src/types.js';
import { NotificationService } from './services/notificationService.js';

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // 1. Convert Bangla numerals to ASCII digits
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let str = String(phone);
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(banglaDigits[i], String(i));
  }

  // 2. Extract digits only
  let digits = str.replace(/\D/g, '');

  // 3. Normalize international prefixes (008801..., 8801..., 17...)
  if (digits.startsWith('008801') && digits.length === 15) {
    digits = digits.slice(4);
  } else if (digits.startsWith('8801') && digits.length === 13) {
    digits = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  return digits;
}

export function generateSecureId(prefix: string, bytes = 4): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(bytes).toString('hex').toUpperCase()}`;
}

export function generateSecureSecret(prefix = 'SEC_', bytes = 8): string {
  return `${prefix}${crypto.randomBytes(bytes).toString('hex').toUpperCase()}`;
}

export interface UserRecord {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  gender: 'male' | 'female' | 'MALE' | 'FEMALE' | string;
  age?: number;
  dateOfBirth?: string;
  maritalStatus?: string;
  district?: string;
  upazila?: string;
  address?: string;
  isVerified?: boolean;
  photoUrl?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
}

export interface MosqueRecord {
  id: string;
  name: string;
  nameBn: string;
  address: string;
  area: string;
  district: string;
  description?: string;
  qrIdentifier: string;
  status: 'active' | 'pending' | 'rejected' | 'inactive';
  createdAt: string;
  imamName?: string;
  contactNumber?: string;
  latitude?: number;
  longitude?: number;
  verificationRadius?: number;
  imageUrl?: string;
  imamImageUrl?: string;
  requestedByUserId?: string;
  requestedByName?: string;
  requestedByPhone?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  updatedAt?: string;
}

export interface PrayerAttendanceRecord {
  id: string;
  userId: string;
  mosqueId: string;
  mosqueName: string;
  prayerType: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  date: string; // YYYY-MM-DD
  verifiedAt: string; // ISO string
  status: string; // e.g. 'verified', 'quarantined', 'approved', 'rejected'
  qrPayload: string;
  riskScore?: number;
  securityStatus?: string;
  riskReasons?: string;
  scannedAtOriginal?: string;
}

export interface OtpRecord {
  identifier: string; // phone or email
  code: string;
  purpose: 'REGISTRATION_VERIFICATION' | 'PASSWORD_RESET';
  expiresAt: number;
  attempts: number;
  registrationData?: {
    fullName: string;
    phone: string;
    email?: string;
    gender: string;
    age?: number;
    dateOfBirth?: string;
    maritalStatus?: string;
    passwordHash: string;
  };
}

export type TokenType = 'GOLD' | 'SILVER' | 'BRONZE';
export type TokenStatus = 'AVAILABLE' | 'USED' | 'PENDING_REDEMPTION';

export interface TokenRecord {
  id: string;
  userId: string;
  tokenType: TokenType;
  status: TokenStatus;
  earnedDate: string; // YYYY-MM-DD (Bangladesh Standard Time)
  createdAt: string;  // ISO string
  usedAt: string | null; // ISO string when redeemed
  redemptionRef: string | null; // Redemption tracking reference
  sourcePrayerCount: number; // 3, 4, or 5
  isDonated?: boolean;
  donatedAt?: string | null;
  earnedMosqueId?: string | null;
  earnedMosqueName?: string | null;
  donatedAmount?: number;
  discountAmount?: number;
}

export type ShopStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';

export interface ShopRecord {
  id: string;
  name: string;
  nameBn: string;
  ownerId: string;
  phone: string;
  address: string;
  area: string;
  district: string;
  upazilaThana?: string;
  upazila?: string;
  businessType?: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
  locationUpdatedAt?: string;
  distanceKm?: number;
  category: string;
  description: string;
  logoUrl?: string;
  photoUrl?: string;
  openingHours: string;
  status: ShopStatus;
  qrIdentifier: string;
  qrSecret: string;
  goldDiscount: number;
  silverDiscount: number;
  bronzeDiscount: number;
  pendingGoldDiscount?: number;
  pendingSilverDiscount?: number;
  pendingBronzeDiscount?: number;
  commissionRate: number;
  averageRating?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ReviewRecord {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  rating: number;
  comment: string;
  reply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductReviewRecord {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export type MerchantRole = 'MERCHANT' | 'SHOP_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

export interface MerchantRecord {
  id: string;
  name: string;
  phone: string;
  pin: string; // Hashed PIN using bcrypt
  shopId: string;
  role: MerchantRole;
  status: 'active' | 'suspended' | 'inactive' | 'deleted';
  tokenVersion?: number;
  createdAt: string;
}

export interface GlobalConfigRecord {
  goldDiscountRate: number;
  silverDiscountRate: number;
  bronzeDiscountRate: number;
  updatedAt: string;
}

export interface RedemptionRecord {
  id: string;
  tokenId: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopId: string;
  shopName: string;
  merchantId: string;
  tokenType: TokenType;
  discountPercentage: number;
  discountRateSnapshot: number;
  purchaseAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
  commissionRate: number;
  commissionRateSnapshot: number;
  grossCommissionAmount: number;
  caveCompanionsNetIncome: number;
  merchantPayoutAmount: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  createdAt: string;
  redemptionDate: string;
  isDonated?: boolean;
  donatedAmount?: number;
  earnedMosqueId?: string | null;
  earnedMosqueName?: string | null;
  commissionPaymentStatus?: 'unpaid' | 'paid';
  merchantHistoryDeleted?: boolean;
}

export interface TokenRedemptionRequestRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopId: string;
  shopName: string;
  merchantId?: string;
  tokenId: string;
  tokenType: TokenType;
  isDonated: boolean;
  purchaseAmount: number;
  discountPercentage: number;
  discountAmount: number;
  finalPayableAmount: number;
  donatedAmount: number;
  commissionRate: number;
  grossCommissionAmount: number;
  caveCompanionsNetIncome: number;
  merchantPayoutAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  rejectionReason?: string | null;
  redemptionId?: string | null;
  verificationId?: string | null;
  createdAt: string;
  expiresAt: string;
  processedAt?: string | null;
  processedBy?: string | null;
  redemption?: RedemptionRecord | null;
}

export type NotificationType =
  | 'PRAYER_VERIFIED'
  | 'TOKEN_EARNED'
  | 'TOKEN_REDEEMED'
  | 'REDEMPTION_FAILED'
  | 'SECURITY'
  | 'ANNOUNCEMENT'
  | 'SYSTEM_UPDATE'
  | 'CIRCLE_INVITE'
  | 'CIRCLE_MESSAGE'
  | 'MODERATION_WARNING'
  | 'MODERATION_MUTE'
  | 'MODERATION_WITHDRAWN'
  | string;

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  relatedId?: string | null;
  metadata?: Record<string, any> | null;
}

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicketRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  adminResponse?: string | null;
}

export interface HelplineSettingsRecord {
  id: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  supportMessage: string;
  isWhatsappEnabled: boolean;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type AdminRoleType = 'MASTER_ADMIN' | 'ADMIN' | 'SUB_ADMIN' | 'CUSTOM';

export type AdminPermission =
  | 'MOSQUE_VIEW'
  | 'MOSQUE_CREATE'
  | 'MOSQUE_EDIT'
  | 'MOSQUE_DELETE'
  | 'SHOP_VIEW'
  | 'SHOP_CREATE'
  | 'SHOP_EDIT'
  | 'SHOP_DELETE'
  | 'SHOP_DISCOUNT_APPROVE'
  | 'PRODUCT_APPROVE'
  | 'PRODUCT_MANAGE'
  | 'USER_VIEW'
  | 'USER_EDIT'
  | 'USER_STATUS'
  | 'USER_DELETE'
  | 'SUPPORT_VIEW'
  | 'SUPPORT_REPLY'
  | 'ADMIN_VIEW'
  | 'ADMIN_CREATE'
  | 'ADMIN_EDIT'
  | 'ADMIN_DELETE'
  | 'NASIHA_VIEW'
  | 'NASIHA_MANAGE'
  | 'HELPLINE_VIEW'
  | 'HELPLINE_MANAGE'
  | 'ORDER_VIEW'
  | 'ORDER_MANAGE'
  | 'ACCOUNTS_VIEW'
  | 'ACCOUNTS_MANAGE'
  | 'DELIVERY_VIEW'
  | 'DELIVERY_MANAGE'
  | 'ADS_VIEW'
  | 'ADS_MANAGE'
  | 'COMMISSION_VIEW'
  | 'COMMISSION_MANAGE'
  | 'NOTIFICATION_VIEW'
  | 'NOTIFICATION_MANAGE'
  | 'ANALYTICS_VIEW'
  | 'MODERATION_VIEW'
  | 'MODERATION_MANAGE'
  | 'SYSTEM_VIEW'
  | 'AUDIT_VIEW';

export interface AdminAccountRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AdminRoleType;
  permissions: AdminPermission[];
  status: 'active' | 'suspended';
  createdAt: string;
  sessionToken?: string;
}

export interface NasihaRecord {
  id: string;
  textBn: string;
  sourceBn: string;
  active: boolean;
  createdAt: string;
}

export interface BlogRecord {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  author: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: 'amount' | 'percentage';
  discountValue: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}


// Row mappers to convert PostgreSQL snake_case to CamelCase interfaces
function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || undefined,
    passwordHash: row.password_hash || undefined,
    gender: row.gender || 'male',
    age: row.age != null ? Number(row.age) : undefined,
    dateOfBirth: row.date_of_birth ? (row.date_of_birth instanceof Date ? row.date_of_birth.toISOString().split('T')[0] : String(row.date_of_birth)) : undefined,
    maritalStatus: row.marital_status || undefined,
    district: row.district || undefined,
    upazila: row.upazila || undefined,
    address: row.address || undefined,
    isVerified: row.is_verified,
    photoUrl: row.photo_url || undefined,
    status: row.status || 'active',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : String(row.last_login_at)
  };
}

function mapMosqueRow(row: any): MosqueRecord {
  return {
    id: row.id,
    name: row.name,
    nameBn: row.name_bn,
    address: row.address,
    area: row.area,
    district: row.district,
    description: row.description || undefined,
    qrIdentifier: row.qr_identifier,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    imamName: row.imam_name || undefined,
    contactNumber: row.contact_number || undefined,
    latitude: row.latitude != null ? Number(row.latitude) : 0,
    longitude: row.longitude != null ? Number(row.longitude) : 0,
    verificationRadius: row.verification_radius != null && Number(row.verification_radius) > 0 ? Number(row.verification_radius) : 75,
    imageUrl: row.image_url || undefined,
    imamImageUrl: row.imam_image_url || undefined,
    requestedByUserId: row.requested_by_user_id || undefined,
    requestedByName: row.requested_by_name || undefined,
    requestedByPhone: row.requested_by_phone || undefined,
    rejectionReason: row.rejection_reason || undefined,
    reviewedAt: row.reviewed_at ? (row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : String(row.reviewed_at)) : undefined,
    reviewedBy: row.reviewed_by || undefined,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : undefined
  };
}

function mapAttendanceRow(row: any): PrayerAttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    mosqueId: row.mosque_id,
    mosqueName: row.mosque_name,
    prayerType: row.prayer_type,
    date: row.date,
    verifiedAt: row.verified_at instanceof Date ? row.verified_at.toISOString() : String(row.verified_at),
    status: row.status,
    qrPayload: row.qr_payload || '',
    riskScore: row.risk_score != null ? Number(row.risk_score) : undefined,
    securityStatus: row.security_status || undefined,
    riskReasons: row.risk_reason || undefined
  };
}

function mapTokenRow(row: any): TokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenType: row.token_type,
    status: row.status,
    earnedDate: row.earned_date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    usedAt: row.used_at ? (row.used_at instanceof Date ? row.used_at.toISOString() : String(row.used_at)) : null,
    redemptionRef: row.redemption_ref || null,
    sourcePrayerCount: Number(row.source_prayer_count || 3),
    isDonated: row.is_donated === true || row.is_donated === 'true',
    donatedAt: row.donated_at ? (row.donated_at instanceof Date ? row.donated_at.toISOString() : String(row.donated_at)) : null,
    earnedMosqueId: row.earned_mosque_id || null,
    earnedMosqueName: row.earned_mosque_name || null,
    donatedAmount: row.donated_amount != null ? Number(row.donated_amount) : undefined,
    discountAmount: row.discount_amount != null ? Number(row.discount_amount) : undefined
  };
}

function mapShopRow(row: any): ShopRecord {
  return {
    id: row.id,
    name: row.name,
    nameBn: row.name_bn,
    ownerId: row.owner_id,
    phone: row.phone,
    address: row.address,
    area: row.area,
    district: row.district,
    upazilaThana: row.upazila_thana || row.upazila || row.area || undefined,
    upazila: row.upazila || row.upazila_thana || undefined,
    businessType: row.business_type || row.category || undefined,
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    locationAddress: row.location_address || undefined,
    locationUpdatedAt: row.location_updated_at instanceof Date ? row.location_updated_at.toISOString() : (row.location_updated_at ? String(row.location_updated_at) : undefined),
    category: row.category,
    description: row.description || '',
    logoUrl: row.logo_url || undefined,
    photoUrl: row.photo_url || undefined,
    openingHours: row.opening_hours || '',
    status: row.status,
    qrIdentifier: row.qr_identifier,
    qrSecret: row.qr_secret,
    goldDiscount: Number(row.gold_discount || 15),
    silverDiscount: Number(row.silver_discount || 10),
    bronzeDiscount: Number(row.bronze_discount || 7),
    pendingGoldDiscount: row.pending_gold_discount != null ? Number(row.pending_gold_discount) : undefined,
    pendingSilverDiscount: row.pending_silver_discount != null ? Number(row.pending_silver_discount) : undefined,
    pendingBronzeDiscount: row.pending_bronze_discount != null ? Number(row.pending_bronze_discount) : undefined,
    commissionRate: Number(row.commission_rate || 3.0),
    averageRating: row.average_rating != null ? Number(row.average_rating) : (row.averageRating != null ? Number(row.averageRating) : undefined),
    totalReviews: row.total_reviews != null ? Number(row.total_reviews) : (row.totalReviews != null ? Number(row.totalReviews) : undefined),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    updatedBy: row.updated_by || undefined
  };
}

function mapMerchantRow(row: any): MerchantRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    pin: row.pin,
    shopId: row.shop_id,
    role: row.role || 'MERCHANT',
    status: row.status || 'active',
    tokenVersion: row.token_version != null ? Number(row.token_version) : 1,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

function mapMerchantVerificationRow(row: any): MerchantVerificationRecord {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    shopId: row.shop_id,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email || undefined,
    shopName: row.shop_name,
    businessType: row.business_type,
    shopAddress: row.shop_address,
    district: row.district,
    upazilaThana: row.upazila_thana,
    latitude: row.latitude ? Number(row.latitude) : undefined,
    longitude: row.longitude ? Number(row.longitude) : undefined,
    shopPhotoUrl: row.shop_photo_url || undefined,
    businessDescription: row.business_description || undefined,
    nidNumber: row.nid_number || '',
    nidFrontUrl: row.nid_front_url || '',
    nidBackUrl: row.nid_back_url || '',
    ownerSelfieUrl: row.owner_selfie_url || '',
    tradeLicenseNumber: row.trade_license_number || '',
    tradeLicenseUrl: row.trade_license_url || '',
    tinNumber: row.tin_number || undefined,
    binVatNumber: row.bin_vat_number || undefined,
    agreementAccepted: Boolean(row.agreement_accepted),
    agreementAcceptedAt: row.agreement_accepted_at instanceof Date ? row.agreement_accepted_at.toISOString() : String(row.agreement_accepted_at || ''),
    agreementVersion: row.agreement_version || 'v1.0',
    acceptedTotalCommission: Number(row.accepted_total_commission != null ? row.accepted_total_commission : (row.shop_accepted_total_commission != null ? row.shop_accepted_total_commission : 10)),
    acceptedGoldUserBenefit: Number(row.accepted_gold_user_benefit != null ? row.accepted_gold_user_benefit : 5),
    acceptedGoldPlatformCommission: Number(row.accepted_gold_platform_commission != null ? row.accepted_gold_platform_commission : 5),
    acceptedSilverUserBenefit: Number(row.accepted_silver_user_benefit != null ? row.accepted_silver_user_benefit : 4),
    acceptedSilverPlatformCommission: Number(row.accepted_silver_platform_commission != null ? row.accepted_silver_platform_commission : 6),
    acceptedBronzeUserBenefit: Number(row.accepted_bronze_user_benefit != null ? row.accepted_bronze_user_benefit : 3),
    acceptedBronzePlatformCommission: Number(row.accepted_bronze_platform_commission != null ? row.accepted_bronze_platform_commission : 7),
    verificationStatus: row.verification_status || 'PENDING',
    merchantStatus: row.merchant_status || 'PENDING_VERIFICATION',
    correctionMessage: row.correction_message || undefined,
    requestedCorrectionFields: row.requested_correction_fields ? (typeof row.requested_correction_fields === 'string' ? JSON.parse(row.requested_correction_fields) : row.requested_correction_fields) : undefined,
    correctionHistory: row.correction_history ? (typeof row.correction_history === 'string' ? JSON.parse(row.correction_history) : row.correction_history) : undefined,
    rejectionReason: row.rejection_reason || undefined,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : String(row.submitted_at || ''),
    reviewedAt: row.reviewed_at ? (row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : String(row.reviewed_at)) : undefined,
    reviewedBy: row.reviewed_by || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
  };
}

function mapRedemptionRow(row: any): RedemptionRecord {
  const bill = Number(row.bill_amount || 0);
  const discountAmount = Number(row.discount_amount || 0);
  const commissionRate = Number(row.commission_rate || 0);
  const commissionAmountFromDb = Number(row.commission_amount || 0);
  
  // Backward compatibility: If new columns are NULL, calculate them
  const grossCommissionAmount = row.gross_commission_amount != null 
    ? Number(row.gross_commission_amount) 
    : Math.round((bill * commissionRate) / 100);
    
  const caveCompanionsNetIncome = row.cave_companions_net_income != null
    ? Number(row.cave_companions_net_income)
    : commissionAmountFromDb; // Historical meaning: commission_amount was net income

  return {
    id: row.id,
    tokenId: row.token_id,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    shopId: row.shop_id,
    shopName: row.shop_name,
    merchantId: row.merchant_id,
    tokenType: row.token_type,
    discountPercentage: Number(row.discount_percent || 0),
    discountRateSnapshot: Number(row.discount_percent || 0),
    purchaseAmount: bill,
    discountAmount: discountAmount,
    finalPayableAmount: Number(row.final_amount || 0),
    commissionRate: commissionRate,
    commissionRateSnapshot: commissionRate,
    grossCommissionAmount: grossCommissionAmount,
    caveCompanionsNetIncome: caveCompanionsNetIncome,
    merchantPayoutAmount: Number(row.merchant_payout_amount || 0),
    status: row.status || 'COMPLETED',
    createdAt: row.redeemed_at instanceof Date ? row.redeemed_at.toISOString() : String(row.redeemed_at),
    redemptionDate: row.date,
    isDonated: row.is_donated === true || row.is_donated === 'true',
    donatedAmount: (row.is_donated === true || row.is_donated === 'true') ? Number(row.donated_amount || 0) : 0,
    earnedMosqueId: (row.is_donated === true || row.is_donated === 'true') && (row.user_gender || row.gender || '').toLowerCase() !== 'female' ? (row.earned_mosque_id || null) : null,
    earnedMosqueName: (row.is_donated === true || row.is_donated === 'true') && (row.user_gender || row.gender || '').toLowerCase() !== 'female' ? (row.earned_mosque_name || null) : null,
    commissionPaymentStatus: row.commission_payment_status || 'unpaid',
    merchantHistoryDeleted: row.merchant_history_deleted === true || row.merchant_history_deleted === 'true'
  };
}

function mapTokenRedemptionRequestRow(row: any): TokenRedemptionRequestRecord {
  const bill = Number(row.purchase_amount || 0);
  const discountAmount = Number(row.discount_amount || 0);
  const commissionRate = Number(row.commission_rate || 0);
  const grossCommissionAmount = row.gross_commission_amount != null
    ? Number(row.gross_commission_amount)
    : Math.round((bill * commissionRate) / 100);
  const caveCompanionsNetIncome = row.cave_companions_net_income != null
    ? Number(row.cave_companions_net_income)
    : (grossCommissionAmount - discountAmount);

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    userPhone: row.user_phone || '',
    shopId: row.shop_id,
    shopName: row.shop_name || '',
    merchantId: row.merchant_id || undefined,
    tokenId: row.token_id,
    tokenType: row.token_type,
    isDonated: row.is_donated === true || row.is_donated === 'true',
    purchaseAmount: bill,
    discountPercentage: Number(row.discount_percent || 0),
    discountAmount: discountAmount,
    finalPayableAmount: Number(row.final_payable || 0),
    donatedAmount: (row.is_donated === true || row.is_donated === 'true') ? Number(row.donated_amount || 0) : 0,
    commissionRate: commissionRate,
    grossCommissionAmount: grossCommissionAmount,
    caveCompanionsNetIncome: caveCompanionsNetIncome,
    merchantPayoutAmount: Number(row.merchant_payout_amount || row.final_payable || 0),
    status: row.status || 'PENDING',
    rejectionReason: row.rejection_reason || null,
    redemptionId: row.redemption_id || null,
    verificationId: row.verification_id || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    processedAt: row.processed_at ? (row.processed_at instanceof Date ? row.processed_at.toISOString() : String(row.processed_at)) : null,
    processedBy: row.processed_by || null
  };
}

function mapNotificationRow(row: any): NotificationRecord {
  let parsedMeta = row.metadata;
  if (typeof parsedMeta === 'string') {
    try {
      parsedMeta = JSON.parse(parsedMeta);
    } catch {
      parsedMeta = {};
    }
  } else if (!parsedMeta) {
    parsedMeta = {};
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || row.title_bn,
    message: row.message || row.message_bn,
    type: row.type as NotificationType,
    read: row.read,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    relatedId: parsedMeta?.relatedId || parsedMeta?.invitationId || null,
    metadata: parsedMeta
  };
}

function mapSupportTicketRow(row: any): SupportTicketRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    subject: row.subject,
    message: row.message,
    status: row.status as SupportTicketStatus,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    adminResponse: row.admin_notes || undefined
  };
}

function mapAdminAccountRow(row: any): AdminAccountRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    passwordHash: row.password_hash || '',
    role: row.role as AdminRoleType,
    permissions: Array.isArray(row.permissions) ? row.permissions : (typeof row.permissions === 'string' ? JSON.parse(row.permissions) : []),
    status: row.status as 'active' | 'suspended',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

function mapNasihaRow(row: any): NasihaRecord {
  return {
    id: row.id,
    textBn: row.text_bn,
    sourceBn: row.source_bn,
    active: row.active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

function mapBlogRow(row: any): BlogRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url || undefined,
    videoUrl: row.video_url || undefined,
    author: row.author || 'Admin',
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : undefined
  };
}


export interface TransactionLogEntry {
  id: string;
  timestamp: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  status: 'SUCCESS' | 'FAILURE';
  commit: 'COMMITTED' | 'ROLLED_BACK';
  details?: string;
}

const recentTransactions: TransactionLogEntry[] = [];
const MAX_TRANSACTION_LOGS = 100;

function logDbTransaction(operation: 'INSERT' | 'UPDATE' | 'DELETE', table: string, status: 'SUCCESS' | 'FAILURE', details?: string) {
  const timestamp = new Date().toISOString();
  const commit = status === 'SUCCESS' ? 'COMMITTED' : 'ROLLED_BACK';
  const entry: TransactionLogEntry = {
    id: generateSecureId('TXN'),
    timestamp,
    operation,
    table,
    status,
    commit,
    details
  };
  recentTransactions.unshift(entry);
  if (recentTransactions.length > MAX_TRANSACTION_LOGS) {
    recentTransactions.pop();
  }
  console.log(`[DB TRANSACTION] TIME: ${timestamp} | OPERATION: ${operation} | TABLE: ${table} | STATUS: ${status} | COMMIT: ${commit}${details ? ` | DETAILS: ${details}` : ''}`);
}

class Database {
  // =========================================================================
  // RIDER MANAGEMENT
  // =========================================================================

  async getRiderById(id: string): Promise<any | null> {
    const res = await query("SELECT * FROM riders WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return this.mapRiderRow(res.rows[0]);
  }

  async getRiderByPhone(phone: string): Promise<any | null> {
    const res = await query("SELECT * FROM riders WHERE phone = $1", [phone.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapRiderRow(res.rows[0]);
  }

  mapRiderRow(row: any): any {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      nidNumber: row.nid_number,
      vehicleType: row.vehicle_type || 'BICYCLE',
      photoUrl: row.photo_url,
      nidFrontUrl: row.nid_front_url,
      nidBackUrl: row.nid_back_url,
      status: row.status || 'OFFLINE',
      availabilityStatus: row.status || 'OFFLINE',
      approvalStatus: row.approval_status || 'PENDING',
      rejectionReason: row.rejection_reason,
      currentLatitude: row.current_latitude ? Number(row.current_latitude) : null,
      currentLongitude: row.current_longitude ? Number(row.current_longitude) : null,
      lastLocationUpdatedAt: row.last_location_updated_at ? new Date(row.last_location_updated_at).toISOString() : null,
      totalDeliveries: Number(row.total_deliveries || 0),
      totalDelivered: Number(row.total_delivered || 0),
      totalDone: Number(row.total_done || 0),
      totalProductBack: Number(row.total_product_back || 0),
      totalEarnings: Number(row.total_earnings || 0),
      approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
      approvedBy: row.approved_by,
      tokenVersion: row.token_version != null ? Number(row.token_version) : 1,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async createRider(data: {
    fullName: string;
    phone: string;
    pinCode: string;
    nidNumber?: string;
    vehicleType?: string;
    photoUrl?: string;
    nidFrontUrl?: string;
    nidBackUrl?: string;
  }): Promise<any> {
    const cleanPhone = data.phone.trim();
    const existing = await this.getRiderByPhone(cleanPhone);
    if (existing) {
      throw new Error('এই ফোন নম্বর দিয়ে ইতোমধ্যে একজন রাইডার নিবন্ধিত রয়েছে।');
    }

    const id = 'RDR-' + crypto.randomUUID();
    const pinHash = bcrypt.hashSync(data.pinCode.trim(), 10);

    const res = await query(`
      INSERT INTO riders (
        id, full_name, phone, password_hash, pin_code, nid_number, vehicle_type,
        photo_url, nid_front_url, nid_back_url, status, approval_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OFFLINE', 'PENDING', NOW(), NOW()
      ) RETURNING *
    `, [
      id,
      data.fullName.trim(),
      cleanPhone,
      pinHash,
      data.pinCode.trim(),
      data.nidNumber?.trim() || null,
      data.vehicleType || 'BICYCLE',
      data.photoUrl || null,
      data.nidFrontUrl || null,
      data.nidBackUrl || null
    ]);

    await this.logRiderActivity(id, null, 'REGISTER', { phone: cleanPhone, fullName: data.fullName });
    return this.mapRiderRow(res.rows[0]);
  }

  async authenticateRider(phone: string, pin: string): Promise<any | null> {
    const res = await query("SELECT * FROM riders WHERE phone = $1", [phone.trim()]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const cleanPin = pin.trim();
    let isValid = false;
    let isLegacy = false;

    if (row.password_hash && (row.password_hash.startsWith('$2a$') || row.password_hash.startsWith('$2b$'))) {
      isValid = bcrypt.compareSync(cleanPin, row.password_hash);
    } else {
      const shaHash = crypto.createHash('sha256').update(cleanPin).digest('hex');
      if (row.password_hash === shaHash || row.pin_code === cleanPin) {
        isValid = true;
        isLegacy = true;
      }
    }

    if (isValid) {
      if (isLegacy) {
        const upgradedHash = bcrypt.hashSync(cleanPin, 10);
        query("UPDATE riders SET password_hash = $1 WHERE id = $2", [upgradedHash, row.id]).catch(err => {
          console.error('[DB] Failed to auto-upgrade rider PIN hash to bcrypt:', err);
        });
      }
      return this.mapRiderRow(row);
    }
    return null;
  }

  async updateRiderStatus(id: string, status: string, lat?: number, lng?: number): Promise<void> {
    const queryText = lat !== undefined && lng !== undefined 
        ? "UPDATE riders SET status = $1, current_latitude = $2, current_longitude = $3, last_location_updated_at = NOW(), updated_at = NOW() WHERE id = $4"
        : "UPDATE riders SET status = $1, updated_at = NOW() WHERE id = $2";
    const params = lat !== undefined && lng !== undefined ? [status, lat, lng, id] : [status, id];
    await query(queryText, params);
  }

  async logRiderActivity(riderId: string, orderId: string | null, action: string, details?: any): Promise<void> {
    const id = 'RAL-' + crypto.randomUUID();
    await query(`
      INSERT INTO rider_activity_logs (id, rider_id, order_id, action, details, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [id, riderId, orderId, action, details ? JSON.stringify(details) : null]);
  }

  async getPendingRiders(): Promise<any[]> {
    const res = await query(`
      SELECT * FROM riders 
      WHERE approval_status = 'PENDING' 
      ORDER BY created_at ASC
    `);
    return res.rows.map(r => this.mapRiderRow(r));
  }

  async getAdminRiders(filters?: { status?: string; approvalStatus?: string; search?: string }): Promise<any[]> {
    let sql = `SELECT * FROM riders WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filters?.approvalStatus && filters.approvalStatus !== 'ALL') {
      sql += ` AND approval_status = $${idx++}`;
      params.push(filters.approvalStatus);
    }
    if (filters?.status && filters.status !== 'ALL') {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      sql += ` AND (full_name ILIKE $${idx} OR phone ILIKE $${idx} OR nid_number ILIKE $${idx})`;
      params.push(`%${filters.search.trim()}%`);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;
    const res = await query(sql, params);
    return res.rows.map(r => this.mapRiderRow(r));
  }

  async approveRider(riderId: string, adminId: string): Promise<any> {
    const res = await query(`
      UPDATE riders 
      SET approval_status = 'APPROVED', approved_by = $1, approved_at = NOW(), status = 'AVAILABLE', updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [adminId, riderId]);
    if (res.rows.length === 0) throw new Error('রাইডার খুঁজে পাওয়া যায়নি।');
    await this.logRiderActivity(riderId, null, 'ADMIN_APPROVE', { adminId });
    return this.mapRiderRow(res.rows[0]);
  }

  async rejectRider(riderId: string, reason: string, adminId: string): Promise<any> {
    const res = await query(`
      UPDATE riders 
      SET approval_status = 'REJECTED', rejection_reason = $1, approved_by = $2, status = 'OFFLINE', updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [reason, adminId, riderId]);
    if (res.rows.length === 0) throw new Error('রাইডার খুঁজে পাওয়া যায়নি।');
    await this.logRiderActivity(riderId, null, 'ADMIN_REJECT', { adminId, reason });
    return this.mapRiderRow(res.rows[0]);
  }

  async suspendRider(riderId: string, adminId: string): Promise<any> {
    const res = await query(`
      UPDATE riders 
      SET approval_status = 'SUSPENDED', status = 'OFFLINE', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [riderId]);
    if (res.rows.length === 0) throw new Error('রাইডার খুঁজে পাওয়া যায়নি।');
    await this.logRiderActivity(riderId, null, 'ADMIN_SUSPEND', { adminId });
    return this.mapRiderRow(res.rows[0]);
  }

  async reactivateRider(riderId: string, adminId: string): Promise<any> {
    const res = await query(`
      UPDATE riders 
      SET approval_status = 'APPROVED', status = 'AVAILABLE', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [riderId]);
    if (res.rows.length === 0) throw new Error('রাইডার খুঁজে পাওয়া যায়নি।');
    await this.logRiderActivity(riderId, null, 'ADMIN_REACTIVATE', { adminId });
    return this.mapRiderRow(res.rows[0]);
  }

  async deleteRider(riderId: string, adminId: string): Promise<void> {
    await this.logRiderActivity(riderId, null, 'ADMIN_DELETE', { adminId });
    await query(`DELETE FROM riders WHERE id = $1`, [riderId]);
  }

  async getRiderOverallStats(): Promise<any> {
    const countRes = await query(`
      SELECT 
        COUNT(*) as total_riders,
        COUNT(*) FILTER (WHERE approval_status = 'APPROVED') as approved_riders,
        COUNT(*) FILTER (WHERE approval_status = 'PENDING') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as active_online,
        SUM(total_deliveries) as total_deliveries,
        SUM(total_delivered) as total_delivered,
        SUM(total_done) as total_done,
        SUM(total_product_back) as total_product_back,
        SUM(total_earnings) as total_earnings
      FROM riders
    `);

    const row = countRes.rows[0] || {};
    const totalDeliveries = Number(row.total_deliveries || 0);
    const totalDone = Number(row.total_done || 0);
    const successRate = totalDeliveries > 0 ? Math.round((totalDone / totalDeliveries) * 100) : 100;

    return {
      totalRiders: Number(row.total_riders || 0),
      approvedRiders: Number(row.approved_riders || 0),
      pendingRequests: Number(row.pending_requests || 0),
      activeOnline: Number(row.active_online || 0),
      totalDeliveries,
      totalDelivered: Number(row.total_delivered || 0),
      totalDone,
      totalProductBack: Number(row.total_product_back || 0),
      totalEarnings: Number(row.total_earnings || 0),
      successRate
    };
  }

  async getRiderDeliveryRequests(riderId: string): Promise<any[]> {
    const riderRes = await query("SELECT current_latitude, current_longitude, status, approval_status FROM riders WHERE id = $1", [riderId]);
    if (riderRes.rows.length === 0 || riderRes.rows[0].approval_status !== 'APPROVED') return [];

    const ordersRes = await query(`
      SELECT o.*, 
        (SELECT json_agg(json_build_object(
          'id', oi.id, 
          'productId', oi.product_id, 
          'productName', oi.product_name,
          'shopId', oi.shop_id, 
          'shopName', COALESCE(s.name, oi.shop_name), 
          'shopNameBn', COALESCE(s.name_bn, oi.shop_name),
          'shopPhone', COALESCE(s.phone, ''),
          'shopAddress', COALESCE(s.address, ''),
          'shopArea', COALESCE(s.area, ''),
          'shopDistrict', COALESCE(s.district, ''),
          'shopLatitude', COALESCE(s.latitude, 0),
          'shopLongitude', COALESCE(s.longitude, 0),
          'quantity', oi.quantity,
          'originalPrice', oi.original_price, 
          'customerProductPayable', oi.customer_product_payable,
          'weightKg', COALESCE(p.weight_kg, 1.0)
        )) FROM order_items oi 
           LEFT JOIN shops s ON oi.shop_id = s.id
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.order_type = 'LOCAL' 
        AND (o.rider_id IS NULL OR o.rider_id = '')
        AND (o.status = 'PENDING' OR o.status = 'APPROVED')
        AND (o.rider_status = 'PENDING' OR o.rider_status IS NULL)
      ORDER BY o.created_at DESC
      LIMIT 25
    `);

    const rLat = riderRes.rows[0].current_latitude ? Number(riderRes.rows[0].current_latitude) : null;
    const rLng = riderRes.rows[0].current_longitude ? Number(riderRes.rows[0].current_longitude) : null;

    const availableRequests = [];
    for (const ord of ordersRes.rows) {
      const decRes = await query(
        "SELECT status FROM rider_delivery_requests WHERE rider_id = $1 AND order_id = $2 AND status = 'DECLINED'",
        [riderId, ord.id]
      );
      if (decRes.rows.length > 0) continue;

      let pickupDistanceKm = 0;
      if (rLat && rLng && ord.latitude && ord.longitude) {
        pickupDistanceKm = Number((this.calcDistance(rLat, rLng, Number(ord.latitude), Number(ord.longitude))).toFixed(1));
      }

      const itemsList = ord.items || [];
      availableRequests.push({
        id: ord.id,
        orderId: ord.id,
        orderNumber: ord.order_number,
        customerName: ord.customer_name,
        customerPhone: ord.customer_phone,
        deliveryAddress: ord.delivery_address,
        district: ord.district,
        upazila: ord.upazila,
        fullAddress: ord.full_address || ord.delivery_address,
        latitude: ord.latitude ? Number(ord.latitude) : undefined,
        longitude: ord.longitude ? Number(ord.longitude) : undefined,
        pickupDistanceKm,
        totalDeliveryDistanceKm: ord.distance_km || 2.5,
        riderFee: Number(ord.rider_fee || ord.delivery_charge || 40),
        totalCodAmount: Number(ord.total_cod_amount || 0),
        productTotalOriginal: Number(ord.product_total_original || 0),
        productTotalDiscount: Number(ord.product_total_discount || 0),
        productTotalPayable: Number(ord.product_total_payable || 0),
        deliveryCharge: Number(ord.delivery_charge || 0),
        paymentMethod: ord.payment_method,
        createdAt: ord.created_at,
        items: itemsList,
        shopName: itemsList[0] ? itemsList[0].shopName : 'শপ',
        shopAddress: itemsList[0] ? itemsList[0].shopAddress : '',
        shopPhone: itemsList[0] ? itemsList[0].shopPhone : '',
        shopDistrict: itemsList[0] ? itemsList[0].shopDistrict : '',
        shopThana: itemsList[0] ? itemsList[0].shopArea : ''
      });
    }

    return availableRequests;
  }

  async acceptRiderDeliveryOrder(riderId: string, orderId: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(`
        SELECT * FROM orders WHERE id = $1 FOR UPDATE
      `, [orderId]);

      if (orderRes.rows.length === 0) throw new Error('অর্ডারটি খুঁজে পাওয়া যায়নি।');
      const ord = orderRes.rows[0];

      if (ord.rider_id && ord.rider_id !== riderId) {
        throw new Error('এই অর্ডারটি ইতোমধ্যে অন্য একজন রাইডার গ্রহণ করেছেন।');
      }

      await client.query(`
        UPDATE orders 
        SET rider_id = $1, rider_status = 'ACCEPTED', rider_accepted_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [riderId, orderId]);

      await client.query(`
        UPDATE riders SET status = 'BUSY', total_deliveries = total_deliveries + 1, updated_at = NOW() WHERE id = $1
      `, [riderId]);

      await client.query(`
        INSERT INTO rider_delivery_requests (id, order_id, rider_id, status, responded_at)
        VALUES ($1, $2, $3, 'ACCEPTED', NOW())
        ON CONFLICT (order_id, rider_id) 
        DO UPDATE SET status = 'ACCEPTED', responded_at = NOW()
      `, ['RDR-REQ-' + crypto.randomUUID(), orderId, riderId]);

      await client.query('COMMIT');
      await this.logRiderActivity(riderId, orderId, 'ACCEPT_ORDER');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async declineRiderDeliveryOrder(riderId: string, orderId: string): Promise<void> {
    await query(`
      INSERT INTO rider_delivery_requests (id, order_id, rider_id, status, responded_at)
      VALUES ($1, $2, $3, 'DECLINED', NOW())
      ON CONFLICT (order_id, rider_id) 
      DO UPDATE SET status = 'DECLINED', responded_at = NOW()
    `, ['RDR-REQ-' + crypto.randomUUID(), orderId, riderId]);
    await this.logRiderActivity(riderId, orderId, 'DECLINE_ORDER');
  }

  async getRiderActiveOrder(riderId: string): Promise<any | null> {
    const res = await query(`
      SELECT o.*,
        (SELECT json_agg(json_build_object(
          'id', oi.id, 
          'productId', oi.product_id, 
          'productName', oi.product_name,
          'shopId', oi.shop_id, 
          'shopName', COALESCE(s.name, oi.shop_name), 
          'shopNameBn', COALESCE(s.name_bn, oi.shop_name),
          'shopPhone', COALESCE(s.phone, ''),
          'shopAddress', COALESCE(s.address, ''),
          'shopArea', COALESCE(s.area, ''),
          'shopDistrict', COALESCE(s.district, ''),
          'shopLatitude', COALESCE(s.latitude, 0),
          'shopLongitude', COALESCE(s.longitude, 0),
          'quantity', oi.quantity,
          'originalPrice', oi.original_price, 
          'customerProductPayable', oi.customer_product_payable,
          'weightKg', COALESCE(p.weight_kg, 1.0),
          'shopPickupOtp', oi.shop_pickup_otp,
          'shopPickedUp', oi.shop_picked_up,
          'shopDeliveryOtp', oi.shop_delivery_otp,
          'shopDelivered', oi.shop_delivered
        )) FROM order_items oi 
           LEFT JOIN shops s ON oi.shop_id = s.id
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.rider_id = $1 
        AND (o.rider_status IN ('ACCEPTED', 'PICKED_UP') OR (o.rider_status = 'DELIVERED' AND o.settlement_status = 'PENDING'))
      ORDER BY o.rider_accepted_at DESC LIMIT 1
    `, [riderId]);

    if (res.rows.length === 0) return null;
    const ord = this.mapOrderRow(res.rows[0]);
    if (ord && ord.items && ord.items.length > 0) {
      ord.shopName = ord.items[0].shopName;
      ord.shopPhone = ord.items[0].shopPhone;
      ord.shopAddress = ord.items[0].shopAddress;
      ord.shopArea = ord.items[0].shopArea;
      ord.shopDistrict = ord.items[0].shopDistrict;
      ord.shopLatitude = ord.items[0].shopLatitude;
      ord.shopLongitude = ord.items[0].shopLongitude;
    }
    return ord;
  }

  async pickupRiderOrder(riderId: string, orderId: string, pickupOtp?: string, shopId?: string): Promise<any> {
    const ord = await this.getOrderById(orderId);
    if (!ord) throw new Error('অর্ডারটি পাওয়া যায়নি।');
    if (ord.riderId !== riderId) throw new Error('আপনি এই অর্ডারে নিয়োজিত রাইডার নন।');
    if (ord.riderStatus !== 'ACCEPTED') throw new Error(`অর্ডারের বর্তমান অবস্থা (${ord.riderStatus}) পিকআপযোগ্য নয়।`);

    // Fetch order items to check shop status
    const itemsRes = await query(`SELECT id, shop_id, shop_pickup_otp, shop_picked_up FROM order_items WHERE order_id = $1`, [orderId]);
    const items = itemsRes.rows;

    if (items.length === 0) {
      throw new Error('অর্ডারটিতে কোনো পণ্য পাওয়া যায়নি।');
    }

    // Determine target shop
    let targetShopId = shopId;
    if (!targetShopId) {
      // If shopId is not specified, check if the OTP matches an unpicked shop
      const trimmedOtp = pickupOtp?.trim();
      const match = items.find(it => !it.shop_picked_up && it.shop_pickup_otp && it.shop_pickup_otp.trim() === trimmedOtp);
      if (match) {
        targetShopId = match.shop_id;
      } else {
        // Fallback: if there's only one shop in the order, use that
        const uniqueShops = Array.from(new Set(items.map(it => it.shop_id)));
        if (uniqueShops.length === 1) {
          targetShopId = uniqueShops[0];
        } else {
          throw new Error('ভুল পিকআপ ওটিপি (Pickup OTP)। শপ থেকে সঠিক ওটিপি সংগ্রহ করুন।');
        }
      }
    }

    // Verify the OTP for this targetShopId
    const shopItems = items.filter(it => it.shop_id === targetShopId);
    if (shopItems.length === 0) {
      throw new Error('শপটি এই অর্ডারে খুঁজে পাওয়া যায়নি।');
    }

    const expectedOtp = shopItems[0].shop_pickup_otp || ord.pickupOtp;
    if (pickupOtp && expectedOtp && pickupOtp.trim() !== expectedOtp.trim()) {
      throw new Error('ভুল পিকআপ ওটিপি (Pickup OTP)। শপ থেকে সঠিক ওটিপি সংগ্রহ করুন।');
    }

    // Mark these items as picked up
    await query(`
      UPDATE order_items 
      SET shop_picked_up = TRUE 
      WHERE order_id = $1 AND shop_id = $2
    `, [orderId, targetShopId]);

    // Check if ALL shops/items in the order are now picked up
    const remainingItemsRes = await query(`
      SELECT COUNT(*) as count FROM order_items 
      WHERE order_id = $1 AND (shop_picked_up IS FALSE OR shop_picked_up IS NULL)
    `, [orderId]);
    
    const remainingCount = Number(remainingItemsRes.rows[0].count);

    if (remainingCount === 0) {
      // All shops picked up! Complete the step for the order
      await query(`
        UPDATE orders 
        SET rider_status = 'PICKED_UP', rider_picked_up_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [orderId]);
    }

    await this.logRiderActivity(riderId, orderId, `PICKED_UP_SHOP:${targetShopId}`);
    return await this.getOrderById(orderId);
  }

  async deliverRiderOrder(riderId: string, orderId: string, deliveryOtp?: string, shopId?: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const ordRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (ordRes.rows.length === 0) throw new Error('অর্ডারটি পাওয়া যায়নি।');
      const ord = ordRes.rows[0];

      if (ord.rider_id !== riderId) throw new Error('আপনি এই অর্ডারে নিয়োজিত রাইডার নন।');
      if (ord.rider_status !== 'PICKED_UP' && ord.rider_status !== 'DELIVERED') {
        throw new Error(`অর্ডারের বর্তমান অবস্থা (${ord.rider_status}) ডেলিভারিযোগ্য নয়।`);
      }

      // Fetch order items to check shop status
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
      const items = itemsRes.rows;

      if (items.length === 0) {
        throw new Error('অর্ডারটিতে কোনো পণ্য পাওয়া যায়নি।');
      }

      // Determine target shop
      let targetShopId = shopId;
      if (!targetShopId) {
        // If no shopId specified, default to the first un-delivered shop or match delivery_otp
        const undelivered = items.filter(it => !it.shop_delivered);
        if (undelivered.length === 1) {
          targetShopId = undelivered[0].shop_id;
        }
      }

      if (targetShopId) {
        const shopItems = items.filter(it => it.shop_id === targetShopId);
        if (shopItems.length === 0) {
          throw new Error('এই অর্ডারে এই শপের কোনো পণ্য নেই।');
        }

        const expectedOtp = shopItems[0].shop_delivery_otp || ord.delivery_otp;
        if (deliveryOtp && expectedOtp && deliveryOtp.trim() !== expectedOtp.trim()) {
          throw new Error('ভুল গ্রাহক ওটিপি (Delivery OTP)। অনুগ্রহ করে গ্রাহকের কাছ থেকে সঠিক ওটিপি সংগ্রহ করুন।');
        }

        // Mark this shop as delivered and done
        await client.query(`
          UPDATE order_items 
          SET shop_delivered = TRUE, shop_done = TRUE 
          WHERE order_id = $1 AND shop_id = $2
        `, [orderId, targetShopId]);

        // Sync completed order items of this shop to online_financial_records & redemptions depending on order_type!
        const sumOfItemPayables = items.reduce((sum, it) => sum + Number(it.customer_product_payable || 0), 0);

        for (const item of shopItems) {
          const isLocalOrder = (ord.order_type || 'NATIONWIDE').toUpperCase() === 'LOCAL';

          if (!isLocalOrder) {
            const finId = 'OFIN-' + crypto.randomUUID();
            const existingFin = await client.query(`
              SELECT id FROM online_financial_records WHERE order_item_id = $1
            `, [item.id]);

            if (existingFin.rows.length === 0) {
              let itemCouponDiscount = 0;
              if (sumOfItemPayables > 0 && Number(ord.coupon_discount_amount) > 0) {
                itemCouponDiscount = (Number(ord.coupon_discount_amount) || 0) * (Number(item.customer_product_payable) / sumOfItemPayables);
                itemCouponDiscount = Math.round(itemCouponDiscount * 100) / 100;
              }

              const adjustedCustomerPayable = Math.max(0, Number(item.customer_product_payable) - itemCouponDiscount);

              await client.query(`
                INSERT INTO online_financial_records (
                  id, order_id, order_number, order_item_id, user_id, customer_name, customer_phone,
                  delivery_address, shop_id, shop_name, product_id, product_name, quantity,
                  original_price, token_type, token_discount_amount, customer_product_payable,
                  commission_rate, commission_amount, shop_receivable, net_income,
                  order_created_at, delivered_at, created_at,
                  is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
                  coupon_code, coupon_discount_amount
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(),
                  $23, $24, $25, $26, $27, $28
                )
              `, [
                finId,
                ord.id,
                ord.order_number,
                item.id,
                ord.user_id,
                ord.customer_name,
                ord.customer_phone,
                ord.delivery_address,
                item.shop_id,
                item.shop_name,
                item.product_id,
                item.product_name,
                item.quantity,
                item.original_price,
                item.token_type || 'NONE',
                item.token_discount_amount,
                adjustedCustomerPayable,
                item.commission_rate,
                item.commission_amount,
                item.shop_receivable,
                item.net_income,
                ord.created_at,
                item.is_donated === true || item.is_donated === 'true',
                Number(item.donated_amount || 0),
                item.earned_mosque_id || null,
                item.earned_mosque_name || null,
                ord.coupon_code || null,
                itemCouponDiscount
              ]);
            }
          } else {
            // Ensure redemptions record is created for LOCAL market order
            const rdmId = 'RDM-ORD-' + item.id;
            const existingRdm = await client.query(`
              SELECT id FROM redemptions WHERE id = $1 OR token_id = $2
            `, [rdmId, item.id]);

            if (existingRdm.rows.length === 0) {
              const todayStr = getTodayDateString();
              await client.query(`
                INSERT INTO redemptions (
                  id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
                  merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
                  final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
                  commission_amount, merchant_payout_amount, status, redeemed_at, date
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8,
                  $9, $10, $11, $12, $13,
                  $14, $15, $16, $17,
                  $18, $19, 'COMPLETED', NOW(), $20
                )
              `, [
                rdmId,
                item.token_id || item.id,
                item.token_type || 'LOCAL',
                ord.user_id,
                ord.customer_name,
                ord.customer_phone,
                item.shop_id,
                item.shop_name,
                'MERCHANT',
                'Merchant',
                Number(item.original_price || 0) * Number(item.quantity || 1),
                Number(item.token_discount_rate || 0),
                Number(item.token_discount_amount || 0),
                Number(item.customer_product_payable || 0),
                Number(item.commission_rate || 0),
                Number(item.commission_amount || 0),
                Number(item.net_income || 0),
                Number(item.commission_amount || 0),
                Number(item.shop_receivable || 0),
                todayStr
              ]);
            }
          }
        }

        // Check if ALL shops are now delivered
        const checkAllRes = await client.query(`
          SELECT COUNT(*) as remaining 
          FROM order_items 
          WHERE order_id = $1 AND shop_delivered = FALSE
        `, [orderId]);
        const remainingCount = parseInt(checkAllRes.rows[0].remaining || '0', 10);

        if (remainingCount === 0) {
          // All shops delivered and done! Update main order status to DELIVERED and DONE/SETTLED!
          await client.query(`
            UPDATE orders 
            SET rider_status = 'DELIVERED', status = 'DONE', settlement_status = 'DONE',
                rider_delivered_at = NOW(), delivered_at = NOW(), merchant_settled_at = NOW(), updated_at = NOW()
            WHERE id = $1
          `, [orderId]);

          await client.query(`
            UPDATE riders 
            SET status = 'AVAILABLE', total_delivered = total_delivered + 1, updated_at = NOW()
            WHERE id = $1
          `, [riderId]);

          if (ord.rider_id) {
            const fee = Number(ord.rider_fee || ord.delivery_charge || 40);
            await client.query(`
              UPDATE riders 
              SET total_done = total_done + 1, total_earnings = total_earnings + $1, updated_at = NOW()
              WHERE id = $2
            `, [fee, ord.rider_id]);
          }

          await this.logRiderActivity(riderId, orderId, 'DELIVERED');
        } else {
          // Partially delivered
          await this.logRiderActivity(riderId, orderId, 'PARTIAL_DELIVERED');
        }
      } else {
        // Step 2: Global Delivery Confirmation to Customer
        if (deliveryOtp && ord.delivery_otp && deliveryOtp.trim() !== ord.delivery_otp.trim()) {
          throw new Error('ভুল গ্রাহক ওটিপি (Delivery OTP)। অনুগ্রহ করে সঠিক ওটিপি প্রবেশ করান।');
        }

        await client.query(`
          UPDATE orders 
          SET rider_status = 'DELIVERED', status = 'DELIVERED', 
              rider_delivered_at = NOW(), delivered_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [orderId]);

        await this.logRiderActivity(riderId, orderId, 'DELIVERED_TO_CUSTOMER');
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async requestOrderRejectionCode(riderId: string, orderId: string): Promise<any> {
    const ord = await this.getOrderById(orderId);
    if (!ord) throw new Error('অর্ডারটি পাওয়া যায়নি।');
    if (ord.riderId !== riderId) throw new Error('আপনি এই অর্ডারে নিয়োজিত রাইডার নন।');
    if (ord.riderStatus !== 'PICKED_UP') throw new Error(`অর্ডারের বর্তমান অবস্থা (${ord.riderStatus}) রিজেক্টযোগ্য নয়।`);

    const rejCode = String(crypto.randomInt(100000, 1000000));
    await query(`
      UPDATE orders SET rejection_code = $1, updated_at = NOW() WHERE id = $2
    `, [rejCode, orderId]);

    await this.logRiderActivity(riderId, orderId, 'REJECTION_REQUESTED');
    return await this.getOrderById(orderId);
  }

  async confirmOrderRejection(riderId: string, orderId: string, rejectCode: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const ordRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (ordRes.rows.length === 0) throw new Error('অর্ডারটি পাওয়া যায়নি।');
      const ord = ordRes.rows[0];

      if (ord.rider_id !== riderId) throw new Error('আপনি এই অর্ডারে নিয়োজিত রাইডার নন।');
      if (ord.rider_status !== 'PICKED_UP') throw new Error(`অর্ডারের বর্তমান অবস্থা (${ord.rider_status}) রিজেক্টযোগ্য নয়।`);

      if (!ord.rejection_code || rejectCode.trim() !== ord.rejection_code.trim()) {
        throw new Error('ভুল রিজেক্ট কোড। সঠিক কোডটি গ্রাহকের কাছ থেকে সংগ্রহ করুন।');
      }

      await client.query(`
        UPDATE orders 
        SET status = 'PRODUCT_BACK', rider_status = 'PRODUCT_BACK', settlement_status = 'PRODUCT_BACK', rider_fee = 0,
            admin_notes = COALESCE(admin_notes, '') || ' [Parcel Rejected by Customer with Code: ' || $1 || ']',
            updated_at = NOW()
        WHERE id = $2
      `, [rejectCode, orderId]);

      await client.query(`
        UPDATE order_items 
        SET shop_returned = TRUE 
        WHERE order_id = $1
      `, [orderId]);

      await client.query(`
        UPDATE riders 
        SET status = 'AVAILABLE', total_product_back = total_product_back + 1, updated_at = NOW()
        WHERE id = $1
      `, [riderId]);

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRiderHistory(riderId: string): Promise<any[]> {
    const res = await query(`
      SELECT o.*,
        (SELECT json_agg(json_build_object(
          'id', oi.id, 'productName', oi.product_name, 'shopName', oi.shop_name, 'quantity', oi.quantity
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.rider_id = $1 AND o.rider_status IN ('DELIVERED', 'DONE', 'PRODUCT_BACK')
      ORDER BY o.updated_at DESC
      LIMIT 50
    `, [riderId]);
    return res.rows.map(r => this.mapOrderRow(r));
  }

  async getMerchantOrders(shopId: string): Promise<any[]> {
    const res = await query(`
      SELECT o.*,
        (SELECT json_agg(json_build_object(
          'id', oi.id, 'productId', oi.product_id, 'productName', oi.product_name,
          'shopId', oi.shop_id, 'shopName', oi.shop_name, 'quantity', oi.quantity,
          'originalPrice', oi.original_price, 'customerProductPayable', oi.customer_product_payable,
          'shopReceivable', oi.shop_receivable, 'commissionAmount', oi.commission_amount,
          'shopPickupOtp', oi.shop_pickup_otp, 'shopPickedUp', oi.shop_picked_up,
          'shopDeliveryOtp', oi.shop_delivery_otp, 'shopDelivered', oi.shop_delivered
        )) FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1) as items,
        (SELECT oi.shop_pickup_otp FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1 LIMIT 1) as merchant_pickup_otp,
        (SELECT oi.shop_delivery_otp FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1 LIMIT 1) as merchant_delivery_otp,
        (SELECT oi.shop_done FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1 LIMIT 1) as merchant_shop_done,
        (SELECT oi.shop_returned FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1 LIMIT 1) as merchant_shop_returned,
        (SELECT COUNT(DISTINCT oi.shop_id) FROM order_items oi WHERE oi.order_id = o.id) > 1 as is_multi_shop,
        r.full_name as rider_name, r.phone as rider_phone, r.vehicle_type as rider_vehicle
      FROM orders o
      LEFT JOIN riders r ON o.rider_id = r.id
      WHERE o.order_type = 'LOCAL'
        AND EXISTS (
          SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.shop_id = $1
        )
      ORDER BY o.created_at DESC
    `, [shopId]);

    return res.rows.map(r => {
      const mapped = this.mapOrderRow(r);
      return {
        ...mapped,
        pickupOtp: r.merchant_pickup_otp || mapped.pickupOtp,
        deliveryOtp: r.merchant_delivery_otp || mapped.deliveryOtp,
        merchantShopDone: Boolean(r.merchant_shop_done),
        merchantShopReturned: Boolean(r.merchant_shop_returned),
        isMultiShop: Boolean(r.is_multi_shop),
        riderName: r.rider_name,
        riderPhone: r.rider_phone,
        riderVehicle: r.rider_vehicle
      };
    });
  }

  async merchantDoneOrder(shopId: string, orderId: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const ordRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (ordRes.rows.length === 0) throw new Error('অর্ডারটি খুঁজে পাওয়া যায়নি।');
      const ord = ordRes.rows[0];

      if (ord.settlement_status === 'DONE') {
        await client.query('COMMIT');
        return this.mapOrderRow(ord);
      }

      const itemCheck = await client.query(`SELECT 1 FROM order_items WHERE order_id = $1 AND shop_id = $2`, [orderId, shopId]);
      if (itemCheck.rows.length === 0) {
        throw new Error('এই অর্ডারে আপনার শপের কোনো পণ্য অন্তর্ভুক্ত নেই।');
      }

      await client.query(`
        UPDATE order_items 
        SET shop_done = TRUE 
        WHERE order_id = $1 AND shop_id = $2
      `, [orderId, shopId]);

      // Sync completed order items of this shop to online_financial_records so merchant & admin accounts show the transaction
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1 AND shop_id = $2`, [orderId, shopId]);
      const allItemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
      const sumOfItemPayables = allItemsRes.rows.reduce((sum, it) => sum + Number(it.customer_product_payable || 0), 0);

      for (const item of itemsRes.rows) {
        const isLocalOrder = (ord.order_type || 'NATIONWIDE').toUpperCase() === 'LOCAL';

        if (!isLocalOrder) {
          const finId = 'OFIN-' + crypto.randomUUID();
          const existingFin = await client.query(`
            SELECT id FROM online_financial_records WHERE order_item_id = $1
          `, [item.id]);

          if (existingFin.rows.length === 0) {
            let itemCouponDiscount = 0;
            if (sumOfItemPayables > 0 && Number(ord.coupon_discount_amount) > 0) {
              itemCouponDiscount = (Number(ord.coupon_discount_amount) || 0) * (Number(item.customer_product_payable) / sumOfItemPayables);
              itemCouponDiscount = Math.round(itemCouponDiscount * 100) / 100;
            }

            const adjustedCustomerPayable = Math.max(0, Number(item.customer_product_payable) - itemCouponDiscount);

            await client.query(`
              INSERT INTO online_financial_records (
                id, order_id, order_number, order_item_id, user_id, customer_name, customer_phone,
                delivery_address, shop_id, shop_name, product_id, product_name, quantity,
                original_price, token_type, token_discount_amount, customer_product_payable,
                commission_rate, commission_amount, shop_receivable, net_income,
                order_created_at, delivered_at, created_at,
                is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
                coupon_code, coupon_discount_amount
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(),
                $23, $24, $25, $26, $27, $28
              )
            `, [
              finId,
              ord.id,
              ord.order_number,
              item.id,
              ord.user_id,
              ord.customer_name,
              ord.customer_phone,
              ord.delivery_address,
              item.shop_id,
              item.shop_name,
              item.product_id,
              item.product_name,
              item.quantity,
              item.original_price,
              item.token_type || 'NONE',
              item.token_discount_amount,
              adjustedCustomerPayable,
              item.commission_rate,
              item.commission_amount,
              item.shop_receivable,
              item.net_income,
              ord.created_at,
              item.is_donated === true || item.is_donated === 'true',
              Number(item.donated_amount || 0),
              item.earned_mosque_id || null,
              item.earned_mosque_name || null,
              ord.coupon_code || null,
              itemCouponDiscount
            ]);
          }
        } else {
          // Also ensure a record exists in redemptions table for Merchant Transaction List for LOCAL orders
          const rdmId = 'RDM-ORD-' + item.id;
          const existingRdm = await client.query(`
            SELECT id FROM redemptions WHERE id = $1 OR token_id = $2
          `, [rdmId, item.id]);

          if (existingRdm.rows.length === 0) {
            const todayStr = getTodayDateString();
            await client.query(`
              INSERT INTO redemptions (
                id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
                merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
                final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
                commission_amount, merchant_payout_amount, status, redeemed_at, date
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, $16, $17,
                $18, $19, 'COMPLETED', NOW(), $20
              )
            `, [
              rdmId,
              item.token_id || item.id,
              item.token_type || 'LOCAL',
              ord.user_id,
              ord.customer_name,
              ord.customer_phone,
              item.shop_id,
              item.shop_name,
              'MERCHANT',
              'Merchant',
              Number(item.original_price || 0) * Number(item.quantity || 1),
              Number(item.token_discount_rate || 0),
              Number(item.token_discount_amount || 0),
              Number(item.customer_product_payable || 0),
              Number(item.commission_rate || 0),
              Number(item.commission_amount || 0),
              Number(item.net_income || 0),
              Number(item.commission_amount || 0),
              Number(item.shop_receivable || 0),
              todayStr
            ]);
          }
        }
      }

      // Check if ALL shops of the order are now done or returned
      const checkAllRes = await client.query(`
        SELECT COUNT(*) as remaining 
        FROM order_items 
        WHERE order_id = $1 AND shop_done = FALSE AND shop_returned = FALSE
      `, [orderId]);
      const remainingCount = parseInt(checkAllRes.rows[0].remaining || '0', 10);

      if (remainingCount === 0) {
        await client.query(`
          UPDATE orders 
          SET status = 'DONE', settlement_status = 'DONE', merchant_settled_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [orderId]);

        if (ord.rider_id) {
          const fee = Number(ord.rider_fee || ord.delivery_charge || 40);
          await client.query(`
            UPDATE riders 
            SET total_done = total_done + 1, total_earnings = total_earnings + $1, updated_at = NOW()
            WHERE id = $2
          `, [fee, ord.rider_id]);
        }
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async merchantProductBackOrder(shopId: string, orderId: string, reason?: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const ordRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (ordRes.rows.length === 0) throw new Error('অর্ডারটি খুঁজে পাওয়া যায়নি।');
      const ord = ordRes.rows[0];

      if (ord.settlement_status === 'DONE' || ord.settlement_status === 'PRODUCT_BACK') {
        await client.query('COMMIT');
        return this.mapOrderRow(ord);
      }

      const itemCheck = await client.query(`SELECT 1 FROM order_items WHERE order_id = $1 AND shop_id = $2`, [orderId, shopId]);
      if (itemCheck.rows.length === 0) {
        throw new Error('এই অর্ডারে আপনার শপের কোনো পণ্য অন্তর্ভুক্ত নেই।');
      }

      await client.query(`
        UPDATE order_items 
        SET shop_returned = TRUE 
        WHERE order_id = $1 AND shop_id = $2
      `, [orderId, shopId]);

      // Check if ALL shops of the order are now done or returned
      const checkAllRes = await client.query(`
        SELECT COUNT(*) as remaining 
        FROM order_items 
        WHERE order_id = $1 AND shop_done = FALSE AND shop_returned = FALSE
      `, [orderId]);
      const remainingCount = parseInt(checkAllRes.rows[0].remaining || '0', 10);

      if (remainingCount === 0) {
        // Count how many items were completed successfully
        const checkDoneRes = await client.query(`
          SELECT COUNT(*) as done_count 
          FROM order_items 
          WHERE order_id = $1 AND shop_done = TRUE
        `, [orderId]);
        const doneCount = parseInt(checkDoneRes.rows[0].done_count || '0', 10);

        if (doneCount === 0) {
          // Entire order was returned
          await client.query(`
            UPDATE orders 
            SET status = 'PRODUCT_BACK', settlement_status = 'PRODUCT_BACK', merchant_settled_at = NOW(),
                admin_notes = COALESCE(admin_notes, '') || ' [Product Back: ' || $1 || ']',
                updated_at = NOW()
            WHERE id = $2
          `, [reason || 'Customer Returned', orderId]);

          if (ord.rider_id) {
            await client.query(`
              UPDATE riders 
              SET total_product_back = total_product_back + 1, updated_at = NOW()
              WHERE id = $1
            `, [ord.rider_id]);
          }
        } else {
          // Mixed order, but fully settled now
          await client.query(`
            UPDATE orders 
            SET status = 'DONE', settlement_status = 'DONE', merchant_settled_at = NOW(),
                admin_notes = COALESCE(admin_notes, '') || ' [Some items returned: ' || $1 || ']',
                updated_at = NOW()
            WHERE id = $2
          `, [reason || 'Customer Returned', orderId]);

          if (ord.rider_id) {
            const fee = Number(ord.rider_fee || ord.delivery_charge || 40);
            await client.query(`
              UPDATE riders 
              SET total_done = total_done + 1, total_earnings = total_earnings + $1, updated_at = NOW()
              WHERE id = $2
            `, [fee, ord.rider_id]);
          }
        }
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async generateMerchantOrderCode(shopId: string, orderId: string, codeType: 'pickup' | 'delivery'): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const itemCheck = await client.query(`SELECT 1 FROM order_items WHERE order_id = $1 AND shop_id = $2`, [orderId, shopId]);
      if (itemCheck.rows.length === 0) {
        throw new Error('এই অর্ডারে আপনার শপের কোনো পণ্য অন্তর্ভুক্ত নেই।');
      }

      const newCode = String(crypto.randomInt(100000, 1000000));
      const col = codeType === 'pickup' ? 'pickup_otp' : 'delivery_otp';

      await client.query(`
        UPDATE orders SET ${col} = $1, updated_at = NOW() WHERE id = $2
      `, [newCode, orderId]);

      if (codeType === 'pickup') {
        await client.query(`
          UPDATE order_items SET shop_pickup_otp = $1 WHERE order_id = $2 AND shop_id = $3
        `, [newCode, orderId, shopId]);
      } else if (codeType === 'delivery') {
        await client.query(`
          UPDATE order_items SET shop_delivery_otp = $1 WHERE order_id = $2 AND shop_id = $3
        `, [newCode, orderId, shopId]);
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async waiveOrderDeliveryCharge(orderId: string, adminId: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const ordRes = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (ordRes.rows.length === 0) throw new Error('অর্ডারটি খুঁজে পাওয়া যায়নি।');
      const ord = ordRes.rows[0];

      // Strict enforcement: Local Market delivery fee waiver is strictly prohibited
      const orderType = (ord.order_type || 'NATIONWIDE').toUpperCase();
      if (orderType === 'LOCAL') {
        throw new Error('লোকাল মার্কেট (Local Order)-এর ডেলিভারি চার্জ মওকুফ করা সম্ভব নয়। শুধুমাত্র ন্যাশনাল মার্কেট অর্ডারের ডেলিভারি চার্জ অ্যাডমিন কর্তৃক মওকুফযোগ্য।');
      }

      if (ord.delivery_waived) {
        await client.query('COMMIT');
        return this.mapOrderRow(ord);
      }

      const originalDeliveryCharge = Number(ord.delivery_charge || 0);
      const productPayable = Number(ord.product_total_payable || 0);
      const couponDiscount = Number(ord.coupon_discount_amount || 0);
      const newCodAmount = Math.max(0, productPayable);

      const noteAddition = ` [ডেলিভারি চার্জ ৳${originalDeliveryCharge} মওকুফ করেছেন Admin (ID: ${adminId})]`;

      const res = await client.query(`
        UPDATE orders 
        SET delivery_charge = 0,
            original_delivery_charge = $1,
            delivery_waived = TRUE,
            waived_by = $2,
            waived_at = NOW(),
            total_cod_amount = $3,
            admin_notes = COALESCE(admin_notes, '') || $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [originalDeliveryCharge, adminId, newCodAmount, noteAddition, orderId]);

      await client.query('COMMIT');
      return this.mapOrderRow(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  mapOrderRow(row: any): any {
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      deliveryAddress: row.delivery_address,
      district: row.district,
      upazila: row.upazila,
      fullAddress: row.full_address || row.delivery_address,
      deliveryChargeType: row.delivery_charge_type,
      deliveryNotes: row.delivery_notes || '',
      paymentMethod: row.payment_method,
      status: row.status,
      productTotalOriginal: Number(row.product_total_original || 0),
      productTotalDiscount: Number(row.product_total_discount || 0),
      productTotalPayable: Number(row.product_total_payable || 0),
      deliveryCharge: Number(row.delivery_charge || 0),
      totalCodAmount: Number(row.total_cod_amount || 0),
      orderType: row.order_type || 'NATIONWIDE',
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      riderId: row.rider_id || undefined,
      riderStatus: row.rider_status || undefined,
      deliveryWaived: Boolean(row.delivery_waived),
      waivedBy: row.waived_by || null,
      waivedAt: row.waived_at ? new Date(row.waived_at).toISOString() : null,
      originalDeliveryCharge: Number(row.original_delivery_charge || 0),
      pickupOtp: row.pickup_otp || null,
      deliveryOtp: row.delivery_otp || null,
      rejectionCode: row.rejection_code || null,
      riderAcceptedAt: row.rider_accepted_at ? new Date(row.rider_accepted_at).toISOString() : null,
      riderPickedUpAt: row.rider_picked_up_at ? new Date(row.rider_picked_up_at).toISOString() : null,
      riderDeliveredAt: row.rider_delivered_at ? new Date(row.rider_delivered_at).toISOString() : null,
      merchantSettledAt: row.merchant_settled_at ? new Date(row.merchant_settled_at).toISOString() : null,
      settlementStatus: row.settlement_status || 'PENDING',
      riderFee: Number(row.rider_fee || 0),
      distanceKm: row.distance_km ? Number(row.distance_km) : undefined,
      couponCode: row.coupon_code || null,
      couponDiscountAmount: Number(row.coupon_discount_amount || 0),
      adminNotes: row.admin_notes || '',
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
      items: row.items || []
    };
  }

  getRecentTransactions(limit = 20): TransactionLogEntry[] {
    return recentTransactions.slice(0, limit);
  }
  // =========================================================================
  // 1. USER MANAGEMENT
  // =========================================================================

  async getUserById(id: string): Promise<UserRecord | null> {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
  }

  async getUserByIdentifier(identifier: string): Promise<UserRecord | null> {
    if (!identifier) return null;
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return this.getUserByEmail(clean);
    }
    const byPhone = await this.getUserByPhone(clean);
    if (byPhone) return byPhone;
    return this.getUserByEmail(clean);
  }

  async getUserByPhone(phone: string): Promise<UserRecord | null> {
    if (!phone) return null;
    const clean = phone.trim().replace(/[\s-]/g, '');
    const normalized = normalizePhoneNumber(clean);
    if (!normalized) return null;

    const noZero = normalized.startsWith('0') ? normalized.slice(1) : normalized;
    const plus880 = '+880' + noZero;
    const raw880 = '880' + noZero;

    const res = await query(
      'SELECT * FROM users WHERE phone = $1 OR phone = $2 OR phone = $3 OR phone = $4 OR phone = $5',
      [normalized, clean, plus880, raw880, noZero]
    );
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (!email) return null;
    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
  }

  async getGoogleIdentity(googleSub: string): Promise<{ userId: string; googleSub: string; googleEmail: string } | null> {
    const res = await query('SELECT user_id, google_sub, google_email FROM google_identities WHERE google_sub = $1', [googleSub]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      userId: row.user_id,
      googleSub: row.google_sub,
      googleEmail: row.google_email
    };
  }

  async linkGoogleIdentity(userId: string, googleSub: string, googleEmail: string): Promise<void> {
    await query(
      `INSERT INTO google_identities (user_id, google_sub, google_email, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (google_sub) DO UPDATE SET user_id = $1, google_email = $3, updated_at = NOW()`,
      [userId, googleSub, googleEmail.toLowerCase().trim()]
    );
  }

  async unlinkGoogleIdentity(userId: string, googleSub: string): Promise<void> {
    await query('DELETE FROM google_identities WHERE user_id = $1 AND google_sub = $2', [userId, googleSub]);
  }

  async createUser(data: {
    fullName: string;
    phone: string;
    email?: string;
    passwordHash?: string;
    gender: string;
    age?: number;
    dateOfBirth?: string;
    maritalStatus?: string;
    district?: string;
    upazila?: string;
    address?: string;
  }): Promise<UserRecord> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const normalizedPhone = normalizePhoneNumber(data.phone);
      const id = generateSecureId('USR');

      const res = await client.query(`
        INSERT INTO users (id, full_name, phone, email, password_hash, gender, age, date_of_birth, marital_status, district, upazila, address, is_verified, status, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, 'active', NOW(), NOW())
        RETURNING *
      `, [
        id,
        data.fullName.trim(),
        normalizedPhone,
        data.email?.trim().toLowerCase() || null,
        data.passwordHash || null,
        (data.gender || 'male').toLowerCase(),
        data.age || null,
        data.dateOfBirth || null,
        data.maritalStatus || null,
        data.district || null,
        data.upazila || null,
        data.address?.trim() || null
      ]);

      await client.query('COMMIT');
      logDbTransaction('INSERT', 'users', 'SUCCESS', `id=${id}`);
      return mapUserRow(res.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('INSERT', 'users', 'FAILURE', err.message);
      console.error('[DB] createUser transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUserProfile(
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      gender?: string;
      age?: number;
      dateOfBirth?: string;
      maritalStatus?: string;
      district?: string;
      upazila?: string;
      address?: string;
      photoUrl?: string;
      passwordHash?: string;
    }
  ): Promise<UserRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.fullName !== undefined) {
        setClauses.push(`full_name = $${idx++}`);
        values.push(updates.fullName.trim());
      }
      if (updates.email !== undefined) {
        setClauses.push(`email = $${idx++}`);
        values.push(updates.email ? updates.email.trim().toLowerCase() : null);
      }
      if (updates.gender !== undefined) {
        setClauses.push(`gender = $${idx++}`);
        values.push(updates.gender.toLowerCase());
      }
      if (updates.age !== undefined) {
        setClauses.push(`age = $${idx++}`);
        values.push(updates.age);
      }
      if (updates.dateOfBirth !== undefined) {
        setClauses.push(`date_of_birth = $${idx++}`);
        values.push(updates.dateOfBirth);
      }
      if (updates.maritalStatus !== undefined) {
        setClauses.push(`marital_status = $${idx++}`);
        values.push(updates.maritalStatus);
      }
      if (updates.district !== undefined) {
        setClauses.push(`district = $${idx++}`);
        values.push(updates.district);
      }
      if (updates.upazila !== undefined) {
        setClauses.push(`upazila = $${idx++}`);
        values.push(updates.upazila);
      }
      if (updates.address !== undefined) {
        setClauses.push(`address = $${idx++}`);
        values.push(updates.address ? updates.address.trim() : null);
      }
      if (updates.photoUrl !== undefined) {
        setClauses.push(`photo_url = $${idx++}`);
        values.push(updates.photoUrl);
      }
      if (updates.passwordHash !== undefined) {
        setClauses.push(`password_hash = $${idx++}`);
        values.push(updates.passwordHash);
      }

      if (setClauses.length === 0) {
        await client.query('COMMIT');
        logDbTransaction('UPDATE', 'users', 'SUCCESS', `userId=${userId} (no-op)`);
        return this.getUserById(userId);
      }

      values.push(userId);
      const res = await client.query(`
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `, values);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'users', 'SUCCESS', `userId=${userId}`);
      return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'users', 'FAILURE', err.message);
      console.error('[DB] updateUserProfile transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<UserRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE users SET status = $1 WHERE id = $2 RETURNING *
      `, [status, userId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'users', 'SUCCESS', `userId=${userId}, status=${status}`);
      return res.rows.length > 0 ? mapUserRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'users', 'FAILURE', err.message);
      console.error('[DB] updateUserStatus transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(`SELECT id, phone FROM users WHERE id = $1`, [userId]);
      const phone = userRes.rows[0]?.phone;

      await client.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM redemptions WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM tokens WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM prayer_attendances WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM support_tickets WHERE user_id = $1`, [userId]);
      const res = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [userId]);

      if (phone) {
        const cleanPhone = normalizePhoneNumber(phone);
        // Clean up any merchant or shop associated with this phone number using deletePartnerShop
        const clientWrapper = getClient();
        try {
          await this.deletePartnerShop(cleanPhone);
        } catch (subErr) {
          console.error('[DB] deleteUser nested deletePartnerShop error (ignored to complete user delete):', subErr);
        }
      }

      await client.query('COMMIT');
      logDbTransaction('DELETE', 'users', 'SUCCESS', `userId=${userId}`);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('DELETE', 'users', 'FAILURE', err.message);
      console.error('[DB] deleteUser transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUserPassword(userIdOrPhone: string, passwordHash: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const clean = userIdOrPhone.trim();
      const normalized = normalizePhoneNumber(clean);
      const res = await client.query(`
        UPDATE users SET password_hash = $1 WHERE id = $2 OR phone = $3 RETURNING id
      `, [passwordHash, clean, normalized]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] updateUserPassword transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateMerchantPassword(merchantId: string, newPin: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const hash = bcrypt.hashSync(newPin.trim(), 10);
      const res = await client.query(`
        UPDATE merchants
        SET pin = $1, password_hash = $1, token_version = COALESCE(token_version, 1) + 1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `, [hash, merchantId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'merchants', 'SUCCESS', `merchantId=${merchantId}`);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] updateMerchantPassword transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateRiderPassword(riderId: string, newPin: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const cleanPin = newPin.trim();
      const bcryptHash = bcrypt.hashSync(cleanPin, 10);
      const res = await client.query(`
        UPDATE riders
        SET password_hash = $1, pin_code = $2, token_version = COALESCE(token_version, 1) + 1, updated_at = NOW()
        WHERE id = $3
        RETURNING id
      `, [bcryptHash, cleanPin, riderId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'riders', 'SUCCESS', `riderId=${riderId}`);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] updateRiderPassword transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
  }

  async getUserLifetimeStats(userId: string) {
    const totalPrayersRes = await query(`SELECT COUNT(*) as count FROM prayer_attendances WHERE user_id = $1`, [userId]);
    const uniqueDaysRes = await query(`SELECT COUNT(DISTINCT date) as count FROM prayer_attendances WHERE user_id = $1`, [userId]);

    const byPrayerRes = await query(`
      SELECT LOWER(prayer_type) as ptype, COUNT(*) as count 
      FROM prayer_attendances 
      WHERE user_id = $1 
      GROUP BY LOWER(prayer_type)
    `, [userId]);

    const byPrayerMap: Record<string, number> = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
    byPrayerRes.rows.forEach(r => {
      const p = String(r.ptype || '').toLowerCase();
      if (byPrayerMap[p] !== undefined) {
        byPrayerMap[p] = Number(r.count || 0);
      }
    });

    const tokenStatsRes = await query(`
      SELECT token_type, status, COUNT(*) as count 
      FROM tokens 
      WHERE user_id = $1 
      GROUP BY token_type, status
    `, [userId]);

    const eligibleTokenStats = { gold: 0, silver: 0, bronze: 0 };
    let availableTokens = 0;
    let redeemedTokens = 0;

    tokenStatsRes.rows.forEach(r => {
      const type = String(r.token_type || '').toUpperCase();
      const status = String(r.status || '').toUpperCase();
      const count = Number(r.count || 0);

      if (type === 'GOLD') eligibleTokenStats.gold += count;
      else if (type === 'SILVER') eligibleTokenStats.silver += count;
      else if (type === 'BRONZE') eligibleTokenStats.bronze += count;

      if (status === 'AVAILABLE') availableTokens += count;
      else if (status === 'USED') redeemedTokens += count;
    });

    const totalCount = Number(totalPrayersRes.rows[0]?.count || 0);
    const uniqueDays = Number(uniqueDaysRes.rows[0]?.count || 0);

    return {
      totalCount,
      totalPrayers: totalCount,
      uniqueDays,
      byPrayer: byPrayerMap,
      eligibleTokenStats,
      totalTokensEarned: availableTokens + redeemedTokens,
      availableTokens,
      redeemedTokens
    };
  }

  async getAllUsersAdminWithStats(filters?: {
    search?: string;
    maritalStatus?: string;
    gender?: string;
    status?: string;
    district?: string;
    upazila?: string;
    minAge?: number;
    maxAge?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<Array<Omit<UserRecord, 'passwordHash'> & { totalPrayers: number; availableTokens: number; redeemedTokens: number }>> {
    let whereClauses: string[] = [];
    let params: any[] = [];
    let idx = 1;

    if (filters?.search) {
      whereClauses.push(`(u.full_name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.email ILIKE $${idx} OR u.id ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters?.maritalStatus && filters.maritalStatus !== 'all') {
      whereClauses.push(`u.marital_status = $${idx}`);
      params.push(filters.maritalStatus);
      idx++;
    }

    if (filters?.gender && filters.gender !== 'all') {
      whereClauses.push(`u.gender = $${idx}`);
      params.push(filters.gender.toLowerCase());
      idx++;
    }

    if (filters?.status && filters.status !== 'all') {
      whereClauses.push(`u.status = $${idx}`);
      params.push(filters.status.toLowerCase());
      idx++;
    }

    if (filters?.district && filters.district !== 'all') {
      whereClauses.push(`u.district = $${idx}`);
      params.push(filters.district);
      idx++;
    }

    if (filters?.upazila && filters.upazila !== 'all') {
      whereClauses.push(`u.upazila = $${idx}`);
      params.push(filters.upazila);
      idx++;
    }

    if (filters?.minAge !== undefined) {
      whereClauses.push(`
        (
          (u.date_of_birth IS NOT NULL AND DATE_PART('year', AGE(CURRENT_DATE, u.date_of_birth)) >= $${idx})
          OR (u.date_of_birth IS NULL AND u.age >= $${idx})
        )
      `);
      params.push(filters.minAge);
      idx++;
    }

    if (filters?.maxAge !== undefined) {
      whereClauses.push(`
        (
          (u.date_of_birth IS NOT NULL AND DATE_PART('year', AGE(CURRENT_DATE, u.date_of_birth)) <= $${idx})
          OR (u.date_of_birth IS NULL AND u.age <= $${idx})
        )
      `);
      params.push(filters.maxAge);
      idx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBySql = 'ORDER BY u.created_at DESC';
    if (filters?.sortBy) {
      const order = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      switch (filters.sortBy) {
        case 'name':
          orderBySql = `ORDER BY u.full_name ${order}`;
          break;
        case 'age':
          // Sort by DOB (descending DOB = younger age)
          orderBySql = `ORDER BY COALESCE(u.date_of_birth, '1900-01-01') ${order === 'ASC' ? 'DESC' : 'ASC'}, u.age ${order}`;
          break;
        case 'created':
          orderBySql = `ORDER BY u.created_at ${order}`;
          break;
      }
    }

    const res = await query(`
      SELECT 
        u.*,
        COALESCE(pa.total_prayers, 0) as total_prayers,
        COALESCE(tk.available_tokens, 0) as available_tokens,
        COALESCE(tk.redeemed_tokens, 0) as redeemed_tokens
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_prayers 
        FROM prayer_attendances 
        GROUP BY user_id
      ) pa ON pa.user_id = u.id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_tokens,
          COUNT(*) FILTER (WHERE status = 'USED') as redeemed_tokens
        FROM tokens
        GROUP BY user_id
      ) tk ON tk.user_id = u.id
      ${whereSql}
      ${orderBySql}
    `, params);

    return res.rows.map(row => {
      const u = mapUserRow(row);
      delete (u as any).passwordHash;
      return {
        ...u,
        totalPrayers: Number(row.total_prayers || 0),
        availableTokens: Number(row.available_tokens || 0),
        redeemedTokens: Number(row.redeemed_tokens || 0)
      };
    });
  }

  async getUserDetailsAdmin(id: string): Promise<any | null> {
    const res = await query(`
      SELECT 
        u.id, u.full_name, u.phone, u.email, u.gender, u.age, u.date_of_birth, u.marital_status, u.district, u.upazila, u.address,
        u.is_verified, u.photo_url, u.status, u.created_at, u.last_login_at,
        COALESCE(pa.total_prayers, 0) as total_prayers,
        COALESCE(tk.available_tokens, 0) as available_tokens,
        COALESCE(tk.redeemed_tokens, 0) as redeemed_tokens
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_prayers 
        FROM prayer_attendances 
        GROUP BY user_id
      ) pa ON pa.user_id = u.id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_tokens,
          COUNT(*) FILTER (WHERE status = 'USED') as redeemed_tokens
        FROM tokens
        GROUP BY user_id
      ) tk ON tk.user_id = u.id
      WHERE u.id = $1
    `, [id]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email || null,
      gender: row.gender || 'male',
      age: row.age != null ? Number(row.age) : null,
      dateOfBirth: row.date_of_birth ? (row.date_of_birth instanceof Date ? row.date_of_birth.toISOString().split('T')[0] : String(row.date_of_birth)) : null,
      maritalStatus: row.marital_status || null,
      district: row.district || null,
      upazila: row.upazila || null,
      address: row.address || null,
      isVerified: row.is_verified,
      photoUrl: row.photo_url || null,
      status: row.status || 'active',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : String(row.last_login_at),
      totalPrayers: Number(row.total_prayers || 0),
      availableTokens: Number(row.available_tokens || 0),
      redeemedTokens: Number(row.redeemed_tokens || 0)
    };
  }

  async getUserDetailsByIdOrPhone(identifier: string): Promise<any | null> {
    const res = await query(`
      SELECT 
        u.id, u.full_name, u.phone, u.email, u.gender, u.age, u.date_of_birth, u.marital_status, u.district, u.upazila, u.address,
        u.is_verified, u.photo_url, u.status, u.created_at, u.last_login_at,
        COALESCE(pa.total_prayers, 0) as total_prayers,
        COALESCE(tk.available_tokens, 0) as available_tokens,
        COALESCE(tk.redeemed_tokens, 0) as redeemed_tokens
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_prayers 
        FROM prayer_attendances 
        GROUP BY user_id
      ) pa ON pa.user_id = u.id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_tokens,
          COUNT(*) FILTER (WHERE status = 'USED') as redeemed_tokens
        FROM tokens
        GROUP BY user_id
      ) tk ON tk.user_id = u.id
      WHERE u.id = $1 OR u.phone = $1 OR u.full_name ILIKE $1
      LIMIT 1
    `, [identifier]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email || null,
      gender: row.gender || 'male',
      age: row.age != null ? Number(row.age) : null,
      dateOfBirth: row.date_of_birth ? (row.date_of_birth instanceof Date ? row.date_of_birth.toISOString().split('T')[0] : String(row.date_of_birth)) : null,
      maritalStatus: row.marital_status || null,
      district: row.district || null,
      upazila: row.upazila || null,
      address: row.address || null,
      isVerified: row.is_verified,
      photoUrl: row.photo_url || null,
      status: row.status || 'active',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : String(row.last_login_at),
      totalPrayers: Number(row.total_prayers || 0),
      availableTokens: Number(row.available_tokens || 0),
      redeemedTokens: Number(row.redeemed_tokens || 0)
    };
  }

  // =========================================================================
  // 2. MOSQUE MANAGEMENT
  // =========================================================================

  async getMosques(activeOnly = true): Promise<MosqueRecord[]> {
    const sql = activeOnly
      ? `SELECT * FROM mosques WHERE status = 'active' ORDER BY name ASC`
      : `SELECT * FROM mosques ORDER BY created_at DESC`;
    const res = await query(sql);
    return res.rows.map(mapMosqueRow);
  }

  async getMosqueById(id: string): Promise<MosqueRecord | null> {
    const res = await query(`SELECT * FROM mosques WHERE id = $1`, [id]);
    return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
  }

  async getMosqueByName(name: string): Promise<MosqueRecord | null> {
    const res = await query(`SELECT * FROM mosques WHERE name ILIKE $1 OR name_bn ILIKE $1 LIMIT 1`, [name]);
    return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
  }

  async getMosqueByQrIdentifier(qrIdentifier: string): Promise<MosqueRecord | null> {
    const res = await query(`SELECT * FROM mosques WHERE qr_identifier = $1`, [qrIdentifier]);
    return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
  }

  async findDuplicateMosques(params: {
    name?: string;
    nameBn?: string;
    latitude?: number;
    longitude?: number;
    excludeId?: string;
  }): Promise<Array<{ mosque: MosqueRecord; reason: string }>> {
    const all = await this.getAllMosquesAdmin();
    const duplicates: Array<{ mosque: MosqueRecord; reason: string }> = [];

    const norm = (str?: string) => (str || '').toLowerCase().replace(/[\s_—\-]/g, '');
    const cleanName = norm(params.name);
    const cleanNameBn = norm(params.nameBn);

    for (const m of all) {
      if (params.excludeId && m.id === params.excludeId) continue;

      // 1. Exact full name match (avoiding partial/single letter substring matches)
      if (cleanName && cleanName.length > 2 && norm(m.name) === cleanName) {
        duplicates.push({ mosque: m, reason: `হুশিয়ারি: হুবহু একই ইংরেজি নাম পাওয়া গেছে (${m.name})` });
        continue;
      }
      if (cleanNameBn && cleanNameBn.length > 2 && norm(m.nameBn) === cleanNameBn) {
        duplicates.push({ mosque: m, reason: `হুশিয়ারি: হুবহু একই বাংলা নাম পাওয়া গেছে (${m.nameBn})` });
        continue;
      }

      // 2. Proximity GPS match (within 100 meters)
      if (
        params.latitude &&
        params.longitude &&
        params.latitude !== 0 &&
        params.longitude !== 0 &&
        m.latitude &&
        m.longitude &&
        m.latitude !== 0 &&
        m.longitude !== 0
      ) {
        const dLat = (m.latitude - params.latitude) * 111.32; // km
        const dLng = (m.longitude - params.longitude) * 111.32 * Math.cos(params.latitude * (Math.PI / 180));
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distKm <= 0.1) {
          // Less than or equal to 100 meters
          duplicates.push({
            mosque: m,
            reason: `কাছাকাছি স্থানে (${Math.round(distKm * 1000)} মিটার দূরত্বে) ইতিমধ্যে মসজিদ বিদ্যমান রয়েছে`
          });
        }
      }
    }

    return duplicates;
  }

  async addMosque(data: {
    name: string;
    nameBn: string;
    address: string;
    area: string;
    district: string;
    qrIdentifier?: string;
    status?: 'active' | 'pending' | 'rejected' | 'inactive';
    imamName?: string;
    contactNumber?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    imageUrl?: string;
    imamImageUrl?: string;
    requestedByUserId?: string;
    requestedByName?: string;
    requestedByPhone?: string;
  }): Promise<MosqueRecord> {
    return this.createMosque(data);
  }

  async createMosque(data: {
    name: string;
    nameBn: string;
    address: string;
    area: string;
    district: string;
    qrIdentifier?: string;
    status?: 'active' | 'pending' | 'rejected' | 'inactive';
    imamName?: string;
    contactNumber?: string;
    latitude?: number;
    longitude?: number;
    verificationRadius?: number;
    description?: string;
    imageUrl?: string;
    imamImageUrl?: string;
    requestedByUserId?: string;
    requestedByName?: string;
    requestedByPhone?: string;
  }): Promise<MosqueRecord> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const id = generateSecureId('MSQ');
      const qrIdentifier =
        data.qrIdentifier ||
        `CAVE_MSQ_${Date.now()}_${(data.district || 'DHK').toUpperCase().slice(0, 4)}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const res = await client.query(`
        INSERT INTO mosques (
          id, name, name_bn, address, area, district, qr_identifier, status,
          imam_name, contact_number, latitude, longitude, verification_radius, description,
          image_url, imam_image_url, requested_by_user_id, requested_by_name, requested_by_phone,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING *
      `, [
        id,
        data.name.trim(),
        (data.nameBn || data.name).trim(),
        data.address.trim(),
        (data.area || 'Unknown').trim(),
        (data.district || 'Dhaka').trim(),
        qrIdentifier,
        data.status || 'active',
        data.imamName?.trim() || null,
        data.contactNumber?.trim() || null,
        Number(data.latitude) || 0,
        Number(data.longitude) || 0,
        (data.verificationRadius != null && Number(data.verificationRadius) > 0) ? Number(data.verificationRadius) : 75,
        data.description?.trim() || null,
        data.imageUrl?.trim() || null,
        data.imamImageUrl?.trim() || null,
        data.requestedByUserId?.trim() || null,
        data.requestedByName?.trim() || null,
        data.requestedByPhone?.trim() || null
      ]);

      await client.query('COMMIT');
      logDbTransaction('INSERT', 'mosques', 'SUCCESS', `id=${id}, status=${data.status || 'active'}`);
      return mapMosqueRow(res.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('INSERT', 'mosques', 'FAILURE', err.message);
      if (err.message && (err.message.includes('requested_by_user_id') || err.message.includes('column'))) {
        try {
          await query(`
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_user_id VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_phone VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS image_url TEXT;
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS imam_image_url TEXT;
          `);
          // Retry
          const retryClient = await getClient();
          try {
            await retryClient.query('BEGIN');
            const id = generateSecureId('MSQ');
            const qrIdentifier =
              data.qrIdentifier ||
              `CAVE_MSQ_${Date.now()}_${(data.district || 'DHK').toUpperCase().slice(0, 4)}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            const res = await retryClient.query(`
              INSERT INTO mosques (
                id, name, name_bn, address, area, district, qr_identifier, status,
                imam_name, contact_number, latitude, longitude, description,
                image_url, imam_image_url, requested_by_user_id, requested_by_name, requested_by_phone,
                created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
              RETURNING *
            `, [
              id,
              data.name.trim(),
              (data.nameBn || data.name).trim(),
              data.address.trim(),
              (data.area || 'Unknown').trim(),
              (data.district || 'Dhaka').trim(),
              qrIdentifier,
              data.status || 'active',
              data.imamName?.trim() || null,
              data.contactNumber?.trim() || null,
              Number(data.latitude) || 0,
              Number(data.longitude) || 0,
              data.description?.trim() || null,
              data.imageUrl?.trim() || null,
              data.imamImageUrl?.trim() || null,
              data.requestedByUserId?.trim() || null,
              data.requestedByName?.trim() || null,
              data.requestedByPhone?.trim() || null
            ]);
            await retryClient.query('COMMIT');
            return mapMosqueRow(res.rows[0]);
          } catch (retryErr) {
            await retryClient.query('ROLLBACK');
            throw retryErr;
          } finally {
            retryClient.release();
          }
        } catch (migrationErr) {
          console.error('[DB] createMosque fallback failed:', migrationErr);
        }
      }
      console.error('[DB] createMosque transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateMosque(
    mosqueId: string,
    data: {
      name?: string;
      nameBn?: string;
      address?: string;
      area?: string;
      district?: string;
      description?: string;
      imamName?: string;
      contactNumber?: string;
      latitude?: number;
      longitude?: number;
      verificationRadius?: number;
      imageUrl?: string;
      imamImageUrl?: string;
      status?: 'active' | 'pending' | 'rejected' | 'inactive';
    }
  ): Promise<MosqueRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const existing = await client.query(`SELECT * FROM mosques WHERE id = $1`, [mosqueId]);
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const prev = existing.rows[0];

      const res = await client.query(`
        UPDATE mosques SET
          name = COALESCE($1, name),
          name_bn = COALESCE($2, name_bn),
          address = COALESCE($3, address),
          area = COALESCE($4, area),
          district = COALESCE($5, district),
          description = COALESCE($6, description),
          imam_name = COALESCE($7, imam_name),
          contact_number = COALESCE($8, contact_number),
          latitude = COALESCE($9, latitude),
          longitude = COALESCE($10, longitude),
          verification_radius = COALESCE($11, verification_radius),
          image_url = COALESCE($12, image_url),
          imam_image_url = COALESCE($13, imam_image_url),
          status = COALESCE($14, status),
          updated_at = NOW()
        WHERE id = $15
        RETURNING *
      `, [
        data.name !== undefined ? data.name.trim() : null,
        data.nameBn !== undefined ? data.nameBn.trim() : null,
        data.address !== undefined ? data.address.trim() : null,
        data.area !== undefined ? data.area.trim() : null,
        data.district !== undefined ? data.district.trim() : null,
        data.description !== undefined ? data.description.trim() : null,
        data.imamName !== undefined ? data.imamName.trim() : null,
        data.contactNumber !== undefined ? data.contactNumber.trim() : null,
        data.latitude !== undefined ? Number(data.latitude) : null,
        data.longitude !== undefined ? Number(data.longitude) : null,
        data.verificationRadius !== undefined ? Number(data.verificationRadius) : null,
        data.imageUrl !== undefined ? data.imageUrl.trim() : null,
        data.imamImageUrl !== undefined ? data.imamImageUrl.trim() : null,
        data.status !== undefined ? data.status : null,
        mosqueId
      ]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'mosques', 'SUCCESS', `id=${mosqueId}`);
      return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] updateMosque error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async approveMosque(mosqueId: string, reviewedBy: string): Promise<MosqueRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const mRes = await client.query(`SELECT * FROM mosques WHERE id = $1`, [mosqueId]);
      if (mRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const mosque = mRes.rows[0];

      // Ensure a fresh/verified secure QR identifier exists
      const qrIdentifier = mosque.qr_identifier && !mosque.qr_identifier.includes('TEMP')
        ? mosque.qr_identifier
        : `CAVE_MSQ_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

      const res = await client.query(`
        UPDATE mosques SET
          status = 'active',
          qr_identifier = $1,
          reviewed_at = NOW(),
          reviewed_by = $2,
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [qrIdentifier, reviewedBy, mosqueId]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'mosques', 'SUCCESS', `id=${mosqueId} APPROVED`);

      const approvedMosque = mapMosqueRow(res.rows[0]);

      // Route through Centralized NotificationService using Admin-configured template
      if (approvedMosque.requestedByUserId) {
        try {
          await NotificationService.sendFromTemplate(
            'MOSQUE_APPLICATION_APPROVED',
            approvedMosque.requestedByUserId,
            {
              user_name: approvedMosque.requestedByName || 'প্রিয় ব্যবহারকারী',
              mosque_name: approvedMosque.nameBn || approvedMosque.name,
              application_id: approvedMosque.id
            },
            { mosqueId: approvedMosque.id, deepLink: `#mosque-${approvedMosque.id}` }
          );
        } catch (notifErr) {
          console.warn('[Notification Warning] Could not notify applicant on mosque approval:', notifErr);
        }
      }

      return approvedMosque;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] approveMosque error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectMosque(mosqueId: string, reason: string, reviewedBy: string): Promise<MosqueRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const mRes = await client.query(`SELECT * FROM mosques WHERE id = $1`, [mosqueId]);
      if (mRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const mosque = mRes.rows[0];

      const res = await client.query(`
        UPDATE mosques SET
          status = 'rejected',
          rejection_reason = $1,
          reviewed_at = NOW(),
          reviewed_by = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [reason?.trim() || 'তথ্য অসম্পূর্ণ বা যাচাইকরণে ব্যর্থ', reviewedBy, mosqueId]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'mosques', 'SUCCESS', `id=${mosqueId} REJECTED`);

      const rejectedMosque = mapMosqueRow(res.rows[0]);

      // Route through Centralized NotificationService using Admin-configured template
      if (rejectedMosque.requestedByUserId) {
        try {
          await NotificationService.sendFromTemplate(
            'MOSQUE_APPLICATION_REJECTED',
            rejectedMosque.requestedByUserId,
            {
              user_name: rejectedMosque.requestedByName || 'প্রিয় ব্যবহারকারী',
              mosque_name: rejectedMosque.nameBn || rejectedMosque.name,
              application_id: rejectedMosque.id,
              rejection_reason: reason?.trim() || 'কারণ উল্লেখ করা হয়নি'
            },
            { mosqueId: rejectedMosque.id }
          );
        } catch (notifErr) {
          console.warn('[Notification Warning] Could not notify applicant on mosque rejection:', notifErr);
        }
      }

      return rejectedMosque;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] rejectMosque error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getUserMosqueRequests(userId: string): Promise<MosqueRecord[]> {
    try {
      const res = await query(`
        SELECT * FROM mosques WHERE requested_by_user_id = $1 ORDER BY created_at DESC
      `, [userId]);
      return res.rows.map(mapMosqueRow);
    } catch (err: any) {
      if (err.message && err.message.includes('requested_by_user_id')) {
        try {
          await query(`
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_user_id VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_phone VARCHAR(255);
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
            ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
          `);
          const retryRes = await query(`
            SELECT * FROM mosques WHERE requested_by_user_id = $1 ORDER BY created_at DESC
          `, [userId]);
          return retryRes.rows.map(mapMosqueRow);
        } catch (retryErr) {
          console.error('[DB] getUserMosqueRequests column migration fallback error:', retryErr);
          return [];
        }
      }
      throw err;
    }
  }

  async updateMosqueStatus(mosqueId: string, status: 'active' | 'pending' | 'rejected' | 'inactive'): Promise<MosqueRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE mosques SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [status, mosqueId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'mosques', 'SUCCESS', `id=${mosqueId}, status=${status}`);
      return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] updateMosqueStatus transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async regenerateMosqueQr(mosqueId: string): Promise<MosqueRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const newQr = `CAVE_MSQ_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const res = await client.query(`
        UPDATE mosques SET qr_identifier = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [newQr, mosqueId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'mosques', 'SUCCESS', `id=${mosqueId} (QR Regenerated)`);
      return res.rows.length > 0 ? mapMosqueRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] regenerateMosqueQr transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getAllMosquesAdmin(): Promise<MosqueRecord[]> {
    const res = await query(`SELECT * FROM mosques ORDER BY created_at DESC`);
    return res.rows.map(mapMosqueRow);
  }

  async deleteMosque(id: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`DELETE FROM mosques WHERE id = $1 RETURNING id`, [id]);
      await client.query('COMMIT');
      logDbTransaction('DELETE', 'mosques', 'SUCCESS', `id=${id}`);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('DELETE', 'mosques', 'FAILURE', err.message);
      console.error('[DB] deleteMosque transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 3. PRAYER ATTENDANCE
  // =========================================================================

  async recordPrayerAttendance(
    userId: string,
    mosqueOrId: MosqueRecord | string,
    prayerType: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | string,
    dateStr: string,
    qrPayload: string,
    userLat?: number,
    userLng?: number,
    savedAtOrScannedAt?: string,
    securityStatus?: string,
    riskScore?: number,
    riskReason?: string
  ): Promise<{ success: boolean; error?: string; message: string; record?: PrayerAttendanceRecord; attendance?: PrayerAttendanceRecord }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      let mosqueId = '';
      let mosqueName = '';
      if (typeof mosqueOrId === 'object' && mosqueOrId !== null) {
        mosqueId = mosqueOrId.id;
        mosqueName = mosqueOrId.name;
      } else {
        mosqueId = String(mosqueOrId);
        const mRes = await client.query('SELECT name FROM mosques WHERE id = $1', [mosqueId]);
        mosqueName = mRes.rows[0]?.name || 'Mosque';
      }

      // Check if already attended this prayer on this date
      const existing = await client.query(`
        SELECT * FROM prayer_attendances WHERE user_id = $1 AND date = $2 AND prayer_type = $3
      `, [userId, dateStr, prayerType]);

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'ALREADY_COMPLETED',
          message: 'এই ওয়াক্তের নামাজ ইতিমধ্যে যাচাই ও লিপিবদ্ধ হয়েছে।'
        };
      }

      const id = generateSecureId('ATT');
      const verifiedAtValue = savedAtOrScannedAt || new Date().toISOString();
      const dbSecurityStatus = securityStatus || 'verified';
      const dbRiskScore = riskScore || 0;
      const dbRiskReason = riskReason || '';

      const insertRes = await client.query(`
        INSERT INTO prayer_attendances (id, user_id, mosque_id, mosque_name, prayer_type, date, verified_at, status, qr_payload, security_status, risk_score, risk_reasons, scanned_at_original)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [id, userId, mosqueId, mosqueName, prayerType, dateStr, verifiedAtValue, dbSecurityStatus, qrPayload, dbSecurityStatus, dbRiskScore, dbRiskReason, savedAtOrScannedAt ? new Date(savedAtOrScannedAt) : null]);

      await client.query('COMMIT');
      const att = mapAttendanceRow(insertRes.rows[0]);
      return {
        success: true,
        message: 'নামাজের উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে।',
        attendance: att,
        record: att
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] recordPrayerAttendance error:', err);
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'নামাজ উপস্থিতি সংরক্ষণে সমস্যা হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  async getUserTodayAttendances(userId: string, todayStr: string): Promise<PrayerAttendanceRecord[]> {
    const res = await query(`
      SELECT * FROM prayer_attendances WHERE user_id = $1 AND date = $2 AND (security_status IS NULL OR security_status != 'quarantined') ORDER BY verified_at ASC
    `, [userId, todayStr]);
    return res.rows.map(mapAttendanceRow);
  }

  async getUserAttendanceHistory(userId: string, limit = 50): Promise<PrayerAttendanceRecord[]> {
    const res = await query(`
      SELECT * FROM prayer_attendances WHERE user_id = $1 ORDER BY verified_at DESC LIMIT $2
    `, [userId, limit]);
    return res.rows.map(mapAttendanceRow);
  }

  async getUserDailyPrayerHistoryGrouped(userId: string, limitDays = 30) {
    const res = await query(`
      SELECT * FROM prayer_attendances WHERE user_id = $1 ORDER BY date DESC, verified_at ASC
    `, [userId]);

    const grouped: Record<string, PrayerAttendanceRecord[]> = {};
    for (const row of res.rows) {
      const att = mapAttendanceRow(row);
      if (!grouped[att.date]) {
        grouped[att.date] = [];
      }
      grouped[att.date].push(att);
    }

    const result = Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, limitDays)
      .map(date => {
        const atts = grouped[date];
        const count = atts.length;
        let tokenType: TokenType | null = null;
        if (count >= 5) tokenType = 'GOLD';
        else if (count === 4) tokenType = 'SILVER';
        else if (count === 3) tokenType = 'BRONZE';

        return {
          date,
          completedCount: count,
          tokenEarned: tokenType,
          attendances: atts
        };
      });

    return result;
  }

  // =========================================================================
  // 4. TOKEN MANAGEMENT
  // =========================================================================

  async generateOrUpdateDailyToken(userId: string, dateStr: string): Promise<{ generated: boolean; token?: TokenRecord; action: string }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const attRes = await client.query(`
        SELECT COUNT(*) as count FROM prayer_attendances WHERE user_id = $1 AND date = $2 AND (security_status IS NULL OR security_status != 'quarantined')
      `, [userId, dateStr]);
      const count = Number(attRes.rows[0]?.count || 0);

      let targetType: TokenType | null = null;
      if (count >= 5) targetType = 'GOLD';
      else if (count === 4) targetType = 'SILVER';
      else if (count === 3) targetType = 'BRONZE';

      if (!targetType) {
        await client.query('ROLLBACK');
        return { generated: false, action: 'insufficient_prayers' };
      }

      // Fetch mosque info of their first attendance today
      let earnedMosqueId = null;
      let earnedMosqueName = null;
      const mosqueQuery = await client.query(`
        SELECT mosque_id, mosque_name FROM prayer_attendances 
        WHERE user_id = $1 AND date = $2 AND (security_status IS NULL OR security_status != 'quarantined')
        ORDER BY verified_at ASC LIMIT 1
      `, [userId, dateStr]);
      if (mosqueQuery.rows.length > 0) {
        earnedMosqueId = mosqueQuery.rows[0].mosque_id;
        earnedMosqueName = mosqueQuery.rows[0].mosque_name;
      } else {
        const latestMosque = await client.query(`
          SELECT mosque_id, mosque_name FROM prayer_attendances 
          WHERE user_id = $1 AND mosque_name IS NOT NULL AND mosque_name != '' 
          ORDER BY verified_at DESC LIMIT 1
        `, [userId]);
        if (latestMosque.rows.length > 0) {
          earnedMosqueId = latestMosque.rows[0].mosque_id;
          earnedMosqueName = latestMosque.rows[0].mosque_name;
        }
      }

      const existingRes = await client.query(`
        SELECT * FROM tokens WHERE user_id = $1 AND earned_date = $2 FOR UPDATE
      `, [userId, dateStr]);

      if (existingRes.rows.length === 0) {
        const tokenId = generateSecureId('TOK');
        const insertRes = await client.query(`
          INSERT INTO tokens (id, user_id, token_type, status, earned_date, source_prayer_count, earned_mosque_id, earned_mosque_name, created_at)
          VALUES ($1, $2, $3, 'AVAILABLE', $4, $5, $6, $7, NOW())
          RETURNING *
        `, [tokenId, userId, targetType, dateStr, count, earnedMosqueId, earnedMosqueName]);

        await client.query('COMMIT');
        return {
          generated: true,
          token: mapTokenRow(insertRes.rows[0]),
          action: 'created'
        };
      }

      const existing = mapTokenRow(existingRes.rows[0]);
      if (existing.status === 'USED') {
        await client.query('COMMIT');
        return { generated: false, token: existing, action: 'used_unchanged' };
      }

      // Upgrade check: Bronze -> Silver -> Gold
      const rank = { BRONZE: 1, SILVER: 2, GOLD: 3 };
      if (rank[targetType] > rank[existing.tokenType]) {
        const updateRes = await client.query(`
          UPDATE tokens
          SET token_type = $1, source_prayer_count = $2, earned_mosque_id = $3, earned_mosque_name = $4
          WHERE id = $5
          RETURNING *
        `, [targetType, count, earnedMosqueId, earnedMosqueName, existing.id]);

        await client.query('COMMIT');
        return {
          generated: true,
          token: mapTokenRow(updateRes.rows[0]),
          action: 'upgraded'
        };
      }

      await client.query('COMMIT');
      return { generated: false, token: existing, action: 'already_highest' };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] generateOrUpdateDailyToken error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getUserAvailableToken(userId: string): Promise<TokenRecord | null> {
    const res = await query(`
      SELECT * FROM tokens WHERE user_id = $1 AND status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 1
    `, [userId]);
    return res.rows.length > 0 ? mapTokenRow(res.rows[0]) : null;
  }

  async getUserTokens(userId: string): Promise<TokenRecord[] & { totalAvailable: number; available: TokenRecord[]; totalUsed: number; used: TokenRecord[] }> {
    const res = await query(`
      SELECT t.*, r.discount_amount, r.donated_amount 
      FROM tokens t
      LEFT JOIN redemptions r ON r.token_id = t.id
      WHERE t.user_id = $1 
      ORDER BY t.created_at DESC
    `, [userId]);
    const all = res.rows.map(mapTokenRow);
    const available = all.filter(t => t.status === 'AVAILABLE');
    const used = all.filter(t => t.status === 'USED');
    const result: any = all;
    result.available = available;
    result.totalAvailable = available.length;
    result.used = used;
    result.totalUsed = used.length;
    return result;
  }

  async getUserTokenById(arg1: string, arg2?: string): Promise<TokenRecord | null> {
    if (arg2) {
      const res = await query(`SELECT * FROM tokens WHERE user_id = $1 AND id = $2`, [arg1, arg2]);
      return res.rows.length > 0 ? mapTokenRow(res.rows[0]) : null;
    } else {
      const res = await query(`SELECT * FROM tokens WHERE id = $1`, [arg1]);
      return res.rows.length > 0 ? mapTokenRow(res.rows[0]) : null;
    }
  }

  async donateToken(userId: string, tokenId: string): Promise<{ success: boolean; message: string; token?: TokenRecord }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const tokenRes = await client.query(`
        SELECT * FROM tokens WHERE id = $1 AND user_id = $2 FOR UPDATE
      `, [tokenId, userId]);

      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'টোকেনটি পাওয়া যায়নি।' };
      }

      const token = mapTokenRow(tokenRes.rows[0]);
      if (token.status !== 'AVAILABLE') {
        await client.query('ROLLBACK');
        return { success: false, message: 'এই টোকেনটি ইতোমধ্যে ব্যবহৃত বা দান করা হয়ে গেছে।' };
      }

      if (token.isDonated) {
        await client.query('ROLLBACK');
        return { success: false, message: 'এই টোকেনটি ইতোমধ্যে দান করা হয়েছে।' };
      }

      const updateRes = await client.query(`
        UPDATE tokens 
        SET is_donated = TRUE, donated_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [tokenId, userId]);

      await client.query('COMMIT');
      return {
        success: true,
        message: 'টোকেনটি সফলভাবে দান করা হয়েছে!',
        token: mapTokenRow(updateRes.rows[0])
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] donateToken error:', err);
      return { success: false, message: 'ডাটাবেস ত্রুটি হয়েছে।' };
    } finally {
      client.release();
    }
  }

  async deleteUserUsedTokenHistory(userId: string, tokenId?: string): Promise<{ success: boolean; deletedCount: number }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      let count = 0;
      if (tokenId) {
        await client.query(`DELETE FROM redemptions WHERE user_id = $1 AND (token_id = $2 OR id = $2)`, [userId, tokenId]);
        const res = await client.query(`DELETE FROM tokens WHERE user_id = $1 AND id = $2`, [userId, tokenId]);
        count = res.rowCount || 0;
      } else {
        await client.query(`DELETE FROM redemptions WHERE user_id = $1`, [userId]);
        const res = await client.query(`DELETE FROM tokens WHERE user_id = $1 AND status = 'USED'`, [userId]);
        count = res.rowCount || 0;
      }
      await client.query('COMMIT');
      return { success: true, deletedCount: count };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] deleteUserUsedTokenHistory error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteUserDonatedTokenHistory(userId: string, tokenId?: string): Promise<{ success: boolean; deletedCount: number }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      let count = 0;
      if (tokenId) {
        await client.query(`DELETE FROM redemptions WHERE user_id = $1 AND (token_id = $2 OR id = $2)`, [userId, tokenId]);
        const res = await client.query(`DELETE FROM tokens WHERE user_id = $1 AND id = $2`, [userId, tokenId]);
        count = res.rowCount || 0;
      } else {
        await client.query(`DELETE FROM redemptions WHERE user_id = $1 AND token_id IN (SELECT id FROM tokens WHERE user_id = $1 AND is_donated = TRUE)`, [userId]);
        const res = await client.query(`DELETE FROM tokens WHERE user_id = $1 AND is_donated = TRUE`, [userId]);
        count = res.rowCount || 0;
      }
      await client.query('COMMIT');
      return { success: true, deletedCount: count };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] deleteUserDonatedTokenHistory error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async canUserRedeemToday(userId: string, todayDateStr: string): Promise<{ canRedeem: boolean; reason?: string }> {
    // Business Rule: There is NO daily limit on token spending/redemption.
    // A user may redeem/use as many valid unused tokens in a single day as they possess.
    return { canRedeem: true };
  }

  async evaluatePreviousDayGracePeriodToken(userId: string): Promise<{
    eligible: boolean;
    action: string;
    token?: TokenRecord;
    yesterdayDateStr: string;
    prayerCount: number;
    message?: string;
  }> {
    const yesterdayDateStr = getYesterdayDateString();
    const attRes = await query(`
      SELECT COUNT(*) as count FROM prayer_attendances WHERE user_id = $1 AND date = $2
    `, [userId, yesterdayDateStr]);
    const count = Number(attRes.rows[0]?.count || 0);

    if (count < 3) {
      return {
        eligible: false,
        action: 'none',
        yesterdayDateStr,
        prayerCount: count,
        message: 'গতকাল ৩ ওয়াক্ত বা ততোধিক জামাতে সালাত আদায় না করায় কোনো টোকেন অর্জিত হয়নি।'
      };
    }

    const genRes = await this.generateOrUpdateDailyToken(userId, yesterdayDateStr);
    return {
      eligible: true,
      action: genRes.action === 'created' ? 'claimed' : genRes.action,
      token: genRes.token,
      yesterdayDateStr,
      prayerCount: count,
      message: 'গতকালকের জামাত অনুযায়ী আপনার টোকেন সফলভাবে ইস্যু করা হয়েছে।'
    };
  }

  async redeemToken(userId: string, tokenId: string, todayStr: string, opts?: {
    shopId?: string;
    merchantId?: string;
    discount?: number;
    transactionAmount?: number;
  }): Promise<{ success: boolean; error?: string; message: string; token?: TokenRecord; redemption?: RedemptionRecord }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Atomic lock on the token to prevent race conditions and double-spending
      const tokenRes = await client.query(`
        SELECT * FROM tokens WHERE id = $1 AND user_id = $2 FOR UPDATE
      `, [tokenId, userId]);

      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_NOT_FOUND', message: 'টোকেনটি পাওয়া যায়নি।' };
      }

      const token = mapTokenRow(tokenRes.rows[0]);
      if (token.status !== 'AVAILABLE') {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতোমধ্যে ব্যবহার করা হয়েছে।' };
      }

      const redemptionId = generateSecureId('RDM');
      const user = await this.getUserById(userId);
      const bill = Number(opts?.transactionAmount || 100);
      const discountPercent = Number(opts?.discount || (token.tokenType === 'GOLD' ? 15 : token.tokenType === 'SILVER' ? 10 : 7));
      
      let commissionRate = 3.0;
      if (opts?.shopId) {
        const shopRes = await client.query(`SELECT commission_rate FROM shops WHERE id = $1`, [opts.shopId]);
        if (shopRes.rows.length > 0) {
          commissionRate = Number(shopRes.rows[0].commission_rate || 3.0);
        }
      }

      // If token is donated, user pays full bill (0 discount), and the discount becomes the donated amount!
      const isDonated = token.isDonated === true;
      const donatedAmount = isDonated ? Math.round((bill * discountPercent) / 100) : 0;
      const discountAmount = isDonated ? 0 : Math.round((bill * discountPercent) / 100);

      const totalCommissionPool = Math.round((bill * commissionRate) / 100);
      const finalAmount = bill - discountAmount;
      const caveCompanionsNetIncome = totalCommissionPool - discountAmount;
      const merchantPayoutAmount = finalAmount;

      let earnedMosqueId = null;
      let earnedMosqueName = null;
      const userGender = (user?.gender || '').toLowerCase();

      if (isDonated && userGender !== 'female') {
        earnedMosqueId = token.earnedMosqueId || null;
        earnedMosqueName = token.earnedMosqueName || null;
        if (!earnedMosqueName) {
          const mRes = await client.query(`
            SELECT mosque_id, mosque_name FROM prayer_attendances
            WHERE user_id = $1 AND mosque_name IS NOT NULL AND mosque_name != ''
            ORDER BY verified_at DESC LIMIT 1
          `, [userId]);
          if (mRes.rows.length > 0) {
            earnedMosqueId = mRes.rows[0].mosque_id;
            earnedMosqueName = mRes.rows[0].mosque_name;
          }
        }
      }

      // FINANCIAL INTEGRITY CHECK
      if (bill < 0 || totalCommissionPool < 0 || discountAmount < 0 || finalAmount < 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'FINANCIAL_VALIDATION_FAILED', message: 'আর্থিক হিসাব যাচাইকরণে ত্রুটি হয়েছে (নেগেটিভ ভ্যালু)।' };
      }

      const rdmRes = await client.query(`
        INSERT INTO redemptions (
          id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
          merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
          final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
          commission_amount, merchant_payout_amount,
          is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
          redeemed_at, date, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, 'Merchant', $10, $11, $12,
          $13, $14, $15, $16,
          $16, $17,
          $18, $19, $20, $21,
          NOW(), $22, 'COMPLETED'
        ) RETURNING *
      `, [
        redemptionId, token.id, token.tokenType, userId, user?.fullName || 'User', user?.phone || '',
        opts?.shopId || 'SHP-PARTNER', 'Partner Shop', opts?.merchantId || 'MCH-PARTNER',
        bill, discountPercent, discountAmount, finalAmount, commissionRate, totalCommissionPool, caveCompanionsNetIncome, merchantPayoutAmount,
        isDonated, donatedAmount, earnedMosqueId, earnedMosqueName, todayStr
      ]);

      const updateRes = await client.query(`
        UPDATE tokens SET status = 'USED', used_at = NOW(), redemption_ref = $1 WHERE id = $2 AND status = 'AVAILABLE'
      `, [redemptionId, token.id]);

      if (updateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতোমধ্যে ব্যবহার করা হয়েছে।' };
      }

      await client.query('COMMIT');
      return {
        success: true,
        message: 'টোকেন সফলভাবে রিডিম করা হয়েছে।',
        token: { ...token, status: 'USED', usedAt: new Date().toISOString(), redemptionRef: redemptionId },
        redemption: mapRedemptionRow(rdmRes.rows[0])
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] redeemToken error:', err);
      return { success: false, error: 'DB_ERROR', message: 'টোকেন রিডিম প্রক্রিয়ায় ত্রুটি হয়েছে।' };
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 5. SHOP & MERCHANT MANAGEMENT
  // =========================================================================

  async getActiveShopsForUser(filters?: { category?: string; search?: string; userLat?: number; userLng?: number }): Promise<ShopRecord[]> {
    let sql = `
      SELECT s.*, 
        COALESCE(r.avg_rating, 0) as average_rating,
        COALESCE(r.total_reviews, 0) as total_reviews
      FROM shops s
      LEFT JOIN (
        SELECT shop_id, ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total_reviews
        FROM shop_reviews
        GROUP BY shop_id
      ) r ON s.id = r.shop_id
      WHERE s.status = 'ACTIVE'
    `;
    const params: any[] = [];
    let idx = 1;

    console.log('[getActiveShopsForUser] Requested Filter Category:', filters?.category);

    if (filters?.category && filters.category !== 'all') {
      const cat = filters.category.trim().toLowerCase();
      console.log('[getActiveShopsForUser] Normalized Category for SQL:', cat);
      
      // Backward compatibility & canonical mapping
      if (cat === 'health' || cat === 'pharmacy') {
        sql += ` AND (LOWER(s.category) IN ('health', 'healthcare', 'pharmacy', 'health & pharmacy') OR LOWER(s.business_type) IN ('health', 'healthcare', 'pharmacy', 'health & pharmacy'))`;
      } else if (cat === 'food' || cat === 'restaurant') {
        sql += ` AND (LOWER(s.category) IN ('food', 'restaurant', 'food & restaurant') OR LOWER(s.business_type) IN ('food', 'restaurant', 'food & restaurant'))`;
      } else if (cat === 'clothing' || cat === 'fashion') {
        sql += ` AND (LOWER(s.category) IN ('clothing', 'fashion', 'fashion & clothing') OR LOWER(s.business_type) IN ('clothing', 'fashion', 'fashion & clothing'))`;
      } else if (cat === 'grocery') {
        sql += ` AND (LOWER(s.category) IN ('grocery', 'superstore', 'grocery & superstore') OR LOWER(s.business_type) IN ('grocery', 'superstore', 'grocery & superstore'))`;
      } else if (cat === 'electronics') {
        sql += ` AND (LOWER(s.category) IN ('electronics', 'gadgets', 'electronics & gadgets') OR LOWER(s.business_type) IN ('electronics', 'gadgets', 'electronics & gadgets'))`;
      } else if (cat === 'beauty') {
        sql += ` AND (LOWER(s.category) IN ('beauty', 'salon', 'beauty & salon') OR LOWER(s.business_type) IN ('beauty', 'salon', 'beauty & salon'))`;
      } else if (cat === 'service' || cat === 'services') {
        sql += ` AND (LOWER(s.category) IN ('service', 'services', 'services & repairs') OR LOWER(s.business_type) IN ('service', 'services', 'services & repairs'))`;
      } else if (cat === 'others' || cat === 'other') {
        sql += ` AND (LOWER(s.category) IN ('other', 'others') OR LOWER(s.business_type) IN ('other', 'others'))`;
      } else {
        sql += ` AND (LOWER(s.category) = $${idx} OR LOWER(s.business_type) = $${idx})`;
        params.push(cat);
        idx++;
      }
    }

    if (filters?.search && filters.search.trim()) {
      const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        sql += ` AND (LOWER(
          COALESCE(s.name, '') || ' ' ||
          COALESCE(s.name_bn, '') || ' ' ||
          COALESCE(s.category, '') || ' ' ||
          COALESCE(s.business_type, '') || ' ' ||
          COALESCE(s.district, '') || ' ' ||
          COALESCE(s.upazila_thana, '') || ' ' ||
          COALESCE(s.area, '') || ' ' ||
          COALESCE(s.address, '') || ' ' ||
          COALESCE(s.location_address, '') || ' ' ||
          COALESCE(s.description, '')
        ) LIKE $${idx})`;
        params.push(`%${term}%`);
        idx++;
      }
    }

    sql += ` ORDER BY s.name ASC`;
    console.log(`[getActiveShopsForUser] Executing SQL: ${sql}`);
    console.log(`[getActiveShopsForUser] With Params:`, params);

    const res = await query(sql, params);
    
    // Log exact shop types found
    const returnedCategories = res.rows.map(r => ({ id: r.id, name: r.name, category: r.category, business_type: r.business_type }));
    console.log(`[getActiveShopsForUser] Found ${res.rows.length} shops. Mapped types from DB:`, returnedCategories);

    const shops = res.rows.map(mapShopRow);

    // If user coordinates provided, compute real distance in km and sort
    const uLat = filters?.userLat;
    const uLng = filters?.userLng;
    if (typeof uLat === 'number' && !isNaN(uLat) && typeof uLng === 'number' && !isNaN(uLng)) {
      const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth radius km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      for (const s of shops) {
        if (s.latitude && s.longitude && (s.latitude !== 0 || s.longitude !== 0)) {
          const dist = calcDistance(uLat, uLng, s.latitude, s.longitude);
          s.distanceKm = Math.round(dist * 10) / 10;
        }
      }

      // Sort shops: located shops by distance ascending, then non-located shops
      shops.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return (a.nameBn || a.name).localeCompare(b.nameBn || b.name);
      });
    }

    return shops;
  }

  async updateShopLocation(shopId: string, locationData: { latitude: number; longitude: number; locationAddress?: string }): Promise<ShopRecord | null> {
    const res = await query(`
      UPDATE shops 
      SET latitude = $1, 
          longitude = $2, 
          location_address = $3, 
          location_updated_at = NOW(), 
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [
      locationData.latitude,
      locationData.longitude,
      locationData.locationAddress || null,
      shopId
    ]);

    if (res.rows.length === 0) return null;

    // Keep merchant_verifications synchronized as well
    await query(`
      UPDATE merchant_verifications 
      SET latitude = $1, 
          longitude = $2, 
          location_address = $3, 
          location_updated_at = NOW(), 
          updated_at = NOW()
      WHERE shop_id = $4
    `, [
      locationData.latitude,
      locationData.longitude,
      locationData.locationAddress || null,
      shopId
    ]).catch(() => {});

    return mapShopRow(res.rows[0]);
  }

  async getPublicShopById(id: string): Promise<ShopRecord | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;
    const strippedId = cleanId.replace(/^shop-/i, '').trim();

    const res = await query(`
      SELECT s.*, 
        COALESCE(r.avg_rating, 0) as average_rating,
        COALESCE(r.total_reviews, 0) as total_reviews
      FROM shops s
      LEFT JOIN (
        SELECT shop_id, ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total_reviews
        FROM shop_reviews
        GROUP BY shop_id
      ) r ON s.id = r.shop_id
      WHERE (
        s.id = $1 
        OR s.id = $2
        OR s.qr_identifier = $1 
        OR s.qr_identifier = $2
        OR s.owner_id = $1 
        OR s.owner_id = $2
        OR LOWER(s.id) = LOWER($1)
        OR LOWER(s.id) = LOWER($2)
        OR (s.id LIKE '%' || $1 || '%')
        OR (s.id LIKE '%' || $2 || '%')
      )
      ORDER BY CASE WHEN s.id = $1 OR s.id = $2 THEN 1 WHEN UPPER(s.status) = 'ACTIVE' THEN 2 ELSE 3 END
      LIMIT 1
    `, [cleanId, strippedId]);
    return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
  }

  async getShopById(id: string): Promise<ShopRecord | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;
    const strippedId = cleanId.replace(/^shop-/i, '').trim();

    const res = await query(`
      SELECT s.*, 
        COALESCE(r.avg_rating, 0) as average_rating,
        COALESCE(r.total_reviews, 0) as total_reviews
      FROM shops s
      LEFT JOIN (
        SELECT shop_id, ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total_reviews
        FROM shop_reviews
        GROUP BY shop_id
      ) r ON s.id = r.shop_id
      WHERE (
        s.id = $1 
        OR s.id = $2
        OR s.qr_identifier = $1 
        OR s.qr_identifier = $2
        OR s.owner_id = $1 
        OR s.owner_id = $2
        OR LOWER(s.id) = LOWER($1)
        OR LOWER(s.id) = LOWER($2)
        OR (s.id LIKE '%' || $1 || '%')
        OR (s.id LIKE '%' || $2 || '%')
      )
      ORDER BY CASE WHEN s.id = $1 OR s.id = $2 THEN 1 ELSE 2 END
      LIMIT 1
    `, [cleanId, strippedId]);
    return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
  }

  async getShopReviews(shopId: string): Promise<{ reviews: ReviewRecord[]; averageRating: number; totalReviews: number; ratingDistribution: Record<number, number> }> {
    const res = await query(`
      SELECT * FROM shop_reviews 
      WHERE shop_id = $1 
      ORDER BY created_at DESC
    `, [shopId]);

    const reviews: ReviewRecord[] = res.rows.map((r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      userId: r.user_id,
      userName: r.user_name,
      userPhone: r.user_phone,
      rating: Number(r.rating),
      comment: r.comment,
      reply: r.merchant_reply || undefined,
      repliedAt: r.merchant_reply_at ? (r.merchant_reply_at instanceof Date ? r.merchant_reply_at.toISOString() : String(r.merchant_reply_at)) : undefined,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : (r.updated_at ? String(r.updated_at) : undefined)
    }));

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating)));
      ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    });

    return { reviews, averageRating, totalReviews, ratingDistribution };
  }

  async addShopReview(shopId: string, userId: string, data: { rating: number; comment: string }): Promise<{ success: boolean; review: ReviewRecord; message: string }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('ইউজার তথ্য পাওয়া যায়নি।');

    const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
    const comment = data.comment?.trim() || '';

    if (!comment) {
      throw new Error('দয়া করে আপনার মতামত বা রিভিউ লিখুন।');
    }

    // Check if user already reviewed this shop
    const existing = await query(`SELECT id FROM shop_reviews WHERE shop_id = $1 AND user_id = $2`, [shopId, userId]);
    
    let reviewId = existing.rows.length > 0 ? existing.rows[0].id : generateSecureId('REV');

    if (existing.rows.length > 0) {
      await query(`
        UPDATE shop_reviews 
        SET rating = $1, comment = $2, user_name = $3, user_phone = $4, updated_at = NOW()
        WHERE id = $5
      `, [rating, comment, user.fullName || 'User', user.phone || '', reviewId]);
    } else {
      await query(`
        INSERT INTO shop_reviews (id, shop_id, user_id, user_name, user_phone, rating, comment, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [reviewId, shopId, userId, user.fullName || 'User', user.phone || '', rating, comment]);
    }

    const reviewRes = await query(`SELECT * FROM shop_reviews WHERE id = $1`, [reviewId]);
    const r = reviewRes.rows[0];

    const review: ReviewRecord = {
      id: r.id,
      shopId: r.shop_id,
      userId: r.user_id,
      userName: r.user_name,
      userPhone: r.user_phone,
      rating: Number(r.rating),
      comment: r.comment,
      reply: r.merchant_reply || undefined,
      repliedAt: r.merchant_reply_at ? (r.merchant_reply_at instanceof Date ? r.merchant_reply_at.toISOString() : String(r.merchant_reply_at)) : undefined,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined
    };

    return {
      success: true,
      review,
      message: 'আপনার রিভিউ এবং রেটিং সফলভাবে সংরক্ষিত হয়েছে। জাযাকাল্লাহু খাইরান!'
    };
  }

  async deleteShopReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<{ success: boolean; message: string }> {
    let res;
    if (isAdmin) {
      res = await query(`DELETE FROM shop_reviews WHERE id = $1`, [reviewId]);
    } else {
      res = await query(`DELETE FROM shop_reviews WHERE id = $1 AND user_id = $2`, [reviewId, userId]);
    }

    if (res.rowCount === 0) {
      return { success: false, message: 'রিভিউটি পাওয়া যায়নি বা ডিলিট করার অনুমতি নেই।' };
    }

    return { success: true, message: 'রিভিউটি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async replyToShopReview(reviewId: string, shopId: string, reply: string): Promise<boolean> {
    const res = await query(`
      UPDATE shop_reviews
      SET merchant_reply = $1, merchant_reply_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND shop_id = $3
      RETURNING id
    `, [reply.trim(), reviewId, shopId]);
    return res.rows.length > 0;
  }

  async getProductReviews(productId: string): Promise<{ reviews: ProductReviewRecord[]; averageRating: number; totalReviews: number; ratingDistribution: Record<number, number> }> {
    const res = await query(`
      SELECT * FROM product_reviews 
      WHERE product_id = $1 
      ORDER BY created_at DESC
    `, [productId]);

    const reviews: ProductReviewRecord[] = res.rows.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.user_name,
      userPhone: r.user_phone,
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : (r.updated_at ? String(r.updated_at) : undefined)
    }));

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating)));
      ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    });

    return { reviews, averageRating, totalReviews, ratingDistribution };
  }

  async addProductReview(productId: string, userId: string, data: { rating: number; comment: string }): Promise<{ success: boolean; review: ProductReviewRecord; message: string }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('ইউজার তথ্য পাওয়া যায়নি।');

    const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
    const comment = data.comment?.trim() || '';

    if (!comment) {
      throw new Error('দয়া করে আপনার মন্তব্য বা রিভিউ লিখুন।');
    }

    const existing = await query(`SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2`, [productId, userId]);
    let reviewId = existing.rows.length > 0 ? existing.rows[0].id : generateSecureId('PREV');

    if (existing.rows.length > 0) {
      await query(`
        UPDATE product_reviews 
        SET rating = $1, comment = $2, user_name = $3, user_phone = $4, updated_at = NOW()
        WHERE id = $5
      `, [rating, comment, user.fullName || 'User', user.phone || '', reviewId]);
    } else {
      await query(`
        INSERT INTO product_reviews (id, product_id, user_id, user_name, user_phone, rating, comment, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [reviewId, productId, userId, user.fullName || 'User', user.phone || '', rating, comment]);
    }

    const reviewRes = await query(`SELECT * FROM product_reviews WHERE id = $1`, [reviewId]);
    const r = reviewRes.rows[0];

    const review: ProductReviewRecord = {
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.user_name,
      userPhone: r.user_phone,
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined
    };

    return {
      success: true,
      review,
      message: 'পণ্যের রিভিউ সফলভাবে সংরক্ষিত হয়েছে। জাযাকাল্লাহু খাইরান!'
    };
  }

  async deleteProductReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<{ success: boolean; message: string }> {
    let res;
    if (isAdmin) {
      res = await query(`DELETE FROM product_reviews WHERE id = $1`, [reviewId]);
    } else {
      res = await query(`DELETE FROM product_reviews WHERE id = $1 AND user_id = $2`, [reviewId, userId]);
    }

    if (res.rowCount === 0) {
      return { success: false, message: 'রিভিউটি পাওয়া যায়নি বা ডিলিট করার অনুমতি নেই।' };
    }

    return { success: true, message: 'রিভিউটি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async getShopByQrIdentifier(qrIdentifier: string): Promise<ShopRecord | null> {
    const res = await query(`SELECT * FROM shops WHERE qr_identifier = $1`, [qrIdentifier]);
    return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
  }

  async verifyShopQr(qrPayload: string, userId?: string): Promise<{ valid: boolean; error?: string; message?: string; shop?: ShopRecord; verificationId?: string }> {
    if (!qrPayload || typeof qrPayload !== 'string') {
      return { valid: false, error: 'INVALID_PAYLOAD', message: 'অবৈধ QR কোড ডাটা।' };
    }

    let payloadObj: any = null;
    try {
      payloadObj = JSON.parse(qrPayload);
    } catch {
      // Direct string fallback
    }

    let shop: ShopRecord | null = null;
    if (payloadObj && payloadObj.qrIdentifier) {
      shop = await this.getShopByQrIdentifier(payloadObj.qrIdentifier);
    } else if (payloadObj && payloadObj.shopId) {
      shop = await this.getShopById(payloadObj.shopId);
    } else {
      shop = (await this.getShopByQrIdentifier(qrPayload)) || (await this.getShopById(qrPayload));
    }

    if (!shop) {
      return { valid: false, error: 'INVALID_SHOP_QR', message: 'ভুল বা অকার্যকর দোকানের QR কোড স্ক্যান করা হয়েছে। অনুগ্রহ করে সঠিক দোকানের QR কোড স্ক্যান করুন।' };
    }

    if (shop.status !== 'ACTIVE') {
      return { valid: false, error: 'INVALID_SHOP_QR', message: 'ভুল বা অকার্যকর দোকানের QR কোড স্ক্যান করা হয়েছে। অনুগ্রহ করে সঠিক দোকানের QR কোড স্ক্যান করুন।' };
    }

    let verificationId: string | undefined;
    if (userId) {
      const vId = `VQR-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

      await query(`
        INSERT INTO qr_verifications (id, user_id, shop_id, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [vId, userId, shop.id, expiresAt]);
      
      verificationId = vId;
    }

    return { valid: true, shop, verificationId, message: 'পার্টনার শপ সফলভাবে শনাক্ত করা হয়েছে।' };
  }

  async getQrVerification(id: string, userId: string): Promise<{ valid: boolean; shopId?: string; error?: string }> {
    const res = await query(`
      SELECT * FROM qr_verifications 
      WHERE id = $1 AND user_id = $2 AND used = FALSE AND expires_at > NOW()
    `, [id, userId]);

    if (res.rows.length === 0) {
      return { valid: false, error: 'VERIFICATION_EXPIRED_OR_INVALID' };
    }

    return { valid: true, shopId: res.rows[0].shop_id };
  }

  async markQrVerificationUsed(id: string): Promise<void> {
    await query(`UPDATE qr_verifications SET used = TRUE WHERE id = $1`, [id]);
  }

  async createShop(data: {
    name: string;
    nameBn?: string;
    ownerName?: string;
    phone: string;
    address: string;
    area?: string;
    district?: string;
    upazilaThana?: string;
    category?: string;
    description?: string;
    openingHours?: string;
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
    commissionRate?: number;
    initialPin?: string;
    ownerPin?: string;
    status?: ShopStatus;
  }): Promise<{ shop: ShopRecord; merchant: MerchantRecord }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const shopId = generateSecureId('SHP');
      const merchantId = generateSecureId('MCH');
      const normalizedPhone = normalizePhoneNumber(data.phone);
      const district = data.district?.trim() || 'Dhaka';
      const area = data.area?.trim() || 'Gulshan';

      const qrIdentifier = `CAVE_SHP_${Date.now()}_${district.toUpperCase()}_${area.toUpperCase()}`.replace(/\s+/g, '_');
      const qrSecret = generateSecureSecret('SEC_');

      const shopRes = await client.query(`
        INSERT INTO shops (
          id, name, name_bn, owner_id, phone, address, area, district, upazila_thana, category, description,
          opening_hours, status, qr_identifier, qr_secret, gold_discount, silver_discount,
          bronze_discount, commission_rate, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17,
          $18, $19, NOW(), NOW()
        ) RETURNING *
      `, [
        shopId,
        data.name.trim(),
        (data.nameBn || data.name).trim(),
        merchantId,
        normalizedPhone,
        data.address.trim(),
        area,
        district,
        data.upazilaThana?.trim() || area,
        (data.category || 'others').trim().toLowerCase(),
        data.description?.trim() || '',
        data.openingHours?.trim() || '10:00 AM - 10:00 PM',
        data.status || 'ACTIVE',
        qrIdentifier,
        qrSecret,
        data.goldDiscount ?? 15,
        data.silverDiscount ?? 10,
        data.bronzeDiscount ?? 7,
        data.commissionRate ?? 3.0
      ]);

      const pinToUse = data.ownerPin || data.initialPin || crypto.randomInt(100000, 1000000).toString();
      const pinHash = bcrypt.hashSync(pinToUse, 10);
      const merchantRes = await client.query(`
        INSERT INTO merchants (id, name, phone, pin, shop_id, role, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'MERCHANT', 'active', NOW())
        RETURNING *
      `, [
        merchantId,
        (data.ownerName || 'Manager').trim(),
        normalizedPhone,
        pinHash,
        shopId
      ]);

      await client.query('COMMIT');
      logDbTransaction('INSERT', 'shops', 'SUCCESS', `shopId=${shopId}`);
      return {
        shop: mapShopRow(shopRes.rows[0]),
        merchant: mapMerchantRow(merchantRes.rows[0])
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('INSERT', 'shops', 'FAILURE', err.message);
      console.error('[DB] createShop error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateShopAdmin(
    shopId: string,
    updates: {
      name?: string;
      nameBn?: string;
      category?: string;
      phone?: string;
      address?: string;
      area?: string;
      district?: string;
      description?: string;
      openingHours?: string;
      goldDiscount?: number;
      silverDiscount?: number;
      bronzeDiscount?: number;
      commissionRate?: number;
      status?: ShopStatus;
    }
  ): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${idx++}`);
        values.push(updates.name.trim());
      }
      if (updates.nameBn !== undefined) {
        setClauses.push(`name_bn = $${idx++}`);
        values.push(updates.nameBn.trim());
      }
      if (updates.category !== undefined) {
        setClauses.push(`category = $${idx++}`);
        values.push(updates.category.trim().toLowerCase());
      }
      if (updates.phone !== undefined) {
        setClauses.push(`phone = $${idx++}`);
        values.push(updates.phone.trim());
      }
      if (updates.address !== undefined) {
        setClauses.push(`address = $${idx++}`);
        values.push(updates.address.trim());
      }
      if (updates.area !== undefined) {
        setClauses.push(`area = $${idx++}`);
        values.push(updates.area.trim());
      }
      if (updates.district !== undefined) {
        setClauses.push(`district = $${idx++}`);
        values.push(updates.district.trim());
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${idx++}`);
        values.push(updates.description.trim());
      }
      if (updates.openingHours !== undefined) {
        setClauses.push(`opening_hours = $${idx++}`);
        values.push(updates.openingHours.trim());
      }
      if (updates.goldDiscount !== undefined) {
        setClauses.push(`gold_discount = $${idx++}`);
        values.push(updates.goldDiscount);
      }
      if (updates.silverDiscount !== undefined) {
        setClauses.push(`silver_discount = $${idx++}`);
        values.push(updates.silverDiscount);
      }
      if (updates.bronzeDiscount !== undefined) {
        setClauses.push(`bronze_discount = $${idx++}`);
        values.push(updates.bronzeDiscount);
      }
      if (updates.commissionRate !== undefined) {
        setClauses.push(`commission_rate = $${idx++}`);
        values.push(updates.commissionRate);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${idx++}`);
        values.push(updates.status);
      }

      setClauses.push(`updated_at = NOW()`);

      values.push(shopId);
      const res = await client.query(`
        UPDATE shops
        SET ${setClauses.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `, values);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId}`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] updateShopAdmin transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateShopInfo(shopId: string, updates: { phone?: string; openingHours?: string; description?: string; address?: string }): Promise<ShopRecord | null> {
    return this.updateShopAdmin(shopId, updates);
  }

  async updateShopOfferRequest(
    shopId: string,
    updates: {
      goldDiscount: number;
      silverDiscount: number;
      bronzeDiscount: number;
    }
  ): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops
        SET pending_gold_discount = $1,
            pending_silver_discount = $2,
            pending_bronze_discount = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [updates.goldDiscount, updates.silverDiscount, updates.bronzeDiscount, shopId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (Offer Request Created)`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] updateShopOfferRequest transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getShopOffers(shopId: string): Promise<any> {
    const shop = await this.getShopById(shopId);
    if (!shop) throw new Error('শপ পাওয়া যায়নি।');
    return {
      shopId: shop.id,
      commissionPercent: Number(shop.commissionRate),
      goldDiscountPercent: Number(shop.goldDiscount),
      silverDiscountPercent: Number(shop.silverDiscount),
      bronzeDiscountPercent: Number(shop.bronzeDiscount),
      updatedAt: shop.updatedAt,
      updatedBy: shop.updatedBy || null
    };
  }

  async updateShopOffers(
    shopId: string,
    data: {
      commissionPercent: number;
      goldDiscountPercent: number;
      silverDiscountPercent: number;
      bronzeDiscountPercent: number;
    },
    adminId: string
  ): Promise<any> {
    if (data.goldDiscountPercent > data.commissionPercent) {
      throw new Error(`গোল্ড ডিসকাউন্ট (${data.goldDiscountPercent}%) কমিশনের (${data.commissionPercent}%) চেয়ে বেশি হতে পারবে না।`);
    }
    if (data.silverDiscountPercent > data.commissionPercent) {
      throw new Error(`সিলভার ডিসকাউন্ট (${data.silverDiscountPercent}%) কমিশনের (${data.commissionPercent}%) চেয়ে বেশি হতে পারবে না।`);
    }
    if (data.bronzeDiscountPercent > data.commissionPercent) {
      throw new Error(`ব্রোঞ্জ ডিসকাউন্ট (${data.bronzeDiscountPercent}%) কমিশনের (${data.commissionPercent}%) চেয়ে বেশি হতে পারবে না।`);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops
        SET commission_rate = $1,
            gold_discount = $2,
            silver_discount = $3,
            bronze_discount = $4,
            updated_at = NOW(),
            updated_by = $5
        WHERE id = $6
        RETURNING *
      `, [
        data.commissionPercent,
        data.goldDiscountPercent,
        data.silverDiscountPercent,
        data.bronzeDiscountPercent,
        adminId,
        shopId
      ]);

      if (res.rows.length === 0) {
        throw new Error('শপ পাওয়া যায়নি।');
      }

      await client.query('COMMIT');
      const row = res.rows[0];
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} offers updated by admin=${adminId}`);
      return {
        shopId: row.id,
        commissionPercent: Number(row.commission_rate),
        goldDiscountPercent: Number(row.gold_discount),
        silverDiscountPercent: Number(row.silver_discount),
        bronzeDiscountPercent: Number(row.bronze_discount),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
        updatedBy: row.updated_by
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] updateShopOffers transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateShopQrSecret(shopId: string, newQrSecret: string): Promise<ShopRecord | null> {
    const res = await query(`
      UPDATE shops SET qr_secret = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [newQrSecret, shopId]);
    return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
  }

  async getCommissionChangeRequests(shopId?: string): Promise<any[]> {
    let q = `
      SELECT c.*, s.name as shop_name, s.name_bn as shop_name_bn, s.phone as shop_phone,
             s.gold_discount, s.silver_discount, s.bronze_discount
      FROM commission_change_requests c
      JOIN shops s ON c.shop_id = s.id
    `;
    const params: any[] = [];
    if (shopId) {
      q += ` WHERE c.shop_id = $1`;
      params.push(shopId);
    }
    q += ` ORDER BY c.created_at DESC`;
    const res = await query(q, params);
    return res.rows.map(row => ({
      id: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name_bn || row.shop_name,
      shopPhone: row.shop_phone,
      currentCommissionPercent: Number(row.current_commission_percent),
      requestedCommissionPercent: Number(row.requested_commission_percent),
      status: row.status,
      reason: row.reason || '',
      adminNote: row.admin_note || '',
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      goldDiscount: Number(row.gold_discount || 0),
      silverDiscount: Number(row.silver_discount || 0),
      bronzeDiscount: Number(row.bronze_discount || 0)
    }));
  }

  async createCommissionChangeRequest(shopId: string, requestedCommissionPercent: number, reason?: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const shopRes = await client.query('SELECT * FROM shops WHERE id = $1', [shopId]);
      if (shopRes.rows.length === 0) {
        throw new Error('Shop not found');
      }
      const shop = shopRes.rows[0];
      const currentCommission = Number(shop.commission_rate || 3.0);

      const requestId = generateSecureId('CCR');
      const insRes = await client.query(`
        INSERT INTO commission_change_requests (id, shop_id, current_commission_percent, requested_commission_percent, reason, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
        RETURNING *
      `, [requestId, shopId, currentCommission, requestedCommissionPercent, reason || null]);

      await client.query('COMMIT');
      const row = insRes.rows[0];
      return {
        id: row.id,
        shopId: row.shop_id,
        currentCommissionPercent: Number(row.current_commission_percent),
        requestedCommissionPercent: Number(row.requested_commission_percent),
        reason: row.reason || '',
        status: row.status,
        createdAt: row.created_at
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async reviewCommissionChangeRequest(requestId: string, status: 'approved' | 'rejected', adminId: string, adminNote?: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const reqRes = await client.query('SELECT * FROM commission_change_requests WHERE id = $1', [requestId]);
      if (reqRes.rows.length === 0) {
        throw new Error('Request not found');
      }
      const reqRow = reqRes.rows[0];
      if (reqRow.status !== 'pending') {
        throw new Error('Request already reviewed');
      }

      if (status === 'approved') {
        await client.query(
          `UPDATE shops SET commission_rate = $1, updated_at = NOW() WHERE id = $2`,
          [reqRow.requested_commission_percent, reqRow.shop_id]
        );
      }

      const updRes = await client.query(`
        UPDATE commission_change_requests
        SET status = $1, reviewed_at = NOW(), reviewed_by = $2, admin_note = $3
        WHERE id = $4
        RETURNING *
      `, [status, adminId, adminNote || null, requestId]);

      await client.query('COMMIT');
      const row = updRes.rows[0];
      return {
        id: row.id,
        shopId: row.shop_id,
        currentCommissionPercent: Number(row.current_commission_percent),
        requestedCommissionPercent: Number(row.requested_commission_percent),
        status: row.status,
        reason: row.reason || '',
        adminNote: row.admin_note || '',
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateShopStatus(shopId: string, status: ShopStatus): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
      `, [status, shopId]);

      // Synchronize merchant account status and increment token_version to invalidate existing tokens
      const merchantStatus = status === 'ACTIVE' ? 'active' : (status === 'SUSPENDED' ? 'suspended' : 'inactive');
      await client.query(`
        UPDATE merchants 
        SET status = $1, 
            token_version = COALESCE(token_version, 1) + 1,
            updated_at = NOW() 
        WHERE shop_id = $2
      `, [merchantStatus, shopId]);

      // Synchronize merchant_verifications status if applicable
      const verificationMerchantStatus = status === 'ACTIVE' ? 'ACTIVE' : (status === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE');
      await client.query(`
        UPDATE merchant_verifications 
        SET merchant_status = $1, 
            updated_at = NOW() 
        WHERE shop_id = $2
      `, [verificationMerchantStatus, shopId]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId}, status=${status}`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] updateShopStatus transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async regenerateShopQr(shopId: string): Promise<{ success: boolean; shop?: ShopRecord; error?: string }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const newQr = `CAVE_SHP_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const newSecret = generateSecureSecret('SEC_');

      const res = await client.query(`
        UPDATE shops
        SET qr_identifier = $1, qr_secret = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [newQr, newSecret, shopId]);

      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        logDbTransaction('UPDATE', 'shops', 'FAILURE', `shopId=${shopId} (Not Found)`);
        return { success: false, error: 'SHOP_NOT_FOUND' };
      }

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (QR Regenerated)`);
      return { success: true, shop: mapShopRow(res.rows[0]) };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] regenerateShopQr transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async approveMerchantRequest(shopId: string): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *
      `, [shopId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (Merchant Approved)`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] approveMerchantRequest transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectMerchantRequest(shopId: string): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *
      `, [shopId]);
      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (Merchant Rejected)`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] rejectMerchantRequest transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async approveOfferRequest(shopId: string): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const shop = await this.getShopById(shopId);
      if (!shop) {
        await client.query('ROLLBACK');
        logDbTransaction('UPDATE', 'shops', 'FAILURE', `shopId=${shopId} (Offer Not Found)`);
        return null;
      }

      const res = await client.query(`
        UPDATE shops
        SET gold_discount = COALESCE(pending_gold_discount, gold_discount),
            silver_discount = COALESCE(pending_silver_discount, silver_discount),
            bronze_discount = COALESCE(pending_bronze_discount, bronze_discount),
            pending_gold_discount = NULL,
            pending_silver_discount = NULL,
            pending_bronze_discount = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [shopId]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (Offer Approved)`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] approveOfferRequest transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectOfferRequest(shopId: string): Promise<ShopRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(`
        UPDATE shops
        SET pending_gold_discount = NULL,
            pending_silver_discount = NULL,
            pending_bronze_discount = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [shopId]);

      await client.query('COMMIT');
      logDbTransaction('UPDATE', 'shops', 'SUCCESS', `shopId=${shopId} (Offer Rejected)`);
      return res.rows.length > 0 ? mapShopRow(res.rows[0]) : null;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logDbTransaction('UPDATE', 'shops', 'FAILURE', err.message);
      console.error('[DB] rejectOfferRequest transaction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getAllShopsAdmin(): Promise<ShopRecord[]> {
    const res = await query(`SELECT * FROM shops ORDER BY created_at DESC`);
    return res.rows.map(mapShopRow);
  }

  async deleteShop(id: string): Promise<boolean> {
    return this.deletePartnerShop(id);
  }

  async deleteMerchant(id: string): Promise<boolean> {
    return this.deletePartnerShop(id);
  }

  async deletePartnerShop(identifier: string): Promise<boolean> {
    if (!identifier) return false;
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const cleanIdentifier = String(identifier).trim();
      const normalizedPhone = normalizePhoneNumber(cleanIdentifier);
      const phoneSuffix = normalizedPhone.length >= 10 ? `%${normalizedPhone.slice(-10)}%` : cleanIdentifier;

      // 1. Gather all related records from merchants
      const merchantsInfo = await client.query(`
        SELECT id, shop_id, phone FROM merchants 
        WHERE id = $1 
           OR shop_id = $1 
           OR phone = $1 
           OR phone = $2
           OR phone LIKE $3
      `, [cleanIdentifier, normalizedPhone, phoneSuffix]);

      // 2. Gather all related records from merchant_verifications
      const verificationsInfo = await client.query(`
        SELECT id, merchant_id, shop_id, phone FROM merchant_verifications 
        WHERE id = $1 
           OR merchant_id = $1 
           OR shop_id = $1 
           OR phone = $1 
           OR phone = $2
           OR phone LIKE $3
      `, [cleanIdentifier, normalizedPhone, phoneSuffix]);

      // 3. Gather all related records from shops
      const shopsInfo = await client.query(`
        SELECT id, owner_id, phone FROM shops 
        WHERE id = $1 
           OR owner_id = $1 
           OR phone = $1 
           OR phone = $2
           OR phone LIKE $3
      `, [cleanIdentifier, normalizedPhone, phoneSuffix]);

      const allShopIds = Array.from(new Set([
        ...merchantsInfo.rows.map(r => r.shop_id),
        ...verificationsInfo.rows.map(r => r.shop_id),
        ...shopsInfo.rows.map(r => r.id),
        cleanIdentifier.startsWith('SHP') ? cleanIdentifier : null
      ])).filter(Boolean) as string[];

      const allMerchantIds = Array.from(new Set([
        ...merchantsInfo.rows.map(r => r.id),
        ...verificationsInfo.rows.map(r => r.merchant_id),
        ...shopsInfo.rows.map(r => r.owner_id),
        cleanIdentifier.startsWith('MCH') ? cleanIdentifier : null
      ])).filter(Boolean) as string[];

      const allVerificationIds = Array.from(new Set([
        ...verificationsInfo.rows.map(r => r.id),
        cleanIdentifier.startsWith('VRF') ? cleanIdentifier : null
      ])).filter(Boolean) as string[];

      const allPhones = Array.from(new Set([
        ...merchantsInfo.rows.map(r => r.phone),
        ...verificationsInfo.rows.map(r => r.phone),
        ...shopsInfo.rows.map(r => r.phone),
        normalizedPhone,
        cleanIdentifier
      ])).filter(Boolean) as string[];

      // 4. Clean up child tables associated with shops
      if (allShopIds.length > 0) {
        await client.query(`DELETE FROM order_items WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM cart_items WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM product_price_change_requests WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM product_delete_requests WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM products WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM shop_reviews WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM commission_change_requests WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM qr_verifications WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM token_redemption_requests WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM redemptions WHERE shop_id = ANY($1::text[])`, [allShopIds]);
        await client.query(`DELETE FROM online_financial_records WHERE shop_id = ANY($1::text[])`, [allShopIds]);
      }

      if (allMerchantIds.length > 0) {
        await client.query(`DELETE FROM redemptions WHERE merchant_id = ANY($1::text[])`, [allMerchantIds]);
      }

      const safeVerificationIds = allVerificationIds.length > 0 ? allVerificationIds : ['__NONE__'];
      const safeShopIds = allShopIds.length > 0 ? allShopIds : ['__NONE__'];
      const safeMerchantIds = allMerchantIds.length > 0 ? allMerchantIds : ['__NONE__'];
      const safePhones = allPhones.length > 0 ? allPhones : Array.from(new Set([cleanIdentifier, normalizedPhone])).filter(Boolean);

      // 5. Delete merchant verifications
      await client.query(`
        DELETE FROM merchant_verifications 
        WHERE id = ANY($1::text[]) 
           OR shop_id = ANY($2::text[]) 
           OR merchant_id = ANY($3::text[])
           OR phone = ANY($4::text[])
           OR id = $5
           OR shop_id = $5
           OR merchant_id = $5
           OR phone = $5
           OR phone = $6
      `, [safeVerificationIds, safeShopIds, safeMerchantIds, safePhones, cleanIdentifier, normalizedPhone]);

      // 6. Delete merchants
      await client.query(`
        DELETE FROM merchants 
        WHERE id = ANY($1::text[]) 
           OR shop_id = ANY($2::text[])
           OR phone = ANY($3::text[])
           OR id = $4
           OR shop_id = $4
           OR phone = $4
           OR phone = $5
      `, [safeMerchantIds, safeShopIds, safePhones, cleanIdentifier, normalizedPhone]);

      // 7. Delete shops
      await client.query(`
        DELETE FROM shops 
        WHERE id = ANY($1::text[])
           OR owner_id = ANY($2::text[])
           OR phone = ANY($3::text[])
           OR id = $4
           OR owner_id = $4
           OR phone = $4
           OR phone = $5
      `, [safeShopIds, safeMerchantIds, safePhones, cleanIdentifier, normalizedPhone]);

      await client.query('COMMIT');
      logDbTransaction('DELETE', 'partner_shop', 'SUCCESS', `identifier=${identifier}`);
      return true;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] deletePartnerShop error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getMerchantByPhone(phone: string): Promise<MerchantRecord | null> {
    if (!phone) return null;
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const normalized = normalizePhoneNumber(phone);
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    const res = await query(`
      SELECT * FROM merchants 
      WHERE phone = $1 
         OR phone = $2 
         OR ($3 != '' AND (
              phone = ('0' || $3) OR 
              phone = ('+880' || $3) OR 
              phone = ('880' || $3) OR 
              phone = $3 OR 
              phone LIKE '%' || $3
            ))
      ORDER BY created_at DESC
      LIMIT 1
    `, [normalized, phone.trim(), last10]);
    return res.rows.length > 0 ? mapMerchantRow(res.rows[0]) : null;
  }

  async getMerchantById(id: string): Promise<MerchantRecord | null> {
    const res = await query(`SELECT * FROM merchants WHERE id = $1`, [id]);
    return res.rows.length > 0 ? mapMerchantRow(res.rows[0]) : null;
  }

  async verifyMerchantPin(merchantIdOrPhone: string, pin: string): Promise<boolean> {
    const clean = merchantIdOrPhone.trim();
    const normalized = normalizePhoneNumber(clean);
    const res = await query(`
      SELECT pin FROM merchants WHERE id = $1 OR phone = $2
    `, [clean, normalized]);

    if (res.rows.length === 0) return false;
    const pinHash = res.rows[0].pin;
    return bcrypt.compareSync(pin, pinHash);
  }

  async updateShopSettings(shopId: string, settings: {
    phone?: string;
    openingHours?: string;
    description?: string;
    address?: string;
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
  }): Promise<{ success: boolean; shop?: ShopRecord; error?: string }> {
    const shop = await this.getShopById(shopId);
    if (!shop) {
      return { success: false, error: 'SHOP_NOT_FOUND' };
    }

    let hasPendingDiscounts = false;
    const updates: any = {};
    if (settings.phone) updates.phone = settings.phone;
    if (settings.openingHours) updates.openingHours = settings.openingHours;
    if (settings.description) updates.description = settings.description;
    if (settings.address) updates.address = settings.address;

    // Check if discounts were requested to change
    if (
      (settings.goldDiscount !== undefined && settings.goldDiscount !== shop.goldDiscount) ||
      (settings.silverDiscount !== undefined && settings.silverDiscount !== shop.silverDiscount) ||
      (settings.bronzeDiscount !== undefined && settings.bronzeDiscount !== shop.bronzeDiscount)
    ) {
      hasPendingDiscounts = true;
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const res = await client.query(`
          UPDATE shops
          SET pending_gold_discount = $1,
              pending_silver_discount = $2,
              pending_bronze_discount = $3,
              phone = COALESCE($4, phone),
              opening_hours = COALESCE($5, opening_hours),
              description = COALESCE($6, description),
              address = COALESCE($7, address),
              updated_at = NOW()
          WHERE id = $8
          RETURNING *
        `, [
          settings.goldDiscount ?? shop.goldDiscount,
          settings.silverDiscount ?? shop.silverDiscount,
          settings.bronzeDiscount ?? shop.bronzeDiscount,
          settings.phone || null,
          settings.openingHours || null,
          settings.description || null,
          settings.address || null,
          shopId
        ]);
        await client.query('COMMIT');
        return {
          success: true,
          shop: mapShopRow(res.rows[0]),
          error: hasPendingDiscounts ? 'PENDING_DISCOUNTS' : undefined
        };
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[DB] updateShopSettings transaction error:', err);
        throw err;
      } finally {
        client.release();
      }
    }

    const updated = await this.updateShopAdmin(shopId, updates);
    return {
      success: true,
      shop: updated || shop
    };
  }

  // =========================================================================
  // 6. REDEMPTION TRANSACTIONS (ATOMIC)
  // =========================================================================

  async executeRedemptionTransaction(params: {
    tokenId: string;
    userId: string;
    verificationId: string;
    billAmount?: number;
    purchaseAmount?: number;
    merchantId?: string;
    todayDateStr?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
    redemption?: RedemptionRecord;
    user?: UserRecord;
    token?: TokenRecord;
    shop?: ShopRecord;
  }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Validate QR Verification
      const vRes = await client.query(`
        SELECT * FROM qr_verifications 
        WHERE id = $1 AND user_id = $2 AND used = FALSE AND expires_at > NOW()
        FOR UPDATE
      `, [params.verificationId, params.userId]);

      if (vRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'QR_VERIFICATION_INVALID', message: 'QR কোড যাচাইকরণ সময় শেষ হয়ে গেছে বা অবৈধ। অনুগ্রহ করে পুনরায় স্ক্যান করুন।' };
      }
      const shopId = vRes.rows[0].shop_id;

      // 2. Lock user row
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [params.userId]);
      if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        return { success: false, error: 'USER_INACTIVE', message: 'ব্যবহারকারীর অ্যাকাউন্ট সক্রিয় নেই।' };
      }
      const user = mapUserRow(userRes.rows[0]);

      // 3. Lock and verify token
      const tokenRes = await client.query(`SELECT * FROM tokens WHERE id = $1 AND user_id = $2 FOR UPDATE`, [params.tokenId, params.userId]);
      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_NOT_FOUND', message: 'টোকেনটি খুঁজে পাওয়া যায়নি।' };
      }
      const token = mapTokenRow(tokenRes.rows[0]);
      if (token.status === 'USED') {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতিমধ্যে ব্যবহার করা হয়েছে।' };
      }

      // 4. Get Shop details
      const shopRes = await client.query(`SELECT * FROM shops WHERE id = $1`, [shopId]);
      if (shopRes.rows.length === 0 || shopRes.rows[0].status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return { success: false, error: 'SHOP_INVALID', message: 'পার্টনার শপটি বর্তমানে সক্রিয় নেই।' };
      }
      const shop = mapShopRow(shopRes.rows[0]);

      // 4. Calculate amounts
      let discountRate = shop.bronzeDiscount;
      if (token.tokenType === 'GOLD') discountRate = shop.goldDiscount;
      else if (token.tokenType === 'SILVER') discountRate = shop.silverDiscount;

      const rawAmount = params.billAmount ?? params.purchaseAmount ?? 0;
      const bill = Number(rawAmount);
      if (isNaN(bill) || bill <= 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVALID_BILL_AMOUNT', message: 'সঠিক বিলের পরিমাণ উল্লেখ করুন।' };
      }

      const commissionRate = Number(shop.commissionRate || 0);
      
      // Check donation status & calculate
      const isDonated = token.isDonated === true;
      const donatedAmount = isDonated ? Math.round((bill * discountRate) / 100) : 0;
      const discountAmount = isDonated ? 0 : Math.round((bill * discountRate) / 100);
      
      // 1. Total Commission Pool = B * C / 100
      const grossCommissionAmount = Math.round((bill * commissionRate) / 100);
      
      // 3. User Pays Merchant = B - Token Benefit Amount (Full bill if donated)
      const finalAmount = bill - discountAmount;
      
      // 4. Cave Companions Net Commission = Total Commission Pool - Token Benefit Amount
      const caveCompanionsNetIncome = grossCommissionAmount - discountAmount;
      
      // 5. Merchant Payout / Final Amount Received = User Pays Merchant
      const merchantPayoutAmount = finalAmount;

      // Mosque name lookup fallback
      let earnedMosqueId = null;
      let earnedMosqueName = null;
      const userGender = (user?.gender || '').toLowerCase();

      if (isDonated && userGender !== 'female') {
        earnedMosqueId = token.earnedMosqueId || null;
        earnedMosqueName = token.earnedMosqueName || null;
        if (!earnedMosqueName) {
          const mRes = await client.query(`
            SELECT mosque_id, mosque_name FROM prayer_attendances
            WHERE user_id = $1 AND mosque_name IS NOT NULL AND mosque_name != ''
            ORDER BY verified_at DESC LIMIT 1
          `, [params.userId]);
          if (mRes.rows.length > 0) {
            earnedMosqueId = mRes.rows[0].mosque_id;
            earnedMosqueName = mRes.rows[0].mosque_name;
          }
        }
      }

      // FINANCIAL INTEGRITY CHECK
      if (
        bill < 0 || grossCommissionAmount < 0 || discountAmount < 0 || 
        finalAmount < 0 || caveCompanionsNetIncome < 0 || merchantPayoutAmount < 0
      ) {
        await client.query('ROLLBACK');
        return { success: false, error: 'FINANCIAL_VALIDATION_FAILED', message: 'আর্থিক হিসাব যাচাইকরণে ত্রুটি হয়েছে (নেগেটিভ ভ্যালু)। ডিসকাউন্ট কি কমিশন রেট থেকে বেশি?' };
      }

      const redemptionId = generateSecureId('RDM');
      const todayDateStr = getTodayDateString();

      // 5. Insert redemption record
      const rdmRes = await client.query(`
        INSERT INTO redemptions (
          id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
          merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
          final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
          commission_amount, merchant_payout_amount,
          is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
          redeemed_at, date, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $17, $18,
          $19, $20, $21, $22,
          NOW(), $23, 'COMPLETED'
        ) RETURNING *
      `, [
        redemptionId, token.id, token.tokenType, user.id, user.fullName, user.phone, shop.id, shop.name,
        params.merchantId || shop.ownerId, 'Merchant', bill, discountRate, discountAmount,
        finalAmount, commissionRate, grossCommissionAmount, caveCompanionsNetIncome,
        merchantPayoutAmount,
        isDonated, donatedAmount, earnedMosqueId, earnedMosqueName,
        todayDateStr
      ]);

      // 6. Update token status to USED
      const updateTokenRes = await client.query(`
        UPDATE tokens SET status = 'USED', used_at = NOW(), redemption_ref = $1 WHERE id = $2 AND status = 'AVAILABLE'
      `, [redemptionId, token.id]);

      if (updateTokenRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতোমধ্যে ব্যবহার করা হয়েছে।' };
      }

      // 7. Mark QR Verification as used
      await client.query(`UPDATE qr_verifications SET used = TRUE WHERE id = $1`, [params.verificationId]);

      await client.query('COMMIT');

      const redemption = mapRedemptionRow(rdmRes.rows[0]);
      return {
        success: true,
        message: 'ডিসকাউন্ট সফলভাবে রিডিম করা হয়েছে।',
        redemption,
        user,
        token: { ...token, status: 'USED', usedAt: new Date().toISOString(), redemptionRef: redemptionId },
        shop
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] executeRedemptionTransaction error:', err);
      return {
        success: false,
        error: 'REDEMPTION_FAILED',
        message: 'রিডেম্পশন সম্পন্ন করতে ব্যর্থ হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Automatically expires any stale PENDING token redemption requests and releases held tokens back to AVAILABLE.
   */
  async expireStaleRedemptionRequests(existingClient?: any): Promise<number> {
    const client = existingClient || (await getClient());
    const shouldRelease = !existingClient;
    try {
      if (shouldRelease) await client.query('BEGIN');

      const staleRes = await client.query(`
        SELECT id, token_id FROM token_redemption_requests
        WHERE status = 'PENDING' AND expires_at < NOW()
        FOR UPDATE
      `);

      if (staleRes.rows.length > 0) {
        for (const row of staleRes.rows) {
          await client.query(`
            UPDATE token_redemption_requests
            SET status = 'EXPIRED', processed_at = NOW()
            WHERE id = $1
          `, [row.id]);

          await client.query(`
            UPDATE tokens
            SET status = 'AVAILABLE'
            WHERE id = $1 AND status = 'PENDING_REDEMPTION'
          `, [row.token_id]);
        }
      }

      if (shouldRelease) await client.query('COMMIT');
      return staleRes.rows.length;
    } catch (err) {
      if (shouldRelease) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
      }
      console.warn('[DB] expireStaleRedemptionRequests warning:', err);
      return 0;
    } finally {
      if (shouldRelease) client.release();
    }
  }

  /**
   * User creates a Token Redemption Request for an offline partner shop.
   * Atomically locks token into PENDING_REDEMPTION state so it cannot be double-spent.
   */
  async createTokenRedemptionRequest(params: {
    userId: string;
    tokenId: string;
    verificationId: string;
    purchaseAmount: number;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
    request?: TokenRedemptionRequestRecord;
  }> {
    // Run stale cleanup first
    await this.expireStaleRedemptionRequests();

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Validate QR Verification
      const vRes = await client.query(`
        SELECT * FROM qr_verifications 
        WHERE id = $1 AND user_id = $2 AND used = FALSE AND expires_at > NOW()
        FOR UPDATE
      `, [params.verificationId, params.userId]);

      if (vRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'QR_VERIFICATION_INVALID',
          message: 'QR কোড যাচাইকরণের মেয়াদ শেষ হয়ে গেছে বা এটি অবৈধ। অনুগ্রহ করে পুনরায় স্ক্যান করুন।'
        };
      }
      const shopId = vRes.rows[0].shop_id;

      // 2. Lock user row
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [params.userId]);
      if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        return { success: false, error: 'USER_INACTIVE', message: 'ব্যবহারকারীর অ্যাকাউন্ট সক্রিয় নেই।' };
      }
      const user = mapUserRow(userRes.rows[0]);

      // 3. Lock and verify token
      const tokenRes = await client.query(`SELECT * FROM tokens WHERE id = $1 AND user_id = $2 FOR UPDATE`, [params.tokenId, params.userId]);
      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_NOT_FOUND', message: 'টোকেনটি খুঁজে পাওয়া যায়নি।' };
      }
      const token = mapTokenRow(tokenRes.rows[0]);
      if (token.status === 'USED') {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতোমধ্যে ব্যবহার করা হয়েছে।' };
      }
      if (token.status === 'PENDING_REDEMPTION') {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_PENDING', message: 'এই টোকেনটির একটি অনুরোধ ইতোমধ্যে দোকানে অপেক্ষমান রয়েছে।' };
      }

      // Check if there is already an active pending request with this token
      const existingReqRes = await client.query(`
        SELECT id FROM token_redemption_requests
        WHERE token_id = $1 AND status = 'PENDING' AND expires_at > NOW()
      `, [token.id]);
      if (existingReqRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_PENDING', message: 'এই টোকেনটির একটি অনুমোদন অনুরোধ ইতোমধ্যে অপেক্ষমান রয়েছে।' };
      }

      // 4. Get Shop details
      const shopRes = await client.query(`SELECT * FROM shops WHERE id = $1`, [shopId]);
      if (shopRes.rows.length === 0 || shopRes.rows[0].status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return { success: false, error: 'SHOP_INVALID', message: 'পার্টনার শপটি বর্তমানে সক্রিয় নেই।' };
      }
      const shop = mapShopRow(shopRes.rows[0]);

      // 5. Calculate amounts
      let discountRate = shop.bronzeDiscount;
      if (token.tokenType === 'GOLD') discountRate = shop.goldDiscount;
      else if (token.tokenType === 'SILVER') discountRate = shop.silverDiscount;

      const bill = Number(params.purchaseAmount || 0);
      if (isNaN(bill) || bill <= 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVALID_BILL_AMOUNT', message: 'সঠিক ক্রয়ের পরিমাণ উল্লেখ করুন।' };
      }

      const commissionRate = Number(shop.commissionRate || 0);
      const isDonated = token.isDonated === true;
      const donatedAmount = isDonated ? Math.round((bill * discountRate) / 100) : 0;
      const discountAmount = isDonated ? 0 : Math.round((bill * discountRate) / 100);
      const grossCommissionAmount = Math.round((bill * commissionRate) / 100);
      const finalPayable = bill - discountAmount;
      const caveCompanionsNetIncome = grossCommissionAmount - discountAmount;
      const merchantPayoutAmount = finalPayable;

      if (
        bill < 0 || grossCommissionAmount < 0 || discountAmount < 0 || 
        finalPayable < 0 || caveCompanionsNetIncome < 0 || merchantPayoutAmount < 0
      ) {
        await client.query('ROLLBACK');
        return { success: false, error: 'FINANCIAL_VALIDATION_FAILED', message: 'আর্থিক হিসাব যাচাইকরণে ত্রুটি হয়েছে।' };
      }

      const requestId = generateSecureId('TRQ');

      // 6. Reserve token so it cannot be double-spent
      const updateTokenRes = await client.query(`
        UPDATE tokens SET status = 'PENDING_REDEMPTION' WHERE id = $1 AND status = 'AVAILABLE'
      `, [token.id]);

      if (updateTokenRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_RESERVATION_FAILED', message: 'টোকেন সংরক্ষণ করা সম্ভব হয়নি। টোকেনটি ইতিমধ্যে ব্যবহৃত হতে পারে।' };
      }

      // 7. Insert Token Redemption Request with 15 minutes TTL
      const reqRes = await client.query(`
        INSERT INTO token_redemption_requests (
          id, user_id, user_name, user_phone, shop_id, shop_name, merchant_id,
          token_id, token_type, is_donated, purchase_amount, discount_percent,
          discount_amount, final_payable, donated_amount, commission_rate,
          gross_commission_amount, cave_companions_net_income, merchant_payout_amount,
          status, verification_id, created_at, expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19,
          'PENDING', $20, NOW(), NOW() + INTERVAL '15 minutes'
        ) RETURNING *
      `, [
        requestId, user.id, user.fullName, user.phone, shop.id, shop.nameBn || shop.name, shop.ownerId,
        token.id, token.tokenType, isDonated, bill, discountRate,
        discountAmount, finalPayable, donatedAmount, commissionRate,
        grossCommissionAmount, caveCompanionsNetIncome, merchantPayoutAmount,
        params.verificationId
      ]);

      await client.query('COMMIT');

      const requestRecord = mapTokenRedemptionRequestRow(reqRes.rows[0]);
      return {
        success: true,
        message: 'টোকেন অফার রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে। দোকানের অনুমোদনের জন্য অপেক্ষা করুন।',
        request: requestRecord
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] createTokenRedemptionRequest error:', err);
      return {
        success: false,
        error: 'REQUEST_FAILED',
        message: 'টোকেন অফার রিকোয়েস্ট তৈরি করতে ব্যর্থ হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Merchant approves a Token Redemption Request.
   * Atomically marks token USED, generates the Cash Memo / Redemption record, and updates Accounting.
   */
  async approveTokenRedemptionRequest(params: {
    requestId: string;
    merchantId: string;
    merchantShopId: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
    redemption?: RedemptionRecord;
    request?: TokenRedemptionRequestRecord;
  }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock the request row
      const reqRes = await client.query(`
        SELECT * FROM token_redemption_requests
        WHERE id = $1 FOR UPDATE
      `, [params.requestId]);

      if (reqRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'NOT_FOUND', message: 'অনুরোধটি পাওয়া যায়নি।' };
      }

      const reqRow = reqRes.rows[0];

      // Verify shop authorization
      if (reqRow.shop_id !== params.merchantShopId) {
        await client.query('ROLLBACK');
        return { success: false, error: 'FORBIDDEN', message: 'আপনি শুধুমাত্র আপনার নিজের দোকানের রিকোয়েস্ট অনুমোদন করতে পারবেন।' };
      }

      // Check status
      if (reqRow.status === 'APPROVED') {
        await client.query('ROLLBACK');
        return { success: false, error: 'ALREADY_APPROVED', message: 'এই অনুরোধটি ইতোমধ্যে অনুমোদিত হয়েছে।' };
      }
      if (reqRow.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVALID_STATUS', message: `অনুরোধটির স্ট্যাটাস (${reqRow.status}) অনুমোদনের যোগ্য নয়।` };
      }

      // Check if expired
      const expiresAt = new Date(reqRow.expires_at);
      if (expiresAt.getTime() < Date.now()) {
        await client.query(`
          UPDATE token_redemption_requests SET status = 'EXPIRED', processed_at = NOW(), processed_by = $1 WHERE id = $2
        `, [params.merchantId, params.requestId]);
        await client.query(`
          UPDATE tokens SET status = 'AVAILABLE' WHERE id = $1 AND status = 'PENDING_REDEMPTION'
        `, [reqRow.token_id]);
        await client.query('COMMIT');
        return { success: false, error: 'EXPIRED', message: 'অনুরোধটির নির্ধারিত সময়সীমা পার হয়ে গেছে।' };
      }

      // 2. Lock token row
      const tokenRes = await client.query(`
        SELECT * FROM tokens WHERE id = $1 FOR UPDATE
      `, [reqRow.token_id]);

      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_NOT_FOUND', message: 'টোকেনটি পাওয়া যায়নি।' };
      }
      const token = mapTokenRow(tokenRes.rows[0]);
      if (token.status === 'USED') {
        await client.query('ROLLBACK');
        return { success: false, error: 'TOKEN_ALREADY_USED', message: 'এই টোকেনটি ইতোমধ্যে ব্যবহার করা হয়েছে।' };
      }

      // 3. Lock user row
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [reqRow.user_id]);
      const user = userRes.rows.length > 0 ? mapUserRow(userRes.rows[0]) : null;

      // 4. Get Shop details
      const shopRes = await client.query(`SELECT * FROM shops WHERE id = $1`, [reqRow.shop_id]);
      const shop = shopRes.rows.length > 0 ? mapShopRow(shopRes.rows[0]) : null;

      const bill = Number(reqRow.purchase_amount);
      const discountRate = Number(reqRow.discount_percent);
      const discountAmount = Number(reqRow.discount_amount);
      const finalAmount = Number(reqRow.final_payable);
      const commissionRate = Number(reqRow.commission_rate);
      const grossCommissionAmount = Number(reqRow.gross_commission_amount);
      const caveCompanionsNetIncome = Number(reqRow.cave_companions_net_income);
      const merchantPayoutAmount = Number(reqRow.merchant_payout_amount);
      const isDonated = reqRow.is_donated === true || reqRow.is_donated === 'true';
      const donatedAmount = Number(reqRow.donated_amount || 0);

      // Mosque fallback for donated tokens
      let earnedMosqueId = null;
      let earnedMosqueName = null;
      const userGender = (user?.gender || '').toLowerCase();

      if (isDonated && userGender !== 'female') {
        earnedMosqueId = token.earnedMosqueId || null;
        earnedMosqueName = token.earnedMosqueName || null;
        if (!earnedMosqueName) {
          const mRes = await client.query(`
            SELECT mosque_id, mosque_name FROM prayer_attendances
            WHERE user_id = $1 AND mosque_name IS NOT NULL AND mosque_name != ''
            ORDER BY verified_at DESC LIMIT 1
          `, [reqRow.user_id]);
          if (mRes.rows.length > 0) {
            earnedMosqueId = mRes.rows[0].mosque_id;
            earnedMosqueName = mRes.rows[0].mosque_name;
          }
        }
      }

      const redemptionId = generateSecureId('RDM');
      const todayDateStr = getTodayDateString();

      // 5. Insert redemption record (Cash Memo & Admin Accounting)
      const rdmRes = await client.query(`
        INSERT INTO redemptions (
          id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
          merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
          final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
          commission_amount, merchant_payout_amount,
          is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
          redeemed_at, date, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $17, $18,
          $19, $20, $21, $22,
          NOW(), $23, 'COMPLETED'
        ) RETURNING *
      `, [
        redemptionId, token.id, token.tokenType, reqRow.user_id, reqRow.user_name, reqRow.user_phone,
        reqRow.shop_id, reqRow.shop_name, params.merchantId, 'Merchant',
        bill, discountRate, discountAmount,
        finalAmount, commissionRate, grossCommissionAmount, caveCompanionsNetIncome,
        merchantPayoutAmount,
        isDonated, donatedAmount, earnedMosqueId, earnedMosqueName,
        todayDateStr
      ]);

      // 6. Update token status to USED
      await client.query(`
        UPDATE tokens SET status = 'USED', used_at = NOW(), redemption_ref = $1 WHERE id = $2
      `, [redemptionId, token.id]);

      // 7. Update Token Redemption Request status to APPROVED
      const updatedReqRes = await client.query(`
        UPDATE token_redemption_requests
        SET status = 'APPROVED', redemption_id = $1, processed_at = NOW(), processed_by = $2
        WHERE id = $3
        RETURNING *
      `, [redemptionId, params.merchantId, params.requestId]);

      // 8. Mark QR verification as used if present
      if (reqRow.verification_id) {
        await client.query(`UPDATE qr_verifications SET used = TRUE WHERE id = $1`, [reqRow.verification_id]);
      }

      await client.query('COMMIT');

      const redemption = mapRedemptionRow(rdmRes.rows[0]);
      const updatedRequest = mapTokenRedemptionRequestRow(updatedReqRes.rows[0]);
      updatedRequest.redemption = redemption;

      return {
        success: true,
        message: 'টোকেন অফার সফলভাবে অনুমোদিত হয়েছে।',
        redemption,
        request: updatedRequest
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] approveTokenRedemptionRequest error:', err);
      return {
        success: false,
        error: 'APPROVAL_FAILED',
        message: 'অনুরোধ অনুমোদন করতে ব্যর্থ হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Merchant rejects a Token Redemption Request.
   * Atomically restores token status to AVAILABLE and marks request REJECTED.
   * CRITICAL PRINCIPLE: Rejection NEVER destroys user's token.
   */
  async rejectTokenRedemptionRequest(params: {
    requestId: string;
    merchantId: string;
    merchantShopId: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
    request?: TokenRedemptionRequestRecord;
  }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(`
        SELECT * FROM token_redemption_requests
        WHERE id = $1 FOR UPDATE
      `, [params.requestId]);

      if (reqRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'NOT_FOUND', message: 'অনুরোধটি পাওয়া যায়নি।' };
      }

      const reqRow = reqRes.rows[0];

      if (reqRow.shop_id !== params.merchantShopId) {
        await client.query('ROLLBACK');
        return { success: false, error: 'FORBIDDEN', message: 'আপনি শুধুমাত্র আপনার নিজের দোকানের রিকোয়েস্ট প্রত্যাখ্যান করতে পারবেন।' };
      }

      if (reqRow.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVALID_STATUS', message: `অনুরোধটির স্ট্যাটাস ইতোমধ্যে ${reqRow.status}।` };
      }

      // Restore token to AVAILABLE
      await client.query(`
        UPDATE tokens SET status = 'AVAILABLE' WHERE id = $1
      `, [reqRow.token_id]);

      // Update request to REJECTED
      const updatedReqRes = await client.query(`
        UPDATE token_redemption_requests
        SET status = 'REJECTED', rejection_reason = $1, processed_at = NOW(), processed_by = $2
        WHERE id = $3
        RETURNING *
      `, [params.reason || 'দোকানদার কর্তৃক প্রত্যাখ্যান করা হয়েছে', params.merchantId, params.requestId]);

      await client.query('COMMIT');

      const updatedRequest = mapTokenRedemptionRequestRow(updatedReqRes.rows[0]);
      return {
        success: true,
        message: 'টোকেন অফার রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে। গ্রাহকের টোকেন অক্ষত রয়েছে।',
        request: updatedRequest
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] rejectTokenRedemptionRequest error:', err);
      return {
        success: false,
        error: 'REJECTION_FAILED',
        message: 'অনুরোধ প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  /**
   * User cancels their own pending Token Redemption Request.
   * Restores token status back to AVAILABLE.
   */
  async cancelTokenRedemptionRequest(params: {
    requestId: string;
    userId: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
  }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(`
        SELECT * FROM token_redemption_requests
        WHERE id = $1 AND user_id = $2 FOR UPDATE
      `, [params.requestId, params.userId]);

      if (reqRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'NOT_FOUND', message: 'অনুরোধটি পাওয়া যায়নি।' };
      }

      const reqRow = reqRes.rows[0];

      if (reqRow.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVALID_STATUS', message: `অনুরোধটি ইতোমধ্যে ${reqRow.status} হয়েছে, বাতিল করা সম্ভব নয়।` };
      }

      // Restore token to AVAILABLE
      await client.query(`
        UPDATE tokens SET status = 'AVAILABLE' WHERE id = $1
      `, [reqRow.token_id]);

      // Update request to CANCELLED
      await client.query(`
        UPDATE token_redemption_requests
        SET status = 'CANCELLED', processed_at = NOW(), processed_by = $1
        WHERE id = $2
      `, [params.userId, params.requestId]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'অনুরোধটি সফলভাবে বাতিল করা হয়েছে এবং আপনার টোকেন পুনরায় ব্যবহারযোগ্য রয়েছে।'
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[DB] cancelTokenRedemptionRequest error:', err);
      return {
        success: false,
        error: 'CANCEL_FAILED',
        message: 'অনুরোধ বাতিল করতে ব্যর্থ হয়েছে।'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get pending redemption requests count for merchant shop badge.
   */
  async getPendingRedemptionRequestsCountForShop(shopId: string): Promise<number> {
    await this.expireStaleRedemptionRequests();
    const res = await query(`
      SELECT COUNT(*) as count FROM token_redemption_requests
      WHERE shop_id = $1 AND status = 'PENDING' AND expires_at > NOW()
    `, [shopId]);
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  /**
   * List redemption requests for merchant shop.
   */
  async getRedemptionRequestsForShop(shopId: string, status?: string): Promise<TokenRedemptionRequestRecord[]> {
    await this.expireStaleRedemptionRequests();
    let res;
    if (status && status !== 'ALL') {
      res = await query(`
        SELECT r.*, rdm.id as rdm_id, rdm.redeemed_at, rdm.bill_amount as rdm_bill, rdm.discount_amount as rdm_discount, rdm.final_amount as rdm_final
        FROM token_redemption_requests r
        LEFT JOIN redemptions rdm ON r.redemption_id = rdm.id
        WHERE r.shop_id = $1 AND r.status = $2
        ORDER BY r.created_at DESC
      `, [shopId, status]);
    } else {
      res = await query(`
        SELECT r.*, rdm.id as rdm_id, rdm.redeemed_at, rdm.bill_amount as rdm_bill, rdm.discount_amount as rdm_discount, rdm.final_amount as rdm_final
        FROM token_redemption_requests r
        LEFT JOIN redemptions rdm ON r.redemption_id = rdm.id
        WHERE r.shop_id = $1
        ORDER BY r.created_at DESC
      `, [shopId]);
    }
    return res.rows.map(mapTokenRedemptionRequestRow);
  }

  /**
   * List redemption requests for user.
   */
  async getUserRedemptionRequests(userId: string): Promise<TokenRedemptionRequestRecord[]> {
    await this.expireStaleRedemptionRequests();
    const res = await query(`
      SELECT r.*, rdm.id as rdm_id, rdm.redeemed_at, rdm.bill_amount as rdm_bill, rdm.discount_amount as rdm_discount, rdm.final_amount as rdm_final
      FROM token_redemption_requests r
      LEFT JOIN redemptions rdm ON r.redemption_id = rdm.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);
    return res.rows.map(mapTokenRedemptionRequestRow);
  }

  /**
   * Get single redemption request by ID with full details.
   */
  async getRedemptionRequestById(requestId: string): Promise<TokenRedemptionRequestRecord | null> {
    await this.expireStaleRedemptionRequests();
    const res = await query(`
      SELECT r.*, rdm.id as rdm_id, rdm.redeemed_at, rdm.bill_amount as rdm_bill, rdm.discount_amount as rdm_discount, rdm.final_amount as rdm_final
      FROM token_redemption_requests r
      LEFT JOIN redemptions rdm ON r.redemption_id = rdm.id
      WHERE r.id = $1
    `, [requestId]);

    if (res.rows.length === 0) return null;
    const reqRecord = mapTokenRedemptionRequestRow(res.rows[0]);

    if (reqRecord.redemptionId) {
      const rdmRes = await query(`SELECT * FROM redemptions WHERE id = $1`, [reqRecord.redemptionId]);
      if (rdmRes.rows.length > 0) {
        reqRecord.redemption = mapRedemptionRow(rdmRes.rows[0]);
      }
    }

    return reqRecord;
  }

  async getUserRedemptions(userId: string): Promise<Array<Omit<RedemptionRecord, 'commissionRate' | 'grossCommissionAmount' | 'caveCompanionsNetIncome'>>> {
    const res = await query(`
      SELECT r.*, u.gender as user_gender
      FROM redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1 ORDER BY r.redeemed_at DESC
    `, [userId]);
    return res.rows.map(row => {
      const r = mapRedemptionRow(row);
      const { commissionRate, grossCommissionAmount, caveCompanionsNetIncome, ...safe } = r;
      return safe;
    });
  }

  async getAdminAccountsShops() {
    try {
      const res = await query(`
        SELECT 
          s.*,
          (SELECT COUNT(*) FROM redemptions r WHERE r.shop_id = s.id AND r.status = 'COMPLETED') as total_redemptions,
          (SELECT COALESCE(SUM(r.bill_amount), 0) FROM redemptions r WHERE r.shop_id = s.id AND r.status = 'COMPLETED') as total_revenue
        FROM shops s 
        WHERE s.status = 'ACTIVE' 
        ORDER BY s.name ASC
      `);
      return res.rows.map(r => ({ 
        id: r.id, 
        shopName: r.name,
        shopNameBn: r.name_bn || r.name,
        district: r.district || '',
        upazila: r.upazila_thana || r.upazila || r.area || '',
        area: r.area || '',
        address: r.address || '',
        phone: r.phone || '',
        category: r.category || '',
        totalRedemptions: Number(r.total_redemptions || 0),
        totalRevenue: Number(r.total_revenue || 0),
        createdAt: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)) : undefined
      }));
    } catch (err) {
      // Fallback in case subqueries fail on older schema
      const res = await query(`SELECT * FROM shops WHERE status = 'ACTIVE' ORDER BY name ASC`);
      return res.rows.map(r => ({ 
        id: r.id, 
        shopName: r.name,
        shopNameBn: r.name_bn || r.name,
        district: r.district || '',
        upazila: r.upazila_thana || r.upazila || r.area || '',
        area: r.area || '',
        address: r.address || '',
        phone: r.phone || '',
        category: r.category || '',
        totalRedemptions: 0,
        totalRevenue: 0,
        createdAt: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)) : undefined
      }));
    }
  }

  async getAdminAccountsShopSummary(shopId: string, filters?: { dateFrom?: string; dateTo?: string; tokenType?: string }) {
    let sql = `
      SELECT 
        COALESCE(SUM(bill_amount), 0) as total_amount,
        COALESCE(SUM(gross_commission_amount), 0) as total_gross_commission,
        COALESCE(SUM(discount_amount), 0) as total_token_benefits,
        COALESCE(SUM(cave_companions_net_income), 0) as total_net_income,
        COALESCE(SUM(merchant_payout_amount), 0) as total_merchant_payout,
        COALESCE(SUM(CASE WHEN is_donated = TRUE THEN donated_amount ELSE 0 END), 0) as total_donated_amount,
        COUNT(*) as total_count
      FROM redemptions
      WHERE shop_id = $1 AND status = 'COMPLETED'
    `;
    const params: any[] = [shopId];
    let idx = 2;

    if (filters?.dateFrom) {
      sql += ` AND redeemed_at >= $${idx++}`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      sql += ` AND redeemed_at <= $${idx++}`;
      params.push(filters.dateTo);
    }
    if (filters?.tokenType && filters.tokenType !== 'ALL') {
      sql += ` AND token_type = $${idx++}`;
      params.push(filters.tokenType);
    }

    const res = await query(sql, params);
    return {
      totalAmount: Number(res.rows[0].total_amount),
      totalGrossCommission: Number(res.rows[0].total_gross_commission),
      totalTokenBenefits: Number(res.rows[0].total_token_benefits),
      totalNetIncome: Number(res.rows[0].total_net_income),
      totalMerchantPayout: Number(res.rows[0].total_merchant_payout),
      totalDonatedAmount: Number(res.rows[0].total_donated_amount),
      totalCount: Number(res.rows[0].total_count)
    };
  }

  async getAdminAccountsShopRedemptions(shopId: string, filters?: { dateFrom?: string; dateTo?: string; tokenType?: string }) {
    let sql = `
      SELECT r.*, u.gender as user_gender
      FROM redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.shop_id = $1 AND r.status = 'COMPLETED'
    `;
    const params: any[] = [shopId];
    let idx = 2;

    if (filters?.dateFrom) {
      sql += ` AND r.redeemed_at >= $${idx++}`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      sql += ` AND r.redeemed_at <= $${idx++}`;
      params.push(filters.dateTo);
    }
    if (filters?.tokenType && filters.tokenType !== 'ALL') {
      sql += ` AND r.token_type = $${idx++}`;
      params.push(filters.tokenType);
    }

    sql += ` ORDER BY r.redeemed_at DESC`;
    const res = await query(sql, params);
    return res.rows.map(mapRedemptionRow);
  }

  async deleteRedemptionRecord(redemptionId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Get token_id before deleting
      const res = await client.query('SELECT token_id FROM redemptions WHERE id = $1', [redemptionId]);
      if (res.rows.length > 0) {
        const tokenId = res.rows[0].token_id;
        // Optionally restore token? The user said "delete only the specific record". 
        // I will restore token status to ACTIVE so it doesn't cause broken references elsewhere.
        await client.query("UPDATE tokens SET status = 'ACTIVE', used_at = NULL, redemption_ref = NULL WHERE id = $1", [tokenId]);
      }

      const delRes = await client.query('DELETE FROM redemptions WHERE id = $1', [redemptionId]);
      await client.query('COMMIT');
      return (delRes.rowCount || 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] deleteRedemptionRecord error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  async getShopRedemptions(shopId: string, dateStr?: string): Promise<RedemptionRecord[]> {
    let sql = `
      SELECT r.*, u.gender as user_gender
      FROM redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.shop_id = $1 AND (r.merchant_history_deleted = FALSE OR r.merchant_history_deleted IS NULL)
    `;
    const params: any[] = [shopId];
    if (dateStr) {
      sql += ` AND r.date = $2`;
      params.push(dateStr);
    }
    sql += ` ORDER BY r.redeemed_at DESC`;
    const res = await query(sql, params);
    return res.rows.map(mapRedemptionRow);
  }

  async getMerchantDashboardStats(shopId: string, todayDateStr: string) {
    const todayRes = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(bill_amount), 0) as total_sales,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM redemptions
      WHERE shop_id = $1 AND date = $2
    `, [shopId, todayDateStr]);

    const lifetimeRes = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(bill_amount), 0) as total_sales,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM redemptions
      WHERE shop_id = $1
    `, [shopId]);

    const shop = await this.getShopById(shopId);

    return {
      today: {
        totalRedemptions: Number(todayRes.rows[0]?.count || 0),
        totalSales: Number(todayRes.rows[0]?.total_sales || 0),
        totalDiscountGiven: Number(todayRes.rows[0]?.total_discounts || 0)
      },
      lifetime: {
        totalRedemptions: Number(lifetimeRes.rows[0]?.count || 0),
        totalSales: Number(lifetimeRes.rows[0]?.total_sales || 0),
        totalDiscountGiven: Number(lifetimeRes.rows[0]?.total_discounts || 0)
      },
      rates: {
        goldDiscount: shop?.goldDiscount || 15,
        silverDiscount: shop?.silverDiscount || 10,
        bronzeDiscount: shop?.bronzeDiscount || 7,
        commissionRate: shop?.commissionRate || 3.0
      }
    };
  }

  async getAllTransactionsAdmin(): Promise<RedemptionRecord[]> {
    const res = await query(`
      SELECT r.*, u.gender as user_gender
      FROM redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.redeemed_at DESC
    `);
    return res.rows.map(mapRedemptionRow);
  }

  async getRedemptionById(redemptionId: string): Promise<RedemptionRecord | null> {
    const res = await query(`
      SELECT r.*, u.gender as user_gender
      FROM redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [redemptionId]);
    return res.rows.length > 0 ? mapRedemptionRow(res.rows[0]) : null;
  }

  async updateCommissionPaymentStatus(redemptionId: string, status: 'unpaid' | 'paid'): Promise<RedemptionRecord | null> {
    await query(`
      UPDATE redemptions
      SET commission_payment_status = $1
      WHERE id = $2
    `, [status, redemptionId]);
    logDbTransaction('UPDATE', 'redemptions', 'SUCCESS', `id=${redemptionId}, commission_payment_status=${status}`);
    return this.getRedemptionById(redemptionId);
  }

  async softDeleteMerchantRedemption(redemptionId: string): Promise<boolean> {
    await query(`
      UPDATE redemptions
      SET merchant_history_deleted = TRUE
      WHERE id = $1
    `, [redemptionId]);
    logDbTransaction('UPDATE', 'redemptions', 'SUCCESS', `id=${redemptionId}, merchant_history_deleted=TRUE`);
    return true;
  }

  // =========================================================================
  // 7. NOTIFICATIONS
  // =========================================================================

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string
  ): Promise<NotificationRecord> {
    const id = generateSecureId('NOTIF');
    const res = await query(`
      INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
      VALUES ($1, $2, $3, $4, $4, $5, $5, FALSE, $6, NOW())
      RETURNING *
    `, [id, userId, type, title, message, JSON.stringify({ relatedId: relatedId || null })]);
    return mapNotificationRow(res.rows[0]);
  }

  async getUserNotifications(userId: string, limit = 50, unreadOnly = false): Promise<NotificationRecord[]> {
    let sql = `SELECT * FROM notifications WHERE user_id = $1`;
    if (unreadOnly) sql += ` AND read = FALSE`;
    sql += ` ORDER BY created_at DESC LIMIT $2`;
    const res = await query(sql, [userId, limit]);
    return res.rows.map(mapNotificationRow);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const res = await query(`SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE`, [userId]);
    return Number(res.rows[0]?.count || 0);
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    const res = await query(`
      UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const res = await query(`
      UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE
    `, [userId]);
    return res.rowCount ?? 0;
  }

  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const res = await query(`
      DELETE FROM notifications WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    const res = await query(`
      DELETE FROM notifications WHERE user_id = $1
    `, [userId]);
    return res.rowCount ?? 0;
  }

  async getAdminNotifications(): Promise<NotificationRecord[]> {
    const res = await query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`);
    return res.rows.map(mapNotificationRow);
  }

  async markNotificationReadAdmin(id: string): Promise<boolean> {
    const res = await query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // =========================================================================
  // 8. SUPPORT TICKETS
  // =========================================================================

  async createSupportTicket(userId: string, subject: string, message: string): Promise<SupportTicketRecord> {
    const user = await this.getUserById(userId);
    const id = generateSecureId('TCK');
    const ticketNumber = `CC-${Date.now().toString().slice(-6)}`;

    const res = await query(`
      INSERT INTO support_tickets (
        id, ticket_number, user_id, user_name, user_phone, category, subject, message,
        status, priority, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'GENERAL', $6, $7,
        'OPEN', 'MEDIUM', NOW(), NOW()
      ) RETURNING *
    `, [
      id,
      ticketNumber,
      userId,
      user?.fullName || 'User',
      user?.phone || '',
      subject.trim(),
      message.trim()
    ]);

    return mapSupportTicketRow(res.rows[0]);
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicketRecord[]> {
    const res = await query(`SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return res.rows.map(mapSupportTicketRow);
  }

  async getAllSupportTickets(): Promise<SupportTicketRecord[]> {
    const res = await query(`SELECT * FROM support_tickets ORDER BY created_at DESC`);
    return res.rows.map(mapSupportTicketRow);
  }

  async updateSupportTicketStatus(id: string, status: SupportTicketStatus, adminResponse?: string): Promise<SupportTicketRecord | null> {
    let sql = `UPDATE support_tickets SET status = $1, updated_at = NOW()`;
    const params: any[] = [status];
    let idx = 2;

    if (adminResponse !== undefined) {
      sql += `, admin_notes = $${idx++}`;
      params.push(adminResponse);
    }

    sql += ` WHERE id = $${idx} RETURNING *`;
    params.push(id);

    const res = await query(sql, params);
    return res.rows.length > 0 ? mapSupportTicketRow(res.rows[0]) : null;
  }

  async deleteSupportTicket(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM support_tickets WHERE id = $1 RETURNING id`, [id]);
    return res.rows.length > 0;
  }

  async deleteAllSupportTickets(filterStatus?: 'RESOLVED' | 'CLOSED' | 'OPEN' | 'IN_PROGRESS' | 'ALL'): Promise<number> {
    let sql = `DELETE FROM support_tickets`;
    const params: any[] = [];
    if (filterStatus && filterStatus !== 'ALL') {
      sql += ` WHERE status = $1`;
      params.push(filterStatus);
    }
    const res = await query(sql, params);
    return res.rowCount || 0;
  }

  // =========================================================================
  // 9. ADMIN ACCOUNTS & AUTH
  // =========================================================================

  async getAdminAccountByIdentifier(loginIdentifier: string): Promise<AdminAccountRecord | null> {
    if (!loginIdentifier || typeof loginIdentifier !== 'string' || !loginIdentifier.trim()) return null;
    const cleanId = loginIdentifier.trim();
    const lowerId = cleanId.toLowerCase();
    const res = await query(`
      SELECT * FROM admin_accounts 
      WHERE (LOWER(email) = $1 OR phone = $2) AND status = 'active'
    `, [lowerId, cleanId]);

    if (res.rows.length === 0) return null;
    return mapAdminAccountRow(res.rows[0]);
  }

  async getAdminAccountByCredentials(loginIdentifier: string, pinOrPassword: string): Promise<AdminAccountRecord | null> {
    const admin = await this.getAdminAccountByIdentifier(loginIdentifier);
    if (!admin) return null;

    if (admin.passwordHash) {
      const match = bcrypt.compareSync(pinOrPassword, admin.passwordHash);
      if (match) return admin;
    }

    return null;
  }

  async getAdminAccountById(id: string): Promise<AdminAccountRecord | null> {
    const res = await query(`SELECT * FROM admin_accounts WHERE id = $1`, [id]);
    return res.rows.length > 0 ? mapAdminAccountRow(res.rows[0]) : null;
  }

  async getAdminAccountByToken(token: string): Promise<AdminAccountRecord | null> {
    if (!token) return null;
    if (token.startsWith('ADM-TOK-')) {
      const parts = token.split('-');
      if (parts.length >= 3) {
        const adminId = parts.slice(2).join('-');
        return this.getAdminAccountById(adminId);
      }
    }
    return null;
  }

  createAdminSession(adminId: string): string {
    return `ADM-TOK-${Date.now()}-${adminId}`;
  }

  async createAdminAccount(data: {
    name: string;
    email?: string;
    phone?: string;
    password?: string;
    pinOrPassword?: string;
    role: AdminRoleType;
    permissions: AdminPermission[];
    createdBy?: string;
  }): Promise<AdminAccountRecord> {
    const id = generateSecureId('ADM');
    const rawPass = data.pinOrPassword || data.password;
    if (!rawPass || rawPass.trim().length < 6) {
      throw new Error('অ্যাডমিন অ্যাকাউন্টের জন্য ন্যূনতম ৬ ডিজিটের পাসওয়ার্ড বা পিন আবশ্যক।');
    }
    const hash = bcrypt.hashSync(rawPass.trim(), 10);

    const emailVal = data.email && typeof data.email === 'string' && data.email.trim() !== '' ? data.email.trim().toLowerCase() : null;
    const phoneVal = data.phone && typeof data.phone === 'string' && data.phone.trim() !== '' ? data.phone.trim() : null;

    const res = await query(`
      INSERT INTO admin_accounts (id, name, email, phone, password_hash, role, permissions, status, created_at, last_login_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW(), $8)
      RETURNING *
    `, [
      id,
      data.name.trim(),
      emailVal,
      phoneVal,
      hash,
      data.role,
      JSON.stringify(data.permissions || []),
      data.createdBy || 'SYSTEM'
    ]);

    return mapAdminAccountRow(res.rows[0]);
  }

  async updateAdminAccount(
    id: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: AdminRoleType;
      permissions?: AdminPermission[];
      status?: 'active' | 'suspended';
    }
  ): Promise<AdminAccountRecord | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(updates.name.trim());
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${idx++}`);
      values.push(updates.email ? updates.email.trim().toLowerCase() : '');
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(updates.phone ? updates.phone.trim() : '');
    }
    if (updates.password !== undefined && updates.password.trim()) {
      setClauses.push(`password_hash = $${idx++}`);
      values.push(bcrypt.hashSync(updates.password.trim(), 10));
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${idx++}`);
      values.push(updates.role);
    }
    if (updates.permissions !== undefined) {
      setClauses.push(`permissions = $${idx++}`);
      values.push(JSON.stringify(updates.permissions));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(updates.status);
    }

    if (setClauses.length === 0) return this.getAdminAccountById(id);

    values.push(id);
    const res = await query(`
      UPDATE admin_accounts SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *
    `, values);

    return res.rows.length > 0 ? mapAdminAccountRow(res.rows[0]) : null;
  }

  async deleteAdminAccount(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM admin_accounts WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getAllAdminAccounts(): Promise<AdminAccountRecord[]> {
    const res = await query(`SELECT * FROM admin_accounts ORDER BY created_at DESC`);
    return res.rows.map(mapAdminAccountRow);
  }


  // =========================================================================
  // 10. GLOBAL CONFIG
  // =========================================================================

  async getGlobalConfig(): Promise<GlobalConfigRecord> {
    const res = await query(`SELECT value FROM global_config WHERE key = 'platform_rates'`);
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value;
    }
    return {
      goldDiscountRate: 15,
      silverDiscountRate: 10,
      bronzeDiscountRate: 7,
      updatedAt: new Date().toISOString()
    };
  }

  async updateGlobalConfig(
    updates: { goldDiscountRate?: number; silverDiscountRate?: number; bronzeDiscountRate?: number },
    adminId: string,
    adminName: string
  ): Promise<GlobalConfigRecord> {
    const current = await this.getGlobalConfig();
    const updated: GlobalConfigRecord = {
      goldDiscountRate: updates.goldDiscountRate ?? current.goldDiscountRate,
      silverDiscountRate: updates.silverDiscountRate ?? current.silverDiscountRate,
      bronzeDiscountRate: updates.bronzeDiscountRate ?? current.bronzeDiscountRate,
      updatedAt: new Date().toISOString()
    };

    await query(`
      INSERT INTO global_config (key, value, updated_at)
      VALUES ('platform_rates', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [JSON.stringify(updated)]);

    return updated;
  }

  // =========================================================================
  // 11. NASIHA MANAGEMENT
  // =========================================================================

  async getNasihaList(): Promise<NasihaRecord[]> {
    const res = await query(`SELECT * FROM nasiha ORDER BY created_at DESC`);
    return res.rows.map(mapNasihaRow);
  }

  async getActiveNasihaList(): Promise<NasihaRecord[]> {
    const res = await query(`SELECT * FROM nasiha WHERE active = TRUE ORDER BY created_at DESC`);
    return res.rows.map(mapNasihaRow);
  }

  async createNasiha(textBn: string, sourceBn: string): Promise<NasihaRecord> {
    const id = `NSH-${Date.now()}`;
    const res = await query(`
      INSERT INTO nasiha (id, text_bn, source_bn, active, created_at)
      VALUES ($1, $2, $3, TRUE, NOW())
      RETURNING *
    `, [id, textBn ? textBn.trim() : '', sourceBn ? sourceBn.trim() : '']);
    return mapNasihaRow(res.rows[0]);
  }

  async updateNasiha(id: string, updates: { textBn?: string; sourceBn?: string; active?: boolean }): Promise<NasihaRecord | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.textBn !== undefined) {
      setClauses.push(`text_bn = $${idx++}`);
      values.push(updates.textBn ? updates.textBn.trim() : '');
    }
    if (updates.sourceBn !== undefined) {
      setClauses.push(`source_bn = $${idx++}`);
      values.push(updates.sourceBn ? updates.sourceBn.trim() : '');
    }
    if (updates.active !== undefined) {
      setClauses.push(`active = $${idx++}`);
      values.push(updates.active);
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const res = await query(`
      UPDATE nasiha SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *
    `, values);

    return res.rows.length > 0 ? mapNasihaRow(res.rows[0]) : null;
  }

  async deleteNasiha(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM nasiha WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // =========================================================================
  // 11.1 BLOG / CAVE MEDIA MANAGEMENT
  // =========================================================================

  async getBlogList(): Promise<BlogRecord[]> {
    const res = await query(`SELECT * FROM blogs ORDER BY created_at DESC`);
    return res.rows.map(mapBlogRow);
  }

  async getActiveBlogList(): Promise<BlogRecord[]> {
    const res = await query(`SELECT * FROM blogs WHERE is_published = TRUE ORDER BY created_at DESC`);
    return res.rows.map(mapBlogRow);
  }

  async getBlogById(id: string): Promise<BlogRecord | null> {
    const res = await query(`SELECT * FROM blogs WHERE id = $1`, [id]);
    return res.rows.length > 0 ? mapBlogRow(res.rows[0]) : null;
  }

  async createBlog(data: {
    id?: string;
    title: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    author?: string;
    isPublished?: boolean;
    createdAt?: string;
  }): Promise<BlogRecord> {
    const id = data.id || `BLOG-${Date.now()}`;
    const author = data.author ? data.author.trim() : 'Admin';
    const isPublished = data.isPublished !== undefined ? Boolean(data.isPublished) : true;
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

    const res = await query(`
      INSERT INTO blogs (id, title, content, image_url, video_url, author, is_published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      id,
      data.title ? data.title.trim() : '',
      data.content ? data.content.trim() : '',
      data.imageUrl ? data.imageUrl.trim() : null,
      data.videoUrl ? data.videoUrl.trim() : null,
      author,
      isPublished,
      createdAt
    ]);

    return mapBlogRow(res.rows[0]);
  }

  async updateBlog(id: string, updates: {
    title?: string;
    content?: string;
    imageUrl?: string;
    videoUrl?: string;
    author?: string;
    isPublished?: boolean;
  }): Promise<BlogRecord | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(updates.title ? updates.title.trim() : '');
    }
    if (updates.content !== undefined) {
      setClauses.push(`content = $${idx++}`);
      values.push(updates.content ? updates.content.trim() : '');
    }
    if (updates.imageUrl !== undefined) {
      setClauses.push(`image_url = $${idx++}`);
      values.push(updates.imageUrl ? updates.imageUrl.trim() : null);
    }
    if (updates.videoUrl !== undefined) {
      setClauses.push(`video_url = $${idx++}`);
      values.push(updates.videoUrl ? updates.videoUrl.trim() : null);
    }
    if (updates.author !== undefined) {
      setClauses.push(`author = $${idx++}`);
      values.push(updates.author ? updates.author.trim() : 'Admin');
    }
    if (updates.isPublished !== undefined) {
      setClauses.push(`is_published = $${idx++}`);
      values.push(Boolean(updates.isPublished));
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);
    const res = await query(`
      UPDATE blogs SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *
    `, values);

    return res.rows.length > 0 ? mapBlogRow(res.rows[0]) : null;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM blogs WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async toggleBlogPublish(id: string, isPublished: boolean): Promise<BlogRecord | null> {
    const res = await query(`
      UPDATE blogs
      SET is_published = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [Boolean(isPublished), id]);

    return res.rows.length > 0 ? mapBlogRow(res.rows[0]) : null;
  }

  // =========================================================================
  // 12. OTP MANAGEMENT
  // =========================================================================

  async saveOtp(
    identifier: string,
    code: string,
    purpose: 'REGISTRATION_VERIFICATION' | 'PASSWORD_RESET' | string,
    expiryMinutesOrData?: number | any,
    registrationData?: any
  ): Promise<OtpRecord> {
    const clean = String(identifier || '').trim();
    const normalized = clean.includes('@') ? clean.toLowerCase() : normalizePhoneNumber(clean);
    let expiryMinutes = 5;
    let regData = registrationData;

    if (typeof expiryMinutesOrData === 'number') {
      expiryMinutes = expiryMinutesOrData;
    } else if (typeof expiryMinutesOrData === 'object' && expiryMinutesOrData !== null) {
      regData = expiryMinutesOrData;
    }

    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
    const cleanCode = String(code || '').trim();
    const hashedCode = crypto.createHash('sha256').update(cleanCode).digest('hex');

    const res = await query(`
      INSERT INTO otps (identifier, code, purpose, expires_at, attempts, registration_data)
      VALUES ($1, $2, $3, $4, 0, $5)
      ON CONFLICT (identifier) DO UPDATE SET
        code = EXCLUDED.code,
        purpose = EXCLUDED.purpose,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        registration_data = EXCLUDED.registration_data
      RETURNING *
    `, [normalized, hashedCode, purpose, expiresAt, regData ? JSON.stringify(regData) : null]);

    const row = res.rows[0];
    return {
      identifier: row.identifier,
      code: row.code,
      purpose: row.purpose,
      expiresAt: Number(row.expires_at),
      attempts: Number(row.attempts),
      registrationData: typeof row.registration_data === 'string' ? JSON.parse(row.registration_data) : row.registration_data
    };
  }

  async verifyOtp(identifier: string, code: string, purpose: string, deleteOnSuccess: boolean = true): Promise<{ valid: boolean; error?: string; registrationData?: any }> {
    const clean = String(identifier || '').trim();
    const normalized = clean.includes('@') ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const otp = await this.getOtp(normalized);
    if (!otp) {
      return { valid: false, error: 'NOT_FOUND' };
    }
    if (otp.expiresAt < Date.now()) {
      await this.deleteOtp(normalized);
      return { valid: false, error: 'EXPIRED' };
    }
    if (otp.attempts >= 5) {
      await this.deleteOtp(normalized);
      return { valid: false, error: 'MAX_ATTEMPTS' };
    }
    if (otp.purpose !== purpose) {
      return { valid: false, error: 'PURPOSE_MISMATCH' };
    }
    const cleanCode = String(code || '').trim();
    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (otp.code !== inputHash) {
      await this.incrementOtpAttempts(normalized);
      return { valid: false, error: 'INVALID_CODE' };
    }

    if (deleteOnSuccess) {
      await this.deleteOtp(normalized);
    }
    return {
      valid: true,
      registrationData: otp.registrationData
    };
  }

  async getOtp(identifier: string): Promise<OtpRecord | null> {
    const clean = String(identifier || '').trim();
    const normalized = clean.includes('@') ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const res = await query(`SELECT * FROM otps WHERE identifier = $1`, [normalized]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      identifier: row.identifier,
      code: row.code,
      purpose: row.purpose,
      expiresAt: Number(row.expires_at),
      attempts: Number(row.attempts),
      registrationData: typeof row.registration_data === 'string' ? JSON.parse(row.registration_data) : row.registration_data
    };
  }

  async incrementOtpAttempts(identifier: string): Promise<number> {
    const clean = String(identifier || '').trim();
    const normalized = clean.includes('@') ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const res = await query(`
      UPDATE otps SET attempts = attempts + 1 WHERE identifier = $1 RETURNING attempts
    `, [normalized]);
    return Number(res.rows[0]?.attempts || 0);
  }

  async deleteOtp(identifier: string): Promise<void> {
    const clean = String(identifier || '').trim();
    const normalized = clean.includes('@') ? clean.toLowerCase() : normalizePhoneNumber(clean);
    await query(`DELETE FROM otps WHERE identifier = $1`, [normalized]);
  }

  // =========================================================================
  // 12.5. COMMISSION POLICY & MERCHANT VERIFICATION
  // =========================================================================

  async getCommissionPolicy(): Promise<CommissionPolicy> {
    const res = await query(`SELECT value FROM global_config WHERE key = 'COMMISSION_POLICY'`);
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
      if (val && val.totalCommissionPercent !== undefined) {
        return val as CommissionPolicy;
      }
    }
    return {
      totalCommissionPercent: 10,
      gold: { userBenefitPercent: 5, platformCommissionPercent: 5 },
      silver: { userBenefitPercent: 4, platformCommissionPercent: 6 },
      bronze: { userBenefitPercent: 3, platformCommissionPercent: 7 },
      version: 'v1.0'
    };
  }

  async saveCommissionPolicy(policy: CommissionPolicy, adminId?: string, adminName?: string): Promise<CommissionPolicy> {
    const total = Number(policy.totalCommissionPercent) || 10;
    const goldUser = Number(policy.gold?.userBenefitPercent) || 5;
    const goldPlatform = Number(policy.gold?.platformCommissionPercent) || 5;
    const silverUser = Number(policy.silver?.userBenefitPercent) || 4;
    const silverPlatform = Number(policy.silver?.platformCommissionPercent) || 6;
    const bronzeUser = Number(policy.bronze?.userBenefitPercent) || 3;
    const bronzePlatform = Number(policy.bronze?.platformCommissionPercent) || 7;

    if (Math.round((goldUser + goldPlatform) * 100) !== Math.round(total * 100)) {
      throw new Error(`Gold token user benefit (${goldUser}%) + platform commission (${goldPlatform}%) must equal Total Commission (${total}%).`);
    }
    if (Math.round((silverUser + silverPlatform) * 100) !== Math.round(total * 100)) {
      throw new Error(`Silver token user benefit (${silverUser}%) + platform commission (${silverPlatform}%) must equal Total Commission (${total}%).`);
    }
    if (Math.round((bronzeUser + bronzePlatform) * 100) !== Math.round(total * 100)) {
      throw new Error(`Bronze token user benefit (${bronzeUser}%) + platform commission (${bronzePlatform}%) must equal Total Commission (${total}%).`);
    }

    const cleanPolicy: CommissionPolicy = {
      totalCommissionPercent: total,
      gold: { userBenefitPercent: goldUser, platformCommissionPercent: goldPlatform },
      silver: { userBenefitPercent: silverUser, platformCommissionPercent: silverPlatform },
      bronze: { userBenefitPercent: bronzeUser, platformCommissionPercent: bronzePlatform },
      version: policy.version || 'v1.0',
      updatedAt: new Date().toISOString()
    };

    await query(`
      INSERT INTO global_config (key, value, updated_at)
      VALUES ('COMMISSION_POLICY', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [JSON.stringify(cleanPolicy)]);

    return cleanPolicy;
  }

  async registerMerchantFull(data: {
    ownerName: string;
    phone: string;
    email?: string;
    password?: string;
    pin?: string;
    shopName: string;
    businessType: string;
    shopAddress: string;
    district: string;
    upazilaThana: string;
    latitude?: number;
    longitude?: number;
    shopPhotoUrl?: string;
    businessDescription?: string;
    nidNumber: string;
    nidFrontUrl: string;
    nidBackUrl: string;
    ownerSelfieUrl: string;
    tradeLicenseNumber: string;
    tradeLicenseUrl: string;
    tinNumber?: string;
    binVatNumber?: string;
    agreementAccepted: boolean;
    agreementVersion?: string;
    acceptedTotalCommission?: number;
    acceptedGoldUserBenefit?: number;
    acceptedGoldPlatformCommission?: number;
    acceptedSilverUserBenefit?: number;
    acceptedSilverPlatformCommission?: number;
    acceptedBronzeUserBenefit?: number;
    acceptedBronzePlatformCommission?: number;
  }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const normalizedPhone = normalizePhoneNumber(data.phone);

      const existMch = await client.query('SELECT id FROM merchants WHERE phone = $1', [normalizedPhone]);
      if (existMch.rows.length > 0) {
        throw new Error('এই মোবাইল নম্বর দিয়ে একটি মার্চেন্ট অ্যাকাউন্ট ইতোমধ্যে রয়েছে।');
      }

      if (data.email) {
        const existEmail = await client.query('SELECT id FROM merchants WHERE email = $1', [data.email.trim().toLowerCase()]);
        if (existEmail.rows.length > 0) {
          throw new Error('এই ইমেইল দিয়ে একটি মার্চেন্ট অ্যাকাউন্ট ইতোমধ্যে রয়েছে।');
        }
      }

      const shopId = generateSecureId('SHP');
      const merchantId = generateSecureId('MCH');
      const vrfId = generateSecureId('VRF');
      const safeDistrict = (data.district || 'DHAKA').trim().toUpperCase().replace(/\s+/g, '_');
      const safeArea = (data.upazilaThana || 'AREA').trim().toUpperCase().replace(/\s+/g, '_');
      const qrIdentifier = `CAVE_SHP_${Date.now()}_${safeDistrict}_${safeArea}`;
      const qrSecret = generateSecureSecret('SEC_');

      const rawPassword = data.password || data.pin || crypto.randomInt(100000, 1000000).toString();
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const totalComm = data.acceptedTotalCommission !== undefined && !isNaN(Number(data.acceptedTotalCommission)) ? Number(data.acceptedTotalCommission) : 10;
      const gUser = data.acceptedGoldUserBenefit !== undefined && !isNaN(Number(data.acceptedGoldUserBenefit)) ? Number(data.acceptedGoldUserBenefit) : Math.round(totalComm * 0.5 * 100) / 100;
      const gPlat = data.acceptedGoldPlatformCommission !== undefined && !isNaN(Number(data.acceptedGoldPlatformCommission)) ? Number(data.acceptedGoldPlatformCommission) : Math.max(0, Math.round((totalComm - gUser) * 100) / 100);
      const sUser = data.acceptedSilverUserBenefit !== undefined && !isNaN(Number(data.acceptedSilverUserBenefit)) ? Number(data.acceptedSilverUserBenefit) : Math.round(totalComm * 0.4 * 100) / 100;
      const sPlat = data.acceptedSilverPlatformCommission !== undefined && !isNaN(Number(data.acceptedSilverPlatformCommission)) ? Number(data.acceptedSilverPlatformCommission) : Math.max(0, Math.round((totalComm - sUser) * 100) / 100);
      const bUser = data.acceptedBronzeUserBenefit !== undefined && !isNaN(Number(data.acceptedBronzeUserBenefit)) ? Number(data.acceptedBronzeUserBenefit) : Math.round(totalComm * 0.3 * 100) / 100;
      const bPlat = data.acceptedBronzePlatformCommission !== undefined && !isNaN(Number(data.acceptedBronzePlatformCommission)) ? Number(data.acceptedBronzePlatformCommission) : Math.max(0, Math.round((totalComm - bUser) * 100) / 100);

      const shopRes = await client.query(`
        INSERT INTO shops (
          id, name, name_bn, owner_id, phone, address, area, district, upazila_thana,
          category, business_type, description, photo_url, status, verification_status,
          qr_identifier, qr_secret, gold_discount, silver_discount, bronze_discount, commission_rate,
          nid_number, nid_front_url, nid_back_url, owner_selfie_url,
          trade_license_number, trade_license_url, tin_number, bin_vat_number,
          agreement_accepted, agreement_accepted_at, agreement_version,
          accepted_total_commission, accepted_gold_user_benefit, accepted_gold_platform_commission,
          accepted_silver_user_benefit, accepted_silver_platform_commission,
          accepted_bronze_user_benefit, accepted_bronze_platform_commission,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, 'PENDING', 'PENDING',
          $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26, $27,
          $28, NOW(), $29,
          $30, $31, $32, $33, $34, $35, $36,
          NOW(), NOW()
        ) RETURNING *
      `, [
        shopId, data.shopName, data.shopName, merchantId, normalizedPhone, data.shopAddress,
        data.upazilaThana || data.district, data.district, data.upazilaThana,
        data.businessType || 'others', data.businessType || 'others', data.businessDescription || '',
        data.shopPhotoUrl || '', qrIdentifier, qrSecret, gUser, sUser, bUser, gPlat,
        data.nidNumber, data.nidFrontUrl, data.nidBackUrl, data.ownerSelfieUrl,
        data.tradeLicenseNumber, data.tradeLicenseUrl, data.tinNumber || null, data.binVatNumber || null,
        Boolean(data.agreementAccepted), data.agreementVersion || 'v1.0',
        totalComm, gUser, gPlat, sUser, sPlat, bUser, bPlat
      ]);

      const mchRes = await client.query(`
        INSERT INTO merchants (
          id, name, phone, email, pin, password_hash, shop_id, role, status, verification_status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'MERCHANT', 'pending', 'PENDING', NOW(), NOW()
        ) RETURNING *
      `, [
        merchantId, data.ownerName, normalizedPhone, data.email || null, passwordHash, passwordHash, shopId
      ]);

      const vrfRes = await client.query(`
        INSERT INTO merchant_verifications (
          id, merchant_id, shop_id, owner_name, phone, email, shop_name, business_type,
          shop_address, district, upazila_thana, latitude, longitude, shop_photo_url, business_description,
          nid_number, nid_front_url, nid_back_url, owner_selfie_url,
          trade_license_number, trade_license_url, tin_number, bin_vat_number,
          agreement_accepted, agreement_accepted_at, agreement_version,
          accepted_total_commission, accepted_gold_user_benefit, accepted_gold_platform_commission,
          accepted_silver_user_benefit, accepted_silver_platform_commission,
          accepted_bronze_user_benefit, accepted_bronze_platform_commission,
          verification_status, merchant_status, submitted_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, NOW(), $25,
          $26, $27, $28, $29, $30, $31, $32,
          'PENDING', 'PENDING_VERIFICATION', NOW(), NOW(), NOW()
        ) RETURNING *
      `, [
        vrfId, merchantId, shopId, data.ownerName, normalizedPhone, data.email || null, data.shopName, data.businessType,
        data.shopAddress, data.district, data.upazilaThana, data.latitude || 0, data.longitude || 0, data.shopPhotoUrl || '', data.businessDescription || '',
        data.nidNumber, data.nidFrontUrl, data.nidBackUrl, data.ownerSelfieUrl,
        data.tradeLicenseNumber, data.tradeLicenseUrl, data.tinNumber || null, data.binVatNumber || null,
        Boolean(data.agreementAccepted), data.agreementVersion || 'v1.0',
        totalComm, gUser, gPlat, sUser, sPlat, bUser, bPlat
      ]);

      await client.query('COMMIT');
      return {
        shop: mapShopRow(shopRes.rows[0]),
        merchant: mapMerchantRow(mchRes.rows[0]),
        verification: mapMerchantVerificationRow(vrfRes.rows[0])
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }


  async isMerchantDocumentOwner(merchantId: string, phone: string, shopId: string, filename: string): Promise<boolean> {
    try {
      const cleanFilename = filename.trim();
      const res = await query(`
        SELECT id FROM merchant_verifications
        WHERE (shop_id = $1 OR merchant_id = $2 OR phone = $3)
          AND (
            nid_front_url LIKE '%' || $4
            OR nid_back_url LIKE '%' || $4
            OR owner_selfie_url LIKE '%' || $4
            OR trade_license_url LIKE '%' || $4
            OR shop_photo_url LIKE '%' || $4
          )
        LIMIT 1
      `, [shopId || '', merchantId || '', phone || '', cleanFilename]);

      if (res.rows.length > 0) return true;

      const shopRes = await query(`
        SELECT id FROM shops
        WHERE (id = $1 OR phone = $2) AND photo_url LIKE '%' || $3
        LIMIT 1
      `, [shopId || '', phone || '', cleanFilename]);

      if (shopRes.rows.length > 0) return true;

      const mediaRes = await query(`
        SELECT id FROM uploaded_media
        WHERE (filename = $1 OR id = $1)
          AND (
            created_by = $2 
            OR created_by = $3 
            OR created_by = 'mch:' || $2 
            OR created_by = 'reg:' || $3
          )
        LIMIT 1
      `, [cleanFilename, merchantId || '', phone || '']);

      if (mediaRes.rows.length > 0) return true;

      return false;
    } catch (err) {
      console.error('[DB] isMerchantDocumentOwner error:', err);
      return false;
    }
  }

  async isRegistrationDocumentOwner(phone: string, filename: string): Promise<boolean> {
    try {
      const cleanPhone = phone?.trim();
      const cleanFilename = filename?.trim();
      if (!cleanPhone || !cleanFilename) return false;

      // 1. Check in merchant_verifications by phone
      const verRes = await query(`
        SELECT id FROM merchant_verifications
        WHERE phone = $1
          AND (
            nid_front_url LIKE '%' || $2
            OR nid_back_url LIKE '%' || $2
            OR owner_selfie_url LIKE '%' || $2
            OR trade_license_url LIKE '%' || $2
            OR shop_photo_url LIKE '%' || $2
          )
        LIMIT 1
      `, [cleanPhone, cleanFilename]);
      if (verRes.rows.length > 0) return true;

      // 2. Check in shops by phone
      const shopRes = await query(`
        SELECT id FROM shops
        WHERE phone = $1 AND photo_url LIKE '%' || $2
        LIMIT 1
      `, [cleanPhone, cleanFilename]);
      if (shopRes.rows.length > 0) return true;

      // 3. Check in uploaded_media created by this phone during registration
      const mediaRes = await query(`
        SELECT id FROM uploaded_media
        WHERE (filename = $1 OR id = $1)
          AND (created_by = $2 OR created_by = 'reg:' || $2)
        LIMIT 1
      `, [cleanFilename, cleanPhone]);
      if (mediaRes.rows.length > 0) return true;

      return false;
    } catch (err) {
      console.error('[DB] isRegistrationDocumentOwner error:', err);
      return false;
    }
  }

  async getMerchantVerificationByMerchantId(merchantIdOrShopId: string): Promise<MerchantVerificationRecord | null> {
    let sql = `
      SELECT 
        s.id as shop_id, s.name as shop_name, s.address as shop_address, s.area, s.district, s.upazila_thana, s.category as business_type, s.photo_url as shop_photo_url, s.verification_status as shop_verification_status, s.latitude, s.longitude, s.description, s.created_at,
        m.id as merchant_id, m.name as owner_name, m.phone,
        v.id as verification_id, v.verification_status, v.nid_number, v.trade_license_number, v.nid_front_url, v.nid_back_url, v.owner_selfie_url, v.trade_license_url, v.agreement_accepted, v.business_description, v.submitted_at, v.updated_at, v.correction_history,
        v.accepted_total_commission, v.accepted_gold_user_benefit, v.accepted_gold_platform_commission,
        v.accepted_silver_user_benefit, v.accepted_silver_platform_commission,
        v.accepted_bronze_user_benefit, v.accepted_bronze_platform_commission,
        v.email as v_email, v.phone as v_phone, v.shop_address as v_shop_address, v.owner_name as v_owner_name,
        v.tin_number, v.bin_vat_number, v.agreement_version, v.agreement_accepted_at, v.reviewed_at, v.reviewed_by, v.correction_message, v.requested_correction_fields, v.rejection_reason,
        s.accepted_total_commission as shop_accepted_total_commission, s.commission_rate as shop_commission_rate,
        s.gold_discount as shop_gold_discount, s.silver_discount as shop_silver_discount, s.bronze_discount as shop_bronze_discount
      FROM shops s
      LEFT JOIN merchants m ON m.shop_id = s.id
      LEFT JOIN merchant_verifications v ON v.shop_id = s.id
      WHERE s.id = $1 OR m.id = $1 OR v.id = $1
      ORDER BY s.created_at DESC LIMIT 1
    `;
    const res = await query(sql, [merchantIdOrShopId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const totalComm = row.accepted_total_commission != null 
      ? Number(row.accepted_total_commission) 
      : (row.shop_accepted_total_commission != null 
          ? Number(row.shop_accepted_total_commission) 
          : (row.shop_commission_rate != null ? Number(row.shop_commission_rate) : 10));

    const gUser = row.accepted_gold_user_benefit != null
      ? Number(row.accepted_gold_user_benefit)
      : (row.shop_gold_discount != null ? Number(row.shop_gold_discount) : Math.round(totalComm * 0.5 * 100) / 100);

    const gPlat = row.accepted_gold_platform_commission != null
      ? Number(row.accepted_gold_platform_commission)
      : Math.max(0, Math.round((totalComm - gUser) * 100) / 100);

    const sUser = row.accepted_silver_user_benefit != null
      ? Number(row.accepted_silver_user_benefit)
      : (row.shop_silver_discount != null ? Number(row.shop_silver_discount) : Math.round(totalComm * 0.4 * 100) / 100);

    const sPlat = row.accepted_silver_platform_commission != null
      ? Number(row.accepted_silver_platform_commission)
      : Math.max(0, Math.round((totalComm - sUser) * 100) / 100);

    const bUser = row.accepted_bronze_user_benefit != null
      ? Number(row.accepted_bronze_user_benefit)
      : (row.shop_bronze_discount != null ? Number(row.shop_bronze_discount) : Math.round(totalComm * 0.3 * 100) / 100);

    const bPlat = row.accepted_bronze_platform_commission != null
      ? Number(row.accepted_bronze_platform_commission)
      : Math.max(0, Math.round((totalComm - bUser) * 100) / 100);

    return {
      id: row.verification_id || row.shop_id,
      merchantId: row.merchant_id || '',
      shopId: row.shop_id,
      ownerName: row.v_owner_name || row.owner_name || 'No Owner',
      phone: row.v_phone || row.phone || 'No Phone',
      email: row.v_email || row.email || undefined,
      shopName: row.shop_name,
      businessType: row.business_type || 'others',
      shopAddress: row.v_shop_address || row.shop_address || row.area || '',
      district: row.district || '',
      upazilaThana: row.upazila_thana || row.upazila || row.area || '',
      latitude: row.latitude || 0,
      longitude: row.longitude || 0,
      shopPhotoUrl: row.shop_photo_url || '',
      businessDescription: row.business_description || row.description || '',
      verificationStatus: (row.verification_status || row.shop_verification_status || 'PENDING').toUpperCase(),
      nidNumber: row.nid_number || 'Not provided',
      tradeLicenseNumber: row.trade_license_number || 'Not provided',
      nidFrontUrl: row.nid_front_url || '',
      nidBackUrl: row.nid_back_url || '',
      ownerSelfieUrl: row.owner_selfie_url || '',
      tradeLicenseUrl: row.trade_license_url || '',
      tinNumber: row.tin_number || undefined,
      binVatNumber: row.bin_vat_number || undefined,
      agreementAccepted: row.agreement_accepted != null ? Boolean(row.agreement_accepted) : true,
      agreementAcceptedAt: row.agreement_accepted_at || row.submitted_at || row.created_at,
      agreementVersion: row.agreement_version || 'v1.0',
      acceptedTotalCommission: totalComm,
      acceptedGoldUserBenefit: gUser,
      acceptedGoldPlatformCommission: gPlat,
      acceptedSilverUserBenefit: sUser,
      acceptedSilverPlatformCommission: sPlat,
      acceptedBronzeUserBenefit: bUser,
      acceptedBronzePlatformCommission: bPlat,
      submittedAt: row.submitted_at || row.created_at,
      updatedAt: row.updated_at || row.created_at,
      correctionMessage: row.correction_message || undefined,
      requestedCorrectionFields: row.requested_correction_fields ? (typeof row.requested_correction_fields === 'string' ? JSON.parse(row.requested_correction_fields) : row.requested_correction_fields) : undefined,
      correctionHistory: Array.isArray(row.correction_history) ? row.correction_history : (typeof row.correction_history === 'string' ? JSON.parse(row.correction_history) : []),
      rejectionReason: row.rejection_reason || undefined,
      reviewedAt: row.reviewed_at || undefined,
      reviewedBy: row.reviewed_by || undefined,
    } as any;
  }

  async getMerchantVerificationsByStatus(status?: string): Promise<MerchantVerificationRecord[]> {
    let sql = `
      SELECT 
        s.id as shop_id, s.name as shop_name, s.phone as shop_phone, s.address as shop_address, s.area, s.district, s.upazila_thana, s.category as business_type, s.photo_url as shop_photo_url, s.verification_status as shop_verification_status, s.status as shop_status, s.created_at,
        m.id as merchant_id, m.name as owner_name, m.phone, m.email,
        v.id as verification_id, v.verification_status, v.nid_number, v.trade_license_number, v.nid_front_url, v.nid_back_url, v.owner_selfie_url, v.trade_license_url, v.agreement_accepted, v.submitted_at,
        v.phone as v_phone, v.email as v_email, v.shop_address as v_shop_address, v.owner_name as v_owner_name,
        v.accepted_total_commission, v.accepted_gold_user_benefit, v.accepted_gold_platform_commission,
        v.accepted_silver_user_benefit, v.accepted_silver_platform_commission,
        v.accepted_bronze_user_benefit, v.accepted_bronze_platform_commission,
        s.accepted_total_commission as shop_accepted_total_commission, s.commission_rate as shop_commission_rate
      FROM shops s
      LEFT JOIN merchants m ON m.shop_id = s.id
      LEFT JOIN merchant_verifications v ON v.shop_id = s.id
    `;
    const params: any[] = [];
    const filter = (status || 'ACTIVE').toUpperCase();
    
    if (filter === 'REJECTED') {
      sql += ` WHERE UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) = 'REJECTED'`;
    } else if (filter === 'SUSPENDED') {
      sql += ` WHERE UPPER(COALESCE(s.status, 'PENDING')) = 'SUSPENDED'`;
    } else if (filter === 'ACTIVE') {
      sql += ` WHERE UPPER(COALESCE(s.status, 'PENDING')) = 'ACTIVE' AND UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) = 'APPROVED'`;
    } else if (filter === 'PENDING') {
      sql += ` WHERE (UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) = 'PENDING' OR UPPER(COALESCE(s.status, 'PENDING')) = 'PENDING' OR UPPER(COALESCE(m.status, 'PENDING')) = 'PENDING') AND UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) != 'REJECTED' AND UPPER(COALESCE(s.status, 'PENDING')) != 'SUSPENDED'`;
    } else if (filter === 'APPROVED') {
      sql += ` WHERE UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) = 'APPROVED'`;
    } else if (filter === 'ALL') {
      // return all shops
    } else {
      sql += ` WHERE UPPER(COALESCE(v.verification_status, s.verification_status, 'PENDING')) = $1`;
      params.push(filter);
    }
    
    sql += ` ORDER BY COALESCE(v.submitted_at, s.created_at) DESC`;
    const res = await query(sql, params);
    
    return res.rows.map(row => {
      const totalComm = row.accepted_total_commission != null 
        ? Number(row.accepted_total_commission) 
        : (row.shop_accepted_total_commission != null 
            ? Number(row.shop_accepted_total_commission) 
            : (row.shop_commission_rate != null ? Number(row.shop_commission_rate) : 10));

      const gUser = row.accepted_gold_user_benefit != null
        ? Number(row.accepted_gold_user_benefit)
        : Math.round(totalComm * 0.5 * 100) / 100;
      const gPlat = row.accepted_gold_platform_commission != null
        ? Number(row.accepted_gold_platform_commission)
        : Math.max(0, Math.round((totalComm - gUser) * 100) / 100);

      const sUser = row.accepted_silver_user_benefit != null
        ? Number(row.accepted_silver_user_benefit)
        : Math.round(totalComm * 0.4 * 100) / 100;
      const sPlat = row.accepted_silver_platform_commission != null
        ? Number(row.accepted_silver_platform_commission)
        : Math.max(0, Math.round((totalComm - sUser) * 100) / 100);

      const bUser = row.accepted_bronze_user_benefit != null
        ? Number(row.accepted_bronze_user_benefit)
        : Math.round(totalComm * 0.3 * 100) / 100;
      const bPlat = row.accepted_bronze_platform_commission != null
        ? Number(row.accepted_bronze_platform_commission)
        : Math.max(0, Math.round((totalComm - bUser) * 100) / 100);

      const vStatus = (row.verification_status || row.shop_verification_status || 'PENDING').toUpperCase();
      const sStatus = (row.shop_status || (vStatus === 'APPROVED' ? 'ACTIVE' : 'PENDING')).toUpperCase();
      const mStatus = sStatus === 'SUSPENDED' ? 'suspended' : (vStatus === 'APPROVED' && sStatus === 'ACTIVE' ? 'active' : 'pending');

      return {
        id: row.verification_id || row.shop_id,
        merchantId: row.merchant_id || '',
        shopId: row.shop_id,
        ownerName: row.v_owner_name || row.owner_name || 'Not provided',
        phone: row.v_phone || row.phone || 'Not provided',
        email: row.v_email || row.email || 'Not provided',
        shopName: row.shop_name,
        shopPhone: row.shop_phone || 'Not provided',
        businessType: row.business_type || 'others',
        shopAddress: row.v_shop_address || row.shop_address || row.area || 'Not provided',
        district: row.district || '',
        upazilaThana: row.upazila_thana || row.upazila || row.area || '',
        shopPhotoUrl: row.shop_photo_url || '',
        verificationStatus: vStatus,
        shopStatus: sStatus,
        merchantStatus: mStatus,
        nidNumber: row.nid_number || 'Not provided',
        tradeLicenseNumber: row.trade_license_number || 'Not provided',
        nidFrontUrl: row.nid_front_url || '',
        nidBackUrl: row.nid_back_url || '',
        ownerSelfieUrl: row.owner_selfie_url || '',
        tradeLicenseUrl: row.trade_license_url || '',
        agreementAccepted: row.agreement_accepted || true,
        acceptedTotalCommission: totalComm,
        acceptedGoldUserBenefit: gUser,
        acceptedGoldPlatformCommission: gPlat,
        acceptedSilverUserBenefit: sUser,
        acceptedSilverPlatformCommission: sPlat,
        acceptedBronzeUserBenefit: bUser,
        acceptedBronzePlatformCommission: bPlat,
        submittedAt: row.submitted_at || row.created_at,
        updatedAt: row.submitted_at || row.created_at,
      } as any;
    });
  }

  async approveMerchantVerification(merchantIdOrShopId: string, adminName: string): Promise<MerchantVerificationRecord | null> {
    const client = await getClient();
    console.log(`[DB approveMerchantVerification] Starting approval transaction for parameter: ${merchantIdOrShopId}`);
    try {
      await client.query('BEGIN');

      const vrfRes = await client.query(`
        SELECT * FROM merchant_verifications WHERE merchant_id = $1 OR shop_id = $1 OR id = $1 ORDER BY submitted_at DESC LIMIT 1
      `, [merchantIdOrShopId]);

      let merchantId = merchantIdOrShopId;
      let shopId = merchantIdOrShopId;

      if (vrfRes.rows.length > 0) {
        merchantId = vrfRes.rows[0].merchant_id;
        shopId = vrfRes.rows[0].shop_id;
        const verificationId = vrfRes.rows[0].id;
        console.log(`[DB approveMerchantVerification] Found merchant_verifications record. ID: ${verificationId}, Merchant: ${merchantId}, Shop: ${shopId}`);

        const updateVrfRes = await client.query(`
          UPDATE merchant_verifications SET
            verification_status = 'APPROVED',
            merchant_status = 'ACTIVE',
            reviewed_at = NOW(),
            reviewed_by = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `, [adminName, verificationId]);
        console.log(`[DB approveMerchantVerification] Updated merchant_verifications. Rows affected: ${updateVrfRes.rowCount}`);
      } else {
        console.log(`[DB approveMerchantVerification] No merchant_verifications record found for ${merchantIdOrShopId}, falling back to passed ID.`);
      }

      const updateShopRes = await client.query(`
        UPDATE shops SET status = 'ACTIVE', verification_status = 'APPROVED', updated_at = NOW() WHERE id = $1
      `, [shopId]);
      console.log(`[DB approveMerchantVerification] Updated shops. Rows affected: ${updateShopRes.rowCount}`);

      const updateMerchantRes = await client.query(`
        UPDATE merchants SET status = 'active', verification_status = 'APPROVED', updated_at = NOW() WHERE id = $1 OR shop_id = $1
      `, [merchantId]);
      console.log(`[DB approveMerchantVerification] Updated merchants. Rows affected: ${updateMerchantRes.rowCount}`);

      await client.query('COMMIT');
      console.log(`[DB approveMerchantVerification] Transaction COMMITTED successfully.`);
      return this.getMerchantVerificationByMerchantId(merchantId);
    } catch (err) {
      console.error(`[DB approveMerchantVerification] Transaction error, rolling back:`, err);
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async requestCorrectionMerchantVerification(merchantIdOrShopId: string, message: string, requestedFields: string[], adminName: string): Promise<MerchantVerificationRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const vrfRes = await client.query(`
        SELECT * FROM merchant_verifications WHERE merchant_id = $1 OR shop_id = $1 OR id = $1 ORDER BY submitted_at DESC LIMIT 1
      `, [merchantIdOrShopId]);

      if (vrfRes.rows.length === 0) {
        throw new Error('মার্চেন্ট ভেরিফিকেশন রেকর্ড পাওয়া যায়নি।');
      }

      const row = vrfRes.rows[0];
      const existingHistory = Array.isArray(row.correction_history) ? row.correction_history : (typeof row.correction_history === 'string' ? JSON.parse(row.correction_history) : []);
      existingHistory.push({
        date: new Date().toISOString(),
        adminName,
        message,
        requestedFields,
        status: 'CORRECTION_REQUIRED'
      });

      await client.query(`
        UPDATE merchant_verifications SET
          verification_status = 'CORRECTION_REQUIRED',
          merchant_status = 'PENDING_CORRECTION',
          correction_message = $1,
          requested_correction_fields = $2,
          correction_history = $3,
          reviewed_at = NOW(),
          reviewed_by = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [message, JSON.stringify(requestedFields), JSON.stringify(existingHistory), adminName, row.id]);

      await client.query(`
        UPDATE shops SET status = 'PENDING', verification_status = 'CORRECTION_REQUIRED', correction_message = $1, updated_at = NOW() WHERE id = $2
      `, [message, row.shop_id]);

      await client.query(`
        UPDATE merchants SET verification_status = 'CORRECTION_REQUIRED', updated_at = NOW() WHERE id = $1
      `, [row.merchant_id]);

      await client.query('COMMIT');
      return this.getMerchantVerificationByMerchantId(row.merchant_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectMerchantVerification(merchantIdOrShopId: string, rejectionReason: string, adminName: string): Promise<MerchantVerificationRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const vrfRes = await client.query(`
        SELECT * FROM merchant_verifications WHERE merchant_id = $1 OR shop_id = $1 OR id = $1 ORDER BY submitted_at DESC LIMIT 1
      `, [merchantIdOrShopId]);

      let merchantId = merchantIdOrShopId;
      let shopId = merchantIdOrShopId;

      if (vrfRes.rows.length > 0) {
        merchantId = vrfRes.rows[0].merchant_id;
        shopId = vrfRes.rows[0].shop_id;

        await client.query(`
          UPDATE merchant_verifications SET
            verification_status = 'REJECTED',
            merchant_status = 'REJECTED',
            rejection_reason = $1,
            reviewed_at = NOW(),
            reviewed_by = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [rejectionReason, adminName, vrfRes.rows[0].id]);
      }

      await client.query(`
        UPDATE shops SET status = 'INACTIVE', verification_status = 'REJECTED', rejection_reason = $1, updated_at = NOW() WHERE id = $2
      `, [rejectionReason, shopId]);

      await client.query(`
        UPDATE merchants 
        SET status = 'inactive', 
            verification_status = 'REJECTED', 
            token_version = COALESCE(token_version, 1) + 1,
            updated_at = NOW() 
        WHERE id = $1 OR shop_id = $1
      `, [merchantId]);

      await client.query('COMMIT');
      return this.getMerchantVerificationByMerchantId(merchantId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async resubmitMerchantVerification(merchantId: string, updatedData: any): Promise<MerchantVerificationRecord | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const vrfRes = await client.query(`
        SELECT * FROM merchant_verifications WHERE merchant_id = $1 ORDER BY submitted_at DESC LIMIT 1
      `, [merchantId]);

      if (vrfRes.rows.length === 0) {
        throw new Error('মার্চেন্ট আবেদন পাওয়া যায়নি।');
      }

      const row = vrfRes.rows[0];

      const ownerName = updatedData.ownerName || row.owner_name;
      const email = updatedData.email !== undefined ? updatedData.email : row.email;
      const shopName = updatedData.shopName || row.shop_name;
      const businessType = updatedData.businessType || row.business_type;
      const shopAddress = updatedData.shopAddress || row.shop_address;
      const district = updatedData.district || row.district;
      const upazilaThana = updatedData.upazilaThana || row.upazila_thana;
      const shopPhotoUrl = updatedData.shopPhotoUrl || row.shop_photo_url;
      const businessDescription = updatedData.businessDescription || row.business_description;
      const nidNumber = updatedData.nidNumber || row.nid_number;
      const nidFrontUrl = updatedData.nidFrontUrl || row.nid_front_url;
      const nidBackUrl = updatedData.nidBackUrl || row.nid_back_url;
      const ownerSelfieUrl = updatedData.ownerSelfieUrl || row.owner_selfie_url;
      const tradeLicenseNumber = updatedData.tradeLicenseNumber || row.trade_license_number;
      const tradeLicenseUrl = updatedData.tradeLicenseUrl || row.trade_license_url;
      const tinNumber = updatedData.tinNumber !== undefined ? updatedData.tinNumber : row.tin_number;
      const binVatNumber = updatedData.binVatNumber !== undefined ? updatedData.binVatNumber : row.bin_vat_number;

      await client.query(`
        UPDATE merchant_verifications SET
          owner_name = $1, email = $2, shop_name = $3, business_type = $4,
          shop_address = $5, district = $6, upazila_thana = $7, shop_photo_url = $8,
          business_description = $9, nid_number = $10, nid_front_url = $11, nid_back_url = $12,
          owner_selfie_url = $13, trade_license_number = $14, trade_license_url = $15,
          tin_number = $16, bin_vat_number = $17,
          verification_status = 'PENDING',
          merchant_status = 'PENDING_VERIFICATION',
          correction_message = NULL,
          requested_correction_fields = '[]',
          submitted_at = NOW(),
          updated_at = NOW()
        WHERE id = $18
      `, [
        ownerName, email, shopName, businessType,
        shopAddress, district, upazilaThana, shopPhotoUrl,
        businessDescription, nidNumber, nidFrontUrl, nidBackUrl,
        ownerSelfieUrl, tradeLicenseNumber, tradeLicenseUrl,
        tinNumber, binVatNumber, row.id
      ]);

      await client.query(`
        UPDATE shops SET
          name = $1, name_bn = $1, category = $2, business_type = $2,
          address = $3, district = $4, upazila_thana = $5, photo_url = $6, description = $7,
          nid_number = $8, nid_front_url = $9, nid_back_url = $10, owner_selfie_url = $11,
          trade_license_number = $12, trade_license_url = $13, tin_number = $14, bin_vat_number = $15,
          status = 'PENDING', verification_status = 'PENDING', correction_message = NULL, updated_at = NOW()
        WHERE id = $16
      `, [
        shopName, businessType, shopAddress, district, upazilaThana, shopPhotoUrl, businessDescription,
        nidNumber, nidFrontUrl, nidBackUrl, ownerSelfieUrl,
        tradeLicenseNumber, tradeLicenseUrl, tinNumber, binVatNumber, row.shop_id
      ]);

      await client.query(`
        UPDATE merchants SET
          name = $1, email = $2, verification_status = 'PENDING', updated_at = NOW()
        WHERE id = $3
      `, [ownerName, email, merchantId]);

      await client.query('COMMIT');
      return this.getMerchantVerificationByMerchantId(merchantId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 13. SYSTEM STATS & ACTIVITY
  // =========================================================================

  async getSystemStatsSummary() {
    const uRes = await query(`SELECT COUNT(*) as count FROM users`);
    const mRes = await query(`SELECT COUNT(*) as count FROM mosques WHERE status = 'active'`);
    // Partner Shops: Pending + Approved (Anything NOT rejected)
    const sRes = await query(`SELECT COUNT(*) as count FROM shops WHERE UPPER(verification_status) NOT IN ('REJECTED') OR verification_status IS NULL`);
    // Rejected Shops
    const rjRes = await query(`SELECT COUNT(*) as count FROM shops WHERE UPPER(verification_status) = 'REJECTED'`);
    const rRes = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(bill_amount), 0) as total_volume,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(commission_amount), 0) as total_commissions
      FROM redemptions
    `);
    const tRes = await query(`SELECT COUNT(*) as count FROM tokens`);

    return {
      totalUsers: Number(uRes.rows[0]?.count || 0),
      totalMosques: Number(mRes.rows[0]?.count || 0),
      totalShops: Number(sRes.rows[0]?.count || 0),
      totalRejectedShops: Number(rjRes.rows[0]?.count || 0),
      totalTokensGenerated: Number(tRes.rows[0]?.count || 0),
      totalRedemptions: Number(rRes.rows[0]?.count || 0),
      totalVolumeRedeemed: Number(rRes.rows[0]?.total_volume || 0),
      totalDiscountsGiven: Number(rRes.rows[0]?.total_discounts || 0),
      totalCommissionEarned: Number(rRes.rows[0]?.total_commissions || 0)
    };
  }

  async getSystemRecentActivity(limit = 30) {
    const redemptionsRes = await query(`SELECT * FROM redemptions ORDER BY redeemed_at DESC LIMIT $1`, [limit]);
    const attendancesRes = await query(`SELECT * FROM prayer_attendances ORDER BY verified_at DESC LIMIT $1`, [limit]);

    const activities: Array<{
      id: string;
      type: 'REDEMPTION' | 'PRAYER' | 'SYSTEM';
      title: string;
      description: string;
      timestamp: string;
    }> = [];

    for (const r of redemptionsRes.rows) {
      activities.push({
        id: r.id,
        type: 'REDEMPTION',
        title: `রিডেম্পশন: ${r.shop_name}`,
        description: `${r.user_name} (${r.user_phone}) - ৳${r.final_amount} (ছাড় ৳${r.discount_amount})`,
        timestamp: r.redeemed_at instanceof Date ? r.redeemed_at.toISOString() : String(r.redeemed_at)
      });
    }

    for (const a of attendancesRes.rows) {
      activities.push({
        id: a.id,
        type: 'PRAYER',
        title: `নামাজ জামাত: ${a.mosque_name}`,
        description: `${a.prayer_type.toUpperCase()} নামাজ সম্পন্ন (${a.date})`,
        timestamp: a.verified_at instanceof Date ? a.verified_at.toISOString() : String(a.verified_at)
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);
  }

  // =========================================================================
  // 19. HELPLINE SETTINGS MANAGEMENT
  // =========================================================================

  async getHelplineSettings(): Promise<HelplineSettingsRecord> {
    try {
      const res = await query(`
        SELECT * FROM helpline_settings WHERE id = 'default_helpline' LIMIT 1
      `);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          primaryPhone: row.primary_phone || '+880 1700-000000',
          secondaryPhone: row.secondary_phone || '',
          whatsappNumber: row.whatsapp_number || '',
          supportEmail: row.support_email || '',
          supportMessage: row.support_message || 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
          isWhatsappEnabled: Boolean(row.is_whatsapp_enabled),
          isActive: Boolean(row.is_active),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          updatedBy: row.updated_by || 'system'
        };
      }
    } catch (err) {
      console.error('[DB getHelplineSettings] Query error, returning fallback default:', err);
    }

    return {
      id: 'default_helpline',
      primaryPhone: '+880 1700-000000',
      secondaryPhone: '',
      whatsappNumber: '',
      supportEmail: 'support@cavecompanions.org',
      supportMessage: 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
      isWhatsappEnabled: false,
      isActive: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };
  }

  async updateHelplineSettings(
    settings: Partial<HelplineSettingsRecord>,
    adminName: string
  ): Promise<HelplineSettingsRecord> {
    const current = await this.getHelplineSettings();
    const primaryPhone = (settings.primaryPhone !== undefined ? settings.primaryPhone : current.primaryPhone).trim();
    const secondaryPhone = (settings.secondaryPhone !== undefined ? settings.secondaryPhone : current.secondaryPhone).trim();
    const whatsappNumber = (settings.whatsappNumber !== undefined ? settings.whatsappNumber : current.whatsappNumber).trim();
    const supportEmail = (settings.supportEmail !== undefined ? settings.supportEmail : current.supportEmail).trim();
    const supportMessage = (settings.supportMessage !== undefined ? settings.supportMessage : current.supportMessage).trim();
    const isWhatsappEnabled = settings.isWhatsappEnabled !== undefined ? Boolean(settings.isWhatsappEnabled) : current.isWhatsappEnabled;
    const isActive = settings.isActive !== undefined ? Boolean(settings.isActive) : current.isActive;

    const res = await query(`
      INSERT INTO helpline_settings (
        id, primary_phone, secondary_phone, whatsapp_number, support_email, support_message, is_whatsapp_enabled, is_active, updated_at, updated_by
      ) VALUES (
        'default_helpline', $1, $2, $3, $4, $5, $6, $7, NOW(), $8
      )
      ON CONFLICT (id) DO UPDATE SET
        primary_phone = EXCLUDED.primary_phone,
        secondary_phone = EXCLUDED.secondary_phone,
        whatsapp_number = EXCLUDED.whatsapp_number,
        support_email = EXCLUDED.support_email,
        support_message = EXCLUDED.support_message,
        is_whatsapp_enabled = EXCLUDED.is_whatsapp_enabled,
        is_active = EXCLUDED.is_active,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `, [
      primaryPhone,
      secondaryPhone,
      whatsappNumber,
      supportEmail,
      supportMessage,
      isWhatsappEnabled,
      isActive,
      adminName || 'Admin'
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      primaryPhone: row.primary_phone,
      secondaryPhone: row.secondary_phone || '',
      whatsappNumber: row.whatsapp_number || '',
      supportEmail: row.support_email || '',
      supportMessage: row.support_message || '',
      isWhatsappEnabled: Boolean(row.is_whatsapp_enabled),
      isActive: Boolean(row.is_active),
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedBy: row.updated_by
    };
  }

  // ============================================================
  // MARKETPLACE: PRODUCTS MANAGEMENT WITH APPROVAL WORKFLOW
  // ============================================================

  async resolveShopIdForMerchant(merchant: { id: string; shopId?: string }): Promise<string> {
    if (merchant.shopId) {
      const shopCheck = await query(`SELECT id FROM shops WHERE id = $1 LIMIT 1`, [merchant.shopId]);
      if (shopCheck.rows.length > 0) {
        return shopCheck.rows[0].id;
      }
    }

    const shopRes = await query(`
      SELECT id FROM shops 
      WHERE owner_id = $1 OR id = $1 OR qr_identifier = $1 
      ORDER BY created_at DESC LIMIT 1
    `, [merchant.id]);

    if (shopRes.rows.length > 0) {
      return shopRes.rows[0].id;
    }

    const mchRes = await query(`SELECT shop_id FROM merchants WHERE id = $1 LIMIT 1`, [merchant.id]);
    if (mchRes.rows.length > 0 && mchRes.rows[0].shop_id) {
      return mchRes.rows[0].shop_id;
    }

    return merchant.shopId || merchant.id;
  }

  async createProduct(shopIdInput: string, data: {
    name: string;
    description?: string;
    category?: string;
    originalPrice: number;
    weightKg?: number;
    imageUrl?: string;
    gallery?: string[];
    isAvailable?: boolean;
  }) {
    let targetShopId = String(shopIdInput || '').trim();

    // Check if targetShopId matches a shop directly, or by owner_id/qr_identifier
    if (targetShopId) {
      const shopCheck = await query(`
        SELECT id FROM shops 
        WHERE id = $1 OR owner_id = $1 OR qr_identifier = $1 OR LOWER(id) = LOWER($1)
        ORDER BY created_at DESC LIMIT 1
      `, [targetShopId]);

      if (shopCheck.rows.length > 0) {
        targetShopId = shopCheck.rows[0].id;
      }
    }

    const id = 'PROD-' + crypto.randomBytes(16).toString('hex');
    const weightVal = data.weightKg !== undefined && !isNaN(Number(data.weightKg)) ? Math.max(0.1, Number(data.weightKg)) : 1.0;
    const res = await query(`
      INSERT INTO products (
        id, shop_id, name, description, category, original_price, weight_kg, image_url, gallery, is_available, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, 'PENDING', NOW(), NOW())
      RETURNING *
    `, [
      id,
      targetShopId,
      data.name.trim(),
      data.description?.trim() || null,
      data.category?.trim() || null,
      Number(data.originalPrice) || 0,
      weightVal,
      data.imageUrl?.trim() || null,
      JSON.stringify(data.gallery || []),
      data.isAvailable !== undefined ? Boolean(data.isAvailable) : true
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      shopId: row.shop_id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      originalPrice: Number(row.original_price),
      weightKg: Number(row.weight_kg) || 1.0,
      imageUrl: row.image_url || '',
      gallery: Array.isArray(row.gallery) ? row.gallery : (typeof row.gallery === 'string' ? JSON.parse(row.gallery) : []),
      isAvailable: Boolean(row.is_available),
      status: row.status ? String(row.status).trim().toUpperCase() : 'PENDING',
      rejectionReason: row.rejection_reason || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async updateProduct(productId: string, shopId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    originalPrice?: number;
    weightKg?: number;
    imageUrl?: string;
    gallery?: string[];
    isAvailable?: boolean;
  }, merchantUserId?: string) {
    const existing = await this.getProductById(productId);
    if (!existing) {
      return null;
    }

    let priceChangeRequested = false;
    let newPriceRequest: any = null;

    // Handle price change request if product is LIVE (status is APPROVED, LIVE, ACTIVE, or NULL) and requested price is different
    const currentPrice = Number(existing.originalPrice);
    const requestedPrice = data.originalPrice !== undefined ? Number(data.originalPrice) : currentPrice;
    const isLiveProduct = !existing.status || existing.status === 'APPROVED' || existing.status === 'LIVE' || existing.status === 'ACTIVE';

    if (isLiveProduct && data.originalPrice !== undefined && requestedPrice !== currentPrice) {
      priceChangeRequested = true;
      // Check if pending request exists
      const checkPending = await query(`
        SELECT id FROM product_price_change_requests
        WHERE product_id = $1 AND UPPER(TRIM(status)) = 'PENDING'
      `, [productId]);

      const reqId = checkPending.rows.length > 0 ? checkPending.rows[0].id : ('PPCR-' + crypto.randomBytes(16).toString('hex'));

      if (checkPending.rows.length > 0) {
        await query(`
          UPDATE product_price_change_requests
          SET requested_new_price = $1, old_price = $2, submitted_at = NOW()
          WHERE id = $3
        `, [requestedPrice, currentPrice, reqId]);
      } else {
        await query(`
          INSERT INTO product_price_change_requests (
            id, product_id, shop_id, merchant_id, old_price, requested_new_price, status, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW())
        `, [reqId, productId, existing.shopId || shopId, merchantUserId || null, currentPrice, requestedPrice]);
      }

      newPriceRequest = {
        id: reqId,
        productId,
        shopId: existing.shopId || shopId,
        oldPrice: currentPrice,
        requestedNewPrice: requestedPrice,
        requestedPrice: requestedPrice,
        status: 'PENDING',
        submittedAt: new Date().toISOString()
      };
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const description = data.description !== undefined ? data.description.trim() : existing.description;
    const category = data.category !== undefined ? data.category.trim() : existing.category;
    // Price stays as live price if price change is pending approval; otherwise if product is PENDING/REJECTED, price can update directly
    const originalPrice = (isLiveProduct && priceChangeRequested) ? currentPrice : requestedPrice;
    const weightVal = data.weightKg !== undefined && !isNaN(Number(data.weightKg)) ? Math.max(0.1, Number(data.weightKg)) : (existing.weightKg || 1.0);
    const imageUrl = data.imageUrl !== undefined ? data.imageUrl.trim() : existing.imageUrl;
    const gallery = data.gallery !== undefined ? JSON.stringify(data.gallery) : JSON.stringify(existing.gallery || []);
    const isAvailable = data.isAvailable !== undefined ? Boolean(data.isAvailable) : existing.isAvailable;

    // If product was REJECTED and merchant edits it, resubmit for approval (status -> PENDING)
    let newStatus = existing.status || 'APPROVED';
    if (existing.status === 'REJECTED') {
      newStatus = 'PENDING';
    }

    const res = await query(`
      UPDATE products
      SET name = $1, description = $2, category = $3, original_price = $4, weight_kg = $5, image_url = $6, gallery = $7::jsonb, is_available = $8, status = $9, rejection_reason = NULL, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [name, description, category, originalPrice, weightVal, imageUrl, gallery, isAvailable, newStatus, productId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      shopId: row.shop_id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      originalPrice: Number(row.original_price),
      weightKg: Number(row.weight_kg) || 1.0,
      imageUrl: row.image_url || '',
      gallery: Array.isArray(row.gallery) ? row.gallery : (typeof row.gallery === 'string' ? JSON.parse(row.gallery) : []),
      isAvailable: Boolean(row.is_available),
      status: row.status || 'APPROVED',
      rejectionReason: row.rejection_reason || null,
      priceChangeRequested,
      pendingPriceChange: newPriceRequest,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async requestProductDelete(productId: string, shopId: string, merchantUserId?: string) {
    const existing = await this.getProductById(productId);
    if (!existing) {
      return { success: false, message: 'পণ্যটি খুঁজে পাওয়া যায়নি।' };
    }

    // If product is in PENDING state (unapproved draft) or REJECTED state, allow merchant to delete it directly without admin approval
    const statusUpper = String(existing.status || '').toUpperCase().trim();
    if (statusUpper === 'PENDING' || statusUpper === 'REJECTED') {
      const deleted = await this.deleteProduct(productId, existing.shopId || shopId);
      if (deleted) {
        return { success: true, message: 'পণ্যটি সফলভাবে মুছে ফেলা হয়েছে।' };
      }
    }

    // Check if pending request exists for live products
    const checkPending = await query(`
      SELECT id FROM product_delete_requests
      WHERE product_id = $1 AND UPPER(TRIM(status)) = 'PENDING'
    `, [productId]);

    if (checkPending.rows.length > 0) {
      return { success: true, message: 'পণ্য ডিলেট করার একটি রিকোয়েস্ট ইতিমধ্যেই এডমিনের অনুমোদনের জন্য অপেক্ষমাণ।' };
    }

    const reqId = 'PDR-' + crypto.randomBytes(16).toString('hex');
    await query(`
      INSERT INTO product_delete_requests (
        id, product_id, shop_id, merchant_id, status, submitted_at
      ) VALUES ($1, $2, $3, $4, 'PENDING', NOW())
    `, [reqId, productId, existing.shopId || shopId, merchantUserId || null]);

    return {
      success: true,
      message: 'পণ্য ডিলেট করার রিকোয়েস্ট এডমিন অনুমোদনের জন্য জমা দেওয়া হয়েছে।'
    };
  }

  async toggleProductAvailability(productId: string, shopId: string) {
    const res = await query(`
      UPDATE products
      SET is_available = NOT is_available, updated_at = NOW()
      WHERE id = $1 AND shop_id = $2
      RETURNING *
    `, [productId, shopId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      shopId: row.shop_id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      originalPrice: Number(row.original_price),
      imageUrl: row.image_url || '',
      isAvailable: Boolean(row.is_available),
      status: row.status || 'APPROVED',
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async deleteProduct(productId: string, shopId?: string) {
    // Check references in orders, cart_items, etc.
    const orderCheck = await query(`SELECT id FROM order_items WHERE product_id = $1 LIMIT 1`, [productId]);
    if (orderCheck.rows.length > 0) {
      // Soft delete to protect historical orders
      await query(`UPDATE products SET status = 'DELETED', updated_at = NOW() WHERE id = $1`, [productId]);
      return true;
    }

    const res = await query(`
      DELETE FROM products
      WHERE id = $1
      RETURNING id
    `, [productId]);

    return res.rowCount !== null && res.rowCount > 0;
  }

  async getProductById(productId: string) {
    const res = await query(`
      SELECT p.*, s.name as shop_name, s.name_bn as shop_name_bn
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE p.id = $1
    `, [productId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name_bn || row.shop_name || '',
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      originalPrice: Number(row.original_price),
      weightKg: Number(row.weight_kg) || 1.0,
      imageUrl: row.image_url || '',
      gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []),
      isAvailable: Boolean(row.is_available),
      status: row.status || 'APPROVED',
      rejectionReason: row.rejection_reason || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async getProductsByShop(shopId: string, onlyAvailable = false, approvedOnly = false) {
    const cleanId = String(shopId || '').trim();
    if (!cleanId) return [];

    let sql = `
      SELECT p.*, s.name as shop_name, s.name_bn as shop_name_bn
      FROM products p
      LEFT JOIN shops s ON (p.shop_id = s.id OR p.shop_id = s.qr_identifier OR s.owner_id = p.shop_id OR LOWER(p.shop_id) = LOWER(s.id))
      WHERE (
        p.shop_id = $1 
        OR s.id = $1 
        OR s.owner_id = $1 
        OR s.qr_identifier = $1 
        OR LOWER(p.shop_id) = LOWER($1)
      )
    `;
    const params: any[] = [cleanId];

    if (approvedOnly) {
      sql += ` AND UPPER(TRIM(COALESCE(p.status, 'APPROVED'))) = 'APPROVED'`;
    } else {
      sql += ` AND UPPER(TRIM(COALESCE(p.status, 'APPROVED'))) != 'DELETED'`;
    }

    if (onlyAvailable) {
      sql += ` AND p.is_available = TRUE`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    const res = await query(sql, params);
    const products = res.rows.map(row => ({
      id: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name_bn || row.shop_name || '',
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      originalPrice: Number(row.original_price),
      weightKg: Number(row.weight_kg) || 1.0,
      imageUrl: row.image_url || '',
      gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []),
      isAvailable: Boolean(row.is_available),
      status: row.status ? String(row.status).trim().toUpperCase() : 'PENDING',
      rejectionReason: row.rejection_reason || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    }));

    // If fetching for merchant (approvedOnly = false), attach pending requests
    if (!approvedOnly && products.length > 0) {
      const productIds = products.map(p => p.id);
      
      const priceReqs = await query(`
        SELECT * FROM product_price_change_requests
        WHERE product_id = ANY($1) AND status = 'PENDING'
      `, [productIds]);

      const deleteReqs = await query(`
        SELECT * FROM product_delete_requests
        WHERE product_id = ANY($1) AND status = 'PENDING'
      `, [productIds]);

      const priceReqMap: Record<string, any> = {};
      for (const pr of priceReqs.rows) {
        const reqPrice = Number(pr.requested_new_price);
        priceReqMap[pr.product_id] = {
          id: pr.id,
          productId: pr.product_id,
          shopId: pr.shop_id,
          oldPrice: Number(pr.old_price),
          requestedNewPrice: reqPrice,
          requestedPrice: reqPrice,
          status: pr.status,
          submittedAt: new Date(pr.submitted_at).toISOString(),
          createdAt: new Date(pr.submitted_at).toISOString()
        };
      }

      const deleteReqMap: Record<string, any> = {};
      for (const dr of deleteReqs.rows) {
        deleteReqMap[dr.product_id] = {
          id: dr.id,
          productId: dr.product_id,
          shopId: dr.shop_id,
          status: dr.status,
          submittedAt: new Date(dr.submitted_at).toISOString()
        };
      }

      return products.map(p => ({
        ...p,
        pendingPriceChange: priceReqMap[p.id] || null,
        pendingDeleteRequest: deleteReqMap[p.id] || null
      }));
    }

    return products;
  }

  async getAllMarketProducts(onlyAvailable = false, marketType = 'NATIONWIDE', userLat?: number, userLng?: number, radiusKm = 20) {
    let sql = `
      SELECT p.*, s.name as shop_name, s.name_bn as shop_name_bn,
             s.category as shop_category, s.business_type as shop_business_type,
             s.district as shop_district, s.area as shop_area, s.upazila_thana as shop_upazila,
             s.latitude as shop_latitude, s.longitude as shop_longitude,
             s.gold_discount, s.silver_discount, s.bronze_discount
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE s.status = 'ACTIVE'
        AND (p.status = 'APPROVED' OR p.status IS NULL)
        AND (p.status IS NULL OR p.status != 'DELETED')
    `;
    const params: any[] = [];

    if (onlyAvailable) {
      sql += ` AND p.is_available = TRUE`;
    }

    if (marketType === 'NATIONWIDE') {
      sql += ` AND s.district ILIKE '%dhaka%'`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    const res = await query(sql, params);
    let products = res.rows.map(row => {
      const sLat = row.shop_latitude ? Number(row.shop_latitude) : null;
      const sLng = row.shop_longitude ? Number(row.shop_longitude) : null;
      let distanceKm: number | undefined = undefined;

      if (userLat !== undefined && userLng !== undefined && sLat !== null && sLng !== null) {
        const straight = this.calcDistance(userLat, userLng, sLat, sLng);
        distanceKm = Number((straight * 1.4).toFixed(1)); // road factor
      }

      return {
        id: row.id,
        shopId: row.shop_id,
        shopName: row.shop_name_bn || row.shop_name || '',
        shopCategory: row.shop_category || '',
        shopBusinessType: row.shop_business_type || '',
        shopDistrict: row.shop_district || '',
        shopArea: row.shop_area || '',
        shopUpazila: row.shop_upazila || row.shop_area || '',
        shopLatitude: sLat,
        shopLongitude: sLng,
        distanceKm,
        category: row.category || '',
        name: row.name,
        description: row.description || '',
        originalPrice: Number(row.original_price),
        weightKg: Number(row.weight_kg) || 1.0,
        imageUrl: row.image_url || '',
        gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []),
        isAvailable: Boolean(row.is_available),
        status: row.status || 'APPROVED',
        goldDiscount: Number(row.gold_discount || 0),
        silverDiscount: Number(row.silver_discount || 0),
        bronzeDiscount: Number(row.bronze_discount || 0),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    });

    // If LOCAL market with user coordinates and radius filter (1 to 20 km)
    if (marketType === 'LOCAL' && userLat !== undefined && userLng !== undefined) {
      const maxRadius = Math.min(20, Math.max(1, radiusKm || 20));
      products = products.filter(p => p.distanceKm === undefined || p.distanceKm <= maxRadius);
      products.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return 0;
      });
    }

    return products;
  }

  // ============================================================
  // ADMIN PRODUCT APPROVAL MANAGEMENT FUNCTIONS
  // ============================================================

  async getPendingProductAddRequests() {
    const res = await query(`
      SELECT p.*, s.name as shop_name, s.name_bn as shop_name_bn, s.owner_id, u.full_name as merchant_name
      FROM products p
      LEFT JOIN shops s ON (p.shop_id = s.id OR p.shop_id = s.qr_identifier OR s.owner_id = p.shop_id OR LOWER(p.shop_id) = LOWER(s.id))
      LEFT JOIN users u ON (s.owner_id = u.id OR u.id = p.shop_id OR u.id = s.id)
      WHERE UPPER(TRIM(COALESCE(p.status, ''))) = 'PENDING'
      ORDER BY p.created_at DESC
    `);

    return res.rows.map(row => ({
      id: row.id,
      productId: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name_bn || row.shop_name || 'অজানা শপ',
      merchantName: row.merchant_name || 'অজানা মার্চেন্ট',
      name: row.name,
      description: row.description || '',
      category: row.category || 'সাধারণ',
      originalPrice: Number(row.original_price),
      weightKg: Number(row.weight_kg) || 1.0,
      imageUrl: row.image_url || '',
      gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []),
      isAvailable: Boolean(row.is_available),
      status: row.status,
      rejectionReason: row.rejection_reason || null,
      submittedAt: new Date(row.created_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString()
    }));
  }

  async approveProductAddRequest(productId: string, adminId: string) {
    const res = await query(`
      UPDATE products
      SET status = 'APPROVED', rejection_reason = NULL, updated_at = NOW()
      WHERE id = $1 AND UPPER(TRIM(status)) = 'PENDING'
      RETURNING *
    `, [productId]);

    if (res.rows.length === 0) return { success: false, message: 'রিকোয়েস্টটি ইতিমধ্যেই প্রক্রিয়াজাত হয়েছে বা পাওয়া যায়নি।' };
    const row = res.rows[0];

    // Get shop owner to notify
    const shopRes = await query(`SELECT owner_id FROM shops WHERE id = $1`, [row.shop_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'পণ্য অনুমোদন হয়েছে',
        `আপনার নতুন পণ্য "${row.name}" এডমিন কর্তৃক অনুমোদিত এবং কেভ মার্কেটে লাইভ করা হয়েছে।`,
        row.id
      );
    }

    return { success: true, message: 'পণ্য সফলভাবে অনুমোদন করা হয়েছে এবং লাইভ করা হয়েছে।' };
  }

  async rejectProductAddRequest(productId: string, reason: string, adminId: string) {
    const res = await query(`
      UPDATE products
      SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
      WHERE id = $2 AND UPPER(TRIM(status)) = 'PENDING'
      RETURNING *
    `, [reason.trim(), productId]);

    if (res.rows.length === 0) return { success: false, message: 'রিকোয়েস্টটি ইতিমধ্যেই প্রক্রিয়াজাত হয়েছে বা পাওয়া যায়নি।' };
    const row = res.rows[0];

    // Notify shop owner
    const shopRes = await query(`SELECT owner_id FROM shops WHERE id = $1`, [row.shop_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'পণ্য প্রত্যাখ্যাত হয়েছে',
        `আপনার পণ্য "${row.name}" এডমিন কর্তৃক প্রত্যাখ্যাত হয়েছে। কারণ: ${reason}`,
        row.id
      );
    }

    return { success: true, message: 'পণ্য যোগ করার রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।' };
  }

  async deleteProductAddRequest(productId: string, adminId: string) {
    const prodRes = await query(`SELECT * FROM products WHERE id = $1`, [productId]);
    if (prodRes.rows.length === 0) return { success: false, message: 'পণ্য পাওয়া যায়নি।' };
    const prod = prodRes.rows[0];

    // Delete request record safely
    await this.deleteProduct(productId, prod.shop_id);

    // Notify shop owner
    const shopRes = await query(`SELECT owner_id FROM shops WHERE id = $1`, [prod.shop_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'পণ্য রিকোয়েস্ট ডিলেট',
        `আপনার পণ্য "${prod.name}" এর রিকোয়েস্টটি সরিয়ে ফেলা হয়েছে।`,
        prod.id
      );
    }

    return { success: true, message: 'পণ্য রিকোয়েস্ট স্থায়ীভাবে ডিলেট করা হয়েছে।' };
  }

  async getPendingPriceChangeRequests() {
    const res = await query(`
      SELECT ppcr.*, p.name as product_name, p.image_url as product_image_url, p.original_price as current_live_price,
             s.name as shop_name, s.name_bn as shop_name_bn, u.full_name as merchant_name
      FROM product_price_change_requests ppcr
      LEFT JOIN products p ON ppcr.product_id = p.id
      LEFT JOIN shops s ON (ppcr.shop_id = s.id OR ppcr.shop_id = s.qr_identifier OR ppcr.shop_id = s.owner_id OR p.shop_id = s.id OR LOWER(ppcr.shop_id) = LOWER(s.id))
      LEFT JOIN users u ON (s.owner_id = u.id OR u.id = ppcr.merchant_id OR u.id = ppcr.shop_id OR u.id = p.shop_id)
      WHERE UPPER(TRIM(COALESCE(ppcr.status, ''))) = 'PENDING'
      ORDER BY ppcr.submitted_at DESC
    `);

    return res.rows.map(row => {
      const oldPrice = Number(row.old_price);
      const requestedNewPrice = Number(row.requested_new_price);
      const priceDifference = requestedNewPrice - oldPrice;
      const percentageDifference = oldPrice > 0 ? Number(((priceDifference / oldPrice) * 100).toFixed(1)) : 0;

      return {
        id: row.id,
        productId: row.product_id,
        shopId: row.shop_id,
        shopName: row.shop_name_bn || row.shop_name || 'অজানা শপ',
        merchantName: row.merchant_name || 'অজানা মার্চেন্ট',
        productName: row.product_name || 'পণ্য',
        productImageUrl: row.product_image_url || '',
        oldPrice,
        requestedNewPrice,
        requestedPrice: requestedNewPrice,
        priceDifference,
        percentageDifference,
        status: row.status,
        submittedAt: new Date(row.submitted_at).toISOString(),
        createdAt: new Date(row.submitted_at).toISOString(),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
        rejectionReason: row.rejection_reason || null
      };
    });
  }

  async approvePriceChangeRequest(requestId: string, adminId: string) {
    const reqRes = await query(`
      SELECT * FROM product_price_change_requests
      WHERE id = $1 AND UPPER(TRIM(status)) = 'PENDING'
    `, [requestId]);

    if (reqRes.rows.length === 0) return { success: false, message: 'প্রাইস পরিবর্তন রিকোয়েস্টটি পাওয়া যায়নি বা ইতিমধ্যেই সম্পন্ন হয়েছে।' };
    const reqRow = reqRes.rows[0];

    const newPrice = Number(reqRow.requested_new_price);
    const productId = reqRow.product_id;

    // Atomically update product live price
    await query(`
      UPDATE products
      SET original_price = $1, updated_at = NOW()
      WHERE id = $2
    `, [newPrice, productId]);

    // Mark request as APPROVED
    await query(`
      UPDATE product_price_change_requests
      SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $1
      WHERE id = $2
    `, [adminId, requestId]);

    // Notify merchant
    const shopRes = await query(`SELECT s.owner_id, p.name as product_name FROM shops s JOIN products p ON p.shop_id = s.id WHERE p.id = $1`, [productId]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'মূল্য পরিবর্তন অনুমোদিত',
        `আপনার "${shopRes.rows[0].product_name}" পণ্যের মূল্য ৳${reqRow.old_price} থেকে ৳${newPrice} পরিবর্তন অনুমোদিত হয়েছে।`,
        productId
      );
    }

    return { success: true, message: 'পণ্যের মূল্য পরিবর্তন সফলভাবে অনুমোদন করা হয়েছে।' };
  }

  async rejectPriceChangeRequest(requestId: string, reason: string, adminId: string) {
    const reqRes = await query(`
      UPDATE product_price_change_requests
      SET status = 'REJECTED', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2
      WHERE id = $3 AND status = 'PENDING'
      RETURNING *
    `, [reason.trim(), adminId, requestId]);

    if (reqRes.rows.length === 0) return { success: false, message: 'প্রাইস পরিবর্তন রিকোয়েস্টটি পাওয়া যায়নি বা ইতিমধ্যেই সম্পন্ন হয়েছে।' };
    const reqRow = reqRes.rows[0];

    // Notify merchant
    const shopRes = await query(`SELECT s.owner_id, p.name as product_name FROM shops s JOIN products p ON p.shop_id = s.id WHERE p.id = $1`, [reqRow.product_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'মূল্য পরিবর্তন প্রত্যাখ্যাত',
        `আপনার "${shopRes.rows[0].product_name}" পণ্যের মূল্য পরিবর্তন রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে। কারণ: ${reason}`,
        reqRow.product_id
      );
    }

    return { success: true, message: 'মূল্য পরিবর্তন রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।' };
  }

  async deletePriceChangeRequestRecord(requestId: string, adminId: string) {
    const reqRes = await query(`SELECT * FROM product_price_change_requests WHERE id = $1`, [requestId]);
    if (reqRes.rows.length === 0) return { success: false, message: 'রিকোয়েস্ট রেকর্ড পাওয়া যায়নি।' };
    const reqRow = reqRes.rows[0];

    await query(`DELETE FROM product_price_change_requests WHERE id = $1`, [requestId]);

    // Notify merchant
    const shopRes = await query(`SELECT s.owner_id, p.name as product_name FROM shops s JOIN products p ON p.shop_id = s.id WHERE p.id = $1`, [reqRow.product_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'প্রাইস চেঞ্জ রিকোয়েস্ট বাতিল',
        `আপনার "${shopRes.rows[0].product_name}" পণ্যের প্রাইস পরিবর্তন রিকোয়েস্ট রেকর্ডটি সরিয়ে ফেলা হয়েছে।`,
        reqRow.product_id
      );
    }

    return { success: true, message: 'প্রাইস পরিবর্তন রিকোয়েস্ট রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async getPendingDeleteRequests() {
    const res = await query(`
      SELECT pdr.*, p.name as product_name, p.category as product_category, p.image_url as product_image_url,
             p.original_price as product_price, p.is_available,
             s.name as shop_name, s.name_bn as shop_name_bn, u.full_name as merchant_name
      FROM product_delete_requests pdr
      LEFT JOIN products p ON pdr.product_id = p.id
      LEFT JOIN shops s ON (pdr.shop_id = s.id OR pdr.shop_id = s.qr_identifier OR pdr.shop_id = s.owner_id OR p.shop_id = s.id OR LOWER(pdr.shop_id) = LOWER(s.id))
      LEFT JOIN users u ON (s.owner_id = u.id OR u.id = pdr.merchant_id OR u.id = pdr.shop_id OR u.id = p.shop_id)
      WHERE UPPER(TRIM(COALESCE(pdr.status, ''))) = 'PENDING'
      ORDER BY pdr.submitted_at DESC
    `);

    return res.rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      shopId: row.shop_id,
      shopName: row.shop_name_bn || row.shop_name || 'অজানা শপ',
      merchantName: row.merchant_name || 'অজানা মার্চেন্ট',
      productName: row.product_name || 'পণ্য',
      productCategory: row.product_category || 'সাধারণ',
      productImageUrl: row.product_image_url || '',
      productPrice: Number(row.product_price || 0),
      isAvailable: Boolean(row.is_available),
      status: row.status,
      submittedAt: new Date(row.submitted_at).toISOString(),
      createdAt: new Date(row.submitted_at).toISOString(),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      rejectionReason: row.rejection_reason || null
    }));
  }

  async approveDeleteRequest(requestId: string, adminId: string) {
    const reqRes = await query(`
      SELECT * FROM product_delete_requests
      WHERE id = $1 AND UPPER(TRIM(status)) = 'PENDING'
    `, [requestId]);

    if (reqRes.rows.length === 0) return { success: false, message: 'ডিলেট রিকোয়েস্টটি পাওয়া যায়নি বা ইতিমধ্যেই সম্পন্ন হয়েছে।' };
    const reqRow = reqRes.rows[0];
    const productId = reqRow.product_id;

    // Get product & shop info
    const prodRes = await query(`SELECT p.name, s.owner_id, p.shop_id FROM products p JOIN shops s ON p.shop_id = s.id WHERE p.id = $1`, [productId]);
    const productName = prodRes.rows[0]?.name || 'পণ্য';
    const shopOwnerId = prodRes.rows[0]?.owner_id;

    // Safely delete product using soft-delete mechanism if references exist
    await this.deleteProduct(productId, reqRow.shop_id);

    // Mark request as APPROVED
    await query(`
      UPDATE product_delete_requests
      SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $1
      WHERE id = $2
    `, [adminId, requestId]);

    // Notify merchant
    if (shopOwnerId) {
      await this.createNotification(
        shopOwnerId,
        'SYSTEM_UPDATE',
        'পণ্য ডিলেট অনুমোদিত',
        `আপনার "${productName}" পণ্যটি সফলভাবে ডিলেট করা হয়েছে।`,
        productId
      );
    }

    return { success: true, message: 'পণ্য ডিলেট করার রিকোয়েস্ট অনুমোদিত হয়েছে এবং পণ্যটি কেভ মার্কেট থেকে রিমুভ করা হয়েছে।' };
  }

  async rejectDeleteRequest(requestId: string, reason: string, adminId: string) {
    const reqRes = await query(`
      UPDATE product_delete_requests
      SET status = 'REJECTED', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2
      WHERE id = $3 AND status = 'PENDING'
      RETURNING *
    `, [reason.trim(), adminId, requestId]);

    if (reqRes.rows.length === 0) return { success: false, message: 'ডিলেট রিকোয়েস্টটি পাওয়া যায়নি বা ইতিমধ্যেই সম্পন্ন হয়েছে।' };
    const reqRow = reqRes.rows[0];

    // Notify merchant
    const shopRes = await query(`SELECT s.owner_id, p.name as product_name FROM shops s JOIN products p ON p.shop_id = s.id WHERE p.id = $1`, [reqRow.product_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'পণ্য ডিলেট রিকোয়েস্ট প্রত্যাখ্যাত',
        `আপনার "${shopRes.rows[0].product_name}" পণ্য ডিলেট করার রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে। কারণ: ${reason}`,
        reqRow.product_id
      );
    }

    return { success: true, message: 'পণ্য ডিলেট রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।' };
  }

  async deleteDeleteRequestRecord(requestId: string, adminId: string) {
    const reqRes = await query(`SELECT * FROM product_delete_requests WHERE id = $1`, [requestId]);
    if (reqRes.rows.length === 0) return { success: false, message: 'রিকোয়েস্ট রেকর্ড পাওয়া যায়নি।' };
    const reqRow = reqRes.rows[0];

    await query(`DELETE FROM product_delete_requests WHERE id = $1`, [requestId]);

    // Notify merchant
    const shopRes = await query(`SELECT s.owner_id, p.name as product_name FROM shops s JOIN products p ON p.shop_id = s.id WHERE p.id = $1`, [reqRow.product_id]);
    if (shopRes.rows.length > 0 && shopRes.rows[0].owner_id) {
      await this.createNotification(
        shopRes.rows[0].owner_id,
        'SYSTEM_UPDATE',
        'ডিলেট রিকোয়েস্ট রেকর্ড বাতিল',
        `আপনার "${shopRes.rows[0].product_name}" পণ্যের ডিলেট রিকোয়েস্ট রেকর্ডটি সরিয়ে ফেলা হয়েছে। পণ্যটি লাইভ থাকবে।`,
        reqRow.product_id
      );
    }

    return { success: true, message: 'ডিলেট রিকোয়েস্ট রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  // ============================================================
  // MARKETPLACE: DELIVERY CHARGE SETTINGS
  // ============================================================

  async getDeliveryCharges(): Promise<Record<string, number>> {
    try {
      const res = await query(`
        SELECT district_name as name, delivery_charge 
        FROM district_delivery_charges
      `);
      const charges: Record<string, number> = {};
      for (const row of res.rows) {
        charges[row.name] = Number(row.delivery_charge);
      }
      return charges;
    } catch (err) {
      console.error('[DB getDeliveryCharges] error:', err);
      return {};
    }
  }

  async setDeliveryCharges(updates: Record<string, number>, updatedBy: string) {
    if (!updates || Object.keys(updates).length === 0) return {};
    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const [district, amount] of Object.entries(updates)) {
        const validAmount = isNaN(Number(amount)) || Number(amount) < 0 ? 100 : Number(amount);
        await client.query(`
          INSERT INTO district_delivery_charges (district_name, delivery_charge, updated_at, updated_by)
          VALUES ($1, $2, NOW(), $3)
          ON CONFLICT (district_name) DO UPDATE SET
            delivery_charge = EXCLUDED.delivery_charge,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
        `, [district, validAmount, updatedBy || 'admin']);
      }
      await client.query('COMMIT');
      return this.getDeliveryCharges();
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB setDeliveryCharges] error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getDeliveryCharge(): Promise<number> {
    const charges = await this.getDeliveryCharges();
    return charges['Dhaka'] || 60;
  }

  async getDeliveryChargeLogs(limit = 200) {
    const res = await query(`
      SELECT id, order_number, customer_name, customer_phone, delivery_address, delivery_charge, status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return res.rows.map(row => ({
      orderId: row.id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      deliveryAddress: row.delivery_address,
      deliveryCharge: Number(row.delivery_charge),
      orderStatus: row.status,
      orderDate: new Date(row.created_at).toISOString()
    }));
  }

  // ============================================================
  // MARKETPLACE: CART & TOKEN RESERVATION
  // ============================================================

  async getOrCreateCart(userId: string) {
    const existing = await query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const cartId = 'CART-' + crypto.randomUUID();
    const created = await query(`
      INSERT INTO carts (id, user_id, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id
    `, [cartId, userId]);

    return created.rows[0].id;
  }

  async getCartSummary(userId: string) {
    const cartId = await this.getOrCreateCart(userId);
    const res = await query(`
      SELECT 
        ci.id as cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.shop_id,
        ci.quantity,
        ci.token_id,
        ci.created_at,
        p.name as product_name,
        p.original_price,
        COALESCE(p.weight_kg, ci.weight_kg, 1.0) as weight_kg,
        p.image_url as product_image,
        p.is_available,
        s.name as shop_name,
        s.name_bn as shop_name_bn,
        s.district as shop_district,
        s.address as shop_address,
        s.latitude as shop_latitude,
        s.longitude as shop_longitude,
        s.gold_discount,
        s.silver_discount,
        s.bronze_discount,
        t.token_type,
        t.status as token_status,
        t.is_donated as token_is_donated
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN shops s ON ci.shop_id = s.id
      LEFT JOIN tokens t ON ci.token_id = t.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `, [cartId]);

    let totalQuantity = 0;
    let productOriginalTotal = 0;
    let tokenDiscountTotal = 0;
    let tokenDonationTotal = 0;
    let productPayableTotal = 0;

    // Enforce 1 Shop = 1 Token rule: at most 1 token can be applied per shop in cart
    const appliedShopTokens = new Set<string>();

    const items = res.rows.map(row => {
      let originalPrice = 0;
      if (row.original_price !== null && row.original_price !== undefined && !isNaN(Number(row.original_price))) {
        originalPrice = Number(row.original_price);
      } else {
        console.warn(`[Cart DB Warning] Non-numeric or missing original_price for product ${row.product_id} (${row.product_name}):`, row.original_price);
        originalPrice = 0;
      }
      const quantity = Math.max(1, Number(row.quantity) || 1);
      const isAvailable = Boolean(row.is_available);

      // Determine discount % with 1 Shop = 1 Token check
      let normalDiscountPercent = 0;
      let tokenType = null;
      let isTokenValidForShop = false;

      if (row.token_id && row.token_status === 'AVAILABLE') {
        if (!appliedShopTokens.has(row.shop_id)) {
          appliedShopTokens.add(row.shop_id);
          isTokenValidForShop = true;
        }
      }

      const isDonated = isTokenValidForShop && row.token_id && (row.token_is_donated === true || row.token_is_donated === 'true');

      if (isTokenValidForShop) {
        tokenType = row.token_type;
        if (row.token_type === 'GOLD') {
          normalDiscountPercent = Number(row.gold_discount) || 0;
        } else if (row.token_type === 'SILVER') {
          normalDiscountPercent = Number(row.silver_discount) || 0;
        } else if (row.token_type === 'BRONZE') {
          normalDiscountPercent = Number(row.bronze_discount) || 0;
        }
      }

      const tokenDiscountPercent = isDonated ? 0 : normalDiscountPercent;

      // Required Math Flow Calculation & Logging
      const lineOriginalTotal = originalPrice * quantity;
      const unitDiscount = (originalPrice * tokenDiscountPercent) / 100;
      const itemSubtotalDiscount = unitDiscount * quantity;
      const subtotalPayable = lineOriginalTotal - itemSubtotalDiscount;

      const unitDonation = isDonated ? (originalPrice * normalDiscountPercent) / 100 : 0;
      const itemSubtotalDonation = unitDonation * quantity;

      console.log(`[Cart Math Flow] Product: ${row.product_name} | originalPrice: ${originalPrice} | quantity: ${quantity} | lineOriginalTotal: ${lineOriginalTotal} | tokenDiscountPercent: ${tokenDiscountPercent}% | isDonated: ${isDonated} | donationAmount: ${itemSubtotalDonation} | itemSubtotalDiscount: ${itemSubtotalDiscount} | subtotalPayable: ${subtotalPayable}`);

      if (isAvailable) {
        totalQuantity += quantity;
        productOriginalTotal += lineOriginalTotal;
        tokenDiscountTotal += itemSubtotalDiscount;
        tokenDonationTotal += itemSubtotalDonation;
        productPayableTotal += subtotalPayable;
      }

      const finalPricePerUnit = originalPrice - unitDiscount;

      return {
        id: row.cart_item_id,
        cartId: row.cart_id,
        productId: row.product_id,
        productName: row.product_name,
        productImage: row.product_image || '',
        productPrice: originalPrice,
        originalPrice: originalPrice,
        weightKg: Number(row.weight_kg) || 1.0,
        isAvailable,
        shopId: row.shop_id,
        shopName: row.shop_name_bn || row.shop_name || '',
        shopDistrict: row.shop_district || '',
        shopAddress: row.shop_address || '',
        shopLatitude: Number(row.shop_latitude) || 0,
        shopLongitude: Number(row.shop_longitude) || 0,
        quantity,
        tokenId: row.token_id || null,
        tokenType,
        tokenDiscountPercent,
        tokenDiscountAmount: itemSubtotalDiscount,
        finalPricePerUnit,
        subtotalPayable,
        isDonated,
        donatedAmount: itemSubtotalDonation,
        normalDiscountPercent,
        createdAt: new Date(row.created_at).toISOString()
      };
    });

    const deliveryCharge = items.length > 0 ? await this.getDeliveryCharge() : 0;
    const totalCodAmount = productPayableTotal + deliveryCharge;

    return {
      items,
      totalQuantity,
      productOriginalTotal,
      tokenDiscountTotal,
      tokenDonationTotal,
      productPayableTotal,
      deliveryCharge,
      totalCodAmount
    };
  }

  async addToCart(userId: string, productId: string, quantity = 1, tokenId?: string) {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error('পণ্যটি খুঁজে পাওয়া যায়নি।');
    }
    if (!product.isAvailable) {
      throw new Error('পণ্যটি বর্তমানে অনুপলব্ধ (Unavailable)।');
    }

    const cartId = await this.getOrCreateCart(userId);

    // If tokenId provided, validate token
    if (tokenId) {
      const tokenRes = await query(`
        SELECT * FROM tokens WHERE id = $1 AND user_id = $2
      `, [tokenId, userId]);

      if (tokenRes.rows.length === 0 || tokenRes.rows[0].status !== 'AVAILABLE') {
        throw new Error('নির্বাচিত টোকেনটি অনুপলব্ধ বা ইতোমধ্যে ব্যবহৃত হয়েছে।');
      }

      // Check if token is already reserved in another cart item
      const reservedRes = await query(`
        SELECT * FROM cart_items WHERE token_id = $1 AND cart_id = $2
      `, [tokenId, cartId]);

      if (reservedRes.rows.length > 0) {
        const reservedItem = reservedRes.rows[0];
        if (reservedItem.product_id !== productId) {
          throw new Error('এই টোকেনটি ইতোমধ্যে কার্টের অন্য একটি পণ্যে যুক্ত রয়েছে।');
        }
      }
    }

    // Check if same product is already in cart
    const existingRes = await query(`
      SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2
    `, [cartId, productId]);

    if (existingRes.rows.length > 0) {
      const existingItem = existingRes.rows[0];
      const newQty = existingItem.quantity + quantity;
      const res = await query(`
        UPDATE cart_items
        SET quantity = $1, token_id = COALESCE($2, token_id)
        WHERE id = $3
        RETURNING *
      `, [newQty, tokenId || null, existingItem.id]);
      return res.rows[0];
    } else {
      const itemId = 'CITEM-' + crypto.randomUUID();
      const initialWeight = Number(product.weightKg) || 1.0;
      const res = await query(`
        INSERT INTO cart_items (id, cart_id, product_id, shop_id, quantity, token_id, weight_kg, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [itemId, cartId, productId, product.shopId, quantity, tokenId || null, initialWeight]);
      return res.rows[0];
    }
  }

  async updateCartItemQuantity(userId: string, itemId: string, quantity: number) {
    const cartId = await this.getOrCreateCart(userId);
    if (quantity <= 0) {
      return this.removeCartItem(userId, itemId);
    }

    const res = await query(`
      UPDATE cart_items
      SET quantity = $1
      WHERE id = $2 AND cart_id = $3
      RETURNING *
    `, [quantity, itemId, cartId]);

    return res.rows[0] || null;
  }

  async updateCartItemWeight(userId: string, itemId: string, weightKg: number) {
    const cartId = await this.getOrCreateCart(userId);
    const validWeight = Math.max(0.1, Number(weightKg) || 1.0);

    const res = await query(`
      UPDATE cart_items
      SET weight_kg = $1
      WHERE id = $2 AND cart_id = $3
      RETURNING *
    `, [validWeight, itemId, cartId]);

    return res.rows[0] || null;
  }

  async removeCartItem(userId: string, itemId: string) {
    const cartId = await this.getOrCreateCart(userId);
    const res = await query(`
      DELETE FROM cart_items
      WHERE (id = $1 OR product_id = $1) AND cart_id = $2
      RETURNING *
    `, [itemId, cartId]);

    return res.rowCount !== null && res.rowCount > 0;
  }

  async clearCart(userId: string) {
    const cartId = await this.getOrCreateCart(userId);
    await query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
  }

  // ============================================================
  // MARKETPLACE: CHECKOUT & ORDERS
  // ============================================================

  // Helper function to calculate straight line distance in km
  calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const p = 0.017453292519943295;    // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  }

  async getNearbyActiveRiders(lat: number, lng: number, radiusKm: number = 20.0): Promise<any[]> {
    if (!lat || !lng) return [];
    try {
      const res = await query(`
        SELECT 
          id, full_name, phone, vehicle_type, photo_url, status, approval_status,
          current_latitude, current_longitude, last_location_updated_at,
          total_deliveries, total_delivered
        FROM riders
        WHERE approval_status = 'APPROVED'
          AND status IN ('ONLINE', 'AVAILABLE', 'ON_DUTY')
          AND current_latitude IS NOT NULL
          AND current_longitude IS NOT NULL
      `);

      const activeNearby: any[] = [];
      for (const row of res.rows) {
        const rLat = Number(row.current_latitude);
        const rLng = Number(row.current_longitude);
        if (isNaN(rLat) || isNaN(rLng)) continue;

        const dist = this.calcDistance(lat, lng, rLat, rLng);
        if (dist <= radiusKm) {
          activeNearby.push({
            id: row.id,
            fullName: row.full_name,
            phone: row.phone,
            vehicleType: row.vehicle_type || 'BICYCLE',
            photoUrl: row.photo_url,
            status: row.status,
            currentLatitude: rLat,
            currentLongitude: rLng,
            distanceKm: Number(dist.toFixed(2)),
            lastLocationUpdatedAt: row.last_location_updated_at ? new Date(row.last_location_updated_at).toISOString() : null
          });
        }
      }

      return activeNearby.sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (err) {
      console.error('[db.getNearbyActiveRiders] Error:', err);
      return [];
    }
  }

  async getLocalDeliveryRates(): Promise<{ rate0to1: number; rate1to5: number; rate6to10: number }> {
    try {
      const res = await query(`SELECT bracket_key, rate_per_km FROM local_delivery_rates`);
      let rate0to1 = 20;
      let rate1to5 = 15;
      let rate6to10 = 25;
      for (const row of res.rows) {
        if (row.bracket_key === '0_1') rate0to1 = Number(row.rate_per_km) || 20;
        if (row.bracket_key === '1_5') rate1to5 = Number(row.rate_per_km) || 15;
        if (row.bracket_key === '6_10') rate6to10 = Number(row.rate_per_km) || 25;
      }
      return { rate0to1, rate1to5, rate6to10 };
    } catch (err) {
      console.error('[DB getLocalDeliveryRates] error:', err);
      return { rate0to1: 20, rate1to5: 15, rate6to10: 25 };
    }
  }

  async setLocalDeliveryRates(rates: { rate0to1?: number; rate1to5?: number; rate6to10?: number }, updatedBy: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      if (rates.rate0to1 !== undefined) {
        const val = Math.max(0, Number(rates.rate0to1));
        await client.query(`
          INSERT INTO local_delivery_rates (bracket_key, min_weight_kg, max_weight_kg, rate_per_km, updated_at, updated_by)
          VALUES ('0_1', 0.0, 1.0, $1, NOW(), $2)
          ON CONFLICT (bracket_key) DO UPDATE SET
            rate_per_km = EXCLUDED.rate_per_km,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
        `, [val, updatedBy || 'admin']);
      }
      if (rates.rate1to5 !== undefined) {
        const val = Math.max(0, Number(rates.rate1to5));
        await client.query(`
          INSERT INTO local_delivery_rates (bracket_key, min_weight_kg, max_weight_kg, rate_per_km, updated_at, updated_by)
          VALUES ('1_5', 1.0, 5.0, $1, NOW(), $2)
          ON CONFLICT (bracket_key) DO UPDATE SET
            rate_per_km = EXCLUDED.rate_per_km,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
        `, [val, updatedBy || 'admin']);
      }
      if (rates.rate6to10 !== undefined) {
        const val = Math.max(0, Number(rates.rate6to10));
        await client.query(`
          INSERT INTO local_delivery_rates (bracket_key, min_weight_kg, max_weight_kg, rate_per_km, updated_at, updated_by)
          VALUES ('6_10', 6.0, 10.0, $1, NOW(), $2)
          ON CONFLICT (bracket_key) DO UPDATE SET
            rate_per_km = EXCLUDED.rate_per_km,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
        `, [val, updatedBy || 'admin']);
      }
      await client.query('COMMIT');
      return this.getLocalDeliveryRates();
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB setLocalDeliveryRates] error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async calculateLocalDeliveryFee(userId: string, lat: number, lng: number) {
    const cartRes = await query(`SELECT id FROM carts WHERE user_id = $1`, [userId]);
    if (cartRes.rows.length === 0) throw new Error('Cart is empty.');
    const cartId = cartRes.rows[0].id;

    const itemsRes = await query(`
      SELECT 
        ci.shop_id,
        ci.quantity,
        COALESCE(p.weight_kg, ci.weight_kg, 1.0) as weight_kg,
        s.latitude,
        s.longitude,
        s.name as shop_name,
        s.name_bn as shop_name_bn
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN shops s ON ci.shop_id = s.id
      WHERE ci.cart_id = $1
    `, [cartId]);

    if (itemsRes.rows.length === 0) throw new Error('Cart has no valid items.');

    const adminRates = await this.getLocalDeliveryRates();

    const shopMap = new Map<string, {
      shopId: string;
      shopName: string;
      latitude: number;
      longitude: number;
      totalWeightKg: number;
    }>();

    let cumulativeTotalWeightKg = 0;

    for (const row of itemsRes.rows) {
      const shopId = row.shop_id;
      const qty = Math.max(1, Number(row.quantity) || 1);
      const itemWeight = Math.max(0.1, Number(row.weight_kg) || 1.0);
      cumulativeTotalWeightKg += itemWeight * qty;

      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, {
          shopId,
          shopName: row.shop_name_bn || row.shop_name || 'Shop',
          latitude: Number(row.latitude) || 0,
          longitude: Number(row.longitude) || 0,
          totalWeightKg: 0
        });
      }
      const shopObj = shopMap.get(shopId)!;
      shopObj.totalWeightKg += itemWeight * qty;
    }

    if (cumulativeTotalWeightKg > 10.0) {
      throw new Error('১০ কেজির বেশি ওজনের অর্ডারে লোকাল ডেলিভারি প্রযোজ্য নয়। অনুগ্রহ করে কুরিয়ার ডেলিভারি বেছে নিন।');
    }

    // Rate tier determined by total cumulative cart weight
    let applicableRate = adminRates.rate1to5;
    if (cumulativeTotalWeightKg <= 1.0) {
      applicableRate = adminRates.rate0to1;
    } else if (cumulativeTotalWeightKg > 5.0) {
      applicableRate = adminRates.rate6to10;
    }

    const shopDistances: Array<{
      shopId: string;
      shopName: string;
      distanceKm: number;
      radiusKm: number;
      totalWeightKg: number;
      isTooFar: boolean;
    }> = [];

    const tooFarShops: Array<{ shopName: string; distanceKm: number }> = [];

    for (const shop of shopMap.values()) {
      let distanceKm = 1.0;
      let radiusKm = 1.0;
      if (shop.latitude && shop.longitude && lat && lng) {
        const straight = this.calcDistance(lat, lng, shop.latitude, shop.longitude);
        radiusKm = Number(straight.toFixed(2));
        distanceKm = Number((straight * 1.4).toFixed(2));
      }

      const isTooFar = radiusKm > 20.0;
      if (isTooFar) {
        tooFarShops.push({
          shopName: shop.shopName,
          distanceKm: radiusKm
        });
      }

      shopDistances.push({
        shopId: shop.shopId,
        shopName: shop.shopName,
        distanceKm,
        radiusKm,
        totalWeightKg: shop.totalWeightKg,
        isTooFar
      });
    }

    if (tooFarShops.length > 0) {
      const farList = tooFarShops.map(s => `${s.shopName} (${s.distanceKm.toFixed(1)} কিমি)`).join(', ');
      throw new Error(`লোকাল রাইডার সিস্টেম শুধুমাত্র আপনার ২০ কিমি আশেপাশের শপের জন্য প্রযোজ্য। কার্টের শপ ${farList} আপনার লোকেশন থেকে ২০ কিমি সীমার বাইরে।`);
    }

    // Identify the farthest shop from the user's delivery location:
    // "User একাধিক দোকান থেকে অর্ডার দিলে সবচেয়ে দূরবর্তী দোকানের অবস্থান থেকে ডেলিভারির স্থান এর মধ্যবর্তী দূরত্ব কাউন্ট হবে"
    let farthestShop = shopDistances[0];
    for (const s of shopDistances) {
      if (s.distanceKm > farthestShop.distanceKm) {
        farthestShop = s;
      }
    }

    const maxDistanceKm = farthestShop ? farthestShop.distanceKm : 1.0;

    // Delivery fee is counted from the farthest shop location to user delivery location
    let totalFee = 0;
    if (maxDistanceKm <= 1.0) {
      totalFee = Math.round(adminRates.rate0to1);
    } else {
      totalFee = Math.round(maxDistanceKm * applicableRate);
    }

    const shopBreakdowns = shopDistances.map(s => ({
      shopId: s.shopId,
      shopName: s.shopName,
      distanceKm: s.distanceKm,
      radiusKm: s.radiusKm,
      weightKg: Number(s.totalWeightKg.toFixed(2)),
      ratePerKm: applicableRate,
      charge: totalFee,
      isFarthest: s.shopId === farthestShop.shopId,
      isTooFar: s.isTooFar
    }));

    // Check active riders within 20km of the target location
    const nearbyRiders = await this.getNearbyActiveRiders(lat, lng, 20.0);
    const nearbyRiderAvailable = nearbyRiders.length > 0;
    const activeRidersCount = nearbyRiders.length;
    const message = nearbyRiderAvailable ? undefined : 'দুঃখিত আমাদের সকল rider ব্যস্ত আছে';

    return {
      fee: totalFee,
      distanceKm: Number(maxDistanceKm.toFixed(1)),
      totalWeightKg: Number(cumulativeTotalWeightKg.toFixed(2)),
      farthestShopName: farthestShop?.shopName || '',
      farthestShopDistanceKm: Number(maxDistanceKm.toFixed(1)),
      ratePerKm: applicableRate,
      shopBreakdowns,
      nearbyRiderAvailable,
      activeRidersCount,
      nearbyRiders,
      message
    };
  }

  async checkoutCart(userId: string, data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    district?: string;
    upazila?: string;
    deliveryNotes?: string;
    couponCode?: string;
    orderType?: 'NATIONWIDE' | 'LOCAL';
    latitude?: number;
    longitude?: number;
  }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const cartRes = await client.query(`SELECT id FROM carts WHERE user_id = $1`, [userId]);
      if (cartRes.rows.length === 0) {
        throw new Error('কার্ট খালি। অনুগ্রহ করে পণ্য যোগ করুন।');
      }
      const cartId = cartRes.rows[0].id;

      const itemsRes = await client.query(`
        SELECT 
          ci.id as cart_item_id,
          ci.product_id,
          ci.shop_id,
          ci.quantity,
          ci.token_id,
          COALESCE(p.weight_kg, ci.weight_kg, 1.0) as weight_kg,
          p.name as product_name,
          p.original_price,
          p.image_url as product_image,
          p.is_available,
          s.name as shop_name,
          s.name_bn as shop_name_bn,
          s.district as shop_district,
          s.latitude as shop_latitude,
          s.longitude as shop_longitude,
          s.gold_discount,
          s.silver_discount,
          s.bronze_discount,
          s.commission_rate,
          t.token_type,
          t.status as token_status,
          t.is_donated as token_is_donated,
          t.earned_mosque_id,
          t.earned_mosque_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        JOIN shops s ON ci.shop_id = s.id
        LEFT JOIN tokens t ON ci.token_id = t.id
        WHERE ci.cart_id = $1
      `, [cartId]);

      if (itemsRes.rows.length === 0) {
        throw new Error('কার্টে কোনো পণ্য নেই।');
      }

      // Check available items and lock applied tokens
      for (const item of itemsRes.rows) {
        if (!item.is_available) {
          throw new Error(`"${item.product_name}" পণ্যটি বর্তমানে অনুপলব্ধ। কার্ট থেকে এটি মুছে নতুন করে অর্ডার করুন।`);
        }
        if (item.token_id) {
          const tokCheck = await client.query(
            `SELECT * FROM tokens WHERE id = $1 AND user_id = $2 FOR UPDATE`,
            [item.token_id, userId]
          );
          if (tokCheck.rows.length === 0 || tokCheck.rows[0].status !== 'AVAILABLE') {
            throw new Error(`একটি নির্বাচিত ডিসকাউন্ট টোকেন ইতোমধ্যে ব্যবহার করা হয়েছে বা অনুপলব্ধ।`);
          }
        }
      }

      // Validate Delivery Method constraints based on shop locations:
      // 1. Courier (NATIONWIDE) works ONLY if all shops are in Dhaka district:
      // "কুরিয়ার সিস্টেম কাজ করবে যদি শপগুলো ঢাকা জেলার অন্তর্ভুক্ত হয়"
      if (data.orderType === 'NATIONWIDE') {
        const nonDhakaShops: string[] = [];
        for (const item of itemsRes.rows) {
          const distStr = (item.shop_district || '').toLowerCase().trim();
          const isDhaka = distStr.includes('dhaka') || distStr.includes('ঢাকা');
          if (!isDhaka) {
            const shopLabel = item.shop_name_bn || item.shop_name || 'শপ';
            const itemDist = item.shop_district || 'অন্য জেলা';
            if (!nonDhakaShops.some(s => s.includes(shopLabel))) {
              nonDhakaShops.push(`${shopLabel} (${itemDist})`);
            }
          }
        }
        if (nonDhakaShops.length > 0) {
          throw new Error(`কুরিয়ার সিস্টেম শুধুমাত্র ঢাকা জেলার শপগুলোর জন্য প্রযোজ্য। আপনার কার্টের শপ (${nonDhakaShops.join(', ')}) ঢাকা জেলার অন্তর্ভুক্ত নয়।`);
        }
      }

      // 2. Local Rider (LOCAL) works ONLY if shops are within 20km of the user:
      // "আর লোকাল রাইডার সিস্টেম কাজ করবে যদি শপ গুলো ইউজার এর 20 km আশেপাশে হয়"
      if (data.orderType === 'LOCAL') {
        if (!data.latitude || !data.longitude) {
          throw new Error('লোকাল রাইডার অর্ডারের জন্য ম্যাপ থেকে ডেলিভারি লোকেশন নির্বাচন করুন।');
        }
        const userLat = Number(data.latitude);
        const userLng = Number(data.longitude);
        const tooFarShops: string[] = [];
        for (const item of itemsRes.rows) {
          const sLat = Number(item.shop_latitude) || 0;
          const sLng = Number(item.shop_longitude) || 0;
          if (sLat && sLng) {
            const straight = this.calcDistance(userLat, userLng, sLat, sLng);
            if (straight > 20.0) {
              const shopLabel = item.shop_name_bn || item.shop_name || 'শপ';
              if (!tooFarShops.some(s => s.includes(shopLabel))) {
                tooFarShops.push(`${shopLabel} (${straight.toFixed(1)} কিমি)`);
              }
            }
          }
        }
        if (tooFarShops.length > 0) {
          throw new Error(`লোকাল রাইডার সিস্টেম শুধুমাত্র আপনার ২০ কিমি আশেপাশের শপের জন্য প্রযোজ্য। (${tooFarShops.join(', ')} ২০ কিমির বেশি দূরে)।`);
        }
      }

      // Calculate totals
      let productTotalOriginal = 0;
      let productTotalDiscount = 0;
      let productTotalPayable = 0;

      const checkoutShopTokens = new Set<string>();
      const processedItems = [];
      for (const row of itemsRes.rows) {
        const originalPrice = Number(row.original_price) || 0;
        const quantity = Math.max(1, Number(row.quantity) || 1);
        const shopCommissionRate = Number(row.commission_rate) || 3.0;

        let normalDiscountRate = 0;
        let tokenType = 'NONE';
        let tokenId = row.token_id || null;
        let isDonated = false;
        let earnedMosqueId = null;
        let earnedMosqueName = null;

        let isTokenAllowedForShop = false;
        if (tokenId && row.token_status === 'AVAILABLE') {
          if (!checkoutShopTokens.has(row.shop_id)) {
            checkoutShopTokens.add(row.shop_id);
            isTokenAllowedForShop = true;
          }
        }

        if (isTokenAllowedForShop) {
          tokenType = row.token_type;
          isDonated = row.token_is_donated === true || row.token_is_donated === 'true';

          if (isDonated && (row.user_gender || row.gender || '').toLowerCase() !== 'female') {
            earnedMosqueId = row.earned_mosque_id || null;
            earnedMosqueName = row.earned_mosque_name || null;

            if (!earnedMosqueName) {
              const mRes = await client.query(`
                SELECT mosque_id, mosque_name FROM prayer_attendances 
                WHERE user_id = $1 AND mosque_name IS NOT NULL AND mosque_name != '' 
                ORDER BY verified_at DESC LIMIT 1
              `, [userId]);
              if (mRes.rows.length > 0) {
                earnedMosqueId = mRes.rows[0].mosque_id;
                earnedMosqueName = mRes.rows[0].mosque_name;
              }
            }
          } else {
            earnedMosqueId = null;
            earnedMosqueName = null;
          }

          if (row.token_type === 'GOLD') normalDiscountRate = Number(row.gold_discount) || 0;
          else if (row.token_type === 'SILVER') normalDiscountRate = Number(row.silver_discount) || 0;
          else if (row.token_type === 'BRONZE') normalDiscountRate = Number(row.bronze_discount) || 0;
        } else {
          tokenId = null;
        }

        const tokenDiscountRate = isDonated ? 0 : normalDiscountRate;
        const totalOriginal = originalPrice * quantity;
        const unitDiscount = (originalPrice * tokenDiscountRate) / 100;
        const totalDiscount = unitDiscount * quantity;
        const customerPayable = totalOriginal - totalDiscount;

        const donatedAmount = isDonated ? ((originalPrice * normalDiscountRate) / 100) * quantity : 0;

        // Commission & Shop Receivable
        const commissionAmount = (totalOriginal * shopCommissionRate) / 100;
        const shopReceivable = totalOriginal - commissionAmount;
        const netIncome = customerPayable - shopReceivable; // equals (commissionAmount - totalDiscount)

        productTotalOriginal += totalOriginal;
        productTotalDiscount += totalDiscount;
        productTotalPayable += customerPayable;

        processedItems.push({
          productId: row.product_id,
          productName: row.product_name,
          productImageUrl: row.product_image || '',
          shopId: row.shop_id,
          shopName: row.shop_name_bn || row.shop_name || '',
          quantity,
          originalPrice,
          weightKg: Number(row.weight_kg) || 1.0,
          tokenId,
          tokenType,
          tokenDiscountRate,
          tokenDiscountAmount: totalDiscount,
          customerProductPayable: customerPayable,
          commissionRate: shopCommissionRate,
          commissionAmount,
          shopReceivable,
          netIncome,
          isDonated,
          donatedAmount,
          earnedMosqueId,
          earnedMosqueName
        });
      }

       // Fetch delivery charges and compute based on district
       const chargesRes = await client.query(`
         SELECT district_name as name, delivery_charge 
         FROM district_delivery_charges
       `);
       const districtCharges: Record<string, number> = {};
       for (const r of chargesRes.rows) {
         districtCharges[r.name] = Number(r.delivery_charge) || 100;
       }

       const district = data.district?.trim() || 'Dhaka';
       const upazila = data.upazila?.trim() || '';
       const fullAddress = data.deliveryAddress?.trim() || '';
       
       let deliveryCharge = 60;
       let computedDistanceKm: number | null = null;
       let pickupOtp: string | null = null;
       let deliveryOtp: string | null = null;
       let riderFee = 0;
       let initialRiderStatus: string | null = null;

       if (data.orderType === 'LOCAL' && data.latitude && data.longitude) {
         const feeData = await this.calculateLocalDeliveryFee(userId, data.latitude, data.longitude);
         deliveryCharge = feeData.fee;
         computedDistanceKm = feeData.distanceKm;
         pickupOtp = String(crypto.randomInt(100000, 1000000));
         deliveryOtp = String(crypto.randomInt(100000, 1000000));
         riderFee = deliveryCharge;
         initialRiderStatus = 'PENDING';
       } else {
         deliveryCharge = district.toLowerCase().includes('dhaka') ? 60 : 120; // Default
         if (districtCharges[district] !== undefined) {
           deliveryCharge = districtCharges[district];
         }
       }
       
       const deliveryChargeType = data.orderType === 'LOCAL' ? 'Local Delivery' : district;
        let couponDiscountAmount = 0;
        let couponCode = null;
        if (data.couponCode) {
            const coupon = await this.getCouponByCode(data.couponCode);
            if (!coupon) throw new Error('কুপনটি সঠিক নয়।');
            if (coupon.usedCount >= coupon.usageLimit) throw new Error('কুপনের ব্যবহারের সীমা শেষ হয়েছে।');
            
            let rawCouponDiscount = 0;
            if (coupon.discountType === 'percentage') {
                rawCouponDiscount = (productTotalPayable * coupon.discountValue) / 100;
            } else {
                rawCouponDiscount = coupon.discountValue;
            }
            // Cap coupon discount so it doesn't exceed the remaining payable amount
            couponDiscountAmount = Math.min(rawCouponDiscount, productTotalPayable);
            productTotalPayable -= couponDiscountAmount;
            if (productTotalPayable < 0) productTotalPayable = 0;
            couponCode = coupon.code;
            
            await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon.id]);
        }

       const totalCodAmount = productTotalPayable + deliveryCharge;

       // Generate Order Number
       const randomSuffix = crypto.randomInt(100000, 1000000);
       const orderNumber = `ORD-${randomSuffix}`;
       const orderId = 'ORD-' + crypto.randomUUID();

       // Insert Order
       const orderInsertRes = await client.query(`
         INSERT INTO orders (
           id, order_number, user_id, customer_name, customer_phone, delivery_address,
           district, upazila, full_address, delivery_charge_type, delivery_notes,
           payment_method, status, product_total_original, product_total_discount, product_total_payable,
           delivery_charge, total_cod_amount, coupon_code, coupon_discount_amount, created_at, updated_at,
           order_type, latitude, longitude,
           pickup_otp, delivery_otp, distance_km, rider_fee, rider_status
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'CASH_ON_DELIVERY', 'PENDING',
           $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(),
           $19, $20, $21,
           $22, $23, $24, $25, $26
         )
         RETURNING *
       `, [
         orderId,
         orderNumber,
         userId,
         data.customerName.trim(),
         data.customerPhone.trim(),
         fullAddress,
         district,
         upazila || null,
         fullAddress,
         deliveryChargeType,
         data.deliveryNotes?.trim() || null,
         productTotalOriginal,
         productTotalDiscount,
         productTotalPayable,
         deliveryCharge,
         totalCodAmount,
         couponCode,
         couponDiscountAmount,
         data.orderType || 'NATIONWIDE',
         data.latitude || null,
         data.longitude || null,
         pickupOtp,
         deliveryOtp,
         computedDistanceKm,
         riderFee,
         initialRiderStatus
       ]);

      // Generate unique pickup and delivery OTPs for each shop
      const shopOtps: Record<string, string> = {};
      const shopDeliveryOtps: Record<string, string> = {};
      for (const item of processedItems) {
        if (!shopOtps[item.shopId]) {
          shopOtps[item.shopId] = String(crypto.randomInt(100000, 1000000));
          shopDeliveryOtps[item.shopId] = String(crypto.randomInt(100000, 1000000));
        }
      }

      // Insert Order Items & Mark used tokens
      for (const item of processedItems) {
        const orderItemId = 'OITEM-' + crypto.randomUUID();
        await client.query(`
          INSERT INTO order_items (
            id, order_id, product_id, product_name, product_image_url, shop_id, shop_name,
            quantity, original_price, token_id, token_type, token_discount_rate,
            token_discount_amount, customer_product_payable, commission_rate, commission_amount,
            shop_receivable, net_income,
            is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
            weight_kg, shop_pickup_otp, shop_picked_up, shop_delivery_otp, shop_delivered
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          )
        `, [
          orderItemId,
          orderId,
          item.productId,
          item.productName,
          item.productImageUrl,
          item.shopId,
          item.shopName,
          item.quantity,
          item.originalPrice,
          item.tokenId,
          item.tokenType,
          item.tokenDiscountRate,
          item.tokenDiscountAmount,
          item.customerProductPayable,
          item.commissionRate,
          item.commissionAmount,
          item.shopReceivable,
          item.netIncome,
          item.isDonated,
          item.donatedAmount,
          item.earnedMosqueId,
          item.earnedMosqueName,
          item.weightKg,
          shopOtps[item.shopId],
          false,
          shopDeliveryOtps[item.shopId],
          false
        ]);

        if (item.tokenId) {
          const upd = await client.query(`
            UPDATE tokens
            SET status = 'USED', used_at = NOW(), redemption_ref = $1
            WHERE id = $2 AND user_id = $3 AND status = 'AVAILABLE'
          `, [orderNumber, item.tokenId, userId]);
          if (upd.rowCount === 0) {
            throw new Error(`টোকেন (${item.tokenId}) ইতোমধ্যে ব্যবহার করা হয়েছে।`);
          }
        }
      }

      // Clear Cart
      await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

      // If Local Order, broadcast request to approved riders
      if (data.orderType === 'LOCAL') {
        const ridersRes = await client.query(`SELECT id FROM riders WHERE approval_status = 'APPROVED' LIMIT 15`);
        for (const r of ridersRes.rows) {
          await client.query(`
            INSERT INTO rider_delivery_requests (id, order_id, rider_id, status, created_at)
            VALUES ($1, $2, $3, 'PENDING', NOW())
            ON CONFLICT (order_id, rider_id) DO NOTHING
          `, ['RDR-REQ-' + crypto.randomUUID(), orderId, r.id]);
        }
      }

      await client.query('COMMIT');

      const createdOrder = orderInsertRes.rows[0];
      const items = processedItems.map(item => ({
        ...item,
        finalPrice: item.quantity > 0 ? item.customerProductPayable / item.quantity : item.originalPrice,
        finalPricePerUnit: item.quantity > 0 ? item.customerProductPayable / item.quantity : item.originalPrice,
        subtotalPayable: item.customerProductPayable,
      }));

      return {
        id: createdOrder.id,
        orderNumber: createdOrder.order_number,
        userId: createdOrder.user_id,
        customerName: createdOrder.customer_name,
        customerPhone: createdOrder.customer_phone,
        deliveryAddress: createdOrder.delivery_address,
        deliveryNotes: createdOrder.delivery_notes || '',
        paymentMethod: createdOrder.payment_method,
        status: createdOrder.status,
        productTotalOriginal: Number(createdOrder.product_total_original),
        productTotalDiscount: Number(createdOrder.product_total_discount),
        productTotalPayable: Number(createdOrder.product_total_payable),
        deliveryCharge: Number(createdOrder.delivery_charge),
        totalCodAmount: Number(createdOrder.total_cod_amount),
        orderType: createdOrder.order_type || 'NATIONWIDE',
        latitude: createdOrder.latitude ? Number(createdOrder.latitude) : undefined,
        longitude: createdOrder.longitude ? Number(createdOrder.longitude) : undefined,
        riderId: createdOrder.rider_id || undefined,
        riderStatus: createdOrder.rider_status || undefined,
        pickupOtp: createdOrder.pickup_otp || undefined,
        deliveryOtp: createdOrder.delivery_otp || undefined,
        distanceKm: createdOrder.distance_km ? Number(createdOrder.distance_km) : undefined,
        riderFee: Number(createdOrder.rider_fee || 0),
        // Aliases for frontend compatibility
        totalPayable: Number(createdOrder.total_cod_amount),
        totalProductPayable: Number(createdOrder.product_total_payable),
        totalOriginalPrice: Number(createdOrder.product_total_original),
        totalTokenDiscount: Number(createdOrder.product_total_discount),
        createdAt: new Date(createdOrder.created_at).toISOString(),
        items
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getUserOrders(userId: string) {
    const ordersRes = await query(`
      SELECT * FROM orders
      WHERE user_id = $1 AND (user_history_deleted = FALSE OR user_history_deleted IS NULL)
      ORDER BY created_at DESC
    `, [userId]);

    const orders: any[] = [];
    for (const row of ordersRes.rows) {
      const itemsRes = await query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [row.id]);

      orders.push({
        id: row.id,
        orderNumber: row.order_number,
        userId: row.user_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryAddress: row.delivery_address,
        deliveryNotes: row.delivery_notes || '',
        paymentMethod: row.payment_method,
        status: row.status,
        productTotalOriginal: Number(row.product_total_original),
        productTotalDiscount: Number(row.product_total_discount),
        productTotalPayable: Number(row.product_total_payable),
        deliveryCharge: Number(row.delivery_charge),
        totalCodAmount: Number(row.total_cod_amount),
        orderType: row.order_type || "NATIONWIDE",
        latitude: row.latitude ? Number(row.latitude) : undefined,
        longitude: row.longitude ? Number(row.longitude) : undefined,
        riderId: row.rider_id || undefined,
        riderStatus: row.rider_status || undefined,
        deliveryWaived: Boolean(row.delivery_waived),
        waivedBy: row.waived_by || null,
        waivedAt: row.waived_at ? new Date(row.waived_at).toISOString() : null,
        originalDeliveryCharge: Number(row.original_delivery_charge || 0),
        pickupOtp: row.pickup_otp || null,
        deliveryOtp: row.delivery_otp || null,
        rejectionCode: row.rejection_code || null,
        riderAcceptedAt: row.rider_accepted_at ? new Date(row.rider_accepted_at).toISOString() : null,
        riderPickedUpAt: row.rider_picked_up_at ? new Date(row.rider_picked_up_at).toISOString() : null,
        riderDeliveredAt: row.rider_delivered_at ? new Date(row.rider_delivered_at).toISOString() : null,
        merchantSettledAt: row.merchant_settled_at ? new Date(row.merchant_settled_at).toISOString() : null,
        settlementStatus: row.settlement_status || 'PENDING',
        riderFee: Number(row.rider_fee || 0),
        distanceKm: row.distance_km ? Number(row.distance_km) : undefined,
        couponCode: row.coupon_code || null,
        couponDiscountAmount: Number(row.coupon_discount_amount || 0),
        // Aliases for frontend compatibility
        totalPayable: Number(row.total_cod_amount),
        totalProductPayable: Number(row.product_total_payable),
        totalOriginalPrice: Number(row.product_total_original),
        totalTokenDiscount: Number(row.product_total_discount),
        createdAt: new Date(row.created_at).toISOString(),
        deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
        items: itemsRes.rows.map(itemRow => {
          const qty = Number(itemRow.quantity) || 1;
          const payable = Number(itemRow.customer_product_payable) || 0;
          const orig = Number(itemRow.original_price) || 0;
          const unitPrice = qty > 0 ? payable / qty : orig;
          return {
            id: itemRow.id,
            orderId: itemRow.order_id,
            productId: itemRow.product_id,
            productName: itemRow.product_name,
            productImageUrl: itemRow.product_image_url || '',
            shopId: itemRow.shop_id,
            shopName: itemRow.shop_name,
            quantity: qty,
            originalPrice: orig,
            tokenId: itemRow.token_id,
            tokenType: itemRow.token_type,
            tokenDiscountRate: Number(itemRow.token_discount_rate),
            tokenDiscountAmount: Number(itemRow.token_discount_amount),
            customerProductPayable: payable,
            commissionRate: Number(itemRow.commission_rate),
            commissionAmount: Number(itemRow.commission_amount),
            shopReceivable: Number(itemRow.shop_receivable),
            netIncome: Number(itemRow.net_income),
            // Aliases
            finalPrice: unitPrice,
            finalPricePerUnit: unitPrice,
            subtotalPayable: payable,
          };
        })
      });
    }

    return orders;
  }

  async softDeleteUserOrderHistory(userId: string, orderId: string): Promise<boolean> {
    const res = await query(`
      UPDATE orders
      SET user_history_deleted = TRUE, updated_at = NOW()
      WHERE (id = $1 OR order_number = $1) AND user_id = $2
      RETURNING id
    `, [orderId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async getOrderById(orderId: string) {
    const res = await query(`
      SELECT * FROM orders WHERE id = $1 OR order_number = $1
    `, [orderId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const itemsRes = await query(`
      SELECT oi.*, 
             s.name_bn as shop_name_bn, s.phone as shop_phone, s.address as shop_address, 
             s.area as shop_area, s.district as shop_district, 
             s.latitude as shop_latitude, s.longitude as shop_longitude,
             COALESCE(p.weight_kg, 1.0) as weight_kg
      FROM order_items oi
      LEFT JOIN shops s ON oi.shop_id = s.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [row.id]);

    const items = itemsRes.rows.map(itemRow => {
      const qty = Number(itemRow.quantity) || 1;
      const payable = Number(itemRow.customer_product_payable) || 0;
      const orig = Number(itemRow.original_price) || 0;
      const unitPrice = qty > 0 ? payable / qty : orig;
      return {
        id: itemRow.id,
        orderId: itemRow.order_id,
        productId: itemRow.product_id,
        productName: itemRow.product_name,
        productImageUrl: itemRow.product_image_url || '',
        shopId: itemRow.shop_id,
        shopName: itemRow.shop_name,
        shopNameBn: itemRow.shop_name_bn || itemRow.shop_name,
        shopPhone: itemRow.shop_phone || '',
        shopAddress: itemRow.shop_address || '',
        shopArea: itemRow.shop_area || '',
        shopDistrict: itemRow.shop_district || '',
        shopLatitude: itemRow.shop_latitude ? Number(itemRow.shop_latitude) : 0,
        shopLongitude: itemRow.shop_longitude ? Number(itemRow.shop_longitude) : 0,
        weightKg: itemRow.weight_kg ? Number(itemRow.weight_kg) : 1.0,
        quantity: qty,
        originalPrice: orig,
        tokenId: itemRow.token_id,
        tokenType: itemRow.token_type,
        tokenDiscountRate: Number(itemRow.token_discount_rate),
        tokenDiscountAmount: Number(itemRow.token_discount_amount),
        customerProductPayable: payable,
        commissionRate: Number(itemRow.commission_rate),
        commissionAmount: Number(itemRow.commission_amount),
        shopReceivable: Number(itemRow.shop_receivable),
        netIncome: Number(itemRow.net_income),
        // Aliases
        finalPrice: unitPrice,
        finalPricePerUnit: unitPrice,
        subtotalPayable: payable,
      };
    });

    const ord: any = {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      deliveryAddress: row.delivery_address,
      deliveryNotes: row.delivery_notes || '',
      paymentMethod: row.payment_method,
      status: row.status,
      productTotalOriginal: Number(row.product_total_original),
      productTotalDiscount: Number(row.product_total_discount),
      productTotalPayable: Number(row.product_total_payable),
      deliveryCharge: Number(row.delivery_charge),
      totalCodAmount: Number(row.total_cod_amount),
      orderType: row.order_type || "NATIONWIDE",
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      riderId: row.rider_id || undefined,
      riderStatus: row.rider_status || undefined,
      deliveryWaived: Boolean(row.delivery_waived),
      waivedBy: row.waived_by || null,
      waivedAt: row.waived_at ? new Date(row.waived_at).toISOString() : null,
      originalDeliveryCharge: Number(row.original_delivery_charge || 0),
      pickupOtp: row.pickup_otp || null,
      deliveryOtp: row.delivery_otp || null,
      riderAcceptedAt: row.rider_accepted_at ? new Date(row.rider_accepted_at).toISOString() : null,
      riderPickedUpAt: row.rider_picked_up_at ? new Date(row.rider_picked_up_at).toISOString() : null,
      riderDeliveredAt: row.rider_delivered_at ? new Date(row.rider_delivered_at).toISOString() : null,
      merchantSettledAt: row.merchant_settled_at ? new Date(row.merchant_settled_at).toISOString() : null,
      settlementStatus: row.settlement_status || 'PENDING',
      riderFee: Number(row.rider_fee || 0),
      distanceKm: row.distance_km ? Number(row.distance_km) : undefined,
      couponCode: row.coupon_code || null,
      couponDiscountAmount: Number(row.coupon_discount_amount || 0),
      // Aliases
      totalPayable: Number(row.total_cod_amount),
      totalProductPayable: Number(row.product_total_payable),
      totalOriginalPrice: Number(row.product_total_original),
      totalTokenDiscount: Number(row.product_total_discount),
      adminNotes: row.admin_notes || '',
      createdAt: new Date(row.created_at).toISOString(),
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
      items
    };

    if (items.length > 0) {
      ord.shopName = items[0].shopName;
      ord.shopPhone = items[0].shopPhone;
      ord.shopAddress = items[0].shopAddress;
      ord.shopArea = items[0].shopArea;
      ord.shopDistrict = items[0].shopDistrict;
      ord.shopLatitude = items[0].shopLatitude;
      ord.shopLongitude = items[0].shopLongitude;
    }

    if (row.rider_id) {
      const r = await this.getRiderById(row.rider_id);
      if (r) {
        ord.rider = {
          id: r.id,
          fullName: r.fullName,
          phone: r.phone,
          vehicleType: r.vehicleType,
          photoUrl: r.photoUrl,
          status: r.status,
          currentLatitude: r.currentLatitude,
          currentLongitude: r.currentLongitude,
          lastLocationUpdatedAt: r.lastLocationUpdatedAt,
          rating: (r as any).rating || 4.9
        };
        ord.riderInfo = ord.rider;
      }
      ord.nearbyRiders = [];
    } else if (row.order_type === 'LOCAL' && row.latitude && row.longitude) {
      const nearbyRiders = await this.getNearbyActiveRiders(Number(row.latitude), Number(row.longitude), 20.0);
      ord.nearbyRiders = nearbyRiders;
      ord.activeRidersCount = nearbyRiders.length;
      ord.nearbyRiderAvailable = nearbyRiders.length > 0;
      if (!row.rider_id && nearbyRiders.length === 0) {
        ord.busyMessage = 'দুঃখিত আমাদের সকল rider ব্যস্ত আছে';
      }
    }

    return ord;
  }

  async getAllOrders(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(order_number) LIKE $${params.length} OR LOWER(customer_name) LIKE $${params.length} OR LOWER(customer_phone) LIKE $${params.length} OR LOWER(delivery_address) LIKE $${params.length} OR id IN (SELECT order_id FROM order_items WHERE LOWER(shop_name) LIKE $${params.length} OR LOWER(product_name) LIKE $${params.length}))`;
    }

    if (filters?.dateFrom) {
      let df = filters.dateFrom;
      if (df.length === 10 && !df.includes('T') && !df.includes(' ')) {
        df += ' 00:00:00';
      }
      params.push(df);
      sql += ` AND created_at >= $${params.length}`;
    }

    if (filters?.dateTo) {
      let dt = filters.dateTo;
      if (dt.length === 10 && !dt.includes('T') && !dt.includes(' ')) {
        dt += ' 23:59:59.999';
      }
      params.push(dt);
      sql += ` AND created_at <= $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await query(sql, params);
    const orders: any[] = [];

    for (const row of res.rows) {
      const itemsRes = await query(`SELECT * FROM order_items WHERE order_id = $1`, [row.id]);
      orders.push({
        id: row.id,
        orderNumber: row.order_number,
        userId: row.user_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryAddress: row.delivery_address,
        deliveryNotes: row.delivery_notes || '',
        paymentMethod: row.payment_method,
        status: row.status,
        productTotalOriginal: Number(row.product_total_original),
        productTotalDiscount: Number(row.product_total_discount),
        productTotalPayable: Number(row.product_total_payable),
        deliveryCharge: Number(row.delivery_charge),
        totalCodAmount: Number(row.total_cod_amount),
        orderType: row.order_type || "NATIONWIDE",
        latitude: row.latitude ? Number(row.latitude) : undefined,
        longitude: row.longitude ? Number(row.longitude) : undefined,
        riderId: row.rider_id || undefined,
        riderStatus: row.rider_status || undefined,
        deliveryWaived: Boolean(row.delivery_waived),
        waivedBy: row.waived_by || null,
        waivedAt: row.waived_at ? new Date(row.waived_at).toISOString() : null,
        originalDeliveryCharge: Number(row.original_delivery_charge || 0),
        pickupOtp: row.pickup_otp || null,
        deliveryOtp: row.delivery_otp || null,
        riderAcceptedAt: row.rider_accepted_at ? new Date(row.rider_accepted_at).toISOString() : null,
        riderPickedUpAt: row.rider_picked_up_at ? new Date(row.rider_picked_up_at).toISOString() : null,
        riderDeliveredAt: row.rider_delivered_at ? new Date(row.rider_delivered_at).toISOString() : null,
        merchantSettledAt: row.merchant_settled_at ? new Date(row.merchant_settled_at).toISOString() : null,
        settlementStatus: row.settlement_status || 'PENDING',
        riderFee: Number(row.rider_fee || 0),
        distanceKm: row.distance_km ? Number(row.distance_km) : undefined,
        couponCode: row.coupon_code || null,
        couponDiscountAmount: Number(row.coupon_discount_amount || 0),
        // Aliases
        totalPayable: Number(row.total_cod_amount),
        totalProductPayable: Number(row.product_total_payable),
        totalOriginalPrice: Number(row.product_total_original),
        totalTokenDiscount: Number(row.product_total_discount),
        adminNotes: row.admin_notes || '',
        createdAt: new Date(row.created_at).toISOString(),
        deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
        items: itemsRes.rows.map(itemRow => {
          const qty = Number(itemRow.quantity) || 1;
          const payable = Number(itemRow.customer_product_payable) || 0;
          const orig = Number(itemRow.original_price) || 0;
          const unitPrice = qty > 0 ? payable / qty : orig;
          return {
            id: itemRow.id,
            orderId: itemRow.order_id,
            productId: itemRow.product_id,
            productName: itemRow.product_name,
            productImageUrl: itemRow.product_image_url || '',
            shopId: itemRow.shop_id,
            shopName: itemRow.shop_name,
            quantity: qty,
            originalPrice: orig,
            tokenId: itemRow.token_id,
            tokenType: itemRow.token_type,
            tokenDiscountRate: Number(itemRow.token_discount_rate),
            tokenDiscountAmount: Number(itemRow.token_discount_amount),
            customerProductPayable: payable,
            commissionRate: Number(itemRow.commission_rate),
            commissionAmount: Number(itemRow.commission_amount),
            shopReceivable: Number(itemRow.shop_receivable),
            netIncome: Number(itemRow.net_income),
            // Aliases
            finalPrice: unitPrice,
            finalPricePerUnit: unitPrice,
            subtotalPayable: payable,
          };
        })
      });
    }

    return orders;
  }

  async updateOrderStatus(orderId: string, status: string, adminNotes?: string, adminName?: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 OR order_number = $1`, [orderId]);
      if (orderRes.rows.length === 0) {
        throw new Error('অর্ডারটি খুঁজে পাওয়া যায়নি।');
      }

      const order = orderRes.rows[0];
      const realOrderId = order.id;
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [realOrderId]);

      if (status === 'REJECTED' || status === 'CANCELLED') {
        // Release any used tokens back to AVAILABLE
        for (const item of itemsRes.rows) {
          if (item.token_id) {
            await client.query(`
              UPDATE tokens
              SET status = 'AVAILABLE', used_at = NULL, redemption_ref = NULL
              WHERE id = $1
            `, [item.token_id]);
          }
        }

        await client.query(`
          UPDATE orders
          SET status = $1, admin_notes = COALESCE($2, admin_notes), cancelled_at = NOW(), updated_at = NOW()
          WHERE id = $3
        `, [status, adminNotes || null, realOrderId]);
      } else if (status === 'DELIVERED') {
        await client.query(`
          UPDATE orders
          SET status = 'DELIVERED', delivered_at = NOW(), admin_notes = COALESCE($1, admin_notes), updated_at = NOW()
          WHERE id = $2
        `, [adminNotes || null, realOrderId]);

        const sumOfItemPayables = itemsRes.rows.reduce((sum, it) => sum + Number(it.customer_product_payable || 0), 0);

        for (const item of itemsRes.rows) {
          const isLocalOrder = (order.order_type || 'NATIONWIDE').toUpperCase() === 'LOCAL';

          if (!isLocalOrder) {
            const finId = 'OFIN-' + crypto.randomUUID();
            // Avoid duplicate insertion
            const existingFin = await client.query(`
              SELECT id FROM online_financial_records WHERE order_item_id = $1
            `, [item.id]);

            if (existingFin.rows.length === 0) {
              let itemCouponDiscount = 0;
              if (sumOfItemPayables > 0 && Number(order.coupon_discount_amount) > 0) {
                itemCouponDiscount = (Number(order.coupon_discount_amount) || 0) * (Number(item.customer_product_payable) / sumOfItemPayables);
                itemCouponDiscount = Math.round(itemCouponDiscount * 100) / 100;
              }

              const adjustedCustomerPayable = Math.max(0, Number(item.customer_product_payable) - itemCouponDiscount);

              await client.query(`
                INSERT INTO online_financial_records (
                  id, order_id, order_number, order_item_id, user_id, customer_name, customer_phone,
                  delivery_address, shop_id, shop_name, product_id, product_name, quantity,
                  original_price, token_type, token_discount_amount, customer_product_payable,
                  commission_rate, commission_amount, shop_receivable, net_income,
                  order_created_at, delivered_at, created_at,
                  is_donated, donated_amount, earned_mosque_id, earned_mosque_name,
                  coupon_code, coupon_discount_amount
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(),
                  $23, $24, $25, $26, $27, $28
                )
              `, [
                finId,
                order.id,
                order.order_number,
                item.id,
                order.user_id,
                order.customer_name,
                order.customer_phone,
                order.delivery_address,
                item.shop_id,
                item.shop_name,
                item.product_id,
                item.product_name,
                item.quantity,
                item.original_price,
                item.token_type || 'NONE',
                item.token_discount_amount,
                adjustedCustomerPayable,
                item.commission_rate,
                item.commission_amount,
                item.shop_receivable,
                item.net_income,
                order.created_at,
                item.is_donated === true || item.is_donated === 'true',
                Number(item.donated_amount || 0),
                item.earned_mosque_id || null,
                item.earned_mosque_name || null,
                order.coupon_code || null,
                itemCouponDiscount
              ]);
            }
          } else {
            // Ensure redemptions record is created for LOCAL market order
            const rdmId = 'RDM-ORD-' + item.id;
            const existingRdm = await client.query(`
              SELECT id FROM redemptions WHERE id = $1 OR token_id = $2
            `, [rdmId, item.id]);

            if (existingRdm.rows.length === 0) {
              const todayStr = getTodayDateString();
              await client.query(`
                INSERT INTO redemptions (
                  id, token_id, token_type, user_id, user_name, user_phone, shop_id, shop_name,
                  merchant_id, merchant_name, bill_amount, discount_percent, discount_amount,
                  final_amount, commission_rate, gross_commission_amount, cave_companions_net_income,
                  commission_amount, merchant_payout_amount, status, redeemed_at, date
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8,
                  $9, $10, $11, $12, $13,
                  $14, $15, $16, $17,
                  $18, $19, 'COMPLETED', NOW(), $20
                )
              `, [
                rdmId,
                item.token_id || item.id,
                item.token_type || 'LOCAL',
                order.user_id,
                order.customer_name,
                order.customer_phone,
                item.shop_id,
                item.shop_name,
                'MERCHANT',
                'Merchant',
                Number(item.original_price || 0) * Number(item.quantity || 1),
                Number(item.token_discount_rate || 0),
                Number(item.token_discount_amount || 0),
                Number(item.customer_product_payable || 0),
                Number(item.commission_rate || 0),
                Number(item.commission_amount || 0),
                Number(item.net_income || 0),
                Number(item.commission_amount || 0),
                Number(item.shop_receivable || 0),
                todayStr
              ]);
            }
          }
        }
      } else {
        // APPROVED or other status
        await client.query(`
          UPDATE orders
          SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
          WHERE id = $3
        `, [status, adminNotes || null, realOrderId]);
      }

      await client.query('COMMIT');
      return await this.getOrderById(realOrderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteOrder(orderId: string) {
    const res = await query(`
      DELETE FROM orders WHERE id = $1 OR order_number = $1 RETURNING id
    `, [orderId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  async clearMerchantCompletedOrders(shopId: string): Promise<number> {
    const res = await query(`
      DELETE FROM orders
      WHERE (settlement_status IN ('SETTLED', 'DONE', 'PRODUCT_BACK') OR status IN ('DONE', 'DELIVERED', 'CANCELLED', 'REJECTED'))
        AND EXISTS (
          SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.shop_id = $1
        )
      RETURNING id
    `, [shopId]);
    return res.rowCount || 0;
  }


  // ============================================================
  // MARKETPLACE: ONLINE হিসাব (ONLINE FINANCIAL RECORDS)
  // ============================================================

  async getOnlineFinancialRecords(filters?: {
    shopId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    let sql = `
      SELECT ofr.*, u.gender as user_gender
      FROM online_financial_records ofr
      LEFT JOIN users u ON ofr.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.shopId && filters.shopId !== 'ALL') {
      params.push(filters.shopId);
      sql += ` AND ofr.shop_id = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      const cleanSearch = filters.search.trim().replace(/[\s-+]/g, '').toLowerCase();
      const rawSearch = `%${filters.search.trim().toLowerCase()}%`;
      const cleanSearchWithPercent = `%${cleanSearch}%`;

      params.push(rawSearch);
      const rawParamIndex = params.length;

      params.push(cleanSearchWithPercent);
      const cleanParamIndex = params.length;

      sql += ` AND (
        LOWER(ofr.order_number) LIKE $${rawParamIndex} OR 
        REPLACE(REPLACE(REPLACE(LOWER(ofr.order_number), ' ', ''), '-', ''), '+88', '') LIKE $${cleanParamIndex} OR
        LOWER(ofr.customer_name) LIKE $${rawParamIndex} OR 
        LOWER(ofr.customer_phone) LIKE $${rawParamIndex} OR 
        REPLACE(REPLACE(REPLACE(LOWER(ofr.customer_phone), ' ', ''), '-', ''), '+88', '') LIKE $${cleanParamIndex} OR
        LOWER(ofr.product_name) LIKE $${rawParamIndex} OR 
        LOWER(ofr.shop_name) LIKE $${rawParamIndex}
      )`;
    }

    if (filters?.dateFrom) {
      params.push(filters.dateFrom);
      sql += ` AND ofr.delivered_at >= $${params.length}`;
    }

    if (filters?.dateTo) {
      params.push(filters.dateTo);
      sql += ` AND ofr.delivered_at <= $${params.length}`;
    }

    sql += ` ORDER BY ofr.delivered_at DESC`;

    const res = await query(sql, params);
    return res.rows.map(row => {
      const isDonated = row.is_donated === true || row.is_donated === 'true';
      const userGender = (row.user_gender || row.gender || '').toLowerCase();
      const isFemale = userGender === 'female';
      const earnedMosqueId = (isDonated && !isFemale) ? (row.earned_mosque_id || null) : null;
      const earnedMosqueName = (isDonated && !isFemale) ? (row.earned_mosque_name || null) : null;

      return {
        id: row.id,
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderItemId: row.order_item_id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryAddress: row.delivery_address,
        shopId: row.shop_id,
        shopName: row.shop_name,
        productId: row.product_id,
        productName: row.product_name,
        quantity: Number(row.quantity),
        originalPrice: Number(row.original_price),
        tokenType: row.token_type,
        tokenDiscountAmount: Number(row.token_discount_amount),
        customerProductPayable: Number(row.customer_product_payable),
        commissionRate: Number(row.commission_rate),
        commissionAmount: Number(row.commission_amount),
        shopReceivable: Number(row.shop_receivable),
        netIncome: Number(row.net_income),
        orderCreatedAt: new Date(row.order_created_at).toISOString(),
        deliveredAt: new Date(row.delivered_at).toISOString(),
        createdAt: new Date(row.created_at).toISOString(),
        isDonated: isDonated,
        donatedAmount: isDonated ? Number(row.donated_amount || 0) : 0,
        earnedMosqueId: earnedMosqueId,
        earnedMosqueName: earnedMosqueName,
        couponCode: row.coupon_code || null,
        couponDiscountAmount: Number(row.coupon_discount_amount || 0)
      };
    });
  }

  async getOnlineAccountsSummary(filters?: {
    shopId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    let sql = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(original_price * quantity), 0) as total_sales,
        COALESCE(SUM(token_discount_amount), 0) as total_token_discounts,
        COALESCE(SUM(coupon_discount_amount), 0) as total_coupon_discounts,
        COALESCE(SUM(customer_product_payable), 0) as total_customer_payable,
        COALESCE(SUM(shop_receivable), 0) as total_shop_receivable,
        COALESCE(SUM(commission_amount), 0) as total_commission_amount,
        COALESCE(SUM(net_income), 0) as total_net_income,
        COALESCE(SUM(CASE WHEN is_donated = TRUE THEN donated_amount ELSE 0 END), 0) as total_donated_amount
      FROM online_financial_records ofr
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.shopId && filters.shopId !== 'ALL') {
      params.push(filters.shopId);
      sql += ` AND ofr.shop_id = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      const cleanSearch = filters.search.trim().replace(/[\s-+]/g, '').toLowerCase();
      const rawSearch = `%${filters.search.trim().toLowerCase()}%`;
      const cleanSearchWithPercent = `%${cleanSearch}%`;

      params.push(rawSearch);
      const rawParamIndex = params.length;

      params.push(cleanSearchWithPercent);
      const cleanParamIndex = params.length;

      sql += ` AND (
        LOWER(ofr.order_number) LIKE $${rawParamIndex} OR 
        REPLACE(REPLACE(REPLACE(LOWER(ofr.order_number), ' ', ''), '-', ''), '+88', '') LIKE $${cleanParamIndex} OR
        LOWER(ofr.customer_name) LIKE $${rawParamIndex} OR 
        LOWER(ofr.customer_phone) LIKE $${rawParamIndex} OR 
        REPLACE(REPLACE(REPLACE(LOWER(ofr.customer_phone), ' ', ''), '-', ''), '+88', '') LIKE $${cleanParamIndex} OR
        LOWER(ofr.product_name) LIKE $${rawParamIndex} OR 
        LOWER(ofr.shop_name) LIKE $${rawParamIndex}
      )`;
    }

    if (filters?.dateFrom) {
      params.push(filters.dateFrom);
      sql += ` AND ofr.delivered_at >= $${params.length}`;
    }

    if (filters?.dateTo) {
      params.push(filters.dateTo);
      sql += ` AND ofr.delivered_at <= $${params.length}`;
    }

    const res = await query(sql, params);
    const row = res.rows[0];

    return {
      totalItemCount: Number(row.total_count) || 0,
      totalSales: Number(row.total_sales) || 0,
      totalTokenDiscounts: Number(row.total_token_discounts) || 0,
      totalCouponDiscounts: Number(row.total_coupon_discounts) || 0,
      totalCustomerPayable: Number(row.total_customer_payable) || 0,
      totalShopReceivable: Number(row.total_shop_receivable) || 0,
      totalCommissionAmount: Number(row.total_commission_amount) || 0,
      totalNetIncome: Number(row.total_net_income) || 0,
      totalDonatedAmount: Number(row.total_donated_amount) || 0
    };
  }

  async deleteOnlineFinancialRecord(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM online_financial_records WHERE id = $1 RETURNING id`, [id]);
    return (res.rowCount || 0) > 0;
  }

  // ============================================================
  // DURABLE PERSISTENT MEDIA STORAGE (PostgreSQL BYTEA + Disk Cache)
  // ============================================================

  async saveUploadedMedia(data: {
    id?: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    createdBy?: string;
  }): Promise<{ id: string; filename: string; mimeType: string; size: number; url: string }> {
    const id = data.id || `media_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const size = data.buffer.length;

    await query(`
      INSERT INTO uploaded_media (id, filename, mime_type, file_size, data, created_at, created_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (id) DO UPDATE SET
        filename = EXCLUDED.filename,
        mime_type = EXCLUDED.mime_type,
        file_size = EXCLUDED.file_size,
        data = EXCLUDED.data
    `, [id, data.filename, data.mimeType, size, data.buffer, data.createdBy || null]);

    return {
      id,
      filename: data.filename,
      mimeType: data.mimeType,
      size,
      url: `/api/media/images/${id}`
    };
  }

  async getUploadedMedia(idOrFilename: string): Promise<{
    id: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    data: Buffer;
    createdAt: Date;
  } | null> {
    const cleanId = idOrFilename.replace(/\.[^/.]+$/, '');

    const res = await query(`
      SELECT * FROM uploaded_media 
      WHERE id = $1 OR filename = $2 OR id = $3
      LIMIT 1
    `, [idOrFilename, idOrFilename, cleanId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      fileSize: Number(row.file_size),
      data: row.data,
      createdAt: row.created_at
    };
  }

  async createCoupon(data: { code: string; discountType: 'amount' | 'percentage'; discountValue: number; usageLimit: number }): Promise<CouponRecord> {
    const id = generateSecureId('CPN');
    const res = await query(`
      INSERT INTO coupons (id, code, discount_type, discount_value, usage_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, data.code.toUpperCase(), data.discountType, data.discountValue, data.usageLimit]);
    const row = res.rows[0];
    return {
      id: row.id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      usageLimit: Number(row.usage_limit),
      usedCount: Number(row.used_count),
      isActive: row.is_active,
      createdAt: row.created_at.toISOString()
    };
  }

  async getAllCoupons(): Promise<CouponRecord[]> {
    const res = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.rows.map(row => ({
      id: row.id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      usageLimit: Number(row.usage_limit),
      usedCount: Number(row.used_count),
      isActive: row.is_active,
      createdAt: row.created_at.toISOString()
    }));
  }
  
  async deleteCoupon(id: string): Promise<boolean> {
    const res = await query('DELETE FROM coupons WHERE id = $1 RETURNING id', [id]);
    return (res.rowCount || 0) > 0;
  }

  async updateCouponActiveStatus(id: string, isActive: boolean): Promise<boolean> {
    const res = await query('UPDATE coupons SET is_active = $2 WHERE id = $1 RETURNING id', [id, isActive]);
    return (res.rowCount || 0) > 0;
  }

  async updateCouponUsageLimit(id: string, usageLimit: number): Promise<boolean> {
    const res = await query('UPDATE coupons SET usage_limit = $2 WHERE id = $1 RETURNING id', [id, usageLimit]);
    return (res.rowCount || 0) > 0;
  }

  async checkCouponCodeExists(code: string): Promise<boolean> {
    const res = await query('SELECT id FROM coupons WHERE UPPER(code) = $1', [code.trim().toUpperCase()]);
    return (res.rowCount || 0) > 0;
  }
  
  async getCouponByCode(code: string): Promise<CouponRecord | null> {
    const res = await query('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      usageLimit: Number(row.usage_limit),
      usedCount: Number(row.used_count),
      isActive: row.is_active,
      createdAt: row.created_at.toISOString()
    };
  }

  // ==========================================
  // ADVERTISEMENT MANAGEMENT
  // ==========================================

  async createAdvertisement(data: any): Promise<any> {
    const { pool } = await import('./pg.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const adId = `ad-${Date.now()}`;
      
      const title = data.title || 'Untitled Ad';
      const sponsorName = data.sponsorName ?? data.sponsor_name ?? null;
      const description = data.description ?? null;
      const imageUrl = data.imageUrl ?? data.image_url ?? '';
      const adType = data.adType ?? data.ad_type ?? 'BANNER';
      const destinationType = data.destinationType ?? data.destination_type ?? 'NONE';
      const destinationId = data.destinationId ?? data.destination_id ?? null;
      const externalUrl = data.externalUrl ?? data.external_url ?? null;
      const status = data.status || 'ACTIVE';
      const createdBy = data.createdBy ?? data.created_by ?? null;

      const parseDate = (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };
      const startAt = parseDate(data.startAt ?? data.start_at);
      const endAt = parseDate(data.endAt ?? data.end_at);

      console.log('[DB Ad Create] Inserting Ad:', adId, title);
      await client.query(`
        INSERT INTO advertisements (
          id, title, sponsor_name, description, image_url, ad_type,
          destination_type, destination_id, external_url, start_at, end_at, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        adId, title, sponsorName, description, imageUrl, adType,
        destinationType, destinationId, externalUrl,
        startAt, endAt, status, createdBy
      ]);

      const targetLocs = (data.locations && Array.isArray(data.locations) && data.locations.length > 0)
        ? data.locations
        : [
            { pageName: 'HOME', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'HOME', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'CAVE_MARKET', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'CAVE_MARKET', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 }
          ];

      // Filter duplicates in memory
      const seenLocs = new Set<string>();
      const uniqueLocs: any[] = [];
      for (const loc of targetLocs) {
        const page = String(loc.pageName || loc.page_name || 'HOME').toUpperCase().trim();
        const slot = String(loc.placementSlot || loc.placement_slot || 'TOP').toUpperCase().trim();
        const key = `${page}:${slot}`;
        if (!seenLocs.has(key)) {
          seenLocs.add(key);
          uniqueLocs.push(loc);
        }
      }

      console.log(`[DB Ad Create] Inserting ${uniqueLocs.length} locations`);
      for (const loc of uniqueLocs) {
        const locId = `loc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await client.query(`
          INSERT INTO advertisement_display_locations (
            id, advertisement_id, page_name, placement_slot,
            display_size, space_profile, width_profile, height_profile, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (advertisement_id, page_name, placement_slot)
          DO UPDATE SET
            display_size = EXCLUDED.display_size,
            space_profile = EXCLUDED.space_profile,
            width_profile = EXCLUDED.width_profile,
            height_profile = EXCLUDED.height_profile,
            priority = EXCLUDED.priority,
            updated_at = NOW()
        `, [
          locId, adId, String(loc.pageName || loc.page_name || 'HOME').toUpperCase().trim(), String(loc.placementSlot || loc.placement_slot || 'TOP').toUpperCase().trim(),
          loc.displaySize || 'MEDIUM', loc.spaceProfile || 'STANDARD',
          loc.widthProfile || 'FULL', loc.heightProfile || 'STANDARD',
          loc.priority || 10
        ]);
      }
      
      await client.query('COMMIT');
      return { id: adId };
    } catch (e) {
      console.error('[DB Ad Create] Error:', e);
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updateAdvertisement(id: string, data: any): Promise<boolean> {
    const { pool } = await import('./pg.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const title = data.title || 'Untitled Ad';
      const sponsorName = data.sponsorName ?? data.sponsor_name ?? null;
      const description = data.description ?? null;
      const imageUrl = data.imageUrl ?? data.image_url ?? '';
      const adType = data.adType ?? data.ad_type ?? 'BANNER';
      const destinationType = data.destinationType ?? data.destination_type ?? 'NONE';
      const destinationId = data.destinationId ?? data.destination_id ?? null;
      const externalUrl = data.externalUrl ?? data.external_url ?? null;
      const status = data.status || 'ACTIVE';

      const parseDate = (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };
      const startAt = parseDate(data.startAt ?? data.start_at);
      const endAt = parseDate(data.endAt ?? data.end_at);

      await client.query(`
        UPDATE advertisements SET
          title = $1, sponsor_name = $2, description = $3, image_url = $4,
          ad_type = $5, destination_type = $6, destination_id = $7, external_url = $8,
          start_at = $9, end_at = $10, status = $11, updated_at = NOW()
        WHERE id = $12
      `, [
        title, sponsorName, description, imageUrl, adType,
        destinationType, destinationId, externalUrl,
        startAt, endAt, status, id
      ]);

      const targetLocs = (data.locations && Array.isArray(data.locations) && data.locations.length > 0)
        ? data.locations
        : [
            { pageName: 'HOME', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'HOME', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'CAVE_MARKET', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
            { pageName: 'CAVE_MARKET', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 }
          ];

      // Filter duplicates in memory
      const seenLocs = new Set<string>();
      const uniqueLocs: any[] = [];
      for (const loc of targetLocs) {
        const page = String(loc.pageName || loc.page_name || 'HOME').toUpperCase().trim();
        const slot = String(loc.placementSlot || loc.placement_slot || 'TOP').toUpperCase().trim();
        const key = `${page}:${slot}`;
        if (!seenLocs.has(key)) {
          seenLocs.add(key);
          uniqueLocs.push(loc);
        }
      }

      // Delete old locations
      await client.query('DELETE FROM advertisement_display_locations WHERE advertisement_id = $1', [id]);
      
      // Insert new ones
      for (const loc of uniqueLocs) {
        const locId = `loc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await client.query(`
          INSERT INTO advertisement_display_locations (
            id, advertisement_id, page_name, placement_slot,
            display_size, space_profile, width_profile, height_profile, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (advertisement_id, page_name, placement_slot)
          DO UPDATE SET
            display_size = EXCLUDED.display_size,
            space_profile = EXCLUDED.space_profile,
            width_profile = EXCLUDED.width_profile,
            height_profile = EXCLUDED.height_profile,
            priority = EXCLUDED.priority,
            updated_at = NOW()
        `, [
          locId, id, String(loc.pageName || loc.page_name || 'HOME').toUpperCase().trim(), String(loc.placementSlot || loc.placement_slot || 'TOP').toUpperCase().trim(),
          loc.displaySize || 'MEDIUM', loc.spaceProfile || 'STANDARD',
          loc.widthProfile || 'FULL', loc.heightProfile || 'STANDARD',
          loc.priority || 10
        ]);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (e) {
      console.error('[DB Ad Update] Error:', e);
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteAdvertisement(id: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM advertisement_display_locations WHERE advertisement_id = $1', [id]);
      const res = await client.query('DELETE FROM advertisements WHERE id = $1 RETURNING id', [id]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getAllAdvertisements(): Promise<any[]> {
    const res = await query(`
      SELECT a.*, 
        json_agg(
          json_build_object(
            'id', l.id,
            'pageName', l.page_name,
            'placementSlot', l.placement_slot,
            'displaySize', l.display_size,
            'spaceProfile', l.space_profile,
            'widthProfile', l.width_profile,
            'heightProfile', l.height_profile,
            'priority', l.priority
          )
        ) FILTER (WHERE l.id IS NOT NULL) as locations
      FROM advertisements a
      LEFT JOIN advertisement_display_locations l ON a.id = l.advertisement_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    
    return res.rows.map(row => ({
      id: row.id,
      title: row.title,
      sponsorName: row.sponsor_name,
      description: row.description,
      imageUrl: row.image_url,
      adType: row.ad_type,
      destinationType: row.destination_type,
      destinationId: row.destination_id,
      externalUrl: row.external_url,
      startAt: row.start_at ? new Date(row.start_at).toISOString() : null,
      endAt: row.end_at ? new Date(row.end_at).toISOString() : null,
      status: row.status,
      locations: row.locations || [],
      createdAt: row.created_at
    }));
  }

  async updateAdvertisementStatus(id: string, status: string): Promise<boolean> {
    const res = await query('UPDATE advertisements SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getPageSettings(): Promise<any[]> {
    const res = await query('SELECT * FROM advertisement_display_settings');
    return res.rows.map(row => ({
      id: row.id,
      pageName: row.page_name,
      placementSlot: row.placement_slot,
      maxAds: row.max_ads
    }));
  }

  async updatePageSettings(settings: any[]): Promise<boolean> {
    const { pool } = await import('./pg.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM advertisement_display_settings');
      for (const s of settings) {
        const id = `ps-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await client.query(`
          INSERT INTO advertisement_display_settings (id, page_name, placement_slot, max_ads)
          VALUES ($1, $2, $3, $4)
        `, [
          id, 
          String(s.pageName || '').toUpperCase().trim(), 
          s.placementSlot ? String(s.placementSlot).toUpperCase().trim() : null, 
          s.maxAds
        ]);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getActiveAdsForPage(pageName: string, slot?: string): Promise<any[]> {
    const normalizedPage = String(pageName || '').toUpperCase().trim();
    const normalizedSlot = slot ? String(slot).toUpperCase().trim() : undefined;

    let sql = `
      SELECT a.*, 
             COALESCE(l.page_name, $1) as page_name, 
             COALESCE(l.placement_slot, ${normalizedSlot ? '$2' : "'TOP'"}) as placement_slot, 
             COALESCE(l.display_size, 'MEDIUM') as display_size, 
             COALESCE(l.space_profile, 'STANDARD') as space_profile, 
             COALESCE(l.width_profile, 'FULL') as width_profile, 
             COALESCE(l.height_profile, 'STANDARD') as height_profile, 
             COALESCE(l.priority, 10) as priority
      FROM advertisements a
      LEFT JOIN advertisement_display_locations l ON a.id = l.advertisement_id
      WHERE (l.page_name = $1 OR l.page_name IS NULL)
      AND a.status = 'ACTIVE'
      AND (a.start_at IS NULL OR a.start_at <= NOW())
      AND (a.end_at IS NULL OR a.end_at >= NOW())
    `;
    const params: any[] = [normalizedPage];
    
    if (normalizedSlot) {
      sql += ` AND (l.placement_slot = $2 OR l.placement_slot IS NULL)`;
      params.push(normalizedSlot);
    }
    
    sql += ` ORDER BY COALESCE(l.priority, 10) ASC, a.created_at DESC`;
    
    const res = await query(sql, params);
    
    // Check page/placement limits
    const settingsRes = await query('SELECT * FROM advertisement_display_settings WHERE page_name = $1', [normalizedPage]);
    const settings = settingsRes.rows;
    
    let processedRows = res.rows.map(row => ({
      id: row.id,
      title: row.title,
      sponsorName: row.sponsor_name,
      description: row.description,
      imageUrl: row.image_url,
      adType: row.ad_type,
      destinationType: row.destination_type,
      destinationId: row.destination_id,
      externalUrl: row.external_url,
      pageName: row.page_name,
      placementSlot: row.placement_slot,
      displaySize: row.display_size,
      spaceProfile: row.space_profile,
      widthProfile: row.width_profile,
      heightProfile: row.height_profile,
      priority: row.priority
    }));

    // Apply limits
    const pageMaxAdsSetting = settings.find(s => !s.placement_slot);
    const pageMaxAds = pageMaxAdsSetting ? pageMaxAdsSetting.max_ads : 100; // default large if not set

    // Apply slot specific limits
    const slotCounts: Record<string, number> = {};
    const filteredRows: any[] = [];
    let pageCount = 0;

    for (const ad of processedRows) {
      if (pageCount >= pageMaxAds) break;
      
      const slotLimitSetting = settings.find(s => s.placement_slot === ad.placementSlot);
      const slotMaxAds = slotLimitSetting ? slotLimitSetting.max_ads : 100;

      if (!slotCounts[ad.placementSlot]) {
        slotCounts[ad.placementSlot] = 0;
      }

      if (slotCounts[ad.placementSlot] < slotMaxAds) {
        filteredRows.push(ad);
        slotCounts[ad.placementSlot]++;
        pageCount++;
      }
    }

    return filteredRows;
  }

  async logSecurityEvent(userId: string, affectedDate: string, action: string, riskScore: number, reason: string, adminId?: string) {
    const id = generateSecureId('SEC');
    await query(`
      INSERT INTO security_audit_logs (id, user_id, affected_date, action, risk_score, reason, timestamp, admin_id)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    `, [id, userId, affectedDate, action, riskScore, reason, adminId || null]);
  }

  async getUserLatestAttendancesForSecurity(userId: string) {
    const res = await query(`
      SELECT *
      FROM prayer_attendances
      WHERE user_id = $1
      ORDER BY verified_at DESC LIMIT 5
    `, [userId]);
    return res.rows.map(mapAttendanceRow);
  }

  async getOfflineSyncCountInWindow(userId: string, windowSeconds: number) {
    const res = await query(`
      SELECT COUNT(*) as count
      FROM prayer_attendances
      WHERE user_id = $1 AND verified_at >= NOW() - CAST($2 || ' second' as interval)
    `, [userId, windowSeconds]);
    return Number(res.rows[0]?.count || 0);
  }

  async getQuarantinedAttendances() {
    const res = await query(`
      SELECT p.*, u.full_name as user_name, u.phone as user_phone 
      FROM prayer_attendances p
      JOIN users u ON p.user_id = u.id
      WHERE p.security_status = 'quarantined'
      ORDER BY p.synced_at DESC
    `);
    return res.rows;
  }

  async reviewQuarantinedAttendance(attendanceId: string, action: 'approve' | 'reject', adminId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const attQuery = await client.query(`
        SELECT * FROM prayer_attendances WHERE id = $1
      `, [attendanceId]);

      if (attQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const att = attQuery.rows[0];

      if (action === 'approve') {
        // Change status to verified
        await client.query(`
          UPDATE prayer_attendances 
          SET security_status = 'verified', status = 'verified' 
          WHERE id = $1
        `, [attendanceId]);

        // Trigger daily token generation/upgrade safely and idempotently
        await client.query('COMMIT');
        await this.generateOrUpdateDailyToken(att.user_id, att.date);
      } else {
        // Change status to rejected or quarantine_rejected
        await client.query(`
          UPDATE prayer_attendances 
          SET security_status = 'rejected', status = 'rejected' 
          WHERE id = $1
        `, [attendanceId]);
        await client.query('COMMIT');
      }

      // Log audit
      await this.logSecurityEvent(
        att.user_id,
        att.date,
        action,
        Number(att.risk_score || 0),
        `Admin review: ${action} of quarantined record`,
        adminId
      );

      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[DB] reviewQuarantinedAttendance error:', e);
      return false;
    } finally {
      client.release();
    }
  }
}
export const db = new Database();

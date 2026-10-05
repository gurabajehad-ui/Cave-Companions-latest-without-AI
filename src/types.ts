export type PrayerType = 'fajr' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'MALE' | 'FEMALE' | string;
  age?: number;
  dateOfBirth?: string;
  maritalStatus?: string;
  district?: string;
  upazila?: string;
  address?: string;
  isVerified?: boolean;
  photoUrl?: string;
  isMerchant?: boolean;
  isRider?: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
}

export interface Mosque {
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
  created_at?: string;
}

export interface PrayerAttendance {
  id: string;
  userId: string;
  mosqueId: string;
  mosqueName: string;
  prayerType: PrayerType;
  date: string;
  verifiedAt: string;
  status: 'verified';
  qrPayload: string;
}

export interface PrayerInfo {
  type: PrayerType;
  nameBn: string;
  nameEn: string;
  nameAr: string;
  timeWindowBn: string;
  timeWindowEn: string;
  iconName: string;
  descriptionBn: string;
  rakats: string;
}

export interface PrayerStatusItem {
  completed: boolean;
  attendance: PrayerAttendance | null;
}

export interface TodayPrayerStatus {
  date: string;
  isFriday?: boolean;
  completedCount: number;
  totalPrayers: number;
  prayers: Partial<Record<PrayerType, PrayerStatusItem>> | Record<string, PrayerStatusItem>;
  attendances?: PrayerAttendance[];
  summaryText: string;
}

export interface UserLifetimeStats {
  totalCount: number;
  uniqueDays: number;
  byPrayer: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    jumuah?: number;
  };
  eligibleTokenStats: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export type TokenType = 'GOLD' | 'SILVER' | 'BRONZE';
export type TokenStatus = 'AVAILABLE' | 'USED' | 'PENDING_REDEMPTION';

export interface UserToken {
  id: string;
  userId: string;
  tokenType: TokenType;
  status: TokenStatus;
  earnedDate: string;
  createdAt: string;
  usedAt?: string | null;
  redemptionRef?: string | null;
  sourcePrayerCount: number;
  isDonated?: boolean;
  donatedAt?: string | null;
  earnedMosqueId?: string | null;
  earnedMosqueName?: string | null;
  donatedAmount?: number;
  discountAmount?: number;
}

export interface MyTokensResponse {
  success: boolean;
  todayDate: string;
  canRedeemToday: boolean;
  dailyRedeemWarning?: string | null;
  availableCount: number;
  availableTokens: UserToken[];
  usedCount: number;
  usedTokens: UserToken[];
  gracePeriod?: {
    inGracePeriod: boolean;
    yesterdayDate: string;
    remainingMinutes: number;
    yesterdayRewardStatus?: {
      eligible: boolean;
      inGracePeriod: boolean;
      token: UserToken | null;
      yesterdayDateStr: string;
      prayerCount: number;
      action: string;
      message: string;
    };
  };
  rules: {
    gold: { tier: string; requiredPrayers: number; labelBn: string; descriptionBn: string };
    silver: { tier: string; requiredPrayers: number; labelBn: string; descriptionBn: string };
    bronze: { tier: string; requiredPrayers: number; labelBn: string; descriptionBn: string };
  };
}

export type ShopStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'CORRECTION_REQUIRED' | 'REJECTED';
export type MerchantAccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'PENDING_CORRECTION' | 'REJECTED';

export interface CommissionPolicyTier {
  userBenefitPercent: number;
  platformCommissionPercent: number;
}

export interface CommissionPolicy {
  totalCommissionPercent: number;
  gold: CommissionPolicyTier;
  silver: CommissionPolicyTier;
  bronze: CommissionPolicyTier;
  version?: string;
  updatedAt?: string;
}

export interface MerchantVerificationRecord {
  id: string;
  merchantId: string;
  shopId: string;
  ownerName: string;
  phone: string;
  email?: string;
  shopName: string;
  shopPhone?: string;
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
  agreementAcceptedAt: string;
  agreementVersion: string;
  acceptedTotalCommission: number;
  acceptedGoldUserBenefit: number;
  acceptedGoldPlatformCommission: number;
  acceptedSilverUserBenefit: number;
  acceptedSilverPlatformCommission: number;
  acceptedBronzeUserBenefit: number;
  acceptedBronzePlatformCommission: number;
  verificationStatus: VerificationStatus;
  shopStatus?: ShopStatus;
  merchantStatus: MerchantAccountStatus;
  correctionMessage?: string;
  requestedCorrectionFields?: string[];
  correctionHistory?: Array<{
    date: string;
    adminName?: string;
    message?: string;
    requestedFields?: string[];
    status?: string;
  }>;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  qrIdentifier?: string;
  qrUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  commissionChangeRequests?: Array<{
    id: string;
    shopId: string;
    currentCommissionPercent: number;
    requestedCommissionPercent: number;
    status: string;
    reason?: string;
    adminNote?: string;
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
  }>;
}

export interface PartnerShop {
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
  category: string;
  description: string;
  logoUrl?: string;
  photoUrl?: string;
  openingHours: string;
  status: ShopStatus;
  qrIdentifier: string;
  goldDiscount: number;
  silverDiscount: number;
  bronzeDiscount: number;
  pendingGoldDiscount?: number;
  pendingSilverDiscount?: number;
  pendingBronzeDiscount?: number;
  commissionRate?: number;
  distanceKm?: number;
  averageRating?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  offers?: any[];
}

export interface ShopReview {
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
  isVerifiedPurchase?: boolean;
}

export type Shop = PartnerShop;

export interface UserRedemptionRecord {
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
  purchaseAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
  commissionRate?: number;
  grossCommissionAmount?: number;
  caveCompanionsNetIncome?: number;
  merchantPayoutAmount?: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  createdAt: string;
  redemptionDate: string;
  isDonated?: boolean;
  donatedAmount?: number;
  earnedMosqueId?: string | null;
  earnedMosqueName?: string | null;
  commissionPaymentStatus?: string;
  merchantHistoryDeleted?: boolean;
}

export interface TokenRedemptionRequest {
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
  redemption?: UserRedemptionRecord | null;
}

export type MerchantRole = 'MERCHANT' | 'SHOP_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

export interface MerchantUser {
  id: string;
  name: string;
  phone: string;
  role: MerchantRole;
  shopId: string;
}

export interface MerchantTransactionRecord extends UserRedemptionRecord {
  commissionRate: number;
  commissionAmount: number;
}

export interface MerchantDashboardStats {
  shop: PartnerShop & { commissionRate?: number; qrSecret?: string };
  today: {
    count: number;
    salesAmount: number;
    discountAmount: number;
    payableAmount: number;
    commissionAmount: number;
  };
  allTime: {
    count: number;
    salesAmount: number;
    discountAmount: number;
    commissionAmount: number;
  };
  recentTransactions: MerchantTransactionRecord[];
}

export type ActiveTab =
  | 'home'
  | 'tokens'
  | 'shops'
  | 'market'
  | 'profile'
  | 'merchant'
  | 'rider'
  | 'admin'
  | 'notifications'
  | 'support'
  | 'history'
  | 'prayer_history'
  | 'prayer_journey'
  | 'quran'
  | 'hisnul_muslim'
  | 'blog'
  | 'cave_circle'
  | 'token_rules'
  | 'all_features';

export interface HisnulMuslimDua {
  id: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title_bn: string;
  chapter_title_en?: string;
  chapter_title?: string;
  dua_number: number;
  title_bn: string;
  title_en?: string;
  arabic_text: string;
  transliteration?: string;
  translation_bn: string;
  translation_en?: string;
  reference_book: string;
  reference_number?: string;
  hadith_grade?: string;
  source: string;
  content_version: string;
  source_version?: string;
  updated_at?: string;
}

export interface HisnulMuslimChapter {
  id: string;
  category_slug: string;
  chapter_number: number;
  title_bn: string;
  title_ar: string;
  title_en?: string;
  chapter_title_bn?: string;
  chapter_title_ar?: string;
  chapter_title_en?: string;
  dua_count: number;
  iconName: string;
}

export type NotificationType =
  | 'PRAYER_VERIFIED'
  | 'TOKEN_EARNED'
  | 'TOKEN_UPGRADED'
  | 'TOKEN_REDEEMED'
  | 'REDEMPTION_SUCCESSFUL'
  | 'REDEMPTION_FAILED'
  | 'SECURITY'
  | 'ANNOUNCEMENT'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'SYSTEM_UPDATE'
  | 'MOSQUE_APPLICATION'
  | 'MOSQUE_APPLICATION_SUBMITTED'
  | 'MOSQUE_APPLICATION_APPROVED'
  | 'MOSQUE_APPLICATION_REJECTED'
  | 'COUPON_AVAILABLE'
  | 'COUPON_USED'
  | 'NEW_PARTNER_SHOP'
  | 'CIRCLE_MESSAGE'
  | 'CIRCLE_INVITE'
  | 'MODERATION_WARNING'
  | 'MODERATION_MUTE'
  | 'MODERATION_WITHDRAWN';

export interface CircleInvitation {
  id: string;
  circle_id: string;
  inviter_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  circle_name: string;
  circle_description?: string;
  inviter_name: string;
  member_count?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType | string;
  read: boolean;
  createdAt: string;
  relatedId?: string | null;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  eventType: string;
  name: string;
  nameBn: string;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  isActive: boolean;
  availableVariables: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
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

export interface DayPrayerItem {
  completed: boolean;
  mosqueName?: string;
  verifiedAt?: string;
}

export interface DailyPrayerHistoryGroup {
  date: string;
  dateFormattedBn: string;
  fajr: DayPrayerItem;
  dhuhr: DayPrayerItem;
  jumuah?: DayPrayerItem;
  asr: DayPrayerItem;
  maghrib: DayPrayerItem;
  isha: DayPrayerItem;
  totalCompleted: number;
  earnedToken?: TokenType | null;
}

export interface SystemStatsSummary {
  totalUsers: number;
  totalMosques: number;
  totalShops: number;
  totalRejectedShops: number;
  totalMerchants: number;
  totalVerifiedPrayers: number;
  totalTokensGenerated: number;
  totalTokensRedeemed: number;
  totalGrossDiscount: number;
  openSupportTickets: number;
  securityIncidents: number;
}

export interface AdminActivityItem {
  id: string;
  type: 'PRAYER' | 'REDEMPTION' | 'TOKEN' | 'TICKET';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
}

export interface HelplineSettings {
  id?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  supportMessage: string;
  isWhatsappEnabled: boolean;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
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
  | 'SYSTEM_VIEW'
  | 'AUDIT_VIEW';

// ==========================================
// ONLINE MARKETPLACE & SHOPPING TYPES
// ==========================================

export interface ProductPriceChangeRequest {
  id: string;
  productId: string;
  shopId: string;
  shopName?: string;
  merchantId?: string;
  merchantName?: string;
  productName: string;
  productImageUrl?: string;
  oldPrice: number;
  requestedNewPrice: number;
  requestedPrice?: number;
  priceDifference: number;
  percentageDifference: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ProductDeleteRequest {
  id: string;
  productId: string;
  shopId: string;
  shopName?: string;
  merchantId?: string;
  merchantName?: string;
  productName: string;
  productCategory?: string;
  productImageUrl?: string;
  productPrice: number;
  isAvailable: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  reason?: string;
}

export interface Product {
  id: string;
  shopId: string;
  shopName?: string;
  shopCategory?: string;
  shopBusinessType?: string;
  shopDistrict?: string;
  shopUpazila?: string;
  category?: string;
  name: string;
  description?: string;
  originalPrice: number;
  weightKg?: number;
  imageUrl?: string;
  gallery?: string[];
  isAvailable: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  rejectionReason?: string;
  pendingPriceChange?: ProductPriceChangeRequest | null;
  pendingDeleteRequest?: ProductDeleteRequest | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productImage?: string;
  productPrice: number;
  originalPrice: number;
  weightKg?: number;
  isAvailable: boolean;
  shopId: string;
  shopName: string;
  shopDistrict?: string;
  shopAddress?: string;
  shopLatitude?: number;
  shopLongitude?: number;
  quantity: number;
  tokenId?: string | null;
  tokenType?: TokenType | null;
  tokenDiscountPercent: number;
  tokenDiscountAmount: number;
  finalPricePerUnit: number;
  subtotalPayable: number;
  createdAt: string;
  isDonated?: boolean;
  donatedAmount?: number;
  normalDiscountPercent?: number;
}

export interface LocalDeliveryRates {
  rate0to1: number;
  rate1to5: number;
  rate6to10: number;
}

export interface CartSummary {
  items: CartItem[];
  totalQuantity: number;
  productOriginalTotal: number;
  tokenDiscountTotal: number;
  productPayableTotal: number;
  deliveryCharge: number;
  totalCodAmount: number;
  subtotalOriginal?: number;
  totalTokenDiscount?: number;
  subtotalPayable?: number;
  grandTotal?: number;
  tokenDonationTotal?: number;
}

export type OrderStatus = 'PENDING' | 'APPROVED' | 'DELIVERED' | 'DONE' | 'PRODUCT_BACK' | 'REJECTED' | 'CANCELLED';
export type RiderDeliveryStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'DONE' | 'PRODUCT_BACK' | 'CANCELLED';
export type RiderApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type RiderAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface Rider {
  id: string;
  fullName: string;
  phone: string;
  nidNumber?: string;
  vehicleType?: 'BICYCLE' | 'MOTORCYCLE' | 'WALKING' | string;
  photoUrl?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  status: RiderAvailabilityStatus | RiderStatus | string;
  approvalStatus?: RiderApprovalStatus;
  rejectionReason?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdatedAt?: string;
  totalDeliveries?: number;
  totalDelivered?: number;
  totalDone?: number;
  totalProductBack?: number;
  totalEarnings?: number;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  shopId: string;
  shopName: string;
  quantity: number;
  originalPrice: number;
  tokenId?: string | null;
  tokenType?: TokenType | 'NONE';
  tokenDiscountRate: number;
  tokenDiscountAmount: number;
  customerProductPayable: number;
  commissionRate: number;
  commissionAmount: number;
  shopReceivable: number;
  netIncome: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  district?: string;
  upazila?: string;
  fullAddress?: string;
  deliveryChargeType?: string;
  deliveryNotes?: string;
  paymentMethod: string;
  status: OrderStatus;
  productTotalOriginal: number;
  productTotalDiscount: number;
  productTotalPayable: number;
  deliveryCharge: number;
  totalCodAmount: number;
  orderType?: 'NATIONWIDE' | 'LOCAL';
  latitude?: number;
  longitude?: number;
  riderId?: string;
  riderStatus?: string;
  deliveryWaived?: boolean;
  waivedBy?: string;
  waivedAt?: string;
  originalDeliveryCharge?: number;
  pickupOtp?: string;
  deliveryOtp?: string;
  rejectionCode?: string;
  riderAcceptedAt?: string;
  riderPickedUpAt?: string;
  riderDeliveredAt?: string;
  merchantSettledAt?: string;
  settlementStatus?: 'PENDING' | 'DONE' | 'PRODUCT_BACK';
  riderFee?: number;
  distanceKm?: number;
  riderInfo?: {
    id: string;
    fullName: string;
    phone: string;
    vehicleType?: string;
    vehiclePlate?: string;
    currentLatitude?: number;
    currentLongitude?: number;
    rating?: number;
    photoUrl?: string;
  };
  rider?: any;
  nearbyRiders?: any[];
  riderName?: string;
  riderPhone?: string;
  riderVehicle?: string;
  totalProductPayable?: number;
  totalPayable?: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  adminNotes?: string;
  couponCode?: string | null;
  couponDiscountAmount?: number;
  items?: OrderItem[];
}

export interface DeliveryChargeSettings {
  id?: string;
  amount?: number;
  charges?: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeliveryChargeLogItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCharge: number;
  orderDate: string;
  orderStatus: OrderStatus;
}

export interface OnlineFinancialRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  quantity: number;
  originalPrice: number;
  tokenType?: TokenType | 'NONE';
  tokenDiscountAmount: number;
  customerProductPayable: number;
  commissionRate: number;
  commissionAmount: number;
  shopReceivable: number;
  netIncome: number;
  orderCreatedAt: string;
  deliveredAt: string;
  createdAt: string;
  isDonated?: boolean;
  donatedAmount?: number;
  earnedMosqueId?: string | null;
  earnedMosqueName?: string | null;
  couponCode?: string | null;
  couponDiscountAmount?: number;
}

export interface OnlineAccountsSummary {
  totalSales: number;
  totalTokenDiscounts: number;
  totalCouponDiscounts?: number;
  totalCustomerPayable: number;
  totalShopReceivable: number;
  totalCommissionAmount: number;
  totalNetIncome: number;
  totalItemCount: number;
  totalDonatedAmount?: number;
}






export interface AdDisplayLocation {
  pageName: string;
  placementSlot: string;
  displaySize: string;
  spaceProfile: string;
  widthProfile: string;
  heightProfile: string;
  priority: number;
}

export interface Advertisement {
  id: string;
  title: string;
  sponsorName: string;
  description: string;
  imageUrl: string;
  adType: string;
  destinationType: string;
  destinationId: string;
  externalUrl: string;
  startAt: string | null;
  endAt: string | null;
  status: string;
  locations?: AdDisplayLocation[];
}

export interface AdPageSettings {
  id: string;
  pageName: string;
  placementSlot?: string;
  maxAds: number;
}

// =========================================================================
// SALAH JOURNEY & GROWTH INTERFACES
// =========================================================================

export interface JourneyMilestone {
  id: string;
  titleBn: string;
  titleEn?: string;
  descBn: string;
  descEn?: string;
  icon: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'streak' | 'total' | 'perfect_day';
}

export interface DayPrayerItem {
  type: 'fajr' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha';
  nameBn: string;
  nameEn?: string;
  completed: boolean;
  mosqueName?: string;
  verifiedAt?: string;
  timeBn?: string;
  timeEn?: string;
}

export interface CalendarDayInfo {
  date: string;
  dayNumber: number;
  dayNameBn: string;
  dayNameEn?: string;
  isFriday: boolean;
  isToday: boolean;
  isFuture: boolean;
  completedCount: number;
  totalPrayers: number;
  level: 'EXCELLENT' | 'VERY_GOOD' | 'MODERATE' | 'NEEDS_IMPROVEMENT' | 'NONE';
  tokenEarned: 'GOLD' | 'SILVER' | 'BRONZE' | null;
  prayers: DayPrayerItem[];
}

export interface ChartDataPoint {
  label: string;
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface JourneyConsistencyScore {
  score: number;
  level: 'EXCELLENT' | 'VERY_GOOD' | 'IMPROVEMENT_NEEDED' | 'START_AGAIN' | 'NO_DATA';
  ratingBn: string;
  ratingEn?: string;
  messageBn: string;
  messageEn?: string;
}

export interface JourneyWeekStats {
  thisWeekCompleted: number;
  prevWeekCompleted: number;
  totalPossible: number;
  completionPercentage: number;
  prevPercentage: number;
  diff: number;
  direction: 'UP' | 'DOWN' | 'SAME';
  textBn: string;
}

export interface JourneyMonthStats {
  thisMonthCompleted: number;
  prevMonthCompleted: number;
  totalPossible: number;
  completionPercentage: number;
  diff: number;
  direction: 'UP' | 'DOWN' | 'SAME';
  textBn: string;
}

export interface JourneyTeaser {
  headline: string;
  primaryStat: string;
  secondaryStat: string;
  badgeText: string;
  headlineEn?: string;
  primaryStatEn?: string;
  secondaryStatEn?: string;
  badgeTextEn?: string;
}

export interface JourneySummaryResponse {
  success: boolean;
  journeyStartDate: string;
  earliestDate: string;
  totalCompletedPrayers: number;
  todayCompletedPrayers?: number;
  totalDaysRecorded?: number;
  perfectDaysCount: number;
  perfectWeeksCount: number;
  currentStreak: number;
  bestStreak: number;
  consistencyScore: JourneyConsistencyScore;
  weekStats: JourneyWeekStats;
  monthStats: JourneyMonthStats;
  prayerDistribution: Record<string, number>;
  insights: string[];
  recommendations: string[];
  milestones: JourneyMilestone[];
  showRecoveryMode: boolean;
  teaser: JourneyTeaser;
  archivedJourneysCount: number;
}

export interface ChartDataPoint {
  label: string;
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface JourneyAnalyticsResponse {
  success: boolean;
  period: 'week' | 'month' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  totalPossible: number;
  totalCompleted: number;
  completionPercentage: number;
  previousPeriod: {
    startDate: string;
    endDate: string;
    totalPossible: number;
    totalCompleted: number;
    completionPercentage: number;
  };
  improvementRate: {
    diff: number;
    direction: 'UP' | 'DOWN' | 'SAME';
    textBn: string;
  };
  chartData: ChartDataPoint[];
}

export interface JourneyCalendarResponse {
  success: boolean;
  year: number;
  month: number;
  daysInMonth: number;
  days: CalendarDayInfo[];
}

export interface JourneyDayDetailResponse {
  success: boolean;
  date: string;
  isFriday: boolean;
  completedCount: number;
  totalPrayers: number;
  tokenEarned: 'GOLD' | 'SILVER' | 'BRONZE' | null;
  prayers: DayPrayerItem[];
  summaryText: string;
}


export type RiderStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'DELIVERY_REQUEST'
  | 'ACCEPTED'
  | 'GOING_TO_PICKUP'
  | 'AT_SHOP'
  | 'PRODUCT_COLLECTED'
  | 'GOING_TO_NEXT_SHOP'
  | 'ALL_PRODUCTS_COLLECTED'
  | 'GOING_TO_CUSTOMER'
  | 'DELIVERED';


import { offlineSyncService } from "./offlineSyncService";
import { isClientPrayerTimeValidOffline } from "./prayerTimeService";
import axios from 'axios';
import {
  Mosque,
  MyTokensResponse,
  PrayerAttendance,
  PrayerType,
  TodayPrayerStatus,
  User,
  UserLifetimeStats,
  UserToken,
  PartnerShop,
  ShopReview,
  UserRedemptionRecord,
  TokenRedemptionRequest,
  MerchantUser,
  MerchantDashboardStats,
  MerchantTransactionRecord
} from '../types';

const TOKEN_KEY = 'cave_companions_auth_token';
const MERCHANT_TOKEN_KEY = 'cave_companions_merchant_token';
const ADMIN_TOKEN_KEY = 'cave_companions_admin_session_token';
const RIDER_TOKEN_KEY = 'cave_companions_rider_token';

/**
 * Safely decodes a JWT token payload on client-side to verify claims (e.g. type)
 */
let lastDecodedToken: string | null = null;
let lastDecodedPayload: any = null;

export function decodeJwtPayload(token: string): { sub?: string; type?: string; [key: string]: any } | null {
  if (token === lastDecodedToken) return lastDecodedPayload;
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // JWT payloads are base64-url encoded
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    
    // Decode base64 to binary string
    const decodedStr = atob(base64);
    
    // Handle UTF-8 (Unicode characters like Bengali names)
    // This converts the binary string bytes back to a proper UTF-8 string
    let jsonPayload: string;
    try {
      const bytes = new Uint8Array(decodedStr.length);
      for (let i = 0; i < decodedStr.length; i++) {
        bytes[i] = decodedStr.charCodeAt(i);
      }
      jsonPayload = new TextDecoder().decode(bytes);
    } catch (utf8Err) {
      console.warn('[JWT] UTF-8 decoding failed, falling back to basic decode:', utf8Err);
      try {
        jsonPayload = decodeURIComponent(
          decodedStr
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } catch {
        jsonPayload = decodedStr;
      }
    }
    
    const parsed = JSON.parse(jsonPayload);
    if (parsed) { lastDecodedToken = token; lastDecodedPayload = parsed; }
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.error('[JWT] Failed to decode token payload:', err);
    return null;
  }
}

export function isValidTokenType(token: string, expectedType: 'user' | 'merchant' | 'admin' | 'rider'): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Basic sanity check for extremely short tokens
  if (token.length < 5) return false;

  // Special handling for legacy/mock admin/merchant tokens and master keys
  if (expectedType === 'admin') {
    if (
      token.startsWith('ADM-TOK-') || 
      token === 'admin_secure_key_9876543210_abcdef' || 
      token === 'RAHMANJMCC' || 
      token === 'admin123456'
    ) {
      return true;
    }
  }
  
  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Non-JWT string token check for admin
    if (expectedType === 'admin' && token.length >= 8) return true;
    return false;
  }
  
  // sub must exist for a valid JWT in this app
  if (!payload.sub || typeof payload.sub !== 'string') return false;
  
  // If we expect a specific type, check it. 
  if (payload.type === expectedType) return true;
  
  if (expectedType === 'user' && payload.type === 'merchant') return true;

  if (
    expectedType === 'admin' && 
    (payload.type === 'admin' || payload.role === 'ADMIN' || payload.role === 'MASTER_ADMIN' || payload.role === 'SUPER_ADMIN')
  ) {
    return true;
  }

  return false;
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (!isValidTokenType(token, 'user')) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function setStoredToken(token: string): void {
  if (token && isValidTokenType(token, 'user')) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    console.warn('[Security] Refusing to store invalid user token: payload.type is not "user".');
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): { id?: string; fullName?: string; phone?: string; [key: string]: any } | null {
  const token = getStoredToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) return null;
  return {
    id: payload.sub,
    fullName: payload.fullName || '',
    phone: payload.phone || '',
    ...payload
  };
}

export function getStoredMerchantToken(): string | null {
  const token = localStorage.getItem(MERCHANT_TOKEN_KEY);
  if (!token) return null;
  if (!isValidTokenType(token, 'merchant')) {
    localStorage.removeItem(MERCHANT_TOKEN_KEY);
    return null;
  }
  return token;
}

export function setStoredMerchantToken(token: string): void {
  if (token && isValidTokenType(token, 'merchant')) {
    localStorage.setItem(MERCHANT_TOKEN_KEY, token);
  } else {
    console.warn('[Security] Refusing to store invalid merchant token: payload.type is not "merchant".');
    localStorage.removeItem(MERCHANT_TOKEN_KEY);
  }
}

export function removeStoredMerchantToken(): void {
  localStorage.removeItem(MERCHANT_TOKEN_KEY);
}

export function getStoredRiderToken(): string | null {
  const token = localStorage.getItem(RIDER_TOKEN_KEY);
  if (!token) return null;
  if (!isValidTokenType(token, 'rider')) {
    localStorage.removeItem(RIDER_TOKEN_KEY);
    return null;
  }
  return token;
}

export function setStoredRiderToken(token: string): void {
  if (token && isValidTokenType(token, 'rider')) {
    localStorage.setItem(RIDER_TOKEN_KEY, token);
  } else {
    console.warn('[Security] Refusing to store invalid rider token: payload.type is not "rider".');
    localStorage.removeItem(RIDER_TOKEN_KEY);
  }
}

export function removeStoredRiderToken(): void {
  localStorage.removeItem(RIDER_TOKEN_KEY);
}

export function getStoredRider(): { id?: string; fullName?: string; phone?: string; [key: string]: any } | null {
  const token = getStoredRiderToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) return null;
  return {
    id: payload.sub,
    fullName: payload.fullName || '',
    phone: payload.phone || '',
    ...payload
  };
}

export function getStoredAdminToken(): string | null {
  let token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || 
              localStorage.getItem(ADMIN_TOKEN_KEY) || 
              sessionStorage.getItem('admin_token') ||
              localStorage.getItem('admin_token') ||
              sessionStorage.getItem('cave_companions_admin_key') || 
              localStorage.getItem('cave_companions_admin_key');
              
  if (!token) {
    const userToken = localStorage.getItem(TOKEN_KEY);
    if (userToken && isValidTokenType(userToken, 'admin')) {
      return userToken;
    }
    const merchantToken = localStorage.getItem(MERCHANT_TOKEN_KEY);
    if (merchantToken && isValidTokenType(merchantToken, 'admin')) {
      return merchantToken;
    }
    return null;
  }

  if (!isValidTokenType(token, 'admin')) {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token');
    const userToken = localStorage.getItem(TOKEN_KEY);
    if (userToken && isValidTokenType(userToken, 'admin')) {
      return userToken;
    }
    const merchantToken = localStorage.getItem(MERCHANT_TOKEN_KEY);
    if (merchantToken && isValidTokenType(merchantToken, 'admin')) {
      return merchantToken;
    }
    return null;
  }
  return token;
}

export function setStoredAdminToken(token: string): void {
  if (token && isValidTokenType(token, 'admin')) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token', token);
  } else {
    console.warn('[Security] Refusing to store invalid admin token: payload.type is not "admin".');
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token');
  }
}

export function removeStoredAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem('admin_token');
  localStorage.removeItem('admin_token');
  sessionStorage.removeItem('cave_companions_admin_key');
  localStorage.removeItem('cave_companions_admin_key');
}

// In a full-stack SPA, API routes are served on the same origin (Express + Vite).
// Using relative paths prevents CORS issues and domain mismatches across preview, iframe, dev, and production.
const API_BASE_URL = '';

function triggerFileDownload(blob: Blob, filename: string, format: string) {
  console.log(`[triggerFileDownload] Starting download for: ${filename}, format: ${format}, size: ${blob.size} bytes`);
  
  if (!blob || blob.size === 0) {
    const errMsg = 'ফাইল জেনারেশন ব্যর্থ হয়েছে (Blob size is 0)। দয়া করে আবার চেষ্টা করুন।';
    console.error(`[triggerFileDownload] Error: ${errMsg}`);
    alert(errMsg);
    throw new Error(errMsg);
  }

  const blobUrl = window.URL.createObjectURL(blob);
  
  // Create pure download link without target="_blank"
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
    console.log('[triggerFileDownload] Click triggered on anchor element successfully.');
  } catch (err) {
    console.error('[triggerFileDownload] Direct click failed, trying dispatchEvent:', err);
    try {
      const event = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
      link.dispatchEvent(event);
    } catch (dispatchErr) {
      console.error('[triggerFileDownload] Event dispatch failed:', dispatchErr);
    }
  }

  // Keep the link element in DOM for a short time to let Chrome register the click
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 5000);

  // CRITICAL BUG FIX FOR ANDROID CHROME:
  // "Do not revoke the Blob URL immediately after link.click()."
  // Android Chrome's download manager takes time to queue and download the blob URL content.
  // Revoking it too early (like after 1s or 30s) can lead to "1 download pending" or interrupted downloads.
  // We will extend the revoke timeout to 5 minutes (300,000 ms) or let it persist so Chrome always completes the download!
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(blobUrl);
      console.log(`[triggerFileDownload] Revoked blob URL: ${blobUrl}`);
    } catch (err) {
      console.error('[triggerFileDownload] Error revoking blob URL:', err);
    }
  }, 300000); // 5 minutes
}

async function request<T>(endpoint: string, options: RequestInit = {}, isMerchant = false, timeoutMs = 45000, retryCount = 0): Promise<T> {
  const resolvedUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  let token: string | null = null;
  const isRiderEndpoint = endpoint.startsWith('/api/rider/') && 
                          !endpoint.includes('/login') && 
                          !endpoint.includes('/register');
  const isMerchantEndpoint = endpoint.startsWith('/api/merchant/') && 
                            !endpoint.includes('/login') && 
                            !endpoint.includes('/otp');

  if ((endpoint.startsWith('/api/admin/') || endpoint.includes('/admin/')) && endpoint !== '/api/admin/verify') {
    token = getStoredAdminToken();
  } else if (isRiderEndpoint) {
    token = getStoredRiderToken();
  } else if (isMerchant || isMerchantEndpoint) {
    token = getStoredMerchantToken();
  } else {
    token = getStoredToken() || getStoredMerchantToken() || getStoredAdminToken() || getStoredRiderToken();
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (endpoint.includes('/auth/login') || endpoint.includes('/merchant/login') || endpoint.includes('/admin/')) {
    let safeBodyInfo = null;
    if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body);
        safeBodyInfo = {
          bodyKeys: Object.keys(parsed),
          identifierProvided: !!(parsed.identifier || parsed.email || parsed.phone || parsed.adminKey),
          passwordOrPinProvided: !!(parsed.password || parsed.pin || parsed.adminToken)
        };
      } catch (e) {
        safeBodyInfo = 'non-json-body';
      }
    }
    console.log('[API Client login request]', {
      endpoint,
      resolvedUrl,
      method: options.method || 'GET',
      safeBodyInfo
    });
  }

  let response: Response;
  try {
    response = await fetch(resolvedUrl, {
      ...options,
      headers,
      signal: controller.signal
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (retryCount < 1) {
        console.log(`[API] Timeout on ${resolvedUrl}. Retrying (${retryCount + 1}/1)...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        return request<T>(endpoint, options, isMerchant, timeoutMs, retryCount + 1);
      }
      const timeoutErr: any = new Error('সার্ভার সাড়া দিতে সময় নিচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      timeoutErr.isTimeout = true;
      timeoutErr.url = resolvedUrl;
      timeoutErr.endpoint = endpoint;
      throw timeoutErr;
    }
    if (retryCount < 1) {
      console.log(`[API] Network error on ${resolvedUrl}. Retrying (${retryCount + 1}/1)...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return request<T>(endpoint, options, isMerchant, timeoutMs, retryCount + 1);
    }
    const netErr: any = new Error('নেটওয়ার্ক সংযোগে সমস্যা হয়েছে। ইন্টারনেট সংযোগ বা CORS নীতি চেক করে আবার চেষ্টা করুন।');
    netErr.isNetworkError = true;
    netErr.originalError = error;
    netErr.url = resolvedUrl;
    netErr.endpoint = endpoint;
    throw netErr;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response && (response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
    if (endpoint.startsWith('/api/admin/') || endpoint.includes('/admin/')) {
      console.warn('[API] Admin session unauthorized/forbidden. Triggering automatic logout event.');
      window.dispatchEvent(new CustomEvent('admin-unauthorized', { detail: { status: response.status } }));
    }
  }

  let data: any = {};

  try {
    const text = await response.text();
    if (!text) {
      data = { success: response.ok };
    } else {
      try {
        data = JSON.parse(text);
        // Also check if JSON returned a 429 rate limit
        if (response.status === 429 && retryCount < 5) {
          console.log(`[API] Received 429 Rate Limit. Backing off & Retrying ${retryCount + 1}/5...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return request<T>(endpoint, options, isMerchant, timeoutMs, retryCount + 1);
        }
      } catch (parseError) {
        // Detect AI Studio proxy holding page (cold start), Vite HTML fallback, or NGINX Rate limit
        const isHoldingPage = text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('Please wait');
        const isRateLimit = response.status === 429 || text.includes('Rate exceeded') || text.includes('Too Many Requests');
        
        if ((isHoldingPage || isRateLimit) && retryCount < 5) {
          console.log(`[API] Detected Proxy interception / Rate Limit (Status ${response.status}). Retrying ${retryCount + 1}/5...`);
          const delay = isRateLimit ? (retryCount + 1) * 1200 : 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          return request<T>(endpoint, options, isMerchant, timeoutMs, retryCount + 1);
        }
        console.warn(`Non-JSON response from ${resolvedUrl} (status ${response.status}):`, text.slice(0, 150));
        const isHtml = text.trim().startsWith('<') || text.includes('<!DOCTYPE html>') || text.includes('<html');
        const cleanMsg = response.status === 429 || isRateLimit
          ? 'সার্ভার ব্যস্ত রয়েছে। কিছু মুহূর্ত অপেক্ষা করে আবার চেষ্টা করুন।'
          : isHtml 
          ? (response.status === 403 ? 'প্রবেশাধিকার সংরক্ষিত বা অননুমোদিত সেশন (HTTP 403)।' : response.status === 401 ? 'এডমিন অনুমোদনের প্রয়োজন (HTTP 401)।' : `সার্ভার প্রতিক্রিয়া দিতে ব্যর্থ হয়েছে (HTTP ${response.status})`)
          : `সার্ভার প্রতিক্রিয়া দিতে ব্যর্থ হয়েছে (HTTP ${response.status}): ${text.slice(0, 50).trim()}`;
        const nonJsonErr: any = new Error(cleanMsg);
        nonJsonErr.status = response.status;
        nonJsonErr.rawText = text;
        nonJsonErr.url = resolvedUrl;
        nonJsonErr.endpoint = endpoint;
        throw nonJsonErr;
      }
    }
  } catch (err: any) {
    if (err.status) throw err;
    const readErr: any = new Error(err.message || `সার্ভার থেকে ডাটা পড়তে সমস্যা হয়েছে`);
    readErr.url = resolvedUrl;
    readErr.endpoint = endpoint;
    throw readErr;
  }

  if (!response.ok || data.success === false) {
    let rawMsg = data.message || data.error || `অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে (HTTP ${response.status})।`;
    const isSuspended = (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'SHOP_SUSPENDED' || data.code === 'USER_SUSPENDED') ||
                        (rawMsg.includes('ACCOUNT_SUSPENDED')) ||
                        (rawMsg.includes('সাসপেন্ড') && !rawMsg.includes('বিদ্যমান নেই') && !rawMsg.includes('পাওয়া যায়নি'));

    if (isSuspended && !rawMsg.includes('অ্যাকাউন্টটি')) {
      rawMsg = 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।';
    } else if (response.status === 403 && !data.message && !data.error) {
      rawMsg = 'প্রবেশাধিকার সংরক্ষিত বা অননুমোদিত সেশন (HTTP 403)।';
    }
    const errorMsg = rawMsg;
    const apiError: any = new Error(errorMsg);
    apiError.status = response.status;
    apiError.data = data;
    apiError.code = data.code || data.error;
    apiError.response = {
      status: response.status,
      statusText: response.statusText,
      data: data
    };
    apiError.url = resolvedUrl;
    apiError.endpoint = endpoint;
    throw apiError;
  }

  return data;
}

export const api = {

  // ==========================================
  // COUPON MANAGEMENT
  // ==========================================
  getAdminCoupons: () =>
    request<{ success: boolean; coupons: any[] }>('/api/admin/coupons', {}, false),

  createAdminCoupon: (coupon: any) =>
    request<{ success: boolean }>('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(coupon),
    }, false),

  deleteAdminCoupon: (id: string) =>
    request<{ success: boolean }>(`/api/admin/coupons/${id}`, {
      method: 'DELETE',
    }, false),

  updateAdminCouponStatus: (id: string, isActive: boolean) =>
    request<{ success: boolean }>(`/api/admin/coupons/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, false),

  updateAdminCouponUsageLimit: (id: string, usageLimit: number) =>
    request<{ success: boolean }>(`/api/admin/coupons/${id}/usage-limit`, {
      method: 'PATCH',
      body: JSON.stringify({ usageLimit }),
    }, false),

  // Advertisement & Cave Media Upload
  uploadMedia: (fileData: string, fileName?: string) =>
    request<{ success: boolean; url: string }>('/api/admin/upload-media', {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName }),
    }, false, 300000),

  // Auth
  getGoogleConfig: () =>
    request<{ clientId: string }>('/api/auth/google-config', { method: 'GET' }),

  googleLogin: (credential: string) =>
    request<{
      success: boolean;
      token?: string;
      user?: User;
      error?: string;
      message: string;
      linkingEmail?: string;
      googleSub?: string;
      googleEmail?: string;
      googleName?: string;
      googlePhoto?: string;
    }>('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ credential })
    }),

  googleLink: (data: { credential: string; googleSub: string; googleEmail: string; password: string }) =>
    request<{
      success: boolean;
      token?: string;
      user?: User;
      error?: string;
      message: string;
    }>('/api/auth/google-link', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  googleRegister: (data: {
    credential: string;
    googleSub: string;
    googleEmail: string;
    fullName: string;
    phone: string;
    gender: string;
    age?: number;
    district?: string;
    upazila?: string;
    address?: string;
  }) =>
    request<{
      success: boolean;
      token?: string;
      user?: User;
      error?: string;
      message: string;
    }>('/api/auth/google-register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: (identifier: string, password: string) =>
    request<{
      success: boolean;
      message: string;
      token: string;
      user: User;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    }),

  registerRequest: (data: {
    fullName: string;
    phone: string;
    email?: string;
    gender: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    district?: string;
    upazila?: string;
    address?: string;
    password: string;
    confirmPassword: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      devOtp?: string;
      identifier: string;
    }>('/api/auth/register-request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  registerVerify: (identifier: string, code: string) =>
    request<{
      success: boolean;
      message: string;
      token: string;
      user: User;
    }>('/api/auth/register-verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code })
    }),

  forgotPasswordRequest: (identifier: string) =>
    request<{
      success: boolean;
      message: string;
      devOtp?: string;
      identifier: string;
    }>('/api/auth/forgot-password-request', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    }),

  forgotPasswordVerify: (identifier: string, code: string, newPassword: string, confirmPassword: string) =>
    request<{
      success: boolean;
      message: string;
    }>('/api/auth/forgot-password-verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, newPassword, confirmPassword })
    }),

  requestOtp: (phone: string, fullName?: string) =>
    request<{
      success: boolean;
      message: string;
      isExistingUser: boolean;
      devOtp?: string;
      phone: string;
    }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, fullName })
    }),

  verifyOtp: (phone: string, code: string, fullName?: string) =>
    request<{
      success: boolean;
      message: string;
      token: string;
      user: User;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code, fullName })
    }),

  getMe: () =>
    request<{
      success: boolean;
      user: User;
      todayStatus: {
        date: string;
        completedCount: number;
        attendances: PrayerAttendance[];
      };
      stats: UserLifetimeStats;
    }>('/api/auth/me'),

  updateProfile: (data: {
    fullName?: string;
    photoUrl?: string;
    address?: string;
    district?: string;
    upazila?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    gender?: string;
  } | string, photoUrl?: string, address?: string) => {
    const payload = typeof data === 'string'
      ? { fullName: data, photoUrl, address }
      : data;
    return request<{
      success: boolean;
      message: string;
      user: User;
    }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteAccount: (password?: string, confirmText?: string) =>
    request<{
      success: boolean;
      message: string;
    }>('/api/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmText })
    }),

  // Prayers
  getTodayPrayers: () =>
    request<TodayPrayerStatus>('/api/prayers/today'),

  syncOfflineCheckIn: async (prayerType: PrayerType, mosqueIdOrQrData?: string, lat?: number, lng?: number, savedAtOrScannedAt?: string, accuracy?: number) => {
    return await request<{
      success: boolean;
      message: string;
      securityStatus?: string;
      riskScore?: number;
      riskReasons?: string[];
      attendance?: PrayerAttendance;
      mosque?: Mosque;
      prayerType?: PrayerType;
      prayerNameBn?: string;
      todayCompletedCount?: number;
      summaryText?: string;
      tokenResult?: { success: boolean; message: string; action?: string; token?: any };
    }>('/api/prayers/verify', {
      method: 'POST',
      body: JSON.stringify({
        prayerType,
        mosqueId: mosqueIdOrQrData,
        lat,
        lng,
        accuracy,
        savedAt: savedAtOrScannedAt,
        scannedAt: savedAtOrScannedAt
      })
    }, false, 15000);
  },

  verifyPrayer: async (
    prayerType: PrayerType,
    params?: {
      mosqueId?: string;
      lat?: number;
      lng?: number;
      accuracy?: number;
      savedAt?: string;
      scannedAt?: string;
      qrData?: string;
      isMock?: boolean;
      spoofSignals?: string[];
      sampleVariance?: number;
    } | string,
    latArg?: number,
    lngArg?: number,
    savedAtArg?: string
  ) => {
    let mosqueId: string | undefined;
    let lat: number | undefined = latArg;
    let lng: number | undefined = lngArg;
    let accuracy: number | undefined;
    let savedAt: string | undefined = savedAtArg;
    let qrData: string | undefined;
    let isMock: boolean | undefined;
    let spoofSignals: string[] | undefined;
    let sampleVariance: number | undefined;

    if (typeof params === 'string') {
      qrData = params;
      mosqueId = params;
    } else if (params && typeof params === 'object') {
      mosqueId = params.mosqueId;
      lat = params.lat ?? latArg;
      lng = params.lng ?? lngArg;
      accuracy = params.accuracy;
      savedAt = params.savedAt ?? params.scannedAt ?? savedAtArg;
      qrData = params.qrData ?? params.mosqueId;
      isMock = params.isMock;
      spoofSignals = params.spoofSignals;
      sampleVariance = params.sampleVariance;
    }

    // If this is an explicit offline sync submission with savedAt timestamp, do not fallback to offline queue
    if (savedAt) {
      return api.syncOfflineCheckIn(prayerType, mosqueId || qrData, lat, lng, savedAt);
    }

    // Check offlineSyncService for cache and mosques list
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const performOfflineFallback = () => {
      // Validate the prayer time window offline on the client first
      const storedUser = getStoredUser();
      const userGender = storedUser?.gender || 'male';
      const timeValidation = isClientPrayerTimeValidOffline(prayerType, lat, lng, userGender);
      if (!timeValidation.valid) {
        throw new Error(timeValidation.reason || 'এই ছালাতের নির্ধারিত সময় এখন নয়।');
      }

      const cachedMosques = offlineSyncService.getCachedMosques();
      const matchedMosque = cachedMosques.find(m => m.id === mosqueId || m.qrIdentifier === mosqueId || m.qrIdentifier === qrData);
      
      let mosqueName = 'নিবন্ধিত মসজিদ';
      if (userGender === 'female' || mosqueId === 'FEMALE_DIRECT' || qrData === 'FEMALE_DIRECT') {
        mosqueName = 'গৃহ সালাত / জামাত';
      } else if (matchedMosque) {
        mosqueName = matchedMosque.nameBn || matchedMosque.name;
      }

      // Add to offline queue
      offlineSyncService.addPendingCheckIn(prayerType, mosqueId || qrData || 'LOCATION_VERIFIED', lat, lng);

      // Return simulated success response
      return {
        success: true,
        message: 'আলহামদুলিল্লাহ্! অফলাইনে আপনার উপস্থিতি ক্যাশ করা হয়েছে। ইন্টারনেট সংযোগ ফিরলে এটি সিঙ্ক হবে।',
        isOfflineCached: true,
        attendance: {
          id: 'offline-' + Date.now(),
          mosqueName: mosqueName,
          prayerType: prayerType,
          verifiedAt: new Date().toISOString()
        },
        mosque: matchedMosque || {
          id: mosqueId || 'offline-mosque',
          name: mosqueName,
          nameBn: mosqueName,
          address: 'অফলাইন লোকেশন',
          qrIdentifier: mosqueId || 'LOCATION_VERIFIED',
          area: 'অফলাইন',
          district: 'বাংলাদেশ',
          status: 'active',
          createdAt: new Date().toISOString()
        },
        prayerType: prayerType,
        prayerNameBn: prayerType === 'fajr' ? 'ফজর' : (prayerType === 'dhuhr' ? 'যোহর' : (prayerType === 'jumuah' ? 'জুমআ' : (prayerType === 'asr' ? 'আসর' : (prayerType === 'maghrib' ? 'মাগরিব' : 'এশা')))),
        todayCompletedCount: 1,
        summaryText: 'অফলাইন ভেরিফিকেশন সফল',
        tokenResult: {
          success: true,
          message: 'পেন্ডিং টোকেন: ২ 🪙 (পরবর্তীতে ইন্টারনেট পেলেই এটি আপনার একাউন্টে যোগ হবে)'
        }
      };
    };

    if (isOffline) {
      return performOfflineFallback();
    }

    try {
      return await request<{
        success: boolean;
        message: string;
        attendance: PrayerAttendance;
        mosque: Mosque;
        prayerType: PrayerType;
        prayerNameBn: string;
        todayCompletedCount: number;
        summaryText: string;
        tokenResult?: { success: boolean; message: string };
      }>('/api/prayers/verify', {
        method: 'POST',
        body: JSON.stringify({
          prayerType,
          mosqueId,
          qrData,
          lat,
          lng,
          accuracy,
          isMock,
          spoofSignals,
          sampleVariance
        })
      });
    } catch (err: any) {
      console.warn('[API Client] verifyPrayer failed, checking network status:', err);
      // Catch network-related fetch errors
      const isNetworkError = !err.response && !err.status && (err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('timeout'));
      if (isNetworkError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return performOfflineFallback();
      }
      throw err;
    }
  },

  verifyPrayerQr: async (prayerType: PrayerType, qrData: string, lat?: number, lng?: number, scannedAt?: string) => {
    return api.verifyPrayer(prayerType, { qrData, mosqueId: qrData, lat, lng, scannedAt });
  },

  getPrayerHistory: (limit = 50) =>
    request<{
      success: boolean;
      count: number;
      history: PrayerAttendance[];
    }>(`/api/prayers/history?limit=${limit}`),

  getPrayerStats: () =>
    request<{
      success: boolean;
      todayCompletedCount: number;
      date: string;
      stats: UserLifetimeStats;
    }>('/api/prayers/stats'),

  // Mosques
  getMosques: () =>
    request<{
      success: boolean;
      count: number;
      mosques: Mosque[];
    }>('/api/mosques'),

  checkMosqueDuplicates: (params: { name?: string; nameBn?: string; latitude?: number; longitude?: number; excludeId?: string }) => {
    const query = new URLSearchParams();
    if (params.name) query.append('name', params.name);
    if (params.nameBn) query.append('nameBn', params.nameBn);
    if (params.latitude) query.append('latitude', String(params.latitude));
    if (params.longitude) query.append('longitude', String(params.longitude));
    if (params.excludeId) query.append('excludeId', params.excludeId);
    return request<{
      success: boolean;
      count: number;
      duplicates: Array<{ mosque: Mosque; reason: string }>;
    }>(`/api/mosques/check-duplicates?${query.toString()}`);
  },

  uploadMosquePhoto: (data: { imageBase64: string; filename?: string; mimeType?: string }) =>
    request<{
      success: boolean;
      mediaId: string;
      url: string;
      message: string;
    }>('/api/mosques/upload-photo', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  requestMosque: (data: {
    name: string;
    nameBn?: string;
    address: string;
    area: string;
    district: string;
    imamName?: string;
    contactNumber?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    imageUrl?: string;
    imamImageUrl?: string;
    applicantName?: string;
    applicantPhone?: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      mosque: Mosque;
      duplicateWarnings?: Array<{ mosque: Mosque; reason: string }>;
    }>('/api/mosques/request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMyMosqueRequests: () =>
    request<{
      success: boolean;
      requests: Mosque[];
    }>('/api/mosques/my-requests'),

  lookupMosque: (params: { id?: string; name?: string }) => {
    const query = new URLSearchParams();
    if (params.id) query.append('id', params.id);
    if (params.name) query.append('name', params.name);
    return request<{
      success: boolean;
      mosque: Mosque;
    }>(`/api/mosques/find/lookup?${query.toString()}`);
  },

  lookupUser: (identifier: string) =>
    request<{
      success: boolean;
      user: {
        id: string;
        fullName: string;
        phone: string;
        email?: string | null;
        gender?: string;
        age?: number | null;
        dateOfBirth?: string | null;
        maritalStatus?: string | null;
        district?: string | null;
        upazila?: string | null;
        address?: string | null;
        isVerified?: boolean;
        photoUrl?: string | null;
        status?: string;
        createdAt?: string;
        lastLoginAt?: string;
        totalPrayers?: number;
        availableTokens?: number;
        redeemedTokens?: number;
      };
    }>(`/api/auth/lookup/${encodeURIComponent(identifier)}`),

  getMosqueQrDataUrl: (mosqueId: string) =>
    request<{
      success: boolean;
      mosqueId: string;
      mosqueName: string;
      mosqueNameBn: string;
      qrIdentifier: string;
      qrPayload: string;
      qrDataUrl: string;
    }>(`/api/mosques/${mosqueId}/qr-dataurl`),

  // Tokens (Phase 4 & 5)
  getMyTokens: () =>
    request<MyTokensResponse>('/api/tokens/my-tokens'),

  getTokenById: (tokenId: string) =>
    request<{
      success: boolean;
      token: UserToken;
    }>(`/api/tokens/${tokenId}`),

  prepareUseToken: (tokenId: string) =>
    request<{
      success: boolean;
      canProceed: boolean;
      token: UserToken;
      todayDate: string;
      message: string;
    }>(`/api/tokens/${tokenId}/prepare-use`, {
      method: 'POST'
    }),

  evaluateTodayTokens: () =>
    request<{
      success: boolean;
      action: string;
      token: UserToken | null;
      availableCount: number;
      todayDate: string;
    }>('/api/tokens/evaluate-today', {
      method: 'POST'
    }),

  donateToken: (tokenId: string) =>
    request<{
      success: boolean;
      message: string;
      token: UserToken;
    }>(`/api/tokens/${tokenId}/donate`, {
      method: 'POST'
    }),

  deleteUsedTokenHistory: (tokenId?: string) =>
    request<{
      success: boolean;
      message: string;
      deletedCount: number;
    }>(`/api/tokens/history/used${tokenId ? `/${tokenId}` : ''}`, {
      method: 'DELETE'
    }),

  deleteDonatedTokenHistory: (tokenId?: string) =>
    request<{
      success: boolean;
      message: string;
      deletedCount: number;
    }>(`/api/tokens/history/donated${tokenId ? `/${tokenId}` : ''}`, {
      method: 'DELETE'
    }),

  getPreviousDayStatus: () =>
    request<{
      success: boolean;
      gracePeriod: {
        inGracePeriod: boolean;
        yesterdayDateStr: string;
        currentHour: number;
        remainingMinutes: number;
      };
      status: {
        eligible: boolean;
        inGracePeriod: boolean;
        token: UserToken | null;
        yesterdayDateStr: string;
        prayerCount: number;
        action: string;
        message: string;
      };
    }>('/api/tokens/previous-day-status'),

  claimPreviousDayToken: () =>
    request<{
      success: boolean;
      action: string;
      token: UserToken | null;
      yesterdayDateStr: string;
      prayerCount: number;
      message: string;
    }>('/api/tokens/claim-previous-day', {
      method: 'POST'
    }),

  redeemToken: (tokenId: string, shopDetails?: { shopId?: string; merchantId?: string; discount?: number; transactionAmount?: number }) =>
    request<{
      success: boolean;
      message: string;
      token: UserToken;
      redemption: any;
    }>(`/api/tokens/${tokenId}/redeem`, {
      method: 'POST',
      body: JSON.stringify(shopDetails || {})
    }),

  // ==========================================
  // PHASE 6: PARTNER SHOPS & USER REDEMPTION
  // ==========================================
  getShops: (params?: { category?: string; search?: string; lat?: number; lng?: number }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.lat !== undefined && params?.lat !== null) query.set('lat', String(params.lat));
    if (params?.lng !== undefined && params?.lng !== null) query.set('lng', String(params.lng));

    const queryString = query.toString();
    return request<{
      success: boolean;
      count: number;
      shops: PartnerShop[];
    }>(`/api/shops${queryString ? `?${queryString}` : ''}`);
  },

  getShopById: (shopId: string) =>
    request<{
      success: boolean;
      shop: PartnerShop;
    }>(`/api/shops/${shopId}`),

  verifyShopQr: (qrPayload: string) =>
    request<{
      success: boolean;
      shop: PartnerShop;
      verificationId: string;
      message: string;
    }>('/api/shops/verify-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload })
    }),

  requestTokenRedemption: (tokenId: string, verificationId: string, purchaseAmount: number) =>
    request<{
      success: boolean;
      request: TokenRedemptionRequest;
      message: string;
    }>('/api/shops/request-redemption', {
      method: 'POST',
      body: JSON.stringify({ tokenId, verificationId, purchaseAmount })
    }),

  getRedemptionRequest: (requestId: string) =>
    request<{
      success: boolean;
      request: TokenRedemptionRequest;
    }>(`/api/shops/redemption-requests/${requestId}`),

  cancelRedemptionRequest: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/shops/redemption-requests/${requestId}/cancel`, {
      method: 'POST'
    }),

  getMyRedemptionRequests: () =>
    request<{
      success: boolean;
      requests: TokenRedemptionRequest[];
    }>('/api/shops/my/redemption-requests'),

  redeemTokenAtShop: (tokenId: string, verificationId: string, purchaseAmount: number) =>
    request<{
      success: boolean;
      redemption: UserRedemptionRecord;
      message: string;
    }>('/api/shops/redeem', {
      method: 'POST',
      body: JSON.stringify({ tokenId, verificationId, purchaseAmount })
    }),

  getMyRedemptions: () =>
    request<{
      success: boolean;
      count: number;
      redemptions: UserRedemptionRecord[];
    }>('/api/shops/my/redemptions'),

  getShopReviews: (shopId: string) =>
    request<{
      success: boolean;
      shopId: string;
      averageRating: number;
      totalReviews: number;
      ratingDistribution?: Record<number, number>;
      reviews: ShopReview[];
    }>(`/api/shops/${shopId}/reviews`),

  submitShopReview: (shopId: string, rating: number, comment: string) =>
    request<{
      success: boolean;
      message: string;
      review: ShopReview;
    }>(`/api/shops/${shopId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    }),

  deleteShopReview: (shopId: string, reviewId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/shops/${shopId}/reviews/${reviewId}`, {
      method: 'DELETE'
    }),

  replyToShopReview: (shopId: string, reviewId: string, reply: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/shops/${shopId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply })
    }, true),

  getProductReviews: (productId: string) =>
    request<{
      success: boolean;
      productId: string;
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
      reviews: any[];
    }>(`/api/shops/products/${productId}/reviews`),

  submitProductReview: (productId: string, rating: number, comment: string) =>
    request<{
      success: boolean;
      message: string;
      review: any;
    }>(`/api/shops/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    }),

  deleteProductReview: (productId: string, reviewId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/shops/products/${productId}/reviews/${reviewId}`, {
      method: 'DELETE'
    }),

  // ==========================================
  // PHASE 7: MERCHANT PORTAL
  // ==========================================
  requestMerchantOtp: (phone: string) =>
    request<{
      success: boolean;
      message: string;
      devOtpCode?: string;
    }>('/api/merchant/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    }),

  verifyMerchantOtp: (phone: string, otpCode: string) =>
    request<{
      success: boolean;
      message: string;
    }>('/api/merchant/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otpCode })
    }),

  uploadMerchantDocument: (fileData: string, fileName?: string, documentType?: string) =>
    request<{
      success: boolean;
      url: string;
      fileName: string;
      message: string;
    }>('/api/merchant/upload-document', {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName, documentType })
    }),

  getCommissionPolicy: () =>
    request<{
      success: boolean;
      policy: import('../types').CommissionPolicy;
    }>('/api/merchant/commission-policy'),

  submitMerchantRegistration: (data: any) =>
    request<{
      success: boolean;
      token: string;
      message: string;
      merchant: MerchantUser;
      shop: PartnerShop;
      verification: import('../types').MerchantVerificationRecord;
    }>('/api/merchant/submit-registration', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMerchantRegistrationStatus: () =>
    request<{
      success: boolean;
      verificationStatus: string;
      verification: import('../types').MerchantVerificationRecord;
      shop: PartnerShop;
    }>('/api/merchant/registration-status', {}, true),

  getMerchantRegistrationDetails: () =>
    request<{
      success: boolean;
      verification: import('../types').MerchantVerificationRecord;
      shop: PartnerShop;
    }>('/api/merchant/registration-details', {}, true),

  resubmitMerchantRegistration: (data: any) =>
    request<{
      success: boolean;
      message: string;
      verification: import('../types').MerchantVerificationRecord;
      shop: PartnerShop;
    }>('/api/merchant/registration', {
      method: 'PUT',
      body: JSON.stringify(data)
    }, true),

  getMapsConfig: () =>
    request<{
      success: boolean;
      hasKey: boolean;
      apiKey: string;
    }>('/api/maps/config'),

  reverseGeocode: (lat: number, lng: number) =>
    request<{
      success: boolean;
      source: string;
      formattedAddress: string;
      upazilaThana?: string;
      district?: string;
      division?: string;
      postalCode?: string;
      lat: number;
      lng: number;
    }>(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`),

  searchMapsLocations: (query: string) =>
    request<{
      success: boolean;
      source: string;
      results: Array<{
        id: string;
        name: string;
        nameBn?: string;
        address: string;
        lat: number;
        lng: number;
      }>;
    }>(`/api/maps/search?q=${encodeURIComponent(query)}`),

  merchantLogin: (phone: string, pin: string) =>
    request<{
      success: boolean;
      token: string;
      merchant: MerchantUser;
      shop: PartnerShop;
      verification?: import('../types').MerchantVerificationRecord;
      message: string;
    }>('/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin })
    }),

  merchantForgotPasswordRequest: (identifier: string) =>
    request<{ success: boolean; message: string; devOtpCode?: string; identifier: string }>('/api/merchant/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    }),

  merchantForgotPasswordVerify: (identifier: string, code: string) =>
    request<{ success: boolean; message: string; identifier: string }>('/api/merchant/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code })
    }),

  merchantForgotPasswordReset: (data: { identifier: string; code?: string; newPin: string; confirmPin?: string }) =>
    request<{ success: boolean; message: string }>('/api/merchant/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  registerMerchant: (data: { shopName: string; managerName: string; phone: string; address: string; pin: string }) =>
    request<{
      success: boolean;
      message: string;
      shop: PartnerShop;
      merchant: MerchantUser;
    }>('/api/merchant/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMerchantMe: () =>
    request<{
      success: boolean;
      merchant: MerchantUser;
      shop: PartnerShop;
      verification?: import('../types').MerchantVerificationRecord;
    }>('/api/merchant/me', {}, true),

  getMerchantDashboard: () =>
    request<{
      success: boolean;
      stats: MerchantDashboardStats;
      todayDate: string;
    }>('/api/merchant/dashboard', {}, true),

  getMerchantTransactions: (filters?: string | { date?: string; dateFrom?: string; dateTo?: string; tokenType?: string }) => {
    let url = '/api/merchant/transactions';
    if (typeof filters === 'string') {
      url = `/api/merchant/transactions?date=${filters}`;
    } else if (filters) {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.tokenType) params.append('tokenType', filters.tokenType);
      const qs = params.toString();
      if (qs) url = `/api/merchant/transactions?${qs}`;
    }
    return request<{
      success: boolean;
      count: number;
      transactions: MerchantTransactionRecord[];
    }>(url, {}, true);
  },

  getMerchantTransactionsSummary: (filters?: { dateFrom?: string; dateTo?: string; tokenType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.tokenType) params.append('tokenType', filters.tokenType);
    const qs = params.toString();
    const url = qs ? `/api/merchant/transactions/summary?${qs}` : '/api/merchant/transactions/summary';
    return request<{
      success: boolean;
      summary: {
        totalAmount: number;
        totalCommission: number;
        totalCount: number;
      };
    }>(url, {}, true);
  },

  downloadMerchantFinancialReport: async (filters: { format?: string; dateFrom?: string; dateTo?: string; tokenType?: string }) => {
    const token = getStoredMerchantToken();
    const params = new URLSearchParams();
    if (filters.format) params.append('format', filters.format);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.tokenType) params.append('tokenType', filters.tokenType);

    const url = `${API_BASE_URL}/api/merchant/transactions/export?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`[downloadMerchantFinancialReport] Fetching merchant report from server: ${url}`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let errorMsg = 'রিপোর্ট ডাউনলোড করতে ব্যর্থ হয়েছে।';
        try {
          const errJson = await res.json();
          if (errJson.message) errorMsg = errJson.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const format = (filters.format || 'pdf').toLowerCase();
      
      console.log('[downloadMerchantFinancialReport] Reading response as Blob...');
      const blob = await res.blob();
      console.log(`[downloadMerchantFinancialReport] Received Blob size: ${blob.size} bytes, type: ${blob.type}`);

      let filename = `merchant-financial-report.${format === 'pdf' ? 'pdf' : (format === 'csv' ? 'csv' : 'xlsx')}`;
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      triggerFileDownload(blob, filename, format);
      return { success: true };
    } catch (err: any) {
      console.error('[downloadMerchantFinancialReport] Error:', err);
      alert(`ডাউনলোড ব্যর্থ হয়েছে: ${err.message || err}`);
      throw err;
    }
  },

  getMerchantRedemptionRequests: (status?: string) => {
    const url = status && status !== 'ALL'
      ? `/api/merchant/redemption-requests?status=${status}`
      : '/api/merchant/redemption-requests';
    return request<{
      success: boolean;
      count: number;
      pendingCount: number;
      requests: TokenRedemptionRequest[];
    }>(url, {}, true);
  },

  getMerchantPendingRedemptionRequestsCount: () =>
    request<{
      success: boolean;
      pendingCount: number;
    }>('/api/merchant/redemption-requests/pending-count', {}, true),

  approveMerchantRedemptionRequest: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
      redemption?: UserRedemptionRecord;
      request?: TokenRedemptionRequest;
    }>(`/api/merchant/redemption-requests/${requestId}/approve`, {
      method: 'POST'
    }, true),

  rejectMerchantRedemptionRequest: (requestId: string, reason?: string) =>
    request<{
      success: boolean;
      message: string;
      request?: TokenRedemptionRequest;
    }>(`/api/merchant/redemption-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, true),

  getMerchantQr: () =>
    request<{
      success: boolean;
      shopId: string;
      shopName: string;
      shopNameBn: string;
      qrIdentifier: string;
      qrSecret: string;
      status: string;
      updatedAt: string;
      qr?: {
        exists: boolean;
        status: string;
        qrIdentifier: string;
        createdAt: string;
        updatedAt: string;
        shopId: string;
        shopName: string;
      };
    }>('/api/merchant/me/qr', {}, true),

  submitMerchantOfferRequest: (data: {
    shopId?: string;
    requestedOffer: {
      goldDiscount: number;
      silverDiscount: number;
      bronzeDiscount: number;
    };
  }) =>
    request<{
      success: boolean;
      message: string;
      request: {
        id: string;
        shopId: string;
        status: string;
      };
      shop?: PartnerShop;
    }>('/api/merchant/offer-change-request', {
      method: 'POST',
      body: JSON.stringify(data)
    }, true),

  getMerchantOffers: () =>
    request<{
      success: boolean;
      shop: {
        id: string;
        name: string;
        nameBn: string;
        commissionRate: number;
        goldDiscount: number;
        silverDiscount: number;
        bronzeDiscount: number;
      };
      pendingCommissionRequest: any;
    }>('/api/merchant/offers', {}, true),

  submitMerchantCommissionRequest: (requestedCommissionPercent: number, reason?: string) =>
    request<{
      success: boolean;
      message: string;
      request: any;
    }>('/api/merchant/commission-change-request', {
      method: 'POST',
      body: JSON.stringify({ requestedCommissionPercent, reason })
    }, true),

  updateMerchantSettings: (settings: {
    phone?: string;
    openingHours?: string;
    description?: string;
    address?: string;
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
  }) =>
    request<{
      success: boolean;
      shop: PartnerShop;
      message: string;
    }>('/api/merchant/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }, true),

  updateMerchantLocation: (location: {
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    locationAddress?: string;
  }) =>
    request<{
      success: boolean;
      shop: PartnerShop;
      message: string;
    }>('/api/merchant/location', {
      method: 'PUT',
      body: JSON.stringify(location)
    }, true),

  // ==========================================
  // PHASE 8: NOTIFICATIONS, SUPPORT & HISTORY
  // ==========================================
  getNotifications: (unreadOnly = false) =>
    request<{
      success: boolean;
      unreadCount: number;
      notifications: import('../types').NotificationItem[];
    }>(`/api/notifications${unreadOnly ? '?unread=true' : ''}`),

  markNotificationRead: (notificationId: string) =>
    request<{
      success: boolean;
      unreadCount: number;
    }>(`/api/notifications/${notificationId}/read`, {
      method: 'PUT'
    }),

  markAllNotificationsRead: () =>
    request<{
      success: boolean;
      markedCount: number;
      unreadCount: number;
    }>('/api/notifications/read-all', {
      method: 'PUT'
    }),

  deleteNotification: (notificationId: string) =>
    request<{
      success: boolean;
      unreadCount: number;
    }>(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    }),

  deleteAllNotifications: () =>
    request<{
      success: boolean;
      unreadCount: number;
    }>('/api/notifications', {
      method: 'DELETE'
    }),

  getGroupedPrayerHistory: (days = 30) =>
    request<{
      success: boolean;
      count: number;
      days: import('../types').DailyPrayerHistoryGroup[];
    }>(`/api/prayers/history/grouped?days=${days}`),

  // Salah Journey & Growth APIs
  getJourneySummary: () =>
    request<import('../types').JourneySummaryResponse>('/api/prayers/journey/summary'),

  getJourneyAnalytics: (period: 'week' | 'month' | 'year' | 'custom' = 'week', startDate?: string, endDate?: string) => {
    let url = `/api/prayers/journey/analytics?period=${period}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    return request<import('../types').JourneyAnalyticsResponse>(url);
  },

  getJourneyCalendar: (year?: number, month?: number) => {
    let url = '/api/prayers/journey/calendar';
    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return request<import('../types').JourneyCalendarResponse>(url);
  },

  getJourneyDayDetail: (date: string) =>
    request<import('../types').JourneyDayDetailResponse>(`/api/prayers/journey/day-detail?date=${encodeURIComponent(date)}`),

  startNewJourney: () =>
    request<{ success: boolean; journeyStartDate: string; archivedCount: number; message: string }>('/api/prayers/journey/start-new', {
      method: 'POST'
    }),

  deleteJourneyHistoryDay: (date: string) =>
    request<{ success: boolean; message: string }>('/api/prayers/journey/history/day', {
      method: 'DELETE',
      body: JSON.stringify({ date })
    }),

  deleteJourneyHistoryRange: (startDate: string, endDate: string) =>
    request<{ success: boolean; deletedCount: number; message: string }>('/api/prayers/journey/history/range', {
      method: 'DELETE',
      body: JSON.stringify({ startDate, endDate })
    }),

  deleteJourneyHistoryAll: () =>
    request<{ success: boolean; message: string }>('/api/prayers/journey/history/all', {
      method: 'DELETE'
    }),

  getFaqs: () =>
    request<{
      success: boolean;
      faqs: Array<{
        id: string;
        questionBn: string;
        questionEn: string;
        answerBn: string;
      }>;
    }>('/api/support/faqs'),

  createSupportTicket: (subject: string, message: string) =>
    request<{
      success: boolean;
      ticket: import('../types').SupportTicket;
      message: string;
    }>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, message })
    }),

  getSupportTickets: () =>
    request<{
      success: boolean;
      tickets: import('../types').SupportTicket[];
    }>('/api/support/tickets'),

  // ==========================================
  // PHASE 9 & 10: ADMIN DASHBOARD APIS
  // ==========================================
  verifyAdminKey: (adminKey: string) =>
    request<{
      success: boolean;
      token: string;
      message: string;
    }>('/api/admin/verify', {
      method: 'POST',
      body: JSON.stringify({ adminKey })
    }),

  getAdminStats: (adminToken?: string) =>
    request<{
      success: boolean;
      stats: import('../types').SystemStatsSummary;
      serverTime: string;
    }>('/api/admin/stats'),

  getAdminMosques: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      mosques: import('../types').Mosque[];
    }>('/api/admin/mosques'),

  checkAdminMosqueDuplicates: (params: { name?: string; nameBn?: string; latitude?: number; longitude?: number; excludeId?: string }, adminToken?: string) => {
    const query = new URLSearchParams();
    if (params.name) query.append('name', params.name);
    if (params.nameBn) query.append('nameBn', params.nameBn);
    if (params.latitude) query.append('latitude', String(params.latitude));
    if (params.longitude) query.append('longitude', String(params.longitude));
    if (params.excludeId) query.append('excludeId', params.excludeId);
    return request<{
      success: boolean;
      count: number;
      duplicates: Array<{ mosque: import('../types').Mosque; reason: string }>;
    }>(`/api/admin/mosques/check-duplicates?${query.toString()}`);
  },

  createAdminMosque: (data: {
    name: string;
    nameBn?: string;
    address: string;
    area?: string;
    district?: string;
    imamName?: string;
    contactNumber?: string;
    description?: string;
    imageUrl?: string;
    imamImageUrl?: string;
    status?: string;
    latitude?: number;
    longitude?: number;
    verificationRadius?: number;
  }, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>('/api/admin/mosques', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAdminMosque: (mosqueId: string, data: Partial<import('../types').Mosque>, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  approveAdminMosque: (mosqueId: string, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}/approve`, {
      method: 'PUT'
    }),

  rejectAdminMosque: (mosqueId: string, reason?: string, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    }),

  updateAdminMosqueStatus: (mosqueId: string, status: string, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),

  regenerateAdminMosqueQr: (mosqueId: string, adminToken?: string) =>
    request<{
      success: boolean;
      mosque: import('../types').Mosque;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}/regenerate-qr`, {
      method: 'POST',
      
    }),

  deleteAdminMosque: (mosqueId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/mosques/${mosqueId}`, {
      method: 'DELETE',
      
    }),

  getAdminConfig: (adminToken?: string) =>
    request<{
      success: boolean;
      config: {
        goldDiscountRate: number;
        silverDiscountRate: number;
        bronzeDiscountRate: number;
        updatedAt: string;
      };
    }>('/api/admin/config'),

  updateAdminConfig: (data: {
    goldDiscountRate?: number;
    silverDiscountRate?: number;
    bronzeDiscountRate?: number;
  }, adminToken?: string) =>
    request<{
      success: boolean;
      config: any;
      message: string;
    }>('/api/admin/config', {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  getAdminShops: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      shops: import('../types').Shop[];
    }>('/api/admin/shops'),

  getAdminShopById: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
    }>(`/api/admin/shops/${shopId}`),

  createAdminShop: (data: {
    name: string;
    nameBn?: string;
    category?: string;
    phone: string;
    address: string;
    area?: string;
    district?: string;
    description?: string;
    openingHours?: string;
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
    commissionRate?: number;
    ownerName?: string;
    ownerPin?: string;
    status?: string;
  }, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      merchant: { id: string; name: string; phone: string; role: string; shopId: string };
      message: string;
    }>('/api/admin/shops', {
      method: 'POST',
      
      body: JSON.stringify(data)
    }),

  downloadAdminDocument: async (url: string, filename: string) => {
    const adminToken = localStorage.getItem('adminToken') || '';
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    try {
      console.log(`[downloadAdminDocument] Fetching document from server: ${url}`);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to download document');
      
      console.log('[downloadAdminDocument] Reading response as Blob...');
      const blob = await res.blob();
      console.log(`[downloadAdminDocument] Received Blob size: ${blob.size} bytes`);

      const extension = filename.split('.').pop()?.toLowerCase() || '';
      triggerFileDownload(blob, filename, extension);
    } catch (err: any) {
      console.error('[downloadAdminDocument] Error:', err);
      alert(`ডাউনলোড ব্যর্থ হয়েছে: ${err.message || err}`);
      throw err;
    }
  },

  updateAdminShopStatus: (shopId: string, status: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/status`, {
      method: 'PUT',
      
      body: JSON.stringify({ status })
    }),

  updateAdminShopConfig: (
    shopId: string,
    data: {
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
      status?: string;
    },
    adminToken?: string
  ) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}`, {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  regenerateAdminShopQr: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/regenerate-qr`, {
      method: 'POST',
      
    }),

  generateAdminShopQr: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/generate-qr`, {
      method: 'POST',
      
    }),

  getAdminShopQr: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      qr: {
        exists: boolean;
        status: string;
        qrIdentifier: string;
        createdAt: string;
        updatedAt: string;
      };
    }>(`/api/admin/shops/${shopId}/qr`, {
      method: 'GET',
      
    }),

  approveAdminMerchantRequest: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/approve-merchant`, {
      method: 'POST',
      
    }),

  approveMerchantVerification: (shopId: string, note?: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/merchant-verifications/${shopId}/approve`, {
      method: 'POST',
      
      body: JSON.stringify({ note })
    }),

  requestCorrectionMerchantVerification: (shopId: string, message: string, requestedFields?: string[], adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/merchant-verifications/${shopId}/request-correction`, {
      method: 'POST',
      
      body: JSON.stringify({ message, requestedFields })
    }),

  rejectMerchantVerification: (shopId: string, reason: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/merchant-verifications/${shopId}/reject`, {
      method: 'POST',
      
      body: JSON.stringify({ reason })
    }),

  rejectAdminMerchantRequest: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/reject-merchant`, {
      method: 'POST',
      
    }),

  approveAdminOfferRequest: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/approve-offer`, {
      method: 'POST',
      
    }),

  rejectAdminOfferRequest: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shop: import('../types').Shop;
      message: string;
    }>(`/api/admin/shops/${shopId}/reject-offer`, {
      method: 'POST',
      
    }),

  getAdminOfferChangeRequests: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      requests: Array<{
        id: string;
        shopId: string;
        shopName: string;
        phone?: string;
        area?: string;
        district?: string;
        currentOffer: {
          goldDiscount: number;
          silverDiscount: number;
          bronzeDiscount: number;
        };
        requestedOffer: {
          goldDiscount: number;
          silverDiscount: number;
          bronzeDiscount: number;
        };
        status: string;
        createdAt: string;
      }>;
    }>('/api/admin/offer-change-requests', {
      method: 'GET',
      
    }),

   updateAdminOfferChangeRequestStatus: (requestId: string, status: 'approved' | 'rejected', adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      shop: import('../types').Shop;
    }>(`/api/admin/offer-change-requests/${requestId}`, {
      method: 'PATCH',
      
      body: JSON.stringify({ status })
    }),

  getAdminCommissionChangeRequests: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      requests: Array<{
        id: string;
        shopId: string;
        shopName: string;
        shopPhone?: string;
        currentCommissionPercent: number;
        requestedCommissionPercent: number;
        status: string;
        reason?: string;
        adminNote?: string;
        createdAt: string;
        reviewedAt?: string;
        reviewedBy?: string;
      }>;
    }>('/api/admin/commission-change-requests', {
      method: 'GET',
      
    }),

  getAdminShopCommissionRequests: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      requests: Array<{
        id: string;
        shopId: string;
        shopName: string;
        shopPhone?: string;
        currentCommissionPercent: number;
        requestedCommissionPercent: number;
        status: string;
        reason?: string;
        adminNote?: string;
        createdAt: string;
        reviewedAt?: string;
        reviewedBy?: string;
      }>;
    }>(`/api/admin/commission-change-requests?shopId=${shopId}`, {
      method: 'GET',
      
    }),

  updateAdminCommissionChangeRequestStatus: (requestId: string, status: 'approved' | 'rejected', adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      request: any;
    }>(`/api/admin/commission-change-requests/${requestId}`, {
      method: 'PATCH',
      
      body: JSON.stringify({ status })
    }),

  getAdminShopOffers: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      shopId: string;
      commissionPercent: number;
      goldDiscountPercent: number;
      silverDiscountPercent: number;
      bronzeDiscountPercent: number;
      updatedAt?: string;
      updatedBy?: string;
    }>(`/api/admin/shops/${shopId}/offers`, {
      method: 'GET',
      
    }),

  updateAdminShopOffers: (shopId: string, data: { commissionPercent: number; goldDiscountPercent: number; silverDiscountPercent: number; bronzeDiscountPercent: number }, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      shopId: string;
      commissionPercent: number;
      goldDiscountPercent: number;
      silverDiscountPercent: number;
      bronzeDiscountPercent: number;
    }>(`/api/admin/shops/${shopId}/offers`, {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  getShopQr: (shopId: string) =>
    request<{
      success: boolean;
      qr: {
        exists: boolean;
        status: string;
        qrIdentifier: string;
        createdAt: string;
        updatedAt: string;
        shopId: string;
        shopName: string;
      };
    }>(`/api/shops/${shopId}/qr`),

  deleteAdminShop: (shopId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/shops/${shopId}`, {
      method: 'DELETE',
      
    }),

  getAdminUsers: (queryParams?: string, adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      users: Array<import('../types').User & { totalPrayers: number; availableTokens: number; redeemedTokens: number }>;
    }>(`/api/admin/users${queryParams ? `?${queryParams}` : ''}`),

  getUserDetails: (userId: string, adminToken?: string) =>
    request<{
      success: boolean;
      user: import('../types').User & {
        totalPrayers: number;
        availableTokens: number;
        redeemedTokens: number;
      };
    }>(`/api/admin/users/${userId}`),

  updateAdminUserStatus: (userId: string, status: string, adminToken?: string) =>
    request<{
      success: boolean;
      user: import('../types').User;
      message: string;
    }>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      
      body: JSON.stringify({ status })
    }),

  deleteAdminUser: (userId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      
    }),

  getAdminActivities: (limit = 30, adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      activities: import('../types').AdminActivityItem[];
    }>(`/api/admin/activities?limit=${limit}`),

  getAdminTickets: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      tickets: import('../types').SupportTicket[];
    }>('/api/admin/tickets'),

  getAdminTransactions: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      transactions: import('../types').UserRedemptionRecord[];
    }>('/api/admin/transactions'),

  updateAdminTicket: (ticketId: string, status: string, adminResponse?: string, adminToken?: string) =>
    request<{
      success: boolean;
      ticket: import('../types').SupportTicket;
      message: string;
    }>(`/api/admin/tickets/${ticketId}`, {
      method: 'PUT',
      
      body: JSON.stringify({ status, adminResponse })
    }),

  deleteAdminTicket: (ticketId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/tickets/${ticketId}`, {
      method: 'DELETE',
    }),

  clearAdminTickets: (status?: string, adminToken?: string) =>
    request<{
      success: boolean;
      deletedCount: number;
      message: string;
    }>(`/api/admin/tickets/clear${status ? `?status=${encodeURIComponent(status)}` : ''}`, {
      method: 'DELETE',
    }),

  getAdminNotifications: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      notifications: import('../types').NotificationItem[];
    }>('/api/admin/notifications'),

  markAdminNotificationRead: (id: string, adminToken?: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/notifications/${id}/read`, {
      method: 'PUT',
    }),

  getAdminNotificationTemplates: () =>
    request<{
      success: boolean;
      count: number;
      templates: import('../types').NotificationTemplate[];
    }>('/api/admin/notification-templates'),

  updateAdminNotificationTemplate: (
    eventType: string, 
    data: { title?: string; titleBn?: string; message?: string; messageBn?: string; isActive?: boolean }
  ) =>
    request<{
      success: boolean;
      message: string;
      template: import('../types').NotificationTemplate;
    }>(`/api/admin/notification-templates/${eventType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  previewAdminNotificationTemplate: (
    eventType: string,
    data: { title?: string; titleBn?: string; message?: string; messageBn?: string; sampleData?: Record<string, any> }
  ) =>
    request<{
      success: boolean;
      preview: {
        title: string;
        titleBn: string;
        message: string;
        messageBn: string;
        sampleContext: Record<string, any>;
      };
    }>(`/api/admin/notification-templates/${eventType}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  loginAdmin: async (data: { adminKey?: string; adminToken?: string; email?: string; phone?: string; password?: string }) => {
    const sanitizedPayloadKeys = {
      hasAdminKey: Boolean(data.adminKey),
      hasEmail: Boolean(data.email),
      hasPhone: Boolean(data.phone),
      hasPassword: Boolean(data.password),
      hasAdminToken: Boolean(data.adminToken)
    };
    console.log('[API] Sending request to /api/admin/verify with sanitized payload outline:', sanitizedPayloadKeys);

    const res = await request<{
      success: boolean;
      token: string;
      role?: string;
      permissions?: string[];
      message: string;
    }>('/api/admin/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    console.log('[API] Received response structure from /api/admin/verify:', {
      success: res?.success,
      hasToken: Boolean(res?.token),
      tokenFormatValid: typeof res?.token === 'string' && res.token.length > 0,
      role: res?.role,
      permissionsCount: Array.isArray(res?.permissions) ? res.permissions.length : 0,
      message: res?.message
    });

    return res;
  },

  getAdminAccounts: (adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      accounts: any[];
    }>('/api/admin/accounts'),

  getQuarantinedAttendances: async (adminToken?: string): Promise<{ success: boolean; records: any[] }> => {
    const token = adminToken || getStoredAdminToken();
    return request<{ success: boolean; records: any[] }>('/api/admin/quarantine', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
  },

  resolveQuarantinedAttendance: async (id: string, action: 'approve' | 'reject', adminToken?: string): Promise<{ success: boolean; message: string }> => {
    const token = adminToken || getStoredAdminToken();
    return request<{ success: boolean; message: string }>('/api/admin/quarantine/resolve', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({ id, action })
    });
  },

  // ACCOUNTS (FINANCIAL REDEMPTIONS)
  getAdminAccountsShops: (adminToken?: string) =>
    request<{
      success: boolean;
      shops: {
        id: string;
        shopName: string;
        shopNameBn?: string;
        district?: string;
        upazila?: string;
        area?: string;
        address?: string;
        phone?: string;
        category?: string;
        totalRedemptions?: number;
        totalRevenue?: number;
        createdAt?: string;
      }[];
    }>(`/api/admin/accounts/shops`),

  getAdminAccountsShopSummary: (shopId: string, filters?: { dateFrom?: string; dateTo?: string; tokenType?: string }, adminToken?: string) => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.tokenType) params.append('tokenType', filters.tokenType);
    
    return request<{
      success: boolean;
      summary: {
        totalAmount: number;
        totalCommission: number;
        totalCount: number;
      };
    }>(`/api/admin/accounts/shops/${shopId}/summary?${params.toString()}`);
  },

  getAdminAccountsShopRedemptions: (shopId: string, filters?: { dateFrom?: string; dateTo?: string; tokenType?: string }, adminToken?: string) => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.tokenType) params.append('tokenType', filters.tokenType);

    return request<{
      success: boolean;
      redemptions: import('../types').UserRedemptionRecord[];
    }>(`/api/admin/accounts/shops/${shopId}/redemptions?${params.toString()}`);
  },

  deleteAdminRedemptionRecord: (redemptionId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/accounts/redemptions/${redemptionId}`, {
      method: 'DELETE',
      
    }),

  markCommissionPaid: (redemptionId: string) =>
    request<{
      success: boolean;
      message: string;
      redemption: any;
    }>(`/api/admin/accounts/redemptions/${redemptionId}/pay-commission`, {
      method: 'POST'
    }),

  deleteMerchantTransaction: (redemptionId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/merchant/transactions/${redemptionId}`, {
      method: 'DELETE'
    }, true),

  downloadAdminShopFinancialReport: async (
    shopId: string,
    filters: { format?: string; dateFrom?: string; dateTo?: string; tokenType?: string },
    adminToken?: string
  ) => {
    const token = adminToken || getStoredAdminToken();
    const params = new URLSearchParams();
    if (filters.format) params.append('format', filters.format);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.tokenType) params.append('tokenType', filters.tokenType);

    const url = `${API_BASE_URL}/api/admin/accounts/shops/${shopId}/export?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`[downloadAdminShopFinancialReport] Fetching shop report from server: ${url}`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let errorMsg = 'রিপোর্ট ডাউনলোড করতে ব্যর্থ হয়েছে।';
        try {
          const errJson = await res.json();
          if (errJson.message) errorMsg = errJson.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const format = (filters.format || 'pdf').toLowerCase();
      
      console.log('[downloadAdminShopFinancialReport] Reading response as Blob...');
      const blob = await res.blob();
      console.log(`[downloadAdminShopFinancialReport] Received Blob size: ${blob.size} bytes, type: ${blob.type}`);

      let filename = `shop-financial-report.${format === 'pdf' ? 'pdf' : (format === 'csv' ? 'csv' : 'xlsx')}`;
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      triggerFileDownload(blob, filename, format);
      return { success: true };
    } catch (err: any) {
      console.error('[downloadAdminShopFinancialReport] Error:', err);
      alert(`ডাউনলোড ব্যর্থ হয়েছে: ${err.message || err}`);
      throw err;
    }
  },

  downloadAdminOnlineAccountsReport: async (
    filters: { format?: string; searchQuery?: string; dateFrom?: string; dateTo?: string },
    adminToken?: string
  ) => {
    const token = adminToken || getStoredAdminToken();
    const params = new URLSearchParams();
    if (filters.format) params.append('format', filters.format);
    if (filters.searchQuery) params.append('search', filters.searchQuery);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const url = `${API_BASE_URL}/api/admin/online-accounts/export?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`[downloadAdminOnlineAccountsReport] Fetching online accounts report: ${url}`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let errorMsg = 'রিপোর্ট ডাউনলোড করতে ব্যর্থ হয়েছে।';
        try {
          const errJson = await res.json();
          if (errJson.message) errorMsg = errJson.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const format = (filters.format || 'pdf').toLowerCase();
      
      console.log('[downloadAdminOnlineAccountsReport] Reading response as Blob...');
      const blob = await res.blob();
      console.log(`[downloadAdminOnlineAccountsReport] Received Blob size: ${blob.size} bytes, type: ${blob.type}`);

      let filename = `online-accounts-${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`;
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      triggerFileDownload(blob, filename, format);
      return { success: true };
    } catch (err: any) {
      console.error('[downloadAdminOnlineAccountsReport] Error:', err);
      alert(`ডাউনলোড ব্যর্থ হয়েছে: ${err.message || err}`);
      throw err;
    }
  },

  getAdminMerchants: (status: string = 'ALL', adminToken?: string) =>
    request<{
      success: boolean;
      count: number;
      verifications: import('../types').MerchantVerificationRecord[];
    }>(`/api/admin/merchants?status=${status}`),

  getAdminMerchantById: (id: string, adminToken?: string) =>
    request<{
      success: boolean;
      verification: import('../types').MerchantVerificationRecord;
      shop: PartnerShop;
    }>(`/api/admin/merchants/${id}`),
  deleteAdminMerchant: (id: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/merchants/${id}`, {
      method: 'DELETE',
      
    }),

  approveAdminMerchant: (id: string, adminToken?: string) =>
    request<{
      success: boolean;
      verification: import('../types').MerchantVerificationRecord;
      message: string;
    }>(`/api/admin/merchants/${id}/approve`, {
      method: 'POST',
      
    }),

  requestCorrectionAdminMerchant: (id: string, message: string, requestedFields: string[], adminToken?: string) =>
    request<{
      success: boolean;
      verification: import('../types').MerchantVerificationRecord;
      message: string;
    }>(`/api/admin/merchants/${id}/request-correction`, {
      method: 'POST',
      
      body: JSON.stringify({ message, requestedFields })
    }),

  rejectAdminMerchant: (id: string, reason: string, adminToken?: string) =>
    request<{
      success: boolean;
      verification: import('../types').MerchantVerificationRecord;
      message: string;
    }>(`/api/admin/merchants/${id}/reject`, {
      method: 'POST',
      
      body: JSON.stringify({ reason })
    }),

  getAdminCommissionPolicy: (adminToken?: string) =>
    request<{
      success: boolean;
      policy: import('../types').CommissionPolicy;
    }>('/api/admin/commission-policy'),

  updateAdminCommissionPolicy: (policy: import('../types').CommissionPolicy, adminToken?: string) =>
    request<{
      success: boolean;
      policy: import('../types').CommissionPolicy;
      message: string;
    }>('/api/admin/commission-policy', {
      method: 'PUT',
      
      body: JSON.stringify(policy)
    }),

  createAdminAccount: (data: any, adminToken?: string) =>
    request<{
      success: boolean;
      admin: any;
      message: string;
    }>('/api/admin/accounts', {
      method: 'POST',
      
      body: JSON.stringify(data)
    }),

  updateAdminAccount: (id: string, data: any, adminToken?: string) =>
    request<{
      success: boolean;
      admin: any;
      message: string;
    }>(`/api/admin/accounts/${id}`, {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  deleteAdminAccount: (id: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/accounts/${id}`, {
      method: 'DELETE',
      
    }),

  getPublicNasihaList: () =>
    request<{ success: boolean; list: any[] }>('/api/support/nasiha'),

  getPublicBlogs: () =>
    request<{ success: boolean; blogs: any[] }>('/api/support/blogs'),

  getAdminBlogs: (adminToken?: string) =>
    request<{ success: boolean; blogs: any[] }>('/api/admin/blogs'),

  createAdminBlog: (data: any, adminToken?: string) =>
    request<{ success: boolean; message: string; blog: any }>('/api/admin/blogs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAdminBlog: (id: string, data: any, adminToken?: string) =>
    request<{ success: boolean; message: string; blog: any }>(`/api/admin/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  publishAdminBlog: (id: string, isPublished: boolean = true, adminToken?: string) =>
    request<{ success: boolean; message: string; blog: any }>(`/api/admin/blogs/${encodeURIComponent(id)}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished })
    }),

  deleteAdminBlog: (id: string, adminToken?: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/blogs/${id}`, {
      method: 'DELETE'
    }),

  getNasihaList: (adminToken?: string) =>
    request<{ success: boolean; list: any[] }>('/api/admin/nasiha'),

  createNasiha: (data: { textBn: string; sourceBn: string }, adminToken?: string) =>
    request<{ success: boolean; message: string; item: any }>('/api/admin/nasiha', {
      method: 'POST',
      
      body: JSON.stringify(data)
    }),

  updateNasiha: (id: string, data: { textBn: string; sourceBn: string; active: boolean }, adminToken?: string) =>
    request<{ success: boolean; message: string; item: any }>(`/api/admin/nasiha/${id}`, {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  deleteNasiha: (id: string, adminToken?: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/nasiha/${id}`, {
      method: 'DELETE',
      
    }),

  changeAdminPassword: (data: { oldPassword?: string; newPassword?: string }, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>('/api/admin/change-password', {
      method: 'POST',
      
      body: JSON.stringify(data)
    }),

  // Helpline Management
  getHelpline: () =>
    request<{
      success: boolean;
      isActive: boolean;
      primaryPhone: string;
      secondaryPhone?: string;
      whatsappNumber?: string;
      supportEmail?: string;
      supportMessage: string;
      isWhatsappEnabled: boolean;
    }>('/api/helpline'),

  getAdminHelpline: (adminToken?: string) =>
    request<{
      success: boolean;
      helpline: import('../types').HelplineSettings;
    }>('/api/admin/helpline'),

  updateAdminHelpline: (data: Partial<import('../types').HelplineSettings>, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      helpline: import('../types').HelplineSettings;
    }>('/api/admin/helpline', {
      method: 'PUT',
      
      body: JSON.stringify(data)
    }),

  // ==========================================
  // ONLINE MARKETPLACE & PRODUCTS
  // ==========================================
  getShopProducts: (shopId: string) =>
    request<{
      success: boolean;
      shop: {
        id: string;
        name: string;
        nameBn: string;
        address: string;
        area: string;
        district: string;
        phone: string;
        goldDiscount: number;
        silverDiscount: number;
        bronzeDiscount: number;
        commissionRate: number;
      };
      products: import('../types').Product[];
    }>(`/api/shops/${shopId}/products`),

  getAllMarketProducts: (marketType?: string) =>
    request<{
      success: boolean;
      products: (import('../types').Product & {
        goldDiscount: number;
        silverDiscount: number;
        bronzeDiscount: number;
      })[];
    }>(`/api/shops/all-products${marketType ? `?marketType=${marketType}` : ''}`),

  getMerchantProducts: () =>
    request<{
      success: boolean;
      count: number;
      products: import('../types').Product[];
    }>('/api/merchant/products', {}, true),

  uploadProductImage: (fileData: string, fileName?: string) =>
    request<{
      success: boolean;
      imageUrl: string;
      mediaId: string;
      fileName: string;
      message: string;
    }>('/api/merchant/products/upload-image', {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName })
    }, true),

  addMerchantProduct: (data: {
    name: string;
    description?: string;
    category?: string;
    originalPrice: number;
    weightKg?: number;
    imageUrl?: string;
    gallery?: string[];
    isAvailable?: boolean;
  }) =>
    request<{
      success: boolean;
      message: string;
      product: import('../types').Product;
    }>('/api/merchant/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }, true),

  updateMerchantProduct: (productId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    originalPrice?: number;
    weightKg?: number;
    imageUrl?: string;
    gallery?: string[];
    isAvailable?: boolean;
  }) =>
    request<{
      success: boolean;
      message: string;
      product: import('../types').Product;
    }>(`/api/merchant/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, true),

  toggleMerchantProductAvailability: (productId: string) =>
    request<{
      success: boolean;
      message: string;
      product: import('../types').Product;
    }>(`/api/merchant/products/${productId}/toggle-availability`, {
      method: 'PATCH'
    }, true),

  deleteMerchantProduct: (productId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/merchant/products/${productId}`, {
      method: 'DELETE'
    }, true),

  // ==========================================
  // ADMIN PRODUCT MANAGEMENT APPROVAL SYSTEM APIs
  // ==========================================
  getPendingProductAddRequests: () =>
    request<{
      success: boolean;
      count: number;
      requests: Array<{
        id: string;
        productId: string;
        shopId: string;
        shopName: string;
        merchantName: string;
        name: string;
        description: string;
        category: string;
        originalPrice: number;
        imageUrl: string;
        gallery: string[];
        isAvailable: boolean;
        status: string;
        rejectionReason?: string;
        submittedAt: string;
      }>;
    }>('/api/admin/products/add-requests', {}, false),

  approveProductAddRequest: (productId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/add-requests/${productId}/approve`, {
      method: 'POST'
    }, false),

  rejectProductAddRequest: (productId: string, reason: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/add-requests/${productId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, false),

  deleteProductAddRequest: (productId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/add-requests/${productId}`, {
      method: 'DELETE'
    }, false),

  getPendingPriceChangeRequests: () =>
    request<{
      success: boolean;
      count: number;
      requests: import('../types').ProductPriceChangeRequest[];
    }>('/api/admin/products/price-change-requests', {}, false),

  approvePriceChangeRequest: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/price-change-requests/${requestId}/approve`, {
      method: 'POST'
    }, false),

  rejectPriceChangeRequest: (requestId: string, reason: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/price-change-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, false),

  deletePriceChangeRequestRecord: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/price-change-requests/${requestId}`, {
      method: 'DELETE'
    }, false),

  getPendingDeleteRequests: () =>
    request<{
      success: boolean;
      count: number;
      requests: import('../types').ProductDeleteRequest[];
    }>('/api/admin/products/delete-requests', {}, false),

  approveDeleteRequest: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/delete-requests/${requestId}/approve`, {
      method: 'POST'
    }, false),

  rejectDeleteRequest: (requestId: string, reason: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/delete-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, false),

  deleteDeleteRequestRecord: (requestId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/products/delete-requests/${requestId}`, {
      method: 'DELETE'
    }, false),

  // ==========================================
  // CART & ORDERS
  // ==========================================
  getCart: () =>
    request<{
      success: boolean;
      cart: import('../types').CartSummary;
    }>('/api/cart'),

  addToCart: (data: { productId: string; quantity?: number; tokenId?: string }) =>
    request<{
      success: boolean;
      message: string;
      cart: import('../types').CartSummary;
    }>('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateCartItemQuantity: (itemId: string, quantity: number) =>
    request<{
      success: boolean;
      cart: import('../types').CartSummary;
    }>(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    }),

  updateCartItemWeight: (itemId: string, weightKg: number) =>
    request<{
      success: boolean;
      cart: import('../types').CartSummary;
    }>(`/api/cart/items/${itemId}/weight`, {
      method: 'PATCH',
      body: JSON.stringify({ weightKg })
    }),

  removeCartItem: (itemId: string) =>
    request<{
      success: boolean;
      message: string;
      cart: import('../types').CartSummary;
    }>(`/api/cart/items/${itemId}`, {
      method: 'DELETE'
    }),

  clearCart: () =>
    request<{
      success: boolean;
      message: string;
      cart: import('../types').CartSummary;
    }>('/api/cart/clear', {
      method: 'DELETE'
    }),

  calculateLocalDeliveryFee: (lat: number, lng: number) =>
    request<{
      success: boolean;
      fee: number;
      distanceKm: number;
      totalWeightKg?: number;
      farthestShopName?: string;
      farthestShopDistanceKm?: number;
      ratePerKm?: number;
      nearbyRiderAvailable?: boolean;
      activeRidersCount?: number;
      nearbyRiders?: any[];
      message?: string;
      isWithin20Km?: boolean;
      rangeBlockedMsg?: string;
      tooFarShops?: Array<{ shopName: string; distanceKm: number }>;
      shopBreakdowns?: Array<{
        shopId: string;
        shopName: string;
        distanceKm: number;
        radiusKm?: number;
        weightKg: number;
        ratePerKm: number;
        charge: number;
        isFarthest?: boolean;
      }>;
    }>(`/api/orders/local-delivery-fee?lat=${lat}&lng=${lng}`),

  checkRiderAvailability: (lat: number, lng: number) =>
    request<{
      success: boolean;
      available: boolean;
      count: number;
      riders: any[];
      message: string;
    }>(`/api/orders/check-rider-availability?lat=${lat}&lng=${lng}`),

  checkoutOrder: (data: {
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
  }) =>
    request<{
      success: boolean;
      message: string;
      order: import('../types').Order;
    }>('/api/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  validateCoupon: (code: string) =>
    request<{
      success: boolean;
      coupon: { code: string; discountType: 'percentage' | 'amount'; discountValue: number };
    }>('/api/orders/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),

  getMyOrders: () =>
    request<{
      success: boolean;
      orders: import('../types').Order[];
    }>('/api/orders/my-orders'),

  getOrderDetail: (orderId: string) =>
    request<{
      success: boolean;
      order: import('../types').Order;
    }>(`/api/orders/${orderId}`),

  deleteUserOrderHistory: (orderId: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/orders/${orderId}`, {
      method: 'DELETE'
    }),

  getDeliveryChargesConfig: () =>
    request<{
      success: boolean;
      charges: Record<string, number>;
    }>('/api/delivery-charges'),

  getBangladeshDistricts: () =>
    request<{
      success: boolean;
      districts: import('../data/bangladeshGeo').DistrictData[];
    }>('/api/geo/districts'),

  // ==========================================
  // ADMIN MARKETPLACE MANAGEMENT
  // ==========================================
  getAdminDeliveryCharge: (adminToken?: string) =>
    request<{
      success: boolean;
      charges: Record<string, number>;
      localRates?: import('../types').LocalDeliveryRates;
      logs: import('../types').DeliveryChargeLogItem[];
    }>('/api/admin/delivery-charge'),

  getAdminLocalDeliveryRates: (adminToken?: string) =>
    request<{
      success: boolean;
      rates: import('../types').LocalDeliveryRates;
    }>('/api/admin/local-delivery-rates'),

  updateAdminLocalDeliveryRates: (rates: { rate0to1?: number; rate1to5?: number; rate6to10?: number }, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      rates: import('../types').LocalDeliveryRates;
    }>('/api/admin/local-delivery-rates', {
      method: 'POST',
      body: JSON.stringify(rates)
    }),

  updateAdminDeliveryCharge: (payload: { updates: Record<string, number> }, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      charges: Record<string, number>;
    }>('/api/admin/delivery-charge', {
      method: 'POST',
      
      body: JSON.stringify(payload)
    }),

  getAdminOrders: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }, adminToken?: string) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return request<{
      success: boolean;
      count: number;
      orders: import('../types').Order[];
    }>(`/api/admin/orders${qs ? `?${qs}` : ''}`);
  },

  getAdminOrderDetail: (orderId: string, adminToken?: string) =>
    request<{
      success: boolean;
      order: import('../types').Order;
    }>(`/api/admin/orders/${orderId}`),

  updateAdminOrderStatus: (orderId: string, data: { status: string; adminNotes?: string }, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      order: import('../types').Order;
    }>(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      
      body: JSON.stringify(data)
    }),

  deleteAdminOrder: (orderId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
      
    }),

  adminWaiveDelivery: (orderId: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
      order: import('../types').Order;
    }>(`/api/admin/orders/${orderId}/waive-delivery`, {
      method: 'POST',
      
    }),

  getAdminOnlineAccounts: (params?: { shopId?: string; search?: string; dateFrom?: string; dateTo?: string }, adminToken?: string) => {
    const query = new URLSearchParams();
    if (params?.shopId) query.set('shopId', params.shopId);
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return request<{
      success: boolean;
      count: number;
      summary: import('../types').OnlineAccountsSummary;
      records: import('../types').OnlineFinancialRecord[];
    }>(`/api/admin/online-accounts${qs ? `?${qs}` : ''}`);
  },

  deleteAdminOnlineAccountRecord: (id: string, adminToken?: string) =>
    request<{
      success: boolean;
      message: string;
    }>(`/api/admin/online-accounts/${id}`, {
      method: 'DELETE'
    }),


  // ==========================================
  // ADVERTISEMENT MANAGEMENT (ADMIN)
  // ==========================================

  async getAdminAds(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return request<{ success: boolean; data?: any[]; message?: string }>('/api/admin/ads');
  },

  async createAdminAd(data: any): Promise<{ success: boolean; id?: string; message?: string }> {
    return request<{ success: boolean; id?: string; message?: string }>('/api/admin/ads', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminAd(id: string, data: any): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>(`/api/admin/ads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updateAdminAdStatus(id: string, status: string): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>(`/api/admin/ads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteAdminAd(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      return await request<{ success: boolean; message?: string }>(`/api/admin/ads/${id}`, {
        method: 'DELETE'
      });
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to delete advertisement' };
    }
  },

  async getAdminAdSettings(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return request<{ success: boolean; data?: any[]; message?: string }>('/api/admin/ads/settings');
  },

  async updateAdminAdSettings(settings: any[]): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>('/api/admin/ads/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
  },

  // ==========================================
  // ADVERTISEMENTS (PUBLIC / USER APP)
  // ==========================================
  

  async getAdsForPage(pageName: string, slot?: string): Promise<any[]> {
    try {
      let url = `/api/ads?page=${encodeURIComponent(pageName)}`;
      if (slot) {
        url += `&slot=${encodeURIComponent(slot)}`;
      }
      const json = await request<{ success: boolean; data?: any[] }>(url);
      if (json.success) return json.data || [];
      return [];
    } catch (e: any) {
      console.warn('[API] Could not fetch ads for page:', pageName, e?.message || e);
      return [];
    }
  },

  // ==========================================
  // ANALYTICS & INSIGHTS (ADMIN)
  // ==========================================
  getAdminAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{
      success: boolean;
      data: any;
    }>(`/api/admin/analytics/overview${qs ? `?${qs}` : ''}`);
  },

  trackAnalyticsEvent: (eventData: {
    userId?: string;
    eventType: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }) => {
    return request<{ success: boolean }>('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify(eventData)
    }).catch(() => {
      // Non-blocking tracking fallback
      return { success: false };
    });
  },

  // Cave Circles APIs
  getCircles: () => request<{ success: boolean; circles: any[] }>('/api/circles'),
  getAllPublicCircles: () => request<{ success: boolean; circles: any[] }>('/api/circles/all-public'),
  createCircle: (data: { name: string; description: string; category?: string; jamaatStreak?: number }) => 
    request<{ success: boolean; circleId: string; message: string }>('/api/circles', { method: 'POST', body: JSON.stringify(data) }),
  getCircleDetails: (id: string) => 
    request<{ success: boolean; circle: any; members: any[]; aggregateProgress: any }>(`/api/circles/${id}`),
  createCircleInvite: (id: string) => 
    request<{ success: boolean; inviteCode: string }>(`/api/circles/${id}/invites`, { method: 'POST' }),
  joinCircle: (inviteCode: string) => 
    request<{ success: boolean; circleId: string; message: string }>('/api/circles/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  leaveCircle: (id: string) => 
    request<{ success: boolean; message: string }>(`/api/circles/${id}/leave`, { method: 'POST' }),
  deleteCircle: (id: string) => 
    request<{ success: boolean; message: string }>(`/api/circles/${id}`, { method: 'DELETE' }),
  notifyCircle: (id: string, data: { type: 'REMINDER' | 'ENCOURAGEMENT' | 'NOSIHA', message?: string }) => 
    request<{ success: boolean; message: string }>(`/api/circles/${id}/notify`, { method: 'POST', body: JSON.stringify(data) }),
  getCircleMessages: (id: string) =>
    request<{ success: boolean; messages: any[] }>(`/api/circles/${id}/messages`),
  sendCircleMessage: (id: string, data: { messageType?: 'TEXT' | 'NUDGE' | 'AUDIO' | 'QURAN_MILESTONE'; content?: string; audioUrl?: string; audioDurationSec?: number }) =>
    request<{ success: boolean; message: any }>(`/api/circles/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  getCircleQuranGoals: (id: string) =>
    request<{ success: boolean; goal: any }>(`/api/circles/${id}/quran-goals`),
  toggleCircleQuranJuz: (id: string, juzNumber: number) =>
    request<{ success: boolean; goal: any; action: string; message: string }>(`/api/circles/${id}/quran-goals/toggle-juz`, { method: 'POST', body: JSON.stringify({ juzNumber }) }),
  searchCircleUserByPhone: (phone: string, circleId?: string) =>
    request<{ success: boolean; user?: any; message?: string }>(`/api/circles/search-user?phone=${encodeURIComponent(phone)}${circleId ? `&circleId=${circleId}` : ''}`),
  inviteUserToCircle: (circleId: string, data: { targetUserId?: string; phone?: string }) =>
    request<{ success: boolean; message: string }>(`/api/circles/${circleId}/invite-user`, { method: 'POST', body: JSON.stringify(data) }),
  getPendingCircleInvitations: () =>
    request<{ success: boolean; invitations: any[] }>('/api/circles/pending-invitations'),
  respondToCircleInvitation: (invitationId: string, action: 'ACCEPT' | 'REJECT') =>
    request<{ success: boolean; circleId?: string; message: string }>(`/api/circles/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  deleteCircleInvitation: (invitationId: string) =>
    request<{ success: boolean; message: string }>(`/api/circles/invitations/${invitationId}`, { method: 'DELETE' }),
  searchAllCircles: (q: string) =>
    request<{ success: boolean; circles: any[]; myCircles: any[] }>(`/api/circles/search-all?q=${encodeURIComponent(q)}`),
  sendCircleBattleChallenge: (circleId: string, data: { opponentCircleId: string; battleType?: string; durationDays?: number; title?: string; rulesNote?: string }) =>
    request<{ success: boolean; battleId: string; message: string }>(`/api/circles/${circleId}/challenge-battle`, { method: 'POST', body: JSON.stringify(data) }),
  getCircleBattles: (circleId: string) =>
    request<{ success: boolean; battles: any[] }>(`/api/circles/${circleId}/battles`),
  respondToCircleBattle: (battleId: string, action: 'ACCEPT' | 'DECLINE') =>
    request<{ success: boolean; message: string }>(`/api/circles/battles/${battleId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  getCircleBattleStats: (battleId: string) =>
    request<{ success: boolean; battle: any; challengerStats: any; challengedStats: any; topChallengers: any[]; topChallenged: any[] }>(`/api/circles/battles/${battleId}/stats`),

  // Real Multi-User Audio Call Signaling APIs
  startCircleCall: (circleId: string, targetUserId?: string) =>
    request<{ success: boolean; callId: string; status: string; circleId: string; callerName: string }>(`/api/circles/${circleId}/calls`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    }),
  getActiveIncomingCall: () =>
    request<{ success: boolean; activeCall: any | null }>('/api/circles/active-call'),
  getCircleCallStatus: (callId: string) =>
    request<{ success: boolean; call?: any; status: 'RINGING' | 'CONNECTED' | 'REJECTED' | 'ENDED' }>(`/api/circles/calls/${callId}/status`),
  answerCircleCall: (callId: string) =>
    request<{ success: boolean; call?: any; message: string }>(`/api/circles/calls/${callId}/answer`, { method: 'POST' }),
  declineCircleCall: (callId: string) =>
    request<{ success: boolean; message: string }>(`/api/circles/calls/${callId}/decline`, { method: 'POST' }),
  endCircleCall: (callId: string) =>
    request<{ success: boolean; message: string }>(`/api/circles/calls/${callId}/end`, { method: 'POST' }),

  // Cave Circle User Reporting API
  reportCircleMessage: (circleId: string, messageId: string, data: { category: string; description?: string }) =>
    request<{ success: boolean; message: string }>(`/api/circles/${circleId}/messages/${messageId}/report`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCircleRestrictions: () =>
    request<{ success: boolean; isRestricted: boolean; restriction?: any }>('/api/circles/my-restrictions'),

  // Local Market & Delivery Fee API
  getLocalDeliveryFee: (lat: number, lng: number) =>
    request<{ success: boolean; fee: number; distanceKm: number }>(`/api/orders/local-delivery-fee?lat=${lat}&lng=${lng}`),

  // CC Delivery Rider APIs
  riderRegister: (data: any) =>
    request<{ success: boolean; message: string; rider: any }>('/api/rider/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  riderLogin: (phone: string, pin: string) =>
    request<{ success: boolean; token: string; rider: any; message?: string }>('/api/rider/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin })
    }),

  riderForgotPasswordRequest: (identifier: string) =>
    request<{ success: boolean; message: string; devOtpCode?: string; identifier: string }>('/api/rider/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    }),

  riderForgotPasswordVerify: (identifier: string, code: string) =>
    request<{ success: boolean; message: string; identifier: string }>('/api/rider/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code })
    }),

  riderForgotPasswordReset: (data: { identifier: string; code?: string; newPin: string; confirmPin?: string }) =>
    request<{ success: boolean; message: string }>('/api/rider/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getRiderMe: () =>
    request<{ success: boolean; rider: any; stats: any }>('/api/rider/me'),

  updateRiderStatus: (data: { availabilityStatus: string; latitude?: number; longitude?: number }) =>
    request<{ success: boolean; availabilityStatus: string; lastActiveAt: string }>('/api/rider/status', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getRiderDeliveryRequests: (lat?: number, lng?: number) => {
    const params = new URLSearchParams();
    if (lat !== undefined) params.append('latitude', lat.toString());
    if (lng !== undefined) params.append('longitude', lng.toString());
    const qs = params.toString();
    return request<{ success: boolean; requests: any[] }>(`/api/rider/delivery-requests${qs ? `?${qs}` : ''}`);
  },

  acceptRiderOrder: (orderId: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/rider/orders/${orderId}/accept`, {
      method: 'POST'
    }),

  declineRiderOrder: (orderId: string) =>
    request<{ success: boolean; message: string }>(`/api/rider/orders/${orderId}/decline`, {
      method: 'POST'
    }),

  getRiderActiveOrder: () =>
    request<{ success: boolean; order: any | null }>('/api/rider/active-order'),

  pickupRiderOrder: (orderId: string, pickupOtp: string, shopId?: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/rider/orders/${orderId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ pickupOtp, shopId })
    }),

  deliverRiderOrder: (orderId: string, deliveryOtp: string, shopId?: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/rider/orders/${orderId}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ deliveryOtp, shopId })
    }),

  riderRequestRejectCode: (orderId: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/rider/orders/${orderId}/request-reject-code`, {
      method: 'POST'
    }),

  riderConfirmReject: (orderId: string, rejectCode: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/rider/orders/${orderId}/reject-order`, {
      method: 'POST',
      body: JSON.stringify({ rejectCode })
    }),

  getRiderHistory: () =>
    request<{ success: boolean; orders: any[]; stats: any }>('/api/rider/history'),

  getRiderStats: () =>
    request<{ success: boolean; stats: any }>('/api/rider/stats'),

  // Merchant Orders & Settlement APIs
  getMerchantOrders: () =>
    request<{ success: boolean; orders: any[] }>('/api/merchant/orders', {}, true),

  merchantDoneOrder: (orderId: string, notes?: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/merchant/orders/${orderId}/done`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }, true),

  merchantProductBackOrder: (orderId: string, reason?: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/merchant/orders/${orderId}/product-back`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, true),

  merchantDeleteOrder: (orderId: string) =>
    request<{ success: boolean; message: string }>(`/api/merchant/orders/${orderId}`, {
      method: 'DELETE'
    }, true),

  merchantClearCompletedOrders: () =>
    request<{ success: boolean; message: string; count: number }>('/api/merchant/orders/clear-completed-history', {
      method: 'POST'
    }, true),

  merchantWaiveDelivery: (orderId: string, reason?: string) =>
    request<{ success: boolean; message: string; order: any }>(`/api/merchant/orders/${orderId}/waive-delivery`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }, true),

  merchantGenerateCode: (orderId: string, codeType: 'pickup' | 'delivery') =>
    request<{ success: boolean; message: string; order: any }>(`/api/merchant/orders/${orderId}/generate-code`, {
      method: 'POST',
      body: JSON.stringify({ codeType })
    }, true),


  // Admin Rider Management APIs
  getAdminRiders: (filters?: { approvalStatus?: string; availabilityStatus?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
    if (filters?.availabilityStatus) params.append('availabilityStatus', filters.availabilityStatus);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString();
    return request<{ success: boolean; riders: any[] }>(`/api/admin/riders${qs ? `?${qs}` : ''}`);
  },

  getPendingRiders: () =>
    request<{ success: boolean; riders: any[] }>('/api/admin/riders/pending'),

  approveRider: (riderId: string, notes?: string) =>
    request<{ success: boolean; message: string; rider: any }>(`/api/admin/riders/${riderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  rejectRider: (riderId: string, notes?: string) =>
    request<{ success: boolean; message: string; rider: any }>(`/api/admin/riders/${riderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  suspendRider: (riderId: string, notes?: string) =>
    request<{ success: boolean; message: string; rider: any }>(`/api/admin/riders/${riderId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  reactivateRider: (riderId: string, notes?: string) =>
    request<{ success: boolean; message: string; rider: any }>(`/api/admin/riders/${riderId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  deleteRider: (riderId: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/riders/${riderId}`, {
      method: 'DELETE'
    })
};


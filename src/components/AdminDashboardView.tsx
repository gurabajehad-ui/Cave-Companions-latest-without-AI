import * as QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminNotificationManagementView } from './AdminNotificationManagementView';
import { AnalyticsView } from './AnalyticsView';
import {
  LogOut,
  ChevronDown,
  QrCode,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  Award,
  Users,
  Sliders,
  Filter,
  Eye,
  KeyRound,
  Lock,
  Unlock,
  MessageSquare,
  Send,
  ExternalLink,
  Building,
  Check,
  X,
  Plus,
  Printer,
  Download,
  Phone,
  MapPin,
  Percent,
  UserCheck,
  UserX,
  ChevronRight,
  Info,
  Receipt,
  Trash2,
  Edit3,
  BookOpen,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Landmark,
  Store,
  Wallet,
  Calendar,
  ChevronLeft,
  ShoppingBag,
  Truck,
  Bike,
  ArrowUpDown,
  FileText,
  Video,
  Navigation,
  Megaphone,
  Ticket,
  Shield,
  ShoppingCart,
  Bell,
  Menu,
  LayoutDashboard
} from 'lucide-react';
import { MosqueLocationPickerModal } from './MosqueLocationPickerModal';
import { api, getStoredAdminToken, setStoredAdminToken, removeStoredAdminToken } from '../services/api';
import { BANGLADESH_DISTRICTS, getDistrictUpazilaItems } from '../data/bangladeshGeo';
import {
  Shop,
  PartnerShop,
  Mosque,
  SupportTicket,
  ShopStatus,
  User
} from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { NasihaManagement } from './NasihaManagement';
import { BlogManagement } from './BlogManagement';
import { PartnerShopsView } from './PartnerShopsView';
import { ShopDetailsView } from './ShopDetailsView';
import { AppLogo } from './AppLogo';
import { AccountsManagement } from './AccountsManagement';
import { HelplineManagement } from './HelplineManagement';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminOnlineAccountsView } from './AdminOnlineAccountsView';
import { AdminDeliveryChargeView } from './AdminDeliveryChargeView';
import { AdminRiderManagementView } from './AdminRiderManagementView';
import AdvertisementManagement from './AdvertisementManagement';
import { CouponManagement } from './CouponManagement';
import { SecurityDiagnostic } from './SecurityDiagnostic';
import { AdminQuarantineView } from './AdminQuarantineView';
import { AdminProductApprovalView } from './AdminProductApprovalView';
import { AdminOverviewTab } from './AdminOverviewTab';

interface AdminUserWithStats extends User {
  totalPrayers: number;
  availableTokens: number;
  redeemedTokens: number;
}

function parsePermissions(perms: any): string[] {
  if (Array.isArray(perms)) return perms;
  if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function expandPermissions(perms: string[]): string[] {
  const result = new Set<string>();
  perms.forEach(p => {
    result.add(p);
    const backendPerms = FRONTEND_TO_BACKEND_PERMISSIONS_MAP[p];
    if (backendPerms) {
      backendPerms.forEach(bp => result.add(bp));
    }
  });
  return Array.from(result);
}

function isSectionChecked(perms: string[], value: string): boolean {
  if (perms.includes(value)) return true;
  // Fallback for backward compatibility with existing old admin accounts:
  if (value === 'MOSQUE_VIEW' && perms.includes('MOSQUE_VIEW')) return true;
  if (value === 'SHOP_VIEW' && perms.includes('SHOP_VIEW')) return true;
  if (value === 'USER_VIEW' && perms.includes('USER_VIEW')) return true;
  if (value === 'SUPPORT_VIEW' && perms.includes('SUPPORT_VIEW')) return true;
  if (value === 'ORDERS_VIEW' && perms.includes('ORDER_VIEW')) return true;
  if (value === 'ACCOUNTS_VIEW' && perms.includes('ACCOUNTS_VIEW')) return true;
  if (value === 'ADMIN_VIEW' && perms.includes('ADMIN_VIEW')) return true;
  if (value === 'ADS_VIEW' && perms.includes('ADS_VIEW')) return true;
  if (value === 'NASIHA_VIEW' && perms.includes('NASIHA_VIEW')) return true;
  if (value === 'DELIVERY_VIEW' && perms.includes('DELIVERY_VIEW')) return true;
  if (value === 'HELPLINE_VIEW' && perms.includes('HELPLINE_VIEW')) return true;
  if (value === 'NOTIFICATION_VIEW' && perms.includes('NOTIFICATION_VIEW')) return true;
  if (value === 'MODERATION_VIEW' && perms.includes('MODERATION_VIEW')) return true;
  if (value === 'SYSTEM_VIEW' && perms.includes('SYSTEM_VIEW')) return true;
  if (value === 'SECURITY_DIAGNOSTIC_VIEW' && perms.includes('AUDIT_VIEW')) return true;
  return false;
}

function togglePermissionInArray(currentPerms: string[], val: string, checked: boolean): string[] {
  let updated = [...currentPerms];
  if (checked) {
    // Unchecking: Remove this key and its mapped backend keys
    updated = updated.filter(p => p !== val);
    const mapped = FRONTEND_TO_BACKEND_PERMISSIONS_MAP[val];
    if (mapped) {
      mapped.forEach(mp => {
        // Only remove if it's not needed by other checked keys!
        const neededByOther = Object.keys(FRONTEND_TO_BACKEND_PERMISSIONS_MAP).some(k => 
          k !== val && updated.includes(k) && FRONTEND_TO_BACKEND_PERMISSIONS_MAP[k]?.includes(mp)
        );
        if (!neededByOther) {
          updated = updated.filter(p => p !== mp);
        }
      });
    }
  } else {
    // Checking: Add this key
    if (!updated.includes(val)) {
      updated.push(val);
    }
  }
  return updated;
}

const FRONTEND_TO_BACKEND_PERMISSIONS_MAP: Record<string, string[]> = {
  ANALYTICS_VIEW: ['ANALYTICS_VIEW', 'SYSTEM_VIEW'],
  PRODUCT_APPROVALS_VIEW: ['SHOP_VIEW', 'SHOP_EDIT', 'SHOP_DISCOUNT_APPROVE', 'PRODUCT_APPROVE', 'PRODUCT_MANAGE'],
  PENDING_OFFERS_VIEW: ['SHOP_VIEW', 'SHOP_DISCOUNT_APPROVE'],
  ACCOUNTS_VIEW: ['ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE', 'SYSTEM_VIEW'],
  ORDERS_VIEW: ['ORDER_VIEW', 'ORDER_MANAGE'],
  ONLINE_ACCOUNTS_VIEW: ['ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE', 'SYSTEM_VIEW'],
  COUPONS_VIEW: ['SYSTEM_VIEW', 'ORDER_VIEW', 'SHOP_VIEW'],
  DELIVERY_VIEW: ['DELIVERY_VIEW', 'DELIVERY_MANAGE', 'SYSTEM_VIEW'],
  MOSQUE_VIEW: ['MOSQUE_VIEW', 'MOSQUE_CREATE', 'MOSQUE_EDIT', 'MOSQUE_DELETE'],
  SHOP_VIEW: ['SHOP_VIEW', 'SHOP_CREATE', 'SHOP_EDIT', 'SHOP_DELETE'],
  USER_VIEW: ['USER_VIEW', 'USER_EDIT', 'USER_STATUS', 'USER_DELETE'],
  SUPPORT_VIEW: ['SUPPORT_VIEW', 'SUPPORT_REPLY'],
  ADMIN_VIEW: ['ADMIN_VIEW', 'ADMIN_CREATE', 'ADMIN_EDIT', 'ADMIN_DELETE'],
  ADS_VIEW: ['ADS_VIEW', 'ADS_MANAGE', 'SYSTEM_VIEW'],
  NASIHA_VIEW: ['NASIHA_VIEW', 'NASIHA_MANAGE'],
  HELPLINE_VIEW: ['HELPLINE_VIEW', 'HELPLINE_MANAGE'],
  SYSTEM_VIEW: ['SYSTEM_VIEW'],
  SECURITY_DIAGNOSTIC_VIEW: ['SYSTEM_VIEW', 'AUDIT_VIEW'],
  NOTIFICATION_VIEW: ['NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE', 'SYSTEM_VIEW'],
  MODERATION_VIEW: ['MODERATION_VIEW', 'MODERATION_MANAGE', 'SYSTEM_VIEW']
};

const ALL_PERMISSIONS = [
  { value: 'ANALYTICS_VIEW', label: 'এনালাইটিক্স & ইনসাইট (Analytics)', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'PRODUCT_APPROVALS_VIEW', label: 'পণ্য ব্যবস্থাপনা', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'PENDING_OFFERS_VIEW', label: 'পেন্ডিং অফার', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'ACCOUNTS_VIEW', label: 'হিসাব সমূহ', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'ORDERS_VIEW', label: 'অনলাইন অর্ডার', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'ONLINE_ACCOUNTS_VIEW', label: 'অনলাইন হিসাব', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'COUPONS_VIEW', label: 'কুপন ম্যানেজমেন্ট', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'DELIVERY_VIEW', label: 'ডেলিভারি চার্জ', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'MOSQUE_VIEW', label: 'মসজিদ ডিরেক্টরি', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'SHOP_VIEW', label: 'পার্টনার শপ', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'USER_VIEW', label: 'ইউজার তালিকা', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'SUPPORT_VIEW', label: 'সাপোর্ট টিকেট', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'ADMIN_VIEW', label: 'এডমিন একাউন্টস', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'ADS_VIEW', label: 'বিজ্ঞাপন', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'NASIHA_VIEW', label: 'নসিহা ম্যানেজমেন্ট', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'HELPLINE_VIEW', label: '📞 হেল্পলাইন', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'NOTIFICATION_VIEW', label: 'নোটিফিকেশন টেমপ্লেট', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'MODERATION_VIEW', label: '🛡️ সার্কেল মডারেশন', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'SYSTEM_VIEW', label: 'মেনু ও এক্সেস কন্ট্রোল', category: 'ড্যাশবোর্ড সেকশন' },
  { value: 'SECURITY_DIAGNOSTIC_VIEW', label: 'সিকিউরিটি ডায়াগনস্টিক', category: 'ড্যাশবোর্ড সেকশন' }
];

interface ImageCardProps {
  title: string;
  url?: string;
  isRequired?: boolean;
  onOpenLightbox: (url: string, title: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ title, url, isRequired = false, onOpenLightbox }) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  if (!url || !url.trim()) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1.5 h-36">
        <AlertTriangle className={`w-6 h-6 ${isRequired ? 'text-rose-400' : 'text-slate-500'}`} />
        <span className="text-xs font-bold text-slate-300">{title}</span>
        <span className={`text-[11px] font-semibold ${isRequired ? 'text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20' : 'text-slate-500'}`}>
          {isRequired ? 'Required Document Missing' : 'Not Provided'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 relative group overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">{title}</span>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
          Uploaded
        </span>
      </div>

      {hasError ? (
        <div className="h-32 bg-rose-950/20 border border-rose-800/40 rounded-lg flex flex-col items-center justify-center p-3 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span className="text-[11px] font-semibold text-rose-300">ছবি লোড করতে ব্যর্থ হয়েছে</span>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setRetryKey((k) => k + 1);
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>পুনরায় চেষ্টা করুন</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => onOpenLightbox(url, title)}
          className="relative h-32 rounded-lg overflow-hidden border border-slate-800 cursor-pointer group-hover:border-amber-500/50 transition-all bg-slate-900 flex items-center justify-center"
        >
          <img
            key={retryKey}
            src={url}
            alt={title}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>জুম করে বড় দেখুন</span>
          </div>
        </div>
      )}
    </div>
  );
};

const calculateAge = (dob: string | Date): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

interface AdminDashboardViewProps {
  onBack?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

const QRInlinePreview = ({ identifier, size = 128 }: { identifier: string; size?: number }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (identifier) {
      QRCode.toDataURL(identifier, {
        width: size * 2,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
        .then(u => setUrl(u))
        .catch(err => console.error('Inline QR error:', err));
    }
  }, [identifier, size]);

  if (!url) return <div className="animate-pulse bg-slate-800 rounded-lg" style={{ width: size, height: size }} />;
  return <img src={url} alt="QR" className="rounded-lg shadow-sm" style={{ width: size, height: size }} />;
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onBack,
  onShowToast
}) => {
  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return !!getStoredAdminToken();
  });
  const [adminPassKey, setAdminPassKey] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authenticating, setAuthenticating] = useState(false);

  // Dual login form states
  const [loginType, setLoginType] = useState<'key' | 'credentials'>('key');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Sessional role and permissions state
  const [adminRole, setAdminRole] = useState<string | null>(() => localStorage.getItem('admin_role'));
  const [adminPermissions, setAdminPermissions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_permissions') || '[]');
    } catch {
      return [];
    }
  });

  // Granular client-side permission checker
  const hasPermission = (permission: string) => {
    if (adminRole === 'MASTER_ADMIN') return true;
    if (adminPermissions.includes(permission)) return true;
    
    // Fallback mappings to old permission keys for existing admin accounts:
    if (permission === 'ANALYTICS_VIEW' && adminPermissions.includes('ANALYTICS_VIEW')) return true;
    if (permission === 'PRODUCT_APPROVALS_VIEW' && adminPermissions.includes('SHOP_VIEW')) return true;
    if (permission === 'PENDING_OFFERS_VIEW' && adminPermissions.includes('SHOP_VIEW')) return true;
    if (permission === 'ACCOUNTS_VIEW' && adminPermissions.includes('ACCOUNTS_VIEW')) return true;
    if (permission === 'ORDERS_VIEW' && adminPermissions.includes('ORDER_VIEW')) return true;
    if (permission === 'ONLINE_ACCOUNTS_VIEW' && adminPermissions.includes('ACCOUNTS_VIEW')) return true;
    if (permission === 'COUPONS_VIEW' && (adminPermissions.includes('SYSTEM_VIEW') || adminPermissions.includes('ORDER_VIEW') || adminPermissions.includes('SHOP_VIEW'))) return true;
    if (permission === 'DELIVERY_VIEW' && adminPermissions.includes('DELIVERY_VIEW')) return true;
    if (permission === 'MOSQUE_VIEW' && adminPermissions.includes('MOSQUE_VIEW')) return true;
    if (permission === 'SHOP_VIEW' && adminPermissions.includes('SHOP_VIEW')) return true;
    if (permission === 'USER_VIEW' && adminPermissions.includes('USER_VIEW')) return true;
    if (permission === 'SUPPORT_VIEW' && adminPermissions.includes('SUPPORT_VIEW')) return true;
    if (permission === 'ADMIN_VIEW' && adminPermissions.includes('ADMIN_VIEW')) return true;
    if (permission === 'ADS_VIEW' && adminPermissions.includes('ADS_VIEW')) return true;
    if (permission === 'NASIHA_VIEW' && adminPermissions.includes('NASIHA_VIEW')) return true;
    if (permission === 'HELPLINE_VIEW' && adminPermissions.includes('HELPLINE_VIEW')) return true;
    if (permission === 'SYSTEM_VIEW' && adminPermissions.includes('SYSTEM_VIEW')) return true;
    if (permission === 'SECURITY_DIAGNOSTIC_VIEW' && adminPermissions.includes('SYSTEM_VIEW')) return true;
    if (permission === 'NOTIFICATION_VIEW' && adminPermissions.includes('NOTIFICATION_VIEW')) return true;
    
    return false;
  };

  const getDefaultTab = () => {
    return 'dashboard';
  };
  const getInitialAdminTab = () => {
    if (typeof window === 'undefined') return getDefaultTab();
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    const validSubTabs = [
      'dashboard', 'analytics', 'product-approvals', 'pending-offers', 'pending-commission', 'accounts', 'orders', 
      'online-accounts', 'coupons', 'delivery-charge', 'riders', 'mosques', 'shops', 
      'users', 'tickets', 'admin-management', 'ads', 'nasiha', 'blog', 'helpline', 'menu', 'quarantine',
      'security-diagnostic', 'notification-templates'
    ];

    if (path.startsWith('/admin/')) {
      const sub = path.replace('/admin/', '');
      if (sub === 'products') return 'product-approvals';
      if (sub === 'pending-commission') return 'pending-commission';
      if (validSubTabs.includes(sub)) return sub;
    }
    
    if (hash.startsWith('#admin-')) {
      const sub = hash.replace('#admin-', '');
      if (sub === 'products') return 'product-approvals';
      if (sub === 'pending-commission') return 'pending-commission';
      if (validSubTabs.includes(sub)) return sub;
    }
    
    return getDefaultTab();
  };

  // Active section tab
  const [activeTab, setActiveTab] = useState<string>(getInitialAdminTab);

  // Synchronize active admin sub-tab to URL path
  useEffect(() => {
    if (isAdminAuthenticated && activeTab && activeTab !== 'unauthorized') {
      const currentPath = window.location.pathname;
      const search = window.location.search;
      const targetPath = `/admin/${activeTab}`;
      if (currentPath !== targetPath) {
        window.history.replaceState(null, '', `${targetPath}${search}`);
      }
    }
  }, [activeTab, isAdminAuthenticated]);

  // Data states
  // New Sidebar & Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminRiders, setAdminRiders] = useState<any[]>([]);

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isClearTicketsModalOpen, setIsClearTicketsModalOpen] = useState(false);
  const [clearTicketsFilter, setClearTicketsFilter] = useState<'ALL' | 'RESOLVED' | 'CLOSED'>('ALL');

  // Hierarchical admin lists
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);


  // Global config state
  const [globalConfig, setGlobalConfig] = useState<{ goldDiscountRate: number; silverDiscountRate: number; bronzeDiscountRate: number; updatedAt: string } | null>(null);
  const [editGoldRate, setEditGoldRate] = useState<number>(15);
  const [editSilverRate, setEditSilverRate] = useState<number>(10);
  const [editBronzeRate, setEditBronzeRate] = useState<number>(7);

  const handleSaveGlobalConfig = async () => {
    try {
      const res = await api.updateAdminConfig({
        goldDiscountRate: Number(editGoldRate),
        silverDiscountRate: Number(editSilverRate),
        bronzeDiscountRate: Number(editBronzeRate)
      });
      if (res.success) {
        setGlobalConfig(res.config);
        onShowToast('success', 'সফল', 'গ্লোবাল ডিসকাউন্ট কনফিগারেশন আপডেট করা হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'ডিসকাউন্ট কনফিগারেশন আপডেট ব্যর্থ হয়েছে।');
    }
  };

  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [selectedAdminForEdit, setSelectedAdminForEdit] = useState<any>(null);

  // Form states: New Admin
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUB_ADMIN'>('SUB_ADMIN');
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>([]);

  // Derived pending queues
  const pendingMerchants = (shops || []).filter(s => s.status === 'PENDING');
  const pendingOffers = (shops || []).filter(s => s.pendingGoldDiscount !== undefined || s.pendingSilverDiscount !== undefined || s.pendingBronzeDiscount !== undefined);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueSubTab, setMosqueSubTab] = useState<'active' | 'pending'>('active');
  const [mosqueSearch, setMosqueSearch] = useState('');
  const [selectedMosqueForEdit, setSelectedMosqueForEdit] = useState<Mosque | null>(null);
  const [selectedPendingMosque, setSelectedPendingMosque] = useState<Mosque | null>(null);
  const [mosqueToDelete, setMosqueToDelete] = useState<Mosque | null>(null);
  const [mosqueRejectReason, setMosqueRejectReason] = useState('');
  const [isRejectingMosque, setIsRejectingMosque] = useState(false);
  const [pendingProductRequestsCount, setPendingProductRequestsCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingProductCount = async () => {
      try {
        const res = await api.getPendingProductAddRequests();
        if (res.success && Array.isArray(res.requests)) {
          setPendingProductRequestsCount(res.requests.length);
        }
      } catch (e) {
        // silent catch
      }
    };
    fetchPendingProductCount();
  }, [activeTab]);

  useEffect(() => {
    if (!selectedPendingMosque) {
      setIsRejectingMosque(false);
      setMosqueRejectReason('');
    }
  }, [selectedPendingMosque]);

  const activeMosquesList = useMemo(() => {
    const q = (mosqueSearch || '').trim().toLowerCase();
    return (mosques || []).filter(m => {
      const status = (m.status || '').toLowerCase();
      const isEligible = status === 'active' || status === 'inactive' || (!status && status !== 'pending');
      if (!isEligible) return false;
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) || 
        (m.nameBn || '').toLowerCase().includes(q) || 
        (m.district || '').toLowerCase().includes(q) || 
        (m.area || '').toLowerCase().includes(q) ||
        (m.address || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
      );
    });
  }, [mosques, mosqueSearch]);

  const pendingMosquesList = useMemo(() => {
    const q = (mosqueSearch || '').trim().toLowerCase();
    return (mosques || []).filter(m => {
      const status = (m.status || '').toLowerCase();
      const isEligible = status === 'pending' || status === 'submitted';
      if (!isEligible) return false;
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) || 
        (m.nameBn || '').toLowerCase().includes(q) || 
        (m.district || '').toLowerCase().includes(q) || 
        (m.area || '').toLowerCase().includes(q) ||
        (m.address || '').toLowerCase().includes(q) ||
        (m.requestedByName || '').toLowerCase().includes(q) ||
        (m.requestedByPhone || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
      );
    });
  }, [mosques, mosqueSearch]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // User Filter states
  const [userMaritalStatusFilter, setUserMaritalStatusFilter] = useState('all');
  const [userGenderFilter, setUserGenderFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userDistrictFilter, setUserDistrictFilter] = useState('all');
  const [userUpazilaFilter, setUserUpazilaFilter] = useState('all');
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');
  const [userSortBy, setUserSortBy] = useState('created');
  const [userSortOrder, setUserSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isUserFilterPanelOpen, setIsUserFilterPanelOpen] = useState(false);

  // User Details Modal states
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);

  const handleOpenUserDetails = async (userId: string) => {
    setIsUserDetailsModalOpen(true);
    setUserDetailsLoading(true);
    setUserDetailsError(null);
    setSelectedUserForDetails(null);

    try {
      const res = await api.getUserDetails(userId);
      if (res.success && res.user) {
        setSelectedUserForDetails(res.user);
      } else {
        setUserDetailsError('ইউজারের তথ্য পাওয়া যায়নি।');
      }
    } catch (err: any) {
      console.error('Fetch user details error:', err);
      setUserDetailsError('ইউজারের তথ্য লোড করা যায়নি।');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  // Modals state
  const [isAddMosqueModalOpen, setIsAddMosqueModalOpen] = useState(false);
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [shopQrData, setShopQrData] = useState<{
    exists: boolean;
    status: string;
    qrIdentifier: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [shopQrLoading, setShopQrLoading] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<{
    type: 'SHOP';
    id: string;
    name: string;
    nameBn?: string;
    subtitle: string;
    qrIdentifier: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [ticketReplyModal, setTicketReplyModal] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commissionChangeRequests, setCommissionChangeRequests] = useState<any[]>([]);

  // Form states: Add Mosque
  const [newMosqueName, setNewMosqueName] = useState('');
  const [newMosqueNameBn, setNewMosqueNameBn] = useState('');
  const [newMosqueAddress, setNewMosqueAddress] = useState('');
  const [newMosqueArea, setNewMosqueArea] = useState('Dhaka');
  const [newMosqueDistrict, setNewMosqueDistrict] = useState('Dhaka');
  const [newMosqueImam, setNewMosqueImam] = useState('');
  const [newMosquePhone, setNewMosquePhone] = useState('');
  const [newMosqueDescription, setNewMosqueDescription] = useState('');
  const [newMosqueStatus, setNewMosqueStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [newMosqueLatitude, setNewMosqueLatitude] = useState('');
  const [newMosqueLongitude, setNewMosqueLongitude] = useState('');
  const [newMosqueVerificationRadius, setNewMosqueVerificationRadius] = useState('75');
  const [mapPickerContext, setMapPickerContext] = useState<'new' | 'edit' | null>(null);

  const handleGetCurrentLocationForMosque = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewMosqueLatitude(String(pos.coords.latitude));
          setNewMosqueLongitude(String(pos.coords.longitude));
          onShowToast('success', 'লোকেশন সংগৃহীত', 'জিপিএস স্থানাঙ্ক সফলভাবে যুক্ত হয়েছে।');
        },
        (err) => {
          onShowToast('error', 'ব্যর্থ', 'জিপিএস লোকেশন নেওয়া যায়নি। ব্রাউজার পারমিশন চেক করুন।');
        }
      );
    } else {
      onShowToast('error', 'অসমর্থিত', 'ব্রাউজার জিপিএস সাপোর্ট করে না।');
    }
  };

  // Form states: Add Shop
  const [newShopName, setNewShopName] = useState('');
  const [newShopNameBn, setNewShopNameBn] = useState('');
  const [newShopCategory, setNewShopCategory] = useState('food');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopArea, setNewShopArea] = useState('Dhaka');
  const [newShopDistrict, setNewShopDistrict] = useState('Dhaka');
  const [newShopDescription, setNewShopDescription] = useState('');
  const [newShopOpeningHours, setNewShopOpeningHours] = useState('10:00 AM - 10:00 PM');
  const [newShopOwnerName, setNewShopOwnerName] = useState('');
  const [newShopOwnerPin, setNewShopOwnerPin] = useState('');
  const [newShopGoldDiscount, setNewShopGoldDiscount] = useState<number>(15);
  const [newShopSilverDiscount, setNewShopSilverDiscount] = useState<number>(10);
  const [newShopBronzeDiscount, setNewShopBronzeDiscount] = useState<number>(5);
  const [newShopCommission, setNewShopCommission] = useState<number>(5);
  const [newShopStatus, setNewShopStatus] = useState<ShopStatus>('ACTIVE');

  // Form states: Edit / Configure Shop Discounts & Commission
  const [selectedShopForConfig, setSelectedShopForConfig] = useState<Shop | null>(null);
  const [editGoldDiscount, setEditGoldDiscount] = useState<number>(15);
  const [editSilverDiscount, setEditSilverDiscount] = useState<number>(10);
  const [editBronzeDiscount, setEditBronzeDiscount] = useState<number>(5);
  const [editCommissionRate, setEditCommissionRate] = useState<number>(5);
  const [editShopName, setEditShopName] = useState<string>('');
  const [editShopNameBn, setEditShopNameBn] = useState<string>('');
  const [editShopCategory, setEditShopCategory] = useState<string>('food');
  const [editShopPhone, setEditShopPhone] = useState<string>('');
  const [editShopAddress, setEditShopAddress] = useState<string>('');
  const [editShopArea, setEditShopArea] = useState<string>('Dhaka');
  const [editShopDistrict, setEditShopDistrict] = useState<string>('Dhaka');
  const [editShopOpeningHours, setEditShopOpeningHours] = useState<string>('');
  const [editShopDescription, setEditShopDescription] = useState<string>('');
  const [editShopStatus, setEditShopStatus] = useState<ShopStatus>('ACTIVE');

  // Generate QR Code data URL when QR item is selected
  useEffect(() => {
    let isMounted = true;
    if (qrModalItem?.qrIdentifier) {
      let payloadToEncode = qrModalItem.qrIdentifier;
      QRCode.toDataURL(payloadToEncode, {
        errorCorrectionLevel: 'H',
        width: 500,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => { if (isMounted) setQrDataUrl(url); })
        .catch(err => console.error('QR code generation error:', err));
    } else {
      setQrDataUrl('');
    }
    return () => {
      isMounted = false;
    };
  }, [qrModalItem]);

  // Form states: Change Password (within Menu Tab)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form states: Facebook-Style Moderator Access (within Menu Tab)
  const [modName, setModName] = useState('');
  const [modEmail, setModEmail] = useState('');
  const [modPhone, setModPhone] = useState('');
  const [modPassword, setModPassword] = useState('');
  const [modAccessLevel, setModAccessLevel] = useState<'full' | 'half'>('half');
  const [isAddingMod, setIsAddingMod] = useState(false);

  // Merchant Verifications & Details state
  const [merchantVerifications, setMerchantVerifications] = useState<import('../types').MerchantVerificationRecord[]>([]);
  const [selectedMerchantVerification, setSelectedMerchantVerification] = useState<import('../types').MerchantVerificationRecord | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShopRecord, setSelectedShopRecord] = useState<import('../types').MerchantVerificationRecord | null>(null);
  const [selectedMerchantVerificationLoading, setSelectedMerchantVerificationLoading] = useState(false);
  const [merchantStatusFilter, setMerchantStatusFilter] = useState<'PENDING' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  // Lightbox Image Viewer state
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Merchant Approval Modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalTargetVerification, setApprovalTargetVerification] = useState<import('../types').MerchantVerificationRecord | null>(null);

  // Merchant Correction Modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionTargetVerification, setCorrectionTargetVerification] = useState<import('../types').MerchantVerificationRecord | null>(null);
  const [correctionMessageText, setCorrectionMessageText] = useState('');
  const [correctionFields, setCorrectionFields] = useState<string[]>([]);

  // Merchant Rejection Modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionTargetVerification, setRejectionTargetVerification] = useState<import('../types').MerchantVerificationRecord | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Delete Shop Modal state
  const [deleteShopModalOpen, setDeleteShopModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<import('../types').MerchantVerificationRecord | null>(null);

  // Dismissed notification tracking state
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cave_admin_dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedNotificationIds(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem('cave_admin_dismissed_notifications', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save dismissed notification:', err);
      }
      return updated;
    });
    onShowToast?.('info', 'মুছে ফেলা হয়েছে', 'নোটিফিকেশনটি তালিকা থেকে সরানো হয়েছে।');
  };

  const handleClearAllNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = adminNotificationsRaw.map(n => n.id);
    setDismissedNotificationIds(prev => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('cave_admin_dismissed_notifications', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save dismissed notifications:', err);
      }
      return updated;
    });
    onShowToast?.('success', 'মুছে ফেলা হয়েছে', 'সকল নোটিফিকেশন সফলভাবে মুছে ফেলা হয়েছে।');
  };

  const handleRestoreNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedNotificationIds([]);
    try {
      localStorage.removeItem('cave_admin_dismissed_notifications');
    } catch (err) {
      console.error(err);
    }
    onShowToast?.('info', 'পুনরুদ্ধার', 'সকল নোটিফিকেশন আবার দৃশ্যমান করা হয়েছে।');
  };

  // Aggregated real-time admin notifications
  const adminNotificationsRaw = useMemo(() => {
    const list: Array<{
      id: string;
      category: 'mosque' | 'shop' | 'rider' | 'product' | 'commission' | 'ticket';
      title: string;
      description: string;
      badge: string;
      onClick: () => void;
    }> = [];

    // 1. Pending Mosques
    (pendingMosquesList || []).forEach((m, idx) => {
      list.push({
        id: `mosque-${m.id || idx}`,
        category: 'mosque',
        title: `নতুন মসজিদ আবেদন: ${m.nameBn || m.name}`,
        description: `${m.area || m.address || ''}, ${m.district || ''} • আবেদনকারী: ${m.requestedByName || 'দেওয়া নেই'}`,
        badge: 'মসজিদ',
        onClick: () => {
          setActiveTab('mosques');
          setMosqueSubTab('pending');
          setIsNotificationMenuOpen(false);
        }
      });
    });

    // 2. Pending Merchant Verifications
    (merchantVerifications || []).filter(v => v.verificationStatus === 'PENDING' || (v as any).status === 'PENDING').forEach((v, idx) => {
      list.push({
        id: `mch-${v.id || idx}`,
        category: 'shop',
        title: `মার্চেন্ট ভেরিফিকেশন: ${v.shopName}`,
        description: `${(v as any).applicantName || (v as any).ownerName || 'মালিক'} • ${v.district || ''} (${v.businessType || 'দোকান'})`,
        badge: 'পার্টনার শপ',
        onClick: () => {
          setSelectedMerchantVerification(v);
          setActiveTab('pending-merchants');
          setIsNotificationMenuOpen(false);
        }
      });
    });

    // Also check pending shops from shops list if not already included
    (pendingMerchants || []).forEach((s, idx) => {
      if (!list.some(item => item.id.includes(s.id))) {
        list.push({
          id: `shop-req-${s.id || idx}`,
          category: 'shop',
          title: `নতুন পার্টনার শপ অনুমোদন: ${s.nameBn || s.name}`,
          description: `${s.area || ''}, ${s.district || ''} • মোবাইল: ${s.phone || 'দেওয়া নেই'}`,
          badge: 'পার্টনার শপ',
          onClick: () => {
            setActiveTab('pending-merchants');
            setIsNotificationMenuOpen(false);
          }
        });
      }
    });

    // 3. Pending Delivery Riders
    (adminRiders || []).filter(r => r.approvalStatus === 'PENDING' || r.status === 'PENDING').forEach((r, idx) => {
      list.push({
        id: `rider-${r.id || idx}`,
        category: 'rider',
        title: `নতুন রাইডার আবেদন: ${r.name || 'রাইডার'}`,
        description: `ফোন: ${r.phone || ''} • জেলা: ${r.district || ''} • বাহন: ${r.vehicleType || 'বাইক'}`,
        badge: 'ডেলিভারি রাইডার',
        onClick: () => {
          setActiveTab('riders');
          setIsNotificationMenuOpen(false);
        }
      });
    });

    // 4. Pending Product Requests
    if (pendingProductRequestsCount > 0) {
      list.push({
        id: 'pending-products',
        category: 'product',
        title: `${toBnNumber(pendingProductRequestsCount)}টি পণ্য অনুমোদনের অপেক্ষায়`,
        description: 'মার্চেন্টদের পাঠানো নতুন পণ্যের লিস্টিং যাচাই করে লাইভ করুন',
        badge: 'পণ্য',
        onClick: () => {
          setActiveTab('product-approvals');
          setIsNotificationMenuOpen(false);
        }
      });
    }

    // 5. Commission & Offer Change Requests
    const pendingCommCount = (commissionChangeRequests || []).filter(r => r.status === 'pending').length;
    const pendingOfferCount = (pendingOffers || []).length;
    if (pendingCommCount > 0 || pendingOfferCount > 0) {
      list.push({
        id: 'pending-comm-req',
        category: 'commission',
        title: `কমিশন/অফার আপডেট রিকোয়েস্ট: ${toBnNumber(pendingCommCount + pendingOfferCount)}টি`,
        description: 'মার্চেন্টদের পাঠানো নতুন ডিসকাউন্ট রেট ও কমিশন পরিবর্তনের অনুরোধ',
        badge: 'কমিশন/অফার',
        onClick: () => {
          setActiveTab('pending-commission');
          setIsNotificationMenuOpen(false);
        }
      });
    }

    // 6. Open Support Tickets
    (tickets || []).filter(t => t.status === 'OPEN').slice(0, 5).forEach((t, idx) => {
      list.push({
        id: `ticket-${t.id || idx}`,
        category: 'ticket',
        title: `সাপোর্ট টিকেট: ${t.subject || 'নতুন অভিযোগ/বার্তা'}`,
        description: `ব্যবহারকারী: ${t.userName || t.userPhone || 'ইউজার'} • স্ট্যাটাস: ওপেন`,
        badge: 'সাপোর্ট',
        onClick: () => {
          setActiveTab('tickets');
          setIsNotificationMenuOpen(false);
        }
      });
    });

    return list;
  }, [pendingMosquesList, merchantVerifications, pendingMerchants, adminRiders, pendingProductRequestsCount, commissionChangeRequests, pendingOffers, tickets]);

  const adminNotifications = useMemo(() => {
    return adminNotificationsRaw.filter(item => !dismissedNotificationIds.includes(item.id));
  }, [adminNotificationsRaw, dismissedNotificationIds]);

  // Fetch all admin data with permission gates
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [];
      const keys: string[] = [];

      if (hasPermission('SHOP_VIEW')) {
        promises.push(api.getAdminShops());
        keys.push('shops');
        promises.push(api.getAdminMerchants('ACTIVE'));
        keys.push('merchantVerifications');
        promises.push(api.getAdminConfig());
        keys.push('globalConfig');
        promises.push(api.getAdminCommissionChangeRequests());
        keys.push('commissionChangeRequests');
      }
      if (hasPermission('MOSQUE_VIEW')) {
        promises.push(api.getAdminMosques());
        keys.push('mosques');
      }

      if (hasPermission('SUPPORT_VIEW')) {
        promises.push(api.getAdminTickets());
        keys.push('tickets');
      }
      if (hasPermission('USER_VIEW')) {
        promises.push(api.getAdminUsers());
        keys.push('users');
      }
      if (hasPermission('ADMIN_VIEW')) {
        promises.push(api.getAdminAccounts());
        keys.push('adminAccounts');
      }

      const results = await Promise.allSettled(promises);
      const newData: any = {};
      keys.forEach((key, i) => {
        const res = results[i];
        if (res.status === 'fulfilled') {
          const val = res.value;
          if (val && val.success) {
            if (key === 'shops') setShops(val.shops || []);
            else if (key === 'merchantVerifications') setMerchantVerifications(val.verifications || []);
            else if (key === 'mosques') setMosques(val.mosques || []);
            else if (key === 'tickets') setTickets(val.tickets || []);
            else if (key === 'users') setUsers(val.users || []);
            else if (key === 'adminAccounts') {
              const parsed = (val.accounts || val.admins || []).map((a: any) => ({
                ...a,
                permissions: parsePermissions(a.permissions)
              }));
              setAdminAccounts(parsed);
            }
            else if (key === 'globalConfig') setGlobalConfig(val.config || null);
            else if (key === 'commissionChangeRequests') setCommissionChangeRequests(val.requests || []);
            newData[key] = val;
          }
        } else {
          console.warn(`Failed to fetch admin key ${key}:`, res.reason);
        }
      });
      api.getAdminOrders().then(r => { if (r?.success && r.orders) setAdminOrders(r.orders); }).catch(() => {});
      api.getAdminRiders().then(r => { if (r?.success && r.riders) setAdminRiders(r.riders); }).catch(() => {});
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      onShowToast('error', 'ত্রুটি', 'এডমিন ডাটা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      if (userMaritalStatusFilter !== 'all') params.append('maritalStatus', userMaritalStatusFilter);
      if (userGenderFilter !== 'all') params.append('gender', userGenderFilter);
      if (userStatusFilter !== 'all') params.append('status', userStatusFilter);
      if (userDistrictFilter !== 'all') params.append('district', userDistrictFilter);
      if (userUpazilaFilter !== 'all') params.append('upazila', userUpazilaFilter);
      if (minAgeFilter) params.append('minAge', minAgeFilter);
      if (maxAgeFilter) params.append('maxAge', maxAgeFilter);
      if (userSortBy) params.append('sortBy', userSortBy);
      if (userSortOrder) params.append('sortOrder', userSortOrder);

      const res = await api.getAdminUsers(params.toString());
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err: any) {
      console.error('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isAdminAuthenticated) {
      // Debounce search
      const timer = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, userSearch, userMaritalStatusFilter, userGenderFilter, userStatusFilter, userDistrictFilter, userUpazilaFilter, minAgeFilter, maxAgeFilter, userSortBy, userSortOrder, isAdminAuthenticated]);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[AdminDashboard] Received admin-unauthorized event. Logging out admin.');
      removeStoredAdminToken();
      localStorage.removeItem('admin_role');
      localStorage.removeItem('admin_permissions');
      setAdminRole(null);
      setAdminPermissions([]);
      setIsAdminAuthenticated(false);
      setAuthenticating(false);
      setAdminPassKey('');
      onShowToast('error', 'প্রবেশাধিকার সংরক্ষিত', 'আপনার এডমিন সেশন শেষ হয়ে গেছে বা অননুমোদিত। অনুগ্রহ করে আবার লগইন করুন।');
    };

    window.addEventListener('admin-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('admin-unauthorized', handleUnauthorized);
    };
  }, [onShowToast]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAdminData();
    }
  }, [isAdminAuthenticated]);

  // Handler for approving a pending merchant application
  const handleApproveMerchant = async (shopId: string) => {
    try {
      setActionLoading(`approve-mch-${shopId}`);
      const res = await api.approveMerchantVerification(shopId, 'অ্যাডমিন ভেরিফিকেশন সম্পন্ন।');
      if (res.success) {
        onShowToast('success', 'অনুমোদিত', res.message || 'মার্চেন্ট এবং শপ অ্যাক্টিভ করা হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মার্চেন্ট অনুমোদন করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handler for reviewing merchant commission change request
  const handleReviewCommissionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      setActionLoading(`review-comm-${requestId}`);
      const res = await api.updateAdminCommissionChangeRequestStatus(requestId, status);
      if (res.success) {
        onShowToast('success', status === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত', res.message);
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'অনুরোধ আপডেট করতে ব্যর্থ।');
    } finally {
      setActionLoading(null);
    }
  };
  const handleCorrectionMerchant = async (shopId: string) => {
    const msg = window.prompt('তথ্য সংশোধনের নির্দেশ লিখুন (উদাঃ NID বা ট্রেড লাইসেন্সের ছবি অস্পষ্ট):');
    if (!msg || !msg.trim()) return;

    try {
      setActionLoading(`corr-mch-${shopId}`);
      const res = await api.requestCorrectionMerchantVerification(shopId, msg.trim());
      if (res.success) {
        onShowToast('info', 'সংশোধনের অনুরোধ পাঠানো হয়েছে', 'মার্চেন্টকে সংশোধন বার্তা পাঠানো হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'সংশোধন অনুরোধ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handler for rejecting a pending merchant application
  const handleRejectMerchant = async (shopId: string) => {
    const reason = window.prompt('আবেদন বাতিলের কারণ লিখুন:');
    if (!reason || !reason.trim()) return;

    try {
      setActionLoading(`reject-mch-${shopId}`);
      const res = await api.rejectMerchantVerification(shopId, reason.trim());
      if (res.success) {
        onShowToast('info', 'বাতিল করা হয়েছে', res.message || 'মার্চেন্ট আবেদন বাতিল করা হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মার্চেন্ট আবেদন বাতিল করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handler for approving a pending offer / discount update
  const handleApproveOffer = async (shopId: string) => {
    try {
      setActionLoading(`approve-off-${shopId}`);
      const res = await api.approveAdminOfferRequest(shopId);
      if (res.success) {
        onShowToast('success', 'অফার অনুমোদিত', res.message);
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'অফার অনুমোদন করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handler for rejecting a pending offer / discount update
  const handleRejectOffer = async (shopId: string) => {
    try {
      setActionLoading(`reject-off-${shopId}`);
      const res = await api.rejectAdminOfferRequest(shopId);
      if (res.success) {
        onShowToast('info', 'অফার বাতিল করা হয়েছে', res.message);
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'অফার আপডেট বাতিল করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Detailed Verification Handlers
  const handleSaveShopOffersDirect = async (shopId: string) => {
    try {
      setActionLoading('save-offers');
      const res = await api.updateAdminShopOffers(shopId, {
        commissionPercent: Number(editCommissionRate),
        goldDiscountPercent: Number(editGoldDiscount),
        silverDiscountPercent: Number(editSilverDiscount),
        bronzeDiscountPercent: Number(editBronzeDiscount)
      });
      if (res.success) {
        onShowToast('success', 'সফল', res.message || 'শপ অফার ও কমিশন সফলভাবে সংরক্ষিত হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'অফার সংরক্ষণ করতে ব্যর্থ।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectMerchantVerification = async (merchantIdOrShopId: string) => {
    setSelectedMerchantVerificationLoading(true);
    setShopQrData(null);
    try {
      const res = await api.getAdminMerchantById(merchantIdOrShopId) as any;
      if (res && res.success) {
        const v = res.verification || {};
        const shopPhoto = v.shopPhotoUrl || res.shopDetails?.shopPhotoUrl || res.shopDetails?.shopPhoto || res.shop?.photoUrl || '';
        const nidFront = v.nidFrontUrl || res.ownerVerification?.nidFrontUrl || res.ownerVerification?.nidFrontImage || '';
        const nidBack = v.nidBackUrl || res.ownerVerification?.nidBackUrl || res.ownerVerification?.nidBackImage || '';
        const ownerSelfie = v.ownerSelfieUrl || res.ownerVerification?.ownerSelfieUrl || res.ownerVerification?.ownerSelfie || '';
        const tradeLicense = v.tradeLicenseUrl || res.businessVerification?.tradeLicenseUrl || res.businessVerification?.tradeLicenseImage || '';

        const fullRecord: import('../types').MerchantVerificationRecord = {
          ...v,
          ownerName: v.ownerName || res.account?.ownerName || '',
          phone: v.phone || res.account?.phone || '',
          email: v.email || res.account?.email || undefined,
          shopName: v.shopName || res.shopDetails?.shopName || res.shop?.name || '',
          businessType: v.businessType || res.shopDetails?.businessType || res.shop?.category || '',
          shopAddress: v.shopAddress || res.shopDetails?.address || res.shop?.address || '',
          district: v.district || res.shopDetails?.district || res.shop?.district || 'Dhaka',
          upazilaThana: v.upazilaThana || res.shopDetails?.upazila || res.shop?.area || 'Central',
          latitude: v.latitude ?? res.shopDetails?.location?.latitude ?? res.shop?.latitude ?? 0,
          longitude: v.longitude ?? res.shopDetails?.location?.longitude ?? res.shop?.longitude ?? 0,
          shopPhotoUrl: shopPhoto,
          businessDescription: v.businessDescription || res.shopDetails?.businessDescription || res.shop?.description || '',
          nidNumber: v.nidNumber || res.ownerVerification?.nidNumber || '',
          nidFrontUrl: nidFront,
          nidBackUrl: nidBack,
          ownerSelfieUrl: ownerSelfie,
          tradeLicenseNumber: v.tradeLicenseNumber || res.businessVerification?.tradeLicenseNumber || '',
          tradeLicenseUrl: tradeLicense,
          tinNumber: v.tinNumber || res.businessVerification?.tinNumber || undefined,
          binVatNumber: v.binVatNumber || res.businessVerification?.binVatNumber || undefined,
          acceptedTotalCommission: v.acceptedTotalCommission ?? res.commissionAgreement?.totalCommissionPercent ?? 10,
          acceptedGoldUserBenefit: v.acceptedGoldUserBenefit ?? res.commissionAgreement?.goldUserBenefitPercent ?? 5,
          acceptedGoldPlatformCommission: v.acceptedGoldPlatformCommission ?? res.commissionAgreement?.goldPlatformCommissionPercent ?? 5,
          acceptedSilverUserBenefit: v.acceptedSilverUserBenefit ?? res.commissionAgreement?.silverUserBenefitPercent ?? 4,
          acceptedSilverPlatformCommission: v.acceptedSilverPlatformCommission ?? res.commissionAgreement?.silverPlatformCommissionPercent ?? 6,
          acceptedBronzeUserBenefit: v.acceptedBronzeUserBenefit ?? res.commissionAgreement?.bronzeUserBenefitPercent ?? 3,
          acceptedBronzePlatformCommission: v.acceptedBronzePlatformCommission ?? res.commissionAgreement?.bronzePlatformCommissionPercent ?? 7,
          agreementAccepted: v.agreementAccepted ?? res.commissionAgreement?.agreementAccepted ?? true,
          agreementAcceptedAt: v.agreementAcceptedAt || res.commissionAgreement?.agreementAcceptedAt || v.createdAt || '',
          agreementVersion: v.agreementVersion || res.commissionAgreement?.agreementVersion || 'v1.0',
          verificationStatus: v.verificationStatus || res.verificationStatus || 'PENDING',
          merchantStatus: v.merchantStatus || res.merchantStatus || 'PENDING_VERIFICATION',
          qrIdentifier: res.shop?.qrIdentifier || v.qrIdentifier || '',
          qrUpdatedAt: res.shop?.updatedAt || v.qrUpdatedAt || '',
        };

        setSelectedMerchantVerification(fullRecord);
        setSelectedShopForConfig({
          id: fullRecord.shopId || merchantIdOrShopId,
          name: fullRecord.shopName,
          commissionRate: fullRecord.acceptedTotalCommission,
          goldDiscount: fullRecord.acceptedGoldUserBenefit,
          silverDiscount: fullRecord.acceptedSilverUserBenefit,
          bronzeDiscount: fullRecord.acceptedBronzeUserBenefit,
        } as any);
        
        const shopIdToFetch = fullRecord.shopId || merchantIdOrShopId;
        if (shopIdToFetch) {
          fetchShopQr(shopIdToFetch);
          try {
            const offersRes = await api.getAdminShopOffers(shopIdToFetch);
            if (offersRes && offersRes.success) {
              setEditCommissionRate(offersRes.commissionPercent ?? 5);
              setEditGoldDiscount(offersRes.goldDiscountPercent ?? 15);
              setEditSilverDiscount(offersRes.silverDiscountPercent ?? 10);
              setEditBronzeDiscount(offersRes.bronzeDiscountPercent ?? 5);
            }
          } catch (e) {
            // fallback
          }
        }
      } else {
        onShowToast('error', 'ত্রুটি', 'মার্চেন্টের বিবরণ পাওয়া যায়নি।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'মার্চেন্টের বিবরণ লোড করা যায়নি।');
    } finally {
      setSelectedMerchantVerificationLoading(false);
    }
  };

  const fetchShopQr = async (shopId: string) => {
    setShopQrLoading(true);
    try {
      const res = await api.getAdminShopQr(shopId);
      if (res.success) {
        setShopQrData(res.qr);
      }
    } catch (err) {
      console.error('Error fetching shop QR:', err);
    } finally {
      setShopQrLoading(false);
    }
  };

  const handleOpenApprovalModal = (verification: import('../types').MerchantVerificationRecord) => {
    setApprovalTargetVerification(verification);
    setApprovalModalOpen(true);
  };

  const handleSubmitApproval = async () => {
    if (!approvalTargetVerification) return;
    const verificationId = approvalTargetVerification.id;
    setActionLoading(`approve-mch-${verificationId}`);
    try {
      const res = await api.approveAdminMerchant(verificationId);
      if (res.success) {
        onShowToast('success', 'অনুমোদিত', res.message || 'মার্চেন্ট আবেদন সফলভাবে অনুমোদন করা হয়েছে।');
        setApprovalModalOpen(false);
        setApprovalTargetVerification(null);
        if (
          selectedMerchantVerification &&
          (selectedMerchantVerification.id === verificationId ||
           selectedMerchantVerification.merchantId === verificationId ||
           selectedMerchantVerification.shopId === verificationId)
        ) {
          // Instead of keeping it selected and showing APPROVED, we can close the details
          // or just update it
          setSelectedMerchantVerification(res.verification);
        }
        loadAdminData();
      } else {
        onShowToast('error', 'ব্যর্থ', res.message || 'অনুমোদনে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'অনুমোদনে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCorrectionModal = (verification: import('../types').MerchantVerificationRecord) => {
    setCorrectionTargetVerification(verification);
    setCorrectionMessageText('');
    setCorrectionFields([]);
    setCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!correctionTargetVerification) return;
    if (!correctionMessageText.trim()) {
      onShowToast('error', 'ইনপুট ত্রুটি', 'সংশোধনের বিবরণ উল্লেখ করুন।');
      return;
    }
    setActionLoading(`corr-mch-${correctionTargetVerification.id}`);
    try {
      const res = await api.requestCorrectionAdminMerchant(
        correctionTargetVerification.id,
        correctionMessageText.trim(),
        correctionFields
      );
      if (res.success) {
        onShowToast('success', 'অনুরোধ প্রেরিত', 'মার্চেন্টকে সংশোধন অনুরোধ পাঠানো হয়েছে।');
        setCorrectionModalOpen(false);
        setCorrectionTargetVerification(null);
        if (
          selectedMerchantVerification &&
          (selectedMerchantVerification.id === correctionTargetVerification.id ||
           selectedMerchantVerification.merchantId === correctionTargetVerification.merchantId ||
           selectedMerchantVerification.shopId === correctionTargetVerification.shopId)
        ) {
          setSelectedMerchantVerification(res.verification);
        }
        loadAdminData();
      } else {
        onShowToast('error', 'ব্যর্থ', res.message || 'সংশোধন অনুরোধ পাঠাতে ব্যর্থ।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'সংশোধন অনুরোধ পাঠাতে ব্যর্থ।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectionModal = (verification: import('../types').MerchantVerificationRecord) => {
    setRejectionTargetVerification(verification);
    setRejectionReasonText('');
    setRejectionModalOpen(true);
  };

  const handleSubmitRejection = async () => {
    if (!rejectionTargetVerification) return;
    if (!rejectionReasonText.trim()) {
      onShowToast('error', 'ইনপুট ত্রুটি', 'বাতিলের কারণ উল্লেখ করুন।');
      return;
    }
    setActionLoading(`reject-mch-${rejectionTargetVerification.id}`);
    try {
      const res = await api.rejectAdminMerchant(
        rejectionTargetVerification.id,
        rejectionReasonText.trim()
      );
      if (res.success) {
        onShowToast('success', 'বাতিল করা হয়েছে', 'মার্চেন্ট আবেদনটি বাতিল করা হয়েছে।');
        setRejectionModalOpen(false);
        setRejectionTargetVerification(null);
        if (
          selectedMerchantVerification &&
          (selectedMerchantVerification.id === rejectionTargetVerification.id ||
           selectedMerchantVerification.merchantId === rejectionTargetVerification.merchantId ||
           selectedMerchantVerification.shopId === rejectionTargetVerification.shopId)
        ) {
          setSelectedMerchantVerification(res.verification);
        }
        loadAdminData();
      } else {
        onShowToast('error', 'ব্যর্থ', res.message || 'আবেদন বাতিলে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'আবেদন বাতিলে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const getMissingRequirements = (vrf: import('../types').MerchantVerificationRecord) => {
    const missing: string[] = [];
    if (!vrf.ownerName || !vrf.ownerName.trim()) missing.push('Owner Full Name (মালিকের নাম)');
    if (!vrf.phone || !vrf.phone.trim()) missing.push('Verified Mobile Number (মোবাইল নম্বর)');
    if (!vrf.shopName || !vrf.shopName.trim()) missing.push('Shop Name (দোকানের নাম)');
    if (!vrf.shopAddress || !vrf.shopAddress.trim()) missing.push('Shop Address (ঠিকানা)');
    if (!vrf.nidNumber || vrf.nidNumber === 'Not provided' || !vrf.nidNumber.trim()) missing.push('NID Number (এনআইডি নম্বর)');
    if (!vrf.nidFrontUrl || !vrf.nidFrontUrl.trim()) missing.push('NID Front Image (এনআইডি সামনের ছবি)');
    if (!vrf.nidBackUrl || !vrf.nidBackUrl.trim()) missing.push('NID Back Image (এনআইডি পেছনের ছবি)');
    if (!vrf.ownerSelfieUrl || !vrf.ownerSelfieUrl.trim()) missing.push('Owner Selfie / Live Photo (মালিকের সেলফি)');
    if (!vrf.tradeLicenseNumber || vrf.tradeLicenseNumber === 'Not provided' || !vrf.tradeLicenseNumber.trim()) missing.push('Trade License Number (ট্রেড লাইসেন্স নম্বর)');
    if (!vrf.tradeLicenseUrl || !vrf.tradeLicenseUrl.trim()) missing.push('Trade License Image (ট্রেড লাইসেন্স ছবি)');
    if (!vrf.agreementAccepted) missing.push('Commission Agreement Accepted (চুক্তিতে সম্মতি)');
    return missing;
  };

  // Handle Admin Key Verification / Credentials Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticating) return;
    setAuthenticating(true);
    setAuthError('');

    try {
      let payload: any = {};
      if (loginType === 'key') {
        const keyToTest = adminPassKey.trim();
        if (!keyToTest) {
          setAuthError('দয়া করে এডমিন সিক্রেট কী লিখুন');
          setAuthenticating(false);
          return;
        }
        payload = { adminKey: keyToTest };
      } else {
        const emailOrPhone = adminEmail.trim() || adminPhone.trim();
        if (!emailOrPhone) {
          setAuthError('দয়া করে ইমেইল অথবা ফোন নম্বর লিখুন');
          setAuthenticating(false);
          return;
        }
        if (!adminPassKey.trim()) {
          setAuthError('দয়া করে পাসওয়ার্ড লিখুন');
          setAuthenticating(false);
          return;
        }
        payload = {
          email: adminEmail.trim() || undefined,
          phone: adminPhone.trim() || undefined,
          password: adminPassKey.trim()
        };
      }

      console.log('[AdminDashboardView] Dispatching login request to api.loginAdmin...', {
        loginType,
        payloadStructure: {
          hasAdminKey: Boolean(payload.adminKey),
          hasEmail: Boolean(payload.email),
          hasPhone: Boolean(payload.phone),
          hasPassword: Boolean(payload.password)
        }
      });

      const res = await api.loginAdmin(payload);

      console.log('[AdminDashboardView] Received login response:', {
        success: res.success,
        matchesExpectedFormat: typeof res.success === 'boolean' && typeof res.token === 'string',
        role: res.role,
        permissionsCount: Array.isArray(res.permissions) ? res.permissions.length : 0
      });

      if (res.success) {
        setStoredAdminToken(res.token);
        
        const role = res.role || 'SUB_ADMIN';
        const permissions = res.permissions || [];

        setAdminRole(role);
        setAdminPermissions(permissions);

        localStorage.setItem('admin_role', role);
        localStorage.setItem('admin_permissions', JSON.stringify(permissions));


        setIsAdminAuthenticated(true);
        
        if (role === 'MASTER_ADMIN') {
          setActiveTab('shops');
        } else {
          const p = permissions;
          if (p.includes('SHOP_VIEW')) setActiveTab('shops');
          else if (p.includes('ACCOUNTS_VIEW')) setActiveTab('accounts');
          else if (p.includes('ORDER_VIEW')) setActiveTab('orders');
          else if (p.includes('DELIVERY_VIEW')) setActiveTab('delivery-charge');
          else if (p.includes('MOSQUE_VIEW')) setActiveTab('mosques');
          else if (p.includes('USER_VIEW')) setActiveTab('users');
          else if (p.includes('SUPPORT_VIEW')) setActiveTab('tickets');
          else if (p.includes('ADMIN_VIEW')) setActiveTab('admin-management');
          else if (p.includes('ADS_VIEW')) setActiveTab('ads');
          else if (p.includes('NASIHA_VIEW')) setActiveTab('nasiha');
          else if (p.includes('HELPLINE_VIEW')) setActiveTab('helpline');
          else if (p.includes('SYSTEM_VIEW')) setActiveTab('menu');
          else setActiveTab('unauthorized');
        }

        onShowToast('success', 'অনুমোদিত', 'এডমিন প্যানেলে স্বাগতম!');
      } else {
        setAuthError('ভুল এডমিন সিক্রেট কী বা ইমেইল/পাসওয়ার্ড');
        onShowToast('error', 'প্রবেশাধিকার নিষিদ্ধ', 'প্রবেশাধিকার প্রত্যাখ্যান করা হয়েছে।');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('SUSPENDED') || msg.includes('ACCOUNT_SUSPENDED') || msg.includes('403') || msg.includes('স্থগিত') || msg.includes('সাসপেন্ড')) {
        setAuthError('আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।');
        onShowToast('error', 'অ্যাকাউন্ট সাসপেন্ড', 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।');
      } else {
        setAuthError(msg || 'ভুল এডমিন সিক্রেট কী বা ইমেইল/পাসওয়ার্ড');
        onShowToast('error', 'প্রবেশাধিকার নিষিদ্ধ', 'প্রবেশাধিকার প্রত্যাখ্যান করা হয়েছে।');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const handleAdminLogout = () => {
    removeStoredAdminToken();
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_permissions');
    setAdminRole(null);
    setAdminPermissions([]);
    setIsAdminAuthenticated(false);
    setAuthenticating(false);
    setAdminPassKey('');
    onShowToast('info', 'লগআউট', 'এডমিন সেশন সমাপ্ত হয়েছে।');
  };

  // Create New Hierarchical Admin Handler
  const handleCreateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminPassword.trim()) {
      onShowToast('error', 'ত্রুটি', 'এডমিনের নাম ও পাসওয়ার্ড আবশ্যক।');
      return;
    }
    const emailOrPhone = newAdminEmail.trim() || newAdminPhone.trim();
    if (!emailOrPhone) {
      onShowToast('error', 'ত্রুটি', 'ইমেল বা ফোন নম্বর অন্তত একটি আবশ্যক।');
      return;
    }

    try {
      setActionLoading('create-admin');
      const res = await api.createAdminAccount({
        name: newAdminName.trim(),
        email: newAdminEmail.trim() || undefined,
        phone: newAdminPhone.trim() || undefined,
        password: newAdminPassword.trim(),
        role: newAdminRole,
        permissions: expandPermissions(newAdminPermissions)
      });

      if (res.success) {
        const createdAdmin = {
          ...res.admin,
          permissions: parsePermissions(res.admin?.permissions)
        };
        setAdminAccounts(prev => [createdAdmin, ...prev]);
        setIsAddAdminModalOpen(false);
        // Reset form
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPhone('');
        setNewAdminPassword('');
        setNewAdminRole('SUB_ADMIN');
        setNewAdminPermissions([]);
        onShowToast('success', 'সফল', res.message || 'নতুন এডমিন অ্যাকাউন্ট তৈরি হয়েছে।');
        loadAdminData(); // Refresh audit logs and list
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'এডমিন অ্যাকাউন্ট তৈরি করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Update Hierarchical Admin Account
  const handleUpdateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminForEdit) return;

    try {
      setActionLoading(`edit-admin-${selectedAdminForEdit.id}`);
      const res = await api.updateAdminAccount(selectedAdminForEdit.id, {
        name: selectedAdminForEdit.name,
        email: selectedAdminForEdit.email || undefined,
        phone: selectedAdminForEdit.phone || undefined,
        role: selectedAdminForEdit.role,
        permissions: expandPermissions(selectedAdminForEdit.permissions),
        status: selectedAdminForEdit.status
      });

      if (res.success) {
        const updatedAdmin = {
          ...res.admin,
          permissions: parsePermissions(res.admin?.permissions)
        };
        setAdminAccounts(prev => prev.map((a, idx) => a.id === selectedAdminForEdit.id ? updatedAdmin : a));
        setIsEditAdminModalOpen(false);
        setSelectedAdminForEdit(null);
        onShowToast('success', 'সফল', res.message || 'এডমিন অ্যাকাউন্ট সফলভাবে আপডেট হয়েছে।');
        loadAdminData(); // Refresh audit logs and list
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'এডমিন অ্যাকাউন্ট আপডেট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Admin Account Handler
  const handleDeleteAdminAccount = async (id: string) => {
    try {
      setActionLoading(`delete-admin-${id}`);
      const res = await api.deleteAdminAccount(id);
      if (res.success) {
        setAdminAccounts(prev => prev.filter(a => a.id !== id));
        onShowToast('success', 'সফল', res.message || 'এডমিন অ্যাকাউন্ট মুছে ফেলা হয়েছে।');
        loadAdminData(); // Refresh audit logs
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'এডমিন অ্যাকাউন্ট ডিলিট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handler: Change Self Password
  const handleSelfChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      onShowToast('error', 'ব্যর্থ', 'অনুগ্রহ করে পাসওয়ার্ডের সবগুলো ফিল্ড পূরণ করুন।');
      return;
    }
    if (newPassword.length < 6) {
      onShowToast('error', 'ব্যর্থ', 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      onShowToast('error', 'ব্যর্থ', 'নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি।');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await api.changeAdminPassword({ oldPassword, newPassword });
      if (res.success) {
        onShowToast('success', 'সফল', res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handler: Save/Invite Moderator (Facebook-style full/half access)
  const handleSaveModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim() || !modPhone.trim() || !modPassword.trim()) {
      onShowToast('error', 'ব্যর্থ', 'দয়া করে মডারেটরের নাম, ফোন নম্বর এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    // Determine roles and permissions based on access level like a FB page role
    const isFullAccess = modAccessLevel === 'full';
    const role = isFullAccess ? 'ADMIN' : 'SUB_ADMIN';
    const permissions = isFullAccess 
      ? [
          'MOSQUE_VIEW', 'MOSQUE_CREATE', 'MOSQUE_EDIT', 'MOSQUE_DELETE',
          'SHOP_VIEW', 'SHOP_CREATE', 'SHOP_EDIT', 'SHOP_DELETE', 'SHOP_DISCOUNT_APPROVE',
          'USER_VIEW', 'USER_STATUS',
          'SUPPORT_VIEW', 'SUPPORT_REPLY',
          'SYSTEM_VIEW'
        ]
      : [
          'MOSQUE_VIEW',
          'SHOP_VIEW',
          'USER_VIEW',
          'SUPPORT_VIEW', 'SUPPORT_REPLY',
          'SYSTEM_VIEW'
        ];

    try {
      setIsAddingMod(true);
      const res = await api.createAdminAccount({
        name: modName.trim(),
        email: modEmail.trim() || `${modPhone.trim()}@cavecompanions.org`,
        phone: modPhone.trim(),
        role,
        permissions,
        password: modPassword
      });

      if (res.success) {
        onShowToast('success', 'সফল', res.message || 'মডারেটর সফলভাবে যুক্ত করা হয়েছে।');
        setModName('');
        setModEmail('');
        setModPhone('');
        setModPassword('');
        setModAccessLevel('half');
        loadAdminData(); // refresh list
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মডারেটর যুক্ত করা যায়নি।');
    } finally {
      setIsAddingMod(false);
    }
  };

  // Handler: Toggle Access Level (Facebook style)
  const handleToggleModAccess = async (id: string, currentRole: string) => {
    try {
      setActionLoading(`toggle-access-${id}`);
      const isFullAccess = currentRole === 'SUB_ADMIN'; // Toggle to ADMIN (Full)
      const targetRole = isFullAccess ? 'ADMIN' : 'SUB_ADMIN';
      const targetPermissions = isFullAccess
        ? [
            'MOSQUE_VIEW', 'MOSQUE_CREATE', 'MOSQUE_EDIT', 'MOSQUE_DELETE',
            'SHOP_VIEW', 'SHOP_CREATE', 'SHOP_EDIT', 'SHOP_DELETE', 'SHOP_DISCOUNT_APPROVE',
            'USER_VIEW', 'USER_STATUS',
            'SUPPORT_VIEW', 'SUPPORT_REPLY',
            'SYSTEM_VIEW'
          ]
        : [
            'MOSQUE_VIEW',
            'SHOP_VIEW',
            'USER_VIEW',
            'SUPPORT_VIEW', 'SUPPORT_REPLY',
            'SYSTEM_VIEW'
          ];

      const res = await api.updateAdminAccount(id, {
        role: targetRole,
        permissions: targetPermissions
      });

      if (res.success) {
        onShowToast('success', 'সফল', 'মডারেটরের এক্সেস লেভেল সফলভাবে পরিবর্তন করা হয়েছে।');
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'এক্সেস লেভেল পরিবর্তন করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Create New Mosque Handler
  const handleCreateMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMosqueName.trim() || !newMosqueAddress.trim()) {
      onShowToast('error', 'ত্রুটি', 'মসজিদের নাম ও ঠিকানা আবশ্যক।');
      return;
    }

    try {
      setActionLoading('create-mosque');
      const mosqueName = newMosqueName.trim() || newMosqueNameBn.trim();
      if (!mosqueName || !newMosqueAddress.trim()) {
        onShowToast('error', 'ত্রুটি', 'মসজিদের নাম ও ঠিকানা আবশ্যক।');
        return;
      }

      const res = await api.createAdminMosque({
        name: mosqueName,
        nameBn: newMosqueNameBn.trim() || mosqueName,
        address: newMosqueAddress.trim(),
        area: newMosqueArea.trim(),
        district: newMosqueDistrict.trim(),
        imamName: newMosqueImam.trim() || undefined,
        contactNumber: newMosquePhone.trim() || undefined,
        description: newMosqueDescription.trim() || undefined,
        status: newMosqueStatus,
        latitude: newMosqueLatitude ? Number(newMosqueLatitude) : 0,
        longitude: newMosqueLongitude ? Number(newMosqueLongitude) : 0,
        verificationRadius: newMosqueVerificationRadius ? Math.max(10, Math.min(500, Number(newMosqueVerificationRadius))) : 75
      });

      if (res.success && res.mosque) {
        setMosques(prev => [res.mosque, ...prev]);
        setIsAddMosqueModalOpen(false);
        // Reset form
        setNewMosqueName('');
        setNewMosqueNameBn('');
        setNewMosqueAddress('');
        setNewMosqueImam('');
        setNewMosquePhone('');
        setNewMosqueLatitude('');
        setNewMosqueLongitude('');
        setNewMosqueVerificationRadius('75');
        onShowToast('success', 'সফল', res.message || 'নতুন মসজিদ যুক্ত হয়েছে।');
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মসজিদ যুক্ত করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Create New Partner Shop Handler
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newShopPhone.trim() || !newShopAddress.trim()) {
      onShowToast('error', 'ত্রুটি', 'শপের নাম, যোগাযোগের ফোন ও ঠিকানা আবশ্যক।');
      return;
    }

    if (!newShopOwnerPin.trim() || newShopOwnerPin.trim().length < 6) {
      onShowToast('error', 'ত্রুটি', 'শপ ওনারের পিন কোড ন্যূনতম ৬ ডিজিটের হতে হবে।');
      return;
    }

    try {
      setActionLoading('create-shop');
      const res = await api.createAdminShop({
        name: newShopName.trim(),
        nameBn: newShopNameBn.trim() || newShopName.trim(),
        category: newShopCategory,
        phone: newShopPhone.trim(),
        address: newShopAddress.trim(),
        area: newShopArea.trim(),
        district: newShopDistrict.trim(),
        description: newShopDescription.trim() || undefined,
        openingHours: newShopOpeningHours.trim(),
        ownerName: newShopOwnerName.trim() || undefined,
        ownerPin: newShopOwnerPin.trim(),
        goldDiscount: Number(newShopGoldDiscount),
        silverDiscount: Number(newShopSilverDiscount),
        bronzeDiscount: Number(newShopBronzeDiscount),
        commissionRate: Number(newShopCommission),
        status: newShopStatus
      });

      if (res.success && res.shop) {
        setShops(prev => [res.shop, ...prev]);
        setIsAddShopModalOpen(false);
        // Reset form
        setNewShopName('');
        setNewShopNameBn('');
        setNewShopPhone('');
        setNewShopAddress('');
        setNewShopDescription('');
        setNewShopOwnerName('');
        setNewShopOwnerPin('');
        onShowToast('success', 'সফল', res.message || 'নতুন পার্টনার শপ যুক্ত হয়েছে।');
        // Prompt QR viewer
        setQrModalItem({
          type: 'SHOP',
          id: res.shop.id,
          name: res.shop.name,
          nameBn: res.shop.nameBn,
          subtitle: `${res.shop.category} • ${res.shop.address}`,
          qrIdentifier: res.shop.qrIdentifier
        });
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'পার্টনার শপ যুক্ত করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Shop Configuration Modal
  const openShopConfigModal = (shop: Shop) => {
    setSelectedShopForConfig(shop);
    setEditGoldDiscount(typeof shop.goldDiscount === 'number' ? shop.goldDiscount : 15);
    setEditSilverDiscount(typeof shop.silverDiscount === 'number' ? shop.silverDiscount : 10);
    setEditBronzeDiscount(typeof shop.bronzeDiscount === 'number' ? shop.bronzeDiscount : 5);
    setEditCommissionRate(typeof shop.commissionRate === 'number' ? shop.commissionRate : 5);
    setEditShopName(shop.name || '');
    setEditShopNameBn(shop.nameBn || shop.name || '');
    setEditShopCategory(shop.category || 'food');
    setEditShopPhone(shop.phone || '');
    setEditShopAddress(shop.address || '');
    setEditShopArea(shop.area || 'Dhaka');
    setEditShopDistrict(shop.district || 'Dhaka');
    setEditShopOpeningHours(shop.openingHours || '10:00 AM - 10:00 PM');
    setEditShopDescription(shop.description || '');
    setEditShopStatus(shop.status || 'ACTIVE');
  };

  // Save Shop Configuration (Discounts, Commission, Details)
  const handleSaveShopConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForConfig) return;

    if (editGoldDiscount < 0 || editGoldDiscount > 100) {
      onShowToast('error', 'অবৈধ ডিসকাউন্ট', 'Gold ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।');
      return;
    }
    if (editSilverDiscount < 0 || editSilverDiscount > 100) {
      onShowToast('error', 'অবৈধ ডিসকাউন্ট', 'Silver ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।');
      return;
    }
    if (editBronzeDiscount < 0 || editBronzeDiscount > 100) {
      onShowToast('error', 'অবৈধ ডিসকাউন্ট', 'Bronze ডিসকাউন্ট ০% থেকে ১০০% এর মধ্যে হতে হবে।');
      return;
    }
    if (editCommissionRate < 0 || editCommissionRate > 100) {
      onShowToast('error', 'অবৈধ কমিশন', 'কমিশন ০% থেকে ১০০% এর মধ্যে হতে হবে।');
      return;
    }

    try {
      setActionLoading(`save-shop-${selectedShopForConfig.id}`);
      const res = await api.updateAdminShopConfig(selectedShopForConfig.id, {
        name: editShopName,
        nameBn: editShopNameBn,
        category: editShopCategory,
        phone: editShopPhone,
        address: editShopAddress,
        area: editShopArea,
        district: editShopDistrict,
        openingHours: editShopOpeningHours,
        description: editShopDescription,
        goldDiscount: Number(editGoldDiscount),
        silverDiscount: Number(editSilverDiscount),
        bronzeDiscount: Number(editBronzeDiscount),
        commissionRate: Number(editCommissionRate),
        status: editShopStatus
      });

      if (res.success && res.shop) {
        setShops(prev => prev.map((s, idx) => (s.id === res.shop.id ? res.shop : s)));
        setSelectedShopForConfig(null);
        onShowToast(
          'success',
          'সেটিংস সংরক্ষিত',
          `"${res.shop.nameBn || res.shop.name}"-এর ডিসকাউন্ট ও কমিশন সেটিংস সফলভাবে আপডেট করা হয়েছে।`
        );
      } else {
        onShowToast('error', 'আপডেট ব্যর্থ', res.message || 'সেটিংস আপডেট করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'সার্ভার সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Shop Status
  const handleToggleShopStatus = async (shop: Shop, newStatus: ShopStatus) => {
    try {
      setActionLoading(`shop-status-${shop.id}`);
      const res = await api.updateAdminShopStatus(shop.id, newStatus);
      setShops(prev => prev.map((s, idx) => (s.id === shop.id ? { ...s, status: newStatus } : s)));
      onShowToast('success', 'আপডেট সফল', `শপ "${shop.name}" স্ট্যাটাস ${newStatus} করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'শপ স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Shop QR Management
  const handleGenerateShopQr = async (shopId: string, shopName: string) => {
    try {
      setActionLoading(`generate-qr-${shopId}`);
      const res = await api.generateAdminShopQr(shopId);
      if (res.success) {
        onShowToast('success', 'QR জেনারেট সম্পন্ন', `শপ "${shopName}" এর জন্য নতুন QR কোড তৈরি হয়েছে।`);
        fetchShopQr(shopId);
        
        // Show QR modal immediately
        setQrModalItem({
          type: 'SHOP',
          id: res.shop.id,
          name: res.shop.name,
          nameBn: res.shop.nameBn,
          subtitle: `${res.shop.category} • ${res.shop.address}`,
          qrIdentifier: res.shop.qrIdentifier
        });
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'QR কোড জেনারেট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateShopQr = async (shopId: string, shopName: string) => {
    if (!window.confirm(`আপনি কি "${shopName}" শপের জন্য নতুন QR কোড জেনারেট করতে চান? পূর্ববর্তী QR কোডটি অকার্যকর হয়ে যাবে।`)) {
      return;
    }
    try {
      setActionLoading(`shop-qr-${shopId}`);
      const res = await api.regenerateAdminShopQr(shopId);
      if (res.success) {
        onShowToast('success', 'QR কোড রি-জেনারেট সম্পন্ন', `শপ "${shopName}" এর নতুন QR কোড তৈরি হয়েছে।`);
        fetchShopQr(shopId);
        
        // Update QR modal item
        setQrModalItem({
          type: 'SHOP',
          id: res.shop.id,
          name: res.shop.name,
          nameBn: res.shop.nameBn,
          subtitle: `${res.shop.category} • ${res.shop.address}`,
          qrIdentifier: res.shop.qrIdentifier
        });
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'QR কোড রি-জেনারেট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovePendingDiscounts = async (shop: PartnerShop) => {
    try {
      setActionLoading(`save-shop-${shop.id}`);
      const res = await api.updateAdminShopConfig(shop.id, {
        goldDiscount: shop.pendingGoldDiscount !== undefined ? shop.pendingGoldDiscount : shop.goldDiscount,
        silverDiscount: shop.pendingSilverDiscount !== undefined ? shop.pendingSilverDiscount : shop.silverDiscount,
        bronzeDiscount: shop.pendingBronzeDiscount !== undefined ? shop.pendingBronzeDiscount : shop.bronzeDiscount,
      });

      if (res.success && res.shop) {
        setShops(prev => prev.map((s, idx) => (s.id === res.shop.id ? res.shop : s)));
        onShowToast('success', 'অ্যাপ্রুভড', 'মার্চেন্টের ডিসকাউন্ট পরিবর্তন অ্যাপ্রুভ করা হয়েছে।');
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('error', 'ব্যর্থ', err.message || 'অ্যাপ্রুভ করতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Mosque Status
  const handleToggleMosqueStatus = async (mosque: Mosque, newStatus: 'active' | 'pending' | 'inactive') => {
    try {
      setActionLoading(`mosque-status-${mosque.id}`);
      const res = await api.updateAdminMosqueStatus(mosque.id, newStatus);
      setMosques(prev => prev.map((m, idx) => (m.id === mosque.id ? { ...m, status: newStatus } : m)));
      onShowToast('success', 'আপডেট সফল', `মসজিদ "${mosque.name}" স্ট্যাটাস ${newStatus} করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মসজিদ স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle User Status
  const handleToggleUserStatus = async (user: AdminUserWithStats) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? `আপনি কি ইউজার "${user.fullName}" (${user.phone}) অ্যাকাউন্ট সাসপেন্ড করতে চান?`
      : `আপনি কি ইউজার "${user.fullName}" অ্যাকাউন্ট পুনরায় সক্রিয় করতে চান?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(`user-status-${user.id}`);
      await api.updateAdminUserStatus(user.id, nextStatus);
      setUsers(prev => prev.map((u, idx) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      onShowToast('success', 'স্ট্যাটাস আপডেট', `ইউজার "${user.fullName}" এর স্ট্যাটাস ${nextStatus} করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'ইউজার স্ট্যাটাস পরিবর্তন করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Mosque
  const handleDeleteMosque = async (mosque: Mosque) => {
    try {
      setActionLoading(`mosque-del-${mosque.id}`);
      await api.deleteAdminMosque(mosque.id);
      setMosques(prev => prev.filter(m => m.id !== mosque.id));
      setMosqueToDelete(null);
      if (selectedPendingMosque?.id === mosque.id) {
        setSelectedPendingMosque(null);
      }
      onShowToast('success', 'মসজিদ মুছে ফেলা হয়েছে', `"${mosque.nameBn || mosque.name}" সফলভাবে ডিলিট করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'মুছতে সমস্যা', err.message || 'মসজিদ মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve Mosque Application
  const handleApproveMosque = async (mosque: Mosque) => {
    try {
      setActionLoading(`mosque-approve-${mosque.id}`);
      const res = await api.approveAdminMosque(mosque.id);
      setMosques(prev => prev.map((m, idx) => (m.id === mosque.id ? res.mosque : m)));
      onShowToast('success', 'মসজিদ এপ্রুভ সম্পন্ন', `মসজিদ "${mosque.nameBn || mosque.name}" সফলভাবে এপ্রুভ ও লাইভ করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'মসজিদ এপ্রুভ করতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Mosque Application
  const handleRejectMosque = async (mosque: Mosque) => {
    if (!mosqueRejectReason.trim()) {
      onShowToast('error', 'কারণ প্রয়োজন', 'আবেদন রিজেক্ট করার কারণ অবশ্যই উল্লেখ করতে হবে।');
      return;
    }
    
    try {
      setActionLoading(`mosque-reject-${mosque.id}`);
      const res = await api.rejectAdminMosque(mosque.id, mosqueRejectReason);
      setMosques(prev => prev.map((m, idx) => (m.id === mosque.id ? res.mosque : m)));
      onShowToast('success', 'আবেদন রিজেক্ট করা হয়েছে', `মসজিদের আবেদনটি রিজেক্ট করা হয়েছে।`);
      setIsRejectingMosque(false);
      setMosqueRejectReason('');
      setSelectedPendingMosque(null);
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'রিজেক্ট করতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Edited Mosque Details
  const handleSaveMosqueEdit = async (e: React.FormEvent, mosqueId: string, updatedData: Partial<Mosque>) => {
    e.preventDefault();
    try {
      setActionLoading(`mosque-edit-${mosqueId}`);
      const res = await api.updateAdminMosque(mosqueId, updatedData);
      setMosques(prev => prev.map((m, idx) => (m.id === mosqueId ? res.mosque : m)));
      setSelectedMosqueForEdit(null);
      onShowToast('success', 'আপডেট সফল', `মসজিদের তথ্য সফলভাবে আপডেট করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'আপডেট ব্যর্থ', err.message || 'মসজিদের তথ্য আপডেট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Shop
  const handleDeleteShop = async (shop: Shop) => {
    try {
      setActionLoading(`shop-del-${shop.id}`);
      await api.deleteAdminShop(shop.id);
      setShops(prev => prev.filter(s => s.id !== shop.id));
      onShowToast('success', 'শপ মুছে ফেলা হয়েছে', `"${shop.nameBn || shop.name}" সফলভাবে ডিলিট করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'মুছতে সমস্যা', err.message || 'শপ মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMerchantRecord = async (id: string) => {
    try {
      setActionLoading(`delete-shop-${id}`);
      const res = await api.deleteAdminMerchant(id);
      if (res.success) {
        onShowToast('success', 'মুছে ফেলা হয়েছে', 'মার্চেন্ট ও শপ স্থায়ীভাবে মুছে ফেলা হয়েছে।');
        setDeleteShopModalOpen(false);
        setShopToDelete(null);
        setSelectedMerchantVerification(null);
        loadAdminData();
      }
    } catch (err: any) {
      onShowToast('error', 'মুছতে সমস্যা', err.message || 'মার্চেন্ট মুছতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AdminUserWithStats) => {
    try {
      setActionLoading(`user-del-${user.id}`);
      await api.deleteAdminUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      onShowToast('success', 'ইউজার মুছে ফেলা হয়েছে', `ইউজার "${user.fullName}" সফলভাবে ডিলিট করা হয়েছে।`);
    } catch (err: any) {
      onShowToast('error', 'মুছতে সমস্যা', err.message || 'ইউজার মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Ticket Response
  const handleSaveTicketResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyModal) return;
    try {
      setActionLoading('ticket-submit');
      const res = await api.updateAdminTicket(ticketReplyModal.id, replyStatus, adminReplyText);
      setTickets(prev => prev.map((t, idx) => (t.id === ticketReplyModal.id ? res.ticket : t)));
      setTicketReplyModal(null);
      onShowToast('success', 'উত্তর সংরক্ষিত', 'সাপোর্ট টিকেটে উত্তর প্রদান করা হয়েছে।');
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'টিকেট আপডেট করা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete Single Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    try {
      setActionLoading(`delete-ticket-${ticketId}`);
      const res = await api.deleteAdminTicket(ticketId);
      if (res.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        onShowToast('success', 'মুছে ফেলা হয়েছে', 'সাপোর্ট টিকেটটি সফলভাবে মুছে ফেলা হয়েছে।');
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'টিকেট মুছে ফেলা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Clear Tickets History
  const handleClearTicketsHistory = async () => {
    try {
      setActionLoading('clear-tickets');
      const res = await api.clearAdminTickets(clearTicketsFilter);
      if (res.success) {
        if (clearTicketsFilter === 'ALL') {
          setTickets([]);
        } else {
          setTickets(prev => prev.filter(t => t.status !== clearTicketsFilter));
        }
        setIsClearTicketsModalOpen(false);
        onShowToast('success', 'ইতিহাস মুছে ফেলা হয়েছে', res.message || 'সাপোর্ট টিকেটের ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।');
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'টিকিটের ইতিহাস মুছে ফেলা যায়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Print QR Poster
  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrModalItem) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${qrModalItem.name} - Cave Companions QR</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #0f172a; border-radius: 20px; padding: 30px; max-width: 480px; margin: 0 auto; }
            h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
            h2 { margin: 0 0 16px; font-size: 16px; color: #475569; font-weight: normal; }
            .badge { display: inline-block; background: #047857; color: white; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
            img { width: 300px; height: 300px; margin: 0 auto; display: block; }
            .code { font-family: monospace; font-size: 13px; color: #0f172a; margin-top: 16px; word-break: break-all; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">কেভ কম্প্যানিয়ন পার্টনার শপ QR</span>
            <h1>${qrModalItem.nameBn || qrModalItem.name}</h1>
            <h2>${qrModalItem.subtitle}</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="code">${qrModalItem.qrIdentifier}</div>
            <div class="footer">Cave Companions Pilot Platform • Asia/Dhaka Standard Time</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download QR as PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !qrModalItem) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `cave-qr-${qrModalItem.id}-${qrModalItem.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };


  const totalPendingOffersCount = useMemo(() => {
    return shops.reduce((total, shop) => total + (shop.offers?.filter(o => o.status === 'pending').length || 0), 0);
  }, [shops]);

  if (!isAdminAuthenticated) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"></div>
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">সুপার এডমিন কন্ট্রোল</h2>
            <p className="text-sm text-slate-400">
              সিস্টেম ও এক্সেস কন্ট্রোল করতে লগইন করুন
            </p>
          </div>

          <div className="flex bg-slate-900 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginType('key')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginType === 'key' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              সিক্রেট কী
            </button>
            <button
              type="button"
              onClick={() => setLoginType('credentials')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginType === 'credentials' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ইমেইল/পাসওয়ার্ড
            </button>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginType === 'key' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">এডমিন সিক্রেট কী</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    value={adminPassKey}
                    onChange={(e) => setAdminPassKey(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="আপনার সিক্রেট কী লিখুন"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">ইমেইল / ফোন নম্বর</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <UserIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={adminEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('@')) {
                            setAdminEmail(val);
                        } else {
                            setAdminPhone(val);
                            setAdminEmail(val);
                        }
                      }}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="আপনার ইমেইল বা ফোন লিখুন"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">পাসওয়ার্ড</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="password"
                      value={adminPassKey}
                      onChange={(e) => setAdminPassKey(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="আপনার পাসওয়ার্ড লিখুন"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={authenticating || (!adminPassKey && !adminEmail)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {authenticating ? (
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>প্রবেশ করুন</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#090d16] text-slate-100 font-sans relative">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* 1. Left Sidebar (Fixed on Desktop, Off-canvas Drawer on Mobile) */}
      <aside className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-[#080d1a] border-r border-[#151f32] transition-all duration-300 ease-in-out shrink-0 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } ${
        isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#151f32] h-16 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <div className="w-full h-full rounded-[10px] bg-[#041a13] flex items-center justify-center text-amber-400">
              <AppLogo className="w-5 h-5" />
            </div>
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-white tracking-tight leading-tight truncate">Cave Companions</h2>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider truncate">Faith • Community • Service</p>
            </div>
          )}
          {/* Mobile close button */}
          <button 
            type="button" 
            onClick={() => setIsMobileSidebarOpen(false)} 
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {/* Group 1: MAIN */}
          <div className="space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Dashboard</span>}
            </button>

            {(hasPermission('ANALYTICS_VIEW') || hasPermission('SYSTEM_VIEW') || adminRole === 'MASTER_ADMIN') && (
              <button
                onClick={() => { setActiveTab('analytics'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Analytics"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Analytics</span>}
              </button>
            )}
          </div>

          {/* Group 2: COMMERCE */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase px-3 block mb-1">
                Commerce
              </span>
            )}

            {hasPermission('SHOP_VIEW') && (
              <button
                onClick={() => { setActiveTab('product-approvals'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'product-approvals'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Products"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Products</span>}
                </div>
                {!isSidebarCollapsed && pendingProductRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shrink-0">
                    {pendingProductRequestsCount}
                  </span>
                )}
              </button>
            )}

            {hasPermission('SHOP_VIEW') && (
              <button
                onClick={() => { setActiveTab('shops'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'shops'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Partner Shops"
              >
                <Store className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Partner Shops</span>}
              </button>
            )}

            {hasPermission('ORDER_VIEW') && (
              <button
                onClick={() => { setActiveTab('orders'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Online Orders"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Online Orders</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shrink-0">
                    12
                  </span>
                )}
              </button>
            )}

            {hasPermission('SHOP_VIEW') && (
              <button
                onClick={() => { setActiveTab('pending-commission'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending-commission' || activeTab === 'pending-offers'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Pending Commission (পেন্ডিং কমিশন/অফার)"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Percent className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Pending Commission</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    (pendingOffers.length + commissionChangeRequests.filter(r => r.status === 'pending').length) > 0
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {pendingOffers.length + commissionChangeRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            )}

            {hasPermission('ACCOUNTS_VIEW') && (
              <button
                onClick={() => { setActiveTab('accounts'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'accounts'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Offline Accounts (হিসাব সমূহ)"
              >
                <Wallet className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Offline Accounts</span>}
              </button>
            )}

            {hasPermission('ACCOUNTS_VIEW') && (
              <button
                onClick={() => { setActiveTab('online-accounts'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'online-accounts'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Online Accounts"
              >
                <Receipt className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Online Accounts</span>}
              </button>
            )}

            {(hasPermission('SYSTEM_VIEW') || hasPermission('ORDER_VIEW') || hasPermission('SHOP_VIEW')) && (
              <button
                onClick={() => { setActiveTab('coupons'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'coupons'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Coupon Management"
              >
                <Ticket className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Coupon Management</span>}
              </button>
            )}
          </div>

          {/* Group 3: OPERATIONS */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase px-3 block mb-1">
                Operations
              </span>
            )}

            {hasPermission('DELIVERY_VIEW') && (
              <button
                onClick={() => { setActiveTab('riders'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'riders'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Delivery Riders"
              >
                <Bike className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Delivery Riders</span>}
              </button>
            )}

            {hasPermission('DELIVERY_VIEW') && (
              <button
                onClick={() => { setActiveTab('delivery-charge'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'delivery-charge'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Delivery Charge"
              >
                <Truck className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Delivery Charge</span>}
              </button>
            )}

            {hasPermission('MOSQUE_VIEW') && (
              <button
                onClick={() => { setActiveTab('mosques'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'mosques'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Mosque Directory"
              >
                <Landmark className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Mosque Directory</span>}
              </button>
            )}
          </div>

          {/* Group 4: USERS & SECURITY */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase px-3 block mb-1">
                Users & Security
              </span>
            )}

            {hasPermission('USER_VIEW') && (
              <button
                onClick={() => { setActiveTab('users'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="User List"
              >
                <Users className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">User List</span>}
              </button>
            )}

            {hasPermission('ADMIN_VIEW') && (
              <button
                onClick={() => { setActiveTab('admin-management'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin-management'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Admin Accounts"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Admin Accounts</span>}
              </button>
            )}

            {hasPermission('SYSTEM_VIEW') && (
              <button
                onClick={() => { setActiveTab('security-diagnostic'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'security-diagnostic'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Security Diagnostics"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Security Diagnostics</span>}
              </button>
            )}
          </div>

          {/* Group 5: CONTENT & SUPPORT */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase px-3 block mb-1">
                Content & Support
              </span>
            )}

            {(hasPermission('NASIHA_VIEW') || adminRole === 'MASTER_ADMIN') && (
              <button
                onClick={() => { setActiveTab('blog'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'blog'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Cave Media"
              >
                <Video className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Cave Media</span>}
              </button>
            )}

            {hasPermission('ADS_VIEW') && (
              <button
                onClick={() => { setActiveTab('ads'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ads'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Advertisement"
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Advertisement</span>}
              </button>
            )}

            {hasPermission('NASIHA_VIEW') && (
              <button
                onClick={() => { setActiveTab('nasiha'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'nasiha'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="নসীহা Management"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">নসীহা Management</span>}
              </button>
            )}

            {hasPermission('HELPLINE_VIEW') && (
              <button
                onClick={() => { setActiveTab('helpline'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'helpline'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Helpline"
              >
                <Phone className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Helpline</span>}
              </button>
            )}

            {(hasPermission('NOTIFICATION_VIEW') || hasPermission('NOTIFICATION_MANAGE')) && (
              <button
                onClick={() => { setActiveTab('notification-templates'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'notification-templates'
                    ? 'bg-[#e59b20] text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title="Notification Templates"
              >
                <Bell className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Notification Templates</span>}
              </button>
            )}
          </div>
        </div>

        {/* Bottom System Status Card */}
        <div className="p-3 border-t border-[#151f32] shrink-0">
          <div 
            onClick={() => { setActiveTab('security-diagnostic'); setIsMobileSidebarOpen(false); }}
            className="p-2.5 rounded-xl bg-[#041a13] border border-[#0d4737] hover:border-emerald-500/50 transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">System Status</span>
                  <span className="text-[11px] text-emerald-400 font-bold block truncate">All Systems Operational</span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />}
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace (Header + Main Body + Footer) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 bg-[#090d16]/95 backdrop-blur-md border-b border-[#151f32] flex items-center justify-between gap-4 shrink-0 z-30">
          {/* Left: Hamburger Collapse Button & Search Input */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsSidebarCollapsed(prev => !prev);
                } else {
                  setIsMobileSidebarOpen(prev => !prev);
                }
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Modern Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Search anything... (users, orders, shops, etc.)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-16 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50 transition-all font-sans"
              />
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-md">
                  Ctrl + K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: Notifications & User Profile */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Notification Bell with Interactive Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationMenuOpen(prev => !prev);
                  setIsProfileMenuOpen(false);
                }}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  isNotificationMenuOpen
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
                title="নতুন আপডেট ও রিকোয়েস্ট নোটিফিকেশন"
              >
                <Bell className="w-4 h-4" />
                {adminNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                    {adminNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
                    onClick={() => setIsNotificationMenuOpen(false)}
                  />
                  <div className="fixed inset-x-3 top-16 max-w-md mx-auto sm:max-w-none sm:mx-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl bg-[#0b1120] border border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn">
                    {/* Popover Header */}
                    <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white leading-tight">নতুন আপডেট ও রিকোয়েস্ট</h4>
                          <p className="text-[10px] text-slate-400">মসজিদ, পার্টনার শপ, রাইডার ও অন্যান্য আবেদন</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {adminNotifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllNotifications}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="সকল নোটিফিকেশন মুছে ফেলুন"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>সব মুছুন</span>
                          </button>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                          {toBnNumber(adminNotifications.length)} টি পেন্ডিং
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsNotificationMenuOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="বন্ধ করুন"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                      {adminNotifications.length === 0 ? (
                        <div className="p-8 text-center space-y-3">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                          <div>
                            <p className="text-xs font-bold text-white">কোনো নতুন পেন্ডিং রিকোয়েস্ট নেই</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {dismissedNotificationIds.length > 0
                                ? 'আপনি নোটিফিকেশনগুলো মুছে ফেলেছেন।'
                                : 'সকল মসজিদ, শপ, রাইডার ও কমিশন আপডেট ইতিপূর্বে প্রক্রিয়াজাত করা হয়েছে।'}
                            </p>
                          </div>
                          {dismissedNotificationIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleRestoreNotifications}
                              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5 mx-auto"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>মুছে ফেলা নোটিফিকেশন রিস্টোর করুন</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        adminNotifications.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 hover:bg-slate-800/60 transition-colors flex items-start gap-2.5 group"
                          >
                            <div 
                              onClick={item.onClick}
                              className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                            >
                              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                item.category === 'mosque' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                item.category === 'shop' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                item.category === 'rider' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                item.category === 'product' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                item.category === 'commission' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {item.category === 'mosque' && <Landmark className="w-4 h-4" />}
                                {item.category === 'shop' && <Store className="w-4 h-4" />}
                                {item.category === 'rider' && <Bike className="w-4 h-4" />}
                                {item.category === 'product' && <ShoppingBag className="w-4 h-4" />}
                                {item.category === 'commission' && <Percent className="w-4 h-4" />}
                                {item.category === 'ticket' && <MessageSquare className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300">
                                    {item.badge}
                                  </span>
                                  <span className="text-[10px] text-amber-400 font-semibold group-hover:underline flex items-center gap-0.5">
                                    রিভিউ করুন <ChevronRight className="w-3 h-3 inline" />
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                  {item.title}
                                </h5>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            {/* Dismiss single notification button */}
                            <button
                              type="button"
                              onClick={(e) => handleDismissNotification(item.id, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 mt-0.5"
                              title="এই নোটিফিকেশনটি মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Popover Footer Shortcuts */}
                    <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('notification-templates');
                          setIsNotificationMenuOpen(false);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        টেমপ্লেট ও হিস্ট্রি
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          loadAdminData();
                          onShowToast('info', 'রিফ্রেশ', 'নতুন ডাটা রিলোড করা হচ্ছে...');
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>রিফ্রেশ</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Master Admin Profile Dropdown Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-amber-400 font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <span className="text-xs font-bold text-white block truncate leading-tight">Master Admin</span>
                  <span className="text-[10px] text-slate-400 block truncate">{adminRole === 'MASTER_ADMIN' ? 'Super Administrator' : 'Administrator'}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                  <div className="p-2.5 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-white">Master Admin</p>
                    <p className="text-[11px] text-amber-400 font-mono truncate">{adminEmail || 'admin@cavecompanions.org'}</p>
                  </div>
                  {onBack && (
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); onBack(); }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>ইউজার মোড (User Mode)</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); setActiveTab('menu'); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>পাসওয়ার্ড পরিবর্তন</span>
                  </button>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); handleAdminLogout(); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border-t border-slate-800/60 mt-1"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>লগআউট</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Workspace Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-6 w-full min-w-0">
          {activeTab === 'dashboard' && (
            <AdminOverviewTab
              stats={{
                totalUsers: users.length,
                totalShops: shops.length,
                totalOrders: adminOrders.length || 342,
                totalRiders: adminRiders.length || 78
              }}
              pendingCounts={{
                pendingProducts: pendingProductRequestsCount,
                pendingShops: pendingMerchants.length,
                pendingRiders: adminRiders.filter(r => r.approvalStatus === 'PENDING').length || 3,
                pendingAdmins: adminAccounts.filter(a => a.status === 'PENDING').length || 2,
                pendingOffers: totalPendingOffersCount,
                openTickets: tickets.filter(t => t.status === 'OPEN').length
              }}
              recentOrders={adminOrders}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              onOpenAddAdminModal={() => setIsAddAdminModalOpen(true)}
              onOpenAddProductModal={() => setActiveTab('product-approvals')}
              adminName={adminEmail ? adminEmail.split('@')[0] : 'Master Admin'}
              adminRole={adminRole === 'MASTER_ADMIN' ? 'Super Administrator' : 'Administrator'}
            />
          )}

      {/* ========================================================= */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <AnalyticsView onShowToast={onShowToast} />
      )}

      {(activeTab === 'pending-merchants' || selectedMerchantVerification) && (
        <div className="space-y-6">
          {selectedMerchantVerificationLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-bold">মার্চেন্টের বিবরণী ও ভেরিফিকেশন ফাইলসমূহ লোড হচ্ছে...</p>
            </div>
          ) : selectedMerchantVerification ? (
            /* MERCHANT VERIFICATION DETAILS VIEW */
            <div className="space-y-6">
              {/* Top Navigation & Status Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMerchantVerification(null)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>← তালিকায় ফিরে যান (Back)</span>
                  </button>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>{selectedMerchantVerification.shopName}</span>
                      <span className="text-xs text-slate-400 font-normal">({selectedMerchantVerification.ownerName})</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">আইডি: {selectedMerchantVerification.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    selectedMerchantVerification.verificationStatus === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : selectedMerchantVerification.verificationStatus === 'CORRECTION_REQUIRED'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : selectedMerchantVerification.verificationStatus === 'REJECTED'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                  }`}>
                    STATUS: {selectedMerchantVerification.verificationStatus === 'PENDING' ? 'PENDING VERIFICATION' : selectedMerchantVerification.verificationStatus}
                  </span>
                </div>
              </div>

              {/* SECTION 1: ACCOUNT INFORMATION */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-amber-400" />
                  <span>SECTION 1: ACCOUNT INFORMATION (অ্যাকাউন্ট তথ্য)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Owner Full Name</span>
                    <span className="font-bold text-white text-sm">{selectedMerchantVerification.ownerName || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Mobile Number</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{selectedMerchantVerification.phone || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Email Address</span>
                    <span className="font-medium text-slate-300">{selectedMerchantVerification.email || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Registration Date & Time</span>
                    <span className="font-medium text-slate-300">
                      {new Date(selectedMerchantVerification.submittedAt || selectedMerchantVerification.createdAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SHOP INFORMATION */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>SECTION 2: SHOP INFORMATION (দোকানের বিবরণ)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Shop Name</span>
                    <span className="font-bold text-white text-sm">{selectedMerchantVerification.shopName || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Business Type</span>
                    <span className="font-bold text-slate-200 capitalize">{selectedMerchantVerification.businessType || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Full Shop Address</span>
                    <span className="font-medium text-slate-200">{selectedMerchantVerification.shopAddress || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">District</span>
                    <span className="font-medium text-slate-300">{selectedMerchantVerification.district || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Upazila / Thana</span>
                    <span className="font-medium text-slate-300">{selectedMerchantVerification.upazilaThana || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Google Maps Location</span>
                    {selectedMerchantVerification.latitude && selectedMerchantVerification.longitude ? (
                      <a
                        href={`https://maps.google.com/?q=${selectedMerchantVerification.latitude},${selectedMerchantVerification.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline font-mono flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{selectedMerchantVerification.latitude.toFixed(6)}, {selectedMerchantVerification.longitude.toFixed(6)}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">Not Provided</span>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    <span className="text-slate-500 block text-[10px] font-bold">Business Description</span>
                    <p className="text-slate-300 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 mt-1">
                      {selectedMerchantVerification.businessDescription || 'Not Provided'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 block text-xs font-bold mb-2">Shop Photo</span>
                  <div className="max-w-xs">
                    <ImageCard
                      title="Shop Front Photo"
                      url={selectedMerchantVerification.shopPhotoUrl}
                      isRequired={false}
                      onOpenLightbox={(src, title) => {
                        setLightboxImage({ src, title });
                        setLightboxZoom(1);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: OWNER VERIFICATION INFORMATION */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>SECTION 3: OWNER VERIFICATION INFORMATION (মালিক যাচাইকরণ)</span>
                </h3>
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] font-bold">NID Number</span>
                  <span className="font-bold text-white text-base font-mono">
                    {selectedMerchantVerification.nidNumber && selectedMerchantVerification.nidNumber !== 'Not provided'
                      ? selectedMerchantVerification.nidNumber
                      : 'Not Provided'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ImageCard
                    title="NID Front Image"
                    url={selectedMerchantVerification.nidFrontUrl}
                    isRequired={true}
                    onOpenLightbox={(src, title) => {
                      setLightboxImage({ src, title });
                      setLightboxZoom(1);
                    }}
                  />
                  <ImageCard
                    title="NID Back Image"
                    url={selectedMerchantVerification.nidBackUrl}
                    isRequired={true}
                    onOpenLightbox={(src, title) => {
                      setLightboxImage({ src, title });
                      setLightboxZoom(1);
                    }}
                  />
                  <ImageCard
                    title="Owner Selfie / Live Photo"
                    url={selectedMerchantVerification.ownerSelfieUrl}
                    isRequired={true}
                    onOpenLightbox={(src, title) => {
                      setLightboxImage({ src, title });
                      setLightboxZoom(1);
                    }}
                  />
                </div>
              </div>

              {/* SECTION 4: BUSINESS VERIFICATION INFORMATION */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span>SECTION 4: BUSINESS VERIFICATION INFORMATION (ব্যবসা যাচাইকরণ)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">Trade License Number</span>
                    <span className="font-bold text-white text-sm font-mono">
                      {selectedMerchantVerification.tradeLicenseNumber && selectedMerchantVerification.tradeLicenseNumber !== 'Not provided'
                        ? selectedMerchantVerification.tradeLicenseNumber
                        : 'Not Provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">TIN Number</span>
                    <span className="font-semibold text-slate-300 font-mono">
                      {selectedMerchantVerification.tinNumber || 'Not Provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">BIN / VAT Number</span>
                    <span className="font-semibold text-slate-300 font-mono">
                      {selectedMerchantVerification.binVatNumber || 'Not Provided'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 max-w-sm">
                  <ImageCard
                    title="Trade License Document Image"
                    url={selectedMerchantVerification.tradeLicenseUrl}
                    isRequired={true}
                    onOpenLightbox={(src, title) => {
                      setLightboxImage({ src, title });
                      setLightboxZoom(1);
                    }}
                  />
                </div>
              </div>

              {/* SECTION 5: COMMISSION & AGREEMENT DETAILS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>SECTION 5: COMMISSION & AGREEMENT DETAILS (কমিশন ও চুক্তি বিবরণ)</span>
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Merchant Total Offered Commission:</span>
                    <span className="text-base font-black text-amber-400">
                      {toBnNumber(selectedMerchantVerification.acceptedTotalCommission || 10)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                      <span className="font-bold text-amber-400 block text-[11px]">GOLD TOKEN TIER</span>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>User Benefit:</span>
                        <span className="font-bold text-amber-300">{toBnNumber(selectedMerchantVerification.acceptedGoldUserBenefit || 5)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>CC Commission:</span>
                        <span className="font-bold text-amber-300">{toBnNumber(selectedMerchantVerification.acceptedGoldPlatformCommission || 1)}%</span>
                      </div>
                    </div>

                    <div className="bg-slate-300/10 border border-slate-300/20 p-3 rounded-xl space-y-1">
                      <span className="font-bold text-slate-300 block text-[11px]">SILVER TOKEN TIER</span>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>User Benefit:</span>
                        <span className="font-bold text-slate-200">{toBnNumber(selectedMerchantVerification.acceptedSilverUserBenefit || 4)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>CC Commission:</span>
                        <span className="font-bold text-slate-200">{toBnNumber(selectedMerchantVerification.acceptedSilverPlatformCommission || 2)}%</span>
                      </div>
                    </div>

                    <div className="bg-amber-700/10 border border-amber-700/20 p-3 rounded-xl space-y-1">
                      <span className="font-bold text-amber-600 block text-[11px]">BRONZE TOKEN TIER</span>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>User Benefit:</span>
                        <span className="font-bold text-amber-500">{toBnNumber(selectedMerchantVerification.acceptedBronzeUserBenefit || 3)}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>CC Commission:</span>
                        <span className="font-bold text-amber-500">{toBnNumber(selectedMerchantVerification.acceptedBronzePlatformCommission || 3)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Agreement Status</span>
                      <span className="font-bold text-emerald-400">
                        {selectedMerchantVerification.agreementAccepted ? 'Accepted (সম্মতি প্রাপ্ত)' : 'Not Accepted'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Agreement Version</span>
                      <span className="font-mono text-slate-300">{selectedMerchantVerification.agreementVersion || 'v1.0'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Accepted Timestamp</span>
                      <span className="text-slate-300 font-medium">
                        {selectedMerchantVerification.agreementAcceptedAt
                          ? new Date(selectedMerchantVerification.agreementAcceptedAt).toLocaleString('bn-BD')
                          : 'Not Provided'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: SHOP QR CODE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>SECTION 6: SHOP QR CODE (দোকানের QR কোড)</span>
                </h3>

                {shopQrLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                ) : shopQrData?.exists ? (
                  <div className="flex flex-col md:flex-row items-center gap-8 py-2">
                    <div className="bg-white p-3 rounded-2xl shadow-xl shadow-slate-950/50">
                      <QRInlinePreview identifier={shopQrData.qrIdentifier} size={160} />
                    </div>
                    
                    <div className="flex-1 space-y-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                          <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">QR Status</span>
                          <span className={`text-sm font-black flex items-center gap-1.5 ${shopQrData.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${shopQrData.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`} />
                            {shopQrData.status === 'active' ? 'Active (সক্রিয়)' : 'Inactive (অক্রিয়)'}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                          <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Generated Date</span>
                          <span className="text-sm font-bold text-slate-200">
                            {new Date(shopQrData.createdAt || shopQrData.updatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQrModalItem({
                              type: 'SHOP',
                              id: selectedMerchantVerification!.shopId,
                              name: selectedMerchantVerification!.shopName,
                              nameBn: selectedMerchantVerification!.shopName,
                              subtitle: `${selectedMerchantVerification!.businessType} • ${selectedMerchantVerification!.shopAddress}`,
                              qrIdentifier: shopQrData.qrIdentifier
                            });
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Full QR</span>
                        </button>
                        
                        <button
                          type="button"
                          disabled={actionLoading === `shop-qr-${selectedMerchantVerification!.shopId}`}
                          onClick={() => handleRegenerateShopQr(selectedMerchantVerification!.shopId, selectedMerchantVerification!.shopName)}
                          className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${actionLoading === `shop-qr-${selectedMerchantVerification!.shopId}` ? 'animate-spin' : ''}`} />
                          <span>Regenerate QR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                      <QrCode className="w-8 h-8 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-300">No QR Code Generated</p>
                      <p className="text-xs text-slate-500">এই শপের জন্য এখনও কোনো QR কোড জেনারেট করা হয়নি।</p>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading === `generate-qr-${selectedMerchantVerification?.shopId}`}
                      onClick={() => handleGenerateShopQr(selectedMerchantVerification!.shopId, selectedMerchantVerification!.shopName)}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-black flex items-center gap-2 mx-auto transition-all shadow-lg shadow-amber-950/20 cursor-pointer"
                    >
                      {actionLoading === `generate-qr-${selectedMerchantVerification?.shopId}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>Generate QR Code</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 7: ADMIN VERIFICATION ACTIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
                  SECTION 7: ADMIN VERIFICATION ACTIONS (এডমিন পর্যালোচনা ও অ্যাকশন)
                </h3>

                {(() => {
                  const missing = getMissingRequirements(selectedMerchantVerification);
                  const canApprove = missing.length === 0;
                  const mchStatus = selectedMerchantVerification.verificationStatus?.toLowerCase().trim();

                  return (
                    <div className="space-y-4">
                      {!canApprove && (
                        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 text-xs space-y-2">
                          <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                            <span>Cannot Approve Yet (অনুমোদন সম্ভব নয়)</span>
                          </div>
                          <p className="text-slate-300">
                            নিচের প্রয়োজনীয় তথ্য বা ডকুমেন্টের কোনো একটি অনুপস্থিত বা অসম্পূর্ণ রয়েছে:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-rose-300 font-medium">
                            {missing.map((item, idx) => (
                              <li key={`missing-item-${idx}`}>{item}</li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-slate-400 pt-1">
                            সকল বাধ্যতামূলক তথ্য ও ছবি সঠিকভাবে যুক্ত করা না পর্যন্ত মার্চেন্ট অনুমোদন করা যাবে না। আপনি সংশোধন অনুরোধ পাঠাতে পারেন।
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {mchStatus === 'approved' ? (
                          <div className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>APPROVED</span>
                          </div>
                        ) : mchStatus === 'rejected' ? (
                          <div className="flex-1 py-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-sm flex items-center justify-center gap-2">
                            <X className="w-5 h-5" />
                            <span>REJECTED</span>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!canApprove || actionLoading === `approve-mch-${selectedMerchantVerification.id}`}
                              onClick={() => handleOpenApprovalModal(selectedMerchantVerification)}
                              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {actionLoading === `approve-mch-${selectedMerchantVerification.id}` ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span>APPROVE MERCHANT (অনুমোদন করুন)</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === `corr-mch-${selectedMerchantVerification.id}`}
                              onClick={() => handleOpenCorrectionModal(selectedMerchantVerification)}
                              className="py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <AlertCircle className="w-5 h-5" />
                              <span>REQUEST CORRECTION (সংশোধন অনুরোধ)</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === `reject-mch-${selectedMerchantVerification.id}`}
                              onClick={() => handleOpenRejectionModal(selectedMerchantVerification)}
                              className="py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                              <span>REJECT (বাতিল করুন)</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-800">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                          <div>
                            <h4 className="text-sm font-black text-rose-400">পার্টনার শপ মুছে ফেলুন (Danger Zone)</h4>
                            <p className="text-[10px] text-slate-400 mt-1">আপনি যদি এই শপটি স্থায়ীভাবে মুছে ফেলতে চান, তবে নিচের বাটনটি ব্যবহার করুন। এই কাজ আর ফিরিয়ে নেওয়া যাবে না।</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShopToDelete(selectedMerchantVerification);
                              setDeleteShopModalOpen(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>DELETE PERMANENTLY (স্থায়ীভাবে মুছে ফেলুন)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : activeTab === 'pending-merchants' ? (
            /* PENDING MERCHANTS LIST VIEW */
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                    <span>মার্চেন্ট ভেরিফিকেশন আবেদন তালিকা</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    মার্চেন্টের নাম, দোকান বা স্ট্যাটাস অনুযায়ী ফিল্টার করুন এবং বিস্তারিত ভেরিফিকেশন ফাইলসমূহ পরীক্ষা করুন।
                  </p>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  {(['PENDING', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st, sIdx) => (
                    <button
                      key={`adv-mst-${st}-${sIdx}`}
                      type="button"
                      onClick={() => setMerchantStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        merchantStatusFilter === st
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {st === 'PENDING'
                        ? 'পেন্ডিং'
                        : st === 'CORRECTION_REQUIRED'
                        ? 'সংশোধন আবশ্যক'
                        : st === 'APPROVED'
                        ? 'অনুমোদিত'
                        : st === 'REJECTED'
                        ? 'বাতিলকৃত'
                        : 'সব'}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Cards */}
              {merchantVerifications.filter((v) => merchantStatusFilter === 'ALL' || v.verificationStatus === merchantStatusFilter).length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">কোনো মার্চেন্ট আবেদন পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    নির্বাচিত ফিল্টারে কোনো মার্চেন্ট ভেরিফিকেশন রেকর্ড উপস্থিত নেই।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {merchantVerifications
                    .filter((v) => merchantStatusFilter === 'ALL' || v.verificationStatus === merchantStatusFilter)
                    .map((v, vIdx) => (
                      <div
                        key={`adv-v-${v.id || 'v'}-${vIdx}`}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block mb-1 border ${
                              v.verificationStatus === 'APPROVED'
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                : v.verificationStatus === 'CORRECTION_REQUIRED'
                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                                : v.verificationStatus === 'REJECTED'
                                ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                                : 'bg-amber-500/20 border-amber-500/30 text-amber-300 animate-pulse'
                            }`}>
                              {v.verificationStatus === 'PENDING' ? 'পেন্ডিং ভেরিফিকেশন' : v.verificationStatus}
                            </span>
                            <h3 className="font-black text-white text-base">{v.shopName}</h3>
                            <p className="text-xs text-slate-400 font-medium">মালিক: {v.ownerName}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-mono font-bold">
                            {v.id}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-500 block text-[10px]">মোবাইল</span>
                            <span className="font-bold text-slate-200 font-mono">{v.phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">ব্যবসার ধরন</span>
                            <span className="font-bold text-slate-200 capitalize">{v.businessType}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-[10px]">ঠিকানা & এলাকা</span>
                            <span className="font-medium text-slate-200">{v.shopAddress}, {v.upazilaThana}, {v.district}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-[10px]">আবেদন করার সময়</span>
                            <span className="text-slate-300 text-[11px]">
                              {new Date(v.submittedAt || v.createdAt).toLocaleString('bn-BD')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectMerchantVerification(v.id || v.merchantId || v.shopId)}
                          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>মার্চেন্ট ফাইল ও বিস্তারিত তথ্য দেখুন (View Details) &rarr;</span>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: PENDING OFFER/DISCOUNT REQUESTS                  */}
      {/* ========================================================= */}
      {activeTab === 'product-approvals' && !selectedMerchantVerification && (
        <AdminProductApprovalView />
      )}

      {(activeTab === 'pending-offers' || activeTab === 'pending-commission') && !selectedMerchantVerification && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                <span>পেন্ডিং অফার ও কমিশন আপডেট আবেদনসমূহ</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                মার্চেন্টদের পাঠানো নতুন ডিসকাউন্ট রেট ও কমিশন পরিবর্তনের অনুরোধগুলো যাচাই করুন।
              </p>
            </div>
            <div className="flex gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                অফার: {toBnNumber(pendingOffers.length)} টি
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                কমিশন: {toBnNumber(commissionChangeRequests.filter(r => r.status === 'pending').length)} টি
              </div>
            </div>
          </div>

          {(pendingOffers.length === 0 && commissionChangeRequests.filter(r => r.status === 'pending').length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">কোনো পেন্ডিং অনুরোধ নেই</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                বর্তমানে কোনো মার্চেন্টের ডিসকাউন্ট বা কমিশন পরিবর্তনের অনুরোধ পেন্ডিং অবস্থায় নেই।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Discount Offer Requests */}
              {pendingOffers.map((shop, sIdx) => (
                <div
                  key={`adv-po-${shop.id || 'po'}-${sIdx}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-block mb-1">
                        ডিসকাউন্ট আপডেট অনুরোধ
                      </span>
                      <h3 className="font-black text-white text-base">{shop.nameBn || shop.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">{shop.area}, {shop.district} • {shop.phone}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                      {shop.id}
                    </span>
                  </div>

                  {/* Comparison: Current vs Requested */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block border-b border-slate-800 pb-1">
                        বর্তমান লাইভ ডিসকাউন্ট:
                      </span>
                      <div className="space-y-1 text-slate-300">
                        <div className="flex justify-between">
                          <span>Gold:</span>
                          <span className="font-bold text-amber-400">{toBnNumber(shop.goldDiscount || 0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Silver:</span>
                          <span className="font-bold text-slate-300">{toBnNumber(shop.silverDiscount || 0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bronze:</span>
                          <span className="font-bold text-amber-600">{toBnNumber(shop.bronzeDiscount || 0)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/30 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 block border-b border-emerald-500/30 pb-1">
                        অনুরোধকৃত নতুন ডিসকাউন্ট:
                      </span>
                      <div className="space-y-1 text-emerald-200">
                        <div className="flex justify-between">
                          <span>Gold:</span>
                          <span className="font-bold text-amber-300">
                            {toBnNumber(shop.pendingGoldDiscount !== undefined ? shop.pendingGoldDiscount : shop.goldDiscount || 0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Silver:</span>
                          <span className="font-bold text-slate-100">
                            {toBnNumber(shop.pendingSilverDiscount !== undefined ? shop.pendingSilverDiscount : shop.silverDiscount || 0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bronze:</span>
                          <span className="font-bold text-amber-400">
                            {toBnNumber(shop.pendingBronzeDiscount !== undefined ? shop.pendingBronzeDiscount : shop.bronzeDiscount || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={actionLoading === `approve-off-${shop.id}`}
                      onClick={() => handleApproveOffer(shop.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `approve-off-${shop.id}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>অনুমোদন</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === `reject-off-${shop.id}`}
                      onClick={() => handleRejectOffer(shop.id)}
                      className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `reject-off-${shop.id}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span>বাতিল</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Commission Change Requests */}
              {commissionChangeRequests
                .filter(r => r.status === 'pending')
                .map((req, rIdx) => (
                  <div
                    key={`adv-ccr-${req.id || 'req'}-${rIdx}`}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 relative overflow-hidden group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold inline-block mb-1">
                          কমিশন পরিবর্তনের অনুরোধ
                        </span>
                        <h3 className="font-black text-white text-base">{req.shopName}</h3>
                        <p className="text-xs text-slate-400 font-medium">ফোন: {req.shopPhone}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                        {req.id}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                      <div>বর্তমান কমিশন: <strong className="text-white">{req.currentCommissionPercent}%</strong></div>
                      <div>অনুরোধকৃত কমিশন: <strong className="text-amber-400">{req.requestedCommissionPercent}%</strong></div>
                      <p className="text-[11px] text-slate-500 pt-1">অনুরোধের সময়: {new Date(req.createdAt).toLocaleString('bn-BD')}</p>
                    </div>

                    <div className="pt-2 flex items-center gap-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleReviewCommissionRequest(req.id, 'approved')}
                        disabled={actionLoading === `review-comm-${req.id}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer transition-all disabled:opacity-50"
                      >
                        {actionLoading === `review-comm-${req.id}` ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'অনুমোদন করুন'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewCommissionRequest(req.id, 'rejected')}
                        disabled={actionLoading === `review-comm-${req.id}`}
                        className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                      >
                        {actionLoading === `review-comm-${req.id}` ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'বাতিল করুন'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1.5: ACCOUNTS MANAGEMENT (FINANCIALS)             */}
      {/* ========================================================= */}
      {activeTab === 'accounts' && !selectedMerchantVerification && (
        <AccountsManagement onShowToast={onShowToast} />
      )}

      {/* ========================================================= */}
      {/* SECTION: ONLINE ORDERS MANAGEMENT                         */}
      {/* ========================================================= */}
      {activeTab === 'orders' && !selectedMerchantVerification && (
        <AdminOrdersView />
      )}

      {/* ========================================================= */}
      {/* SECTION: ONLINE FINANCIAL ACCOUNTS                        */}
      {/* ========================================================= */}
      {activeTab === 'online-accounts' && !selectedMerchantVerification && (
        <AdminOnlineAccountsView />
      )}

      {/* ========================================================= */}
      {/* SECTION: COUPON MANAGEMENT                                */}
      {/* ========================================================= */}
      {activeTab === 'coupons' && !selectedMerchantVerification && (
        <CouponManagement />
      )}

      {/* ========================================================= */}
      {/* SECTION: ONLINE DELIVERY CHARGE MANAGEMENT                */}
      {/* ========================================================= */}
      {activeTab === 'delivery-charge' && !selectedMerchantVerification && (
        <AdminDeliveryChargeView />
      )}

      {/* ========================================================= */}
      {/* SECTION: CC DELIVERY RIDER MANAGEMENT                     */}
      {/* ========================================================= */}
      {activeTab === 'riders' && !selectedMerchantVerification && (
        <AdminRiderManagementView onShowToast={onShowToast} />
      )}

      {/* ========================================================= */}
      {/* SECTION 2: MOSQUES MANAGEMENT (ADD / QR / STATUS)         */}
      {/* ========================================================= */}
      {activeTab === 'mosques' && !selectedMerchantVerification && (
        <div className="space-y-4">
          {/* Sub-tabs & Search Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMosqueSubTab('active')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  mosqueSubTab === 'active'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>এক্টিভ মসজিদ</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-mono">
                  {toBnNumber(activeMosquesList.length)}
                </span>
              </button>

              <button
                onClick={() => setMosqueSubTab('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
                  mosqueSubTab === 'pending'
                    ? 'bg-amber-600 text-slate-950 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>পেন্ডিং আবেদন</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                  {toBnNumber(pendingMosquesList.length)}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-md justify-end">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={mosqueSearch}
                  onChange={e => setMosqueSearch(e.target.value)}
                  placeholder="মসজিদের নাম, এলাকা বা আবেদনকারী খুঁজুন..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await api.getAdminMosques();
                    if (res.success && res.mosques) {
                      setMosques(res.mosques);
                      onShowToast('success', 'রিফ্রেশ সফল', 'মসজিদের তালিকা আপডেট করা হয়েছে।');
                    }
                  } catch (e) {
                    onShowToast('error', 'ত্রুটি', 'মসজিদের তালিকা রিফ্রেশ করতে সমস্যা হয়েছে।');
                  }
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsAddMosqueModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন মসজিদ</span>
              </button>
            </div>
          </div>

          {/* ACTIVE MOSQUES SECTION */}
          {mosqueSubTab === 'active' && (
            <div className="space-y-3">
              {activeMosquesList.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-xs">
                  কোনো এক্টিভ মসজিদ পাওয়া যায়নি।
                </div>
              ) : (
                activeMosquesList.map((mosque, mIdx) => {
                  const isUpdating = actionLoading === `mosque-status-${mosque.id}`;
                  return (
                    <div
                      key={`adv-amosque-${mosque.id || 'm'}-${mIdx}`}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Clickable area to view/edit details */}
                        <div 
                          onClick={() => setSelectedMosqueForEdit(mosque)}
                          className="space-y-1.5 max-w-xl cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                              {mosque.imageUrl && (
                                <img src={mosque.imageUrl} className="w-6 h-6 rounded-md object-cover" referrerPolicy="no-referrer" />
                              )}
                              {mosque.nameBn || mosque.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                mosque.status === 'active'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                  : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                              }`}
                            >
                              {(mosque.status || 'ACTIVE').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-amber-400 underline opacity-0 group-hover:opacity-100 transition-opacity">
                              বিস্তারিত ও এডিট
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {mosque.address}, {mosque.area || mosque.district}
                            </span>
                            {mosque.imamName && (
                              <span className="text-slate-300">ইমাম: {mosque.imamName}</span>
                            )}
                            {mosque.contactNumber && (
                              <span className="text-slate-300">ফোন: {mosque.contactNumber}</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span>ID:</span>
                            <span className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {mosque.id}
                            </span>
                            <span className="text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded font-sans font-medium">
                              ভেরিফিকেশন রেডিয়াস: {mosque.verificationRadius || 75} মি.
                            </span>
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Edit Details */}
                          <button
                            onClick={() => setSelectedMosqueForEdit(mosque)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>এডিট</span>
                          </button>

                          {/* Status Toggle (Inactive / Active) */}
                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              handleToggleMosqueStatus(
                                mosque,
                                mosque.status === 'active' ? 'inactive' : 'active'
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                              mosque.status === 'active'
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                            }`}
                          >
                            {mosque.status === 'active' ? 'Inactive করুন' : 'Active করুন'}
                          </button>

                          {/* Delete Mosque */}
                          <button
                            disabled={actionLoading === `mosque-del-${mosque.id}`}
                            onClick={() => setMosqueToDelete(mosque)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                            title="মসজিদ ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ডিলিট</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* PENDING MOSQUES SECTION */}
          {mosqueSubTab === 'pending' && (
            <div className="space-y-3">
              {pendingMosquesList.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-xs">
                  কোনো পেন্ডিং মসজিদ আবেদন নেই।
                </div>
              ) : (
                pendingMosquesList.map((mosque, mIdx) => {
                  const appDate = mosque.createdAt || mosque.created_at || new Date().toISOString();
                  const formattedDate = new Date(appDate).toLocaleString('bn-BD', {
                    dateStyle: 'medium'
                  });

                  return (
                    <div
                      key={`adv-pmosque-${mosque.id || 'm'}-${mIdx}`}
                      className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div 
                          onClick={() => setSelectedPendingMosque(mosque)}
                          className="space-y-1.5 max-w-xl cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                              {mosque.imageUrl && (
                                <img src={mosque.imageUrl} className="w-6 h-6 rounded-md object-cover" referrerPolicy="no-referrer" />
                              )}
                              {mosque.nameBn || mosque.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PENDING
                            </span>
                            <span className="text-[10px] text-amber-400 underline opacity-0 group-hover:opacity-100 transition-opacity">
                              বিস্তারিত ও রিভিউ
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {mosque.address}, {mosque.district}
                            </span>
                            <span className="text-slate-300">আবেদন: {mosque.requestedByName || 'অজানা'}</span>
                            <span className="text-slate-500">{formattedDate}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedPendingMosque(mosque)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                          >
                            রিভিউ করুন
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* PENDING MOSQUE REVIEW MODAL */}
      {selectedPendingMosque && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-3xl w-full space-y-6 shadow-2xl my-8 text-slate-100"
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  পেন্ডিং মসজিদ আবেদন বিস্তারিত
                </span>
                <span className="text-xs text-slate-400">
                  আবেদনের তারিখ: {new Date(selectedPendingMosque.createdAt || selectedPendingMosque.created_at || new Date().toISOString()).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <button
                onClick={() => setSelectedPendingMosque(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Applicant Account Info */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">আবেদনকারী অ্যাকাউন্ট</span>
                  <h4 className="text-sm font-bold text-white">{selectedPendingMosque.requestedByName || 'নাম পাওয়া যায়নি'}</h4>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">মোবাইল:</span>
                <span className="text-amber-300 font-mono font-bold">{selectedPendingMosque.requestedByPhone || 'ফোন নম্বর নেই'}</span>
              </div>
            </div>

            {/* 2. Addresses Comparison (User Box vs Map Location) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User Input Address Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  ইউজার ফরম বক্সের ঠিকানা
                </span>
                <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  {selectedPendingMosque.address || 'ঠিকানা দেওয়া হয়নি'}
                  {selectedPendingMosque.area ? `, ${selectedPendingMosque.area}` : ''}
                  {selectedPendingMosque.district ? `, ${selectedPendingMosque.district}` : ''}
                </p>
              </div>

              {/* Map Location & Geocoded Address Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  ম্যাপ লোকেশন ও জিপিএস অ্যাড্রেস
                </span>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-300 font-mono">
                    <span className="text-slate-500">অক্ষাংশ, দ্রাঘিমাংশ:</span>{' '}
                    <span className="text-emerald-300 font-bold">{selectedPendingMosque.latitude || 0}, {selectedPendingMosque.longitude || 0}</span>
                  </div>
                  {selectedPendingMosque.latitude && selectedPendingMosque.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedPendingMosque.latitude},${selectedPendingMosque.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>গুগল ম্যাপে লোকেশন দেখুন</span>
                    </a>
                  ) : (
                    <span className="text-rose-400 text-[11px]">জিপিএস স্থানাঙ্ক যুক্ত করা হয়নি</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. All Registration Data Grid */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">রেজিস্ট্রেশনের সমস্ত তথ্য</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">বাংলা নাম</span>
                  <span className="text-white font-bold">{selectedPendingMosque.nameBn || 'নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">ইংরেজি নাম</span>
                  <span className="text-white font-medium">{selectedPendingMosque.name || 'নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">জেলা</span>
                  <span className="text-white font-medium">{selectedPendingMosque.district || 'নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">এলাকা</span>
                  <span className="text-white font-medium">{selectedPendingMosque.area || 'নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">ইমামের নাম</span>
                  <span className="text-white font-medium">{selectedPendingMosque.imamName || 'তথ্য নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">ইমামের ফোন</span>
                  <span className="text-white font-mono">{selectedPendingMosque.contactNumber || 'তথ্য নেই'}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Mosque ID</span>
                  <span className="text-emerald-400 font-mono text-[11px]">{selectedPendingMosque.id}</span>
                </div>
              </div>
            </div>

            {/* 4. Description Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                বিবরণী বক্স (Description / বিশেষ মন্তব্য)
              </h5>
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 min-h-[60px] italic">
                {selectedPendingMosque.description ? `"${selectedPendingMosque.description}"` : '<কোনো বিবরণ বা মন্তব্য লেখা হয়নি>'}
              </div>
            </div>

            {/* Photos Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-center">
                <span className="text-xs text-slate-400 font-semibold block uppercase">মসজিদের ছবি</span>
                {selectedPendingMosque.imageUrl ? (
                  <img
                    src={selectedPendingMosque.imageUrl}
                    alt="Mosque"
                    className="w-full h-44 rounded-xl object-cover border border-slate-800 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-44 rounded-xl bg-slate-900 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    মসজিদের কোনো ছবি দেওয়া হয়নি
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-center">
                <span className="text-xs text-slate-400 font-semibold block uppercase">ইমাম সাহেবের ছবি</span>
                {selectedPendingMosque.imamImageUrl ? (
                  <img
                    src={selectedPendingMosque.imamImageUrl}
                    alt="Imam"
                    className="w-full h-44 rounded-xl object-cover border border-slate-800 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-44 rounded-xl bg-slate-900 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    ইমাম সাহেবের কোনো ছবি দেওয়া হয়নি
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-800">
              {isRejectingMosque ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl"
                >
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    রিজেক্ট করার কারণ উল্লেখ করুন (বাধ্যতামূলক)
                  </label>
                  <textarea
                    autoFocus
                    value={mosqueRejectReason}
                    onChange={(e) => setMosqueRejectReason(e.target.value)}
                    placeholder="কেন আবেদনটি বাতিল করা হচ্ছে তা বিস্তারিত লিখুন..."
                    className="w-full h-24 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      disabled={actionLoading === `mosque-reject-${selectedPendingMosque.id}`}
                      onClick={() => handleRejectMosque(selectedPendingMosque)}
                      className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {actionLoading === `mosque-reject-${selectedPendingMosque.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      নিশ্চিত করুন (Confirm Reject)
                    </button>
                    <button
                      onClick={() => {
                        setIsRejectingMosque(false);
                        setMosqueRejectReason('');
                      }}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    disabled={actionLoading === `mosque-approve-${selectedPendingMosque.id}`}
                    onClick={() => {
                      handleApproveMosque(selectedPendingMosque);
                      setSelectedPendingMosque(null);
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xl shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {actionLoading === `mosque-approve-${selectedPendingMosque.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Approve (এপ্রুভ ও লাইভ করুন)</span>
                  </button>
                  <button
                    disabled={actionLoading === `mosque-reject-${selectedPendingMosque.id}`}
                    onClick={() => {
                      setIsRejectingMosque(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-300 text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject (বাতিল করুন)</span>
                  </button>
                  <button
                    disabled={actionLoading === `mosque-del-${selectedPendingMosque.id}`}
                    onClick={() => {
                      setMosqueToDelete(selectedPendingMosque);
                    }}
                    className="px-6 py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-300 text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete (স্থায়ীভাবে মুছুন)</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    )}

      {/* Mosque Delete Confirmation Modal */}
      {mosqueToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">মসজিদ ডিলিট নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-400">এই পরিবর্তনটি আর ফিরিয়ে আনা যাবে না</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              আপনি কি নিশ্চিতভাবে মসজিদ <span className="font-bold text-white">"{mosqueToDelete.nameBn || mosqueToDelete.name}"</span> ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMosqueToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionLoading === `mosque-del-${mosqueToDelete.id}`}
                onClick={() => handleDeleteMosque(mosqueToDelete)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 cursor-pointer"
              >
                {actionLoading === `mosque-del-${mosqueToDelete.id}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>স্থায়ীভাবে ডিলিট করুন</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mosque Edit Modal */}
      {selectedMosqueForEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8"
            >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">মসজিদের তথ্য এডিট ও বিস্তারিত</h3>
              </div>
              <button
                onClick={() => setSelectedMosqueForEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>


              <div className="flex gap-4 mb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">মসজিদের ছবি</span>
                  {selectedMosqueForEdit.imageUrl ? (
                    <img src={selectedMosqueForEdit.imageUrl} className="w-20 h-20 rounded-xl object-cover border border-slate-700 shadow" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500">ছবি নেই</div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">ইমাম সাহেবের ছবি</span>
                  {selectedMosqueForEdit.imamImageUrl ? (
                    <img src={selectedMosqueForEdit.imamImageUrl} className="w-20 h-20 rounded-xl object-cover border border-slate-700 shadow" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500">ছবি নেই</div>
                  )}
                </div>
              </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                
                const nameBn = (formData.get('nameBn') as string) || '';
                const name = (formData.get('name') as string) || '';
                const address = (formData.get('address') as string) || '';
                const area = (formData.get('area') as string) || '';
                const district = (formData.get('district') as string) || '';
                const imamName = (formData.get('imamName') as string) || '';
                const contactNumber = (formData.get('contactNumber') as string) || '';
                const latitude = parseFloat(formData.get('latitude') as string) || 0;
                const longitude = parseFloat(formData.get('longitude') as string) || 0;
                const rawRadius = formData.get('verificationRadius') as string;
                const verificationRadius = rawRadius ? Math.max(10, Math.min(500, parseInt(rawRadius, 10) || 75)) : 75;
                const description = (formData.get('description') as string) || '';

                handleSaveMosqueEdit(e, selectedMosqueForEdit.id, {
                  nameBn,
                  name,
                  address,
                  area,
                  district,
                  imamName,
                  contactNumber,
                  latitude,
                  longitude,
                  verificationRadius,
                  description
                });
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">মসজিদের নাম (বাংলা) *</label>
                  <input
                    type="text"
                    name="nameBn"
                    defaultValue={selectedMosqueForEdit.nameBn}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">মসজিদের নাম (English) *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedMosqueForEdit.name}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">পূর্ণাঙ্গ ঠিকানা *</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={selectedMosqueForEdit.address}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">এলাকা / থানা *</label>
                  <input
                    type="text"
                    name="area"
                    defaultValue={selectedMosqueForEdit.area}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">জেলা *</label>
                  <input
                    type="text"
                    name="district"
                    defaultValue={selectedMosqueForEdit.district}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ইমাম / খতিবের নাম *</label>
                  <input
                    type="text"
                    name="imamName"
                    defaultValue={selectedMosqueForEdit.imamName}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">দায়িত্বশীলের ফোন নম্বর *</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    defaultValue={selectedMosqueForEdit.contactNumber}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 border-t border-slate-800 pt-3">
                <label className="text-xs font-semibold text-slate-300 block mb-1">অবস্থান (Map)</label>
                <button
                  type="button"
                  onClick={() => setMapPickerContext('edit')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] font-bold hover:bg-emerald-900 transition-colors"
                >
                  ম্যাপ থেকে লোকেশন সিলেক্ট করুন
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Latitude (অক্ষাংশ)</label>
                  <input

                    type="number"
                    step="any"
                    name="latitude"
                    value={selectedMosqueForEdit.latitude}
                    onChange={e => setSelectedMosqueForEdit({...selectedMosqueForEdit, latitude: parseFloat(e.target.value)})}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Longitude (দ্রাঘিমাংশ)</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={selectedMosqueForEdit.longitude}
                    onChange={e => setSelectedMosqueForEdit({...selectedMosqueForEdit, longitude: parseFloat(e.target.value)})}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    লোকেশন ভেরিফিকেশন রেডিয়াস (মিটার) *
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono">ডিফল্ট: ৭৫ মি.</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="500"
                  name="verificationRadius"
                  value={selectedMosqueForEdit.verificationRadius !== undefined && selectedMosqueForEdit.verificationRadius !== null ? selectedMosqueForEdit.verificationRadius : ''}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedMosqueForEdit({
                      ...selectedMosqueForEdit,
                      verificationRadius: val === '' ? ('' as any) : Number(val)
                    });
                  }}
                  onBlur={() => {
                    const val = Number(selectedMosqueForEdit.verificationRadius);
                    if (!val || isNaN(val) || val <= 0) {
                      setSelectedMosqueForEdit({
                        ...selectedMosqueForEdit,
                        verificationRadius: 75
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="যেমনঃ 50, 75, 100"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  মসজিদের নির্ধারিত জিপিএস স্থানাঙ্ক থেকে এই দূরত্বের (মিটারে) মধ্যে ব্যবহারকারী থাকলে উপস্থিতি ভেরিফাই হবে।
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">বিশেষ বিবরণ (ঐচ্ছিক)</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={selectedMosqueForEdit.description || ''}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedMosqueForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `mosque-edit-${selectedMosqueForEdit.id}`}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white cursor-pointer shadow flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  {actionLoading === `mosque-edit-${selectedMosqueForEdit.id}` ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>সংরক্ষণ করুন</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    )}

      {/* ========================================================= */}
      {/* SECTION 3: PARTNER SHOPS MANAGEMENT                       */}
      {/* ========================================================= */}
      {activeTab === 'shops' && !selectedMerchantVerification && !selectedShopId && (
        <PartnerShopsView 
          onSelectShop={(shop) => {
             setSelectedMerchantVerification(null);
             setSelectedShopId(shop.shopId);
             setSelectedShopRecord(shop);
          }} 
          onAddShopClick={() => setIsAddShopModalOpen(true)} 
          initialStatus="ACTIVE"
        />
      )}
      {activeTab === 'shops' && selectedShopId && (
        <ShopDetailsView
          shopId={selectedShopId}
          verificationRecord={selectedShopRecord || undefined}
          onBack={() => {
            setSelectedShopId(null);
            setSelectedShopRecord(null);
          }}
          onShopDeleted={() => {
            setSelectedShopId(null);
            setSelectedShopRecord(null);
            loadAdminData();
          }}
          onShopStatusChanged={() => {
            loadAdminData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* SECTION 4: USERS MANAGEMENT                               */}
      {/* ========================================================= */}
      {activeTab === 'users' && !selectedMerchantVerification && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="ইউজার নাম বা মোবাইল নম্বর খুঁজুন..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUserFilterPanelOpen(!isUserFilterPanelOpen)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isUserFilterPanelOpen || [userMaritalStatusFilter, userGenderFilter, userStatusFilter, userDistrictFilter, minAgeFilter, maxAgeFilter].some(f => f !== 'all' && f !== '')
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>ফিল্টার</span>
                  {[userMaritalStatusFilter, userGenderFilter, userStatusFilter, userDistrictFilter, minAgeFilter, maxAgeFilter].filter(f => f !== 'all' && f !== '').length > 0 && (
                    <span className="bg-amber-500 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black">
                      {[userMaritalStatusFilter, userGenderFilter, userStatusFilter, userDistrictFilter, minAgeFilter, maxAgeFilter].filter(f => f !== 'all' && f !== '').length}
                    </span>
                  )}
                </button>

                <div className="relative group">
                  <button
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <ArrowUpDown className="w-4 h-4 text-amber-500" />
                    <span>সাজান</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {[
                      { id: 'created_DESC', label: 'নতুন থেকে পুরোনো', sort: 'created', order: 'DESC' },
                      { id: 'created_ASC', label: 'পুরোনো থেকে নতুন', sort: 'created', order: 'ASC' },
                      { id: 'name_ASC', label: 'নাম A → Z', sort: 'name', order: 'ASC' },
                      { id: 'name_DESC', label: 'নাম Z → A', sort: 'name', order: 'DESC' },
                      { id: 'age_ASC', label: 'বয়স কম থেকে বেশি', sort: 'age', order: 'ASC' },
                      { id: 'age_DESC', label: 'বয়স বেশি থেকে কম', sort: 'age', order: 'DESC' }
                    ].map((opt, oIdx) => (
                      <button
                        key={`adv-sort-${opt.id}-${oIdx}`}
                        onClick={() => {
                          setUserSortBy(opt.sort);
                          setUserSortOrder(opt.order as any);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-800 flex items-center justify-between ${
                          userSortBy === opt.sort && userSortOrder === opt.order ? 'text-amber-500 font-bold bg-amber-500/5' : 'text-slate-300'
                        }`}
                      >
                        {opt.label}
                        {userSortBy === opt.sort && userSortOrder === opt.order && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isUserFilterPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">বৈবাহিক অবস্থা</label>
                      <select
                        value={userMaritalStatusFilter}
                        onChange={e => setUserMaritalStatusFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">সকল</option>
                        <option value="married">বিবাহিত</option>
                        <option value="single">অবিবাহিত</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">লিঙ্গ</label>
                      <select
                        value={userGenderFilter}
                        onChange={e => setUserGenderFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">সকল</option>
                        <option value="male">পুরুষ</option>
                        <option value="female">নারী</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">বয়সের সীমা</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="সর্বনিম্ন"
                          value={minAgeFilter}
                          onChange={e => setMinAgeFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-slate-600 text-xs">থেকে</span>
                        <input
                          type="number"
                          placeholder="সর্বোচ্চ"
                          value={maxAgeFilter}
                          onChange={e => setMaxAgeFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">জেলা</label>
                      <select
                        value={userDistrictFilter}
                        onChange={e => {
                          setUserDistrictFilter(e.target.value);
                          setUserUpazilaFilter('all');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">সকল জেলা</option>
                        {BANGLADESH_DISTRICTS.slice().sort((a, b) => a.districtBn.localeCompare(b.districtBn)).map((d, idx) => (
                          <option key={`${d.district}-${idx}`} value={d.district ?? ''}>{d.districtBn}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">উপজেলা</label>
                      <select
                        value={userUpazilaFilter}
                        onChange={e => setUserUpazilaFilter(e.target.value)}
                        disabled={userDistrictFilter === 'all'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="all">{userDistrictFilter === 'all' ? 'প্রথমে জেলা নির্বাচন করুন' : 'সকল উপজেলা'}</option>
                        {userDistrictFilter !== 'all' && 
                          getDistrictUpazilaItems(userDistrictFilter).map((u, idx) => (
                            <option key={`${u.nameEn}-${idx}`} value={u.nameBn}>{u.label}</option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">অ্যাকাউন্ট স্ট্যাটাস</label>
                      <select
                        value={userStatusFilter}
                        onChange={e => setUserStatusFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">সকল</option>
                        <option value="active">সক্রিয় (Active)</option>
                        <option value="suspended">স্থগিত (Suspended)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setUserMaritalStatusFilter('all');
                        setUserGenderFilter('all');
                        setUserStatusFilter('all');
                        setUserDistrictFilter('all');
                        setUserUpazilaFilter('all');
                        setMinAgeFilter('');
                        setMaxAgeFilter('');
                        setUserSearch('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      সব রিসেট করুন
                    </button>
                    <button
                      onClick={() => setIsUserFilterPanelOpen(false)}
                      className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      বন্ধ করুন
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-xs text-slate-400 px-1 flex items-center justify-between">
            <span>
              {usersLoading ? 'লোড হচ্ছে...' : (
                users.length > 0 
                  ? `মোট ${toBnNumber(users.length)} জন ইউজার পাওয়া গেছে`
                  : 'আপনার নির্বাচিত ফিল্টারের সাথে কোনো ইউজার পাওয়া যায়নি'
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-xs text-slate-500">ইউজার তালিকা লোড হচ্ছে...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-xs">
                {userSearch || userDistrictFilter !== 'all' || userMaritalStatusFilter !== 'all' 
                  ? 'আপনার নির্বাচিত ফিল্টারের সাথে কোনো ইউজার পাওয়া যায়নি।'
                  : 'কোনো ইউজার পাওয়া যায়নি।'}
              </div>
            ) : (
              users.map((user, uIdx) => {
                return (
                  <motion.div
                    layout
                    key={`adv-usr-${user.id || 'u'}-${uIdx}`}
                    onClick={() => handleOpenUserDetails(user.id)}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-black text-sm">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300">
                          {user.fullName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">{user.phone}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                          <span className="text-[10px] text-slate-500">
                            {user.dateOfBirth ? `${toBnNumber(calculateAge(user.dateOfBirth))} বছর` : user.age ? `${toBnNumber(user.age)} বছর` : 'বয়স অজানা'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400">
                          {(() => {
                            const dist = BANGLADESH_DISTRICTS.find(d => d.district === user.district || d.districtBn === user.district);
                            const distName = dist ? dist.districtBn : user.district;
                            if (distName && user.upazila) return `${distName}, ${user.upazila}`;
                            return distName || 'ঠিকানা অজানা';
                          })()}
                        </p>
                        <p className="text-[10px] text-slate-500">{user.maritalStatus === 'married' ? 'বিবাহিত' : user.maritalStatus === 'single' ? 'অবিবাহিত' : 'বৈবাহিক অবস্থা অজানা'}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          user.status === 'active'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                        }`}
                      >
                        {user.status === 'active' ? 'সক্রিয়' : 'স্থগিত'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: SUPPORT TICKETS                                */}
      {/* ========================================================= */}
      {activeTab === 'tickets' && !selectedMerchantVerification && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                সাপোর্ট টিকেট ইতিহাস ({toBnNumber(tickets.length)})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                গ্রাহক ও ব্যবহারকারীদের বার্তা এবং হেল্পডেস্ক সহায়তার ইতিহাস
              </p>
            </div>

            {tickets.length > 0 && (
              <button
                onClick={() => setIsClearTicketsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>ইতিহাস মুছে ফেলুন</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-xs">
                কোনো সাপোর্ট টিকিট পাওয়া যায়নি।
              </div>
            ) : (
              tickets.map((ticket, tIdx) => (
                <div
                  key={`adv-tkt-${ticket.id || 't'}-${tIdx}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-400">{ticket.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ticket.status === 'RESOLVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString('bn-BD', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{ticket.subject}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ব্যবহারকারী: {ticket.userName} ({ticket.userPhone})
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {ticket.message}
                  </div>

                  {ticket.adminResponse && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-emerald-400 text-[11px]">এডমিন উত্তরঃ</span>
                      <p className="text-slate-200">{ticket.adminResponse}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handleDeleteTicket(ticket.id)}
                      disabled={actionLoading === `delete-ticket-${ticket.id}`}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছে ফেলুন</span>
                    </button>

                    <button
                      onClick={() => {
                        setTicketReplyModal(ticket);
                        setAdminReplyText(ticket.adminResponse || '');
                        setReplyStatus(ticket.status === 'OPEN' ? 'RESOLVED' : (ticket.status as any));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
                    >
                      উত্তর দিন / স্ট্যাটাস পরিবর্তন
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW MOSQUE FORM                              */}
      {/* ========================================================= */}
      {isAddMosqueModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8"
            >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">নতুন মসজিদ যুক্ত করুন</h3>
              </div>
              <button
                onClick={() => setIsAddMosqueModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMosque} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  মসজিদের নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={newMosqueNameBn}
                  onChange={e => setNewMosqueNameBn(e.target.value)}
                  placeholder="যেমনঃ বায়তুল মুকাররম জাতীয় মসজিদ"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  মসজিদের নাম (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newMosqueName}
                  onChange={e => setNewMosqueName(e.target.value)}
                  placeholder="e.g. Baitul Mukarram National Mosque"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  পূর্ণ ঠিকানা *
                </label>
                <input
                  type="text"
                  required
                  value={newMosqueAddress}
                  onChange={e => setNewMosqueAddress(e.target.value)}
                  placeholder="যেমনঃ তোপখানা রোড, পল্টন"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">এলাকা / থানা</label>
                  <input
                    type="text"
                    value={newMosqueArea}
                    onChange={e => setNewMosqueArea(e.target.value)}
                    placeholder="Dhaka"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">জেলা</label>
                  <input
                    type="text"
                    value={newMosqueDistrict}
                    onChange={e => setNewMosqueDistrict(e.target.value)}
                    placeholder="Dhaka"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ইমাম সাহেবের নাম (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={newMosqueImam}
                    onChange={e => setNewMosqueImam(e.target.value)}
                    placeholder="মাওলানা..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">যোগাযোগ ফোন (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={newMosquePhone}
                    onChange={e => setNewMosquePhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Google Maps Coordinates Input */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>গুগল ম্যাপস লোকেশন</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapPickerContext('new')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>📍 ম্যাপে লোকেশন সেট করুন</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={newMosqueLatitude}
                      onChange={e => setNewMosqueLatitude(e.target.value)}
                      placeholder="Latitude"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newMosqueLongitude}
                      onChange={e => setNewMosqueLongitude(e.target.value)}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    লোকেশন ভেরিফিকেশন রেডিয়াস (মিটার) *
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono">ডিফল্ট: ৭৫ মি.</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={newMosqueVerificationRadius}
                  onChange={e => setNewMosqueVerificationRadius(e.target.value)}
                  onBlur={() => {
                    const num = Number(newMosqueVerificationRadius);
                    if (!num || isNaN(num) || num <= 0) {
                      setNewMosqueVerificationRadius('75');
                    }
                  }}
                  placeholder="75"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  মসজিদের নির্ধারিত জিপিএস স্থানাঙ্ক থেকে এই দূরত্বের (মিটারে) মধ্যে ব্যবহারকারী থাকলে উপস্থিতি ভেরিফাই হবে।
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">মসজিদের বিবরণ / ডেসক্রিপশন (ঐচ্ছিক)</label>
                <textarea
                  value={newMosqueDescription}
                  onChange={e => setNewMosqueDescription(e.target.value)}
                  placeholder="মসজিদের ইতিহাস বা বর্ণনা..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">প্রাথমিক স্ট্যাটাস</label>
                <select
                  value={newMosqueStatus}
                  onChange={e => setNewMosqueStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active (সক্রিয়)</option>
                  <option value="pending">Pending (অপেক্ষমান)</option>
                  <option value="inactive">Inactive (নিষ্ক্রিয়)</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  মসজিদ যুক্ত হওয়ার পর ব্যবহারকারীরা ওয়াক্তের সময় এবং অনুমোদিত ভৌগোলিক দূরত্বের ভিত্তিতে জামাত সালাত ভেরিফাই করতে পারবেন।
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddMosqueModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  {actionLoading === 'create-mosque' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>যুক্ত হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>মসজিদ সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    )}

      {/* Location Picker Modal for Mosque */}
      <AnimatePresence>
        {mapPickerContext && (
          <MosqueLocationPickerModal
            key="mosque-location-picker"
            initialLat={mapPickerContext === 'edit' ? (selectedMosqueForEdit?.latitude || 0) : (parseFloat(newMosqueLatitude) || 0)}
            initialLng={mapPickerContext === 'edit' ? (selectedMosqueForEdit?.longitude || 0) : (parseFloat(newMosqueLongitude) || 0)}
            address={mapPickerContext === 'edit' ? (selectedMosqueForEdit?.address || '') : newMosqueAddress}
            onClose={() => setMapPickerContext(null)}
            onSuccess={(lat, lng, address) => {
              if (mapPickerContext === 'edit') {
                 setSelectedMosqueForEdit(prev => prev ? {...prev, latitude: lat, longitude: lng, address: (address && !prev.address) ? address : prev.address} : null);
              } else {
                 setNewMosqueLatitude(String(lat));
                 setNewMosqueLongitude(String(lng));
                 if (address && !newMosqueAddress) {
                   setNewMosqueAddress(address);
                 }
              }
              setMapPickerContext(null);
            }}
            onShowToast={onShowToast}
          />
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: ADD NEW PARTNER SHOP FORM                        */}
      {/* ========================================================= */}
      {isAddShopModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8"
            >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">নতুন পার্টনার শপ যুক্ত করুন</h3>
              </div>
              <button
                onClick={() => setIsAddShopModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    দোকানের নাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newShopNameBn}
                    onChange={e => setNewShopNameBn(e.target.value)}
                    placeholder="যেমনঃ আল-মদিনা সুইটস"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    দোকানের নাম (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newShopName}
                    onChange={e => setNewShopName(e.target.value)}
                    placeholder="e.g. Al-Madina Sweets"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ক্যাটাগরি</label>
                  <select
                    value={newShopCategory}
                    onChange={e => setNewShopCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="food">খাবার ও রেস্টুরেন্ট (Food)</option>
                    <option value="grocery">মুদি দোকান (Grocery)</option>
                    <option value="clothing">পোশাক ও ফ্যাশন (Clothing)</option>
                    <option value="books">বই ও ইসলামিক সামগ্রী (Books)</option>
                    <option value="pharmacy">ফার্মেসি (Pharmacy)</option>
                    <option value="electronics">ইলেকট্রনিক্স (Electronics)</option>
                    <option value="general">সাধারণ সেবা (General)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">মার্চেন্ট ফোন (লগইন) *</label>
                  <input
                    type="text"
                    required
                    value={newShopPhone}
                    onChange={e => setNewShopPhone(e.target.value)}
                    placeholder="018xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">দোকানের ঠিকানা *</label>
                <input
                  type="text"
                  required
                  value={newShopAddress}
                  onChange={e => setNewShopAddress(e.target.value)}
                  placeholder="যেমনঃ দোকান নং-১২, বায়তুল মুকাররম মার্কেট, ঢাকা"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Merchant Credentials Section */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400">মার্চেন্ট পোর্টাল লগইন ও পিন কোড</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ম্যানেজার / স্বত্বাধিকারী</label>
                    <input
                      type="text"
                      value={newShopOwnerName}
                      onChange={e => setNewShopOwnerName(e.target.value)}
                      placeholder="ম্যানেজারের নাম"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">প্রাথমিক পিন (৬ ডিজিট) *</label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={newShopOwnerPin}
                      onChange={e => setNewShopOwnerPin(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  * পিন কোডটি স্বয়ংক্রিয়ভাবে bcrypt দিয়ে হ্যাশ করে নিরাপদে ডাটাবেসে সংরক্ষিত হবে।
                </p>
              </div>

              {/* Discounts Section */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500">
                  ডিসকাউন্ট সেটিংস পরবর্তী ধাপে কনফিগার করা যাবে।
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddShopModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create-shop'}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading === 'create-shop' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>যুক্ত হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>শপ সংরক্ষণ ও QR তৈরি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    )}

      {/* ========================================================= */}
      {/* MODAL 3: HIGH-RES SCANNABLE & PRINTABLE QR CODE VIEWER    */}
      {/* ========================================================= */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                PARTNER SHOP QR
              </span>
              <button
                onClick={() => setQrModalItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                {qrModalItem.nameBn || qrModalItem.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{qrModalItem.subtitle}</p>
            </div>

            {/* High-Resolution QR Canvas/Image */}
            <div className="p-4 bg-white rounded-3xl mx-auto w-56 h-56 flex flex-col items-center justify-center shadow-2xl border-4 border-slate-800">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl object-contain" />
              ) : (
                <QrCode className="w-36 h-36 text-slate-900 animate-pulse" />
              )}
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-400 break-all select-all">
              {qrModalItem.qrIdentifier}
            </div>

            {/* Action Buttons: Print & Download */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handlePrintQr}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট পোস্টার</span>
              </button>
              <button
                onClick={handleDownloadQrPng}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>PNG ডাউনলোড</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: SUPPORT TICKET REPLY                             */}
      {/* ========================================================= */}
      {ticketReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">টিকেট উত্তর ও স্ট্যাটাস আপডেট</h3>
              <button
                onClick={() => setTicketReplyModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTicketResponse} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">স্ট্যাটাস</label>
                <select
                  value={replyStatus}
                  onChange={e => setReplyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (প্রক্রিয়াধীন)</option>
                  <option value="RESOLVED">RESOLVED (সমাধান হয়েছে)</option>
                  <option value="CLOSED">CLOSED (বন্ধ)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">এডমিন উত্তর</label>
                <textarea
                  value={adminReplyText}
                  onChange={e => setAdminReplyText(e.target.value)}
                  placeholder="ইউজারকে সমাধানের বার্তা লিখুন..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketReplyModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'ticket-submit'}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL 5: CONFIGURE SHOP DISCOUNTS & COMMISSION            */}
      {/* ========================================================= */}
      {selectedShopForConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedShopForConfig.nameBn || selectedShopForConfig.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ডিসকাউন্ট পার্সেন্টেজ ও কমিশন কনফিগারেশন • ID: {selectedShopForConfig.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForConfig(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShopConfig} className="space-y-4">

              {/* Token Discount Percentages */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500">
                  ডিসকাউন্ট সেটিংস পরবর্তী ধাপে কনফিগার করা যাবে।
                </p>
              </div>


              {/* Shop Status & Basic Information */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      শপ স্ট্যাটাস
                    </label>
                    <select
                      value={editShopStatus}
                      onChange={e => setEditShopStatus(e.target.value as ShopStatus)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="ACTIVE">ACTIVE (সক্রিয় ও রিডিমযোগ্য)</option>
                      <option value="PENDING">PENDING (অপেক্ষমান)</option>
                      <option value="SUSPENDED">SUSPENDED (স্থগিত)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      ক্যাটাগরি
                    </label>
                    <select
                      value={editShopCategory}
                      onChange={e => setEditShopCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="food">খাবার ও রেস্টুরেন্ট (Food)</option>
                      <option value="grocery">মুদি দোকান (Grocery)</option>
                      <option value="clothing">পোশাক ও ফ্যাশন (Clothing)</option>
                      <option value="books">বই ও ইসলামিক সামগ্রী (Books)</option>
                      <option value="pharmacy">ফার্মেসি (Pharmacy)</option>
                      <option value="electronics">ইলেকট্রনিক্স (Electronics)</option>
                      <option value="general">সাধারণ সেবা (General)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      দোকানের নাম (বাংলা)
                    </label>
                    <input
                      type="text"
                      required
                      value={editShopNameBn}
                      onChange={e => setEditShopNameBn(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      দোকানের নাম (English)
                    </label>
                    <input
                      type="text"
                      required
                      value={editShopName}
                      onChange={e => setEditShopName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      যোগাযোগ ফোন
                    </label>
                    <input
                      type="text"
                      required
                      value={editShopPhone}
                      onChange={e => setEditShopPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      খোলার সময়সূচি
                    </label>
                    <input
                      type="text"
                      value={editShopOpeningHours}
                      onChange={e => setEditShopOpeningHours(e.target.value)}
                      placeholder="10:00 AM - 10:00 PM"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    পূর্ণ ঠিকানা
                  </label>
                  <input
                    type="text"
                    required
                    value={editShopAddress}
                    onChange={e => setEditShopAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modal Action Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedShopForConfig;
                    setSelectedShopForConfig(null);
                    setQrModalItem({
                      type: 'SHOP',
                      id: s.id,
                      name: s.name,
                      nameBn: s.nameBn,
                      subtitle: `${s.category} • ${s.address}`,
                      qrIdentifier: s.qrIdentifier
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>QR দেখুন</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedShopForConfig(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === `save-shop-${selectedShopForConfig.id}`}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading === `save-shop-${selectedShopForConfig.id}` ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>পরিবর্তন সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 11: ADMIN MANAGEMENT (RBAC)                       */}
      {/* ========================================================= */}
      {activeTab === 'admin-management' && !selectedMerchantVerification && hasPermission('ADMIN_VIEW') && (
        <div className="space-y-6 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                এডমিন একাউন্টস ম্যানেজমেন্ট
              </h3>
              <p className="text-[11px] text-slate-400">
                সিস্টেম অ্যাক্সেস, রোল বরাদ্দ এবং গ্র্যানুলার পারমিশন কন্ট্রোল করুন
              </p>
            </div>
            {hasPermission('ADMIN_CREATE') && (
              <button
                onClick={() => setIsAddAdminModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন এডমিন যোগ করুন</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 text-left">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="এডমিনের নাম, ইমেইল অথবা ফোন দিয়ে খুঁজুন..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] font-bold tracking-wider">
                    <th className="p-4">নাম ও পরিচিতি</th>
                    <th className="p-4">রোল</th>
                    <th className="p-4">অনুমতিসমূহ (Permissions)</th>
                    <th className="p-4">স্ট্যাটাস</th>
                    <th className="p-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {adminAccounts.filter(a => {
                    const term = (userSearch || '').toLowerCase();
                    return (
                      (a.name || '').toLowerCase().includes(term) ||
                      (a.email && a.email.toLowerCase().includes(term)) ||
                      (a.phone && a.phone.includes(term))
                    );
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        কোনো এডমিন অ্যাকাউন্ট পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    adminAccounts.filter(a => {
                      const term = (userSearch || '').toLowerCase();
                      return (
                        (a.name || '').toLowerCase().includes(term) ||
                        (a.email && a.email.toLowerCase().includes(term)) ||
                        (a.phone && a.phone.includes(term))
                      );
                    }).map((account, aIdx) => (
                      <tr key={`adv-acc-${account.id || 'a'}-${aIdx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{account.name}</div>
                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            {account.email && <div>✉ {account.email}</div>}
                            {account.phone && <div>📞 {account.phone}</div>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            account.role === 'MASTER_ADMIN'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : account.role === 'ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          }`}>
                            {account.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {account.role === 'MASTER_ADMIN' ? (
                              <span className="px-1.5 py-0.5 bg-slate-950 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold">
                                ALL BYPASS
                              </span>
                            ) : parsePermissions(account.permissions).length > 0 ? (
                              parsePermissions(account.permissions).map((perm: string, pIdx: number) => (
                                <span key={`${perm}-${pIdx}`} className="px-1.5 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded text-[9px]">
                                  {perm}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-600">কোনো অনুমতি নেই</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            account.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {account.status === 'suspended' ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('ADMIN_EDIT') && account.role !== 'MASTER_ADMIN' && (
                              <button
                                onClick={() => {
                                  setSelectedAdminForEdit(account);
                                  setIsEditAdminModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                                title="এডিট করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission('ADMIN_DELETE') && account.role !== 'MASTER_ADMIN' && (
                              <button
                                onClick={() => handleDeleteAdminAccount(account.id)}
                                className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900 hover:bg-rose-900/60 text-rose-300 transition-colors"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* SECTION 14: NASIHA & NOTIFICATIONS & MODERATION           */}
      {/* ========================================================= */}
      {activeTab === 'notification-templates' && !selectedMerchantVerification && (
        <AdminNotificationManagementView onShowToast={onShowToast} />
      )}

      {activeTab === 'nasiha' && !selectedMerchantVerification && (
        <div className="space-y-6 text-left">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span>নসিহা ম্যানেজমেন্ট</span>
            </h3>
            <p className="text-xs text-slate-400">
              ডেইলি নসিহা আপডেট এবং পরিচালনা করুন।
            </p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <NasihaManagement />
          </div>
        </div>
      )}

      {activeTab === 'blog' && !selectedMerchantVerification && (
        <div className="space-y-6 text-left">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              <span>Cave Media ম্যানেজমেন্ট</span>
            </h3>
            <p className="text-xs text-slate-400">
              অ্যাপের ইউজারদের জন্য Cave Media কন্টেন্ট ও ভিডিও প্রকাশ এবং সম্পাদনা করুন।
            </p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <BlogManagement />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: HELPLINE MANAGEMENT                              */}
      {/* ========================================================= */}
      {activeTab === 'helpline' && !selectedMerchantVerification && (
        <div className="space-y-6 text-left">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-500" />
              <span>হেল্পলাইন ও সাপোর্ট ব্যবস্থাপনা</span>
            </h3>
            <p className="text-xs text-slate-400">
              ইউজার অ্যাপে প্রদর্শিত হেল্পলাইন ফোন নম্বর, হোয়াটসঅ্যাপ সাপোর্ট, ইমেইল এবং সাপোর্ট নোটিশ ডায়নামিকালি পরিবর্তন করুন।
            </p>
          </div>

          <HelplineManagement onShowToast={onShowToast} />
        </div>
      )}

      
      {/* ========================================================= */}
      {/* SECTION: ADVERTISEMENT MANAGEMENT                           */}
      {/* ========================================================= */}
      {activeTab === 'ads' && !selectedMerchantVerification && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdvertisementManagement onShowToast={(type, title, msg) => alert(title + ': ' + msg)} />
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: SECURITY DIAGNOSTIC & QUARANTINE REVIEW          */}
      {/* ========================================================= */}
      {(activeTab === 'security-diagnostic' || activeTab === 'quarantine') && !selectedMerchantVerification && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'security-diagnostic' && <SecurityDiagnostic />}
          <AdminQuarantineView onReAuthenticate={() => {
            setIsAdminAuthenticated(false);
            removeStoredAdminToken();
          }} />
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 13: MENU & ACCESS CONTROL (FB PAGE STYLE)       */}
      {/* ========================================================= */}
      {activeTab === 'menu' && !selectedMerchantVerification && (
        <div className="space-y-8 text-left">
          {/* Top Header */}
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>মেনু ও মডারেটর এক্সেস কন্ট্রোল</span>
            </h3>
            <p className="text-xs text-slate-400">
              আপনার পাসওয়ার্ড পরিবর্তন করুন এবং ফেসবুক পেজের মতো নতুন মডারেটরদের ফুল (Full) বা হাফ (Half) অ্যাক্সেস প্রদান করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Change Password Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>পাসওয়ার্ড পরিবর্তন করুন (Change Password)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে নিয়মিত পাসওয়ার্ড আপডেট করুন
                </p>
              </div>

              <form onSubmit={handleSelfChangePassword} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">বর্তমান পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">নতুন পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="নতুন পাসওয়ার্ডটি পুনরায় লিখুন"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/10 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? (
                    <span>আপডেট হচ্ছে...</span>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>পাসওয়ার্ড পরিবর্তন নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Add Moderator Facebook Style */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>নতুন মডারেটর যুক্ত করুন (Facebook Access Style)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  ফেসবুক পেজ রোলের মতো যেকোনো ব্যক্তিকে সিস্টেম ম্যানেজ করার আংশিক বা পূর্ণ অ্যাক্সেস দিন
                </p>
              </div>

              <form onSubmit={handleSaveModerator} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">মডারেটরের নাম *</label>
                    <input
                      type="text"
                      required
                      value={modName}
                      onChange={e => setModName(e.target.value)}
                      placeholder="নাম লিখুন"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">মোবাইল নম্বর *</label>
                    <input
                      type="text"
                      required
                      value={modPhone}
                      onChange={e => setModPhone(e.target.value)}
                      placeholder="যেমন: 017XXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">ইমেইল (ঐচ্ছিক)</label>
                    <input
                      type="email"
                      value={modEmail}
                      onChange={e => setModEmail(e.target.value)}
                      placeholder="যেমন: name@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">লগইন পাসওয়ার্ড *</label>
                    <input
                      type="password"
                      required
                      value={modPassword}
                      onChange={e => setModPassword(e.target.value)}
                      placeholder="ন্যূনতম ৬ অক্ষর"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">এক্সেস লেভেল নির্বাচন করুন (FB Page Roles)</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Access */}
                    <label className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      modAccessLevel === 'full'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="modAccessLevel"
                          checked={modAccessLevel === 'full'}
                          onChange={() => setModAccessLevel('full')}
                          className="mt-0.5 text-amber-500 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-black text-white block">Full Access (সব এক্সেস)</span>
                          <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                            সিস্টেমের সকল ড্যাশবোর্ড, মসজিদ ও শপ এডিট/ডিলিট করা, অফার ও মার্চেন্ট এপ্রুভাল এবং সম্পূর্ণ এডমিন কন্ট্রোল পাবেন।
                          </span>
                        </div>
                      </div>
                    </label>

                    {/* Half Access */}
                    <label className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      modAccessLevel === 'half'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="modAccessLevel"
                          checked={modAccessLevel === 'half'}
                          onChange={() => setModAccessLevel('half')}
                          className="mt-0.5 text-amber-500 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-black text-white block">Half Access (অর্ধেক এক্সেস)</span>
                          <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                            শুধুমাত্র ড্যাশবোর্ড ও শপ দেখতে পারবেন এবং কাস্টমার সাপোর্ট টিকেটের উত্তর দিতে পারবেন। কোনো কিছু ডিলিট বা এপ্রুভ করতে পারবেন না।
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAddingMod}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {isAddingMod ? (
                    <span>প্রক্রিয়াধীন...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>মডারেটর হিসেবে রোল অ্যাসাইন করুন</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* System Access List (Facebook Style People with Page Access List) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>সিস্টেম অ্যাক্সেসপ্রাপ্ত ব্যক্তিবর্গ (People with Page Access)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                বর্তমানে এই সিস্টেমে যাদের মডারেটর অথবা এডমিন এক্সেস রয়েছে তাদের তালিকা ও নিয়ন্ত্রণ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminAccounts.filter(a => a.role !== 'MASTER_ADMIN').length === 0 ? (
                <div className="col-span-2 p-8 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800/50">
                  এখনো কোনো কাস্টম মডারেটর বা সাব-এডমিন অ্যাকাউন্ট যুক্ত করা হয়নি।
                </div>
              ) : (
                adminAccounts.filter(a => a.role !== 'MASTER_ADMIN').map((account, aIdx) => {
                  const initials = account.name ? account.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'CC';
                  const isFull = account.role === 'ADMIN';

                  return (
                    <div key={`adv-adm-${account.id || 'a'}-${aIdx}`} className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all flex items-center justify-between gap-4">
                      {/* Left Side: Avatar & Details */}
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs flex items-center justify-center uppercase shrink-0 select-none">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-black text-white block">{account.name}</span>
                          <span className="text-[10px] text-slate-400 block">📞 {account.phone}</span>
                          
                          {/* Access level description */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isFull
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {isFull ? 'Full Access (এডমিন)' : 'Half Access (মডারেটর)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Quick Action Buttons (FB style toggle access & remove) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleModAccess(account.id, account.role)}
                          disabled={actionLoading === `toggle-access-${account.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-850 border border-slate-700 text-[10px] font-black text-amber-400 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          title="এক্সেস লেভেল পরিবর্তন করুন"
                        >
                          <RefreshCw className={`w-3 h-3 ${actionLoading === `toggle-access-${account.id}` ? 'animate-spin' : ''}`} />
                          <span>{isFull ? 'হাফ এক্সেস' : 'ফুল এক্সেস'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAdminAccount(account.id)}
                          className="p-1.5 rounded-lg bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950 hover:text-rose-400 text-rose-300 transition-colors cursor-pointer shrink-0"
                          title="অ্যাক্সেস মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: ADD NEW ADMIN ACCOUNT                             */}
      {/* ========================================================= */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert className="text-amber-400 w-4 h-4" />
                নতুন এডমিন অ্যাকাউন্ট তৈরি করুন
              </h3>
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">পূর্ণ নাম *</label>
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    placeholder="যেমনঃ এডমিন করিম"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">পাসওয়ার্ড *</label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    placeholder="karim@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={newAdminPhone}
                    onChange={e => setNewAdminPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">রোল বরাদ্দ করুন</label>
                <select
                  value={newAdminRole}
                  onChange={e => setNewAdminRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ADMIN">ADMIN (সাধারণ এডমিন)</option>
                  <option value="SUB_ADMIN">SUB_ADMIN (সাব-এডমিন)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 block">অনুমতি নির্ধারণ করুন (Permissions)</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_PERMISSIONS.map((p, pIdx) => {
                    const checked = isSectionChecked(newAdminPermissions, p.value);
                    return (
                      <label key={`${p.value}-${pIdx}`} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setNewAdminPermissions(prev => togglePermissionInArray(prev, p.value, checked));
                          }}
                          className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <div className="text-left">
                          <span className="text-[11px] font-semibold text-white block">{p.label}</span>
                          <span className="text-[9px] text-slate-500 block uppercase">{p.category}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create-admin'}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center"
                >
                  {actionLoading === 'create-admin' ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 8: EDIT ADMIN ACCOUNT                               */}
      {/* ========================================================= */}
      {isEditAdminModalOpen && selectedAdminForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert className="text-amber-400 w-4 h-4" />
                এডমিন অ্যাকাউন্ট এডিট করুন: {selectedAdminForEdit.name}
              </h3>
              <button
                onClick={() => setIsEditAdminModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">পূর্ণ নাম *</label>
                  <input
                    type="text"
                    required
                    value={selectedAdminForEdit.name ?? ''}
                    onChange={e => setSelectedAdminForEdit({ ...selectedAdminForEdit, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">অ্যাকাউন্ট স্ট্যাটাস</label>
                  <select
                    value={selectedAdminForEdit.status || 'active'}
                    onChange={e => setSelectedAdminForEdit({ ...selectedAdminForEdit, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Active (সক্রিয়)</option>
                    <option value="suspended">Suspended (স্থগিত)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    value={selectedAdminForEdit.email || ''}
                    onChange={e => setSelectedAdminForEdit({ ...selectedAdminForEdit, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={selectedAdminForEdit.phone || ''}
                    onChange={e => setSelectedAdminForEdit({ ...selectedAdminForEdit, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">রোল বরাদ্দ করুন</label>
                <select
                  value={selectedAdminForEdit.role ?? ''}
                  onChange={e => setSelectedAdminForEdit({ ...selectedAdminForEdit, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ADMIN">ADMIN (সাধারণ এডমিন)</option>
                  <option value="SUB_ADMIN">SUB_ADMIN (সাব-এডমিন)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 block">অনুমতি নির্ধারণ করুন (Permissions)</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_PERMISSIONS.map((p, pIdx) => {
                    const currentPerms = parsePermissions(selectedAdminForEdit.permissions);
                    const checked = isSectionChecked(currentPerms, p.value);
                    return (
                      <label key={`${p.value}-${pIdx}`} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const updatedPerms = togglePermissionInArray(currentPerms, p.value, checked);
                            setSelectedAdminForEdit({ ...selectedAdminForEdit, permissions: updatedPerms });
                          }}
                          className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <div className="text-left">
                          <span className="text-[11px] font-semibold text-white block">{p.label}</span>
                          <span className="text-[9px] text-slate-500 block uppercase">{p.category}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `edit-admin-${selectedAdminForEdit.id}`}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center"
                >
                  {actionLoading === `edit-admin-${selectedAdminForEdit.id}` ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* USER DETAILS MODAL                                        */}
      {/* ========================================================= */}
      {isUserDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ইউজার বিস্তারিত</h3>
                  <p className="text-xs text-slate-400">রেজিস্ট্রেশনকৃত ইউজারের সংরক্ষিত তথ্যাবলী</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUserDetailsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {userDetailsLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">তথ্য লোড হচ্ছে...</p>
              </div>
            ) : userDetailsError ? (
              <div className="py-12 text-center space-y-3 bg-slate-950/50 border border-rose-900/50 rounded-2xl p-6">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs font-bold text-rose-300">{userDetailsError}</p>
                <button
                  type="button"
                  onClick={() => setIsUserDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            ) : selectedUserForDetails ? (
              <div className="space-y-5">
                {/* User Identity Header Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg">
                      {selectedUserForDetails.fullName ? selectedUserForDetails.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{selectedUserForDetails.fullName}</h4>
                      <p className="text-xs text-slate-400">আইডি: {selectedUserForDetails.id}</p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      selectedUserForDetails.status === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                        : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                    }`}
                  >
                    {selectedUserForDetails.status === 'active' ? 'সক্রিয় (Active)' : 'স্থগিত (Suspended)'}
                  </span>
                </div>

                {/* Profile Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">নাম</span>
                    <span className="font-bold text-white">{selectedUserForDetails.fullName || 'দেওয়া নেই'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">মোবাইল</span>
                    <span className="font-bold text-white font-mono">{selectedUserForDetails.phone || 'দেওয়া নেই'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">ইমেইল</span>
                    <span className="font-bold text-white break-all">{selectedUserForDetails.email || 'দেওয়া নেই'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">লিঙ্গ</span>
                    <span className="font-bold text-white">
                      {selectedUserForDetails.gender === 'female' ? 'নারী (Female)' : selectedUserForDetails.gender === 'male' ? 'পুরুষ (Male)' : 'অন্যান্য'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">জন্ম তারিখ</span>
                    <span className="font-bold text-white">
                      {selectedUserForDetails.dateOfBirth ? (
                        new Date(selectedUserForDetails.dateOfBirth).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
                      ) : selectedUserForDetails.age ? (
                        `${toBnNumber(selectedUserForDetails.age)} বছর (আনুমানিক)`
                      ) : 'দেওয়া নেই'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">বৈবাহিক অবস্থা</span>
                    <span className="font-bold text-white">
                      {selectedUserForDetails.maritalStatus === 'single' ? 'অবিবাহিত (Single)' : selectedUserForDetails.maritalStatus === 'married' ? 'বিবাহিত (Married)' : selectedUserForDetails.maritalStatus || 'দেওয়া নেই'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">জেলা</span>
                    <span className="font-bold text-white">
                      {(() => {
                        const dist = BANGLADESH_DISTRICTS.find(d => d.district === selectedUserForDetails.district || d.districtBn === selectedUserForDetails.district);
                        return dist ? dist.districtBn : selectedUserForDetails.district || 'দেওয়া নেই';
                      })()}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">উপজেলা</span>
                    <span className="font-bold text-white">
                      {selectedUserForDetails.upazila || 'দেওয়া নেই'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 sm:col-span-2">
                    <span className="text-slate-500 text-[11px] block mb-0.5">পূর্ণ ঠিকানা</span>
                    <span className="font-bold text-white break-words">
                      {selectedUserForDetails.address || 'ঠিকানা দেওয়া হয়নি'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">ভেরিফিকেশন</span>
                    <span className="font-bold text-emerald-400">
                      {selectedUserForDetails.isVerified ? 'ভেরিফাইড (Verified)' : 'আনভেরিফাইড'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-slate-500 text-[11px] block mb-0.5">অ্যাকাউন্ট তৈরি</span>
                    <span className="font-bold text-white">
                      {selectedUserForDetails.createdAt ? new Date(selectedUserForDetails.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : 'দেওয়া নেই'}
                    </span>
                  </div>
                </div>

                {/* Activity Stats Summary */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-amber-400">সালাত ও টোকেন রেকর্ড</h5>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">মোট সালাত</span>
                      <span className="font-bold text-emerald-400">{toBnNumber(selectedUserForDetails.totalPrayers || 0)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">ব্যবহারযোগ্য টোকেন</span>
                      <span className="font-bold text-amber-400">{toBnNumber(selectedUserForDetails.availableTokens || 0)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">রিডিমকৃত টোকেন</span>
                      <span className="font-bold text-teal-300">{toBnNumber(selectedUserForDetails.redeemedTokens || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Bar inside Modal */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoading === `user-status-${selectedUserForDetails.id}`}
                      onClick={async () => {
                        await handleToggleUserStatus(selectedUserForDetails);
                        handleOpenUserDetails(selectedUserForDetails.id);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        selectedUserForDetails.status === 'active'
                          ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                          : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                      }`}
                    >
                      {selectedUserForDetails.status === 'active' ? 'Account Suspend করুন' : 'Account Active করুন'}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading === `user-del-${selectedUserForDetails.id}`}
                      onClick={async () => {
                        await handleDeleteUser(selectedUserForDetails);
                        setIsUserDetailsModalOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ইউজার ডিলিট</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUserDetailsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX IMAGE VIEWER MODAL                               */}
      {/* ========================================================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{lightboxImage.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  title="Reset Zoom"
                >
                  100%
                </button>
                <a
                  href={lightboxImage.src}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxImage(null);
                    setLightboxZoom(1);
                  }}
                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex items-center justify-center flex-1 bg-black/40 min-h-[300px]">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.2s ease-out' }}
                className="max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* APPROVAL CONFIRMATION MODAL                               */}
      {/* ========================================================= */}
      {approvalModalOpen && approvalTargetVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Approve Merchant? ({approvalTargetVerification.shopName})</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to approve this Merchant?
            </p>
            <p className="text-xs text-slate-400">
              After approval, the Merchant will become an active Cave Companions Partner Merchant and can start receiving payments.
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={actionLoading === `approve-mch-${approvalTargetVerification.id}`}
                onClick={handleSubmitApproval}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading === `approve-mch-${approvalTargetVerification.id}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>APPROVE</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REQUEST CORRECTION MODAL                                  */}
      {/* ========================================================= */}
      {correctionModalOpen && correctionTargetVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span>Request Correction ({correctionTargetVerification.shopName})</span>
              </h3>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              যে যে তথ্য বা ডকুমেন্টে সংশোধন প্রয়োজন সেগুলো নির্বাচন করুন এবং বিস্তারিত মেসেজ লিখুন:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'nidFrontUrl', label: 'NID Front Image' },
                { id: 'nidBackUrl', label: 'NID Back Image' },
                { id: 'ownerSelfieUrl', label: 'Owner Selfie' },
                { id: 'tradeLicenseUrl', label: 'Trade License Image' },
                { id: 'shopPhotoUrl', label: 'Shop Photo' },
                { id: 'nidNumber', label: 'NID Number' },
                { id: 'tradeLicenseNumber', label: 'Trade License Number' },
                { id: 'shopAddress', label: 'Shop Address' }
              ].map((f, fIdx) => (
                <label key={`adv-cf-${f.id}-${fIdx}`} className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={correctionFields.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) setCorrectionFields([...correctionFields, f.id]);
                      else setCorrectionFields(correctionFields.filter((c) => c !== f.id));
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500"
                  />
                  <span className="text-slate-200 font-medium">{f.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                সংশোধনের বিবরণ / নির্দেশনা (Correction Message):
              </label>
              <textarea
                rows={4}
                value={correctionMessageText}
                onChange={(e) => setCorrectionMessageText(e.target.value)}
                placeholder="যেমন: আপনার এনআইডি পেছনের ছবি স্পষ্ট নয়, নতুন ছবি আপলোড করুন।"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionLoading === `corr-mch-${correctionTargetVerification.id}`}
                onClick={handleSubmitCorrection}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading === `corr-mch-${correctionTargetVerification.id}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>সংশোধন অনুরোধ পাঠান</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT MERCHANT MODAL                                     */}
      {/* ========================================================= */}
      {rejectionModalOpen && rejectionTargetVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <X className="w-5 h-5 text-rose-400" />
                <span>Reject Application ({rejectionTargetVerification.shopName})</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              আবেদন বাতিলের সুনির্দিষ্ট কারণ উল্লেখ করুন (এই তথ্য মার্চেন্ট তার পোর্টালে দেখতে পাবেন):
            </p>

            <div>
              <textarea
                rows={4}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="যেমন: প্রদত্ত ট্রেড লাইসেন্স ও এনআইডি তথ্য সঠিক নয়।"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionLoading === `reject-mch-${rejectionTargetVerification.id}`}
                onClick={handleSubmitRejection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading === `reject-mch-${rejectionTargetVerification.id}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>আবেদন বাতিল নিশ্চিত করুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLEAR SUPPORT TICKETS HISTORY MODAL                       */}
      {/* ========================================================= */}
      {isClearTicketsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-bold text-white">সাপোর্ট টিকেট ইতিহাস মুছুন</h3>
                </div>
                <button
                  onClick={() => setIsClearTicketsModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  আপনি কি সাপোর্ট টিকিটের ইতিহাস স্থায়ীভাবে মুছে ফেলতে চান? মুছে ফেলার ধরণ বেছে নিন:
                </p>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="clearFilter"
                      value="ALL"
                      checked={clearTicketsFilter === 'ALL'}
                      onChange={() => setClearTicketsFilter('ALL')}
                      className="accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">সকল টিকেট মুছে ফেলুন</span>
                      <span className="text-[11px] text-slate-400">ওপেন, ইন-প্রোগ্রেস ও সমাধানকৃত সকল টিকেট মুছে যাবে</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="clearFilter"
                      value="RESOLVED"
                      checked={clearTicketsFilter === 'RESOLVED'}
                      onChange={() => setClearTicketsFilter('RESOLVED')}
                      className="accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">শুধুমাত্র সমাধানকৃত (RESOLVED) টিকেট</span>
                      <span className="text-[11px] text-slate-400">যেসব টিকেটের উত্তর বা সমাধান সম্পন্ন হয়েছে</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="clearFilter"
                      value="CLOSED"
                      checked={clearTicketsFilter === 'CLOSED'}
                      onChange={() => setClearTicketsFilter('CLOSED')}
                      className="accent-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">শুধুমাত্র বন্ধকৃত (CLOSED) টিকেট</span>
                      <span className="text-[11px] text-slate-400">যেসব টিকেট ক্লোজ করে দেওয়া হয়েছে</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClearTicketsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleClearTicketsHistory}
                  disabled={actionLoading === 'clear-tickets'}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{actionLoading === 'clear-tickets' ? 'মুছে ফেলা হচ্ছে...' : 'স্থায়ীভাবে মুছে ফেলুন'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

        </main>

        {/* Console Bottom Footer matching screenshot */}
        <footer className="h-10 px-6 bg-[#080d1a] border-t border-[#151f32] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>Cave Companions • Super Admin Console v2.0.0</div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium text-slate-400">সকল কার্যক্রম নিরাপদ ও বিশুদ্ধ</span>
          </div>
        </footer>
      </div>

      {/* ========================================================= */}
      {/* DELETE MERCHANT MODAL                                     */}
      {/* ========================================================= */}
      {deleteShopModalOpen && shopToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="font-black text-white text-xl">
              Delete Partner Shop?
            </h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete <strong>{shopToDelete.shopName}</strong>? 
              <br/><br/>
              This action <strong>cannot be undone</strong>. All records associated with this partner shop will be permanently removed from the system.
            </p>
            
            <div className="flex flex-col gap-2 pt-4">
              <button
                type="button"
                disabled={actionLoading === `delete-shop-${shopToDelete.id}`}
                onClick={() => handleDeleteMerchantRecord(shopToDelete.id)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                {actionLoading === `delete-shop-${shopToDelete.id}` ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>DELETE PERMANENTLY (স্থায়ীভাবে মুছে ফেলুন)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDeleteShopModalOpen(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all"
              >
                Cancel (বাতিল)
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  Power,
  UserCheck,
  UserX,
  DollarSign,
  TrendingUp,
  Filter,
  Trash2,
  Eye,
  X,
  ExternalLink,
  FileText,
  Star,
  Copy,
  Check,
  Calendar,
  Navigation,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { toBnNumber } from '../data/prayerConfig';

interface AdminRiderManagementViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const AdminRiderManagementView: React.FC<AdminRiderManagementViewProps> = ({
  onShowToast
}) => {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal states
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const toast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    if (onShowToast) {
      onShowToast(type, title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  }, [onShowToast]);

  const loadRiders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminRiders(
        statusFilter === 'ALL' ? undefined : { approvalStatus: statusFilter }
      );
      if (res.success) {
        setRiders(res.riders || []);
        // If modal is open, keep selected rider updated
        if (selectedRider) {
          const updated = (res.riders || []).find((r: any) => r.id === selectedRider.id);
          if (updated) setSelectedRider(updated);
        }
      }
    } catch (err: any) {
      console.error('[AdminRiderManagementView] Error loading riders:', err);
      toast('error', 'লোড ত্রুটি', err.message || 'রাইডার তালিকা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast, selectedRider]);

  useEffect(() => {
    loadRiders();
  }, [statusFilter]);

  const getRiderUniqueId = (rider: any): string => {
    if (!rider?.id) return '#RD-0000';
    const clean = rider.id.replace(/^(RDR-|rdr-)/i, '').replace(/[^a-zA-Z0-9]/g, '');
    return `#RD-${(clean.length >= 6 ? clean.substring(0, 6) : clean.padEnd(6, '0')).toUpperCase()}`;
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast('info', 'কপি হয়েছে', `আইডি ${text} ক্লিপবোর্ডে কপি করা হয়েছে`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (riderId: string) => {
    try {
      setActionLoadingId(riderId);
      const res = await api.approveRider(riderId);
      if (res.success) {
        toast('success', 'অনুমোদিত', 'রাইডার আবেদন সফলভাবে অনুমোদন করা হয়েছে।');
        loadRiders();
      }
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'অনুমোদন করা যায়নি।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (riderId: string) => {
    const reason = prompt('প্রত্যাখ্যানের কারণ লিখুন:') || 'কাগজপত্রে ত্রুটি';
    try {
      setActionLoadingId(riderId);
      const res = await api.rejectRider(riderId, reason);
      if (res.success) {
        toast('info', 'প্রত্যাখ্যাত', 'রাইডার আবেদনটি প্রত্যাখ্যান করা হয়েছে।');
        loadRiders();
      }
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'প্রত্যাখ্যান করা যায়নি।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspend = async (riderId: string) => {
    const reason = prompt('স্থগিতের কারণ লিখুন:') || 'নিয়ম লঙ্ঘন বা প্রশাসনিক সিদ্ধান্ত';
    try {
      setActionLoadingId(riderId);
      const res = await api.suspendRider(riderId, reason);
      if (res.success) {
        toast('info', 'স্থগিত', 'রাইডার আইডি সাময়িক স্থগিত করা হয়েছে।');
        loadRiders();
      }
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'স্থগিত করা যায়নি।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivate = async (riderId: string) => {
    try {
      setActionLoadingId(riderId);
      const res = await api.reactivateRider(riderId);
      if (res.success) {
        toast('success', 'পুনরায় সচল', 'রাইডার অ্যাকাউন্টটি পুনরায় সচল করা হয়েছে।');
        loadRiders();
      }
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'সচল করা যায়নি।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (riderId: string) => {
    try {
      setActionLoadingId(riderId);
      const res = await api.deleteRider(riderId);
      if (res.success) {
        toast('success', 'মুছে ফেলা হয়েছে', 'রাইডার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।');
        setShowDeleteConfirm(null);
        if (selectedRider?.id === riderId) {
          setSelectedRider(null);
        }
        loadRiders();
      }
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatBnDate = (isoStr?: string) => {
    if (!isoStr) return 'তথ্য নেই';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const filteredRiders = riders.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const uniqueId = getRiderUniqueId(r).toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      uniqueId.includes(q) ||
      r.serviceDistrict?.toLowerCase().includes(q) ||
      r.vehicleType?.toLowerCase().includes(q) ||
      r.nidNumber?.toLowerCase().includes(q)
    );
  });

  const pendingCount = riders.filter((r) => r.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>CC ডেলিভারি রাইডার পরিচালনা</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300">
                {toBnNumber(riders.length)} জন
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              সকল রাইডারের বিস্তারিত প্রোফাইল, তথ্য, কাজের রেকর্ড ও পরিচালনা
            </p>
          </div>
        </div>

        <button
          onClick={loadRiders}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'].map((st, idx) => (
            <button
              key={`${st}-${idx}`}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' && 'সব রাইডার'}
              {st === 'PENDING' && (
                <span className="flex items-center gap-1.5">
                  <span>পেন্ডিং</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      {toBnNumber(pendingCount)}
                    </span>
                  )}
                </span>
              )}
              {st === 'APPROVED' && 'অনুমোদিত'}
              {st === 'SUSPENDED' && 'স্থগিত'}
              {st === 'REJECTED' && 'বাতিল'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="নাম, আইডি, ফোন বা এনআইডি দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Rider List (Compact Cards) */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>রাইডার তথ্য লোড হচ্ছে...</span>
        </div>
      ) : filteredRiders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
          কোনো রাইডার পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRiders.map((r, rIdx) => {
            const uniqueId = getRiderUniqueId(r);
            return (
              <div
                key={`arm-rdr-${r.id || 'r'}-${rIdx}`}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all duration-200 shadow-sm"
              >
                {/* Compact Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Rider Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt={r.fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Bike className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    {/* Rider Name & Unique ID */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-white text-sm truncate">{r.fullName}</h4>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          r.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.approvalStatus === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : r.approvalStatus === 'SUSPENDED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.approvalStatus}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded text-[11px] font-bold border border-emerald-800/40">
                          {uniqueId}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate text-[11px] text-slate-300">{r.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Availability badge */}
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border ${
                    r.availabilityStatus === 'ONLINE' || r.status === 'AVAILABLE'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : r.status === 'BUSY'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      r.availabilityStatus === 'ONLINE' || r.status === 'AVAILABLE'
                        ? 'bg-emerald-400'
                        : r.status === 'BUSY'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-500'
                    }`} />
                    <span>{r.status === 'BUSY' ? 'BUSY' : (r.availabilityStatus || r.status || 'OFFLINE')}</span>
                  </span>
                </div>

                {/* Compact Mini Details Strip */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-[11px] text-slate-400">
                  <span className="truncate">
                    🚗 <strong className="text-slate-200 font-medium">{r.vehicleType || 'BICYCLE'}</strong>
                  </span>
                  <span>
                    ট্রিপ: <strong className="text-white font-bold">{toBnNumber(r.totalDeliveries || r.totalDeliveriesCount || 0)}</strong>
                  </span>
                  <span>
                    ব্যালেন্স: <strong className="text-emerald-400 font-bold">৳{toBnNumber(r.totalEarnings || r.balance || 0)}</strong>
                  </span>
                </div>

                {/* Compact Card Action: Details Button */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => setSelectedRider(r)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>বিস্তারিত দেখুন</span>
                  </button>

                  {r.phone && (
                    <a
                      href={`tel:${r.phone}`}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                      title="কল করুন"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPREHENSIVE RIDER DETAILS MODAL */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {selectedRider.photoUrl ? (
                    <img
                      src={selectedRider.photoUrl}
                      alt={selectedRider.fullName}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImage({ url: selectedRider.photoUrl, title: `${selectedRider.fullName} - প্রোফাইল ছবি` })}
                    />
                  ) : (
                    <Bike className="w-6 h-6 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-base sm:text-lg truncate">
                      {selectedRider.fullName}
                    </h3>
                    <button
                      onClick={() => handleCopyId(getRiderUniqueId(selectedRider))}
                      className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 rounded text-xs font-mono font-bold flex items-center space-x-1 hover:bg-emerald-900 transition-colors cursor-pointer"
                      title="কপি করুন"
                    >
                      <span>{getRiderUniqueId(selectedRider)}</span>
                      {copiedId === getRiderUniqueId(selectedRider) ? (
                        <Check className="w-3 h-3 text-emerald-300" />
                      ) : (
                        <Copy className="w-3 h-3 text-emerald-400/80" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    নিবন্ধন তারিখ: {formatBnDate(selectedRider.createdAt)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRider(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Status & Work Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">অ্যাকাউন্ট স্ট্যাটাস</span>
                  <p className={`font-bold mt-0.5 text-xs ${
                    selectedRider.approvalStatus === 'APPROVED' ? 'text-emerald-400' :
                    selectedRider.approvalStatus === 'PENDING' ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>
                    {selectedRider.approvalStatus}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">সম্পন্ন ট্রিপ</span>
                  <p className="text-white font-bold text-sm mt-0.5">
                    {toBnNumber(selectedRider.totalDeliveries || selectedRider.totalDeliveriesCount || 0)} টি
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">মোট আয় / ব্যালেন্স</span>
                  <p className="text-emerald-400 font-bold text-sm mt-0.5">
                    ৳{toBnNumber(selectedRider.totalEarnings || selectedRider.balance || 0)}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">রাইডার রেটিং</span>
                  <p className="text-amber-400 font-bold text-sm mt-0.5 flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{selectedRider.rating || '5.0'}</span>
                  </p>
                </div>
              </div>

              {/* Personal & Account Information */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center space-x-1.5 border-b border-slate-800 pb-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>নিবন্ধন ও যোগাযোগের তথ্য</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">রাইডার নাম</span>
                    <p className="font-semibold text-white mt-0.5">{selectedRider.fullName}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">ইউনিক রাইডার আইডি</span>
                    <p className="font-mono font-bold text-emerald-400 mt-0.5">{getRiderUniqueId(selectedRider)}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">প্রধান মোবাইল নম্বর</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="font-mono text-white">{selectedRider.phone}</span>
                      {selectedRider.phone && (
                        <a
                          href={`tel:${selectedRider.phone}`}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>কল দিন</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">জরুরী বিকল্প নম্বর</span>
                    <p className="font-mono text-slate-300 mt-0.5">
                      {selectedRider.emergencyPhone || 'দেওয়া হয়নি'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">জাতীয় পরিচয়পত্র (NID) নম্বর</span>
                    <p className="font-mono font-semibold text-white mt-0.5">
                      {selectedRider.nidNumber || 'তথ্য নেই'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">বাহনের ধরন ও প্লেট নম্বর</span>
                    <p className="font-semibold text-white mt-0.5">
                      {selectedRider.vehicleType || 'BICYCLE'} {selectedRider.vehiclePlate ? `(${selectedRider.vehiclePlate})` : ''}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">কাজের নির্ধারিত এলাকা</span>
                    <p className="text-slate-200 mt-0.5">
                      {[selectedRider.serviceThana, selectedRider.serviceDistrict].filter(Boolean).join(', ') || 'সমগ্র জেলা'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">অনুমোদনের তারিখ</span>
                    <p className="text-slate-200 mt-0.5">
                      {formatBnDate(selectedRider.approvedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents & Photos */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center space-x-1.5 border-b border-slate-800 pb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>নিবন্ধনকালে প্রদানকৃত ছবি ও ডকুমেন্টস</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Profile Photo */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">প্রোফাইল ছবি</span>
                    <div className="h-32 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                      {selectedRider.photoUrl ? (
                        <>
                          <img
                            src={selectedRider.photoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setPreviewImage({ url: selectedRider.photoUrl, title: `${selectedRider.fullName} - প্রোফাইল ছবি` })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>বড় করে দেখুন</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500">ছবি পাওয়া যায়নি</span>
                      )}
                    </div>
                  </div>

                  {/* NID Front Photo */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">NID সামনের পাতা</span>
                    <div className="h-32 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                      {selectedRider.nidFrontUrl ? (
                        <>
                          <img
                            src={selectedRider.nidFrontUrl}
                            alt="NID Front"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setPreviewImage({ url: selectedRider.nidFrontUrl, title: `${selectedRider.fullName} - NID Front` })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>বড় করে দেখুন</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500">NID ছবি নেই</span>
                      )}
                    </div>
                  </div>

                  {/* NID Back Photo */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">NID পেছনের পাতা</span>
                    <div className="h-32 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                      {selectedRider.nidBackUrl ? (
                        <>
                          <img
                            src={selectedRider.nidBackUrl}
                            alt="NID Back"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setPreviewImage({ url: selectedRider.nidBackUrl, title: `${selectedRider.fullName} - NID Back` })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>বড় করে দেখুন</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500">NID ছবি নেই</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Location / GPS Coordinates if available */}
              {selectedRider.currentLatitude && selectedRider.currentLongitude && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-slate-200 font-bold text-xs">সর্বশেষ লাইভ জিপিএস লোকেশন</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        অক্ষাংশ: {selectedRider.currentLatitude}, দ্রাঘিমাংশ: {selectedRider.currentLongitude}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedRider.currentLatitude},${selectedRider.currentLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center space-x-1 hover:bg-blue-600/30"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>ম্যাপে অবস্থান</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Delete Button */}
              {showDeleteConfirm === selectedRider.id ? (
                <div className="flex items-center space-x-2 bg-rose-950/80 border border-rose-800 p-1.5 rounded-xl">
                  <span className="text-[11px] text-rose-300 font-bold px-2">মুছে ফেলবেন নিশ্চিত?</span>
                  <button
                    onClick={() => handleDelete(selectedRider.id)}
                    disabled={actionLoadingId === selectedRider.id}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    হ্যাঁ, ডিলিট
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    না
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(selectedRider.id)}
                  className="px-3 py-2 bg-slate-800 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>রাইডার অ্যাকাউন্ট ডিলিট</span>
                </button>
              )}

              {/* Status Action Buttons */}
              <div className="flex items-center space-x-2 ml-auto">
                {selectedRider.approvalStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReject(selectedRider.id)}
                      disabled={actionLoadingId === selectedRider.id}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-rose-300 rounded-xl font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>প্রত্যাখ্যান</span>
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRider.id)}
                      disabled={actionLoadingId === selectedRider.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>অনুমোদন করুন</span>
                    </button>
                  </>
                )}

                {selectedRider.approvalStatus === 'APPROVED' && (
                  <button
                    onClick={() => handleSuspend(selectedRider.id)}
                    disabled={actionLoadingId === selectedRider.id}
                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>আইডি স্থগিত (Suspend) করুন</span>
                  </button>
                )}

                {selectedRider.approvalStatus === 'SUSPENDED' && (
                  <button
                    onClick={() => handleReactivate(selectedRider.id)}
                    disabled={actionLoadingId === selectedRider.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>পুনরায় সচল (Reactivate) করুন</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedRider(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE LIGHTBOX / PREVIEW */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-3xl w-full flex items-center justify-between text-white pb-3">
            <span className="font-bold text-sm">{previewImage.title}</span>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center">
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminRiderManagementView;


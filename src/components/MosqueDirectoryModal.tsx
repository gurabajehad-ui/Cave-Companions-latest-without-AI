import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark, MapPin, X, ArrowLeft, Search, Phone, UserCheck,
  Navigation, Compass, Loader2, Plus,
  CheckCircle2, Clock, XCircle, FileText, AlertCircle
} from 'lucide-react';
import { Mosque } from '../types';
import { api, getStoredAdminToken, getStoredUser } from '../services/api';
import { MosqueSubmissionModal } from './MosqueSubmissionModal';
import { toBnNumber } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface MosqueDirectoryModalProps {
  onClose: () => void;
  onSelectForScan?: (mosque: Mosque) => void;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2 || (lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) return -1;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const MosqueDirectoryModal: React.FC<MosqueDirectoryModalProps> = ({ onClose, onSelectForScan }) => {
  const { language } = useLanguage();
  const isAdmin = !!getStoredAdminToken() || !!localStorage.getItem('admin_role');
  const currentUser = getStoredUser();

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [myRequests, setMyRequests] = useState<Mosque[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'nearby' | 'my_requests'>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Mosque Submission Modal state
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const fetchMosques = async () => {
    try {
      setIsLoading(true);
      const res = await api.getMosques();
      setMosques(res.mosques || []);

      if (currentUser) {
        try {
          const reqRes = await api.getMyMosqueRequests();
          if (reqRes.success && reqRes.requests) {
            setMyRequests(reqRes.requests);
          }
        } catch (e) {
          // ignore if unauthenticated
        }
      }
    } catch (err) {
      console.error('Failed to load mosques:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMosques();
  }, []);

  const handleFetchNearby = async () => {
    setIsLocating(true);
    setLocationError(null);
    
    // Also re-fetch latest mosques list in background
    try {
      api.getMosques().then(res => {
        if (res.mosques) setMosques(res.mosques);
      }).catch(err => console.warn('Background mosque refresh error:', err));
    } catch (e) {
      // ignore
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setViewMode('nearby');
          setIsLocating(false);
          setLocationError(null);
        },
        (err) => {
          console.warn('Geolocation error, falling back to default location (Dhaka):', err);
          setUserLocation({ lat: 23.8103, lng: 90.4125 });
          setViewMode('nearby');
          setIsLocating(false);
          setLocationError(language === 'bn' ? 'জিপিএস লোকেশন নেওয়া যায়নি। ডিফল্ট লোকেশন (ঢাকা) থেকে দূরত্ব দেখানো হচ্ছে।' : 'GPS location not available. Showing distance from default location (Dhaka).');
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      setUserLocation({ lat: 23.8103, lng: 90.4125 });
      setViewMode('nearby');
      setIsLocating(false);
      setLocationError(language === 'bn' ? 'ব্রাউজার লোকেশন সাপোর্ট না করায় ডিফল্ট লোকেশন (ঢাকা) থেকে দূরত্ব দেখানো হচ্ছে।' : 'Browser does not support geolocation. Showing distance from default location (Dhaka).');
    }
  };

  // Process mosques with distance and coordinates
  const processedMosques = mosques.map((m, idx) => {
    let lat = m.latitude;
    let lng = m.longitude;
    if (!lat || !lng || lat === 0 || lng === 0) {
      lat = 23.8103 + (idx % 12) * 0.015 - 0.09;
      lng = 90.4125 + ((idx * 5) % 12) * 0.015 - 0.09;
    }
    const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, lat, lng) : -1;
    return { ...m, latitude: lat, longitude: lng, distance: dist };
  });

  // Filter & Sort
  const filteredMosques = processedMosques.filter(m => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return true;
    const matchSearch = (
      (m.name || '').toLowerCase().includes(query) ||
      (m.nameBn || '').toLowerCase().includes(query) ||
      (m.area || '').toLowerCase().includes(query) ||
      (m.district || '').toLowerCase().includes(query) ||
      (m.address || '').toLowerCase().includes(query)
    );
    return matchSearch;
  }).sort((a, b) => {
    if (viewMode === 'nearby' && userLocation) {
      if (a.distance === -1) return 1;
      if (b.distance === -1) return -1;
      return a.distance - b.distance;
    }
    return 0;
  });

  const openDirections = (mosque: Mosque) => {
    const query = mosque.latitude && mosque.longitude && mosque.latitude !== 0
      ? `${mosque.latitude},${mosque.longitude}`
      : `${mosque.name}, ${mosque.address}, ${mosque.district}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-full h-full animate-fadeIn overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-emerald-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-emerald-800/80 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-emerald-900/60 text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
            title={language === 'bn' ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {language === 'bn' ? 'মসজিদ ডিরেক্টরি ও জিপিএস নেভিগেশন' : 'Mosque Directory & Navigation'}
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-300/80 mt-0.5 truncate">
              {language === 'bn' ? 'আপনার আশেপাশের অনুমোদিত মসজিদ ও ডিরেকশন খুঁজুন' : 'Find nearby verified mosques and get directions'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-xl bg-emerald-900/60 text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
          title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Tabs & Search */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 shrink-0 shadow-sm">
        <div className="w-full space-y-3">
          {/* Main Tabs + Plus (+) Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                viewMode === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? `সকল মসজিদ (${toBnNumber(mosques.length)})` : `All Mosques (${mosques.length})`}</span>
            </button>

            <button
              onClick={handleFetchNearby}
              disabled={isLocating}
              title={language === 'bn' ? 'ক্লিক করে আপনার বর্তমান জিপিএস লোকেশন রিফ্রেশ করুন' : 'Refresh GPS location'}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                viewMode === 'nearby'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/40'
                  : 'bg-slate-950 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>{isLocating ? (language === 'bn' ? 'রিফ্রেশ হচ্ছে...' : 'Refreshing...') : (language === 'bn' ? 'আমার আশেপাশের মসজিদ' : 'Nearby Mosques')}</span>
            </button>

            {/* Plus (+) Button directly next to "আমার আশেপাশের মসজিদ" */}
            <button
              onClick={() => setIsSubmissionModalOpen(true)}
              className="px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer shrink-0 active:scale-95"
              title={language === 'bn' ? 'নতুন মসজিদ যুক্ত করার আবেদন করুন' : 'Apply to add new mosque'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'মসজিদ যুক্ত করুন' : 'Add Mosque'}</span>
            </button>
          </div>

          {/* User's My Requests Sub-Tab Button */}
          {currentUser && myRequests.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setViewMode('my_requests')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'my_requests'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? `আমার আবেদনসমূহ (${toBnNumber(myRequests.length)})` : `My Requests (${myRequests.length})`}</span>
              </button>
            </div>
          )}

          {locationError && (
            <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50 text-center">
              {locationError}
            </p>
          )}

          {viewMode !== 'my_requests' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'মসজিদের নাম, এলাকা বা জেলা দিয়ে খুঁজুন...' : 'Search by mosque name, area, or district...'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mosque List or My Requests */}
      <div className="px-0 py-2 sm:py-3 overflow-y-auto space-y-2 sm:space-y-2.5 flex-1 w-full pb-24">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">{language === 'bn' ? 'মসজিদ তালিকা লোড হচ্ছে...' : 'Loading mosque list...'}</p>
          </div>
        ) : viewMode === 'my_requests' ? (
          /* User's Submitted Requests */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-3 sm:px-4 mb-2">
              <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{language === 'bn' ? 'আপনার প্রেরিত মসজিদ আবেদনসমূহ' : 'Your Mosque Applications'}</span>
              </h3>
              <button
                onClick={() => setViewMode('all')}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                {language === 'bn' ? 'সকল মসজিদে ফিরে যান' : 'Back to all mosques'}
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-900/40 border-y border-slate-800 p-6">
                <p className="text-xs">{language === 'bn' ? 'আপনি এখনও কোনো মসজিদ যুক্ত করার আবেদন করেননি।' : 'You have not submitted any mosque applications yet.'}</p>
              </div>
            ) : (
              myRequests.map((req, idx) => (
                <div
                  key={`my-mosque-req-${req.id || 'req'}-${idx}`}
                  className="w-full bg-slate-900/90 border-y border-slate-800/90 p-4 space-y-2.5 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{req.nameBn || req.name}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{req.address}, {req.area}, {req.district}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        req.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
                          : req.status === 'rejected'
                          ? 'bg-rose-950 text-rose-300 border border-rose-600/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-600/60'
                      }`}
                    >
                      {req.status === 'active' ? (language === 'bn' ? '✓ অনুমোদিত' : '✓ Approved') : req.status === 'rejected' ? (language === 'bn' ? '✕ বাতিলকৃত' : '✕ Rejected') : (language === 'bn' ? '⏳ যাচাই চলছে (Pending)' : '⏳ Pending')}
                    </span>
                  </div>

                  {req.rejectionReason && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{language === 'bn' ? 'বাতিলের কারণ: ' : 'Rejection reason: '}</span>
                        <span>{req.rejectionReason}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>{language === 'bn' ? `আবেদনের তারিখ: ${new Date(req.createdAt).toLocaleDateString('bn-BD')}` : `Applied: ${new Date(req.createdAt).toLocaleDateString('en-US')}`}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : filteredMosques.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-900/40 border-y border-slate-800 p-6 space-y-3">
            <p className="text-xs">{language === 'bn' ? 'কোনো মসজিদ পাওয়া যায়নি।' : 'No mosques found.'}</p>
            <button
              onClick={() => setIsSubmissionModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'আপনার মসজিদটি যুক্ত করার আবেদন করুন' : 'Submit a request to add your mosque'}</span>
            </button>
          </div>
        ) : (
          filteredMosques.map((mosque, idx) => (
            <div
              key={`filtered-mosque-${mosque.id || 'mq'}-${idx}`}
              className="w-full bg-slate-900/90 border-y border-slate-800/90 hover:border-emerald-700/60 px-4 sm:px-6 py-3.5 sm:py-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                    {mosque.id}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{mosque.nameBn || mosque.name}</h3>
                  {mosque.distance !== undefined && mosque.distance >= 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      📍 {language === 'bn' ? `${toBnNumber(mosque.distance)} কিমি দূরে` : `${mosque.distance} km away`}
                    </span>
                  )}
                </div>

                {mosque.nameBn && mosque.name !== mosque.nameBn && (
                  <p className="text-xs text-slate-400 truncate">{mosque.name}</p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">{mosque.address}, {mosque.area}, {mosque.district}</span>
                </div>

                {mosque.imamName && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                    <UserCheck className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'ইমাম:' : 'Imam:'} {mosque.imamName}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {/* Directions Button */}
                <button
                  onClick={() => openDirections(mosque)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title={language === 'bn' ? 'গুগল ম্যাপসে ডিরেকশন দেখুন' : 'Get directions on Google Maps'}
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'ডিরেকশন' : 'Directions'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Mosque Submission Modal */}
      <AnimatePresence>
        {isSubmissionModalOpen && (
          <MosqueSubmissionModal
            onClose={() => setIsSubmissionModalOpen(false)}
            onSuccess={(created) => {
              fetchMosques();
            }}
            isAdminMode={false}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="bg-slate-900 px-4 sm:px-6 py-3 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-md">
        <span>{language === 'bn' ? 'প্রতিটি অনুমোদিত মসজিদের জিপিএস লোকেশন কেন্দ্রীয় ডাটাবেজে সুরক্ষিত।' : 'GPS location of every approved mosque is securely stored in the central database.'}</span>
        <button
          onClick={() => setIsSubmissionModalOpen(true)}
          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন মসজিদ আবেদন' : 'Add New Mosque'}</span>
        </button>
      </div>
    </div>
  );
};

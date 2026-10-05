import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  RotateCw,
  CheckCircle2,
  Compass,
  Sparkles
} from 'lucide-react';
import { PartnerShop } from '../types';
import { api } from '../services/api';
import { GoogleMapLocationPicker } from './GoogleMapLocationPicker';

interface MerchantLocationPickerModalProps {
  shop: PartnerShop;
  onClose: () => void;
  onSuccess: (updatedShop: PartnerShop) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

// Default fallback coordinates (Dhaka, Bangladesh)
const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

export const MerchantLocationPickerModal: React.FC<MerchantLocationPickerModalProps> = ({
  shop,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const initialLat = shop.latitude && shop.latitude !== 0 ? shop.latitude : DEFAULT_LAT;
  const initialLng = shop.longitude && shop.longitude !== 0 ? shop.longitude : DEFAULT_LNG;

  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [formattedAddress, setFormattedAddress] = useState<string>(
    shop.locationAddress || shop.address || ''
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Confirm and Save Location to DB
  const handleSaveLocation = async () => {
    try {
      setIsSaving(true);
      const res = await api.updateMerchantLocation({
        latitude: selectedLat,
        longitude: selectedLng,
        formattedAddress: formattedAddress.trim() || undefined,
        locationAddress: formattedAddress.trim() || undefined
      });

      if (res.success && res.shop) {
        onShowToast('success', 'লোকেশন সংরক্ষিত', 'দোকানের গুগল ম্যাপ লোকেশন ও ঠিকানা সফলভাবে সংরক্ষণ করা হয়েছে।');
        onSuccess(res.shop);
        onClose();
      } else {
        throw new Error(res.message || 'লোকেশন সংরক্ষণ করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      console.error('Failed to save shop location:', err);
      onShowToast('error', 'ত্রুটি', err.message || 'দোকানের লোকেশন সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              📍
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                দোকানের ম্যাপ লোকেশন
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  স্বয়ংক্রিয় ঠিকানা
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {shop.nameBn || shop.name} • ম্যাপে পিন ড্র্যাগ করুন বা সার্চ করুন — সম্পূর্ণ ঠিকানা স্বয়ংক্রিয়ভাবে পূরণ হবে
              </p>
            </div>
          </div>

          <button
            id="close-location-picker-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Google Map Location Picker */}
          <GoogleMapLocationPicker
            initialLat={selectedLat}
            initialLng={selectedLng}
            initialAddress={formattedAddress}
            onLocationSelect={(data) => {
              setSelectedLat(data.lat);
              setSelectedLng(data.lng);
              if (data.address) {
                setFormattedAddress(data.address);
              }
            }}
            onShowToast={onShowToast}
            height="320px"
          />

          {/* Selected Location Summary Panel */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                নির্বাচিত কোঅর্ডিনেট:
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-emerald-400 border border-slate-800">
                  Lat: {selectedLat.toFixed(6)}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-teal-400 border border-slate-800">
                  Lng: {selectedLng.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Formatted Address Field with Auto-sync indicator */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <label className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                সম্পূর্ণ ঠিকানা (ম্যাপ থেকে স্বয়ংক্রিয়ভাবে আপডেট হওয়া):
              </label>
              <textarea
                rows={2}
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                placeholder="দোকানের বিস্তারিত ঠিকানা বা ল্যান্ডমার্ক..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            বাতিল
          </button>

          <button
            id="confirm-save-location-btn"
            type="button"
            onClick={handleSaveLocation}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>লোকেশন নিশ্চিত ও সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

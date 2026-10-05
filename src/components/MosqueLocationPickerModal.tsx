import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  X,
  AlertCircle,
  Compass,
  RotateCw,
  Loader2
} from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';
import { searchBDLocations, reverseGeocodeBD, LocationSearchResult, POPULAR_BD_LANDMARKS } from '../utils/bdLocationSearch';
import { getCurrentCoordinates } from '../utils/geolocationHelper';

interface MosqueLocationPickerModalProps {
  initialLat: number; initialLng: number; address: string;
  onClose: () => void;
  onSuccess: (lat: number, lng: number, address: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

// Default fallback coordinates (Dhaka, Bangladesh)
const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

export const MosqueLocationPickerModal: React.FC<MosqueLocationPickerModalProps> = ({
  initialLat, initialLng, address,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initLat = initialLat !== 0 ? initialLat : DEFAULT_LAT;
  const initLng = initialLng !== 0 ? initialLng : DEFAULT_LNG;

  const [selectedLat, setSelectedLat] = useState<number>(initLat);
  const [selectedLng, setSelectedLng] = useState<number>(initLng);
  const [formattedAddress, setFormattedAddress] = useState<string>(address || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  // Custom modern Mosque Pin Icon using Leaflet DivIcon
  const createMosqueIcon = () => {
    return L.divIcon({
      className: 'custom-mosque-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(16, 185, 129, 0.3); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 38px; height: 38px; background: linear-gradient(135deg, #059669, #0d9488); border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
            🕌
          </div>
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #059669;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -44]
    });
  };

  // Reverse geocoding helper
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const addr = await reverseGeocodeBD(lat, lng, language);
      if (addr) setFormattedAddress(addr);
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: (initialLat && initialLat !== 0) ? 16 : 13,
          zoomControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Clean OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const marker = L.marker([initLat, initLng], {
          icon: createMosqueIcon(),
          draggable: true
        }).addTo(map);

        const popupText = language === 'bn' ? '<b>মসজিদ</b><br/>মসজিদের অবস্থান' : '<b>Mosque</b><br/>Mosque Location';
        marker.bindPopup(popupText).openPopup();

        // Drag event
        marker.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          setSelectedLat(position.lat);
          setSelectedLng(position.lng);
          fetchAddressFromCoords(position.lat, position.lng);
        });

        // Click on map to reposition marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedLat(lat);
          setSelectedLng(lng);
          fetchAddressFromCoords(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 300);
      }
    } catch (err) {
      console.error('Leaflet initialization failed:', err);
      onShowToast(
        'error',
        language === 'bn' ? 'ম্যাপ ত্রুটি' : 'Map Error',
        language === 'bn' ? 'ম্যাপ লোড করতে সমস্যা হয়েছে।' : 'Failed to load map.'
      );
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Debounced live autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchBDLocations(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.warn('Mosque search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update marker position programmatically
  const updateMapPosition = (lat: number, lng: number, zoom = 16, autoAddress = true) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom);
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.openPopup();
    }

    if (autoAddress) {
      fetchAddressFromCoords(lat, lng);
    }
  };

  // Use Current Device GPS Location with auto-fallback
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setHasPermissionError(false);

    try {
      const geo = await getCurrentCoordinates();
      if (geo.success && geo.latitude && geo.longitude) {
        updateMapPosition(geo.latitude, geo.longitude, 17, true);
        onShowToast(
          'success',
          language === 'bn' ? 'বর্তমান লোকেশন চিহ্নিত' : 'Current Location Marked',
          language === 'bn' ? 'আপনার ডিভাইসের অবস্থান ম্যাপে পিন করা হয়েছে।' : 'Location pinned.'
        );
      } else {
        setHasPermissionError(geo.errorCode === 'PERMISSION_DENIED');
        onShowToast(
          geo.errorCode === 'PERMISSION_DENIED' ? 'warning' : 'info',
          language === 'bn' ? 'লোকেশন তথ্য' : 'Location Notice',
          geo.error || (language === 'bn' ? 'ম্যাপে ক্লিক করে বা ঠিকানা অনুসন্ধান করে নির্বাচন করুন।' : 'Please click on the map to set location.')
        );
      }
    } catch (err) {
      setHasPermissionError(true);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectSearchResult = (res: LocationSearchResult) => {
    updateMapPosition(res.lat, res.lng, 17, false);
    setFormattedAddress(res.address || (res.nameBn || res.name));
    setSearchQuery(res.nameBn || res.name);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSaveLocation = () => {
    onSuccess(selectedLat, selectedLng, formattedAddress);
    onClose();
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
              🕌
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {language === 'bn' ? 'মসজিদের লোকেশন সেট করুন' : 'Set Mosque Location'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Google Maps Connected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'মসজিদ • ম্যাপে সঠিক স্থানটি পিন করুন' : 'Mosque • Pin exact location'}
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
          {/* Quick Location Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            {POPULAR_BD_LANDMARKS.slice(0, 6).map((landmark, idx) => (
              <button
                key={`mq-pop-${landmark.id}-${idx}`}
                type="button"
                onClick={() => handleSelectSearchResult(landmark)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 font-semibold shrink-0 transition text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>📍</span>
                <span>{landmark.nameBn || landmark.name}</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="location-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'bn' ? 'এলাকা, সড়ক বা ল্যান্ডমার্ক নাম দিয়ে টাইপ করুন (যেমন: আদমজী, মিরপুর)...' : 'Type place name...'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
                )}
              </div>

              <button
                id="use-current-location-btn"
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isLocating ? (language === 'bn' ? 'শনাক্ত হচ্ছে...' : 'Locating...') : (language === 'bn' ? 'বর্তমান লোকেশন ব্যবহার করুন' : 'Use Current Location')}</span>
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 p-2 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 shadow-2xl z-50 max-h-56 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-500 px-2 block">{language === 'bn' ? 'সাজেশন থেকে নির্বাচন করুন:' : 'Suggestions:'}</span>
                {searchResults.map((res, i) => (
                  <button
                    key={`mq-res-${res.id || i}-${i}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 text-xs text-slate-300 hover:text-white flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-xs">{res.nameBn || res.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{res.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasPermissionError && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'ডিভাইস লোকেশন পাওয়া যায়নি। আপনি নিচের ম্যাপে যে কোনো জায়গায় ক্লিক করে অথবা মার্কারটি টেনে সঠিক স্থান নির্ধারণ করতে পারেন।'
                  : 'Location permission denied.'}
              </span>
            </div>
          )}

          {/* Interactive Map Container */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[11px] text-slate-200 shadow-md flex items-center gap-1.5 pointer-events-none">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{language === 'bn' ? 'মার্কার টেনে সঠিক স্থানে রাখুন বা ম্যাপে ক্লিক করুন' : 'Drag marker or click map'}</span>
            </div>
          </div>

          {/* Selected Location Summary Panel */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'bn' ? 'নির্বাচিত কোঅর্ডিনেট:' : 'Selected Coordinates:'}
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

            {/* Formatted Address Field */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <label className="text-[11px] text-slate-400 block font-medium">
                {language === 'bn' ? 'মসজিদের ঠিকানা / ল্যান্ডমার্ক বিবরণ:' : 'Mosque Address / Landmark Description:'}
              </label>
              <input
                type="text"
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                placeholder={language === 'bn' ? 'মসজিদের বিস্তারিত ঠিকানা বা ল্যান্ডমার্ক...' : 'Detailed address...'}
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
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            id="confirm-save-location-btn"
            type="button"
            onClick={handleSaveLocation}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{language === 'bn' ? 'লোকেশন নিশ্চিত ও সংরক্ষণ করুন' : 'Confirm & Save Location'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

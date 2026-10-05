import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Navigation, Check, Search, Loader2, Compass, ExternalLink, Plus, Minus, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';
import { searchBDLocations, reverseGeocodeBD, LocationSearchResult, POPULAR_BD_LANDMARKS } from '../utils/bdLocationSearch';
import { api } from '../services/api';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A custom pulsing marker for user location
const pulseIcon = new L.DivIcon({
  html: `<div style="width: 26px; height: 26px; background-color: #10b981; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 14px rgba(16,185,129,0.7); animation: pulse 1.8s infinite; display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// A stylish motorcycle/rider icon for nearby online riders
const nearbyRiderIcon = new L.DivIcon({
  html: `<div style="width: 32px; height: 32px; background-color: #2563eb; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(37,99,235,0.5); display: flex; align-items: center; justify-content: center; color: white;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
      <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, addressDetails: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationPicker = ({
  position,
  setPosition,
  onPositionChange
}: {
  position: L.LatLng | null;
  setPosition: (pos: L.LatLng) => void;
  onPositionChange?: (pos: L.LatLng) => void;
}) => {
  useMapEvents({
    click(e: any) {
      setPosition(e.latlng);
      if (onPositionChange) onPositionChange(e.latlng);
    },
    dragend(e: any) {
      const center = e.target.getCenter();
      setPosition(center);
      if (onPositionChange) onPositionChange(center);
    }
  });

  return position ? (
    <>
      <Marker position={position} icon={pulseIcon} />
      {/* 20km coverage area circle */}
      <Circle
        center={position}
        radius={20000}
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 8'
        }}
      />
    </>
  ) : null;
};

const ChangeMapView = ({ center }: { center: L.LatLng | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom() || 15, 16), {
        animate: true,
        duration: 0.8
      });
    }
  }, [center?.lat, center?.lng, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

const MapControls = () => {
  const map = useMap();
  return (
    <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 shadow-md rounded-xl overflow-hidden border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-black transition cursor-pointer"
        title="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>
      <div className="h-px bg-slate-200" />
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-black transition cursor-pointer"
        title="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};

const RealNearbyRiders = ({
  center,
  onRidersLoaded
}: {
  center: L.LatLng | null;
  onRidersLoaded?: (riders: any[], count: number) => void;
}) => {
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => {
    if (!center) return;
    let isCancelled = false;

    const fetchRiders = async () => {
      try {
        const res = await api.checkRiderAvailability(center.lat, center.lng);
        if (!isCancelled && res.success) {
          setRiders(res.riders || []);
          if (onRidersLoaded) {
            onRidersLoaded(res.riders || [], res.count || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching nearby riders:", err);
      }
    };

    fetchRiders();
    const interval = setInterval(fetchRiders, 6000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [center?.lat, center?.lng]);

  return (
    <>
      {riders.map((r, idx) => {
        const lat = Number(r.currentLatitude);
        const lng = Number(r.currentLongitude);
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <Marker
            key={`real-rider-${r.id || 'r'}-${idx}`}
            position={[lat, lng]}
            icon={nearbyRiderIcon}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -10]}>
              <div className="text-center font-bold text-xs p-0.5">
                <p className="text-slate-900">{r.fullName || 'Active Rider'}</p>
                <p className="text-[10px] text-blue-600 font-semibold">{r.vehicleType || 'Motorcycle'} • ⭐ {r.rating || '4.9'}</p>
                <p className="text-[9px] text-slate-400">সক্রিয় রাইডার</p>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
};

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng
}) => {
  const { language } = useLanguage();
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null
  );
  const [addressDetails, setAddressDetails] = useState('');
  
  // Search and Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Rider Availability states
  const [nearbyRidersCount, setNearbyRidersCount] = useState<number>(0);
  const [hasCheckedRiders, setHasCheckedRiders] = useState<boolean>(false);

  // Default to Dhaka coordinates
  const defaultCenter = new L.LatLng(23.8103, 90.4125);

  useEffect(() => {
    if (isOpen && !position) {
      setIsLocating(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyDetectedPosition(pos.coords.latitude, pos.coords.longitude, undefined, true);
          },
          (err) => {
            console.warn('Initial GPS fetch failed:', err);
            tryIpLocationFallback();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        tryIpLocationFallback();
      }
    }
  }, [isOpen]);

  const handleRidersLoaded = (riders: any[], count: number) => {
    setNearbyRidersCount(count);
    setHasCheckedRiders(true);
  };

  // Real-time debounced autocomplete search handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const results = await searchBDLocations(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
        if (results.length === 0) {
          setSearchError(language === 'bn' ? 'কোনো লোকেশন পাওয়া যায়নি' : 'No locations found');
        } else {
          setSearchError(null);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchError(language === 'bn' ? 'সার্চ করতে সমস্যা হয়েছে' : 'Error searching location');
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  // Reverse Geocoding helper
  const fetchReverseGeocode = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocodeBD(lat, lng, language);
      if (address) {
        setAddressDetails(address);
      }
    } catch {
      // Non-blocking
    }
  };

  const handlePositionChange = (pos: L.LatLng) => {
    setPosition(pos);
    fetchReverseGeocode(pos.lat, pos.lng);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchBDLocations(searchQuery);
      setSearchResults(results);
      setShowDropdown(true);
      if (results.length > 0) {
        handleSelectResult(results[0]);
      } else {
        setSearchError(language === 'bn' ? 'কোনো লোকেশন পাওয়া যায়নি' : 'No locations found');
      }
    } catch (err) {
      console.error('Search submit error:', err);
      setSearchError(language === 'bn' ? 'সার্চ করতে সমস্যা হয়েছে' : 'Error searching location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (item: LocationSearchResult) => {
    const newPos = new L.LatLng(item.lat, item.lng);
    setPosition(newPos);
    setAddressDetails(item.address || (item.nameBn || item.name));
    setSearchResults([]);
    setShowDropdown(false);
    setSearchQuery(item.nameBn || item.name);
  };

  const applyDetectedPosition = async (lat: number, lng: number, sourceLabel?: string, isGpsAccurate: boolean = false) => {
    const newPos = new L.LatLng(lat, lng);
    setPosition(newPos);
    try {
      const addr = await reverseGeocodeBD(lat, lng, language);
      if (addr) {
        setAddressDetails(addr);
      }
    } catch {
      // Non-blocking
    }
    if (sourceLabel) {
      setSearchQuery(sourceLabel);
    }
    setIsLocating(false);
    if (isGpsAccurate) {
      setLocationStatusMsg({
        type: 'success',
        text: language === 'bn' ? '✓ জিপিএস (GPS) দ্বারা আপনার সঠিক অবস্থান চিহ্নিত হয়েছে' : '✓ Accurate GPS location pinned'
      });
    } else {
      setLocationStatusMsg({
        type: 'info',
        text: language === 'bn' ? '⚠️ আইপি ভিত্তিক আনুমানিক পিন। সঠিক পিনের জন্য ম্যাপে ট্যাপ বা সার্চ করুন।' : '⚠️ Approximate IP location. Tap map or search for exact pin.'
      });
    }
    setTimeout(() => setLocationStatusMsg(null), 4500);
  };

  const tryIpLocationFallback = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const label = data.city ? `${data.city}, ${data.country_name || 'Bangladesh'}` : undefined;
          await applyDetectedPosition(Number(data.latitude), Number(data.longitude), label, false);
          return;
        }
      }
    } catch {
      // Ignore
    }

    try {
      const res2 = await fetch('https://freeipapi.com/api/json');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.latitude && data2.longitude) {
          const label = data2.cityName ? `${data2.cityName}, Bangladesh` : undefined;
          await applyDetectedPosition(Number(data2.latitude), Number(data2.longitude), label, false);
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Default fallback to Dhaka coordinates if all fail
    await applyDetectedPosition(defaultCenter.lat, defaultCenter.lng, language === 'bn' ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh', false);
    setLocationStatusMsg({
      type: 'info',
      text: language === 'bn' ? 'জিপিএস না পাওয়ায় ডিফল্ট লোকেশন দেখানো হচ্ছে। সঠিক পিনের জন্য ম্যাপে ট্যাপ বা সার্চ করুন।' : 'Using default location. Tap map or search for exact pin.'
    });
    setTimeout(() => setLocationStatusMsg(null), 4500);
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setLocationStatusMsg({
      type: 'info',
      text: language === 'bn' ? 'আপনার জিপিএস (GPS) অবস্থান খোঁজা হচ্ছে...' : 'Locating your high-accuracy GPS position...'
    });

    if (!navigator.geolocation) {
      tryIpLocationFallback();
      return;
    }

    // Tier 1: High accuracy GPS with 12s timeout
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyDetectedPosition(pos.coords.latitude, pos.coords.longitude, undefined, true);
      },
      (err1) => {
        console.warn('High-accuracy GPS failed:', err1);
        if (err1.code === 1) {
          // Permission Denied
          setIsLocating(false);
          setLocationStatusMsg({
            type: 'error',
            text: language === 'bn' 
              ? '❌ ব্রাউজারে লোকেশন পারমিশন Blockড করা আছে। Settings থেকে Location Allow করুন অথবা ম্যাপে ট্যাপ করে সঠিক জায়গা চিহ্নিত করুন।' 
              : '❌ GPS permission denied. Please enable location or tap on the map.'
          });
          // Try IP fallback in background but keep error warning prominent
          setTimeout(() => tryIpLocationFallback(), 1500);
          return;
        }

        // Tier 2: Standard accuracy GPS (10s timeout)
        navigator.geolocation.getCurrentPosition(
          async (pos2) => {
            await applyDetectedPosition(pos2.coords.latitude, pos2.coords.longitude, undefined, true);
          },
          (err2) => {
            console.warn('Standard GPS failed, trying IP fallback:', err2);
            // Tier 3: IP Location fallback
            tryIpLocationFallback();
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const openGoogleMaps = () => {
    if (position) {
      const url = `https://www.google.com/maps?q=${position.lat},${position.lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white z-10 relative shadow-sm">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500 animate-bounce" />
              {language === 'bn' ? 'আপনার ডেলিভারি লোকেশন' : 'Your Delivery Location'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Location Chips */}
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200/80 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? (language === 'bn' ? 'শনাক্ত হচ্ছে...' : 'Locating...') : (language === 'bn' ? 'আমার অবস্থান' : 'My Location')}</span>
            </button>

            {POPULAR_BD_LANDMARKS.slice(0, 5).map((landmark, idx) => (
              <button
                key={`pop-${landmark.id}-${idx}`}
                type="button"
                onClick={() => handleSelectResult(landmark)}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 font-semibold shrink-0 transition text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>📍</span>
                <span>{landmark.nameBn || landmark.name}</span>
              </button>
            ))}
          </div>

          {/* Search Box Panel */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-white z-20 relative shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'কলেজ, এলাকা বা ল্যান্ডমার্ক নাম লিখুন (যেমন: আদমজী, মিরপুর)...' : 'Type college, area or landmark...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                    className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isSearching && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-emerald-500 animate-spin" />
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                {language === 'bn' ? 'খুঁজুন' : 'Search'}
              </button>
            </form>

            {/* Suggestions Dropdown Overlay */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{language === 'bn' ? 'ম্যাচিং লোকেশন সাজেশন' : 'Matching Suggestions'}</span>
                  <span>{searchResults.length} {language === 'bn' ? 'টি ফলাফল' : 'results'}</span>
                </div>
                {searchResults.map((item, idx) => (
                  <button
                    key={`srch-${item.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50/80 transition flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800 group-hover:text-emerald-800 truncate">
                          {item.nameBn || item.name}
                        </span>
                        {item.district && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                            {item.district}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.address}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchError && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1 px-1">
                ⚠️ {searchError}
              </p>
            )}

            {locationStatusMsg && (
              <div className={`mt-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fadeIn ${
                locationStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : locationStatusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {locationStatusMsg.type === 'info' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                {locationStatusMsg.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                {locationStatusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                <span>{locationStatusMsg.text}</span>
              </div>
            )}
          </div>

          {/* Map Area */}
          <div className="flex-1 min-h-[42vh] relative z-10">
            <MapContainer
              center={position || defaultCenter}
              zoom={16}
              zoomControl={false}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker
                position={position}
                setPosition={setPosition}
                onPositionChange={handlePositionChange}
              />
              <ChangeMapView center={position} />
              <MapControls />
              <RealNearbyRiders center={position || defaultCenter} onRidersLoaded={handleRidersLoaded} />
            </MapContainer>
            
            {/* Center Pin Indicator */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center -mt-6 z-[400]">
              <MapPin className="w-9 h-9 text-emerald-600 drop-shadow-lg animate-pulse" fill="white" />
            </div>

            {/* Rider Availability Status Banner */}
            {hasCheckedRiders && (
              <div className="absolute top-3 left-14 z-[400] max-w-[240px] sm:max-w-xs">
                {nearbyRidersCount === 0 ? (
                  <div className="px-3 py-1.5 bg-amber-500/95 text-white backdrop-blur-md rounded-xl shadow-lg flex items-center gap-1.5 text-[11px] font-black animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                    <span>{language === 'bn' ? 'দুঃখিত আমাদের সকল rider ব্যস্ত আছে' : 'All riders are currently busy'}</span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 bg-emerald-700/95 text-white backdrop-blur-md rounded-xl shadow-lg flex items-center gap-1.5 text-[11px] font-black animate-fadeIn">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                    <span>{language === 'bn' ? `২০ কিমি মধ্যে ${nearbyRidersCount} জন রাইডার সক্রিয়` : `${nearbyRidersCount} rider(s) active within 20km`}</span>
                  </div>
                )}
              </div>
            )}

            {/* Google Maps External Badge & Floating Controls */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 text-slate-700 hover:text-emerald-600 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                title={language === 'bn' ? 'গুগল ম্যাপে দেখুন' : 'Open in Google Maps'}
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                <span>Google Maps</span>
              </button>
            </div>

            {/* GPS My Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              title={language === 'bn' ? 'আমার বর্তমান লোকেশন' : 'My Current Location'}
              className="absolute bottom-4 right-4 z-[400] w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-700 hover:text-emerald-600 border border-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Compass className={`w-6 h-6 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* Bottom Confirmation Sheet */}
          <div className="bg-white px-5 pt-4 pb-6 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl -mt-4 relative space-y-3">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto"></div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'bn' ? 'ঠিকানার বিস্তারিত (বাসা/ফ্ল্যাট/রোড)' : 'Address Details (House/Flat/Road)'}</span>
              </label>
              <textarea
                rows={2}
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: বাসা নং ১২, রোড নং ৫, ধানমন্ডি' : 'e.g. House 12, Road 5, Dhanmondi'}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all resize-none text-slate-800"
              />
            </div>

            <button
              onClick={() => {
                if (position) {
                  onConfirm(position.lat, position.lng, addressDetails);
                }
              }}
              disabled={!position}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Check className="w-5 h-5" />
              {language === 'bn' ? 'লোকেশন নিশ্চিত করুন' : 'Confirm Location'}
            </button>
          </div>
        </motion.div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </AnimatePresence>
  );
};

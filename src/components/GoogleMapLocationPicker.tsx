import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  Crosshair,
  Loader2,
  Sparkles,
  Store,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Compass
} from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshGeo';
import { DISTRICT_COORDINATES } from '../services/prayerTimeService';
import { searchBDLocations, reverseGeocodeBD, LocationSearchResult } from '../utils/bdLocationSearch';
import { getCurrentCoordinates } from '../utils/geolocationHelper';
import { toBnNumber } from '../data/prayerConfig';

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  district?: string;
  upazilaThana?: string;
  postalCode?: string;
}

export interface GoogleMapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialDistrict?: string;
  initialUpazila?: string;
  onLocationSelect: (data: LocationData) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  height?: string;
  className?: string;
}

// Default fallback coordinates (Dhaka, Bangladesh)
const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

export const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  initialLat = DEFAULT_LAT,
  initialLng = DEFAULT_LNG,
  initialAddress = '',
  initialDistrict = '',
  initialUpazila = '',
  onLocationSelect,
  onShowToast,
  height = '320px',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initLat = initialLat && initialLat !== 0 ? initialLat : DEFAULT_LAT;
  const initLng = initialLng && initialLng !== 0 ? initialLng : DEFAULT_LNG;

  const [lat, setLat] = useState<number>(initLat);
  const [lng, setLng] = useState<number>(initLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [upazilaThana, setUpazilaThana] = useState<string>(initialUpazila);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

  // Custom Store Pin Marker Icon using Leaflet DivIcon
  const createStoreIcon = () => {
    return L.divIcon({
      className: 'custom-shop-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 36px; height: 36px; background: #059669; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          </div>
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #059669;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -44]
    });
  };

  // Perform reverse geocoding with OpenStreetMap Nominatim + Bangladesh BD Geo
  const performReverseGeocode = useCallback(
    async (targetLat: number, targetLng: number) => {
      setIsReverseGeocoding(true);
      try {
        const resolvedAddress = await reverseGeocodeBD(targetLat, targetLng, 'bn');
        setAddress(resolvedAddress);

        // Detect District and Upazila from address string
        let detectedDistrict = '';
        let detectedUpazila = '';

        if (resolvedAddress) {
          for (const d of BANGLADESH_DISTRICTS) {
            if (
              resolvedAddress.includes(d.districtBn) ||
              resolvedAddress.toLowerCase().includes(d.district.toLowerCase())
            ) {
              detectedDistrict = `${d.districtBn} (${d.district})`;
              if (d.upazilasBn) {
                for (let i = 0; i < d.upazilasBn.length; i++) {
                  const uBn = d.upazilasBn[i];
                  const uEn = d.upazilas[i];
                  if (
                    resolvedAddress.includes(uBn) ||
                    resolvedAddress.toLowerCase().includes(uEn.toLowerCase())
                  ) {
                    detectedUpazila = uBn;
                    break;
                  }
                }
              }
              if (!detectedUpazila && d.upazilas) {
                for (const u of d.upazilas) {
                  if (resolvedAddress.toLowerCase().includes(u.toLowerCase())) {
                    detectedUpazila = u;
                    break;
                  }
                }
              }
              break;
            }
          }
        }

        if (detectedDistrict) setDistrict(detectedDistrict);
        if (detectedUpazila) setUpazilaThana(detectedUpazila);

        onLocationSelect({
          lat: targetLat,
          lng: targetLng,
          address: resolvedAddress,
          district: detectedDistrict || undefined,
          upazilaThana: detectedUpazila || undefined
        });
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
        const fallbackAddress = `অক্ষাংশ: ${targetLat.toFixed(4)}, দ্রাঘিমাংশ: ${targetLng.toFixed(4)}`;
        setAddress(fallbackAddress);
        onLocationSelect({
          lat: targetLat,
          lng: targetLng,
          address: fallbackAddress
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onLocationSelect]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      icon: createStoreIcon(),
      draggable: true
    }).addTo(map);

    // Popup with guidance
    marker.bindPopup('<b>দোকানের অবস্থান</b><br/>পিন টেনে বা ম্যাপে ক্লিক করে অবস্থান পরিবর্তন করুন').openPopup();

    // When marker is dragged
    marker.on('dragend', (e: any) => {
      const position = e.target.getLatLng();
      setLat(position.lat);
      setLng(position.lng);
      performReverseGeocode(position.lat, position.lng);
    });

    // When map is clicked
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      setLat(clickLat);
      setLng(clickLng);
      performReverseGeocode(clickLat, clickLng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);

    // Trigger initial geocode if address is empty
    if (!initialAddress) {
      performReverseGeocode(lat, lng);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when district changes externally
  useEffect(() => {
    if (initialDistrict && DISTRICT_COORDINATES[initialDistrict]) {
      const coords = DISTRICT_COORDINATES[initialDistrict];
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 14);
        markerRef.current.setLatLng([coords.lat, coords.lng]);
        setLat(coords.lat);
        setLng(coords.lng);
        performReverseGeocode(coords.lat, coords.lng);
      }
    }
  }, [initialDistrict]);

  // Handle location search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchBDLocations(val);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  // Select a search result
  const handleSelectSearchResult = (result: LocationSearchResult) => {
    setSearchQuery(result.nameBn || result.name);
    setShowResults(false);
    setLat(result.lat);
    setLng(result.lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([result.lat, result.lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([result.lat, result.lng]);
    }

    if (result.address) {
      setAddress(result.address);
      if (result.district) setDistrict(result.district);
      if (result.area) setUpazilaThana(result.area);

      onLocationSelect({
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        district: result.district,
        upazilaThana: result.area
      });
    } else {
      performReverseGeocode(result.lat, result.lng);
    }
  };

  // Locate User GPS with auto-fallback
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const geo = await getCurrentCoordinates();
      if (geo.success && geo.latitude && geo.longitude) {
        const currentLat = geo.latitude;
        const currentLng = geo.longitude;
        setLat(currentLat);
        setLng(currentLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([currentLat, currentLng], 17, { duration: 1.2 });
          markerRef.current.setLatLng([currentLat, currentLng]);
        }

        performReverseGeocode(currentLat, currentLng);
        onShowToast?.('success', 'বর্তমান অবস্থান সনাক্ত হয়েছে', 'আপনার বর্তমান অবস্থান থেকে ঠিকানা স্বয়ংক্রিয়ভাবে পূরণ করা হয়েছে।');
      } else {
        onShowToast?.(
          geo.errorCode === 'PERMISSION_DENIED' ? 'warning' : 'info',
          'লোকেশন সংক্রান্ত তথ্য',
          geo.error || 'বর্তমান অবস্থান পাওয়া যায়নি। আপনি ম্যাপে সরাসরি ক্লিক করে বা সার্চ করে অবস্থান সেট করতে পারেন।'
        );
      }
    } catch (err) {
      onShowToast?.('info', 'লোকেশন তথ্য', 'ম্যাপে ক্লিক করে আপনার অবস্থান নির্বাচন করুন।');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar & Auto-Locate Button */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input
              id="shop-location-search-input"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="এলাকা বা ল্যান্ডমার্ক সার্চ করুন (যেমন: মিরপুর ১০, উত্তরা, ধানমন্ডি)..."
              className="w-full bg-emerald-950/60 border border-emerald-700/60 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-emerald-500/70 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
            )}
          </div>

          <button
            id="locate-me-btn"
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-3 sm:px-4 py-2 bg-emerald-700/90 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm border border-emerald-500/40"
            title="আমার বর্তমান অবস্থান সেট করুন"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">আমার অবস্থান</span>
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-emerald-600/50 rounded-xl shadow-2xl z-[1000] overflow-hidden max-h-56 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectSearchResult(result)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-950/80 border-b border-emerald-900/40 last:border-b-0 flex items-start gap-2.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {result.nameBn || result.name}
                  </div>
                  <div className="text-[11px] text-emerald-400/80 line-clamp-1">
                    {result.address}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-700/50 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

        {/* Status Badge overlay */}
        <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-2.5 py-1 text-[11px] font-medium text-emerald-200 flex items-center gap-1.5 shadow-md">
          <Store className="w-3.5 h-3.5 text-emerald-400" />
          <span>ম্যাপে পিন ড্র্যাগ করুন বা ক্লিক করে দোকানের অবস্থান সেট করুন</span>
        </div>

        {/* Reverse Geocoding Indicator */}
        {isReverseGeocoding && (
          <div className="absolute bottom-2 right-2 z-[400] bg-emerald-950/90 backdrop-blur-sm border border-emerald-500 text-emerald-200 rounded-lg px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 shadow-lg animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>ঠিকানা শনাক্ত হচ্ছে...</span>
          </div>
        )}
      </div>

      {/* Auto-detected Address & Coordinates Bar */}
      <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              শনাক্তকৃত স্বয়ংক্রিয় ঠিকানা (Auto-filled Address)
            </div>
            <div className="text-xs text-white font-medium truncate">
              {address || 'ম্যাপে স্থান নির্বাচন করুন...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-mono bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-700/50 shrink-0 self-start sm:self-auto">
          <span>{toBnNumber(lat.toFixed(5))}°N, {toBnNumber(lng.toFixed(5))}°E</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapLocationPicker;

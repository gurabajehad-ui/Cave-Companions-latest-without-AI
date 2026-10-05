import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  X,
  Phone,
  Clock,
  Store,
  Compass,
  AlertCircle,
  Share2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PartnerShop } from '../types';
import { toBnNumber } from '../data/prayerConfig';

interface ShopLocationModalProps {
  shop: PartnerShop;
  userCoords?: { lat: number; lng: number } | null;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const ShopLocationModal: React.FC<ShopLocationModalProps> = ({
  shop,
  userCoords,
  onClose,
  onShowToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [currentUserPos, setCurrentUserPos] = useState<{ lat: number; lng: number } | null>(
    userCoords || null
  );
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  const shopLat = typeof shop.latitude === 'number' ? shop.latitude : parseFloat((shop as any).latitude || (shop as any).lat || '0');
  const shopLng = typeof shop.longitude === 'number' ? shop.longitude : parseFloat((shop as any).longitude || (shop as any).lng || '0');
  const hasShopLocation = !!(shopLat && shopLng);

  // Compute live distance if user position is available
  const computedDistanceKm = React.useMemo(() => {
    if (shop.distanceKm !== undefined) return shop.distanceKm;
    if (currentUserPos && hasShopLocation) {
      const R = 6371;
      const dLat = (shopLat - currentUserPos.lat) * (Math.PI / 180);
      const dLon = (shopLng - currentUserPos.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(currentUserPos.lat * (Math.PI / 180)) * Math.cos(shopLat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    }
    return undefined;
  }, [shop.distanceKm, currentUserPos, hasShopLocation, shopLat, shopLng]);

  // Format distance helper
  const formattedDistance = (distKm: number | undefined) => {
    if (distKm === undefined || isNaN(distKm)) return null;
    if (distKm < 1) {
      const meters = Math.max(10, Math.round(distKm * 1000));
      return `${toBnNumber(meters)} মিটার দূরে`;
    }
    return `${toBnNumber(distKm.toFixed(1))} কিমি দূরে`;
  };

  // Custom modern Shop Pin Icon using Leaflet DivIcon
  const createShopIcon = () => {
    return L.divIcon({
      className: 'custom-shop-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 38px; height: 38px; background: linear-gradient(135deg, #059669, #0d9488); border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
            🏪
          </div>
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #059669;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -44]
    });
  };

  // User position icon
  const createUserIcon = () => {
    return L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
          <div style="position: relative; width: 18px; height: 18px; background: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [shopLat, shopLng],
        zoom: hasShopLocation ? 16 : 13,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      if (hasShopLocation) {
        const marker = L.marker([shopLat, shopLng], {
          icon: createShopIcon()
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <b style="font-size: 13px; color: #065f46;">${shop.nameBn || shop.name}</b><br/>
            <span>${shop.address || ''}, ${shop.area || ''}</span>
          </div>
        `).openPopup();
      }

      if (currentUserPos) {
        L.marker([currentUserPos.lat, currentUserPos.lng], {
          icon: createUserIcon()
        }).addTo(map).bindPopup('আপনার বর্তমান অবস্থান');

        if (hasShopLocation) {
          // Fit both points in view
          const bounds = L.latLngBounds([
            [shopLat, shopLng],
            [currentUserPos.lat, currentUserPos.lng]
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasShopLocation, shopLat, shopLng]);

  // Request user location if not present
  const handleRequestUserLocation = () => {
    if (!navigator.geolocation) {
      if (onShowToast) onShowToast('info', 'লোকেশন', 'আপনার ডিভাইস GPS লোকেশন সমর্থন করে না।');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentUserPos(coords);
        setIsLocatingUser(false);

        if (mapInstanceRef.current && hasShopLocation) {
          L.marker([coords.lat, coords.lng], {
            icon: createUserIcon()
          }).addTo(mapInstanceRef.current).bindPopup('আপনার বর্তমান অবস্থান');

          const bounds = L.latLngBounds([
            [shopLat, shopLng],
            [coords.lat, coords.lng]
          ]);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
        if (onShowToast) onShowToast('success', 'দূরত্ব সক্রিয়', 'আপনার অবস্থান থেকে দোকানের দূরত্ব দেখাচ্ছে।');
      },
      (err) => {
        console.warn('Location error:', err);
        setIsLocatingUser(false);
        if (onShowToast) onShowToast('info', 'লোকেশন', 'আপনার লোকেশন অ্যাক্সেস সম্ভব হয়নি।');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Google Maps Navigation URL (Turn-by-turn directions)
  const openGoogleMapsDirections = () => {
    if (!hasShopLocation) {
      // Fallback search with address
      const query = encodeURIComponent(`${shop.name} ${shop.address} ${shop.area} Bangladesh`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${shopLat},${shopLng}&destination_place_id=&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open in Google Maps directly
  const openGoogleMapsPin = () => {
    if (!hasShopLocation) {
      const query = encodeURIComponent(`${shop.name} ${shop.address} ${shop.area} Bangladesh`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = `https://www.google.com/maps?q=${shopLat},${shopLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">
              🏪
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {shop.nameBn || shop.name}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{shop.address}, {shop.area}</span>
              </p>
            </div>
          </div>

          <button
            id="close-shop-location-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Shop Quick Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30 text-[10px]">
                {shop.category.toUpperCase()}
              </span>
              {computedDistanceKm !== undefined && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center gap-1 shadow-xs">
                  <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{formattedDistance(computedDistanceKm)}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{shop.openingHours}</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{shop.phone}</span>
              </span>
            </div>
          </div>

          {!hasShopLocation && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                দোকানের সঠিক GPS পিন এখনো মার্চেন্ট কর্তৃক নির্ধারিত হয়নি। তবে আপনি গুগল ম্যাপে ঠিকানার মাধ্যমে অনুসন্ধান করতে পারেন।
              </span>
            </div>
          )}

          {/* Interactive Map */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Quick Map Controls Overlays */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              {!currentUserPos && (
                <button
                  type="button"
                  onClick={handleRequestUserLocation}
                  disabled={isLocatingUser}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Navigation className={`w-3 h-3 ${isLocatingUser ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>আমার দূরত্ব মাপুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Location Description & Coordinates */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                দোকানের অবস্থান বিবরণ:
              </span>
              {hasShopLocation && (
                <span className="font-mono text-[10px] text-slate-500">
                  {shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}
                </span>
              )}
            </div>
            <p className="text-slate-300 text-xs">
              {shop.locationAddress || `${shop.address}, ${shop.area}, ${shop.district}`}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            id="open-google-maps-btn"
            type="button"
            onClick={openGoogleMapsPin}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>গুগল ম্যাপে খুলুন</span>
          </button>

          <button
            id="get-directions-btn"
            type="button"
            onClick={openGoogleMapsDirections}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-white" />
            <span>দিকনির্দেশনা নিন (Directions)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

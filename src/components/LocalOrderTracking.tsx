import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  ChevronUp, 
  Navigation, 
  Package, 
  Phone, 
  Star, 
  ArrowLeft, 
  MoreHorizontal, 
  CheckCircle2, 
  Bike, 
  Store, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  Radio,
  RefreshCw
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { toBnNumber } from '../data/prayerConfig';

interface LocalOrderTrackingProps {
  order: Order;
  onClose: () => void;
}

// User Delivery Location Icon (Green Pin)
const createUserIcon = () => new L.DivIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="width: 38px; height: 38px; background-color: #10b981; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(16,185,129,0.55); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style="background-color: #059669; color: white; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 4px; margin-top: -4px; border: 1px solid white; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        আমার ঠিকানা
      </div>
    </div>
  `,
  className: '',
  iconSize: [38, 46],
  iconAnchor: [19, 23],
});

// Shop Location Icon (Amber Store)
const createShopIcon = (name?: string) => new L.DivIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="width: 36px; height: 36px; background-color: #f59e0b; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(245,158,11,0.5); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>
        </svg>
      </div>
      ${name ? `<div style="background-color: #d97706; color: white; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-top: -3px; border: 1px solid white; white-space: nowrap; max-width: 90px; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${name}</div>` : ''}
    </div>
  `,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 22],
});

// Nearby Active Riders Icon (Bicycle Icon with Blue Badge)
const createNearbyBicycleIcon = (label?: string) => new L.DivIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
      <div style="width: 36px; height: 36px; background-color: #2563eb; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.5); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
      <div style="background-color: #1e40af; color: white; font-size: 8.5px; font-weight: 800; padding: 1px 5px; border-radius: 4px; margin-top: -4px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.25); white-space: nowrap;">
        ${label || 'রাইডার'}
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 22],
});

// Assigned Rider Live Icon (Highlighted Emerald Green with Bicycle/Photo and Pulsing Radar Ripple)
const createAssignedRiderLiveIcon = (photoUrl?: string) => new L.DivIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 56px; height: 56px; background-color: rgba(16, 185, 129, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 44px; height: 44px; background-color: #059669; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 16px rgba(5,150,105,0.6); display: flex; align-items: center; justify-content: center; color: white; overflow: hidden; position: relative; z-index: 2;">
        ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<svg width=\\'22\\' height=\\'22\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2.3\\'><circle cx=\\'18.5\\' cy=\\'17.5\\' r=\\'3.5\\'/><circle cx=\\'5.5\\' cy=\\'17.5\\' r=\\'3.5\\'/><circle cx=\\'15\\' cy=\\'5\\' r=\\'1\\'/><path d=\\'M12 17.5V14l-3-3 4-3 2 3h2\\'/></svg>'" />` : `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        `}
      </div>
      <div style="background-color: #047857; color: white; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; margin-top: -6px; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap; z-index: 3;">
        🚴‍♂️ আপনার রাইডার
      </div>
    </div>
  `,
  className: '',
  iconSize: [48, 54],
  iconAnchor: [24, 27],
});

// Fit map to markers bounds
const MapBounds = ({ positions }: { positions: L.LatLngExpression[] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const valid = positions.filter(p => Array.isArray(p) && !isNaN(p[0] as number) && !isNaN(p[1] as number));
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      }
    }
  }, [positions, map]);
  return null;
};

export const LocalOrderTracking: React.FC<LocalOrderTrackingProps> = ({ order, onClose }) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [nearbyRiders, setNearbyRiders] = useState<any[]>(order.nearbyRiders || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userLat = Number(currentOrder.latitude || order.latitude || 23.8103);
  const userLng = Number(currentOrder.longitude || order.longitude || 90.4125);
  const userPos: L.LatLngTuple = [userLat, userLng];

  // Rider status
  const status = (currentOrder.riderStatus || currentOrder.status || 'PENDING').toUpperCase();
  const isAssigned = status !== 'PENDING' && status !== 'SEARCHING';

  // Rider live coordinates
  const riderInfo = currentOrder.riderInfo || currentOrder.rider || null;
  const riderLat = riderInfo?.currentLatitude ? Number(riderInfo.currentLatitude) : null;
  const riderLng = riderInfo?.currentLongitude ? Number(riderInfo.currentLongitude) : null;
  const riderPos: L.LatLngTuple | null = (riderLat && riderLng) ? [riderLat, riderLng] : null;

  // Extract unique shop locations
  const shops: { name: string; lat: number; lng: number }[] = [];
  if (currentOrder.items && currentOrder.items.length > 0) {
    for (const it of currentOrder.items) {
      const sLat = Number((it as any).shopLatitude || (currentOrder as any).shopLatitude);
      const sLng = Number((it as any).shopLongitude || (currentOrder as any).shopLongitude);
      const sName = (it as any).shopNameBn || (it as any).shopName || (currentOrder as any).shopName || (language === 'bn' ? 'দোকান' : 'Shop');
      if (sLat && sLng && !shops.some(s => Math.abs(s.lat - sLat) < 0.0001 && Math.abs(s.lng - sLng) < 0.0001)) {
        shops.push({ name: sName, lat: sLat, lng: sLng });
      }
    }
  }
  if (shops.length === 0 && (currentOrder as any).shopLatitude && (currentOrder as any).shopLongitude) {
    shops.push({
      name: (currentOrder as any).shopName || (language === 'bn' ? 'দোকান' : 'Shop'),
      lat: Number((currentOrder as any).shopLatitude),
      lng: Number((currentOrder as any).shopLongitude)
    });
  }

  // Polling order and rider details in real-time
  const fetchLatestOrder = async () => {
    try {
      const res = await api.getOrderDetail(order.id);
      if (res && res.success && res.order) {
        setCurrentOrder(res.order);
        if (res.order.nearbyRiders && Array.isArray(res.order.nearbyRiders)) {
          setNearbyRiders(res.order.nearbyRiders);
        }
      }
    } catch (err) {
      console.error('Error polling order details:', err);
    }
  };

  // Poll for nearby riders if in PENDING state
  const fetchNearbyRiders = async () => {
    if (isAssigned) return;
    try {
      const res = await api.checkRiderAvailability(userLat, userLng);
      if (res && res.success && Array.isArray(res.riders)) {
        setNearbyRiders(res.riders);
      }
    } catch (err) {
      console.error('Error fetching nearby riders:', err);
    }
  };

  const isTerminal = status === 'DELIVERED' || status === 'CANCELLED' || status === 'PARCEL_REJECTED';

  useEffect(() => {
    fetchLatestOrder();
    if (!isAssigned && !isTerminal) {
      fetchNearbyRiders();
    }

    if (isTerminal) return;

    // Adaptive live order tracking: pauses in background, polls every 7s when assigned or 6s when pending
    const pollOrder = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      fetchLatestOrder();
    };

    const pollInterval = isAssigned ? 7000 : 6000;
    const interval = setInterval(pollOrder, pollInterval);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestOrder();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [order.id, isAssigned, isTerminal]);

  // Periodic nearby riders refresh if still pending (with 15s battery-friendly interval)
  useEffect(() => {
    if (isAssigned || isTerminal) {
      setNearbyRiders([]);
      return;
    }

    const pollNearby = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      fetchNearbyRiders();
    };

    const riderInterval = setInterval(pollNearby, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNearbyRiders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(riderInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAssigned, isTerminal, userLat, userLng]);

  // Positions to fit in map
  const boundsPositions: L.LatLngExpression[] = [userPos];
  shops.forEach(s => boundsPositions.push([s.lat, s.lng]));
  
  if (isAssigned && riderPos) {
    // Only assigned rider
    boundsPositions.push(riderPos);
  } else if (!isAssigned && nearbyRiders.length > 0) {
    // Nearby riders before acceptance
    nearbyRiders.forEach(r => {
      if (r.currentLatitude && r.currentLongitude) {
        boundsPositions.push([Number(r.currentLatitude), Number(r.currentLongitude)]);
      }
    });
  }

  // Route Polyline calculation
  const routePoints: L.LatLngTuple[] = [];
  if (isAssigned && riderPos) {
    routePoints.push(riderPos);
    shops.forEach(s => routePoints.push([s.lat, s.lng]));
    routePoints.push(userPos);
  } else if (shops.length > 0) {
    shops.forEach(s => routePoints.push([s.lat, s.lng]));
    routePoints.push(userPos);
  }

  const getStatusBadge = () => {
    switch(status) {
      case 'PENDING':
      case 'SEARCHING':
        return {
          title: language === 'bn' ? 'আশেপাশের রাইডার খোঁজা হচ্ছে...' : 'Searching for nearby riders...',
          eta: language === 'bn' ? '১০-১৫ মিনিট' : '10-15 min',
          etaSub: language === 'bn' ? 'আনুমানিক ডেলিভারি সময়' : 'Estimated delivery time',
          color: 'amber'
        };
      case 'ACCEPTED':
        return {
          title: language === 'bn' ? 'রাইডার অর্ডার গ্রহণ করেছেন' : 'Rider Assigned & Heading to Shop',
          eta: language === 'bn' ? '১০-১৫ মিনিট' : '10-15 min',
          etaSub: language === 'bn' ? 'দোকানের দিকে রওনা হচ্ছেন' : 'Heading towards the shop',
          color: 'emerald'
        };
      case 'PICKING_UP':
      case 'PICKED_UP':
        return {
          title: language === 'bn' ? 'দোকান থেকে পণ্য সংগ্রহ করা হয়েছে' : 'Order Picked Up by Rider',
          eta: language === 'bn' ? '৫-১০ মিনিট' : '5-10 min',
          etaSub: language === 'bn' ? 'আপনার ঠিকানায় আসছেন' : 'Heading to your delivery address',
          color: 'blue'
        };
      case 'ON_THE_WAY':
        return {
          title: language === 'bn' ? 'রাইডার আপনার ঠিকানার কাছাকাছি' : 'Rider is on the way to you',
          eta: language === 'bn' ? '৩-৫ মিনিট' : '3-5 min',
          etaSub: language === 'bn' ? 'খুব শীঘ্রই পৌঁছাবেন' : 'Arriving very soon',
          color: 'emerald'
        };
      case 'DELIVERED':
      case 'DONE':
        return {
          title: language === 'bn' ? 'ডেলিভারি সম্পন্ন হয়েছে' : 'Order Delivered Successfully',
          eta: language === 'bn' ? '০ মিনিট' : '0 min',
          etaSub: language === 'bn' ? 'ধন্যবাদ আমাদের সাথে থাকার জন্য' : 'Thank you for shopping with us',
          color: 'emerald'
        };
      case 'PRODUCT_BACK':
      case 'CANCELLED':
      case 'REJECTED':
        return {
          title: language === 'bn' ? 'অর্ডার বাতিল বা ফেরত হয়েছে' : 'Order Returned / Cancelled',
          eta: '-',
          etaSub: language === 'bn' ? 'অর্ডার সমাপ্ত' : 'Order Closed',
          color: 'rose'
        };
      default:
        return {
          title: language === 'bn' ? 'প্রক্রিয়াধীন রয়েছে' : 'Order Processing',
          eta: language === 'bn' ? '১০-১৫ মিনিট' : '10-15 min',
          etaSub: language === 'bn' ? 'আনুমানিক সময়' : 'Estimated Time',
          color: 'blue'
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col overflow-hidden select-none">
      {/* Top Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe-top pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto max-w-lg mx-auto">
          <button
            onClick={onClose}
            className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:bg-white active:scale-95 transition-all border border-slate-100"
            title={language === 'bn' ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-100 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isAssigned ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className="text-xs font-black text-slate-800 tracking-tight">{statusInfo.title}</span>
          </div>

          <button 
            onClick={async () => {
              setIsRefreshing(true);
              await fetchLatestOrder();
              await fetchNearbyRiders();
              setIsRefreshing(false);
            }}
            className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:bg-white active:scale-95 transition-all border border-slate-100"
            title={language === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-100">
        <MapContainer
          center={userPos}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapBounds positions={boundsPositions} />
          
          {/* Active Route Line */}
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints}
              color="#2563eb"
              weight={4.5}
              opacity={0.85}
              dashArray="8, 8"
              lineCap="round"
            />
          )}
          
          {/* User Delivery Location Marker */}
          <Marker position={userPos} icon={createUserIcon()}>
            <Popup>
              <div className="text-xs font-sans">
                <p className="font-bold text-emerald-700">📍 {language === 'bn' ? 'আপনার ডেলিভারি ঠিকানা' : 'Delivery Address'}</p>
                <p className="text-slate-600 mt-0.5">{currentOrder.deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Shop Markers */}
          {shops.map((shop, idx) => (
            <Marker key={`lot-shop-${shop.name || 's'}-${idx}`} position={[shop.lat, shop.lng]} icon={createShopIcon(shop.name)}>
              <Popup>
                <div className="text-xs font-sans">
                  <p className="font-bold text-amber-700">🏪 {shop.name}</p>
                  <p className="text-slate-600 mt-0.5">{language === 'bn' ? 'এখান থেকে পণ্য সংগ্রহ করা হবে' : 'Product pickup shop'}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 1. NEARBY ACTIVE RIDERS BEFORE ACCEPTANCE (Bicycle Markers) */}
          {!isAssigned && nearbyRiders.map((rider, idx) => {
            const rLat = Number(rider.currentLatitude);
            const rLng = Number(rider.currentLongitude);
            if (isNaN(rLat) || isNaN(rLng)) return null;

            const vehicleLabel = rider.vehicleType === 'BICYCLE' ? (language === 'bn' ? 'বাইসাইকেল' : 'Bicycle') : (language === 'bn' ? 'বাইক' : 'Motorcycle');

            return (
              <Marker 
                key={`lot-nearby-rider-${rider.id || 'r'}-${idx}`} 
                position={[rLat, rLng]} 
                icon={createNearbyBicycleIcon(language === 'bn' ? 'বাইসাইকেল' : 'Rider')}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                  <div className="text-center font-sans">
                    <p className="font-bold text-blue-800 text-xs">🚲 {rider.fullName || (language === 'bn' ? 'অনলাইন রাইডার' : 'Online Rider')}</p>
                    <p className="text-[10px] text-slate-600">
                      {vehicleLabel} • {rider.distanceKm ? `${formatNum(rider.distanceKm)} ${language === 'bn' ? 'কিমি দূরে' : 'km away'}` : (language === 'bn' ? 'কাছাকাছি' : 'Nearby')}
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {/* 2. ONLY ASSIGNED RIDER'S LIVE LOCATION AFTER ACCEPTANCE */}
          {isAssigned && riderPos && (
            <Marker 
              position={riderPos} 
              icon={createAssignedRiderLiveIcon(riderInfo?.photoUrl)}
            >
              <Tooltip permanent direction="top" offset={[0, -24]} opacity={0.95}>
                <div className="text-center font-sans">
                  <p className="font-bold text-emerald-800 text-xs">🚴‍♂️ {riderInfo?.fullName || (language === 'bn' ? 'আপনার রাইডার' : 'Your Rider')}</p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    {language === 'bn' ? 'লাইভ লোকেশন' : 'Live Location'}
                  </p>
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
        
        {/* Recenter Button */}
        <button
          onClick={() => {
            // Target the center
            const mapEl = document.querySelector('.leaflet-container') as any;
            if (mapEl && (mapEl as any)._leaflet_map) {
              const map = (mapEl as any)._leaflet_map;
              if (boundsPositions.length > 0) {
                const bounds = L.latLngBounds(boundsPositions);
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
              }
            }
          }}
          className="absolute bottom-[230px] right-4 z-10 w-12 h-12 bg-white/95 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.18)] flex items-center justify-center text-slate-700 hover:text-emerald-600 active:scale-95 transition-all border border-slate-100"
          title={language === 'bn' ? 'ম্যাপ সেন্টারে আনুন' : 'Recenter map'}
        >
          <Navigation className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isSheetExpanded ? 0 : 'calc(100% - 210px)' }}
          transition={{ type: 'spring', bounce: 0.05, duration: 0.4 }}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.15)] z-30 flex flex-col border-t border-slate-100 max-w-lg mx-auto"
          style={{ maxHeight: '82vh' }}
        >
          {/* Drag Handle */}
          <div 
            className="w-full flex items-center justify-center pt-3 pb-2 cursor-pointer shrink-0"
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400 transition-colors"></div>
          </div>
          
          {/* ETA / Header Status */}
          <div 
            className="px-6 pb-4 border-b border-slate-100 shrink-0 cursor-pointer" 
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {statusInfo.eta}
                  </h2>
                  {isAssigned && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                      <Radio className="w-3 h-3 animate-pulse text-emerald-600" /> {language === 'bn' ? 'লাইভ ট্র্যাক' : 'Live'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                  {statusInfo.etaSub}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                <ChevronUp 
                  className="w-5 h-5 transition-transform duration-300" 
                  style={{ transform: isSheetExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} 
                />
              </div>
            </div>
          </div>

          {/* Scrollable Details */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 pb-8">
            
            {/* 2. RIDER PROFILE CARD WHEN ACCEPTED */}
            {isAssigned && riderInfo ? (
              <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-2xl border border-emerald-100/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                  {/* Rider Photo */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-emerald-800 font-black text-lg">
                      {riderInfo.photoUrl ? (
                        <img 
                          src={riderInfo.photoUrl} 
                          alt={riderInfo.fullName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Bike className="w-7 h-7 text-emerald-700" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-white flex items-center shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-slate-900 text-slate-900 mr-0.5" /> 
                      {formatNum(riderInfo.rating || '4.9')}
                    </div>
                  </div>

                  {/* Rider Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-slate-900 text-base truncate">
                        {riderInfo.fullName}
                      </h3>
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {language === 'bn' ? 'রাইডার' : 'Rider'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {riderInfo.vehicleType === 'BICYCLE' 
                          ? (language === 'bn' ? 'বাইসাইকেল ডেলিভারি' : 'Bicycle Delivery') 
                          : riderInfo.vehicleType === 'MOTORCYCLE' 
                          ? (language === 'bn' ? 'মোটরসাইকেল' : 'Motorcycle') 
                          : (riderInfo.vehicleType || (language === 'bn' ? 'বাইসাইকেল' : 'Bicycle'))}
                      </span>
                      {riderInfo.vehiclePlate && (
                        <span className="text-slate-400">• {riderInfo.vehiclePlate}</span>
                      )}
                    </p>

                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {language === 'bn' ? 'মোবাইল' : 'Phone'}: <span className="font-bold text-slate-800">{riderInfo.phone}</span>
                    </p>
                  </div>

                  {/* Call Rider Button */}
                  <a 
                    href={`tel:${riderInfo.phone}`} 
                    className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-600/20 transition-all shrink-0"
                    title={language === 'bn' ? 'রাইডারকে কল দিন' : 'Call Rider'}
                  >
                    <Phone className="w-5 h-5 fill-current" />
                  </a>
                </div>

                {/* Live Tracking Status Notice */}
                <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>{language === 'bn' ? 'ম্যাপে রাইডারের লাইভ অবস্থান প্রদর্শিত হচ্ছে' : 'Displaying live location on map'}</span>
                  </div>
                </div>
              </div>
            ) : !isAssigned ? (
              /* SEARCHING FOR RIDER STATE */
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-100/90 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 animate-pulse">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-amber-900 text-sm">
                    {language === 'bn' ? 'আশেপাশের রাইডারদের রিকোয়েস্ট পাঠানো হচ্ছে...' : 'Sending request to nearby riders...'}
                  </h3>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    {nearbyRiders.length > 0 
                      ? (language === 'bn' ? `ম্যাপে ${formatNum(nearbyRiders.length)} জন বাইসাইকেল রাইডার দৃশ্যমান` : `${nearbyRiders.length} riders visible on map`)
                      : (language === 'bn' ? 'রাইডার একসেপ্ট করলেই তার তথ্য দেখতে পাবেন' : 'Rider details will appear as soon as accepted')}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Delivery Verification Code OTP */}
            {currentOrder.deliveryOtp && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">
                      {language === 'bn' ? 'ডেলিভারি ভেরিফিকেশন কোড' : 'Delivery Verification OTP'}
                    </p>
                    <p className="text-[11px] text-blue-700">
                      {language === 'bn' ? 'পণ্য বুঝে নিয়ে রাইডারকে এই কোডটি দিন' : 'Give this code to rider upon delivery'}
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-blue-600 text-white font-black text-base rounded-xl tracking-widest shadow-xs">
                  {currentOrder.deliveryOtp}
                </div>
              </div>
            )}

            {/* Delivery Progress Timeline */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                {language === 'bn' ? 'ডেলিভারি অগ্রগতি' : 'Delivery Progress'}
              </h4>
              
              <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Step 1: Order Placed */}
                <div className="relative flex items-center gap-3">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{language === 'bn' ? 'অর্ডার গ্রহণ করা হয়েছে' : 'Order Placed'}</p>
                    <p className="text-[10px] text-slate-500">{new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Step 2: Rider Assigned */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-6 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${isAssigned ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isAssigned ? 'text-slate-800' : 'text-slate-400'}`}>
                      {isAssigned 
                        ? (language === 'bn' ? `রাইডার নির্ধারিত হয়েছে (${riderInfo?.fullName || 'রাইডার'})` : `Rider Assigned (${riderInfo?.fullName})`)
                        : (language === 'bn' ? 'রাইডার বরাদ্দ করা হচ্ছে...' : 'Assigning Rider...')}
                    </p>
                  </div>
                </div>

                {/* Step 3: Picked up */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-6 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${status === 'PICKED_UP' || status === 'ON_THE_WAY' || status === 'DELIVERED' || status === 'DONE' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${status === 'PICKED_UP' || status === 'ON_THE_WAY' || status === 'DELIVERED' || status === 'DONE' ? 'text-slate-800' : 'text-slate-400'}`}>
                      {language === 'bn' ? 'দোকান থেকে পণ্য সংগ্রহ' : 'Product Picked Up from Shop'}
                    </p>
                  </div>
                </div>

                {/* Step 4: Out for Delivery */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-6 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${status === 'ON_THE_WAY' || status === 'DELIVERED' || status === 'DONE' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${status === 'ON_THE_WAY' || status === 'DELIVERED' || status === 'DONE' ? 'text-slate-800' : 'text-slate-400'}`}>
                      {language === 'bn' ? 'আপনার ঠিকানায় ডেলিভারির জন্য রওনা' : 'Out for Delivery to Your Location'}
                    </p>
                  </div>
                </div>

                {/* Step 5: Delivered */}
                <div className="relative flex items-center gap-3">
                  <div className={`absolute -left-6 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${status === 'DELIVERED' || status === 'DONE' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${status === 'DELIVERED' || status === 'DONE' ? 'text-slate-800' : 'text-slate-400'}`}>
                      {language === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{language === 'bn' ? 'অর্ডার নম্বর' : 'Order #'}</span>
                <span className="font-bold text-slate-800">{currentOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{language === 'bn' ? 'পণ্য মূল্য' : 'Products Total'}</span>
                <span className="font-bold text-slate-800">৳{formatNum(currentOrder.productTotalPayable || currentOrder.totalProductPayable || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                <span className="font-bold text-slate-800">৳{formatNum(currentOrder.deliveryCharge || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-sm">
                <span className="font-bold text-slate-900">{language === 'bn' ? 'সর্বমোট প্রদেয় (ক্যাশ অন ডেলিভারি)' : 'Total (Cash on Delivery)'}</span>
                <span className="font-extrabold text-emerald-600">৳{formatNum(currentOrder.totalCodAmount || currentOrder.totalPayable || 0)}</span>
              </div>
            </div>

            {/* Delivery Address Box */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-slate-800">{language === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{currentOrder.deliveryAddress}</p>
              </div>
            </div>
            
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bike,
  Navigation,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  Package,
  User,
  ExternalLink,
  Power,
  Compass,
  FileText,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  ShoppingBag,
  XCircle,
  BatteryCharging,
  Zap,
  Upload,
  Camera,
  Trash2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  api,
  getStoredRiderToken,
  setStoredRiderToken,
  removeStoredRiderToken,
  getStoredRider
} from '../services/api';
import { toBnNumber } from '../data/prayerConfig';
import { RiderOrderDetailsModal } from './RiderOrderDetailsModal';
import { calculateDistanceMeters } from '../utils/antiSpoofing';

// Custom Leaflet Icons using inline SVG DivIcons to ensure reliable visual rendering
const shopIcon = new L.DivIcon({
  html: `<div style="width: 32px; height: 32px; background-color: white; border-radius: 50%; border: 3px solid #f59e0b; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const shopPickedIcon = new L.DivIcon({
  html: `<div style="width: 32px; height: 32px; background-color: #10b981; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const userIcon = new L.DivIcon({
  html: `<div style="width: 32px; height: 32px; background-color: #ef4444; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(239,68,68,0.4);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const riderIcon = new L.DivIcon({
  html: `<div style="width: 36px; height: 36px; background-color: white; border-radius: 50%; border: 3px solid #3b82f6; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59,130,246,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Fit map to markers bounds helper component
const MapBounds = ({ positions }: { positions: L.LatLngExpression[] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], animate: true });
    }
  }, [positions, map]);
  return null;
};

// Map Component for Step 1 (Shop Pickup) with Real Road Directions & Navigation
const Step1PickupMap: React.FC<{
  riderCoords: { lat: number; lng: number } | null;
  shops: any[];
}> = ({ riderCoords, shops }) => {
  const [routeCoords, setRouteCoords] = useState<L.LatLngExpression[]>([]);
  const [loading, setLoading] = useState(false);

  const riderPos: L.LatLngExpression | null = riderCoords 
    ? [riderCoords.lat, riderCoords.lng] 
    : null;

  const shopMarkers = shops
    .filter(s => s.shopLatitude && s.shopLongitude && Number(s.shopLatitude) !== 0)
    .map((s, idx) => ({
      id: s.shopId,
      name: s.shopName,
      pickedUp: s.shopPickedUp,
      position: [Number(s.shopLatitude), Number(s.shopLongitude)] as L.LatLngExpression,
      lat: Number(s.shopLatitude),
      lng: Number(s.shopLongitude)
    }));

  const boundsPositions: L.LatLngExpression[] = [];
  if (riderPos) boundsPositions.push(riderPos);
  shopMarkers.forEach(m => boundsPositions.push(m.position));

  useEffect(() => {
    if (boundsPositions.length < 2) return;
    
    // Construct coordinate sequence string: lng,lat;lng,lat...
    const coordsString = boundsPositions.map((pos, idx) => {
      if (Array.isArray(pos)) {
        return `${pos[1]},${pos[0]}`;
      } else {
        const p = pos as any;
        return `${p.lng || p[1]},${p.lat || p[0]}`;
      }
    }).join(';');

    setLoading(true);
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression);
          setRouteCoords(coords);
        } else {
          // Fallback to sequential straight lines
          const polylinePath: L.LatLngExpression[] = [];
          if (riderPos) polylinePath.push(riderPos);
          shopMarkers.forEach(m => polylinePath.push(m.position));
          setRouteCoords(polylinePath);
        }
      })
      .catch(err => {
        console.error('OSRM fetch error:', err);
        const polylinePath: L.LatLngExpression[] = [];
        if (riderPos) polylinePath.push(riderPos);
        shopMarkers.forEach(m => polylinePath.push(m.position));
        setRouteCoords(polylinePath);
      })
      .finally(() => setLoading(false));
  }, [riderCoords, shops]);

  if (boundsPositions.length === 0) {
    return null;
  }

  const defaultCenter = riderPos || shopMarkers[0].position;

  const dest = shopMarkers[0];
  const originStr = riderCoords ? `${riderCoords.lat},${riderCoords.lng}` : '';
  const waypoints = shopMarkers.slice(1).map((m, idx) => `${m.lat},${m.lng}`).join('|');
  const googleMapsUrl = waypoints
    ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${dest?.lat || 23.8103},${dest?.lng || 90.4125}&waypoints=${waypoints}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${dest?.lat || 23.8103},${dest?.lng || 90.4125}&travelmode=driving`;

  return (
    <div className="space-y-2 my-2">
      <div className="w-full h-[220px] rounded-xl overflow-hidden border border-slate-800 shadow-inner relative z-10">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; Voyager'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapBounds positions={boundsPositions} />
          
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              color="#f59e0b"
              weight={4}
              opacity={0.85}
            />
          )}

          {riderPos && (
            <Marker position={riderPos} icon={riderIcon} />
          )}

          {shopMarkers.map((m, mIdx) => (
            <Marker 
              key={`shop-marker-${m.id || 'm'}-${mIdx}`} 
              position={m.position} 
              icon={m.pickedUp ? shopPickedIcon : shopIcon} 
            />
          ))}
        </MapContainer>
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-md transition duration-150 relative z-20 cursor-pointer text-center"
      >
        <Navigation className="w-4 h-4 text-slate-950 animate-bounce" />
        <span>গুগল ম্যাপে শপ রোড ও ডিরেকশন চালু করুন (GPS Navigation)</span>
      </a>
    </div>
  );
};

// Map Component for Step 2 (Customer Delivery) with Real Road Directions & Navigation
const Step2DeliveryMap: React.FC<{
  riderCoords: { lat: number; lng: number } | null;
  customerLat: number;
  customerLng: number;
}> = ({ riderCoords, customerLat, customerLng }) => {
  const [routeCoords, setRouteCoords] = useState<L.LatLngExpression[]>([]);
  const [loading, setLoading] = useState(false);

  const riderPos: L.LatLngExpression | null = riderCoords 
    ? [riderCoords.lat, riderCoords.lng] 
    : null;

  const customerPos: L.LatLngExpression = [Number(customerLat || 23.8103), Number(customerLng || 90.4125)];

  const boundsPositions: L.LatLngExpression[] = [customerPos];
  if (riderPos) boundsPositions.push(riderPos);

  const defaultCenter = riderPos || customerPos;

  useEffect(() => {
    if (!riderPos) return;
    setLoading(true);
    fetch(`https://router.project-osrm.org/route/v1/driving/${riderCoords?.lng},${riderCoords?.lat};${customerLng},${customerLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression);
          setRouteCoords(coords);
        } else {
          setRouteCoords([riderPos, customerPos]);
        }
      })
      .catch(err => {
        console.error('OSRM fetch error:', err);
        setRouteCoords([riderPos, customerPos]);
      })
      .finally(() => setLoading(false));
  }, [riderCoords, customerLat, customerLng]);

  const originStr = riderCoords ? `${riderCoords.lat},${riderCoords.lng}` : '';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${customerLat},${customerLng}&travelmode=driving`;

  return (
    <div className="space-y-2 my-2">
      <div className="w-full h-[220px] rounded-xl overflow-hidden border border-slate-800 shadow-inner relative z-10">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; Voyager'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapBounds positions={boundsPositions} />
          
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              color="#10b981"
              weight={4}
              opacity={0.85}
            />
          )}

          {riderPos && (
            <Marker position={riderPos} icon={riderIcon} />
          )}

          <Marker position={customerPos} icon={userIcon} />
        </MapContainer>
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-md transition duration-150 relative z-20 cursor-pointer text-center"
      >
        <Navigation className="w-4 h-4 text-slate-950 animate-bounce" />
        <span>গুগল ম্যাপে কাস্টমার ডেলিভারি রোড ও ডিরেকশন চালু করুন (GPS Navigation)</span>
      </a>
    </div>
  );
};

interface RiderPortalViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onExitRider?: () => void;
}

export const RiderPortalView: React.FC<RiderPortalViewProps> = ({
  onShowToast,
  onExitRider
}) => {
  const [riderToken, setRiderToken] = useState<string | null>(getStoredRiderToken());
  const [rider, setRider] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Rider Password Recovery States
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotDevOtp, setForgotDevOtp] = useState<string | null>(null);

  const handleRiderForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      setForgotError('আপনার রাইডার মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.riderForgotPasswordRequest(forgotPhone.trim());
      if (res.success) {
        setForgotSuccess(res.message);
        if (res.devOtpCode) setForgotDevOtp(res.devOtpCode);
        setForgotStep(2);
      } else {
        setForgotError(res.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'ওটিপি অনুরোধ প্রক্রিয়াজাত করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRiderForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotError('৬ ডিজিটের ওটিপি কোড প্রদান করুন।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.riderForgotPasswordVerify(forgotPhone.trim(), forgotOtp.trim());
      if (res.success) {
        setForgotSuccess(res.message);
        setForgotStep(3);
      } else {
        setForgotError(res.message || 'ভেরিফিকেশন কোডটি সঠিক নয়।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'ওটিপি যাচাই করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRiderForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPin.trim() || !/^\d{4,6}$/.test(forgotNewPin.trim())) {
      setForgotError('নতুন পিন অবশ্যই ৪ থেকে ৬ ডিজিটের সংখ্যা হতে হবে।');
      return;
    }
    if (forgotConfirmPin && forgotNewPin.trim() !== forgotConfirmPin.trim()) {
      setForgotError('নতুন পিন এবং কনফার্ম পিন মিলছে না।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.riderForgotPasswordReset({
        identifier: forgotPhone.trim(),
        code: forgotOtp.trim(),
        newPin: forgotNewPin.trim(),
        confirmPin: forgotConfirmPin.trim()
      });
      if (res.success) {
        setForgotSuccess(res.message);
        if (onShowToast) onShowToast('success', 'পিন সফলভাবে পরিবর্তিত', res.message);
        setTimeout(() => {
          setAuthMode('login');
          setLoginPhone(forgotPhone.trim());
          setForgotStep(1);
          setForgotPhone('');
          setForgotOtp('');
          setForgotNewPin('');
          setForgotConfirmPin('');
          setForgotError(null);
          setForgotSuccess(null);
        }, 1500);
      } else {
        setForgotError(res.message || 'পিন পরিবর্তন করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'পিন রিসেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  // Registration states
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regNidNumber, setRegNidNumber] = useState('');
  const [regDrivingLicense, setRegDrivingLicense] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('BICYCLE');
  const [regVehiclePlate, setRegVehiclePlate] = useState('');
  const [regDistrict, setRegDistrict] = useState('Dhaka');
  const [regThana, setRegThana] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regProfilePhoto, setRegProfilePhoto] = useState('');
  const [regNidFrontPhoto, setRegNidFrontPhoto] = useState('');
  const [regNidBackPhoto, setRegNidBackPhoto] = useState('');
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const nidFrontPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const nidBackPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regPendingInfo, setRegPendingInfo] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profile' | 'nidFront' | 'nidBack') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'ফাইল সাইজ অনেক বড়', 'ছবি সর্বোচ্চ ৫ মেগাবাইটের মধ্যে হতে হবে।');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Data = evt.target?.result as string;
      if (field === 'profile') {
        setRegProfilePhoto(base64Data);
      } else if (field === 'nidFront') {
        setRegNidFrontPhoto(base64Data);
      } else if (field === 'nidBack') {
        setRegNidBackPhoto(base64Data);
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      toast('error', 'ফাইল পড়তে সমস্যা', 'ছবিটি আপলোড করা যায়নি। পুনরায় চেষ্টা করুন।');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'profile'>('active');
  const [availabilityStatus, setAvailabilityStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<any | null>(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);

  // OTP inputs for active order
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [pickupOtpInputs, setPickupOtpInputs] = useState<Record<string, string>>({});
  const [verifyingPickup, setVerifyingPickup] = useState(false);
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [deliveryOtpInputs, setDeliveryOtpInputs] = useState<Record<string, string>>({});
  const [verifyingDelivery, setVerifyingDelivery] = useState(false);
  const [rejectCodeInput, setRejectCodeInput] = useState('');
  const [requestingRejectCode, setRequestingRejectCode] = useState(false);
  const [verifyingReject, setVerifyingReject] = useState(false);

  // Live GPS tracking with Battery & Data Optimization
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [batterySaverActive, setBatterySaverActive] = useState<boolean>(true);
  const gpsWatchIdRef = useRef<number | null>(null);
  const lastTransmittedRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  const toast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    if (onShowToast) {
      onShowToast(type, title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  }, [onShowToast]);

  // Load Rider profile & stats
  const loadRiderData = useCallback(async () => {
    if (!getStoredRiderToken()) {
      setLoadingInitial(false);
      return;
    }

    try {
      setRefreshing(true);
      const res = await api.getRiderMe();
      if (res.success && res.rider) {
        setRider(res.rider);
        setAvailabilityStatus(res.rider.availabilityStatus === 'ONLINE' ? 'ONLINE' : 'OFFLINE');
        setStats(res.stats);

        // Fetch active order
        const activeRes = await api.getRiderActiveOrder();
        if (activeRes.success) {
          setActiveOrder(activeRes.order);
        }

        // If no active order and rider is online, fetch pending requests
        if (!activeRes.order) {
          const reqRes = await api.getRiderDeliveryRequests(
            currentCoords?.lat,
            currentCoords?.lng
          );
          if (reqRes.success) {
            setDeliveryRequests(reqRes.requests || []);
          }
        }
      }
    } catch (err: any) {
      console.error('[RiderPortalView] Failed to load rider data:', err);
      if (err.status === 401 || err.status === 403) {
        removeStoredRiderToken();
        setRiderToken(null);
        setRider(null);
      }
    } finally {
      setLoadingInitial(false);
      setRefreshing(false);
    }
  }, [currentCoords]);

  // Initial load
  useEffect(() => {
    loadRiderData();
  }, [loadRiderData]);

  // Adaptive GPS Location Watcher with Deadband Filtering & Power Optimization
  useEffect(() => {
    // If not logged in or offline, turn off GPS receiver to save 100% battery
    if (typeof window === 'undefined' || !('geolocation' in navigator) || !riderToken || availabilityStatus !== 'ONLINE') {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      return;
    }

    // High accuracy only when rider has an ongoing active order
    // When waiting for orders, low-power fused location saves ~80% battery!
    const useHighAccuracy = Boolean(activeOrder);

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);

        const now = Date.now();
        const last = lastTransmittedRef.current;

        if (!last) {
          // First transmission
          lastTransmittedRef.current = { lat: coords.lat, lng: coords.lng, timestamp: now };
          api.updateRiderStatus({
            availabilityStatus: availabilityStatus,
            latitude: coords.lat,
            longitude: coords.lng
          }).catch(() => {});
          return;
        }

        const distanceMoved = calculateDistanceMeters(last.lat, last.lng, coords.lat, coords.lng);
        const timeElapsed = now - last.timestamp;

        // DEAD-BAND & THROTTLE FILTERING:
        // 1. Stationary Filter: If moved < 15 meters, do not spam server. Send heartbeat only every 60 seconds.
        // 2. Moving on active delivery: Send update if moved >= 15m AND at least 12 seconds elapsed.
        // 3. Moving while waiting for orders: Send update if moved >= 25m AND at least 30 seconds elapsed.
        const minMoveDistance = activeOrder ? 15 : 25;
        const minThrottleTime = activeOrder ? 12000 : 30000;
        const maxStationaryHeartbeat = 60000;

        const isStationaryHeartbeat = timeElapsed >= maxStationaryHeartbeat;
        const isSignificantMovement = distanceMoved >= minMoveDistance && timeElapsed >= minThrottleTime;

        if (isSignificantMovement || isStationaryHeartbeat) {
          lastTransmittedRef.current = { lat: coords.lat, lng: coords.lng, timestamp: now };
          api.updateRiderStatus({
            availabilityStatus: availabilityStatus,
            latitude: coords.lat,
            longitude: coords.lng
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn('[RiderPortalView] GPS watch error:', err);
      },
      {
        enableHighAccuracy: useHighAccuracy,
        maximumAge: useHighAccuracy ? 10000 : 30000,
        timeout: 20000
      }
    );

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [riderToken, availabilityStatus, activeOrder]);

  // Periodic polling for requests if active and online (with background visibility throttling)
  useEffect(() => {
    if (!riderToken || availabilityStatus !== 'ONLINE' || activeOrder) return;

    const pollRequests = () => {
      // Pause network requests when phone screen is locked or app in background
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      api.getRiderDeliveryRequests(currentCoords?.lat, currentCoords?.lng)
        .then(res => {
          if (res.success) {
            setDeliveryRequests(res.requests || []);
          }
        })
        .catch(() => {});
    };

    // Poll every 25 seconds (reduced from 15s to save 40% battery & data)
    const interval = setInterval(pollRequests, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollRequests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [riderToken, availabilityStatus, activeOrder, currentCoords]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPin) {
      toast('error', 'প্রয়োজনীয় তথ্য অনুপস্থিত', 'মোবাইল নম্বর ও পিন প্রদান করুন।');
      return;
    }

    try {
      setIsLoggingIn(true);
      const res = await api.riderLogin(loginPhone, loginPin);
      if (res.success && res.token) {
        setStoredRiderToken(res.token);
        setRiderToken(res.token);
        setRider(res.rider);
        toast('success', 'স্বাগতম', `${res.rider.fullName}, আপনি রাইডার পোর্টালে সফলভাবে লগইন করেছেন।`);
        loadRiderData();
      }
    } catch (err: any) {
      toast('error', 'লগইন ব্যর্থ', err.message || 'মোবাইল নম্বর অথবা পিন সঠিক নয়।');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regPhone || !regPin || !regProfilePhoto || !regNidFrontPhoto || !regNidBackPhoto) {
      toast('error', 'তথ্য অনুপস্থিত', 'নাম, মোবাইল নম্বর, পিন, রাইডারের ছবি এবং এনআইডি (সামনের ও পিছনের) ছবি বাধ্যতামূলক।');
      return;
    }

    try {
      setIsRegistering(true);
      const res = await api.riderRegister({
        fullName: regFullName,
        phone: regPhone,
        emergencyPhone: regEmergencyPhone,
        nidNumber: regNidNumber,
        drivingLicense: regDrivingLicense,
        vehicleType: regVehicleType,
        vehiclePlate: regVehiclePlate,
        serviceDistrict: regDistrict,
        serviceThana: regThana,
        pin: regPin,
        profilePhoto: regProfilePhoto,
        nidFrontImage: regNidFrontPhoto,
        nidBackImage: regNidBackPhoto
      });

      if (res.success) {
        setRegPendingInfo('আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে। এডমিন ভেরিফিকেশন ও অনুমোদনের পর আপনি লগইন করতে পারবেন।');
        toast('success', 'আবেদন গৃহীত হয়েছে', 'এডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।');
        setAuthMode('login');
        setLoginPhone(regPhone);
      }
    } catch (err: any) {
      toast('error', 'নিবন্ধন ব্যর্থ', err.message || 'নিবন্ধনে সমস্যা হয়েছে।');
    } finally {
      setIsRegistering(false);
    }
  };

  // Toggle Online/Offline Status
  const handleToggleOnline = async () => {
    const nextStatus = availabilityStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      setUpdatingStatus(true);
      await api.updateRiderStatus({
        availabilityStatus: nextStatus,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng
      });
      setAvailabilityStatus(nextStatus);
      toast('info', nextStatus === 'ONLINE' ? 'অনলাইন' : 'অফলাইন', 
        nextStatus === 'ONLINE' 
          ? 'আপনি এখন নতুন ডেলিভারি রিকোয়েস্ট পেতে প্রস্তুত।' 
          : 'আপনি এখন অফলাইনে আছেন।'
      );
    } catch (err: any) {
      toast('error', 'ব্যর্থ', 'স্ট্যাটাস পরিবর্তন করা যায়নি।');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Accept Delivery Order
  const handleAcceptOrder = async (orderId: string) => {
    setIsAcceptingRequest(true);
    try {
      const res = await api.acceptRiderOrder(orderId);
      if (res.success) {
        setActiveOrder(res.order);
        setDeliveryRequests(prev => prev.filter(r => r.id !== orderId));
        toast('success', 'অর্ডার গৃহীত হয়েছে', 'মার্চেন্ট শপ থেকে পণ্য সংগ্রহ করতে প্রস্তুত হন।');
      }
    } catch (err: any) {
      toast('error', 'অর্ডার গ্রহণ ব্যর্থ', err.message || 'অন্য কোনো রাইডার ইতোমধ্যে অর্ডারটি গ্রহণ করে থাকতে পারেন।');
      loadRiderData();
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  // Decline Delivery Order
  const handleDeclineOrder = async (orderId: string) => {
    try {
      await api.declineRiderOrder(orderId);
      setDeliveryRequests(prev => prev.filter(r => r.id !== orderId));
      toast('info', 'রিকোয়েস্ট বাতিল', 'ডেলিভারি রিকোয়েস্টটি তালিকা থেকে সরিয়ে দেওয়া হয়েছে।');
    } catch (err: any) {
      toast('error', 'ব্যর্থ', err.message || 'বাতিল করা সম্ভব হয়নি।');
    }
  };

  // Verify Pickup with OTP
  interface GroupedShop {
    shopId: string;
    shopName: string;
    shopPhone: string;
    shopAddress: string;
    shopArea?: string;
    shopDistrict?: string;
    shopPickupOtp: string;
    shopPickedUp: boolean;
    shopDeliveryOtp?: string;
    shopDelivered?: boolean;
    shopLatitude?: number;
    shopLongitude?: number;
    totalPayable: number;
    totalOriginal: number;
    items: any[];
  }

  const getGroupedShops = (items: any[]): GroupedShop[] => {
    if (!items || !Array.isArray(items)) return [];
    const shopsMap: Record<string, GroupedShop> = {};
    for (const item of items) {
      if (!shopsMap[item.shopId]) {
        shopsMap[item.shopId] = {
          shopId: item.shopId,
          shopName: item.shopNameBn || item.shopName || 'মার্চেন্ট শপ',
          shopPhone: item.shopPhone || '',
          shopAddress: item.shopAddress || '',
          shopArea: item.shopArea || '',
          shopDistrict: item.shopDistrict || '',
          shopPickupOtp: item.shopPickupOtp,
          shopPickedUp: Boolean(item.shopPickedUp),
          shopDeliveryOtp: item.shopDeliveryOtp,
          shopDelivered: Boolean(item.shopDelivered),
          shopLatitude: Number(item.shopLatitude || 0),
          shopLongitude: Number(item.shopLongitude || 0),
          totalPayable: 0,
          totalOriginal: 0,
          items: []
        };
      }
      const itemQty = Number(item.quantity) || 1;
      const itemPayable = Number(item.customerProductPayable ?? (item.originalPrice ? item.originalPrice * itemQty : (item.price || 0) * itemQty)) || 0;
      const itemOriginal = (Number(item.originalPrice ?? item.price ?? 0)) * itemQty;

      shopsMap[item.shopId].totalPayable += itemPayable;
      shopsMap[item.shopId].totalOriginal += itemOriginal;
      shopsMap[item.shopId].items.push(item);
    }
    return Object.values(shopsMap);
  };

  const handleConfirmPickupForShop = async (shopId: string, shopName: string) => {
    const inputCode = pickupOtpInputs[shopId] || '';
    if (!inputCode || inputCode.trim().length !== 6) {
      toast('error', 'ভুল ওটিপি', `দয়া করে '${shopName}' শপের মার্চেন্টের কাছ থেকে ৬ ডিজিটের পিকআপ ওটিপি সংগ্রহ করে প্রদান করুন।`);
      return;
    }

    try {
      setVerifyingPickup(true);
      const res = await api.pickupRiderOrder(activeOrder.id, inputCode.trim(), shopId);
      if (res.success) {
        setActiveOrder(res.order);
        setPickupOtpInputs(prev => ({ ...prev, [shopId]: '' }));
        toast('success', 'পিকআপ নিশ্চিত হয়েছে!', `'${shopName}' থেকে পণ্য পিকআপ সফলভাবে সম্পন্ন হয়েছে।`);
      }
    } catch (err: any) {
      toast('error', 'পিকআপ ব্যর্থ', err.message || 'পিকআপ ওটিপি সঠিক নয়।');
    } finally {
      setVerifyingPickup(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!pickupOtpInput || pickupOtpInput.trim().length !== 6) {
      toast('error', 'ভুল ওটিপি', 'দয়া করে মার্চেন্টের কাছ থেকে ৬ ডিজিটের পিকআপ ওটিপি সংগ্রহ করে প্রদান করুন।');
      return;
    }

    try {
      setVerifyingPickup(true);
      const res = await api.pickupRiderOrder(activeOrder.id, pickupOtpInput.trim());
      if (res.success) {
        setActiveOrder(res.order);
        setPickupOtpInput('');
        toast('success', 'পিকআপ নিশ্চিত হয়েছে!', 'পণ্য গ্রাহকের ঠিকানায় পৌঁছে দিন।');
      }
    } catch (err: any) {
      toast('error', 'পিকআপ ব্যর্থ', err.message || 'পিকআপ ওটিপি সঠিক নয়।');
    } finally {
      setVerifyingPickup(false);
    }
  };

  // Verify Delivery with OTP
  const handleConfirmDeliveryForShop = async (shopId: string, shopName: string) => {
    const inputCode = deliveryOtpInputs[shopId] || '';
    if (!inputCode || inputCode.trim().length !== 6) {
      toast('error', 'ভুল ওটিপি', `দয়া করে '${shopName}' শপের পণ্যের জন্য গ্রাহকের কাছ থেকে ৬ ডিজিটের ডেলিভারি ওটিপি সংগ্রহ করে প্রদান করুন।`);
      return;
    }

    try {
      setVerifyingDelivery(true);
      const res = await api.deliverRiderOrder(activeOrder.id, inputCode.trim(), shopId);
      if (res.success) {
        setActiveOrder(res.order);
        setDeliveryOtpInputs(prev => ({ ...prev, [shopId]: '' }));
        toast('success', 'ডেলিভারি নিশ্চিত হয়েছে!', `'${shopName}'-এর পণ্য গ্রাহককে সফলভাবে হস্তান্তর করা হয়েছে।`);
        loadRiderData();
      }
    } catch (err: any) {
      toast('error', 'ডেলিভারি ব্যর্থ', err.message || 'ডেলিভারি ওটিপি সঠিক নয়।');
    } finally {
      setVerifyingDelivery(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryOtpInput || deliveryOtpInput.trim().length !== 6) {
      toast('error', 'ভুল ওটিপি', 'দয়া করে গ্রাহকের কাছ থেকে ৬ ডিজিটের ডেলিভারি ওটিপি সংগ্রহ করে প্রদান করুন।');
      return;
    }

    try {
      setVerifyingDelivery(true);
      const res = await api.deliverRiderOrder(activeOrder.id, deliveryOtpInput.trim());
      if (res.success) {
        setActiveOrder(res.order);
        setDeliveryOtpInput('');
        toast('success', 'ডেলিভারি সম্পন্ন!', 'মার্চেন্ট ক্যাশ বা হিসাব নিশ্চিত করলেই আপনার ডেলিভারি ফি ওয়ালেটে যুক্ত হবে।');
        loadRiderData();
      }
    } catch (err: any) {
      toast('error', 'ডেলিভারি ব্যর্থ', err.message || 'ডেলিভারি ওটিপি সঠিক নয়।');
    } finally {
      setVerifyingDelivery(false);
    }
  };

  const handleRequestRejectCode = async () => {
    if (!activeOrder) return;
    try {
      setRequestingRejectCode(true);
      const res = await api.riderRequestRejectCode(activeOrder.id);
      if (res.success) {
        setActiveOrder(res.order);
        toast('success', 'রিজেক্ট কোড জেনারেট হয়েছে!', 'গ্রাহকের কাছে রিজেক্ট কোড পাঠানো হয়েছে। গ্রাহকের কাছ থেকে কোডটি সংগ্রহ করে নিচে প্রবেশ করান।');
        loadRiderData();
      }
    } catch (err: any) {
      toast('error', 'রিজেক্ট কোড অনুরোধ ব্যর্থ', err.message || 'কোড জেনারেট করা সম্ভব হয়নি।');
    } finally {
      setRequestingRejectCode(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectCodeInput || rejectCodeInput.trim().length !== 6) {
      toast('error', 'ভুল কোড', 'দয়া করে গ্রাহকের দেওয়া ৬ ডিজিটের রিজেক্ট কোড প্রবেশ করান।');
      return;
    }
    try {
      setVerifyingReject(true);
      const res = await api.riderConfirmReject(activeOrder.id, rejectCodeInput.trim());
      if (res.success) {
        setActiveOrder(null);
        setRejectCodeInput('');
        toast('success', 'পার্সেল রিজেক্ট নিশ্চিত হয়েছে!', 'অর্ডারটি সফলভাবে বাতিল ও প্রোডাক্ট ব্যাক হিসেবে চিহ্নিত করা হয়েছে।');
        loadRiderData();
      }
    } catch (err: any) {
      toast('error', 'বাতিল ব্যর্থ', err.message || 'রিজেক্ট কোড সঠিক নয়।');
    } finally {
      setVerifyingReject(false);
    }
  };

  // Load Order History
  const loadHistory = async () => {
    try {
      const res = await api.getRiderHistory();
      if (res.success) {
        setOrderHistory(res.orders || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      console.error('[RiderPortalView] Failed to load history:', err);
    }
  };

  // Logout
  const handleLogout = () => {
    removeStoredRiderToken();
    setRiderToken(null);
    setRider(null);
    setActiveOrder(null);
    toast('info', 'লগআউট', 'রাইডার পোর্টাল থেকে সফলভাবে লগআউট করা হয়েছে।');
  };

  // -------------------------------------------------------------
  // RENDERING: Loading Initial
  // -------------------------------------------------------------
  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-emerald-400 font-medium text-sm">রাইডার পোর্টাল লোড হচ্ছে...</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Authentication Screens (Login / Register)
  // -------------------------------------------------------------
  if (!riderToken || !rider) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
            <Bike className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CC Delivery Rider</h1>
          <p className="text-sm text-slate-400 mt-1">Cave Companions ডেলিভারি রাইডার পোর্টাল</p>
        </div>

        {regPendingInfo && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">আবেদন স্ট্যাটাস: অপেক্ষমাণ</p>
              <p className="text-xs text-amber-400/90 leading-relaxed">{regPendingInfo}</p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex border-b border-slate-800 pb-3 mb-5">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                authMode === 'login'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              রাইডার লগইন
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                authMode === 'register'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              নতুন আবেদন
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">মোবাইল নম্বর</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">+88</span>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">৪-৬ ডিজিটের পিন (PIN)</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={6}
                    placeholder="••••••"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot_password');
                    setForgotPhone(loginPhone);
                    setForgotError(null);
                    setForgotSuccess(null);
                    setForgotStep(1);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  পিন (PIN) ভুলে গেছেন?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>লগইন করুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : authMode === 'forgot_password' ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
                <span>রাইডার পিন (PIN) রিসেট</span>
                <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                  ধাপ {forgotStep}/৩
                </span>
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  {forgotSuccess}
                </div>
              )}

              {forgotStep === 1 && (
                <form onSubmit={handleRiderForgotRequest} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      রাইডার মোবাইল নম্বর
                    </label>
                    <input
                      type="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'ওটিপি কোড পাঠান'
                    )}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleRiderForgotVerify} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      ৬ ডিজিটের ওটিপি কোড
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="XXXXXX"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    {forgotDevOtp && (
                      <p className="text-[11px] text-emerald-400/80 mt-1.5 text-center">
                        [Dev Test Code: <span className="font-mono font-bold">{forgotDevOtp}</span>]
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'ওটিপি ভেরিফাই করুন'
                    )}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleRiderForgotReset} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      নতুন ৪-৬ ডিজিটের পিন (PIN)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      নতুন পিন নিশ্চিত করুন
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={forgotConfirmPin}
                      onChange={(e) => setForgotConfirmPin(e.target.value)}
                      placeholder="পুনরায় টাইপ করুন"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'পিন সংরক্ষণ ও পরিবর্তন করুন'
                    )}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← লগইন পাতায় ফিরে যান
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">আপনার পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="উদাঃ মোঃ রফিকুল ইসলাম"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">জরুরী নম্বর</label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={regEmergencyPhone}
                    onChange={(e) => setRegEmergencyPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">এনআইডি (NID) নম্বর</label>
                  <input
                    type="text"
                    placeholder="জাতীয় পরিচয়পত্র নম্বর"
                    value={regNidNumber}
                    onChange={(e) => setRegNidNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">ড্রাইভিং লাইসেন্স (যদি থাকে)</label>
                  <input
                    type="text"
                    placeholder="লাইসেন্স নম্বর"
                    value={regDrivingLicense}
                    onChange={(e) => setRegDrivingLicense(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">বাহনের ধরণ *</label>
                  <select
                    value={regVehicleType}
                    onChange={(e) => setRegVehicleType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BICYCLE">সাইকেল (Bicycle)</option>
                    <option value="MOTORCYCLE">মোটরসাইকেল (Motorcycle)</option>
                    <option value="SCOOTER">স্কুটার (Scooter)</option>
                    <option value="ELECTRIC_BIKE">ইলেকট্রিক বাইক (E-Bike)</option>
                    <option value="WALKING">হেঁটে (Walking)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">গাড়ির প্লেট নম্বর</label>
                  <input
                    type="text"
                    placeholder="ঢাকা মেট্রো-হ..."
                    value={regVehiclePlate}
                    onChange={(e) => setRegVehiclePlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">কাজের জেলা *</label>
                  <input
                    type="text"
                    required
                    placeholder="উদাঃ Dhaka"
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">কাজের থানা/উপজেলা</label>
                  <input
                    type="text"
                    placeholder="উদাঃ মিরপুর, উত্তরা"
                    value={regThana}
                    onChange={(e) => setRegThana(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={profilePhotoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'profile')}
              />
              <input
                type="file"
                ref={nidFrontPhotoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'nidFront')}
              />
              <input
                type="file"
                ref={nidBackPhotoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'nidBack')}
              />

              {/* Rider Profile Photo Upload */}
              <div>
                <label className="block font-medium text-slate-300 mb-1 text-xs">
                  রাইডারের নিজের ছবি <span className="text-emerald-400">*</span>
                </label>
                {regProfilePhoto ? (
                  <div className="relative group rounded-xl border border-emerald-500/50 bg-slate-950 p-2 text-center">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                      <img
                        src={regProfilePhoto}
                        alt="রাইডারের ছবি"
                        className="h-full w-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => profilePhotoInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          পরিবর্তন
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegProfilePhoto('')}
                          className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          মুছুন
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between px-1">
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> আপলোড সম্পন্ন
                      </span>
                      <button
                        type="button"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        পরিবর্তন
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-950 hover:bg-slate-900/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <div className="p-1.5 rounded-full bg-slate-900 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 transition-colors mb-1">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-300 group-hover:text-emerald-400">
                      নিজের ছবি আপলোড করুন
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      গ্যালারি/ক্যামেরা (সর্বোচ্চ 5MB)
                    </span>
                  </button>
                )}
              </div>

              {/* NID Photos Upload Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NID Front Upload */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1 text-xs">
                    এনআইডি (NID) সামনের ছবি <span className="text-emerald-400">*</span>
                  </label>
                  {regNidFrontPhoto ? (
                    <div className="relative group rounded-xl border border-emerald-500/50 bg-slate-950 p-2 text-center">
                      <div className="relative h-28 w-full overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                        <img
                          src={regNidFrontPhoto}
                          alt="এনআইডি সামনের ছবি"
                          className="h-full w-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => nidFrontPhotoInputRef.current?.click()}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            পরিবর্তন
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegNidFrontPhoto('')}
                            className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            মুছুন
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between px-1">
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> সামনের দিক সম্পন্ন
                        </span>
                        <button
                          type="button"
                          onClick={() => nidFrontPhotoInputRef.current?.click()}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          পরিবর্তন
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nidFrontPhotoInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-950 hover:bg-slate-900/50 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <div className="p-2 rounded-full bg-slate-900 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 transition-colors mb-1">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-emerald-400">
                        NID সামনের ছবি আপলোড
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">
                        গ্যালারি/ক্যামেরা (সর্বোচ্চ 5MB)
                      </span>
                    </button>
                  )}
                </div>

                {/* NID Back Upload */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1 text-xs">
                    এনআইডি (NID) পিছনের ছবি <span className="text-emerald-400">*</span>
                  </label>
                  {regNidBackPhoto ? (
                    <div className="relative group rounded-xl border border-emerald-500/50 bg-slate-950 p-2 text-center">
                      <div className="relative h-28 w-full overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                        <img
                          src={regNidBackPhoto}
                          alt="এনআইডি পিছনের ছবি"
                          className="h-full w-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => nidBackPhotoInputRef.current?.click()}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            পরিবর্তন
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegNidBackPhoto('')}
                            className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors text-xs font-medium flex items-center gap-1 shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            মুছুন
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between px-1">
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> পিছনের দিক সম্পন্ন
                        </span>
                        <button
                          type="button"
                          onClick={() => nidBackPhotoInputRef.current?.click()}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          পরিবর্তন
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nidBackPhotoInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-950 hover:bg-slate-900/50 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <div className="p-2 rounded-full bg-slate-900 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 transition-colors mb-1">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-emerald-400">
                        NID পিছনের ছবি আপলোড
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">
                        গ্যালারি/ক্যামেরা (সর্বোচ্চ 5MB)
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">নিরাপত্তা পিন (৪-৬ ডিজিট) *</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="ভবিষ্যতে লগইনের জন্য ৪-৬ ডিজিটের পিন দিন"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center space-x-2"
              >
                {isRegistering ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>জমা হচ্ছে...</span>
                  </>
                ) : (
                  <span>আবেদন জমা দিন</span>
                )}
              </button>
            </form>
          )}
        </div>

        {onExitRider && (
          <div className="text-center mt-6">
            <button
              id="back-to-user-app-from-rider-btn"
              type="button"
              onClick={onExitRider}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-800"
            >
              ← ইউজার লগইনে ফিরে যান (Back to User Login)
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------

  const renderActiveTabContent = () => {
    return (
      <div className="space-y-4">
        {activeOrder ? (
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 animate-pulse">
                  চলমান ট্রিপ
                </span>
                <span className="text-xs text-slate-400">
                  অর্ডার #{activeOrder.id.slice(0, 8)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-400">
                  ফি: ৳ {toBnNumber(activeOrder.riderFee || 0)}
                </span>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2 rounded-lg border ${
                activeOrder.riderStatus === 'ACCEPTED'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}>
                ১. শপ থেকে পিকআপ
              </div>
              <div className={`p-2 rounded-lg border ${
                activeOrder.riderStatus === 'PICKED_UP'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}>
                ২. গ্রাহককে ডেলিভারি
              </div>
              <div className={`p-2 rounded-lg border ${
                activeOrder.riderStatus === 'DELIVERED'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}>
                ৩. মার্চেন্ট নিষ্পত্তি
              </div>
            </div>

            {/* Step 1: Shop Pickup */}
            <div className={`p-3.5 rounded-xl border ${
              activeOrder.riderStatus === 'ACCEPTED'
                ? 'bg-slate-950 border-emerald-500/30 ring-1 ring-emerald-500/10'
                : 'bg-slate-950/60 border-slate-800 opacity-80'
            } space-y-4`}>
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>শপ পিকআপ তথ্য ({toBnNumber(getGroupedShops(activeOrder.items).length)} টি শপ)</span>
                </span>
                {activeOrder.riderStatus !== 'ACCEPTED' && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    সব পিকআপ সফল
                  </span>
                )}
              </div>

              {activeOrder.riderStatus === 'ACCEPTED' && (
                <Step1PickupMap riderCoords={currentCoords} shops={getGroupedShops(activeOrder.items)} />
              )}

              {getGroupedShops(activeOrder.items).map((shop, idx) => {
                const shopMapLink = shop.shopLatitude && shop.shopLongitude
                  ? (currentCoords
                      ? `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${shop.shopLatitude},${shop.shopLongitude}&travelmode=driving`
                      : `https://www.google.com/maps/search/?api=1&query=${shop.shopLatitude},${shop.shopLongitude}`)
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((shop.shopName || '') + ' ' + (shop.shopAddress || ''))}`;

                const distFromRider = (currentCoords && shop.shopLatitude && shop.shopLongitude)
                  ? (() => {
                      const R = 6371;
                      const dLat = (shop.shopLatitude - currentCoords.lat) * Math.PI / 180;
                      const dLon = (shop.shopLongitude - currentCoords.lng) * Math.PI / 180;
                      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                Math.cos(currentCoords.lat * Math.PI / 180) * Math.cos(shop.shopLatitude * Math.PI / 180) *
                                Math.sin(dLon/2) * Math.sin(dLon/2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                      return (R * c).toFixed(1);
                    })()
                  : null;

                return (
                  <div key={`pickup-shop-${shop.shopId || 's'}-${idx}`} className={`p-3.5 rounded-xl border ${
                    shop.shopPickedUp 
                      ? 'bg-emerald-950/10 border-emerald-500/20 opacity-70' 
                      : 'bg-slate-900/60 border-slate-800'
                  } space-y-2.5`}>
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-white text-xs sm:text-sm flex items-center space-x-1.5">
                        <span className="text-slate-400 font-mono">#{toBnNumber(idx + 1)}.</span>
                        <span>{shop.shopName}</span>
                      </h5>
                      <div className="flex items-center space-x-2">
                        {shop.shopPhone && (
                          <a
                            href={`tel:${shop.shopPhone}`}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                            title="কল মার্চেন্ট"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {shop.shopPickedUp ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center space-x-1 border border-emerald-500/25">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>সংগৃহীত</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/25">
                            পিকআপ অপেক্ষমান
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Shop Location & Navigation Link */}
                    <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-start justify-between gap-2 text-xs">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                            <strong className="text-slate-400 font-normal">ঠিকানা:</strong> {shop.shopAddress || [shop.shopArea, shop.shopDistrict].filter(Boolean).join(', ') || 'ঠিকানা দেওয়া নেই'}
                          </p>
                          {distFromRider && (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40 font-bold">
                              📍 আপনার থেকে {toBnNumber(distFromRider)} কিমি দূরে
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={shopMapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition-all cursor-pointer shadow-sm"
                        title="গুগল ম্যাপে শপের অবস্থান ও রুট দেখুন"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>ম্যাপে দেখুন</span>
                      </a>
                    </div>

                    {/* Items from this shop with Price Breakdown */}
                    <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800/50">
                        <span>পণ্য তালিকা</span>
                        <span>পরিমাণ ও মূল্য</span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        {shop.items.map((item: any, itmIdx: number) => {
                          const itemQty = Number(item.quantity) || 1;
                          const itemPayable = Number(item.customerProductPayable ?? (item.originalPrice ? item.originalPrice * itemQty : (item.price || 0) * itemQty));
                          return (
                            <div key={`pickup-item-${shop.shopId || idx}-${item.id || 'itm'}-${itmIdx}`} className="text-xs text-slate-300 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span className="text-slate-200 font-medium truncate">{item.productName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-right font-mono">
                                <span className="text-[11px] text-slate-400 font-sans">x{toBnNumber(itemQty)}</span>
                                <span className="font-bold text-amber-300 text-xs">
                                  ৳{toBnNumber(itemPayable.toLocaleString('bn-BD'))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Shop Total Products Value */}
                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">শপের মোট পণ্যের মূল্য:</span>
                        <span className="text-emerald-400 font-black text-xs sm:text-sm">
                          ৳{toBnNumber(Number(shop.totalPayable || 0).toLocaleString('bn-BD'))}
                        </span>
                      </div>
                    </div>

                    {activeOrder.riderStatus === 'ACCEPTED' && !shop.shopPickedUp && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-2">
                        <p className="text-[10px] text-slate-400">
                          মার্চেন্টের নিকট থেকে পণ্য বুঝে নিয়ে তার দেওয়া ৬ ডিজিটের পিকআপ কোড দিন:
                        </p>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="৬ ডিজিট পিকআপ কোড"
                            value={pickupOtpInputs[shop.shopId] || ''}
                            onChange={(e) => setPickupOtpInputs(prev => ({ ...prev, [shop.shopId]: e.target.value }))}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-center text-xs font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => handleConfirmPickupForShop(shop.shopId, shop.shopName)}
                            disabled={verifyingPickup || (pickupOtpInputs[shop.shopId] || '').length !== 6}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center space-x-1 transition-all shrink-0 cursor-pointer"
                          >
                            {verifyingPickup ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>পিকআপ নিশ্চিত</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 2: Customer Delivery & Parcel Rejected */}
            <div className={`p-3.5 rounded-xl border ${
              activeOrder.riderStatus === 'PICKED_UP'
                ? 'bg-slate-950 border-blue-500/30 ring-1 ring-blue-500/10'
                : 'bg-slate-950/60 border-slate-800 opacity-80'
            } space-y-4`}>
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-blue-400 text-xs sm:text-sm flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>গ্রাহক তথ্য ও ডেলিভারি</span>
                </span>
              </div>

              {activeOrder.riderStatus === 'PICKED_UP' && (
                <Step2DeliveryMap
                  riderCoords={currentCoords}
                  customerLat={activeOrder.latitude}
                  customerLng={activeOrder.longitude}
                />
              )}

              <div className="space-y-2 text-xs text-slate-300">
                <p><strong>গ্রাহকের নাম:</strong> {activeOrder.customerName || 'গ্রাহক'}</p>
                {activeOrder.customerPhone && (
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span><strong>ফোন নম্বর:</strong> {activeOrder.customerPhone}</span>
                    <a
                      href={`tel:${activeOrder.customerPhone}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 font-bold transition-all text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      <span>কল গ্রাহক</span>
                    </a>
                  </div>
                )}
                <p><strong>ডেলিভারি ঠিকানা:</strong> {activeOrder.deliveryAddress}</p>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">সংগ্রহযোগ্য ক্যাশ (COD):</span>
                <span className="font-bold text-amber-400 text-sm">৳ {toBnNumber(activeOrder.totalCodAmount || activeOrder.totalAmount || 0)}</span>
              </div>

              {activeOrder.riderStatus === 'PICKED_UP' && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Delivery OTP Verification */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>পণ্য হাতে পাওয়ার কোড দিন:</span>
                    </label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      গ্রাহকের নিকট থেকে ৬ ডিজিটের পণ্য হাতে পাওয়ার ডেলিভারি কোড নিয়ে নিচে প্রবেশ করান:
                    </p>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="৬ ডিজিট ডেলিভারি কোড"
                        value={deliveryOtpInput}
                        onChange={(e) => setDeliveryOtpInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-center text-xs font-bold tracking-widest text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleConfirmDelivery}
                        disabled={verifyingDelivery || deliveryOtpInput.trim().length !== 6}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center space-x-1 transition-all shrink-0 cursor-pointer"
                      >
                        {verifyingDelivery ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>ডেলিভারি নিশ্চিত</span>
                      </button>
                    </div>
                  </div>

                  {/* Parcel Rejected Section */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-rose-400 block">
                          পণ্য নিতে অস্বীকার? (Parcel Rejected)
                        </span>
                        <p className="text-[10px] text-slate-400">
                          গ্রাহক পণ্য নিতে অস্বীকার করলে নিচের বাটনে ক্লিক করে রিজেক্ট কোড জেনারেট করুন।
                        </p>
                      </div>
                      <button
                        onClick={handleRequestRejectCode}
                        disabled={requestingRejectCode}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all shrink-0 flex items-center space-x-1 cursor-pointer"
                      >
                        {requestingRejectCode ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-300 border-t-transparent animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>Parcel Rejected</span>
                      </button>
                    </div>

                    {activeOrder.rejectionCode && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                        <div className="text-xs text-rose-300 font-bold flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>রিজেক্ট কোড ইউজারের অ্যাপে পাঠানো হয়েছে</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          গ্রাহকের "My Orders" সেকশনে পার্সেল রিজেক্ট কোডটি পাঠানো হয়েছে। গ্রাহকের কাছ থেকে কোডটি সংগ্রহ করে নিচে প্রবেশ করিয়ে অর্ডার বাতিল সম্পন্ন করুন:
                        </p>
                        <div className="flex space-x-2 pt-1">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="৬ ডিজিট রিজেক্ট কোড"
                            value={rejectCodeInput}
                            onChange={(e) => setRejectCodeInput(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-bold tracking-widest text-white focus:outline-none focus:border-rose-500"
                          />
                          <button
                            onClick={handleConfirmReject}
                            disabled={verifyingReject || rejectCodeInput.length !== 6}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1 transition-all shrink-0 cursor-pointer"
                          >
                            {verifyingReject ? (
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>রিজেক্ট নিশ্চিত করুন</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Merchant Settlement */}
            <div className={`p-3.5 rounded-xl border ${
              activeOrder.riderStatus === 'DELIVERED'
                ? 'bg-slate-950 border-amber-500/30 ring-1 ring-amber-500/10'
                : 'bg-slate-950/60 border-slate-800 opacity-80'
            } space-y-4`}>
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs sm:text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>মার্চেন্ট নিষ্পত্তি ও পেমেন্ট পরিশোধ</span>
                </span>
                {activeOrder.riderStatus === 'DELIVERED' && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                    হিসাব ওটিপি অপেক্ষমান
                  </span>
                )}
              </div>

              {activeOrder.riderStatus === 'DELIVERED' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs leading-relaxed">
                  গ্রাহকের কাছে পণ্য সফলভাবে পৌঁছে দেওয়া হয়েছে! এবার মার্চেন্টদের নিকট গিয়ে পেমেন্ট বা হিসাব পরিশোধের জন্য তাদের নিজস্ব <strong>"নিষ্পত্তি কোড (Settlement OTP)"</strong> প্রবেশ করিয়ে প্রতিটি শপ নিষ্পত্তি করুন।
                </div>
              )}

              <div className="space-y-3">
                {getGroupedShops(activeOrder.items).map((shop, idx) => {
                  const shopMapLink = shop.shopLatitude && shop.shopLongitude
                    ? (currentCoords
                        ? `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${shop.shopLatitude},${shop.shopLongitude}&travelmode=driving`
                        : `https://www.google.com/maps/search/?api=1&query=${shop.shopLatitude},${shop.shopLongitude}`)
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((shop.shopName || '') + ' ' + (shop.shopAddress || ''))}`;

                  return (
                    <div key={`settle-shop-${shop.shopId || 's'}-${idx}`} className={`p-3.5 rounded-xl border ${
                      shop.shopDelivered
                        ? 'bg-emerald-950/10 border-emerald-500/20 opacity-70'
                        : 'bg-slate-900/40 border-slate-800'
                    } space-y-2.5`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                          <span className="text-slate-500 font-mono">#{toBnNumber(idx + 1)}.</span>
                          <span>{shop.shopName}</span>
                        </span>
                        {shop.shopDelivered ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/25 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>নিষ্পত্তি সম্পন্ন</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/25">
                            নিষ্পত্তি অপেক্ষমান
                          </span>
                        )}
                      </div>

                      {/* Shop Location & Navigation Link */}
                      <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-start justify-between gap-2 text-xs">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                              <strong className="text-slate-400 font-normal">ঠিকানা:</strong> {shop.shopAddress || [shop.shopArea, shop.shopDistrict].filter(Boolean).join(', ') || 'ঠিকানা দেওয়া নেই'}
                            </p>
                          </div>
                        </div>
                        <a
                          href={shopMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition-all cursor-pointer shadow-sm"
                          title="গুগল ম্যাপে শপের অবস্থান ও রুট দেখুন"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>ম্যাপে যান</span>
                        </a>
                      </div>

                      {/* Items from this shop with Price Breakdown */}
                      <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800/50">
                          <span>পণ্য তালিকা</span>
                          <span>পরিমাণ ও মূল্য</span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          {shop.items.map((item: any, itmIdx: number) => {
                            const itemQty = Number(item.quantity) || 1;
                            const itemPayable = Number(item.customerProductPayable ?? (item.originalPrice ? item.originalPrice * itemQty : (item.price || 0) * itemQty));
                            return (
                              <div key={`settle-item-${shop.shopId || idx}-${item.id || 'itm'}-${itmIdx}`} className="text-xs text-slate-300 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">•</span>
                                  <span className="text-slate-200 font-medium truncate">{item.productName}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-right font-mono">
                                  <span className="text-[11px] text-slate-400 font-sans">x{toBnNumber(itemQty)}</span>
                                  <span className="font-bold text-amber-300 text-xs">
                                    ৳{toBnNumber(itemPayable.toLocaleString('bn-BD'))}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shop Total Products Value */}
                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-400">শপের মোট পণ্যের মূল্য:</span>
                          <span className="text-emerald-400 font-black text-xs sm:text-sm">
                            ৳{toBnNumber(Number(shop.totalPayable || 0).toLocaleString('bn-BD'))}
                          </span>
                        </div>
                      </div>

                      {activeOrder.riderStatus === 'DELIVERED' && !shop.shopDelivered && (
                        <div className="pt-2 border-t border-slate-800/60 space-y-2">
                          <p className="text-[10px] text-slate-400">
                            মার্চেন্টকে হিসাব বা পেমেন্ট বুঝিয়ে দিয়ে তার অ্যাপে থাকা ৬ ডিজিটের <strong>নিষ্পত্তি কোড (Settlement OTP)</strong> এখানে দিন:
                          </p>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="৬ ডিজিট নিষ্পত্তি কোড"
                              value={deliveryOtpInputs[shop.shopId] || ''}
                              onChange={(e) => setDeliveryOtpInputs(prev => ({ ...prev, [shop.shopId]: e.target.value }))}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-center text-xs font-bold tracking-widest text-white focus:outline-none focus:border-amber-500"
                            />
                            <button
                              onClick={() => handleConfirmDeliveryForShop(shop.shopId, shop.shopName)}
                              disabled={verifyingDelivery || (deliveryOtpInputs[shop.shopId] || '').length !== 6}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center space-x-1 transition-all shrink-0 cursor-pointer"
                            >
                              {verifyingDelivery ? (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>নিষ্পত্তি নিশ্চিত</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Radar & Available Broadcast Requests */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>নিকটবর্তী ডেলিভারি রিকোয়েস্ট</span>
              </h3>
              <button
                onClick={loadRiderData}
                disabled={refreshing}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {availabilityStatus === 'OFFLINE' ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                <Power className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">আপনি বর্তমানে অফলাইনে আছেন</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  ডেলিভারি রিকোয়েস্ট দেখতে এবং গ্রহণ করতে উপরে ডানপাশে "অনলাইন" বোতামটি চালু করুন।
                </p>
                <button
                  onClick={handleToggleOnline}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                >
                  অনলাইনে যান
                </button>
              </div>
            ) : deliveryRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="relative w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Bike className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">নতুন রিকোয়েস্ট খোঁজা হচ্ছে...</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  আপনার নির্বাচিত এলাকায় কোনো লোকাল মার্কেট অর্ডার আসলে তাৎক্ষণিক স্ক্রিনে প্রদর্শিত হবে।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveryRequests.map((req, idx) => (
                  <div
                    key={`${req.id}-${idx}`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          লোকাল মার্কেট অর্ডার
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">{req.shopName}</h4>
                        <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{req.shopThana ? `${req.shopThana}, ` : ""}{req.shopDistrict || req.district}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-400">
                          ৳ {toBnNumber(req.riderFee || 40)}
                        </span>
                        <p className="text-[10px] text-slate-500">আপনার রাইডার ফি</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 text-xs space-y-1">
                      <p className="text-slate-300">
                        <strong className="text-white">গন্তব্য:</strong> {req.deliveryAddress}
                      </p>
                      <p className="text-slate-400">
                        বিল: ৳ {toBnNumber(req.totalCodAmount || req.totalAmount || 0)} (ক্যাশ অন ডেলিভারি)
                      </p>
                    </div>

                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => setSelectedRequestForDetails(req)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>বিস্তারিত দেখুন</span>
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(req.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 transition-colors shadow-lg shadow-emerald-950"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>গ্রহণ করুন</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // RENDERING: Main Authenticated Rider Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">{rider.fullName}</h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300">
                  {rider.vehicleType}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{rider.serviceThana ? `${rider.serviceThana}, ` : ''}{rider.serviceDistrict}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Online/Offline Toggle */}
            <button
              onClick={handleToggleOnline}
              disabled={updatingStatus}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                availabilityStatus === 'ONLINE'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${availabilityStatus === 'ONLINE' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{availabilityStatus === 'ONLINE' ? 'অনলাইন' : 'অফলাইন'}</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="লগআউট"
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>আজকের আয়</span>
            </p>
            <p className="text-lg font-bold text-white mt-1">
              ৳ {toBnNumber(stats?.todayEarnings || 0)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
              <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>আজ সম্পন্ন</span>
            </p>
            <p className="text-lg font-bold text-white mt-1">
              {toBnNumber(stats?.todayDeliveriesCount || 0)} টি
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>মোট ব্যালেন্স</span>
            </p>
            <p className="text-lg font-bold text-amber-400 mt-1">
              ৳ {toBnNumber(rider.balance || 0)}
            </p>
          </div>
        </div>

        {/* Battery & Data Saver Status Badge */}
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400">
          <div className="flex items-center space-x-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>স্মার্ট ব্যাটারি ও ডেটা সেভিং মোড সক্রিয়</span>
          </div>
          <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {activeOrder ? 'ডেলিভারি মোড (১২ সে. থ্রটলিং)' : 'স্ট্যান্ডবাই মোড (লো-পাওয়ার জিপিএস)'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 font-medium rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>চলমান ও নতুন</span>
            {activeOrder && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`flex-1 py-2 font-medium rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>হিস্টোরি ও আয়</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 font-medium rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>প্রোফাইল ও বাহন</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ACTIVE ORDER OR AVAILABLE REQUESTS */}
        {/* ========================================================= */}
        {activeTab === 'active' && renderActiveTabContent()}{activeTab === 'history' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>সম্পন্ন ট্রিপের ইতিহাস</span>
            </h3>

            {orderHistory.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                এখনও কোনো ডেলিভারি ইতিহাস নেই।
              </div>
            ) : (
              orderHistory.map((item, idx) => {
                const isRejected = item.riderStatus === 'PRODUCT_BACK' || item.status === 'PRODUCT_BACK' || item.status === 'CANCELLED' || item.settlementStatus === 'PRODUCT_BACK' || item.status === 'REJECTED';
                const fee = isRejected ? 0 : (item.riderFee || 0);

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-white">অর্ডার #{item.id.slice(0, 8)}</p>
                      <p className="text-slate-400">{item.customerName} • {item.deliveryAddress?.slice(0, 25)}...</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className={`font-bold text-sm ${isRejected ? 'text-slate-400' : 'text-emerald-400'}`}>
                        +৳ {toBnNumber(fee)}
                      </span>
                      <div>
                        {isRejected ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-500/20 text-rose-300">
                            বাতিল (প্রত্যাখ্যাত)
                          </span>
                        ) : item.settlementStatus === 'SETTLED' ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300">
                            নিষ্পন্ন
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300">
                            অপেক্ষমাণ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: RIDER PROFILE & VEHICLE */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
                  {rider.fullName?.slice(0, 1) || 'R'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{rider.fullName}</h3>
                  <p className="text-xs text-slate-400">{rider.phone}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                    অনুমোদিত রাইডার (APPROVED)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">বাহনের ধরণ</span>
                  <p className="font-semibold text-white mt-0.5">{rider.vehicleType}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">প্লেট নম্বর</span>
                  <p className="font-semibold text-white mt-0.5">{rider.vehiclePlate || 'প্রযোজ্য নয়'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">কাজের জেলা</span>
                  <p className="font-semibold text-white mt-0.5">{rider.serviceDistrict}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">কাজের থানা</span>
                  <p className="font-semibold text-white mt-0.5">{rider.serviceThana || 'সমগ্র জেলা'}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>রাইডার অ্যাকাউন্ট থেকে লগআউট</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <RiderOrderDetailsModal
        isOpen={selectedRequestForDetails !== null}
        onClose={() => setSelectedRequestForDetails(null)}
        order={selectedRequestForDetails}
        onAccept={handleAcceptOrder}
        onDecline={handleDeclineOrder}
        isAccepting={isAcceptingRequest}
        currentCoords={currentCoords}
      />
    </div>
  );
};
export default RiderPortalView;

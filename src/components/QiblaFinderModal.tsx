import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  MapPin,
  LocateFixed,
  CheckCircle2,
  X,
  RotateCw,
  Info,
  Sun,
  Sunrise,
  Sunset,
  ArrowRight,
  ArrowLeft,
  Navigation2,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, formatLocationName } from '../data/bangladeshGeo';
import { toBnNumber } from '../data/prayerConfig';
import {
  calculateQiblaBearing,
  calculateKaabaDistanceKm,
  getQiblaDirectionDescription,
  DISTRICT_COORDINATES
} from '../utils/qibla';
import { useLanguage } from '../context/LanguageContext';

interface QiblaFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDistrict?: string;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const QiblaFinderModal: React.FC<QiblaFinderModalProps> = ({
  isOpen,
  onClose,
  userDistrict,
  onShowToast
}) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  // Tab Mode: 'compass' (Live Compass) or 'guide' (Visual Direction Guide)
  const [activeTab, setActiveTab] = useState<'compass' | 'guide'>('compass');

  // Location & Native GPS State
  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDistrict || 'Dhaka');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    const matched = DISTRICT_COORDINATES[userDistrict || ''] || DISTRICT_COORDINATES['Dhaka'];
    return matched || { lat: 23.8103, lng: 90.4125 };
  });
  const [locationName, setLocationName] = useState<string>(() => {
    const d = BANGLADESH_DISTRICTS.find(item => item.district === userDistrict || item.districtBn === userDistrict);
    return d ? (language === 'bn' ? d.districtBn : d.district) : (language === 'bn' ? 'ঢাকা' : 'Dhaka');
  });
  const [isUsingGps, setIsUsingGps] = useState<boolean>(false);
  const [locatingGps, setLocatingGps] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Compass Heading State
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [hasCompassSensor, setHasCompassSensor] = useState<boolean>(false);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState<boolean>(false);

  // Calibration Check System (8-Figure Motion)
  const [showCalibrationOverlay, setShowCalibrationOverlay] = useState<boolean>(false);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [calibrationSweep, setCalibrationSweep] = useState<number>(0);

  // Motion Accumulator for 8-Figure Calibration Check
  const sweepAccumulatorRef = useRef<number>(0);
  const lastOrientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);

  // Continuous heading for CSS rotation (prevents 360 spin glitch)
  const displayHeadingRef = useRef<number>(0);
  const [displayHeading, setDisplayHeading] = useState<number>(0);

  const lastHeadingRef = useRef<number>(0);

  // Calculated Qibla Bearing and Distance based on native Geolocation coordinates
  const qiblaBearing = calculateQiblaBearing(currentCoords.lat, currentCoords.lng);
  const kaabaDistanceKm = calculateKaabaDistanceKm(currentCoords.lat, currentCoords.lng);
  const qiblaDesc = getQiblaDirectionDescription(qiblaBearing, language);

  // Dynamic calculations for the visual direction guide
  const westDiff = qiblaBearing - 270;
  const westDiffAbs = Math.abs(westDiff);
  const westDiffText = language === 'bn'
    ? (westDiff >= 0 ? `ডানে +${toBnNumber(westDiffAbs.toFixed(1))}°` : `বামে -${toBnNumber(westDiffAbs.toFixed(1))}°`)
    : (westDiff >= 0 ? `Right +${westDiffAbs.toFixed(1)}°` : `Left -${westDiffAbs.toFixed(1)}°`);
  
  const practicalAngleText = language === 'bn'
    ? (westDiff >= 0 
        ? `ডান দিকে (উত্তর দিকে আনুমানিক ${toBnNumber(Math.floor(westDiffAbs))}° থেকে ${toBnNumber(Math.ceil(westDiffAbs))}°)`
        : `বাম দিকে (দক্ষিণ দিকে আনুমানিক ${toBnNumber(Math.floor(westDiffAbs))}° থেকে ${toBnNumber(Math.ceil(westDiffAbs))}°)`)
    : (westDiff >= 0
        ? `Right side (approx ${Math.floor(westDiffAbs)}° to ${Math.ceil(westDiffAbs)}° North)`
        : `Left side (approx ${Math.floor(westDiffAbs)}° to ${Math.ceil(westDiffAbs)}° South)`);

  // Calculate dynamic Sun direction based on current local time for verification
  const sunData = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const t = hours + minutes / 60;
    const isDaytime = t >= 5.8 && t <= 18.2;
    // Noon is 12:00 -> Sun is exactly at South (180°). 1 hour = 15 degrees.
    const azimuth = (180 + (t - 12) * 15 + 360) % 360;
    return { azimuth, isDaytime };
  }, [isOpen]);

  // Effective Heading directly from live compass device sensor
  const effectiveHeading = deviceHeading;
  const effectiveDisplayHeading = displayHeading;

  // Relative angle to Qibla from current device heading
  let diff = (qiblaBearing - effectiveHeading + 360) % 360;
  if (diff > 180) diff -= 360;

  // Is aligned with Qibla (tolerance of ±5 degrees)
  const isAligned = Math.abs(diff) <= 5;

  const lastVibratedRef = useRef<number>(0);

  // Haptic feedback when newly aligned (strictly when modal is open)
  useEffect(() => {
    if (!isOpen) {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(0);
        }
      } catch (_) {}
      return;
    }

    if (isAligned && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const now = Date.now();
      if (now - lastVibratedRef.current > 1500) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch (_) {}
        lastVibratedRef.current = now;
      }
    }
  }, [isAligned, isOpen]);

  // Native Geolocation API Hook (Auto-fetches on modal open)
  const requestNativeGeolocation = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) onShowToast?.('error', language === 'bn' ? 'অসমর্থিত' : 'Unsupported', language === 'bn' ? 'আপনার ডিভাইসে বা ব্রাউজারে জিপিএস সুবিধা সমর্থিত নয়।' : 'GPS is not supported on your device or browser.');
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(Math.round(accuracy));
        setIsUsingGps(true);
        setLocationName(language === 'bn' ? 'সরাসরি ডিভাইস জিপিএস' : 'Direct Device GPS');
        if (!silent) {
          onShowToast?.(
            'success',
            language === 'bn' ? 'জিপিএস অবস্থান সফল' : 'GPS Location Found',
            language === 'bn' ? `সঠিক জিপিএস স্থান পাওয়া গেছে (নির্ভুলতা: ±${toBnNumber(Math.round(accuracy))}মি)।` : `Accurate GPS location found (accuracy: ±${Math.round(accuracy)}m).`
          );
        }
      },
      (err) => {
        setLocatingGps(false);
        if (!silent) {
          onShowToast?.('info', language === 'bn' ? 'জিপিএস অ্যাক্সেস মেলেনি' : 'GPS Access Denied', language === 'bn' ? 'জেলা তালিকা থেকে আপনার অবস্থান নির্বাচন করুন।' : 'Please select your location from the district list.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onShowToast, language]);

  useEffect(() => {
    if (isOpen) {
      requestNativeGeolocation(true);
    }
  }, [isOpen, requestNativeGeolocation]);

  // Extract absolute heading with 3D tilt compensation & screen orientation offset
  const extractAbsoluteHeading = useCallback((e: DeviceOrientationEvent): number | null => {
    // Accumulate motion sweep for 8-figure calibration check if overlay is open
    if (showCalibrationOverlay && e.alpha !== null && e.beta !== null && e.gamma !== null) {
      if (lastOrientationRef.current) {
        const dA = Math.abs(e.alpha - lastOrientationRef.current.alpha);
        const dB = Math.abs(e.beta - lastOrientationRef.current.beta);
        const dG = Math.abs(e.gamma - lastOrientationRef.current.gamma);
        if (dA < 180 && dB < 180 && dG < 180) {
          sweepAccumulatorRef.current += (dA + dB + dG);
          const pct = Math.min(100, Math.round((sweepAccumulatorRef.current / 360) * 100));
          setCalibrationSweep(pct);
          if (pct >= 100) {
            setIsCalibrated(true);
          }
        }
      }
      lastOrientationRef.current = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
    }

    // 1. iOS Safari webkitCompassHeading (True/Magnetic North directly)
    if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
      const iosHeading = Number((e as any).webkitCompassHeading);
      if (!isNaN(iosHeading)) {
        return (iosHeading + 360) % 360;
      }
    }

    // 2. Android / Standard W3C Absolute Orientation
    if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
      if (e.type === 'deviceorientation' && (e as any).absolute !== true) {
         return null; 
      }

      let rawHeading = (360 - e.alpha) % 360;

      let screenAngle = 0;
      if (typeof window !== 'undefined') {
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
          screenAngle = window.screen.orientation.angle;
        } else if (typeof (window as any).orientation === 'number') {
          screenAngle = (window as any).orientation;
        }
      }

      return (rawHeading + screenAngle + 360) % 360;
    }

    return null;
  }, [showCalibrationOverlay]);

  const [retryCompassCount, setRetryCompassCount] = useState<number>(0);

  const requestCompassPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setRetryCompassCount(prev => prev + 1);
        } else {
          setHasCompassSensor(false);
        }
      } catch (err) {
        setHasCompassSensor(false);
      }
    } else {
      setRetryCompassCount(prev => prev + 1);
    }
  };

  // Request & Bind Device Orientation with guaranteed cleanup
  useEffect(() => {
    if (!isOpen) {
      // Ensure all vibration is stopped when closed
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(0);
        }
      } catch (_) {}
      return;
    }

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return;
    }

    let isSubscribed = true;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!isSubscribed) return;
      const heading = extractAbsoluteHeading(e);

      if (heading !== null && !isNaN(heading)) {
        setHasCompassSensor(true);
        
        // Calculate shortest angular distance
        let delta = heading - lastHeadingRef.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        // Apply low-pass filter
        let smoothed = lastHeadingRef.current + 0.15 * delta;
        
        lastHeadingRef.current = (smoothed + 360) % 360;
        
        displayHeadingRef.current += 0.15 * delta;

        setDeviceHeading(Math.round(lastHeadingRef.current));
        setDisplayHeading(displayHeadingRef.current);
      }
    };

    const attachListeners = () => {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    };

    const removeListeners = () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };

    // iOS 13+ permission request
    const initCompass = async () => {
      if (
        typeof (DeviceOrientationEvent as any) !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const response = await (DeviceOrientationEvent as any).requestPermission();
          if (!isSubscribed) return;
          if (response !== 'granted') {
            setHasCompassSensor(false);
            return;
          }
        } catch (err) {
          if (!isSubscribed) return;
          setHasCompassSensor(false);
          return;
        }
      }

      if (isSubscribed) {
        attachListeners();
      }
    };

    initCompass();

    return () => {
      isSubscribed = false;
      removeListeners();
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(0);
        }
      } catch (_) {}
    };
  }, [isOpen, extractAbsoluteHeading, retryCompassCount]);

  // Trigger Calibration Check
  const startCalibrationCheck = () => {
    sweepAccumulatorRef.current = 0;
    setCalibrationSweep(0);
    setShowCalibrationOverlay(true);
  };

  const finishCalibration = () => {
    setIsCalibrated(true);
    setShowCalibrationOverlay(false);
    try {
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    } catch (_) {}
    onShowToast?.('success', language === 'bn' ? 'ক্যালিব্রেশন সফল' : 'Calibration Successful', language === 'bn' ? 'ম্যাগনেটোমিটার সেন্সর সঠিক কিবলা বের করার জন্য প্রস্তুত।' : 'Magnetometer sensor is ready for accurate Qibla detection.');
  };

  // District Selector Change
  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    const coords = DISTRICT_COORDINATES[districtName] || DISTRICT_COORDINATES['Dhaka'];
    setCurrentCoords(coords);
    setIsUsingGps(false);
    setGpsAccuracy(null);
    const districtObj = BANGLADESH_DISTRICTS.find(d => d.district === districtName);
    setLocationName(districtObj ? (language === 'bn' ? districtObj.districtBn : districtObj.district) : districtName);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-gradient-to-br from-[#04241b] via-[#021c15] to-[#01140e] border border-emerald-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-emerald-950/70 text-slate-100 max-h-[94vh] overflow-y-auto flex flex-col justify-between"
        >
          {/* Ambient Lighting */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-emerald-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-800 to-amber-600/80 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'কিবলা কম্পাস ও দিক নির্ণয়' : 'Qibla Compass & Direction'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">QIBLA</span>
                </h3>
                <p className="text-[11px] text-emerald-300/80 font-medium">
                  {language === 'bn' ? `পবিত্র কাবা শরিফের দিক: ${qiblaDesc}` : `Holy Kaaba Direction: ${qiblaDesc}`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-emerald-300/80 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="relative z-10 grid grid-cols-2 gap-1.5 p-1 bg-[#021812]/90 border border-emerald-800/60 rounded-2xl my-3">
            <button
              onClick={() => setActiveTab('compass')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'compass'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-md'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-300" />
              <span>{language === 'bn' ? 'লাইভ কম্পাস' : 'Live Compass'}</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-md'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              <Navigation2 className="w-4 h-4 text-amber-300" />
              <span>{language === 'bn' ? 'সহজ দিক-নির্দেশিকা' : 'Visual Guide'}</span>
            </button>
          </div>

          {/* Location & GPS Bar */}
          <div className="relative z-10 p-3 rounded-2xl bg-[#021812]/90 border border-emerald-800/60 space-y-2 mb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  {formatLocationName(locationName, language)}
                </span>
                {isUsingGps && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-mono">
                    GPS {gpsAccuracy !== null ? `(±${formatNum(gpsAccuracy)}${language === 'bn' ? 'মি' : 'm'})` : ''}
                  </span>
                )}
              </div>

              <button
                onClick={() => requestNativeGeolocation(false)}
                disabled={locatingGps}
                className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-700/60 text-amber-300 px-2.5 py-1 rounded-xl cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${locatingGps ? 'animate-spin' : ''}`} />
                <span>{locatingGps ? (language === 'bn' ? 'খোঁজা হচ্ছে...' : 'Locating...') : (language === 'bn' ? 'জিপিএস লোকেশন' : 'GPS Location')}</span>
              </button>
            </div>

            {/* District Dropdown Selector */}
            <div className="flex items-center gap-2 pt-1 border-t border-emerald-900/60 text-xs">
              <span className="text-[11px] text-emerald-300/70 shrink-0">{language === 'bn' ? 'জেলা:' : 'District:'}</span>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-[#031d16] border border-emerald-700/50 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
              >
                {BANGLADESH_DISTRICTS.map((d, idx) => (
                  <option key={`${d.district}-${idx}`} value={d.district}>
                    {language === 'bn' ? `${d.districtBn} (${d.district})` : `${d.district} (${d.districtBn})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAB 1: LIVE COMPASS MODE */}
          {activeTab === 'compass' && (
            <div className="relative z-10 flex flex-col items-center">
              {/* Dynamic Status / Turning Instruction Pill */}
              <div className="mb-2.5 w-full flex justify-center">
                {isAligned ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-xs font-bold animate-pulse shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bn' ? 'আলহামদুলিল্লাহ! আপনি কিবলামুখী হয়েছেন' : 'Alhamdulillah! You are facing Qibla'}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs font-semibold">
                    {diff > 0 ? (
                      <>
                        <ArrowRight className="w-4 h-4 text-amber-400 animate-bounce" />
                        <span>
                          {language === 'bn' 
                            ? <>ফোনটি <strong className="text-amber-300">{formatNum(Math.round(Math.abs(diff)))}° ডানে</strong> ঘুরান</>
                            : <>Turn phone <strong className="text-amber-300">{formatNum(Math.round(Math.abs(diff)))}° Right</strong></>}
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="w-4 h-4 text-amber-400 animate-bounce" />
                        <span>
                          {language === 'bn'
                            ? <>ফোনটি <strong className="text-amber-300">{formatNum(Math.round(Math.abs(diff)))}° বামে</strong> ঘুরান</>
                            : <>Turn phone <strong className="text-amber-300">{formatNum(Math.round(Math.abs(diff)))}° Left</strong></>}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Circular Compass Dial */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-1">
                {/* Outer Glow Ring */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    isAligned
                      ? 'ring-4 ring-emerald-400/80 shadow-[0_0_40px_rgba(52,211,153,0.4)]'
                      : 'ring-2 ring-amber-400/30'
                  }`}
                />

                {/* Rotating Dial */}
                <div
                  className="w-full h-full rounded-full bg-gradient-to-b from-[#022018] via-[#011a13] to-[#01140e] border-4 border-[#073b2c] relative shadow-inner overflow-hidden transition-transform duration-200 ease-out"
                  style={{
                    transform: `rotate(${-effectiveDisplayHeading}deg)`
                  }}
                >
                  {/* Degree Ticks */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => (
                    <div
                      key={`qibla-deg-${deg}-${idx}`}
                      className="absolute top-0 left-1/2 -ml-[1px] h-full flex flex-col justify-between py-2 pointer-events-none"
                      style={{ transform: `rotate(${deg}deg)` }}
                    >
                      <div
                        className={`w-[2px] ${
                          deg % 90 === 0
                            ? 'h-3.5 bg-amber-400'
                            : 'h-2 bg-emerald-600/50'
                        }`}
                      />
                      <div
                        className={`w-[2px] ${
                          deg % 90 === 0
                            ? 'h-3.5 bg-amber-400'
                            : 'h-2 bg-emerald-600/50'
                        }`}
                      />
                    </div>
                  ))}

                  {/* Cardinal Points with Clear Bengali / English Names */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    <span className="block text-[11px] font-black text-rose-400 font-mono">N</span>
                    <span className="block text-[9px] font-bold text-rose-300 -mt-1">{language === 'bn' ? 'উত্তর' : 'North'}</span>
                  </div>

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="block text-[11px] font-black text-emerald-300 font-mono">E</span>
                    <span className="block text-[9px] font-bold text-emerald-300/80 -mt-1">{language === 'bn' ? 'পূর্ব' : 'East'}</span>
                  </div>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    <span className="block text-[9px] font-bold text-emerald-300/80 mb-0.5">{language === 'bn' ? 'দক্ষিণ' : 'South'}</span>
                    <span className="block text-[11px] font-black text-emerald-400 font-mono -mt-1">S</span>
                  </div>

                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="block text-[11px] font-black text-emerald-300 font-mono">W</span>
                    <span className="block text-[9px] font-bold text-emerald-300/80 -mt-1">{language === 'bn' ? 'পশ্চিম' : 'West'}</span>
                  </div>

                  {/* Sun Marker on Dial */}
                  {sunData.isDaytime && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none"
                      style={{ transform: `rotate(${sunData.azimuth}deg)` }}
                    >
                      <div className="pt-2 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border border-amber-300 text-[10px] flex items-center justify-center shadow-md animate-pulse">
                          ☀️
                        </div>
                        <span className="text-[7px] font-bold text-amber-300 bg-black/70 border border-amber-500/20 px-1 py-0.2 rounded mt-0.5">
                          {language === 'bn' ? 'সূর্য' : 'Sun'} ({formatNum(Math.round(sunData.azimuth))}°)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Kaaba Marker on Dial */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none"
                    style={{ transform: `rotate(${qiblaBearing}deg)` }}
                  >
                    <div className="pt-3 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-amber-200 text-[#021812] flex items-center justify-center font-bold text-base shadow-lg shadow-amber-500/50">
                        🕋
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-300 -mt-0.5" />
                      <span className="text-[9px] font-black text-amber-300 tracking-wider bg-black/80 px-1.5 py-0.5 rounded border border-amber-400/40 mt-0.5">
                        {language === 'bn' ? 'কিবলা' : 'Qibla'} ({formatNum(qiblaBearing)}°)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Hub & Fixed Phone Forward Pointer */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute top-0 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] border-b-rose-500" />
                    <div className="w-0.5 h-4 bg-rose-500" />
                  </div>

                  <div className="w-16 h-16 rounded-full bg-[#021812] border-2 border-amber-400 shadow-2xl flex flex-col items-center justify-center text-center p-1 z-20">
                    <span className="text-[9px] text-emerald-300/80 uppercase font-bold leading-none">
                      {language === 'bn' ? 'কিবলা' : 'Qibla'}
                    </span>
                    <span className="text-sm font-black text-amber-300 leading-tight">
                      {formatNum(qiblaBearing)}°
                    </span>
                    <span className="text-[8.5px] text-emerald-400 font-medium">
                      W-NW
                    </span>
                  </div>
                </div>
              </div>

              {/* Magnetometer Calibration Check Bar */}
              <div className="w-full mt-2.5 p-2.5 rounded-2xl bg-[#021a14] border border-emerald-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCalibrated ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-ping'}`} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-white block truncate">
                      {isCalibrated 
                        ? (language === 'bn' ? '✓ ম্যাগনেটোমিটার ক্যালিব্রেটেড' : '✓ Magnetometer Calibrated') 
                        : (language === 'bn' ? '⚠️ সেন্সর ক্যালিব্রেশন প্রয়োজন' : '⚠️ Sensor Calibration Required')}
                    </span>
                    <span className="text-[10px] text-emerald-300/70 block truncate">
                      {isCalibrated 
                        ? (language === 'bn' ? 'চুম্বকীয় সেন্সর সম্পূর্ণ সঠিক' : 'Magnetic sensor is accurate')
                        : (language === 'bn' ? 'বাতাসে ৮ (8) গতিতে ফোন ঘুরিয়ে নিখুঁত করুন' : 'Calibrate phone in figure-8 motion')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={startCalibrationCheck}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-[#021812] font-extrabold text-[11px] cursor-pointer shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>
                    {isCalibrated 
                      ? (language === 'bn' ? 'পুনরায় ক্যালিব্রেট' : 'Recalibrate') 
                      : (language === 'bn' ? '৮-গতিতে ক্যালিব্রেট' : 'Figure-8 Calibrate')}
                  </span>
                </button>
              </div>

              {/* Sensor Status / Permission Trigger */}
              {!hasCompassSensor ? (
                <div className="w-full mt-2 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200/90 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                      {language === 'bn' ? 'লাইভ কম্পাস চালু হচ্ছে না?' : 'Live compass not active?'}
                    </span>
                    <button
                      onClick={requestCompassPermission}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                    >
                      {language === 'bn' ? 'কম্পাস সক্রিয় করুন' : 'Enable Compass'}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                    {language === 'bn' 
                      ? 'আপনার মোবাইল বা আইফোনে প্রথমবার কম্পাস সেন্সরের অনুমতি দিতে উপরের বোতামে চাপুন। যদি ব্রাউজারে অনুমতি ব্লক করা থাকে, তবে দয়া করে ব্রাউজার সেটিংসে সেন্সর অ্যাক্সেস চালু করুন।'
                      : 'Tap the button above to grant compass sensor permissions on your mobile or iPhone. If blocked by the browser, please allow motion sensors in browser settings.'}
                  </p>
                </div>
              ) : (
                <div className="w-full mt-1.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80 px-1">
                    <span>{language === 'bn' ? `লাইভ হেডিং: ${formatNum(effectiveHeading)}°` : `Live Heading: ${formatNum(effectiveHeading)}°`}</span>
                    <button
                      onClick={() => setShowCalibrationHelp(!showCalibrationHelp)}
                      className="text-amber-300 underline cursor-pointer hover:text-white"
                    >
                      {language === 'bn' ? 'দিক মিলছে না?' : 'Direction mismatch?'}
                    </button>
                  </div>
                </div>
              )}

              {/* Calibration Help Banner */}
              {showCalibrationHelp && (
                <div className="w-full mt-2 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'bn' ? 'দিক সঠিক করার উপায়:' : 'How to calibrate direction:'}</span>
                  </div>
                  <ul className="text-[11px] leading-relaxed text-amber-200/90 list-disc pl-4 space-y-1">
                    <li>
                      <strong>{language === 'bn' ? 'ডিভাইস সমতল রাখুন:' : 'Keep device flat:'}</strong> {language === 'bn' ? 'মোবাইলটি মেঝের সাথে সম্পূর্ণ ফ্ল্যাট রাখুন।' : 'Hold your mobile completely flat parallel to the ground.'}
                    </li>
                    <li>
                      <strong>{language === 'bn' ? '৮-আকৃতির গতি:' : 'Figure-8 motion:'}</strong> {language === 'bn' ? "উপরে '৮-গতিতে ক্যালিব্রেট' চাপুন এবং ফোন বাতাসে ৮ (8) এর মতো ঘুরান।" : "Tap 'Figure-8 Calibrate' above and wave the phone in a figure-8 in the air."}
                    </li>
                    <li>
                      <strong>{language === 'bn' ? 'সূর্য দিয়ে দিক মেলান:' : 'Align with the Sun:'}</strong> {language === 'bn' ? 'দিনের বেলা ডায়ালের ☀️ সূর্য আইকনকে আকাশের বাস্তব সূর্যের দিকে সোজা করুন।' : 'During daytime, point the ☀️ Sun icon toward the real sun in the sky.'}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VISUAL DIRECTION GUIDE (NO SENSOR NEEDED) */}
          {activeTab === 'guide' && (
            <div className="relative z-10 space-y-3 py-1">
              {/* Primary Visual Direction Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#063326] to-[#021f17] border border-amber-500/40 shadow-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Sunset className="w-5 h-5 text-amber-400" />
                  <span>{language === 'bn' ? 'কিবলা নির্ধারণের সাধারণ সহজ নিয়ম:' : 'Simple Guide to Determining Qibla:'}</span>
                </div>

                <p className="text-xs text-emerald-100 leading-relaxed">
                  {language === 'bn' 
                    ? <>বাংলাদেশ থেকে পবিত্র কাবা শরিফ হলো <strong className="text-amber-300">পশ্চিম (West)</strong> দিক থেকে সামান্য উত্তর দিকে—অর্থাৎ <strong className="text-white font-bold">{qiblaDesc}</strong>।</>
                    : <>From Bangladesh, the Holy Kaaba is slightly north of <strong className="text-amber-300">West</strong>—that is <strong className="text-white font-bold">{qiblaDesc}</strong>.</>}
                </p>

                {/* Visual Sun/Sunset Angle Illustration */}
                <div className="p-3 rounded-xl bg-[#021812]/90 border border-emerald-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-900 pb-1.5">
                    <span className="text-emerald-300/80">{language === 'bn' ? '১. পশ্চিম দিক (সূর্য অস্ত যাওয়ার দিক):' : '1. Due West (Sunset Direction):'}</span>
                    <span className="font-mono text-amber-300 font-bold">{formatNum(270)}°</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-emerald-900 pb-1.5">
                    <span className="text-emerald-300/80">{language === 'bn' ? `২. ${locationName} থেকে কিবলা কোণ:` : `2. Qibla angle from ${locationName}:`}</span>
                    <span className="font-mono text-emerald-300 font-bold">{formatNum(qiblaBearing)}° ({westDiffText})</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300/80">{language === 'bn' ? '৩. মক্কা থেকে দূরত্ব:' : '3. Distance from Makkah:'}</span>
                    <span className="font-mono text-amber-300 font-bold">~{formatNum(kaabaDistanceKm.toLocaleString())} {language === 'bn' ? 'কিমি' : 'km'}</span>
                  </div>
                </div>

                {/* Practical Direction Summary Box */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
                  <span className="font-bold text-amber-300 block">{language === 'bn' ? '💡 প্র্যাক্টিক্যাল টিপস:' : '💡 Practical Tips:'}</span>
                  <p className="text-[11px] text-amber-100/90">
                    {language === 'bn' 
                      ? <>আপনি যদি সূর্য যেদিকে অস্ত যায় (পশ্চিম দিক) সেদিকে মুখ করে দাঁড়ান, তবে আপনার শরীরকে <strong>সামান্য {practicalAngleText}</strong> ঘুরিয়ে দাঁড়ালে সঠিক কিবলামুখী হওয়া যাবে।</>
                      : <>If you stand facing sunset (West), turn your body <strong>slightly {practicalAngleText}</strong> to face the exact Qibla.</>}
                  </p>
                </div>
              </div>

              {/* Mosques Standard Info */}
              <div className="p-3 rounded-2xl bg-[#021812]/90 border border-emerald-800/50 text-xs text-emerald-300/80 space-y-1">
                <span className="font-bold text-emerald-200 block">{language === 'bn' ? '🕌 মসজিদ ভিত্তিক কিবলা:' : '🕌 Mosque Qibla:'}</span>
                <p className="text-[11px] leading-relaxed">
                  {language === 'bn'
                    ? 'বাংলাদেশের সকল অনুমোদিত মসজিদের মেহরাব এই সুনির্দিষ্ট পশ্চিম-উত্তর-পশ্চিম (২৭৭°-২৭৮°) কোণেই নির্মিত।'
                    : 'Mihrabs of all recognized mosques across Bangladesh are built aligned precisely to this West-Northwest (277°-278°) bearing.'}
                </p>
              </div>
            </div>
          )}

          {/* Footer Distance Strip */}
          <div className="relative z-10 mt-3 grid grid-cols-2 gap-2 pt-2.5 border-t border-emerald-800/50 text-center">
            <div className="bg-[#021812]/80 border border-emerald-800/50 rounded-2xl p-2">
              <span className="text-[9.5px] text-emerald-300/70 block uppercase font-bold">
                {language === 'bn' ? 'কাবার দূরত্ব' : 'Kaaba Distance'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                ~{formatNum(kaabaDistanceKm.toLocaleString())} {language === 'bn' ? 'কিমি' : 'km'}
              </span>
            </div>

            <div className="bg-[#021812]/80 border border-emerald-800/50 rounded-2xl p-2">
              <span className="text-[9.5px] text-emerald-300/70 block uppercase font-bold">
                {language === 'bn' ? 'দিক ও কোণ' : 'Direction & Angle'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-200">
                {formatNum(qiblaBearing)}° (W-NW)
              </span>
            </div>
          </div>

          {/* 8-FIGURE MOTION CALIBRATION OVERLAY */}
          <AnimatePresence>
            {showCalibrationOverlay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-30 bg-[#021812]/95 backdrop-blur-xl rounded-3xl p-5 flex flex-col justify-between text-center"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-5 h-5 text-amber-400 animate-spin" />
                    <span className="text-sm font-extrabold text-white">
                      {language === 'bn' ? '৮-আকৃতির সেন্সর ক্যালিব্রেশন' : 'Figure-8 Sensor Calibration'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCalibrationOverlay(false)}
                    className="p-1 text-emerald-300 hover:text-white rounded-lg bg-emerald-900/40 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Animated Figure-8 Loop Visual */}
                <div className="my-auto flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-48 h-28 flex items-center justify-center">
                    {/* SVG Figure-8 Infinity Path */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100">
                      <path
                        d="M 50 50 C 50 20, 10 20, 10 50 C 10 80, 50 80, 50 50 C 50 20, 90 20, 90 50 C 90 80, 50 80, 50 50 Z"
                        transform="scale(2, 1) translate(-25, 0)"
                        fill="none"
                        stroke="rgba(52, 211, 153, 0.25)"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 50 50 C 50 20, 10 20, 10 50 C 10 80, 50 80, 50 50 C 50 20, 90 20, 90 50 C 90 80, 50 80, 50 50 Z"
                        transform="scale(2, 1) translate(-25, 0)"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="4"
                        strokeDasharray="10 15"
                        strokeLinecap="round"
                        className="animate-[dash_3s_linear_infinite]"
                      />
                    </svg>

                    {/* Oscillating Phone Center Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        animate={{
                          rotate: [0, 25, 0, -25, 0],
                          scale: [1, 1.1, 1, 1.1, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        className="w-10 h-16 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-white shadow-xl flex items-center justify-center text-emerald-950 font-bold"
                      >
                        <Smartphone className="w-6 h-6" />
                      </motion.div>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xs">
                    {language === 'bn' 
                      ? <>আপনার ফোনটিকে বাতাসে <strong className="text-amber-300 font-bold">ইংরেজি ৮ (8) সংকেতের মতো</strong> ২-৩ বার ঘুরিয়ে নিন। এটি ম্যাগনেটোমিটার সেন্সরের চৌম্বক বিচ্যুতি দূর করে সঠিক কিবলা কোণ নির্ধারণ করবে।</>
                      : <>Wave your phone in the air in a <strong className="text-amber-300 font-bold">figure-8 motion</strong> 2-3 times. This clears magnetic interference and calibrates the sensor for exact Qibla direction.</>}
                  </p>

                  {/* Sweep Progress Bar */}
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                      <span>{language === 'bn' ? 'সেন্সর রোটেশন ট্র্যাকার:' : 'Sensor Rotation Tracker:'}</span>
                      <span className="text-amber-300 font-mono">{formatNum(calibrationSweep)}%</span>
                    </div>
                    <div className="w-full h-3 bg-emerald-950 rounded-full border border-emerald-800 overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${calibrationSweep}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Complete Action */}
                <button
                  onClick={finishCalibration}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/50 cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  <span>{language === 'bn' ? 'ক্যালিব্রেশন সম্পূর্ণ করুন' : 'Complete Calibration'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


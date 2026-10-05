import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Volume2, VolumeX, Sparkles, Plus } from 'lucide-react';
import { toBnNumber } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';
import { journeyDataService } from '../services/journeyDataService';

interface TasbihPreset {
  id: string;
  nameBn: string;
  nameEn: string;
  nameAr: string;
  target: number;
}

const PRESETS: TasbihPreset[] = [
  { id: 'subhanallah', nameBn: 'সুবহানাল্লাহ', nameEn: 'SubhanAllah', nameAr: 'سُبْحَانَ ٱللَّٰهِ', target: 33 },
  { id: 'alhamdulillah', nameBn: 'আলহামদুলিল্লাহ', nameEn: 'Alhamdulillah', nameAr: 'ٱلْحَمْدُ لِلَّٰهِ', target: 33 },
  { id: 'allahuakbar', nameBn: 'আল্লাহু আকবার', nameEn: 'Allahu Akbar', nameAr: 'ٱللَّٰهُ أَكْبَرُ', target: 34 },
  { id: 'astaghfirullah', nameBn: 'আস্তাগফিরুল্লাহ', nameEn: 'Astaghfirullah', nameAr: 'أَسْتَغْفِرُ ٱللَّٰهَ', target: 100 },
  { id: 'la_ilaha_illallah', nameBn: 'লা ইলাহা ইল্লাল্লাহ', nameEn: 'La Ilaha Illallah', nameAr: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', target: 100 }
];

interface DigitalTasbihModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DigitalTasbihModal: React.FC<DigitalTasbihModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const { language } = useLanguage();
  const [selectedPreset, setSelectedPreset] = useState<TasbihPreset>(PRESETS[0]);
  const [count, setCount] = useState<number>(0);
  const [totalCycles, setTotalCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [isRippleActive, setIsRippleActive] = useState<boolean>(false);
  
  // Custom Dhikr states
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customTarget, setCustomTarget] = useState<number>(33);

  const formatNum = (num: number) => {
    return language === 'bn' ? toBnNumber(num) : num.toString();
  };

  // Load saved counts from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cave_companions_tasbih_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.presetId) {
          const found = PRESETS.find(p => p.id === parsed.presetId);
          if (found) {
            setSelectedPreset(found);
          } else if (parsed.customName) {
            setSelectedPreset({
              id: 'custom',
              nameBn: parsed.customName,
              nameEn: parsed.customName,
              nameAr: 'ذِكْرٌ خَاصٌّ',
              target: parsed.customTarget || 33
            });
          }
        }
        setCount(parsed.count || 0);
        setTotalCycles(parsed.totalCycles || 0);
      }
    } catch (e) {
      console.warn('Error loading tasbih state:', e);
    }
  }, [isOpen]);

  // Save state whenever it changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stateToSave = {
        presetId: selectedPreset.id,
        count,
        totalCycles,
        customName: selectedPreset.id === 'custom' ? selectedPreset.nameBn : undefined,
        customTarget: selectedPreset.id === 'custom' ? selectedPreset.target : undefined
      };
      localStorage.setItem('cave_companions_tasbih_state_v1', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Error saving tasbih state:', e);
    }
  }, [count, totalCycles, selectedPreset, isOpen]);

  // Audio Feedback
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime); // Quick pleasant beep
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (_) {}
  };

  const playTargetSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pleasant double chime
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (_) {}
  };

  // Main Count function
  const handleTap = () => {
    playClickSound();
    setIsRippleActive(true);
    setTimeout(() => setIsRippleActive(false), 150);

    // Haptic Feedback
    if (vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (_) {}
    }

    // Automatically sync Tasbih tap to My Cave Journey
    const todayStr = new Date().toISOString().split('T')[0];
    journeyDataService.addTasbihCount(todayStr, 1);

    const nextCount = count + 1;
    if (nextCount >= selectedPreset.target) {
      // Reached Target
      setCount(0);
      setTotalCycles(prev => prev + 1);
      playTargetSound();
      
      if (vibrationEnabled && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]); // Special target double vibration
        } catch (_) {}
      }

      if (onShowToast) {
        const title = language === 'bn' ? selectedPreset.nameBn : selectedPreset.nameEn;
        const msg = language === 'bn'
          ? `মাশাআল্লাহ! "${title}" এর ${formatNum(selectedPreset.target)} বারের চক্র সম্পন্ন হয়েছে।`
          : `MashaAllah! Completed ${formatNum(selectedPreset.target)} cycle of "${title}".`;
        onShowToast(msg, 'success');
      }
    } else {
      setCount(nextCount);
    }
  };

  // Reset function
  const handleReset = () => {
    if (vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch (_) {}
    }
    setCount(0);
    setTotalCycles(0);
    if (onShowToast) {
      onShowToast(language === 'bn' ? 'তাসবীহ গণকটি রিসেট করা হয়েছে।' : 'Tasbih counter has been reset.', 'info');
    }
  };

  // Apply Custom Dhikr
  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    const custom: TasbihPreset = {
      id: 'custom',
      nameBn: customName.trim(),
      nameEn: customName.trim(),
      nameAr: 'ذِكْرٌ خَاصٌّ',
      target: Number(customTarget) || 33
    };
    setSelectedPreset(custom);
    setCount(0);
    setTotalCycles(0);
    setShowCustomInput(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#021c15] via-[#01140e] to-[#000d09] border border-emerald-800/60 shadow-2xl p-5 text-white z-50"
          >
            {/* Decorative glowing header background */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/40 text-emerald-400 hover:text-white cursor-pointer active:scale-95 transition z-50"
              title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center relative z-10 mb-4">
              <h2 className="text-base font-bold text-amber-300">
                {language === 'bn' ? 'ডিজিটাল তাসবীহ' : 'Digital Tasbih'}
              </h2>
            </div>

          {/* Preset Selector Panel */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400/80">
                {language === 'bn' ? 'জিকির সিলেক্ট করুন:' : 'Select Dhikr:'}
              </span>
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="text-[11px] text-amber-300 font-bold hover:text-white flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'bn' ? 'কাস্টম জিকির' : 'Custom Dhikr'}
              </button>
            </div>

            {showCustomInput ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/50 space-y-3">
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'জিকিরের নাম লিখুন (উদা: সুবহানাল্লাহ)' : 'Enter Dhikr name (e.g. SubhanAllah)'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#01140e] border border-emerald-800 focus:border-amber-400 outline-none text-white"
                />
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-emerald-300 block mb-1">
                      {language === 'bn' ? 'টার্গেট সংখ্যা' : 'Target Count'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={customTarget}
                      onChange={(e) => setCustomTarget(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#01140e] border border-emerald-800 focus:border-amber-400 outline-none text-white"
                    />
                  </div>
                  <button
                    onClick={handleSaveCustom}
                    className="px-4 py-2 mt-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold cursor-pointer shadow"
                  >
                    {language === 'bn' ? 'সেভ করুন' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 pr-1 no-scrollbar scroll-smooth">
                {PRESETS.map((preset, idx) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <button
                      key={`tasbih-pre-${preset.id}-${idx}`}
                      onClick={() => {
                        setSelectedPreset(preset);
                        setCount(0);
                        setTotalCycles(0);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold shrink-0 transition cursor-pointer flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                          : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300/80 hover:text-white'
                      }`}
                    >
                      <span>{language === 'bn' ? preset.nameBn : preset.nameEn}</span>
                      <span className="text-[9px] opacity-70">
                        {language === 'bn' ? `টার্গেট: ${formatNum(preset.target)}` : `Target: ${formatNum(preset.target)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Dhikr Arabic Header */}
          <div className="text-center py-4 relative z-10 space-y-1">
            <h3 className="text-xl font-bold font-serif text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.15)]">
              {selectedPreset.nameAr}
            </h3>
            <p className="text-xs text-emerald-300 font-semibold">
              {language === 'bn' ? selectedPreset.nameBn : selectedPreset.nameEn}
            </p>
          </div>

          {/* Main Visual Counter Ring */}
          <div className="flex flex-col items-center justify-center py-5 relative z-10">
            {/* The giant reactive counter disk */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              
              {/* Pulsing ring aura */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-800/20" />
              <div 
                className={`absolute inset-3 rounded-full border border-emerald-500/10 transition-all duration-300 ${
                  isRippleActive ? 'scale-110 opacity-100 border-amber-400/40' : 'scale-100 opacity-50'
                }`} 
              />
              
              {/* Outer dial gauge */}
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="112"
                  className="stroke-emerald-950/60"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="112"
                  className="stroke-amber-400 transition-all duration-150 ease-out"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 112}`}
                  strokeDashoffset={`${2 * Math.PI * 112 * (1 - count / selectedPreset.target)}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Central Trigger Action Button */}
              <button
                onClick={handleTap}
                className="absolute w-48 h-48 rounded-full bg-gradient-to-b from-[#033123] to-[#01140e] border-4 border-emerald-800 hover:border-emerald-700 text-white shadow-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform overflow-hidden group select-none"
              >
                {/* Internal tap animation overlay */}
                <div className={`absolute inset-0 bg-amber-400/10 opacity-0 transition-opacity duration-100 ${
                  isRippleActive ? 'opacity-100' : ''
                }`} />

                <span className="text-[10px] tracking-wider text-emerald-400/80 font-bold uppercase block mb-1">
                  {language === 'bn' ? 'বর্তমান জপ' : 'Current Count'}
                </span>
                
                <span className="text-5xl font-black font-mono tracking-widest text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                  {formatNum(count)}
                </span>

                <div className="flex items-center gap-1 text-[10px] text-emerald-300/80 mt-2 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  <span className="text-[8px] uppercase tracking-wider">
                    {language === 'bn' ? 'টার্গেট:' : 'Target:'}
                  </span>
                  <span>{formatNum(selectedPreset.target)}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Cycles and Secondary Controls */}
          <div className="relative z-10 grid grid-cols-3 items-center justify-between gap-4 mt-2 px-2">
            
            {/* Cycle Counter */}
            <div className="p-2 rounded-2xl bg-emerald-950/40 border border-emerald-900/40 flex flex-col items-center text-center">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">
                {language === 'bn' ? 'পূর্ণ চক্র' : 'Completed Cycles'}
              </span>
              <span className="text-sm font-black text-white mt-0.5">
                {formatNum(totalCycles)}
              </span>
            </div>

            {/* Tap Feedback Settings */}
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-2xl bg-emerald-950/40 border border-emerald-900/40">
              {/* Sound Option */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  soundEnabled ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-500 hover:text-white'
                }`}
                title={soundEnabled ? (language === 'bn' ? 'সাউন্ড অন' : 'Sound On') : (language === 'bn' ? 'সাউন্ড অফ' : 'Sound Off')}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Vibration Option */}
              <button
                onClick={() => setVibrationEnabled(!vibrationEnabled)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  vibrationEnabled ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-500 hover:text-white'
                }`}
                title={vibrationEnabled ? (language === 'bn' ? 'ভাইব্রেশন অন' : 'Vibration On') : (language === 'bn' ? 'ভাইব্রেশন অফ' : 'Vibration Off')}
              >
                {vibrationEnabled ? (
                  <span className="font-bold text-[10px]">{language === 'bn' ? 'কম্পন' : 'Vibrate'}</span>
                ) : (
                  <span className="text-emerald-600 line-through text-[10px] font-bold">{language === 'bn' ? 'কম্পন' : 'Vibrate'}</span>
                )}
              </button>
            </div>

            {/* Reset Controller */}
            <button
              onClick={handleReset}
              className="p-2 rounded-2xl bg-emerald-950/40 hover:bg-red-950/20 hover:text-red-400 border border-emerald-900/40 hover:border-red-900/30 text-emerald-300 flex flex-col items-center text-center cursor-pointer transition active:scale-95"
              title={language === 'bn' ? 'রিসেট করুন' : 'Reset'}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">
                {language === 'bn' ? 'রিসেট' : 'Reset'}
              </span>
            </button>
          </div>

          {/* Deep Offline Caching Note Footer */}
          <div className="relative z-10 pt-4 mt-4 border-t border-emerald-900/40 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70 text-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              {language === 'bn'
                ? 'সম্পূর্ণ অফলাইনে অটো-সেভ করা থাকে এবং রিয়েল-টাইমে সেভ হয়।'
                : 'Auto-saved offline in real-time.'}
            </span>
          </div>

        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DigitalTasbihModal;

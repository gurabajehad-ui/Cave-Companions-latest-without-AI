import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface BottomNavProps {
  activeTab: ActiveTab | string;
  setActiveTab?: (tab: ActiveTab) => void;
  onChangeTab?: (tab: ActiveTab) => void;
}

// 🕌 Pristine Vector Mosque Icon matching user's requested 🕌 logo
const MosqueIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.85" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Crescent Finial Top Needle */}
    <path d="M12 2v1.75" />
    {/* Central Onion Dome */}
    <path d="M12 3.75c-2.8 0-5 2.4-5 5.5v1.25h10V9.25c0-3.1-2.2-5.5-5-5.5z" />
    {/* Left Minaret & Tower */}
    <path d="M4 10.5V6.5l1.5-1.5L7 6.5v4" />
    <path d="M4.25 10.5v9" />
    {/* Right Minaret & Tower */}
    <path d="M17 10.5V6.5l1.5-1.5L20 6.5v4" />
    <path d="M19.75 10.5v9" />
    {/* Central Arched Doorway / Mihrab */}
    <path d="M9.5 19.5v-3.75a2.5 2.5 0 0 1 5 0v3.75" />
    {/* Ground Baseline */}
    <path d="M2.5 19.5h19" />
  </svg>
);

// ✨ Tokens 4-Point Sparkle Icon matching reference image
const TokensSparkleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.85" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Primary 4-Point Star */}
    <path d="M11.5 2.5c.4 3.6 2.8 6 6.5 6.5-3.7.5-6.1 2.9-6.5 6.5-.4-3.6-2.8-6-6.5-6.5 3.7-.5 6.1-2.9 6.5-6.5z" />
    {/* Small decorative dot at lower-left */}
    <circle cx="6.5" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
    {/* Accent Plus Sparkle at upper-right */}
    <path d="M19.5 3.5v3m-1.5-1.5h3" strokeWidth="1.6" />
  </svg>
);

// 🏬 Partner Shops Storefront Icon matching reference image
const StorefrontIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.85" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Roof Awning Scallops */}
    <path d="M3.5 9.5l1.2-5h14.6l1.2 5" />
    <path d="M3.5 9.5c0 1.2 1 2 2.2 2s2.1-.8 2.1-2c0 1.2 1 2 2.1 2s2.1-.8 2.1-2c0 1.2 1 2 2.1 2s2.1-.8 2.1-2c0 1.2 1 2 2.2 2s2.2-.8 2.2-2" />
    {/* Store Walls & Door */}
    <path d="M4.5 11.5v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8" />
    <path d="M10 20.5v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5.5" />
  </svg>
);

// 🛍️ Cave Market Bag Icon matching reference image
const MarketToteIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.85" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Structured Tote Bag */}
    <path d="M5.5 8.5L7 3.5h10l1.5 5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19.5v-11z" />
    {/* Inverted Curved Loop Handle */}
    <path d="M9.5 11.5a2.5 2.5 0 0 0 5 0" />
  </svg>
);

// 👤 My Cave User Profile Icon matching reference image
const UserProfileIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.85" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    {/* Head circle */}
    <circle cx="12" cy="7.5" r="3.75" />
    {/* Shoulders curve */}
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);

export const BottomNav: React.FC<BottomNavProps> = React.memo(({
  activeTab,
  setActiveTab,
  onChangeTab
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Optimistic tab state for instantaneous 0ms feedback without waiting on heavy page tree re-renders
  const [optimisticTab, setOptimisticTab] = useState<ActiveTab | string>(activeTab);

  useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  // Scroll direction detection for auto-hide on scroll down and reveal on scroll up
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'home', label: isBn ? 'হোম' : 'Home', icon: MosqueIcon },
    { id: 'tokens', label: isBn ? 'টোকেন' : 'Tokens', icon: TokensSparkleIcon },
    { id: 'shops', label: isBn ? 'শপ' : 'Shops', icon: StorefrontIcon },
    { id: 'market', label: isBn ? 'মার্কেট' : 'Market', icon: MarketToteIcon },
    { id: 'profile', label: isBn ? 'আমার কেভ' : 'My Cave', icon: UserProfileIcon },
  ];

  // Reset scroll and ensure visibility whenever tab changes
  useEffect(() => {
    setIsVisible(true);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [activeTab]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const prevScrollY = lastScrollYRef.current;
          const delta = currentScrollY - prevScrollY;

          // Always visible near top of page
          if (currentScrollY <= 50) {
            setIsVisible(true);
          } else if (delta > 8 && currentScrollY > 80) {
            // Scrolling down past threshold -> hide
            setIsVisible(false);
          } else if (delta < -8) {
            // Scrolling up -> show
            setIsVisible(true);
          }

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleTabSelect = (tabId: ActiveTab) => {
    if (tabId === optimisticTab) return;

    // 1. Instant optimistic visual feedback in 0ms (no tap latency, no waiting)
    setOptimisticTab(tabId);

    // 2. Schedule heavy page tree switch via startTransition so it doesn't block the circle highlight
    React.startTransition(() => {
      if (typeof setActiveTab === 'function') {
        setActiveTab(tabId);
      }
      if (typeof onChangeTab === 'function') {
        onChangeTab(tabId);
      }
    });
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[110%] opacity-0 pointer-events-none'
      }`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Full-Width Liquid Glass Navigation Bar flush to bottom */}
      <nav 
        aria-label="Bottom Navigation"
        className="relative w-full bg-gradient-to-b from-[#052d22]/95 via-[#032018]/98 to-[#02140f] backdrop-blur-2xl border-t border-emerald-400/30 shadow-[0_-10px_35px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.25)] px-2 sm:px-4 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0.65rem))] overflow-hidden select-none"
        style={{ contain: 'layout style' }}
      >
        {/* Top Specular Edge Highlight (Glossy Sheen across full width) */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent pointer-events-none" />

        {/* Ambient Liquid Internal Glow */}
        <div className="absolute -top-6 left-1/4 right-1/4 h-12 bg-emerald-400/10 blur-xl pointer-events-none rounded-full" />

        {/* Tab Buttons Track */}
        <div className="relative z-10 max-w-2xl mx-auto grid grid-cols-5 gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = optimisticTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch' || e.button === 0) {
                    handleTabSelect(tab.id);
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabSelect(tab.id);
                }}
                className="relative w-full py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 select-none focus:outline-none"
                style={{ touchAction: 'manipulation' }}
                aria-label={tab.label}
                aria-selected={isActive}
              >
                {/* Active Liquid Glass Cushion / Circle directly on the active tab (instant 0ms hardware accelerated) */}
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-[20px] sm:rounded-[22px] bg-gradient-to-b from-white/[0.18] via-emerald-500/[0.12] to-emerald-950/[0.42] border border-emerald-300/40 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.5),0_6px_20px_rgba(0,0,0,0.45)] pointer-events-none"
                    style={{ transform: 'translateZ(0)' }}
                  >
                    {/* Bottom Golden Light Reflection */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-9 h-2 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-xs rounded-full pointer-events-none" />
                  </div>
                )}

                {/* Tab Icon */}
                <div className="relative z-10">
                  <Icon 
                    className={`w-[21px] h-[21px] sm:w-[22px] sm:h-[22px] ${
                      isActive 
                        ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' 
                        : 'text-emerald-100/70 group-hover:text-white'
                    }`} 
                  />
                </div>

                {/* Tab Label */}
                <span 
                  className={`relative z-10 text-[11px] sm:text-[11.5px] tracking-tight leading-none ${
                    isActive 
                      ? 'text-amber-300 font-bold drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]' 
                      : 'text-emerald-100/70 font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
});

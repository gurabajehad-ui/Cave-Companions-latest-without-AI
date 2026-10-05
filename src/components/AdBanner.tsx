import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Advertisement } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AdBannerProps {
  pageName: string;
  placementSlot: string;
}

const getDestinationLabel = (type: string, language: string) => {
  switch (type) {
    case 'EXTERNAL': return language === 'bn' ? 'ভিজিট করুন ➔' : 'Visit Link ➔';
    case 'PARTNER_SHOP': return language === 'bn' ? 'শপ প্রোডাক্ট দেখুন ➔' : 'View Shop Products ➔';
    case 'PRODUCT': return language === 'bn' ? 'ডিজিটাল প্রোডাক্ট ও সেবা ➔' : 'Digital Products & Services ➔';
    case 'APP_PAGE': return language === 'bn' ? 'বিস্তারিত পেইজ দেখুন ➔' : 'View Detailed Page ➔';
    default: return language === 'bn' ? 'বিস্তারিত দেখতে ক্লিক করুন ➔' : 'Click for Details ➔';
  }
};

// Global in-memory ad cache to eliminate re-fetching latency and UI layout shift
const adCache: Record<string, { ads: Advertisement[]; timestamp: number }> = {};
const inFlightRequests: Record<string, Promise<Advertisement[]>> = {};
const AD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export function clearAdCache() {
  Object.keys(adCache).forEach(k => delete adCache[k]);
  Object.keys(inFlightRequests).forEach(k => delete inFlightRequests[k]);
}

function AdBannerComponent({ pageName, placementSlot }: AdBannerProps) {
  const { language } = useLanguage();
  const normalizedPageName = String(pageName || '').toUpperCase().trim();
  const normalizedPlacementSlot = String(placementSlot || '').toUpperCase().trim();
  const cacheKey = `${normalizedPageName}_${normalizedPlacementSlot}`;

  const cachedEntry = adCache[cacheKey];
  const isCacheValid = Boolean(cachedEntry && (Date.now() - cachedEntry.timestamp < AD_CACHE_TTL));

  const [ads, setAds] = useState<Advertisement[]>(() => isCacheValid ? cachedEntry.ads : []);
  const [loading, setLoading] = useState<boolean>(() => !isCacheValid && !cachedEntry);

  useEffect(() => {
    if (isCacheValid) {
      setAds(cachedEntry.ads);
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchAds = async () => {
      try {
        if (!inFlightRequests[cacheKey]) {
          inFlightRequests[cacheKey] = api.getAdsForPage(normalizedPageName, normalizedPlacementSlot)
            .then(res => Array.isArray(res) ? res : [])
            .finally(() => {
              delete inFlightRequests[cacheKey];
            });
        }

        const validAds = await inFlightRequests[cacheKey];
        adCache[cacheKey] = { ads: validAds, timestamp: Date.now() };
        if (mounted) {
          setAds(validAds);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    fetchAds();
    return () => {
      mounted = false;
    };
  }, [cacheKey, isCacheValid, normalizedPageName, normalizedPlacementSlot]);

  if (loading) {
    return null;
  }

  if (!Array.isArray(ads) || ads.length === 0) return null;

  return (
    <div className="w-full space-y-4 my-4 flex flex-col items-center">
      {ads.map((ad, index) => {
        // Properties are directly on the ad object from the backend API
        const displaySize = (ad as any).displaySize;
        const spaceProfile = (ad as any).spaceProfile;
        
        // Compact outer margins based on space profile
        let spaceClass = 'my-2';
        if (spaceProfile === 'COMPACT') spaceClass = 'my-1';
        else if (spaceProfile === 'EXPANDED') spaceClass = 'my-4';
        
        // Strictly control width and height based on S/M/L
        let sizeClass = 'w-full'; 
        let heightClass = 'h-52'; 
        let roundedClass = 'rounded-2xl';
        
        if (displaySize === 'SMALL') {
          sizeClass = 'w-56 sm:w-64 mx-auto';
          heightClass = 'h-36'; // Smaller banner height
          roundedClass = 'rounded-xl';
        } else if (displaySize === 'MEDIUM') {
          // Home page's header card has w-full and beautiful rounded-3xl
          sizeClass = 'w-full';
          heightClass = 'h-40 sm:h-44'; // Compact medium height (matches progress card look perfectly)
          roundedClass = 'rounded-3xl'; // Match Header Card (rounded-3xl)
        } else if (displaySize === 'LARGE') {
          // Nasiha card has rounded-2xl and w-full
          sizeClass = 'w-full';
          heightClass = 'h-48 sm:h-52'; // Compact but elegant large height (matches Nasiha card look perfectly)
          roundedClass = 'rounded-2xl'; // Match Nasiha card (rounded-2xl)
        }

        const handleAdClick = () => {
          const destType = String(ad.destinationType || '').toUpperCase().trim();
          const destId = String(ad.destinationId || '').trim();
          
          const isExternal = destType === 'EXTERNAL_URL' || destType === 'EXTERNAL';
          const isShop = destType === 'PARTNER_SHOP' || destType === 'SHOP';
          const isAppPage = destType === 'INTERNAL_APP_PAGE' || destType === 'APP_PAGE';

          const triggerHashAndNavigation = (newHash: string, tabName: string) => {
            window.location.hash = newHash;
            if ((window as any).setAppActiveTab) {
              (window as any).setAppActiveTab(tabName);
            }
            // Manually dispatch hashchange event to trigger listener in other active components (e.g., ShopsView)
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          };

          if (isExternal && ad.externalUrl) {
            window.open(ad.externalUrl, '_blank');
          } else if (isShop && destId) {
            const targetHash = destId.startsWith('#') 
              ? destId 
              : (destId.startsWith('shop-') ? `#${destId}` : `#shop-${destId}`);
            triggerHashAndNavigation(targetHash, 'shops');
          } else if (isAppPage && destId) {
            const d = destId.toLowerCase();
            if (d.includes('মার্কেট') || d.includes('market') || d.includes('cave_market') || d.includes('cavemarket')) {
              triggerHashAndNavigation('#market', 'market');
            } else if (d.includes('হোম') || d.includes('home')) {
              triggerHashAndNavigation('#home', 'home');
            } else if (d.includes('টোকেন') || d.includes('token')) {
              triggerHashAndNavigation('#tokens', 'tokens');
            } else if (d.includes('শপ') || d.includes('shop')) {
              triggerHashAndNavigation('#shops', 'shops');
            } else if (d.includes('প্রোফাইল') || d.includes('profile')) {
              triggerHashAndNavigation('#profile', 'profile');
            } else if (d.includes('মার্চেন্ট') || d.includes('merchant')) {
              triggerHashAndNavigation('#merchant', 'merchant');
            } else if (d.includes('অ্যাডমিন') || d.includes('admin')) {
              triggerHashAndNavigation('#admin', 'admin');
            } else if (d.includes('সাপোর্ট') || d.includes('support')) {
              triggerHashAndNavigation('#support', 'support');
            } else if (d.includes('নোটিফিকেশন') || d.includes('notification')) {
              triggerHashAndNavigation('#notifications', 'notifications');
            } else if (d.includes('ইতিহাস') || d.includes('history') || d.includes('জার্নি') || d.includes('journey')) {
              triggerHashAndNavigation('#prayer_journey', 'prayer_journey');
            } else {
              const cleanedHash = destId.startsWith('#') ? destId : `#${destId}`;
              const guessedTab = destId.startsWith('#') ? destId.substring(1) : destId;
              triggerHashAndNavigation(cleanedHash, guessedTab);
            }
          }
        };

        if (!ad.imageUrl) return null;

        return (
          <div 
            key={`${ad.id}-${index}`} 
            className={`transition-transform duration-200 hover:scale-[1.01] cursor-pointer ${roundedClass} overflow-hidden shadow-sm border border-slate-200/50 bg-white ${spaceClass} ${sizeClass}`}
            onClick={handleAdClick}
          >
            {/* IMAGE ONLY LAYOUT */}
            <div className={`relative ${heightClass} w-full overflow-hidden`}>
              <img 
                src={ad.imageUrl} 
                alt={ad.title || 'Advertisement'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(AdBannerComponent);

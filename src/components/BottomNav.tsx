import React from 'react';
import { Clock, Sparkles, Store, ShoppingBag, User } from 'lucide-react';
import { ActiveTab } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface BottomNavProps {
  activeTab: ActiveTab | string;
  setActiveTab?: (tab: ActiveTab) => void;
  onChangeTab?: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onChangeTab
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'home', label: isBn ? 'সালাত' : 'Salah', icon: Clock },
    { id: 'tokens', label: isBn ? 'টোকেন' : 'Tokens', icon: Sparkles },
    { id: 'shops', label: isBn ? 'শপ' : 'Shops', icon: Store },
    { id: 'market', label: isBn ? 'মার্কেট' : 'Market', icon: ShoppingBag },
    { id: 'profile', label: isBn ? 'প্রোফাইল' : 'Profile', icon: User },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
    if (typeof onChangeTab === 'function') {
      onChangeTab(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-2 py-2 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={tab.label}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

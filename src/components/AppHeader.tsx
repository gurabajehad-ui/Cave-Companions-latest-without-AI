import React from 'react';
import { Coins, Flame, User } from 'lucide-react';
import { UserProfile } from '../types';

interface AppHeaderProps {
  currentUser: UserProfile;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentUser: rawUser }) => {
  const currentUser = rawUser as any;
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-3 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg flex items-center justify-center font-bold text-slate-950 text-sm">
            CC
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">Cave Companions</h1>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">ঈমানি সাথী ও ইবাদত নেটওয়ার্ক</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-400">{currentUser.silverTokens || 0}</span>
          </div>

          <div className="flex items-center gap-2 pl-1">
            <img
              src={currentUser.avatar || currentUser.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
              alt={currentUser.name || currentUser.fullName || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

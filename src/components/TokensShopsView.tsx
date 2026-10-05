import React, { useState } from 'react';
import { ShoppingBag, Coins, QrCode, Tag, Store, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { ShopItem, UserProfile } from '../types';

interface TokensShopsViewProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

const SHOP_ITEMS: any[] = [
  {
    id: 's1',
    name: 'পবিত্র আতর ও আতর সেট (১০০% হালাল)',
    category: 'সুগন্ধি',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80',
    originalPrice: 850,
    discountPrice: 650,
    tokenCost: { type: 'silver', amount: 30 },
    shopName: 'আল-মদীনা পারফিউমস',
    location: 'মিরপুর, ঢাকা',
  },
  {
    id: 's2',
    name: 'প্রিমিয়াম আজওয়া খেজুর (১ কেজি)',
    category: 'খাদ্যসামগ্রী',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80',
    originalPrice: 1200,
    discountPrice: 950,
    tokenCost: { type: 'gold', amount: 15 },
    shopName: 'মদীনা সুইটস ও অর্গানিক স্টোর',
    location: 'ধানমণ্ডি, ঢাকা',
  },
  {
    id: 's3',
    name: 'তুর্কি জাইনামাজ (প্রিমিয়াম ভেলভেট)',
    category: 'ইসলামিক সামগ্রী',
    image: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=400&q=80',
    originalPrice: 1500,
    discountPrice: 1100,
    tokenCost: { type: 'gold', amount: 20 },
    shopName: 'সালাত এক্সেসরিজ হাউস',
    location: 'উত্তরা, ঢাকা',
  },
];

export const TokensShopsView: React.FC<TokensShopsViewProps> = ({ currentUser: rawUser, onUpdateUser }) => {
  const currentUser = rawUser as any;
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleRedeem = (rawItem: ShopItem) => {
    const item = rawItem as any;
    let hasEnough = false;
    if (item.tokenCost.type === 'gold' && currentUser.goldTokens >= item.tokenCost.amount) {
      hasEnough = true;
      onUpdateUser({ goldTokens: currentUser.goldTokens - item.tokenCost.amount } as any);
    } else if (item.tokenCost.type === 'silver' && currentUser.silverTokens >= item.tokenCost.amount) {
      hasEnough = true;
      onUpdateUser({ silverTokens: currentUser.silverTokens - item.tokenCost.amount } as any);
    } else if (item.tokenCost.type === 'bronze' && currentUser.bronzeTokens >= item.tokenCost.amount) {
      hasEnough = true;
      onUpdateUser({ bronzeTokens: currentUser.bronzeTokens - item.tokenCost.amount } as any);
    }

    if (!hasEnough) {
      alert(`দুঃখিত! এই ছাড় ভাউচার পেতে আপনার পর্যাপ্ত ${item.tokenCost.type} টোকেন নেই।`);
      return;
    }

    const qr = `CAVE-SHOP-${Math.floor(100000 + Math.random() * 900000)}`;
    setRedeemedCode(qr);
    setSelectedItem(item);
    setShowQrModal(true);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Wallet Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" /> আপনার অর্জিত ইবাদত টোকেন ওয়ালেট
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 text-center shadow">
            <div className="text-xs text-amber-400 font-semibold">গোল্ড টোকেন</div>
            <div className="text-xl font-extrabold text-amber-400 mt-1">{currentUser.goldTokens}</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-400/30 rounded-xl p-3 text-center shadow">
            <div className="text-xs text-slate-300 font-semibold">সিলভার টোকেন</div>
            <div className="text-xl font-extrabold text-slate-200 mt-1">{currentUser.silverTokens}</div>
          </div>
          <div className="bg-slate-950/80 border border-amber-700/30 rounded-xl p-3 text-center shadow">
            <div className="text-xs text-amber-600 font-semibold">ব্রোঞ্জ টোকেন</div>
            <div className="text-xl font-extrabold text-amber-600 mt-1">{currentUser.bronzeTokens}</div>
          </div>
        </div>
      </div>

      {/* Partner Shops Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" /> পার্টনার শপ ডিসকাউন্ট অফার
          </h2>
          <span className="text-xs text-slate-400">টোকেন দিয়ে রিডিম করুন</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHOP_ITEMS.map(item => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 shadow-lg hover:border-emerald-500/40 transition"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 rounded-xl object-cover border border-slate-700"
              />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium">{item.shopName}</span>
                    <span>{item.location}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-1">{item.name}</h3>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 line-through">৳{item.originalPrice}</span>
                    <span className="text-sm font-bold text-emerald-400 ml-2">৳{item.discountPrice}</span>
                  </div>

                  <button
                    onClick={() => handleRedeem(item)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition shadow active:scale-95"
                  >
                    {item.tokenCost.amount} {item.tokenCost.type} টোকেনে নিন
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR MODAL */}
      {showQrModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 animate-fadeIn shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">ডিসকাউন্ট কিউআর ভাউচার</h3>
            <p className="text-xs text-slate-300">
              দোকানে গিয়ে মার্চেন্টকে এই QR কোড অথবা ভাউচার কোডটি দেখিয়ে ছাড় গ্রহণ করুন।
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block mx-auto border-2 border-emerald-500">
              <div className="w-36 h-36 bg-slate-900 flex items-center justify-center text-white text-xs font-mono rounded-lg p-2 font-bold break-all">
                {redeemedCode}
              </div>
            </div>

            <div className="text-sm font-bold text-emerald-400 tracking-wider">
              কোড: {redeemedCode}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition shadow"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

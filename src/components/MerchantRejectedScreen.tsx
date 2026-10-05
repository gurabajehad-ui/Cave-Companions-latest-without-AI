import React from 'react';
import { XCircle, PhoneCall, HelpCircle, LogOut } from 'lucide-react';

interface MerchantRejectedScreenProps {
  verification: any;
  shop: any;
  onLogout: () => void;
}

export const MerchantRejectedScreen: React.FC<MerchantRejectedScreenProps> = ({
  verification,
  shop,
  onLogout
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-rose-950 via-rose-900 to-emerald-950 border border-rose-500/50 rounded-2xl p-6 shadow-2xl text-white text-center">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/40">
          <XCircle className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
          আবেদন বাতিল করা হয়েছে (APPLICATION REJECTED)
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-rose-100">
          আপনার মার্চেন্ট আত্ম-নিবন্ধন আবেদনটি বাতিল করা হয়েছে
        </h2>

        {/* Rejection Reason Box */}
        <div className="mt-4 bg-rose-950/80 border border-rose-500/40 rounded-xl p-4 text-left">
          <span className="text-xs font-bold text-rose-300 block mb-1">
            বাতিলের কারণ (Rejection Reason):
          </span>
          <p className="text-sm font-semibold text-rose-100 bg-black/40 p-3 rounded-lg border border-rose-500/30">
            "{verification?.rejectionReason || 'প্রদানকৃত তথ্য ও ব্যবসায়িক কাগজপত্রের অসামঞ্জস্যতার কারণে আবেদন বাতিল করা হলো।'}"
          </p>
        </div>

        <p className="text-xs text-emerald-200/80 mt-4 leading-relaxed max-w-md mx-auto">
          যদি মনে করেন এটি একটি ভুল অথবা আপনি সঠিক কাগজপত্র দিয়ে পুনরায় আবেদন করতে চান, তাহলে সাপোর্ট টিমের সাথে যোগাযোগ করুন।
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <a
            href="tel:+8801700000000"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            হেল্পলাইনে কল করুন
          </a>

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-semibold text-xs flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>
    </div>
  );
};

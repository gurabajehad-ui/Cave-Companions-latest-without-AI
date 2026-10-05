import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, Info, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | 'about' | 'disclaimer' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-slate-100"
        >
          {/* Header */}
          <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              {type === 'privacy' && <Shield className="w-5 h-5 text-emerald-400" />}
              {type === 'terms' && <FileText className="w-5 h-5 text-indigo-400" />}
              {type === 'about' && <Info className="w-5 h-5 text-amber-400" />}
              {type === 'disclaimer' && <Info className="w-5 h-5 text-rose-400" />}
              <h3 className="font-bold text-base text-white">
                {type === 'privacy' && 'গোপনীয়তা নীতি (Privacy Policy)'}
                {type === 'terms' && 'ব্যবহারের শর্তাবলী (Terms of Service)'}
                {type === 'about' && 'ক্যাভ কমপ্যানিয়ন্স সম্পর্কে (About Us)'}
                {type === 'disclaimer' && 'অস্বীকৃতি ও সতর্কতা (Disclaimer)'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
            {type === 'privacy' && (
              <>
                <p className="font-semibold text-slate-200">
                  ক্যাভ কমপ্যানিয়ন্স (Cave Companions) আপনার ব্যক্তিগত তথ্যের সর্বোচ্চ সুরক্ষা নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ।
                </p>
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-emerald-400">১. সংগৃহীত তথ্য</h4>
                  <p>
                    আমরা আপনার নাম, ফোন নম্বর, এবং মসজিদে সালাত আদায়ের ভেরিফিকেশন লগ সংরক্ষণ করি। কোনো পাসওয়ার্ড বা গোপনীয় পিন এনক্রিপ্ট ছাড়া সংরক্ষণ করা হয় না।
                  </p>

                  <h4 className="font-bold text-sm text-emerald-400">২. তথ্যের ব্যবহার</h4>
                  <p>
                    আপনার তথ্য শুধুমাত্র জামাতে সালাত ট্র্যাকিং, রিওয়ার্ড টোকেন হিসাব, এবং পার্টনার শপে ছাড় যাচাই করার কাজে ব্যবহৃত হয়। আমরা কোনো তৃতীয় পক্ষের কাছে তথ্য বিক্রি করি না।
                  </p>

                  <h4 className="font-bold text-sm text-emerald-400">৩. ডাটা সুরক্ষা</h4>
                  <p>
                    আমাদের সার্ভারে সংরক্ষিত সকল তথ্য এনক্রিপ্টেড এবং কঠোর রোল-ভিত্তিক অনুমোদনের মাধ্যমে সুরক্ষিত।
                  </p>
                </div>
              </>
            )}

            {type === 'terms' && (
              <>
                <p className="font-semibold text-slate-200">
                  অ্যাপটি ব্যবহারের পূর্বে অনুগ্রহ করে নিচের শর্তাবলী পড়ুনঃ
                </p>
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-indigo-400">১. সালাত ভেরিফিকেশন সততা</h4>
                  <p>
                    মসজিদের জামাতে উপস্থিত না হয়ে অসদুপায়ে ভেরিফিকেশন করা সম্পূর্ণ নিষিদ্ধ এবং নৈতিকতাবিরোধী। প্রতারণামূলক কার্যকলাপে জড়িত একাউন্ট স্বয়ংক্রিয়ভাবে স্থগিত (Suspended) করা হবে।
                  </p>

                  <h4 className="font-bold text-sm text-indigo-400">২. টোকেন ও রিডেম্পশন নীতি</h4>
                  <p>
                    প্রতিদিন সর্বোচ্চ ১টি রিওয়ার্ড টোকেন ব্যবহার করা যাবে। টোকেন অর্জনের পর এর কোনো মেয়াদ শেষ হয় না।
                  </p>

                  <h4 className="font-bold text-sm text-indigo-400">৩. পার্টনার শপ ডিসকাউন্ট</h4>
                  <p>
                    পার্টনার শপের নির্ধারিত ডিসকাউন্ট রেট অনুযায়ী ছাড় প্রযোজ্য হবে। কোনো অসঙ্গতি দেখা দিলে সরাসরি সাপোর্ট টিকেটের মাধ্যমে জানাতে পারেন।
                  </p>
                </div>
              </>
            )}

            {type === 'about' && (
              <>
                <div className="text-center py-2">
                  <span className="text-lg font-black text-emerald-400 block">Cave Companions</span>
                  <span className="text-[11px] text-slate-400">একটি আধুনিক সালাত ট্র্যাকিং ও কমিউনিটি রিওয়ার্ড প্ল্যাটফর্ম</span>
                </div>
                <p>
                  "Cave Companions" এর মূল উদ্দেশ্য মুসলিম যুবসমাজ ও সর্বস্তরের মুসল্লিদের মসজিদে ৫ ওয়াক্ত জামাতে সালাত আদায়ে উৎসাহিত করা এবং স্থানীয় হালাল ও বিশ্বস্ত ব্যবসাপ্রতিষ্ঠানের সাথে পার্টনারশিপের মাধ্যমে একটি বরকতময় সমাজ বিনির্মাণ করা।
                </p>
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>৫ ওয়াক্ত জামাত = গোল্ড টোকেন</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-slate-300" />
                    <span>৪ ওয়াক্ত জামাত = সিলভার টোকেন</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>৩ ওয়াক্ত জামাত = ব্রোঞ্জ টোকেন</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-slate-500 text-center">
                  ভার্সন: ৩.০.০ (Production Ready) • বাংলাদেশ টাইমজোন (Asia/Dhaka)
                </div>
              </>
            )}
            {type === 'disclaimer' && (
              <>
                <p className="font-semibold text-slate-200">
                  অস্বীকৃতি ও সতর্কতা (Disclaimer):
                </p>
                <p>
                  ক্যাভ কমপ্যানিয়ন্স অ্যাপে প্রদর্শিত সালাতের সময়সূচি এবং কিবলার দিক গণনাকৃত এবং আনুমানিক। ব্যবহারকারীদের নিজ দায়িত্বে সঠিক ওয়াক্ত ও দিক নিশ্চিত করার অনুরোধ করা হচ্ছে। জিপিএস লোকেশন ও ভেরিফিকেশন ফিচার শুধুমাত্র সালাতে উপস্থিতি উৎসাহিত করার উদ্দেশ্যে ব্যবহৃত হয়।
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

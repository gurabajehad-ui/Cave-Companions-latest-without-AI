import React from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, Award } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface QuranAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuranAboutModal: React.FC<QuranAboutModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#03231a] via-[#021812] to-[#01140e] border border-emerald-700/60 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#03231a]/95 backdrop-blur-md p-4 sm:p-5 border-b border-emerald-800/60 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {language === 'bn' ? 'উৎস, অনুবাদ ও লাইসেন্স' : 'Sources, Translation & Licensing'}
              </h2>
              <p className="text-xs text-emerald-300/80">
                {language === 'bn' ? 'কুরআন মাজীদ মডিউল • কেভ কম্প্যানিয়ন্স' : 'Quran Majid Module • Cave Companions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 hover:text-white hover:bg-emerald-900 border border-emerald-800/40 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-emerald-100/90 leading-relaxed">
          {/* Authentic Sources Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-700/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'প্রামাণ্য ও অপরিবর্তিত উৎস নীতিমালা' : 'Authentic & Unaltered Source Policy'}</span>
            </div>
            <p className="text-[11.5px] text-emerald-200/90 leading-relaxed">
              {language === 'bn'
                ? 'কেভ কম্প্যানিয়ন্সের কুরআন মাজীদ ফিচারে কোনো এআই (AI) দ্বারা কুরআন তিলাওয়াত বা অর্থ পরিবর্তন, পরিমার্জন বা সংযোজন করা হয়নি। সম্পূর্ণ বিশুদ্ধতা বজায় রেখে মূল নির্ভরযোগ্য উৎস থেকে সরাসরি সরবরাহ করা হয়েছে।'
                : 'In the Quran Majid feature of Cave Companions, no Quranic text or translation is modified, generated, or altered by AI. Content is provided directly from authentic, verified, and recognized sources with utmost preservation of integrity.'}
            </p>
          </div>

          {/* Arabic Source Box */}
          <div className="p-4 rounded-2xl bg-[#042a1f]/80 border border-emerald-800/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-800/50 text-emerald-300 font-bold border border-emerald-700/50">
                {language === 'bn' ? 'আরবি কুরআন টেক্সট' : 'Arabic Quran Text'}
              </span>
              <span className="text-[11px] text-amber-300 font-semibold">Tanzil Project</span>
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'bn' ? 'Tanzil Quran Text (উসমানী সংস্করণ ১.১)' : 'Tanzil Quran Text (Uthmani v1.1)'}
            </h3>
            <p className="text-[11px] text-emerald-200/80">
              {language === 'bn'
                ? 'উসমানী লিপি (Uthmani Script) ও তাজবিদ বিশুদ্ধতা বজায় রেখে আন্তর্জাতিকভাবে স্বীকৃত তানজিল প্রজেক্ট (Tanzil.net) থেকে সংগৃহীত।'
                : 'Collected from the globally recognized Tanzil Project (Tanzil.net), maintaining the Uthmani script and Tajweed authenticity.'}
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[10.5px] text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Arabic Quran text source: Tanzil Quran Text (https://tanzil.net)</span>
            </div>
          </div>

          {/* Bengali Translation Box */}
          <div className="p-4 rounded-2xl bg-[#042a1f]/80 border border-emerald-800/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 font-bold border border-amber-700/40">
                {language === 'bn' ? 'বাংলা অনুবাদ' : 'Bengali Translation'}
              </span>
              <span className="text-[11px] text-amber-300 font-semibold">QuranEnc</span>
            </div>
            <h3 className="text-sm font-bold text-white">
              {language === 'bn' ? 'বাংলা ভাষায় নির্ভরযোগ্য অনুবাদ' : 'Reliable Translation in Bengali'}
            </h3>
            <p className="text-[11px] text-emerald-200/80">
              {language === 'bn'
                ? 'কিং ফাহাদ কুরআন প্রিন্টিং কমপ্লেক্স ও কুরআন এনসাইক্লোপিডিয়া (QuranEnc.com) দ্বারা প্রকাশিত অনুমোদিত ও নিরীক্ষিত আহলুস সুন্নাহ মানদণ্ডের বাংলা অনুবাদ।'
                : 'Verified Bengali translation published and audited under Ahlus Sunnah guidelines via King Fahd Quran Printing Complex and QuranEnc.com.'}
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[10.5px] text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Source & Publisher: QuranEnc (https://quranenc.com)</span>
            </div>
          </div>

          {/* Integrity Checklist */}
          <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/60 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'ডেটাবেজ ও নির্ভরযোগ্যতা নিশ্চয়তা' : 'Database & Reliability Assurance'}</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-emerald-300/80 list-disc list-inside">
              <li>{language === 'bn' ? 'সর্বমোট ১১৪টি পূর্ণাঙ্গ সূরা সন্নিবেশিত।' : 'All 114 complete Surahs included.'}</li>
              <li>{language === 'bn' ? 'সর্বমোট ৬,২৩৬টি পবিত্র আয়াত যাচাইকৃত।' : 'All 6,236 sacred Ayahs verified.'}</li>
              <li>{language === 'bn' ? 'অফলাইন ব্যবহারের জন্য ডিভাইস ক্যাশিং সুবিধা।' : 'Offline caching support for seamless access.'}</li>
              <li>{language === 'bn' ? 'বিজ্ঞাপনমুক্ত ও বিভ্রান্তিমুক্ত তিলাওয়াত অভিজ্ঞতা।' : 'Ad-free and distraction-free recitation experience.'}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#021812] border-t border-emerald-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition cursor-pointer shadow-md active:scale-98"
          >
            {language === 'bn' ? 'বুঝেছি (বন্ধ করুন)' : 'Understood (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
};

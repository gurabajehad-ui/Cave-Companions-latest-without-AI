import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, ShieldAlert, Clock, FileText, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface VerificationData {
  id: string;
  reportType: 'ADMIN_FINANCIAL' | 'ADMIN_ONLINE' | 'MERCHANT_TRANSACTIONS';
  shopName: string;
  recordCount: number;
  totalAmount: number;
  createdAt: string;
}

export const PDFVerificationView: React.FC = () => {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const pathSegments = window.location.pathname.split('/');
        const id = pathSegments[pathSegments.length - 1];
        
        if (!id) {
          setError(lang === 'bn' ? 'কোনো ভেরিফিকেশন আইডি পাওয়া যায়নি।' : 'No verification ID found.');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/verify/pdf/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError(lang === 'bn' ? 'ডকুমেন্টটি ভেরিফাইড নয় অথবা এটি একটি নকল/পরিবর্তিত ফাইল।' : 'This document is not verified or it has been tampered with.');
          } else {
            setError(lang === 'bn' ? 'সার্ভার থেকে তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to fetch verification info from server.');
          }
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (json.success && json.verification) {
          setData(json.verification);
        } else {
          setError(lang === 'bn' ? 'অকার্যকর ভেরিফিকেশন তথ্য।' : 'Invalid verification response.');
        }
      } catch (err) {
        console.error('Fetch verification error:', err);
        setError(lang === 'bn' ? 'নেটওয়ার্ক ত্রুটির কারণে লোড করা যায়নি।' : 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [lang]);

  const getReportTypeLabel = (type: string) => {
    if (lang === 'bn') {
      switch (type) {
        case 'ADMIN_FINANCIAL':
          return 'অ্যাডমিন আর্থিক রিপোর্ট (Admin Financial Report)';
        case 'ADMIN_ONLINE':
          return 'অনলাইন সামগ্রিক হিসাব (Admin Online Report)';
        case 'MERCHANT_TRANSACTIONS':
          return 'মার্চেন্ট লেনদেনের ইতিহাস (Merchant Transaction History)';
        default:
          return 'অর্থনৈতিক রিপোর্ট (Financial Report)';
      }
    } else {
      switch (type) {
        case 'ADMIN_FINANCIAL':
          return 'Admin Financial Report';
        case 'ADMIN_ONLINE':
          return 'Admin Online Report';
        case 'MERCHANT_TRANSACTIONS':
          return 'Merchant Transaction History';
        default:
          return 'Financial Report';
      }
    }
  };

  const formatBDT = (amount: number) => {
    return `৳ ${Number(amount).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', { minimumFractionDigits: 0 })}`;
  };

  const toBnDigit = (num: any): string => {
    if (num === undefined || num === null) return '';
    const str = String(num);
    if (lang !== 'bn') return str;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[0-9]/g, (w) => bnDigits[parseInt(w, 10)]);
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="pdf-verify-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-10 shadow-xs">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 tracking-tight">CAVE COMPANIONS</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Document Verification</p>
            </div>
          </div>
          <button
            onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        {loading ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-slate-500 font-bold">
              {lang === 'bn' ? 'ডকুমেন্টের সত্যতা যাচাই করা হচ্ছে...' : 'Verifying document authenticity...'}
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 text-center space-y-4">
            <div className="bg-rose-50 text-rose-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-rose-600">
                {lang === 'bn' ? 'যাচাইকরণ ব্যর্থ!' : 'Verification Failed!'}
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">
                {lang === 'bn' 
                  ? 'সতর্কতা: শুধুমাত্র অফিসিয়াল Cave Companions সিস্টেম থেকে তৈরিকৃত কিউআর কোড স্ক্যান করুন।' 
                  : 'Warning: Only scan QR codes generated by the official Cave Companions system.'}
              </p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Verification Status Card */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="bg-emerald-600 p-6 text-center text-white space-y-3">
                <div className="bg-white/15 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-9 h-9 text-white" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block bg-white text-emerald-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                    {lang === 'bn' ? 'আসল / Verified' : 'Authentic / Verified'}
                  </span>
                  <h2 className="text-lg font-bold">
                    {lang === 'bn' ? 'ডকুমেন্টটি সফলভাবে যাচাইকৃত!' : 'Document Successfully Verified!'}
                  </h2>
                  <p className="text-[11px] text-white/80">
                    {lang === 'bn' 
                      ? 'এই ডকুমেন্টটি Cave Companions সার্ভার দ্বারা সরাসরি তৈরি এবং প্রত্যয়িত।' 
                      : 'This document was directly generated and certified by Cave Companions.'}
                  </p>
                </div>
              </div>

              {/* Details List */}
              <div className="p-5 space-y-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {lang === 'bn' ? 'রিপোর্টের ধরণ' : 'Report Type'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {getReportTypeLabel(data.reportType)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {lang === 'bn' ? 'মোট রেকর্ড' : 'Total Records'}
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {toBnDigit(data.recordCount)} {lang === 'bn' ? 'টি' : 'records'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {lang === 'bn' ? 'মোট পরিমাণ' : 'Total Volume'}
                      </p>
                      <p className="text-sm font-black text-emerald-700">
                        {formatBDT(data.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-start space-x-3">
                  <Landmark className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {lang === 'bn' ? 'শপ/পার্টনার নাম' : 'Shop / Partner Name'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {data.shopName}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {lang === 'bn' ? 'তৈরির তারিখ ও সময়' : 'Generated Date & Time'}
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      {formatDateTime(data.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center mt-2 text-[10px]">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">
                      {lang === 'bn' ? 'ভেরিফিকেশন আইডি' : 'Verification ID'}
                    </p>
                    <p className="font-mono font-bold text-slate-600 mt-0.5">
                      {data.id}
                    </p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wider">
                    {lang === 'bn' ? 'সুরক্ষিত' : 'SECURE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Back button or landing link */}
            <div className="text-center">
              <a
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
              >
                <span>{lang === 'bn' ? 'হোম পেজে যান' : 'Go to Home'}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] text-slate-400 font-bold border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} Cave Companions Platform. All Rights Reserved.</p>
          <div className="flex space-x-3">
            <a href="/#about" className="hover:text-slate-600">
              {lang === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
            </a>
            <span>•</span>
            <a href="/#privacy" className="hover:text-slate-600">
              {lang === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

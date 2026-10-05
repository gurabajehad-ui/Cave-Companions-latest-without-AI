import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Sliders,
  Send
} from 'lucide-react';
import { api, getStoredAdminToken } from '../services/api';
import { NotificationTemplate } from '../types';

interface AdminNotificationManagementViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const AdminNotificationManagementView: React.FC<AdminNotificationManagementViewProps> = ({ onShowToast }) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTitleBn, setEditTitleBn] = useState<string>('');
  const [editMessage, setEditMessage] = useState<string>('');
  const [editMessageBn, setEditMessageBn] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Live Preview State
  const [previewData, setPreviewData] = useState<{
    title: string;
    titleBn: string;
    message: string;
    messageBn: string;
    sampleContext: Record<string, any>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const fetchTemplates = async () => {
    const token = getStoredAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getAdminNotificationTemplates();
      if (res.success) {
        setTemplates(res.templates || []);
      } else {
        onShowToast('error', 'ত্রুটি', 'নোটিফিকেশন টেমপ্লেট লোড করা যায়নি।');
      }
    } catch (err) {
      console.error('Fetch templates error:', err);
      onShowToast('error', 'ত্রুটি', 'সার্ভার কানেকশন ত্রুটি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenEdit = (tpl: NotificationTemplate) => {
    setSelectedTemplate(tpl);
    setEditTitle(tpl.title);
    setEditTitleBn(tpl.titleBn || tpl.title);
    setEditMessage(tpl.message);
    setEditMessageBn(tpl.messageBn || tpl.message);
    setEditIsActive(tpl.isActive);
    setPreviewData(null);
    setEditModalOpen(true);
  };

  const handleToggleActive = async (tpl: NotificationTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.updateAdminNotificationTemplate(tpl.eventType, {
        isActive: !tpl.isActive
      });
      if (res.success) {
        onShowToast(
          'success', 
          'স্ট্যাটাস পরিবর্তিত', 
          `'${tpl.nameBn}' ইভেন্টটি ${!tpl.isActive ? 'সচল' : 'বন্ধ'} করা হয়েছে।`
        );
        fetchTemplates();
      }
    } catch (err) {
      onShowToast('error', 'ত্রুটি', 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ।');
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedTemplate) return;
    setPreviewLoading(true);
    try {
      const res = await api.previewAdminNotificationTemplate(selectedTemplate.eventType, {
        title: editTitle,
        titleBn: editTitleBn,
        message: editMessage,
        messageBn: editMessageBn
      });
      if (res.success) {
        setPreviewData(res.preview);
      }
    } catch (err) {
      onShowToast('error', 'ত্রুটি', 'প্রিভিউ জেনারেট করা সম্ভব হয়নি।');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    if (!editTitleBn.trim() || !editMessageBn.trim()) {
      onShowToast('error', 'ইনপুট ত্রুটি', 'নোটিফিকেশন শিরোনাম ও বার্তা প্রদান করুন।');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateAdminNotificationTemplate(selectedTemplate.eventType, {
        title: editTitle.trim(),
        titleBn: editTitleBn.trim(),
        message: editMessage.trim(),
        messageBn: editMessageBn.trim(),
        isActive: editIsActive
      });

      if (res.success) {
        onShowToast('success', 'সফল', 'নোটিফিকেশন টেমপ্লেট সফলভাবে আপডেট করা হয়েছে।');
        setEditModalOpen(false);
        fetchTemplates();
      } else {
        onShowToast('error', 'ত্রুটি', res.message || 'টেমপ্লেট আপডেট করতে সমস্যা।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err?.message || 'সার্ভার সমস্যা।');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (varName: string) => {
    const varTag = `{{${varName}}}`;
    setEditMessageBn(prev => prev + ' ' + varTag);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">স্বয়ংক্রিয় নোটিফিকেশন টেমপ্লেট সেন্টার</h2>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              সিস্টেম ইভেন্টের জন্য বাংলা নোটিফিকেশন মেসেজ ও ডায়নামিক ভ্যারিয়েবল কাস্টমাইজ করুন।
            </p>
          </div>

          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>রিফ্রেশ টেমপ্লেট</span>
          </button>
        </div>
      </div>

      {/* Templates List Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">টেমপ্লেট লোড হচ্ছে...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold">কোনো অটোমেটিক টেমপ্লেট পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl, idx) => (
            <div
              key={`anm-tpl-${tpl.id || 'tpl'}-${idx}`}
              className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between ${
                tpl.isActive 
                  ? 'border-slate-800 hover:border-slate-700' 
                  : 'border-rose-900/30 opacity-75 bg-slate-950/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider bg-slate-800 text-amber-400 border border-slate-700 mb-1.5">
                      {tpl.eventType}
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {tpl.nameBn || tpl.name}
                    </h3>
                  </div>

                  {/* Active Switch */}
                  <button
                    onClick={(e) => handleToggleActive(tpl, e)}
                    title={tpl.isActive ? 'ডিঅ্যাক্টিভ করুন' : 'অ্যাক্টিভ করুন'}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                      tpl.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    {tpl.isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>সচল</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>বন্ধ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preview snippet */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 mb-4">
                  <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-amber-400" />
                    <span>{tpl.titleBn || tpl.title}</span>
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {tpl.messageBn || tpl.message}
                  </p>
                </div>

                {/* Available Variables Pills */}
                {tpl.availableVariables && tpl.availableVariables.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[11px] text-slate-400 font-medium">ভ্যারিয়েবল:</span>
                    {tpl.availableVariables.map((v, idx) => (
                      <span
                        key={`${v}-${idx}`}
                        className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[11px] font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex justify-end">
                <button
                  onClick={() => handleOpenEdit(tpl)}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা করুন (Edit)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedTemplate.nameBn || selectedTemplate.name}
                  </h3>
                  <p className="text-xs font-mono text-amber-400 uppercase">
                    {selectedTemplate.eventType}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Active Toggle Switch */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">স্বয়ংক্রিয় মেসেজ সচল রাখুন</p>
                  <p className="text-xs text-slate-400">বন্ধ রাখলে এই ইভেন্টে কোনো মেসেজ তৈরি হবে না</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    editIsActive ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      editIsActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  নোটিফিকেশন টাইটেল (Bangla Title) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitleBn}
                  onChange={(e) => {
                    setEditTitleBn(e.target.value);
                    setEditTitle(e.target.value);
                  }}
                  placeholder="যেমন: আপনার মসজিদের আবেদন গৃহীত হয়েছে"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Dynamic Variables Selector */}
              {selectedTemplate.availableVariables && selectedTemplate.availableVariables.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ব্যবহারযোগ্য ডাইনামিক ভ্যারিয়েবল (ক্লিক করে মেসেজে যোগ করুন):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.availableVariables.map((v, idx) => (
                      <button
                        key={`${v}-${idx}`}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>{`{{${v}}}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Body Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  নোটিফিকেশন বার্তা (Bangla Message Body) <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={editMessageBn}
                  onChange={(e) => {
                    setEditMessageBn(e.target.value);
                    setEditMessage(e.target.value);
                  }}
                  placeholder="যেমন: আলহামদুলিল্লাহ {{user_name}}। আপনার জমা দেওয়া {{mosque_name}} মসজিদের আবেদন গৃহীত হয়েছে।"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition leading-relaxed"
                />
              </div>

              {/* Preview Trigger & Display Box */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={previewLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>স্যাম্পল লাইভ প্রিভিউ দেখুন (Live Preview)</span>
                </button>

                {previewData && (
                  <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>লাইভ নোটিফিকেশন প্রিভিউ (Sample Data Output)</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                      <p className="text-sm font-bold text-amber-300">{previewData.titleBn}</p>
                      <p className="text-xs text-slate-200 leading-relaxed">{previewData.messageBn}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={saving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>পরিবর্তন সংরক্ষণ করুন (Save Template)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, Save, X, BookOpen, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { api, getStoredAdminToken } from '../services/api';

export const NasihaManagement: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ textBn: '', sourceBn: '', active: true });

  const fetchList = useCallback(async (isInitial = false) => {
    const token = getStoredAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    if (isInitial) {
      setLoading(true);
    }
    try {
      const res = await api.getNasihaList();
      setList(res.list);
    } catch (err) {
      console.error('Failed to fetch Nasiha:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(true);
  }, [fetchList]);

  const handleSubmit = async () => {
    if (!form.textBn.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.updateNasiha(editing.id, { textBn: form.textBn, sourceBn: form.sourceBn, active: form.active });
      } else {
        await api.createNasiha({ textBn: form.textBn, sourceBn: form.sourceBn });
      }
      setEditing(null);
      setForm({ textBn: '', sourceBn: '', active: true });
      await fetchList(false);
    } catch (err) {
      console.error('Failed to save Nasiha:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (item: any) => {
    try {
      await api.updateNasiha(item.id, { ...item, active: !item.active });
      await fetchList(false);
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি এই নসিহাটি মুছে ফেলতে চান?')) return;
    try {
      await api.deleteNasiha(id);
      await fetchList(false);
    } catch (err) {
      console.error('Failed to delete Nasiha:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center justify-between">
          <span>{editing ? 'নসিহা আপডেট করুন' : 'নতুন নসিহা যোগ করুন'}</span>
          {editing && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${editing.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              {editing.active ? 'পাবলিশড (Active)' : 'খসড়া (Inactive)'}
            </span>
          )}
        </h4>
        <textarea 
          value={form.textBn}
          onChange={(e) => setForm({...form, textBn: e.target.value})}
          placeholder="নসিহা টেক্সট (বাংলা)"
          rows={3}
          disabled={submitting}
          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <input 
          value={form.sourceBn}
          onChange={(e) => setForm({...form, sourceBn: e.target.value})}
          placeholder="সূত্র (বাংলা, যেমন: আল-হাদীস / ইমাম বুখারী)"
          disabled={submitting}
          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
            <input 
              type="checkbox"
              checked={form.active}
              disabled={submitting}
              onChange={(e) => setForm({...form, active: e.target.checked})}
              className="w-4 h-4 accent-emerald-500 rounded disabled:opacity-50"
            />
            <span>পাবলিশ অবস্থায় সংরক্ষণ করুন (Published Live)</span>
          </label>
          <div className="flex gap-2">
            <button 
              onClick={handleSubmit} 
              disabled={submitting || !form.textBn.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {submitting ? 'সংরক্ষণ হচ্ছে...' : (editing ? 'আপডেট' : 'সংরক্ষণ ও পাবলিশ')}
            </button>
            {editing && (
              <button 
                onClick={() => {setEditing(null); setForm({textBn: '', sourceBn: '', active: true})}} 
                disabled={submitting}
                className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                বাতিল
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">সকল নসিহা তালিকা ({list.length})</h5>
        {loading ? (
          <div className="text-slate-400 p-8 text-center text-xs animate-pulse">নসিহা তালিকা লোড হচ্ছে...</div>
        ) : list.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-900/50 rounded-2xl">কোনো নসিহা পাওয়া যায়নি।</p>
        ) : (
          list.map((item, idx) => (
            <div key={`nsh-item-${item.id || 'n'}-${idx}`} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {item.active ? '● LIVE' : '○ DRAFT'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
                </div>
                <p className="text-sm text-white font-medium leading-relaxed">"{item.textBn}"</p>
                {item.sourceBn && <p className="text-xs text-amber-400/80 font-medium">— {item.sourceBn}</p>}
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <button 
                  onClick={() => handleTogglePublish(item)} 
                  title={item.active ? 'আনপাবলিশ করুন (Unpublish)' : 'পাবলিশ করুন (Publish)'}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${item.active ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80' : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80'}`}
                >
                  {item.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => { setEditing(item); setForm({textBn: item.textBn || '', sourceBn: item.sourceBn || '', active: item.active}) }} 
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="সম্পাদনা করুন"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="p-2 rounded-xl bg-rose-900/30 text-rose-400 hover:bg-rose-900/50"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};


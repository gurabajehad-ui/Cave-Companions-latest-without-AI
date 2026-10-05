import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { optimizeImageForUpload } from '../utils/imageOptimizer';
import type { Advertisement, AdDisplayLocation, AdPageSettings } from '../types';
import { clearAdCache } from './AdBanner';

export default function AdvertisementManagement({ onShowToast }: { onShowToast: (type: 'success'|'error', title: string, msg: string) => void }) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [settings, setSettings] = useState<AdPageSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'LIST' | 'FORM' | 'SETTINGS'>('LIST');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const adsRes = await api.getAdminAds();
      if (adsRes.success) setAds(adsRes.data || []);
      const settingsRes = await api.getAdminAdSettings();
      if (settingsRes.success) setSettings(settingsRes.data || []);
      clearAdCache();
    } catch (e) {
      onShowToast('error', 'Error', 'Failed to fetch data');
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    setEditingAd(null);
    setView('FORM');
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setView('FORM');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই বিজ্ঞাপনটি ডিলিট করতে চান?')) return;
    try {
      const res = await api.deleteAdminAd(id);
      if (res.success) {
        setAds(ads.filter(a => a.id !== id));
        clearAdCache();
        onShowToast('success', 'Deleted', 'Advertisement deleted successfully');
      } else {
        onShowToast('error', 'Error', res.message || 'Failed to delete advertisement');
      }
    } catch (e: any) {
      onShowToast('error', 'Error', e?.message || 'Failed to delete advertisement');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.updateAdminAdStatus(id, newStatus);
      if (res.success) {
        setAds(ads.map((a, idx) => a.id === id ? { ...a, status: newStatus } : a));
        clearAdCache();
        onShowToast('success', 'Updated', 'Advertisement status updated');
      }
    } catch (e) {
      onShowToast('error', 'Error', 'Failed to update status');
    }
  };

  return (
    <div className="p-4 space-y-6 text-white max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center bg-emerald-900/40 p-4 rounded-xl border border-emerald-800/50">
        <h2 className="text-xl font-bold">বিজ্ঞাপন ব্যবস্থাপনা (Ad Management)</h2>
        {view === 'LIST' && (
          <div className="flex gap-2">
            <button 
              onClick={() => setView('SETTINGS')}
              className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              সেটিংস
            </button>
            <button 
              onClick={handleCreateNew}
              className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" /> নতুন বিজ্ঞাপন
            </button>
          </div>
        )}
        {view !== 'LIST' && (
          <button 
            onClick={() => setView('LIST')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" /> বাতিল
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ads.length === 0 ? (
            <div className="col-span-full text-center py-12 text-emerald-200/50">কোনো বিজ্ঞাপন পাওয়া যায়নি।</div>
          ) : (
            ads.map((ad, idx) => (
              <div key={`ad-item-${ad.id || 'ad'}-${idx}`} className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex gap-3 items-start">
                  <img src={ad.imageUrl} alt={ad.title} className="w-20 h-20 object-cover rounded-lg bg-black/20" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-amber-400">{ad.title}</h3>
                    <p className="text-sm text-emerald-200">{ad.sponsorName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full \${ad.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {ad.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{ad.locations?.length || 0} Locations</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-emerald-800/30">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleStatus(ad.id, ad.status)} className="p-2 bg-emerald-900/50 hover:bg-emerald-800 rounded-lg text-emerald-300 transition-colors">
                      {ad.status === 'ACTIVE' ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>
                    <button onClick={() => handleEdit(ad)} className="p-2 bg-emerald-900/50 hover:bg-emerald-800 rounded-lg text-blue-300 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ad.id)} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : view === 'FORM' ? (
        <AdForm 
          ad={editingAd} 
          onSave={async (data) => {
            try {
              if (editingAd) {
                await api.updateAdminAd(editingAd.id, data);
                onShowToast('success', 'Updated', 'Advertisement updated');
              } else {
                await api.createAdminAd(data);
                onShowToast('success', 'Created', 'Advertisement created');
              }
              setView('LIST');
              fetchData();
            } catch (e: any) {
              console.error('Save error:', e);
              onShowToast('error', 'Error', e?.message || 'Failed to save advertisement');
            }
          }}
          onCancel={() => setView('LIST')}
        />
      ) : (
        <AdSettings 
          settings={settings}
          onSave={async (data) => {
            try {
              await api.updateAdminAdSettings(data);
              onShowToast('success', 'Updated', 'Settings saved');
              setView('LIST');
              fetchData();
            } catch (e) {
              onShowToast('error', 'Error', 'Failed to save settings');
            }
          }}
          onCancel={() => setView('LIST')}
        />
      )}
    </div>
  );
}

function AdForm({ ad, onSave, onCancel }: { ad: Advertisement | null, onSave: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<any>(() => {
    if (!ad) {
      return {
        title: '', sponsorName: '', description: '', imageUrl: '', adType: 'BANNER',
        destinationType: 'NONE', destinationId: '', externalUrl: '', status: 'ACTIVE',
        locations: [
          { pageName: 'HOME', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
          { pageName: 'HOME', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
          { pageName: 'CAVE_MARKET', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
          { pageName: 'CAVE_MARKET', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 }
        ]
      };
    }
    return {
      ...ad,
      title: ad.title || '',
      sponsorName: ad.sponsorName || (ad as any).sponsor_name || '',
      description: ad.description || '',
      imageUrl: ad.imageUrl || (ad as any).image_url || '',
      adType: ad.adType || (ad as any).ad_type || 'BANNER',
      destinationType: ad.destinationType || (ad as any).destination_type || 'NONE',
      destinationId: ad.destinationId || (ad as any).destination_id || '',
      externalUrl: ad.externalUrl || (ad as any).external_url || '',
      status: ad.status || 'ACTIVE',
      locations: (ad.locations && ad.locations.length > 0) ? ad.locations.map((loc: any) => ({
        pageName: loc.pageName || loc.page_name || 'HOME',
        placementSlot: loc.placementSlot || loc.placement_slot || 'TOP',
        displaySize: loc.displaySize || loc.display_size || 'MEDIUM',
        spaceProfile: loc.spaceProfile || loc.space_profile || 'STANDARD',
        widthProfile: loc.widthProfile || loc.width_profile || 'FULL',
        heightProfile: loc.heightProfile || loc.height_profile || 'STANDARD',
        priority: loc.priority ?? 10
      })) : [
        { pageName: 'HOME', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
        { pageName: 'HOME', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
        { pageName: 'CAVE_MARKET', placementSlot: 'TOP', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 },
        { pageName: 'CAVE_MARKET', placementSlot: 'BEFORE_PRODUCTS', displaySize: 'MEDIUM', spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 }
      ]
    };
  });
  
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    try {
      const optimized = await optimizeImageForUpload(file, 1920, 0.85);
      const res = await api.uploadMedia(optimized.base64, optimized.fileName);
      if (res.success && res.url) {
        setFormData({ ...formData, imageUrl: res.url });
      } else {
        alert('বিজ্ঞাপনের ছবি আপলোড করা যায়নি।');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-emerald-900/40 p-6 rounded-xl border border-emerald-800/50 space-y-6">
      <h3 className="text-xl font-bold text-amber-400 border-b border-emerald-800/50 pb-3">
        {ad ? 'বিজ্ঞাপন সম্পাদনা' : 'নতুন বিজ্ঞাপন তৈরি'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: General Info & Click Action */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ১. বিজ্ঞাপনের কনটেন্ট (IMAGE ONLY)
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-emerald-200 mb-2">ব্যানার ইমেজ (Image) *</label>
              <div className="flex gap-4 items-center">
                {formData.imageUrl && (
                  <div className="relative group">
                    <img src={formData.imageUrl} alt="Preview" className="w-32 h-16 object-cover rounded-lg border border-emerald-700 bg-black/20" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                <label className="flex-1 cursor-pointer bg-emerald-800/30 hover:bg-emerald-800/50 border border-emerald-700/50 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  <div className="p-2 rounded-full bg-emerald-900/50 mb-2 group-hover:bg-emerald-900">
                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-emerald-300">{uploading ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড করুন'}</span>
                </label>
              </div>
              <p className="text-[10px] text-emerald-400/70 mt-2 italic">* বিজ্ঞাপনটি অ্যাপে শুধু ছবি হিসেবে প্রদর্শিত হবে। ছবির উচ্চতা ৮০-৯০ পিক্সেল হওয়া বাঞ্ছনীয়।</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">বিজ্ঞাপনের শিরোনাম (Internal)</label>
                <input 
                  type="text" required
                  placeholder="যেমন: ইদ ধামাকা অফার"
                  value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-emerald-950/50 border border-emerald-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">স্পন্সরড বাই (Internal)</label>
                <input 
                  type="text"
                  placeholder="যেমন: কেভ স্টোর"
                  value={formData.sponsorName || ''} onChange={e => setFormData({...formData, sponsorName: e.target.value})}
                  className="w-full bg-emerald-950/50 border border-emerald-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 text-white"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-emerald-800/30">
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              ২. ক্লিক করলে যা ঘটবে (ACTION)
            </h4>
            
            <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/40 space-y-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1.5">অ্যাকশন টাইপ (Action Type)</label>
                <select
                  value={formData.destinationType || 'NONE'} onChange={e => setFormData({...formData, destinationType: e.target.value})}
                  className="w-full bg-emerald-950/80 border border-emerald-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 text-white"
                >
                  <option value="NONE">কোনো অ্যাকশন নেই (Static)</option>
                  <option value="INTERNAL_APP_PAGE">অ্যাপের নির্দিষ্ট পেজ (In-App Page)</option>
                  <option value="PARTNER_SHOP">পার্টনার শপ প্রোফাইল (Shop Profile)</option>
                  <option value="EXTERNAL_URL">বাহ্যিক লিঙ্ক (Website URL)</option>
                </select>
              </div>
              
              {formData.destinationType !== 'NONE' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-medium text-emerald-300 mb-1.5">
                    {formData.destinationType === 'EXTERNAL_URL' ? 'গন্তব্য URL (Link)' : 'গন্তব্য ID বা লোকেশন'}
                  </label>
                  <input 
                    type="text"
                    placeholder={formData.destinationType === 'EXTERNAL_URL' ? 'https://example.com' : 'যেমন: shop-123 বা market'}
                    value={formData.destinationType === 'EXTERNAL_URL' ? (formData.externalUrl || '') : (formData.destinationId || '')} 
                    onChange={e => {
                      if (formData.destinationType === 'EXTERNAL_URL') setFormData({...formData, externalUrl: e.target.value});
                      else setFormData({...formData, destinationId: e.target.value});
                    }}
                    className="w-full bg-emerald-950/80 border border-emerald-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 text-white"
                  />
                  <p className="text-[10px] text-emerald-400/60 mt-1.5 italic">বিজ্ঞাপনে ক্লিক করলে ইউজার এই গন্তব্যে চলে যাবে।</p>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-800/30">
            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">স্ট্যাটাস (Status)</label>
              <select
                value={formData.status || 'ACTIVE'} onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-emerald-950 border border-emerald-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
              </select>
            </div>
          </section>
        </div>
        
        {/* Right Side: Display Locations */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              ৩. কোথায় দেখাবেন (DISPLAY LOCATIONS)
            </h4>
            <LocationManager 
              locations={formData.locations || []} 
              onChange={locs => setFormData({...formData, locations: locs})} 
            />
          </section>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-6 border-t border-emerald-800/50">
        <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-bold transition-all">
          বাতিল করুন
        </button>
        <button onClick={() => {
          if (!formData.imageUrl) {
            alert('অনুগ্রহ করে বিজ্ঞাপনটির ছবি আপলোড করুন');
            return;
          }
          onSave(formData);
        }} className="px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2 active:scale-95">
          <Save className="w-4 h-4" /> বিজ্ঞাপনটি সংরক্ষণ করুন
        </button>
      </div>
    </div>
  );
}

function LocationManager({ locations, onChange }: { locations: AdDisplayLocation[], onChange: (l: AdDisplayLocation[]) => void }) {
  const addLocation = () => {
    onChange([...locations, { 
      pageName: 'HOME', placementSlot: 'TOP', displaySize: 'MEDIUM', 
      spaceProfile: 'STANDARD', widthProfile: 'FULL', heightProfile: 'STANDARD', priority: 10 
    }]);
  };
  
  const updateLoc = (idx: number, updates: Partial<AdDisplayLocation>) => {
    const next = [...locations];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };
  
  const removeLoc = (idx: number) => {
    onChange(locations.filter((_, i) => i !== idx));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button onClick={addLocation} className="text-[11px] font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all">
          <Plus className="w-3.5 h-3.5" /> নতুন লোকেশন যুক্ত করুন
        </button>
      </div>
      
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {locations.map((loc, i) => (
          <div key={`ad-loc-${loc.pageName || 'loc'}-${loc.placementSlot || 'p'}-${i}`} className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl relative shadow-sm group animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => removeLoc(i)} 
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600"
              title="রিমুভ করুন"
            >
              <X className="w-3 h-3" />
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-emerald-400/70 mb-1.5 uppercase">অ্যাপ পেজ (Page)</label>
                <select value={loc.pageName || (loc as any).page_name || 'HOME'} onChange={e => updateLoc(i, { pageName: e.target.value })} className="w-full text-xs bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500">
                  <option value="HOME">হোম পেজ (Home)</option>
                  <option value="CAVE_MARKET">কেভ মার্কেট (Cave Market)</option>
                  <option value="SHOPS">পার্টনার শপ তালিকা (Partner Shops)</option>
                  <option value="TOKENS">আমার টোকেন (My Tokens)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-400/70 mb-1.5 uppercase">অবস্থান (Placement)</label>
                <select value={loc.placementSlot || (loc as any).placement_slot || 'TOP'} onChange={e => updateLoc(i, { placementSlot: e.target.value })} className="w-full text-xs bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500">
                  <option value="TOP">পেজের শীর্ষে (Top)</option>
                  <option value="MIDDLE">পেজের মাঝে (Middle)</option>
                  <option value="BEFORE_PRODUCTS">প্রোডাক্টের আগে</option>
                  <option value="BOTTOM">পেজের নিচে (Bottom)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-400/70 mb-1.5 uppercase">লেআউট সাইজ (Size)</label>
                <select value={loc.displaySize || (loc as any).display_size || 'MEDIUM'} onChange={e => updateLoc(i, { displaySize: e.target.value })} className="w-full text-xs bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500">
                  <option value="SMALL">ছোট (Small Width)</option>
                  <option value="MEDIUM">মাঝারি (Medium Width)</option>
                  <option value="LARGE">বড় (Full Width)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-400/70 mb-1.5 uppercase">অগ্রাধিকার (Priority)</label>
                <input 
                  type="number" 
                  value={loc.priority ?? 1} 
                  onChange={e => updateLoc(i, { priority: Number(e.target.value) })} 
                  className="w-full text-xs bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-2 text-white focus:ring-1 focus:ring-blue-500" 
                  placeholder="1-100"
                />
              </div>
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="text-center py-10 bg-emerald-900/20 border border-dashed border-emerald-800/40 rounded-2xl">
            <p className="text-xs text-emerald-400/40">কোনো ডিসপ্লে লোকেশন সেট করা হয়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdSettings({ settings, onSave, onCancel }: { settings: AdPageSettings[], onSave: (data: any) => void, onCancel: () => void }) {
  // Simple implementation for page limits
  const [data, setData] = useState(settings);
  
  return (
    <div className="bg-emerald-900/40 p-6 rounded-xl border border-emerald-800/50">
      <h3 className="text-xl font-bold text-amber-400 mb-6">বিজ্ঞাপন প্রদর্শন সেটিংস (Ad Limits)</h3>
      <p className="text-emerald-200 text-sm mb-4">প্রতিটি পেজে সর্বোচ্চ কয়টি বিজ্ঞাপন দেখাবে তা নির্ধারণ করুন।</p>
      
      <div className="space-y-4 max-w-md">
        {['HOME', 'CAVE_MARKET', 'PARTNER_SHOP', 'OUR_PRODUCTS'].map((page, idx) => {
          const s = data.find(x => x.pageName === page && !x.placementSlot) || { pageName: page, maxAds: 3 };
          return (
            <div key={`ad-page-${page}-${idx}`} className="flex justify-between items-center bg-emerald-950/50 p-3 rounded-lg border border-emerald-800/50">
              <span className="font-medium text-emerald-100">{page}</span>
              <div className="flex items-center gap-2">
                <label className="text-sm text-emerald-400">Max Ads:</label>
                <input 
                  type="number" min="0" value={s.maxAds ?? ''} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    const next = [...data];
                    const idx = next.findIndex(x => x.pageName === page && !x.placementSlot);
                    if (idx >= 0) next[idx].maxAds = val;
                    else next.push({ pageName: page, maxAds: val, id: '' });
                    setData(next);
                  }}
                  className="w-16 bg-emerald-900 border border-emerald-700 rounded px-2 py-1 text-center"
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-emerald-800/50">
        <button onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 font-medium">বাতিল</button>
        <button onClick={() => onSave(data)} className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium">সেভ করুন</button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Save, X, Eye, Video, Loader2, UploadCloud, AlertCircle, CheckCircle2, Youtube } from 'lucide-react';
import type { BlogPost } from './BlogView';
import { api } from '../services/api';

export const extractYouTubeId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
};

export const BlogManagement: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<BlogPost>>({});
  const [youtubeInput, setYoutubeInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publishingBlogIds, setPublishingBlogIds] = useState<Record<string, boolean>>({});
  const [publishFeedback, setPublishFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Purge any legacy cave_blogs from localStorage to strictly obey zero-media storage rule
    try {
      localStorage.removeItem('cave_blogs');
    } catch {}
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminBlogs();
      if (res && res.success && Array.isArray(res.blogs)) {
        setBlogs(res.blogs);
      } else {
        setBlogs([]);
      }
    } catch (err: any) {
      console.error('[BlogManagement] Failed to fetch admin blogs from server:', err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type) && !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setUploadError('শুধুমাত্র JPG, PNG বা WebP ছবি গ্রহণযোগ্য (Only JPG, PNG or WebP images supported)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('ছবি ১৫ মেগাবাইটের মধ্যে হতে হবে (Image file exceeds max 15MB limit)');
      return;
    }

    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await api.uploadMedia(base64Data, file.name);
          if (res && res.success && res.url) {
            setCurrentBlog(prev => ({ ...prev, imageUrl: res.url }));
            setUploadProgress('ছবি সফলভাবে আপলোড হয়েছে (Image uploaded successfully)');
            setTimeout(() => setUploadProgress(null), 3000);
          } else {
            throw new Error((res as any)?.message || 'ছবি আপলোড ব্যর্থ হয়েছে (Image upload failed)');
          }
        } catch (err: any) {
          console.error('Image upload failed:', err);
          setUploadError(err.message || 'ছবি আপলোড করতে সমস্যা হয়েছে (Image upload failed)');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setUploadError('ছবি প্রসেস করতে ব্যর্থ হয়েছে (Failed to process image)');
      setIsUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('ভিডিও ফাইল ১০০ মেগাবাইটের মধ্যে হতে হবে (Video file exceeds max 100MB limit)');
      return;
    }

    setUploadError(null);
    setIsUploadingVideo(true);
    setUploadProgress('HD ভিডিও আপলোড ও সার্ভারে সেভ হচ্ছে... (Uploading HD Video to server...)');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await api.uploadMedia(base64Data, file.name);
          if (res && res.success && res.url) {
            // Mixed Media Rule: Exclusive video source
            setCurrentBlog(prev => ({ ...prev, videoUrl: res.url }));
            setYoutubeInput(''); // Clear YouTube input when file is uploaded
            setUploadProgress('ভিডিও সফলভাবে আপলোড হয়েছে (Video uploaded successfully)');
            setTimeout(() => setUploadProgress(null), 3500);
          } else {
            throw new Error((res as any)?.message || 'আপলোড ব্যর্থ হয়েছে (Upload failed)');
          }
        } catch (err: any) {
          console.error('Video upload failed:', err);
          setUploadError(err.message || 'ভিডিও আপলোড করা যায়নি। আবার চেষ্টা করুন। (Video upload failed. Please try again.)');
        } finally {
          setIsUploadingVideo(false);
        }
      };
      reader.onerror = () => {
        setUploadError('ফাইল পড়তে ব্যর্থ হয়েছে (Failed to read video file)');
        setIsUploadingVideo(false);
        setUploadProgress(null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setUploadError('ভিডিও প্রসেস করতে ব্যর্থ হয়েছে (Failed to process video)');
      setIsUploadingVideo(false);
      setUploadProgress(null);
    }
  };

  const handleYoutubeInputChange = (val: string) => {
    setYoutubeInput(val);
    setUploadError(null);
    if (!val.trim()) {
      if (currentBlog.videoUrl && extractYouTubeId(currentBlog.videoUrl)) {
        setCurrentBlog(prev => ({ ...prev, videoUrl: '' }));
      }
      return;
    }
    const ytId = extractYouTubeId(val);
    if (ytId) {
      // Mixed Media Rule: Exclusive video source set to YouTube
      setCurrentBlog(prev => ({ ...prev, videoUrl: `https://www.youtube.com/watch?v=${ytId}` }));
    } else {
      setUploadError('সঠিক ইউটিউব লিংক প্রদান করুন (Invalid YouTube URL format)');
    }
  };

  const handleSave = async () => {
    if (!currentBlog.title || !currentBlog.title.trim()) {
      setUploadError('কন্টেন্টের শিরোনাম দিন (Please enter title)');
      return;
    }
    if (!currentBlog.content || !currentBlog.content.trim()) {
      setUploadError('কন্টেন্টের বিবরণ দিন (Please enter content details)');
      return;
    }

    setIsSaving(true);
    setUploadError(null);

    try {
      if (currentBlog.id) {
        const res = await api.updateAdminBlog(currentBlog.id, {
          title: currentBlog.title,
          content: currentBlog.content,
          imageUrl: currentBlog.imageUrl,
          videoUrl: currentBlog.videoUrl,
          author: currentBlog.author,
          isPublished: currentBlog.isPublished ?? true
        });

        if (res && res.success && res.blog) {
          setBlogs(prev => prev.map(b => b.id === currentBlog.id ? res.blog : b));
        } else {
          throw new Error(res?.message || 'আপডেট ব্যর্থ হয়েছে');
        }
      } else {
        const res = await api.createAdminBlog({
          title: currentBlog.title,
          content: currentBlog.content,
          imageUrl: currentBlog.imageUrl,
          videoUrl: currentBlog.videoUrl,
          author: currentBlog.author || 'Admin',
          isPublished: currentBlog.isPublished ?? true
        });

        if (res && res.success && res.blog) {
          setBlogs(prev => [res.blog, ...prev]);
        } else {
          throw new Error(res?.message || 'প্রকাশ ব্যর্থ হয়েছে');
        }
      }

      setIsEditing(false);
      setCurrentBlog({});
      setYoutubeInput('');
      setUploadError(null);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Failed to save blog:', err);
      setUploadError(err.message || 'কন্টেন্ট সেভ করতে সমস্যা হয়েছে (Failed to save content)');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async (blog: BlogPost, targetState?: boolean) => {
    if (!blog || !blog.id) {
      console.error('[BlogManagement] Cannot toggle publish: Blog object or ID missing');
      setUploadError('কন্টেন্ট ID পাওয়া যায়নি (Blog ID missing)');
      return;
    }

    const blogId = blog.id;
    const newIsPublished = targetState !== undefined ? targetState : !blog.isPublished;

    // Double-click protection: prevent concurrent requests for same blog
    if (publishingBlogIds[blogId]) return;

    setPublishingBlogIds(prev => ({ ...prev, [blogId]: true }));
    setPublishFeedback(null);
    setUploadError(null);

    try {
      console.log(`[BlogManagement] Requesting publish toggle for blogId: ${blogId} -> target isPublished: ${newIsPublished}`);
      const res = await api.publishAdminBlog(blogId, newIsPublished);

      if (res && res.success && res.blog) {
        // Atomically update state using returned persistent DB record
        setBlogs(prev => prev.map(b => b.id === blogId ? res.blog : b));
        setPublishFeedback({
          id: blogId,
          type: 'success',
          message: newIsPublished ? 'সফলভাবে প্রকাশ হয়েছে (Published successfully)' : 'সফলভাবে আনপাবলিশ হয়েছে (Unpublished successfully)'
        });
        setTimeout(() => setPublishFeedback(null), 4000);
      } else {
        throw new Error(res?.message || 'প্রকাশ করা যায়নি (Publishing failed)');
      }
    } catch (err: any) {
      console.error('[BlogManagement] Publish toggle failed:', err);
      setPublishFeedback({
        id: blogId,
        type: 'error',
        message: err.message || 'প্রকাশ করা যায়নি (Publishing failed)'
      });
      setTimeout(() => setPublishFeedback(null), 4000);
    } finally {
      setPublishingBlogIds(prev => {
        const next = { ...prev };
        delete next[blogId];
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      try {
        const res = await api.deleteAdminBlog(id);
        if (res && res.success) {
          setBlogs(prev => prev.filter(b => b.id !== id));
        } else {
          throw new Error(res?.message || 'মুছে ফেলা সম্ভব হয়নি');
        }
      } catch (err: any) {
        console.error('Delete blog error:', err);
        setBlogs(prev => prev.filter(b => b.id !== id));
      } finally {
        setDeleteConfirmId(null);
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const startEdit = (blog?: BlogPost) => {
    if (blog) {
      setCurrentBlog(blog);
      setYoutubeInput(blog.videoUrl && extractYouTubeId(blog.videoUrl) ? blog.videoUrl : '');
    } else {
      setCurrentBlog({ isPublished: true });
      setYoutubeInput('');
    }
    setIsEditing(true);
    setUploadError(null);
    setUploadProgress(null);
  };

  if (isEditing) {
    const activeYtId = currentBlog.videoUrl ? extractYouTubeId(currentBlog.videoUrl) : null;
    const isUploadedVideo = Boolean(currentBlog.videoUrl && !activeYtId);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {currentBlog.id ? 'Cave Media কন্টেন্ট সম্পাদনা (Edit Cave Media)' : 'নতুন Cave Media কন্টেন্ট (New Cave Media)'}
          </h2>
          <button 
            onClick={() => {
              setIsEditing(false);
              setUploadError(null);
              setUploadProgress(null);
            }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{uploadProgress}</span>
          </div>
        )}

        <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">শিরোনাম (Title)</label>
            <input 
              type="text" 
              value={currentBlog.title || ''} 
              onChange={e => setCurrentBlog({...currentBlog, title: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              placeholder="কন্টেন্টের শিরোনাম লিখুন (Title)..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ছবি আপলোড করুন (Image - Optional, Max 15MB)</label>
            <div className="flex items-center gap-4">
              {currentBlog.imageUrl && (
                <div className="relative group">
                  <img src={currentBlog.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                  <button onClick={() => setCurrentBlog({...currentBlog, imageUrl: ''})} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg cursor-pointer transition-colors border border-slate-700">
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-amber-400" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                <span>{isUploadingImage ? 'ছবি আপলোড হচ্ছে...' : 'ছবি নির্বাচন করুন (JPG/PNG/WebP)'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploadingImage} className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ভিডিও সোর্স নির্বাচন (Video Source - Select Option A or Option B)</label>
            <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              
              {/* Option A: Direct HD Video Upload */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" /> অপশন A: HD ভিডিও ফাইল আপলোড (Direct HD Video Upload - Max 100MB)
                </span>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer transition-colors border border-slate-700 shrink-0 ${isUploadingVideo ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isUploadingVideo ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-amber-400" />
                    ) : (
                      <Video className="w-4 h-4 mr-2 text-amber-400" />
                    )}
                    <span>{isUploadingVideo ? 'HD ভিডিও আপলোড হচ্ছে...' : 'ভিডিও ফাইল নির্বাচন করুন (MP4 / WebM)'}</span>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={isUploadingVideo} className="hidden" onChange={handleVideoUpload} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 my-1">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] text-slate-500 uppercase font-bold">অথবা (OR)</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* Option B: YouTube Link */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                  <Youtube className="w-3.5 h-3.5" /> অপশন B: ইউটিউব ভিডিও লিংক (YouTube URL / Shorts / youtu.be)
                </span>
                <input 
                  type="text"
                  value={youtubeInput}
                  onChange={e => handleYoutubeInputChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 outline-none"
                  placeholder="যেমন: https://youtu.be/JG-ahy9uyms?si=4ZCBBvEu- অথবা https://www.youtube.com/watch?v=..."
                />
              </div>

              {/* Active Video Source Display & Preview */}
              {currentBlog.videoUrl && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="relative flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs text-amber-400">
                    <div className="flex items-center gap-2 truncate">
                      {activeYtId ? <Youtube className="w-4 h-4 shrink-0 text-rose-400" /> : <Video className="w-4 h-4 shrink-0 text-amber-400" />}
                      <span className="truncate">{activeYtId ? `YouTube Video ID: ${activeYtId}` : currentBlog.videoUrl}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentBlog({...currentBlog, videoUrl: ''});
                        setYoutubeInput('');
                      }}
                      className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors ml-2 shrink-0"
                      title="ভিডিও রিমুভ করুন"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Video Preview */}
                  <div className="rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video max-h-[220px]">
                    {activeYtId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${activeYtId}?rel=0`}
                        title="YouTube Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={currentBlog.videoUrl} controls playsInline className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">বিস্তারিত বিবরণ (Description)</label>
            <textarea 
              rows={8}
              value={currentBlog.content || ''} 
              onChange={e => setCurrentBlog({...currentBlog, content: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:border-amber-500 outline-none"
              placeholder="কন্টেন্টের মূল বিবরণ বা বিস্তারিত বিবরণ লিখুন..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={currentBlog.isPublished ?? true}
                onChange={e => setCurrentBlog({...currentBlog, isPublished: e.target.checked})}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-300">প্রকাশিত (Publicly Published)</span>
            </label>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving || !currentBlog.title || !currentBlog.content || isUploadingVideo || isUploadingImage}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন (Save Media)'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Cave Media ম্যানেজমেন্ট (Cave Media Content)</h2>
        <button 
          onClick={() => startEdit()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-semibold rounded-lg transition-colors border border-amber-500/20"
        >
          <Plus className="w-4 h-4" /> নতুন Cave Media কন্টেন্ট
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blogs.map((blog, idx) => {
            const ytId = blog.videoUrl ? extractYouTubeId(blog.videoUrl) : null;
            return (
              <div key={`bm-blog-${blog.id || 'b'}-${idx}`} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                {blog.videoUrl ? (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-slate-800">
                    {ytId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                        title={blog.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={blog.videoUrl} controls playsInline preload="metadata" className="w-full h-full object-contain" />
                    )}
                  </div>
                ) : blog.imageUrl ? (
                  <img src={blog.imageUrl} alt={blog.title} className="w-full h-32 object-cover rounded-lg" />
                ) : null}

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white line-clamp-2">{blog.title}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {blog.isPublished ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Published</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-amber-400 border border-amber-500/20">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{blog.content}</p>
                </div>

                {publishFeedback && publishFeedback.id === blog.id && (
                  <div className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    publishFeedback.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}>
                    {publishFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{publishFeedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500">{new Date(blog.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    {/* Explicit Publish / Unpublish Button */}
                    <button
                      onClick={() => handlePublishToggle(blog)}
                      disabled={!!publishingBlogIds[blog.id]}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        publishingBlogIds[blog.id]
                          ? 'bg-slate-800 text-slate-400 opacity-70 cursor-wait border border-slate-700'
                          : blog.isPublished
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-500'
                      }`}
                      title={blog.isPublished ? 'আনপাবলিশ করুন (Unpublish)' : 'প্রকাশ করুন (Publish)'}
                    >
                      {publishingBlogIds[blog.id] ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>প্রকাশ করা হচ্ছে...</span>
                        </>
                      ) : blog.isPublished ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>আনপাবলিশ</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>প্রকাশ করুন</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => startEdit(blog)}
                      className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                      title="সম্পাদনা করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(blog.id)}
                      className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${deleteConfirmId === blog.id ? 'bg-rose-500 text-white' : 'text-rose-400 hover:bg-rose-400/10'}`}
                      title="মুছে ফেলুন"
                    >
                      {deleteConfirmId === blog.id ? <span className="text-[10px] font-bold px-1">নিশ্চিত?</span> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {blogs.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-500 text-sm">কোনো Cave Media কন্টেন্ট পাওয়া যায়নি (No Cave Media content created yet)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


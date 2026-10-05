import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { extractYouTubeId } from './BlogManagement';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  author: string;
  createdAt: string;
  isPublished: boolean;
}

interface BlogViewProps {
  onBack: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onBack }) => {
  const { language, t } = useLanguage();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);

  useEffect(() => {
    // Purge legacy local storage to prevent quota errors
    try {
      localStorage.removeItem('cave_blogs');
    } catch {}
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await api.getPublicBlogs();
      if (res && res.success && Array.isArray(res.blogs)) {
        setBlogs(res.blogs.filter((b: BlogPost) => b.isPublished));
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.warn('[BlogView] Failed to fetch public blogs from server:', err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const renderVideoMedia = (url?: string) => {
    if (!url) return null;
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#0c4334] shadow-2xl bg-black">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-rose-500 text-white font-black text-[10px] rounded-md shadow flex items-center gap-1">
            <Video className="w-3 h-3" />
            <span>YOUTUBE HD</span>
          </div>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?vq=hd1080&rel=0`}
            title="CAVE Media HD Video"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#0c4334] shadow-2xl bg-black">
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-md shadow flex items-center gap-1">
          <Video className="w-3 h-3" />
          <span>HD VIDEO</span>
        </div>
        <video 
          src={url} 
          controls 
          playsInline
          preload="metadata"
          className="w-full aspect-video max-h-[480px] bg-black object-contain"
        />
      </div>
    );
  };

  if (selectedBlog) {
    return (
      <div className="flex flex-col h-full bg-[#060a14] overflow-y-auto pb-[90px]">
        <div className="sticky top-0 z-40 bg-[#060a14]/90 backdrop-blur-xl border-b border-emerald-900/40 p-4">
          <button 
            onClick={() => setSelectedBlog(null)}
            className="flex items-center gap-2 text-emerald-100 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">{language === 'bn' ? 'ফিরে যান' : 'Go Back'}</span>
          </button>
        </div>
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
          {selectedBlog.videoUrl && (
            <div className="mb-2">
              {renderVideoMedia(selectedBlog.videoUrl)}
            </div>
          )}
          {!selectedBlog.videoUrl && selectedBlog.imageUrl && (
            <img 
              src={selectedBlog.imageUrl} 
              alt={selectedBlog.title} 
              className="w-full h-48 sm:h-64 object-cover rounded-2xl shadow-lg border border-[#0c4334]"
            />
          )}
          {selectedBlog.videoUrl && selectedBlog.imageUrl && (
            <img 
              src={selectedBlog.imageUrl} 
              alt={selectedBlog.title} 
              className="w-full h-36 object-cover rounded-xl shadow border border-[#0c4334]"
            />
          )}
          <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
            {selectedBlog.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-emerald-400/80">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {selectedBlog.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(selectedBlog.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap pt-2">
            {selectedBlog.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#060a14] overflow-y-auto pb-[90px]">
      <div className="sticky top-0 z-40 bg-[#060a14]/90 backdrop-blur-xl border-b border-emerald-900/40 p-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-white">Cave Media</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Video className="w-12 h-12 text-emerald-800 mx-auto mb-3 opacity-50" />
            <p className="text-emerald-300/70 font-medium">{language === 'bn' ? 'এখনও কোনো Cave Media কন্টেন্ট পোস্ট করা হয়নি।' : 'No Cave Media content available yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {blogs.map((blog, idx) => (
              <div 
                key={`blog-${blog.id || 'b'}-${idx}`} 
                onClick={() => setSelectedBlog(blog)}
                className="bg-[#022119] border border-[#0c4334] rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-600/50 transition-colors shadow-md"
              >
                {blog.imageUrl ? (
                  <div className="relative">
                    <img src={blog.imageUrl} alt={blog.title} className="w-full h-32 object-cover" />
                    {blog.videoUrl && (
                      <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-amber-400 p-1.5 rounded-full border border-amber-500/30">
                        <Video className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                ) : blog.videoUrl ? (
                  <div className="w-full h-32 bg-slate-900 border-b border-emerald-900/50 flex items-center justify-center text-amber-400">
                    <Video className="w-8 h-8 opacity-80" />
                  </div>
                ) : null}
                <div className="p-4 space-y-2">
                  <h3 className="text-base font-bold text-white line-clamp-2">{blog.title}</h3>
                  <p className="text-xs text-emerald-100/70 line-clamp-2">{blog.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-emerald-400/60 pt-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {blog.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(blog.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

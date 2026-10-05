import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  MessageSquare,
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  ArrowLeft,
  Mail,
  ShieldCheck,
  Phone,
  MessageCircle,
  PhoneForwarded
} from 'lucide-react';
import { api } from '../services/api';
import { SupportTicket, HelplineSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SupportViewProps {
  onBack?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
  onNavigate?: (tab: string) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ onBack, onShowToast, onNavigate }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'faq' | 'ticket' | 'my_tickets'>('faq');
  const [faqs, setFaqs] = useState<Array<{ id: string; questionBn: string; questionEn: string; answerBn: string; answerEn?: string }>>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [helpline, setHelpline] = useState<HelplineSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [faqRes, ticketRes, helplineRes] = await Promise.all([
          api.getFaqs(),
          api.getSupportTickets(),
          api.getHelpline().catch(() => null)
        ]);
        setFaqs(faqRes.faqs);
        setTickets(ticketRes.tickets);
        if (helplineRes && helplineRes.success !== false) {
          setHelpline(helplineRes);
        }
      } catch (err: any) {
        console.error('Failed to load support data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || subject.trim().length < 3) {
      onShowToast('error', t('common.error'), t('support.subjectMinError'));
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      onShowToast('error', t('common.error'), t('support.messageMinError'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createSupportTicket(subject, message);
      setTickets(prev => [res.ticket, ...prev]);
      setSubject('');
      setMessage('');
      setActiveTab('my_tickets');
      onShowToast('success', t('support.ticketSubmitted'), res.message);
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('support.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">{t('support.statusResolved')}</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">{t('support.statusInProgress')}</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{t('support.statusClosed')}</span>;
      case 'OPEN':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">{t('support.statusOpen')}</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-emerald-400" />
              {t('support.title')}
            </h1>
            <p className="text-xs text-slate-400">{t('support.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t('support.faqTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ticket'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t('support.ticketTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('my_tickets')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'my_tickets'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('support.myTicketsTab')} ({tickets.length})</span>
        </button>
      </div>

      {/* Dynamic Helpline Contact Box (If Active) */}
      {helpline?.isActive !== false && helpline?.primaryPhone && (
        <div className="p-4 bg-slate-900/80 border border-emerald-800/60 rounded-3xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">
                {language === 'bn' ? 'জরুরি হেল্পলাইন ও সাপোর্ট' : 'Emergency Helpline & Support'}
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {language === 'bn' ? 'সক্রিয়' : 'Active'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
            {helpline.supportMessage || (language === 'bn' ? 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।' : 'Our team will review your request within 24-48 hours. For emergency assistance, please contact our helpline.')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Primary Phone */}
            <a
              href={`tel:${helpline.primaryPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
            >
              <span className="flex items-center gap-2 font-mono font-bold text-xs">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{helpline.primaryPhone}</span>
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-lg">
                {language === 'bn' ? 'কল' : 'Call'}
              </span>
            </a>

            {/* Secondary Phone */}
            {helpline.secondaryPhone && (
              <a
                href={`tel:${helpline.secondaryPhone.replace(/\s+/g, '')}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-300 hover:bg-blue-900/40 transition-colors"
              >
                <span className="flex items-center gap-2 font-mono font-bold text-xs">
                  <PhoneForwarded className="w-3.5 h-3.5 text-blue-400" />
                  <span>{helpline.secondaryPhone}</span>
                </span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-lg">
                  {language === 'bn' ? 'বিকল্প' : 'Alt'}
                </span>
              </a>
            )}

            {/* WhatsApp */}
            {helpline.isWhatsappEnabled && helpline.whatsappNumber && (
              <a
                href={`https://wa.me/${helpline.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-green-950/40 border border-green-800/60 text-green-300 hover:bg-green-900/40 transition-colors"
              >
                <span className="flex items-center gap-2 font-mono font-bold text-xs">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                  <span>{helpline.whatsappNumber}</span>
                </span>
                <span className="text-[10px] bg-green-600 text-white font-bold px-2 py-0.5 rounded-lg">
                  {language === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
                </span>
              </a>
            )}

            {/* Support Email */}
            {helpline.supportEmail && (
              <a
                href={`mailto:${helpline.supportEmail}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs truncate">
                  <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{helpline.supportEmail}</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-lg border border-slate-700 shrink-0">
                  {language === 'bn' ? 'ইমেইল' : 'Email'}
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Content based on Active Tab */}

      {activeTab === 'faq' && (
        <div className="space-y-3">
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed">
            {language === 'bn'
              ? 'ক্যাভ কমপ্যানিয়ন্স সংক্রান্ত জরুরি নিয়মাবলি ও সচরাচর জিজ্ঞাসিত প্রশ্নের উত্তর নিচে দেওয়া হলো।'
              : 'Here are the important rules and frequently asked questions regarding Cave Companions.'}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i, idx) => (
                <div key={`sup-skeleton-${i}`} className="animate-pulse bg-slate-900/60 border border-slate-800 rounded-2xl h-16" />
              ))}
            </div>
          ) : (
            faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === faq.id;
              const question = (language === 'bn' ? faq.questionBn : (faq.questionEn || faq.questionBn));
              const answer = (language === 'bn' ? faq.answerBn : (faq.answerEn || faq.answerBn));
              return (
                <div
                  key={`sup-faq-${faq.id || 'f'}-${idx}`}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-emerald-400 shrink-0" />
                      {question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3"
                      >
                        {answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'ticket' && (
        <form onSubmit={handleSubmitTicket} className="space-y-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {language === 'bn' ? 'সাপোর্ট টিমকে বার্তা পাঠান' : 'Send Message to Support Team'}
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {language === 'bn' ? 'বিষয়বস্তু (Subject)' : 'Subject'}
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={language === 'bn' ? 'উদাঃ সালাত ভেরিফিকেশন সমস্যা / টোকেন ডিসকাউন্ট সংক্রান্ত' : 'e.g. Prayer verification issue / Token discount query'}
              maxLength={150}
              required
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {language === 'bn' ? 'বিস্তারিত বিবরণ (Message)' : 'Message Details'}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={language === 'bn' ? 'আপনার সমস্যার বিবরণ বিস্তারিত লিখুন যাতে আমাদের টিম দ্রুত সমাধান দিতে পারে...' : 'Write detailed description of your issue so our team can resolve it quickly...'}
              rows={4}
              maxLength={2000}
              required
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitting ? (
              <span>{language === 'bn' ? 'জমা দেওয়া হচ্ছে...' : 'Submitting...'}</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{language === 'bn' ? 'টিকেট সাবমিট করুন' : 'Submit Ticket'}</span>
              </>
            )}
          </button>
        </form>
      )}

      {activeTab === 'my_tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-6">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-300">
                {language === 'bn' ? 'কোনো সাপোর্ট টিকেট নেই' : 'No Support Tickets'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' ? 'আপনার কোনো সহায়তার প্রয়োজন হলে "টিকেট খুলুন" ট্যাব থেকে বার্তা পাঠান।' : 'If you need help, send a message from the "New Ticket" tab.'}
              </p>
            </div>
          ) : (
            tickets.map((ticket, idx) => (
              <div
                key={`sup-tkt-${ticket.id || 't'}-${idx}`}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(ticket.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{ticket.subject}</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  {ticket.message}
                </p>

                {ticket.adminResponse && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      {language === 'bn' ? 'সাপোর্ট টিম উত্তরঃ' : 'Support Team Response:'}
                    </span>
                    <p className="text-slate-200 leading-relaxed">{ticket.adminResponse}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

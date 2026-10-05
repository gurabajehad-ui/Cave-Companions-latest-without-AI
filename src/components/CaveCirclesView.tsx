import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { 
  Users, 
  Plus, 
  Link as LinkIcon, 
  LogOut, 
  Trash2, 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Bell, 
  BellRing,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles, 
  BookOpen, 
  Flame, 
  Send, 
  Mic, 
  MicOff,
  PhoneCall,
  VolumeX,
  Volume1,
  Play, 
  Pause, 
  Volume2, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Shield, 
  Calendar, 
  Sunrise, 
  Sun, 
  Sunset, 
  Moon, 
  Check, 
  CheckCheck,
  Award, 
  MessageSquare,
  RefreshCw,
  Info,
  Clock,
  ChevronRight,
  Maximize2,
  Minimize2,
  Paperclip,
  Smile,
  Phone,
  PhoneOff,
  Search,
  UserCheck,
  UserPlus,
  Swords,
  Trophy,
  Target,
  Zap,
  XCircle,
  TrendingUp,
  Radio,
  Flag,
  AlertTriangle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toBnNumber } from '../data/prayerConfig';
import caveSplashImg from '../assets/images/cave_splash_no_text_v2_1788014135103.jpg';
import { AppLogo } from './AppLogo';

interface CaveCirclesViewProps {
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

type CircleSubTab = 'salah' | 'quran' | 'battles' | 'members';

export const CaveCirclesView: React.FC<CaveCirclesViewProps> = ({ onBack, onShowToast }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const fmtNum = (n: any) => (isBn ? toBnNumber(n) : String(n ?? 0));
  const [circles, setCircles] = useState<any[]>([]);
  const [lobbyTab, setLobbyTab] = useState<'all_my' | 'mine' | 'joined'>('all_my');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [myCirclesForChallenge, setMyCirclesForChallenge] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [newCircleCategory, setNewCircleCategory] = useState('Islamic');
  const [newCircleStreak, setNewCircleStreak] = useState(7);
  const [loading, setLoading] = useState(true);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<CircleSubTab>('salah');

  // Battles / Inter-Circle Competition State
  const [circleBattles, setCircleBattles] = useState<any[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(false);
  const [respondingBattleId, setRespondingBattleId] = useState<string | null>(null);
  
  // Send Challenge Modal State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [targetCircleToChallenge, setTargetCircleToChallenge] = useState<any | null>(null);
  const [selectedChallengerCircleId, setSelectedChallengerCircleId] = useState<string>('');
  const [challengeDurationDays, setChallengeDurationDays] = useState<number>(3);
  const [challengeBattleType, setChallengeBattleType] = useState<string>('ALL_ROUND');
  const [challengeTitle, setChallengeTitle] = useState<string>('');
  const [challengeRulesNote, setChallengeRulesNote] = useState<string>('');
  const [isSendingChallenge, setIsSendingChallenge] = useState<boolean>(false);

  // Live Battle Stats Modal State
  const [selectedBattleStats, setSelectedBattleStats] = useState<any | null>(null);
  const [showBattleStatsModal, setShowBattleStatsModal] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // Fullscreen WhatsApp chat mode
  const [isChatFullscreen, setIsChatFullscreen] = useState<boolean>(false);

  // Modals / forms
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom confirmation state (replaces window.confirm which is blocked in iframes)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Direct Phone Search Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchPhoneInput, setSearchPhoneInput] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchUserError, setSearchUserError] = useState('');
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [isCallMembersModalOpen, setIsCallMembersModalOpen] = useState(false);

  // Pending Invitations for Logged-In User
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  // Dedicated Cave Circles Notification Page states
  const [circleNotifications, setCircleNotifications] = useState<any[]>([]);
  const [circleNotifsLoading, setCircleNotifsLoading] = useState(false);
  const [isViewingCircleNotifications, setIsViewingCircleNotifications] = useState(false);
  const [circleNotifFilter, setCircleNotifFilter] = useState<'all' | 'unread'>('all');
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [isClearingAllNotifs, setIsClearingAllNotifs] = useState(false);

  // Real Multi-User Audio Call state & handlers (Manual Answering, Fullscreen & Incoming Alerts)
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [isAudioCallConnected, setIsAudioCallConnected] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Default to Loudspeaker
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'CALLING' | 'RINGING' | 'CONNECTED'>('CALLING');
  const [calledCompanion, setCalledCompanion] = useState<any | null>(null);
  const callTimerRef = useRef<any>(null);
  const callStatusPollingRef = useRef<any>(null);
  const incomingCallPollingRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringtoneCtxRef = useRef<any>(null);
  const incomingRingtoneCtxRef = useRef<any>(null);

  // Gentle realistic ringback tone generator (for the caller while waiting for recipient to answer)
  const startRingbackTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      ringtoneCtxRef.current = ctx;

      const playRingBurst = () => {
        if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') return;
        try {
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;

          gain.gain.setValueAtTime(0.03, now);
          gain.gain.setValueAtTime(0.03, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.25);
          osc2.stop(now + 1.25);
        } catch {}
      };

      playRingBurst();
      const interval = setInterval(() => {
        if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') {
          clearInterval(interval);
          return;
        }
        playRingBurst();
      }, 3000);
      (ringtoneCtxRef.current as any)._interval = interval;
    } catch (e) {
      console.warn('AudioContext ringtone not available:', e);
    }
  };

  const stopRingbackTone = () => {
    if (ringtoneCtxRef.current) {
      try {
        if ((ringtoneCtxRef.current as any)._interval) {
          clearInterval((ringtoneCtxRef.current as any)._interval);
        }
        ringtoneCtxRef.current.close();
      } catch {}
      ringtoneCtxRef.current = null;
    }
  };

  // Pleasant melody incoming ringtone (when receiving a call from a companion)
  const startIncomingRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      incomingRingtoneCtxRef.current = ctx;

      const playChime = () => {
        if (!incomingRingtoneCtxRef.current || incomingRingtoneCtxRef.current.state === 'closed') return;
        try {
          const now = ctx.currentTime;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc2.type = 'sine';
          osc1.frequency.value = 587.33; // D5
          osc2.frequency.value = 880; // A5

          gain.gain.setValueAtTime(0.06, now);
          gain.gain.setValueAtTime(0.06, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.8);
          osc2.stop(now + 0.8);

          // Secondary harmonic pulse
          const osc3 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc3.type = 'triangle';
          osc3.frequency.value = 659.25; // E5
          gain2.gain.setValueAtTime(0.06, now + 0.4);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
          osc3.connect(gain2);
          gain2.connect(ctx.destination);
          osc3.start(now + 0.4);
          osc3.stop(now + 1.1);
        } catch {}
      };

      playChime();
      const interval = setInterval(() => {
        if (!incomingRingtoneCtxRef.current || incomingRingtoneCtxRef.current.state === 'closed') {
          clearInterval(interval);
          return;
        }
        playChime();
      }, 2400);
      (incomingRingtoneCtxRef.current as any)._interval = interval;
    } catch (e) {
      console.warn('Incoming ringtone error:', e);
    }
  };

  const stopIncomingRingtone = () => {
    if (incomingRingtoneCtxRef.current) {
      try {
        if ((incomingRingtoneCtxRef.current as any)._interval) {
          clearInterval((incomingRingtoneCtxRef.current as any)._interval);
        }
        incomingRingtoneCtxRef.current.close();
      } catch {}
      incomingRingtoneCtxRef.current = null;
    }
  };

  // Background polling for incoming calls
  useEffect(() => {
    if (!user) return;

    const pollIncomingCall = async () => {
      try {
        const res = await api.getActiveIncomingCall();
        if (res.success && res.activeCall) {
          // If we are not currently in a call and this is a new incoming call
          if (!isAudioCallOpen && (!incomingCall || incomingCall.id !== res.activeCall.id)) {
            setIncomingCall(res.activeCall);
            startIncomingRingtone();

            // Native browser notification for background tabs
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(`🏕️ কেভ সার্কেল: ${res.activeCall.caller_name || 'সাথী'}`, {
                  body: `${res.activeCall.circle_name || 'সার্কেল'} থেকে ভয়েস কল আসছে...`,
                  icon: res.activeCall.caller_photo_url || undefined
                });
              } catch {}
            }
          }
        } else if (incomingCall && (!res.activeCall || res.activeCall.id !== incomingCall.id)) {
          // Call was ended or cancelled by caller
          setIncomingCall(null);
          stopIncomingRingtone();
        }
      } catch {}
    };

    // Prompt for browser notification permission once
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }

    incomingCallPollingRef.current = setInterval(pollIncomingCall, 2500);
    return () => {
      if (incomingCallPollingRef.current) clearInterval(incomingCallPollingRef.current);
      stopIncomingRingtone();
    };
  }, [user, isAudioCallOpen, incomingCall]);

  // Caller initiates audio call (RINGS INDEFINITELY UNTIL ANSWERED OR HUNG UP)
  const handleStartAudioCall = async (targetMember?: any) => {
    setIsCallMembersModalOpen(false);
    setIsAudioCallOpen(true);
    setIsAudioCallConnected(false);
    setIsCallMinimized(false);
    setIsCallMuted(false);
    setIsSpeakerOn(true);
    setCallDuration(0);
    setCalledCompanion(targetMember || null);
    setCallStatus('RINGING');

    stopRingbackTone();
    if (callStatusPollingRef.current) clearInterval(callStatusPollingRef.current);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    startRingbackTone();

    // Acquire microphone safely in the background
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }).catch(() => null);
      if (stream) {
        localStreamRef.current = stream;
      }
    } catch (err) {
      console.warn('[AudioCall] Mic acquisition fallback:', err);
    }

    // Create Call Session on Server
    let cId = '';
    try {
      const targetCircle = activeCircleId || circleDetails?.id || (circles.length > 0 ? circles[0].id : null);
      if (targetCircle) {
        const cRes = await api.startCircleCall(targetCircle, targetMember?.user_id);
        if (cRes.success && cRes.callId) {
          cId = cRes.callId;
          setActiveCallId(cId);
        }
      }
    } catch (callErr: any) {
      console.warn('Call initiation API error:', callErr);
    }

    // Continuous Status Polling: Detects when recipient answers or declines (NO AUTO-CONNECT)
    if (cId) {
      callStatusPollingRef.current = setInterval(async () => {
        try {
          const stRes = await api.getCircleCallStatus(cId);
          if (stRes.success) {
            if (stRes.status === 'CONNECTED') {
              // RECIPIENT MANUALLY ANSWERED!
              stopRingbackTone();
              if (callStatusPollingRef.current) {
                clearInterval(callStatusPollingRef.current);
                callStatusPollingRef.current = null;
              }
              setIsAudioCallConnected(true);
              setCallStatus('CONNECTED');

              if (callTimerRef.current) clearInterval(callTimerRef.current);
              callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
              }, 1000);

              onShowToast(
                'success',
                isBn ? 'কল রিসিভ হয়েছে' : 'Call Answered',
                isBn ? 'সাথী কল রিসিভ করেছেন। কথা বলুন।' : 'Recipient answered the call.'
              );
            } else if (stRes.status === 'REJECTED') {
              // RECIPIENT DECLINED
              stopRingbackTone();
              if (callStatusPollingRef.current) {
                clearInterval(callStatusPollingRef.current);
                callStatusPollingRef.current = null;
              }
              handleEndAudioCall(false);
              onShowToast(
                'info',
                isBn ? 'কল গ্রহণ করা হয়নি' : 'Call Declined',
                isBn ? 'সাথী এই মুহূর্তে ব্যস্ত আছেন বা কল কেটে দিয়েছেন।' : 'The companion declined the call.'
              );
            } else if (stRes.status === 'ENDED') {
              stopRingbackTone();
              if (callStatusPollingRef.current) {
                clearInterval(callStatusPollingRef.current);
                callStatusPollingRef.current = null;
              }
              handleEndAudioCall(false);
            }
          }
        } catch {}
      }, 1500);
    }
  };

  // Recipient Accepts Incoming Call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    stopIncomingRingtone();
    const callToJoin = incomingCall;
    setIncomingCall(null);

    try {
      await api.answerCircleCall(callToJoin.id);
    } catch (e) {
      console.warn('Answer call error:', e);
    }

    setActiveCallId(callToJoin.id);
    setCalledCompanion({
      full_name: callToJoin.caller_name,
      photo_url: callToJoin.caller_photo_url,
      user_id: callToJoin.caller_user_id
    });
    if (callToJoin.circle_id) {
      setActiveCircleId(callToJoin.circle_id);
    }

    setIsAudioCallOpen(true);
    setIsAudioCallConnected(true);
    setIsCallMinimized(false);
    setIsCallMuted(false);
    setIsSpeakerOn(true);
    setCallDuration(0);
    setCallStatus('CONNECTED');

    // Acquire microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      }).catch(() => null);
      if (stream) {
        localStreamRef.current = stream;
      }
    } catch {}

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Start status polling to detect if caller hangs up
    if (callToJoin.id) {
      if (callStatusPollingRef.current) clearInterval(callStatusPollingRef.current);
      callStatusPollingRef.current = setInterval(async () => {
        try {
          const stRes = await api.getCircleCallStatus(callToJoin.id);
          if (stRes.success && stRes.status === 'ENDED') {
            handleEndAudioCall(false);
          }
        } catch {}
      }, 2000);
    }

    onShowToast(
      'success',
      isBn ? 'কল রিসিভ হয়েছে' : 'Call Connected',
      isBn ? 'ভয়েস রুম সক্রিয় হয়েছে। কথা বলুন।' : 'Voice room is now live.'
    );
  };

  // Recipient Declines Incoming Call
  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    stopIncomingRingtone();
    const callId = incomingCall.id;
    setIncomingCall(null);

    try {
      await api.declineCircleCall(callId);
    } catch {}

    onShowToast(
      'info',
      isBn ? 'কল বাতিল করা হয়েছে' : 'Call Declined',
      isBn ? 'ইনকামিং কলটি কেটে দেওয়া হয়েছে।' : 'Incoming call declined.'
    );
  };

  const toggleCallMute = () => {
    const nextMuted = !isCallMuted;
    setIsCallMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
    onShowToast(
      'info',
      nextMuted ? (isBn ? 'মাইক্রোফোন মিউট' : 'Microphone Muted') : (isBn ? 'মাইক্রোফোন আনমিউট' : 'Microphone Unmuted'),
      nextMuted ? (isBn ? 'আপনার কথা অন্যরা শুনতে পাবে না।' : 'Your microphone is silenced.') : (isBn ? 'আপনার কথা এখন রুমের সকলে শুনতে পাচ্ছে।' : 'You are now unmuted.')
    );
  };

  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    setIsSpeakerOn(nextSpeaker);
    onShowToast(
      'info',
      nextSpeaker ? (isBn ? 'লাউডস্পিকার চালু' : 'Loudspeaker ON') : (isBn ? 'লাউডস্পিকার বন্ধ' : 'Loudspeaker OFF'),
      nextSpeaker ? (isBn ? 'উচ্চ আওয়াজে লাউডস্পিকার মোড চালু হয়েছে।' : 'Speakerphone volume mode active.') : (isBn ? 'স্বাভাবিক ইয়ারপিস মোড চালু হয়েছে।' : 'Normal audio mode active.')
    );
  };

  const handleEndAudioCall = (notifyServer = true) => {
    stopRingbackTone();
    stopIncomingRingtone();
    if (callStatusPollingRef.current) {
      clearInterval(callStatusPollingRef.current);
      callStatusPollingRef.current = null;
    }
    if (notifyServer && activeCallId) {
      api.endCircleCall(activeCallId).catch(() => {});
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setActiveCallId(null);
    setIsAudioCallOpen(false);
    setIsAudioCallConnected(false);
    setIsCallMinimized(false);
    setIsCallMuted(false);
    setIsSpeakerOn(false);
    setCallDuration(0);
    setCallStatus('CALLING');
    setCalledCompanion(null);
    onShowToast('info', isBn ? 'কল শেষ হয়েছে' : 'Call Ended', isBn ? 'অডিও কলটি সমাপ্ত করা হয়েছে।' : 'Audio call has ended.');
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Active Circle Details
  const [circleDetails, setCircleDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [aggregateProgress, setAggregateProgress] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Quran Goals State
  const [quranGoal, setQuranGoal] = useState<any>(null);
  const [quranLoading, setQuranLoading] = useState(false);

  // Chat & Audio Messages State
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // User Reporting State (Phase 3)
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('HARASSMENT');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  const fullscreenChatScrollRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch {}
        activeAudioRef.current = null;
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        } catch {}
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // Lobby dynamic filtering logic (Only User's Circles)
  const filteredCircles = useMemo(() => {
    return circles.filter(c => {
      // 1. Tab Filter: User's circles only
      if (lobbyTab === 'mine') {
        if (c.admin_id !== user?.id) return false;
      } else if (lobbyTab === 'joined') {
        if (c.admin_id === user?.id) return false;
      }
      
      // 2. Category Filter
      if (selectedCategory !== 'All') {
        if (c.category !== selectedCategory) return false;
      }
      
      return true;
    });
  }, [circles, lobbyTab, selectedCategory, user?.id]);

  // Global Search Effect: Searches ANY circle across the platform
  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await api.searchAllCircles(searchQuery.trim());
        if (res.success) {
          setGlobalSearchResults(res.circles || []);
          if (res.myCircles) {
            setMyCirclesForChallenge(res.myCircles);
          }
        }
      } catch (err) {
        console.error('Error in global circle search:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getCategoryTheme = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'islamic':
        return {
          bg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          avatarBg: 'bg-emerald-950/80 border border-emerald-500/30 text-[#e9c46a]',
          emoji: '🔥',
          label: isBn ? 'ইসলামিক' : 'Islamic'
        };
      case 'education':
        return {
          bg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          avatarBg: 'bg-slate-950/80 border border-emerald-500/30 text-[#e9c46a]',
          emoji: '📖',
          label: isBn ? 'শিক্ষা' : 'Education'
        };
      case 'community':
        return {
          bg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          avatarBg: 'bg-slate-950/80 border border-emerald-500/30 text-[#e9c46a]',
          emoji: '👥',
          label: isBn ? 'কমিউনিটি' : 'Community'
        };
      default:
        return {
          bg: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          badge: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          avatarBg: 'bg-slate-950/80 border border-slate-700/30 text-[#e9c46a]',
          emoji: '🏕️',
          label: isBn ? 'অন্যান্য' : 'Other'
        };
    }
  };

  useEffect(() => {
    fetchCircles();
    fetchPendingInvitations();
    fetchCircleNotifications();
  }, []);

  useEffect(() => {
    if (activeCircleId) {
      fetchCircleDetails(activeCircleId);
      fetchQuranGoals(activeCircleId);
      fetchMessages(activeCircleId);
      fetchCircleBattles(activeCircleId);

      // Auto poll messages & battles
      const interval = setInterval(() => {
        fetchMessages(activeCircleId);
        fetchCircleBattles(activeCircleId);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [activeCircleId]);

  // Auto scroll chat to bottom when messages update in fullscreen mode
  useEffect(() => {
    if (isChatFullscreen && fullscreenChatScrollRef.current) {
      fullscreenChatScrollRef.current.scrollTop = fullscreenChatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatFullscreen]);

  const fetchCircles = async () => {
    setLoading(true);
    try {
      const res = await api.getCircles();
      if (res.success) {
        setCircles(res.circles || []);
      }
    } catch (err) {
      console.error(err);
      onShowToast('error', t('common.error'), t('circle.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCircleBattles = async (id: string) => {
    setBattlesLoading(true);
    try {
      const res = await api.getCircleBattles(id);
      if (res.success) {
        setCircleBattles(res.battles || []);
      }
    } catch (err) {
      console.error('Failed to load circle battles:', err);
    } finally {
      setBattlesLoading(false);
    }
  };

  const handleOpenChallengeModal = (targetCircle: any) => {
    setTargetCircleToChallenge(targetCircle);
    // Auto-select user's created or first active circle as challenger
    const userAdminCircle = circles.find(c => c.admin_id === user?.id) || circles[0];
    setSelectedChallengerCircleId(activeCircleId || userAdminCircle?.id || '');
    setChallengeDurationDays(3);
    setChallengeBattleType('ALL_ROUND');
    setChallengeTitle(isBn ? `নামায, কুরআন ও যিকির পয়েন্ট চ্যালেঞ্জ` : `Salah, Quran & Dhikr Points Battle`);
    setChallengeRulesNote(isBn ? 'ওয়াক্তমত জামাত নামায, কুরআন তিলাওয়াত ও যিকিরে অর্জিত পয়েন্টের লড়াই।' : 'Points competition across Salah, Quran & Dhikr.');
    setShowChallengeModal(true);
  };

  const handleSendChallenge = async () => {
    if (!selectedChallengerCircleId) {
      onShowToast('error', isBn ? 'সার্কেল নির্বাচন করুন' : 'Select Circle', isBn ? 'চ্যালেঞ্জ পাঠাতে আপনার একটি সার্কেল নির্বাচন করুন' : 'Please select your circle to send the challenge');
      return;
    }
    if (!targetCircleToChallenge) return;

    setIsSendingChallenge(true);
    try {
      const res = await api.sendCircleBattleChallenge(selectedChallengerCircleId, {
        opponentCircleId: targetCircleToChallenge.id,
        battleType: challengeBattleType,
        durationDays: challengeDurationDays,
        title: challengeTitle || `পয়েন্ট প্রতিযোগিতা (${challengeDurationDays} দিন)`,
        rulesNote: challengeRulesNote
      });

      if (res.success) {
        onShowToast('success', isBn ? '⚔️ চ্যালেঞ্জ পাঠানো হয়েছে!' : 'Challenge Sent!', res.message);
        setShowChallengeModal(false);
        setTargetCircleToChallenge(null);
        if (activeCircleId) {
          fetchCircleBattles(activeCircleId);
        }
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'চ্যালেঞ্জ পাঠানো সম্ভব হয়নি' : 'Challenge Failed', err.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSendingChallenge(false);
    }
  };

  const handleRespondBattle = async (battleId: string, action: 'ACCEPT' | 'DECLINE') => {
    setRespondingBattleId(battleId);
    try {
      const res = await api.respondToCircleBattle(battleId, action);
      if (res.success) {
        onShowToast('success', action === 'ACCEPT' ? (isBn ? 'প্রতিযোগিতা শুরু হয়েছে!' : 'Battle Started!') : (isBn ? 'প্রত্যাখ্যান করা হয়েছে' : 'Declined'), res.message);
        if (activeCircleId) {
          fetchCircleBattles(activeCircleId);
          fetchMessages(activeCircleId);
        }
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || 'উত্তর সংরক্ষণ করা যায়নি');
    } finally {
      setRespondingBattleId(null);
    }
  };

  const openBattleStatsModal = async (battleId: string) => {
    setStatsLoading(true);
    setShowBattleStatsModal(true);
    try {
      const res = await api.getCircleBattleStats(battleId);
      if (res.success) {
        setSelectedBattleStats(res);
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || 'পরিসংখ্যান লোড করা যায়নি');
      setShowBattleStatsModal(false);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      setPendingLoading(true);
      const res = await api.getPendingCircleInvitations();
      if (res.success) {
        setPendingInvitations(res.invitations || []);
      }
    } catch (err) {
      console.error('Failed to load pending circle invitations:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchCircleNotifications = async () => {
    try {
      setCircleNotifsLoading(true);
      const res = await api.getNotifications();
      if (res && res.notifications) {
        const filtered = res.notifications.filter((n: any) => {
          const type = String(n.type || '').toUpperCase();
          const title = String(n.title || '').toLowerCase();
          const titleBn = String(n.title_bn || '').toLowerCase();
          const message = String(n.message || '').toLowerCase();
          const meta = typeof n.metadata === 'string' ? n.metadata : JSON.stringify(n.metadata || {});
          
          return (
            type === 'CIRCLE_INVITE' ||
            type === 'CIRCLE_MESSAGE' ||
            type.startsWith('CIRCLE_') ||
            title.includes('সার্কেল') ||
            title.includes('circle') ||
            titleBn.includes('সার্কেল') ||
            message.includes('সার্কেল') ||
            meta.includes('circleId')
          );
        });
        setCircleNotifications(filtered);
      }
    } catch (err) {
      console.warn('Failed to load circle notifications:', err);
    } finally {
      setCircleNotifsLoading(false);
    }
  };

  const handleRespondInvitation = async (invitationId: string, action: 'ACCEPT' | 'REJECT') => {
    setRespondingInviteId(invitationId);
    try {
      const res = await api.respondToCircleInvitation(invitationId, action);
      if (res.success) {
        onShowToast('success', action === 'ACCEPT' ? 'সার্কেলে যুক্ত হয়েছেন' : 'আমন্ত্রণ বাতিল', res.message);
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setCircleNotifications(prev => prev.filter(n => {
          const meta = typeof n.metadata === 'string' ? n.metadata : JSON.stringify(n.metadata || {});
          return !meta.includes(invitationId);
        }));
        await fetchCircles();
        fetchCircleNotifications();
        if (action === 'ACCEPT' && res.circleId) {
          setActiveCircleId(res.circleId);
        }
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || 'আমন্ত্রণের উত্তর সংরক্ষণ করা যায়নি');
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleDeleteCircleNotification = async (notificationId: string) => {
    try {
      setDeletingNotificationId(notificationId);
      const res = await api.deleteNotification(notificationId);
      if (res.success) {
        setCircleNotifications(prev => prev.filter(n => n.id !== notificationId));
        onShowToast('info', isBn ? 'নোটিফিকেশন মুছে ফেলা হয়েছে' : 'Deleted', isBn ? 'সার্কেল নোটিফিকেশনটি সফলভাবে মুছে ফেলা হয়েছে।' : 'Notification deleted successfully.');
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || 'নোটিফিকেশন মুছে ফেলা যায়নি');
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      setRespondingInviteId(invitationId);
      const res = await api.deleteCircleInvitation(invitationId);
      if (res.success) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setCircleNotifications(prev => prev.filter(n => {
          const meta = typeof n.metadata === 'string' ? n.metadata : JSON.stringify(n.metadata || {});
          return !meta.includes(invitationId);
        }));
        onShowToast('info', isBn ? 'আমন্ত্রণ বাতিল' : 'Dismissed', isBn ? 'সার্কেল আমন্ত্রণটি মুছে ফেলা হয়েছে।' : 'Circle invitation dismissed.');
      }
    } catch (err: any) {
      // Fallback: respond as REJECT to dismiss cleanly
      await handleRespondInvitation(invitationId, 'REJECT');
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleClearAllCircleNotifications = async () => {
    if (!window.confirm(isBn ? 'আপনি কি সব সার্কেল নোটিফিকেশন মুছে ফেলতে চান?' : 'Are you sure you want to clear all circle notifications?')) {
      return;
    }
    try {
      setIsClearingAllNotifs(true);
      await Promise.allSettled(
        circleNotifications.map(n => api.deleteNotification(n.id))
      );
      setCircleNotifications([]);
      onShowToast('success', isBn ? 'সব নোটিফিকেশন মোছা হয়েছে' : 'Cleared', isBn ? 'সকল সার্কেল নোটিফিকেশন মুছে ফেলা হয়েছে।' : 'All circle notifications cleared.');
    } catch (err: any) {
      onShowToast('error', t('common.error'), 'নোটিফিকেশন মুছতে সমস্যা হয়েছে');
    } finally {
      setIsClearingAllNotifs(false);
    }
  };

  const handleMarkAllCircleNotificationsRead = async () => {
    try {
      await Promise.allSettled(
        circleNotifications.filter(n => !n.read).map(n => api.markNotificationRead(n.id))
      );
      setCircleNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onShowToast('success', isBn ? 'পঠিত চিহ্নিত' : 'Marked Read', isBn ? 'সকল সার্কেল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে।' : 'All marked as read.');
    } catch (err: any) {
      onShowToast('error', t('common.error'), 'আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handleOpenCircleChatFromNotification = (notif: any) => {
    let circleId = notif.circle_id || notif.circleId || notif.metadata?.circleId;
    if (!circleId && typeof notif.metadata === 'string') {
      try {
        const parsed = JSON.parse(notif.metadata);
        circleId = parsed.circleId || parsed.circle_id;
      } catch (e) {}
    }
    
    // Fallback: match circle name if circleId is not directly found
    if (!circleId && circles && circles.length > 0) {
      const matched = circles.find(c => 
        (notif.title && notif.title.includes(c.name)) || 
        (notif.message && notif.message.includes(c.name)) ||
        (notif.title_bn && notif.title_bn.includes(c.name)) ||
        (notif.message_bn && notif.message_bn.includes(c.name))
      );
      if (matched) circleId = matched.id;
    }

    if (circleId) {
      setActiveCircleId(circleId);
      setIsChatFullscreen(true);
      setIsViewingCircleNotifications(false);
      if (!notif.read) {
        api.markNotificationRead(notif.id).catch(() => {});
        setCircleNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      }
    } else {
      setIsViewingCircleNotifications(false);
    }
  };

  const fetchCircleDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await api.getCircleDetails(id);
      if (res.success) {
        setCircleDetails(res.circle);
        setMembers(res.members || []);
        setAggregateProgress(res.aggregateProgress || null);
      }
    } catch (err) {
      console.error(err);
      onShowToast('error', t('common.error'), t('circle.errors.detailsLoadFailed'));
      setActiveCircleId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchQuranGoals = async (id: string) => {
    setQuranLoading(true);
    try {
      const res = await api.getCircleQuranGoals(id);
      if (res.success) {
        setQuranGoal(res.goal);
      }
    } catch (err) {
      console.error('Quran goal load error:', err);
    } finally {
      setQuranLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    setChatLoading(true);
    try {
      const res = await api.getCircleMessages(id);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Messages load error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCircleName.trim()) {
      onShowToast('error', t('common.warning'), t('circle.errors.nameRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.createCircle({ 
        name: newCircleName.trim(), 
        description: newCircleDesc.trim(),
        category: newCircleCategory,
        jamaatStreak: newCircleStreak
      });
      if (res.success) {
        onShowToast('success', t('common.success'), res.message || t('circle.createSuccess'));
        setShowCreate(false);
        setNewCircleName('');
        setNewCircleDesc('');
        setNewCircleCategory('Islamic');
        setNewCircleStreak(7);
        await fetchCircles();
        setActiveCircleId(res.circleId);
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('circle.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCodeInput.trim()) {
      onShowToast('error', t('common.warning'), t('circle.errors.codeRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.joinCircle(inviteCodeInput.trim().toUpperCase());
      if (res.success) {
        onShowToast('success', t('common.success'), res.message || t('circle.joinSuccess'));
        setShowJoin(false);
        setInviteCodeInput('');
        await fetchCircles();
        setActiveCircleId(res.circleId);
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('circle.errors.joinFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!activeCircleId) return;
    setIsConfirmingLeave(true);
  };

  const handleConfirmLeave = async () => {
    try {
      const res = await api.leaveCircle(activeCircleId!);
      if (res.success) {
        onShowToast('success', t('common.success'), res.message || t('circle.leaveSuccess'));
        setActiveCircleId(null);
        setIsChatFullscreen(false);
        setIsConfirmingLeave(false);
        fetchCircles();
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('circle.errors.leaveFailed'));
    }
  };

  const handleDelete = async () => {
    if (!activeCircleId) return;
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await api.deleteCircle(activeCircleId!);
      if (res.success) {
        onShowToast('success', t('common.success'), res.message || t('circle.deleteSuccess'));
        setActiveCircleId(null);
        setIsChatFullscreen(false);
        setIsConfirmingDelete(false);
        fetchCircles();
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('circle.errors.deleteFailed'));
    }
  };

  const handleOpenInviteModal = async () => {
    if (!activeCircleId) return;
    setShowInviteModal(true);
    setSearchPhoneInput('');
    setFoundUser(null);
    setSearchUserError('');
    try {
      const res = await api.createCircleInvite(activeCircleId);
      if (res.success) {
        setGeneratedInviteCode(res.inviteCode);
      }
    } catch (err) {
      console.error('Failed to generate invite code:', err);
    }
  };

  const handleSearchPhone = async (phoneToSearch?: string) => {
    const queryPhone = (phoneToSearch ?? searchPhoneInput).trim();
    if (!queryPhone || queryPhone.length < 5) {
      setFoundUser(null);
      setSearchUserError('');
      return;
    }
    setIsSearchingUser(true);
    setSearchUserError('');
    try {
      const res = await api.searchCircleUserByPhone(queryPhone, activeCircleId || undefined);
      if (res.success && res.user) {
        setFoundUser(res.user);
        setSearchUserError('');
      } else {
        setFoundUser(null);
        setSearchUserError(res.message || 'এই নম্বরে কোনো ইউজার পাওয়া যায়নি');
      }
    } catch (err: any) {
      setFoundUser(null);
      setSearchUserError(err.message || 'এই নম্বরে কোনো নিবন্ধিত ইউজার পাওয়া যায়নি');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleSendDirectInvite = async () => {
    if (!activeCircleId || !foundUser) return;
    setIsInvitingUser(true);
    try {
      const res = await api.inviteUserToCircle(activeCircleId, { targetUserId: foundUser.id });
      if (res.success) {
        onShowToast('success', 'আমন্ত্রণ পাঠানো হয়েছে', res.message);
        setFoundUser(null);
        setSearchPhoneInput('');
        setShowInviteModal(false);
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'আমন্ত্রণ পাঠানো সম্ভব হয়নি');
    } finally {
      setIsInvitingUser(false);
    }
  };

  const handleSendNudge = async (type: 'REMINDER' | 'ENCOURAGEMENT' | 'NOSIHA', customText?: string) => {
    if (!activeCircleId) return;
    let text = customText || '';
    if (!text) {
      if (type === 'REMINDER') text = language === 'bn' ? 'ভাই, সালাতের সময় হয়েছে। চলো মসজিদে জামাতে আদায় করি! 🕌' : "Brother, prayer time is here. Let's pray in Jamah! 🕌";
      if (type === 'ENCOURAGEMENT') text = language === 'bn' ? 'মাশাআল্লাহ! ঈমানের ওপর অটল থাকুন, আল্লাহ উত্তম প্রতিদান দেবেন। 🌱' : 'MashaAllah! Stay steadfast on iman, may Allah reward you! 🌱';
      if (type === 'NOSIHA') text = language === 'bn' ? 'আসসালামু আলাইকুম, আজকের নির্ধারিত জিকির ও কুরআন তিলাওয়াত পূর্ণ করার আহ্বান। 📖' : 'Assalamu Alaikum, gentle reminder for daily dhikr and Quran recitation. 📖';
    }
    try {
      const res = await api.notifyCircle(activeCircleId, { type, message: text });
      if (res.success) {
        onShowToast('success', 'নাড়া পাঠানো হয়েছে', text);
        // Also add to chat feed
        await api.sendCircleMessage(activeCircleId, {
          messageType: 'NUDGE',
          content: text
        });
        fetchMessages(activeCircleId);
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), err.message || t('circle.errors.messageFailed'));
    }
  };

  const renderMessageStatusTicks = (msg: any) => {
    // Determine read_by array
    let readByList: string[] = [];
    if (msg.read_by) {
      if (Array.isArray(msg.read_by)) {
        readByList = msg.read_by;
      } else if (typeof msg.read_by === 'string') {
        try {
          readByList = JSON.parse(msg.read_by);
        } catch {
          readByList = [];
        }
      }
    }

    // Filter out current user from read_by list to find if other companions have read
    const otherReaders = readByList.filter(id => id && id !== user?.id);
    const isSeenByOthers = otherReaders.length > 0;
    const isSending = msg.status === 'SENDING' || msg.pending;

    // 1. মেসেজ না গেলে / পাঠানোর অপেক্ষায় -> একটি মলিন টিক (Single grey tick)
    if (isSending) {
      return (
        <span title="মেসেজ পাঠানো হচ্ছে (একটি মলিন টিক)" className="inline-flex items-center">
          <Check className="w-3.5 h-3.5 text-slate-400/70 inline shrink-0" />
        </span>
      );
    }

    // 2. ডেলিভার্ড হয়েছে কিন্তু না দেখলে -> ডাবল মলিন টিক (Double grey ticks)
    if (!isSeenByOthers) {
      return (
        <span title="ডেলিভার্ড হয়েছে (এখনো দেখা হয়নি - ডাবল মলিন টিক)" className="inline-flex items-center">
          <CheckCheck className="w-3.5 h-3.5 text-slate-400/80 inline shrink-0" />
        </span>
      );
    }

    // 3. মেসেজ seen হওয়ার পর -> ডাবল টিক নীল হবে (Double bright blue ticks)
    return (
      <span title={`পড়েছেন: ${otherReaders.length} জন সাথী (ডাবল নীল টিক)`} className="inline-flex items-center">
        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline shrink-0 drop-shadow-[0_0_2px_rgba(83,189,235,0.7)]" />
      </span>
    );
  };

  const handleSendMessage = async (text?: string) => {
    const messageToSend = (text || newMessageText).trim();
    if (!messageToSend || !activeCircleId) return;

    // Optimistic message with single grey tick (SENDING)
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      circle_id: activeCircleId,
      user_id: user?.id,
      sender_name: user?.fullName || 'সাথী',
      message_type: 'TEXT',
      content: messageToSend,
      status: 'SENDING',
      read_by: [],
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessageText('');
    setIsSendingMessage(true);

    try {
      const res = await api.sendCircleMessage(activeCircleId, {
        messageType: 'TEXT',
        content: messageToSend
      });
      if (res.success) {
        fetchMessages(activeCircleId);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      onShowToast('error', 'ত্রুটি', err.message || 'মেসেজ পাঠানো সম্ভব হয়নি');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleToggleJuz = async (juzNum: number) => {
    if (!activeCircleId) return;
    try {
      const res = await api.toggleCircleQuranJuz(activeCircleId, juzNum);
      if (res.success) {
        setQuranGoal(res.goal);
        onShowToast('success', 'কুরআন খতম আপডেট', res.message);
        fetchMessages(activeCircleId);
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'পারা আপডেট করা যায়নি');
    }
  };

  // Pleasant Web Audio synthetic voice/chime tone fallback (guaranteed on Android/iOS/Desktop)
  const playSyntheticVoiceFallback = (durationSec: number, onFinish: () => void) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setTimeout(onFinish, Math.min(durationSec || 3, 3) * 1000);
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + Math.min(durationSec || 2, 1.2));
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + Math.min(durationSec || 2, 2.0));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + Math.min(durationSec || 2, 2.0));
      setTimeout(() => {
        try { ctx.close(); } catch {}
        onFinish();
      }, Math.min(durationSec || 2, 2.0) * 1000);
    } catch {
      setTimeout(onFinish, Math.min(durationSec || 3, 3) * 1000);
    }
  };

  const handleToggleAudioPlay = (msg: any) => {
    if (playingAudioId === msg.id) {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
        } catch {}
        activeAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    // Stop currently playing
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }

    setPlayingAudioId(msg.id);
    const audioSrc = msg.audio_url || msg.audioUrl;

    if (!audioSrc) {
      playSyntheticVoiceFallback(msg.audio_duration_sec || 3, () => {
        setPlayingAudioId(prev => prev === msg.id ? null : prev);
      });
      return;
    }

    try {
      const audio = new Audio();
      audio.src = audioSrc;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      activeAudioRef.current = audio;

      audio.onended = () => {
        setPlayingAudioId(prev => prev === msg.id ? null : prev);
        activeAudioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback for failed remote audio or blocked codec on Android
        playSyntheticVoiceFallback(msg.audio_duration_sec || 3, () => {
          setPlayingAudioId(prev => prev === msg.id ? null : prev);
        });
        activeAudioRef.current = null;
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playSyntheticVoiceFallback(msg.audio_duration_sec || 3, () => {
            setPlayingAudioId(prev => prev === msg.id ? null : prev);
          });
        });
      }
    } catch {
      playSyntheticVoiceFallback(msg.audio_duration_sec || 3, () => {
        setPlayingAudioId(prev => prev === msg.id ? null : prev);
      });
    }
  };

  // Voice Note recording with MediaRecorder and microphone capture
  const handleStartVoiceRecording = async () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          }

          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(100);
        }
      }
    } catch (err) {
      console.warn('[VoiceRecord] Mic access not available or denied, continuing with fallback duration timer', err);
    }
  };

  const handleCancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const handleStopAndSendVoice = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const duration = recordingSeconds || 3;
    setIsRecording(false);
    setRecordingSeconds(0);

    if (!activeCircleId) return;

    let recordedDataUrl = '';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        });
      } catch {}
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }

    if (audioChunksRef.current.length > 0) {
      try {
        const mimeType = audioChunksRef.current[0].type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        recordedDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Failed to encode audio blob', e);
      }
    }

    // Optimistic voice message with single grey tick
    const tempId = 'temp-audio-' + Date.now();
    const tempMsg = {
      id: tempId,
      circle_id: activeCircleId,
      user_id: user?.id,
      sender_name: user?.fullName || (isBn ? 'সাথী' : 'Companion'),
      message_type: 'AUDIO',
      content: isBn ? `ভয়েস মেসেজ (${fmtNum(duration)} সেকেন্ড)` : `Voice Message (${fmtNum(duration)} seconds)`,
      audio_duration_sec: duration,
      audio_url: recordedDataUrl || undefined,
      status: 'SENDING',
      read_by: [],
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await api.sendCircleMessage(activeCircleId, {
        messageType: 'AUDIO',
        content: isBn ? `ভয়েস মেসেজ (${fmtNum(duration)} সেকেন্ড)` : `Voice Message (${fmtNum(duration)} seconds)`,
        audioUrl: recordedDataUrl || undefined,
        audioDurationSec: duration
      });
      if (res.success) {
        onShowToast('success', isBn ? 'ভয়েস নোট পাঠানো হয়েছে' : 'Voice note sent', isBn ? `দৈর্ঘ্য: ${fmtNum(duration)} সেকেন্ড` : `Duration: ${fmtNum(duration)} seconds`);
        fetchMessages(activeCircleId);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || (isBn ? 'ভয়েস নোট পাঠানো সম্ভব হয়নি' : 'Could not send voice note'));
    }
  };

  const handleOpenReportModal = (msg: any) => {
    setReportingMessage(msg);
    setReportCategory('HARASSMENT');
    setReportDescription('');
  };

  const handleCloseReportModal = () => {
    setReportingMessage(null);
    setReportDescription('');
    setIsSubmittingReport(false);
  };

  const handleSubmitReport = async () => {
    if (!activeCircleId || !reportingMessage) return;
    setIsSubmittingReport(true);
    try {
      const res = await api.reportCircleMessage(activeCircleId, reportingMessage.id, {
        category: reportCategory,
        description: reportDescription.trim() || undefined
      });
      if (res.success) {
        onShowToast(
          'success',
          isBn ? 'রিপোর্ট গৃহীত হয়েছে' : 'Report Submitted',
          isBn ? 'বার্তাটি পর্যালোচনার জন্য এডমিন প্যানেলে পাঠানো হয়েছে।' : 'The message has been sent to moderators for review.'
        );
        handleCloseReportModal();
      } else {
        onShowToast('error', t('common.error'), res.message || (isBn ? 'রিপোর্ট পাঠানো যায়নি' : 'Failed to submit report'));
      }
    } catch (err: any) {
      console.error('Report submission error:', err);
      onShowToast('error', t('common.error'), err.message || (isBn ? 'রিপোর্ট পাঠানো যায়নি' : 'Failed to submit report'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const safeParseJuzList = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const completedJuzCount = useMemo(() => {
    if (!quranGoal || !quranGoal.completed_juz) return 0;
    const list = safeParseJuzList(quranGoal.completed_juz);
    return list.length;
  }, [quranGoal]);

  const completedJuzMap = useMemo(() => {
    const map = new Map<number, any>();
    if (!quranGoal || !quranGoal.completed_juz) return map;
    const list = safeParseJuzList(quranGoal.completed_juz);
    list.forEach(item => {
      if (item && item.juz) map.set(item.juz, item);
    });
    return map;
  }, [quranGoal]);

  // Quick Islamic praise phrases for WhatsApp bar
  const quickPhrases = isBn ? [
    'সুবহানাল্লাহ 💫',
    'আলহামদুলিল্লাহ 🤲',
    'আল্লাহু আকবার 🌟',
    'মাশাআল্লাহ 🤍',
    'জাযাকাল্লাহু খাইরান 🌸',
    'চলো মসজিদে 🕌',
    'আমিন 🤲'
  ] : [
    'SubhanAllah 💫',
    'Alhamdulillah 🤲',
    'Allahu Akbar 🌟',
    'MashaAllah 🤍',
    'JazakAllah Khair 🌸',
    'Let\'s go to Mosque 🕌',
    'Ameen 🤲'
  ];

  // Helper to render Invite Modal
  const renderInviteModal = () => {
    if (!showInviteModal) return null;
    return (
      <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#041912] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              {isBn ? 'সাথীদের সার্কেলে আমন্ত্রণ জানান' : 'Invite Companions to Circle'}
            </h3>
            <button 
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Option 1: Direct Phone Number Search */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
            <label className="text-xs font-bold text-slate-200 block">
              {isBn ? '📱 ফোন নম্বর দিয়ে সরাসরি আমন্ত্রণ পাঠান' : '📱 Send Direct Invite via Phone Number'}
            </label>
            
            <div className="flex items-center gap-2">
              <input 
                type="tel"
                value={searchPhoneInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchPhoneInput(val);
                  if (val.trim().length >= 8) {
                    handleSearchPhone(val);
                  } else {
                    setFoundUser(null);
                    setSearchUserError('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchPhone();
                }}
                placeholder={isBn ? "যেমন: 01712345678" : "e.g. 01712345678"}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleSearchPhone()}
                disabled={isSearchingUser || !searchPhoneInput.trim()}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                {isSearchingUser ? (isBn ? 'খোঁজা হচ্ছে...' : 'Searching...') : (isBn ? 'সার্চ' : 'Search')}
              </button>
            </div>

            {/* Search Result Card */}
            {foundUser && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs overflow-hidden shrink-0 border border-emerald-500/30 shadow-md">
                    {(foundUser.photoUrl || foundUser.photo_url) ? (
                      <img 
                        src={foundUser.photoUrl || foundUser.photo_url} 
                        alt={foundUser.fullName || 'User'} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{foundUser.fullName?.charAt(0) || (isBn ? 'স' : 'C')}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{foundUser.fullName}</h4>
                    <p className="text-[10px] text-emerald-300 font-mono">
                      {foundUser.phone ? `${foundUser.phone.slice(0, 4)}***${foundUser.phone.slice(-3)}` : (isBn ? 'নম্বর সংরক্ষিত' : 'Number saved')}
                    </p>
                  </div>
                </div>

                {foundUser.isAlreadyMember ? (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30">
                    {isBn ? 'ইতোমধ্যে সদস্য' : 'Already Member'}
                  </span>
                ) : foundUser.isInvitePending ? (
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-1 rounded-md border border-sky-500/30">
                    {isBn ? 'আমন্ত্রণ পেন্ডিং' : 'Invite Pending'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendDirectInvite}
                    disabled={isInvitingUser}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isInvitingUser ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (isBn ? 'আমন্ত্রণ পাঠান' : 'Send Invite')}</span>
                  </button>
                )}
              </div>
            )}

            {searchUserError && (
              <p className="text-xs text-rose-400 font-medium px-1">
                ⚠️ {searchUserError}
              </p>
            )}
          </div>

          {/* Option 2: Shareable Code */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-400 block">
              {isBn ? '🔗 অথবা ইনভাইট কোড শেয়ার করুন' : '🔗 Or Share Invite Code'}
            </label>
            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 px-3">
              <span className="font-mono text-sm font-black text-amber-400 tracking-widest">
                {generatedInviteCode || (isBn ? 'লোড হচ্ছে...' : 'Loading...')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (generatedInviteCode) {
                    navigator.clipboard.writeText(generatedInviteCode);
                    onShowToast('success', isBn ? 'কপি হয়েছে' : 'Copied', `${isBn ? 'কোড' : 'Code'}: ${generatedInviteCode}`);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{isBn ? 'কপি' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCallMembersModal = () => {
    if (!isCallMembersModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[10005] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#06241a] via-[#03140e] to-[#010a07] border border-emerald-500/40 p-6 shadow-2xl space-y-4 text-white relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4.5 h-4.5 text-emerald-400" />
              {isBn ? 'গ্রুপ কল ও সদস্য তালিকা' : 'Group Call & Members'}
            </h3>
            <button 
              type="button"
              onClick={() => setIsCallMembersModalOpen(false)}
              className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Group Call Action */}
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-between gap-3 shadow-inner">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🔊</span> {isBn ? 'সবাইকে একসাথে কল করুন' : 'Ring All / Group Call'}
              </h4>
              <p className="text-[11px] text-emerald-300 mt-0.5">
                {isBn ? 'গ্রুপের সকল সক্রিয় সাথীদের সাথে ভয়েস কনফারেন্স শুরু করুন।' : 'Start audio conference with all active circle companions.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCallMembersModalOpen(false);
                handleStartAudioCall();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isBn ? 'গ্রুপ কল' : 'Group Call'}</span>
            </button>
          </div>

          {/* Members List Header & Add Button */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs font-bold text-slate-300">
              {isBn ? `সদস্য তালিকা (${members.length})` : `Members (${members.length})`}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCallMembersModalOpen(false);
                handleOpenInviteModal();
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              <span>{isBn ? 'সদস্য যোগ করুন' : 'Add Member'}</span>
            </button>
          </div>

          {/* Members List Scrollable */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {members.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const memberPhoto = isMe ? (user?.photoUrl || m.photo_url || m.photoUrl) : (m.photo_url || m.photoUrl);
              return (
                <div key={`call-mem-${m.user_id || idx}`} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow overflow-hidden border border-emerald-500/30">
                      {memberPhoto ? (
                        <img 
                          src={memberPhoto} 
                          alt={m.full_name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span>{m.full_name?.charAt(0) || 'স'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{m.full_name}</span>
                        {isMe && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-normal">{isBn ? 'আপনি' : 'You'}</span>}
                        {m.role === 'ADMIN' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">আমির</span>}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {m.phone ? `${m.phone.slice(0, 4)}***${m.phone.slice(-3)}` : (isBn ? 'সক্রিয় সদস্য' : 'Active Member')}
                      </p>
                    </div>
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCallMembersModalOpen(false);
                        handleStartAudioCall(m);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-bold border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                      title={isBn ? "কল দিন" : "Call member"}
                    >
                      <Phone className="w-3 h-3" />
                      <span>{isBn ? 'কল' : 'Call'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsCallMembersModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAudioCallModal = () => {
    if (!isAudioCallOpen) return null;

    // 1. FLOATING MINIMIZED CALL PILL (Shown when minimized so user can view chat during call)
    if (isCallMinimized) {
      const minPill = (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10000000] w-[95%] max-w-md bg-gradient-to-r from-[#031d13] via-[#02130d] to-[#010a07] border border-emerald-500/50 rounded-2xl p-2.5 px-3.5 shadow-2xl shadow-emerald-950/80 backdrop-blur-xl flex items-center justify-between gap-2.5 animate-fadeIn text-white select-none">
          <div 
            onClick={() => setIsCallMinimized(false)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            title={isBn ? "ট্যাপ করে ফুলস্ক্রিন কলে ফিরে যান" : "Tap to expand call to full screen"}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow">
                <PhoneCall className="w-4 h-4 animate-pulse text-emerald-100" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-ping" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white truncate">
                  {calledCompanion ? calledCompanion.full_name : (circleDetails?.name || 'Cave Circle')}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <span>{isAudioCallConnected ? formatCallTime(callDuration) : (isBn ? 'রিং হচ্ছে...' : 'Ringing...')}</span>
                <span>•</span>
                <span className="text-slate-400 font-normal">
                  {isCallMuted ? (isBn ? 'মিউট' : 'Muted') : (isSpeakerOn ? (isBn ? 'লাউড' : 'Speaker') : (isBn ? 'সক্রিয়' : 'Active'))}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Loudspeaker Toggle */}
            <button
              type="button"
              onClick={toggleSpeaker}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSpeakerOn 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isSpeakerOn ? (isBn ? 'লাউডস্পিকার বন্ধ' : 'Speaker OFF') : (isBn ? 'লাউডস্পিকার চালু' : 'Speaker ON')}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <Volume1 className="w-4 h-4" />}
            </button>

            {/* Quick Mute Toggle */}
            <button
              type="button"
              onClick={toggleCallMute}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isCallMuted 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                  : 'bg-slate-900 border-slate-700 text-emerald-400'
              }`}
              title={isCallMuted ? (isBn ? 'আনমিউট' : 'Unmute') : (isBn ? 'মিউট' : 'Mute')}
            >
              {isCallMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Expand / Maximize to Fullscreen */}
            <button
              type="button"
              onClick={() => setIsCallMinimized(false)}
              className="p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white cursor-pointer"
              title={isBn ? "ফুলস্ক্রিন কল দেখুন" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Quick End Call */}
            <button
              type="button"
              onClick={() => handleEndAudioCall(true)}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md"
              title={isBn ? "কল কাটুন" : "End Call"}
            >
              <Phone className="w-4 h-4 rotate-[135deg]" />
            </button>
          </div>
        </div>
      );
      return createPortal(minPill, document.body);
    }

    // 2. FULLSCREEN IMMERSIVE CALL OVERLAY
    const modalContent = (
      <div className="fixed inset-0 z-[1000000] bg-gradient-to-b from-[#03150e] via-[#010906] to-black flex flex-col items-center justify-between p-5 sm:p-10 animate-fadeIn text-white select-none">
        {/* Ambient background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

        {/* Top Header with Minimize Button */}
        <div className="w-full max-w-lg mx-auto flex items-center justify-between pt-2 sm:pt-4 relative z-10">
          <button
            type="button"
            onClick={() => setIsCallMinimized(true)}
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer active:scale-95"
            title={isBn ? "কল মিনিমাইজ করে চ্যাটে যান" : "Minimize Call & View Chat"}
          >
            <Minimize2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden xs:inline">{isBn ? 'মিনিমাইজ' : 'Minimize'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {isBn ? 'সুরক্ষিত ভয়েস রুম' : 'Secure Voice Room'}
            </span>
          </div>

          {isAudioCallConnected ? (
            <div className="text-xs sm:text-sm font-mono font-bold text-emerald-400 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-lg animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {formatCallTime(callDuration)}
            </div>
          ) : (
            <div className="text-xs font-bold text-amber-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 animate-pulse">
              {isBn ? 'রিং হচ্ছে...' : 'Ringing...'}
            </div>
          )}
        </div>

        {/* Center Calling Info & Companion Details */}
        <div className="w-full max-w-md mx-auto text-center space-y-5 sm:space-y-6 relative z-10 my-auto">
          <div className="relative w-28 h-28 mx-auto">
            {callStatus === 'CONNECTED' ? (
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-75" />
            ) : (
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-pulse opacity-50" />
            )}
            <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${
              callStatus === 'CONNECTED' ? 'from-emerald-600 to-teal-800 border-emerald-400' : 'from-slate-800 to-slate-950 border-slate-700'
            } border-2 flex items-center justify-center text-white shadow-2xl transition-all duration-500`}>
              <PhoneCall className={`w-12 h-12 ${callStatus !== 'CONNECTED' ? 'animate-bounce text-amber-300' : 'animate-pulse text-emerald-300'}`} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {calledCompanion ? calledCompanion.full_name : (circleDetails?.name || (isBn ? 'সার্কেল ভয়েস কল' : 'Circle Voice Call'))}
            </h2>
            <p className="text-sm text-emerald-300 font-medium">
              {callStatus === 'CONNECTED' ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1.5 font-bold">
                  🎙️ {isBn ? 'ভয়েস কানেকশন সক্রিয়' : 'Voice connection active'}
                </span>
              ) : (
                <span className="text-amber-300 flex items-center justify-center gap-1.5 font-semibold animate-pulse">
                  🔔 {isBn ? 'রিং হচ্ছে...' : 'Ringing...'}
                </span>
              )}
            </p>
          </div>

          {/* ACTIVE PARTICIPANTS GRID */}
          <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-4 max-w-sm mx-auto shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 mb-3 text-left px-1">
              {isBn ? 'অনলাইন অংশগ্রহণকারীগণ' : 'Active Participants'}
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Me */}
              <div className="p-2.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-md overflow-hidden border border-emerald-400/40">
                  {user?.photoUrl ? (
                    <img 
                      src={user?.photoUrl} 
                      alt={user?.fullName || 'Me'} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span>{user?.fullName?.charAt(0) || 'M'}</span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-white truncate max-w-full">{isBn ? 'আপনি' : 'You'}</span>
                <span className="text-[9px] text-emerald-400 font-medium">
                  {isCallMuted ? (isBn ? 'মিউট' : 'Muted') : (isBn ? 'কথা বলছেন' : 'Speaking')}
                </span>
              </div>

              {/* Target Companion or other circle members */}
              {calledCompanion ? (
                <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-bold flex items-center justify-center text-xs shadow-md overflow-hidden border border-amber-500/40">
                    {(calledCompanion.photo_url || calledCompanion.photoUrl) ? (
                      <img 
                        src={calledCompanion.photo_url || calledCompanion.photoUrl} 
                        alt={calledCompanion.full_name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>{calledCompanion.full_name?.charAt(0) || 'S'}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-white truncate max-w-full">{calledCompanion.full_name?.split(' ')[0]}</span>
                  <span className="text-[9px] text-amber-400 font-medium">
                    {callStatus === 'CONNECTED' ? (isBn ? 'কথা বলছেন' : 'Speaking') : (isBn ? 'রিং হচ্ছে' : 'Ringing')}
                  </span>
                </div>
              ) : (
                members.filter(m => m.user_id !== user?.id).slice(0, 2).map((m, idx) => {
                  const mPhoto = m.photo_url || m.photoUrl;
                  return (
                    <div key={m.user_id || idx} className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-md overflow-hidden border border-emerald-500/30">
                        {mPhoto ? (
                          <img 
                            src={mPhoto} 
                            alt={m.full_name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span>{m.full_name?.charAt(0) || 'S'}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-white truncate max-w-full">{m.full_name?.split(' ')[0] || 'Companion'}</span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {callStatus === 'CONNECTED' ? (isBn ? 'কথা বলছেন' : 'Speaking') : (isBn ? 'অনলাইন' : 'Online')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Call Controls: Loudspeaker, Mute & End Call */}
        <div className="w-full max-w-md mx-auto flex items-center justify-center gap-3 sm:gap-5 pb-6 sm:pb-8 relative z-10">
          {/* 1. Loudspeaker (লাউডস্পিকার) Button */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-xl min-w-[80px] sm:min-w-[90px] active:scale-95 ${
              isSpeakerOn 
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40' 
                : 'bg-slate-900/95 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isSpeakerOn ? (isBn ? 'লাউডস্পিকার বন্ধ করুন' : 'Turn Off Loudspeaker') : (isBn ? 'লাউডস্পিকার চালু করুন' : 'Turn On Loudspeaker')}
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6 text-amber-400" /> : <Volume1 className="w-6 h-6 text-slate-400" />}
            <span className="text-[10px] sm:text-[11px] font-bold">
              {isSpeakerOn ? (isBn ? 'লাউড চালু' : 'Loud ON') : (isBn ? 'লাউড বন্ধ' : 'Loud OFF')}
            </span>
          </button>

          {/* 2. Mute / Unmute (মাইক্রোফোন মিউট) Button */}
          <button
            type="button"
            onClick={toggleCallMute}
            className={`flex flex-col items-center justify-center gap-1.5 p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-xl min-w-[80px] sm:min-w-[90px] active:scale-95 ${
              isCallMuted 
                ? 'bg-rose-500/25 border-rose-500 text-rose-400 ring-2 ring-rose-500/40' 
                : 'bg-slate-900/95 border-slate-700 text-emerald-400 hover:bg-slate-800'
            }`}
            title={isCallMuted ? (isBn ? 'মাইক্রোফোন আনমিউট করুন' : 'Unmute') : (isBn ? 'মাইক্রোফোন মিউট করুন' : 'Mute')}
          >
            {isCallMuted ? <MicOff className="w-6 h-6 text-rose-400" /> : <Mic className="w-6 h-6 text-emerald-400" />}
            <span className="text-[10px] sm:text-[11px] font-bold">
              {isCallMuted ? (isBn ? 'মিউট' : 'Muted') : (isBn ? 'আনমিউট' : 'Unmuted')}
            </span>
          </button>

          {/* 3. End Call (কল কেটে দিন) Button */}
          <button
            type="button"
            onClick={() => handleEndAudioCall(true)}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3.5 sm:p-4 px-6 sm:px-8 rounded-3xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer shadow-2xl shadow-rose-950/80 active:scale-95 min-w-[90px]"
            title={isBn ? 'কল কেটে দিন' : 'End Call'}
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
            <span className="text-xs sm:text-sm">{isBn ? 'কল কাটুন' : 'End Call'}</span>
          </button>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // ==========================================
  // MODAL: REAL INCOMING AUDIO CALL ALERT (Manual Receive & Decline)
  // ==========================================
  const renderIncomingCallModal = () => {
    if (!incomingCall || isAudioCallOpen) return null;

    const modal = (
      <div className="fixed inset-0 z-[10000000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-12 animate-fadeIn text-white select-none">
        {/* Ambient animated ripple effects */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-teal-500/15 blur-[90px] pointer-events-none" />

        {/* Top Header Badge */}
        <div className="w-full max-w-md mx-auto text-center pt-4 relative z-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/40 shadow-lg animate-pulse inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🏕️ {incomingCall.circle_name || (isBn ? 'কেভ সার্কেল ভয়েস কল' : 'Cave Circle Voice Call')}</span>
          </span>
        </div>

        {/* Caller Avatar & Name */}
        <div className="w-full max-w-md mx-auto text-center space-y-6 relative z-10 my-auto">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping opacity-75" />
            <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-pulse opacity-60" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 border-2 border-emerald-400 flex items-center justify-center text-white shadow-2xl overflow-hidden ring-4 ring-emerald-500/30">
              {incomingCall.caller_photo_url ? (
                <img
                  src={incomingCall.caller_photo_url}
                  alt={incomingCall.caller_name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-4xl font-black">{incomingCall.caller_name?.charAt(0) || 'সা'}</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {incomingCall.caller_name || (isBn ? 'সাথী' : 'Companion')}
            </h2>
            <p className="text-sm sm:text-base text-emerald-300 font-semibold animate-pulse flex items-center justify-center gap-2">
              <span className="text-lg">🔔</span>
              <span>{isBn ? 'আপনাকে ভয়েস কল দিচ্ছেন...' : 'Incoming Audio Call...'}</span>
            </p>
          </div>
        </div>

        {/* Bottom Accept & Decline Action Buttons */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-around gap-8 pb-8 sm:pb-12 relative z-10">
          {/* 1. Decline (লাল বাটন - কেটে দিন) */}
          <button
            type="button"
            onClick={handleDeclineIncomingCall}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-950 transition-all ring-4 ring-rose-500/30">
              <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-rose-300">{isBn ? 'কেটে দিন' : 'Decline'}</span>
          </button>

          {/* 2. Accept (সবুজ বাটন - রিসিভ করুন) */}
          <button
            type="button"
            onClick={handleAcceptIncomingCall}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-500 group-hover:bg-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-950 transition-all ring-4 ring-emerald-400/40 animate-bounce">
              <Phone className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-emerald-300">{isBn ? 'রিসিভ করুন' : 'Accept'}</span>
          </button>
        </div>
      </div>
    );

    return createPortal(modal, document.body);
  };

  // ==========================================
  // MODAL: SEND INTER-CIRCLE BATTLE CHALLENGE
  // ==========================================
  const renderChallengeModal = () => {
    if (!showChallengeModal || !targetCircleToChallenge) return null;

    const targetTheme = getCategoryTheme(targetCircleToChallenge.category || 'Islamic');
    const myEligibleCircles = circles.length > 0 ? circles : myCirclesForChallenge;

    const modalContent = (
      <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#041a12] via-[#02100b] to-[#010805] border border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-black shadow-lg">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>{isBn ? 'আন্তঃসার্কেল পয়েন্ট চ্যালেঞ্জ' : 'Inter-Circle Points Battle'}</span>
                </h3>
                <p className="text-[11px] text-amber-300/80">
                  {isBn ? 'প্রতিপক্ষ সার্কেলের সাথে আমল ও ইবাদতের প্রতিযোগিতা' : 'Compete in Salah, Quran & Dhikr'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowChallengeModal(false);
                setTargetCircleToChallenge(null);
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Opponent Circle Card Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${targetTheme.avatarBg}`}>
                {targetTheme.emoji}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                    {isBn ? 'প্রতিপক্ষ সার্কেল' : 'Opponent'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">
                  {targetCircleToChallenge.name}
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  {isBn ? 'আমীর:' : 'Amir:'} <span className="text-emerald-400 font-semibold">{targetCircleToChallenge.admin_name || (isBn ? 'আমীর' : 'Amir')}</span> • {fmtNum(targetCircleToChallenge.member_count || 1)} {isBn ? 'জন সাথী' : 'Members'}
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
              VS
            </div>
          </div>

          {/* Challenger Circle Picker (If user is in multiple circles) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBn ? 'আপনার যে সার্কেল থেকে চ্যালেঞ্জ দিচ্ছেন:' : 'Your Challenging Circle:'}</span>
            </label>
            {myEligibleCircles.length > 1 ? (
              <select
                value={selectedChallengerCircleId}
                onChange={(e) => setSelectedChallengerCircleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
              >
                {myEligibleCircles.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.name} ({mc.role === 'ADMIN' ? (isBn ? 'আমীর' : 'Amir') : (isBn ? 'সাথী' : 'Member')})
                  </option>
                ))}
              </select>
            ) : myEligibleCircles.length === 1 ? (
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-750 text-xs text-emerald-300 font-bold flex items-center gap-2">
                <span>🏕️ {myEligibleCircles[0].name}</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {isBn ? 'চ্যালেঞ্জ পাঠাতে আপনার একটি সার্কেল থাকা প্রয়োজন।' : 'You need a circle to initiate a challenge.'}
              </div>
            )}
          </div>

          {/* Challenge Scope / Criteria Highlight */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-[#03150e] border border-emerald-500/30">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{isBn ? 'প্রতিযোগিতার বিষয় ও পয়েন্ট বণ্টন' : 'Battle Scope & Points Distribution'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-0.5">
                <p className="font-bold text-emerald-400 flex items-center gap-1">
                  <Sunrise className="w-3.5 h-3.5" />
                  <span>{isBn ? 'জামাতে নামায' : 'Congregation'}</span>
                </p>
                <p className="text-[10px] text-slate-300 leading-tight">
                  {isBn ? 'ফজর ৫০, এশা ৪০, অন্যান্য ৩০ পয়েন্ট' : 'Fajr 50, Isha 40, others 30 pts'}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-0.5">
                <p className="font-bold text-amber-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBn ? 'কুরআন তিলাওয়াত' : 'Quran Khatam'}</span>
                </p>
                <p className="text-[10px] text-slate-300 leading-tight">
                  {isBn ? 'প্রতি সম্পূর্ণ পারা ১০০ পয়েন্ট' : '100 pts per completed Juz'}
                </p>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-0.5">
                <p className="font-bold text-teal-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBn ? 'যিকির ও আমল' : 'Dhikr & Tokens'}</span>
                </p>
                <p className="text-[10px] text-slate-300 leading-tight">
                  {isBn ? 'অর্জিত যিকির ও আমল পয়েন্ট' : 'Earned Dhikr activity points'}
                </p>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? 'প্রতিযোগিতার সময়কাল:' : 'Battle Duration:'}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 1, label: isBn ? '⚡ ১ দিন (ফ্ল্যাশ)' : '⚡ 1 Day (Flash)' },
                { days: 3, label: isBn ? '🎯 ৩ দিন (আদর্শ)' : '🎯 3 Days (Standard)' },
                { days: 7, label: isBn ? '👑 ৭ দিন (গ্র্যান্ড)' : '👑 7 Days (Grand)' }
              ].map((item) => (
                <button
                  key={`dur-${item.days}`}
                  type="button"
                  onClick={() => setChallengeDurationDays(item.days)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                    challengeDurationDays === item.days
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/50 scale-105'
                      : 'bg-slate-900 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowChallengeModal(false);
                setTargetCircleToChallenge(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSendChallenge}
              disabled={isSendingChallenge || !selectedChallengerCircleId}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs transition-all shadow-xl shadow-amber-950/60 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4" />
              <span>
                {isSendingChallenge 
                  ? (isBn ? 'চ্যালেঞ্জ পাঠানো হচ্ছে...' : 'Sending Challenge...') 
                  : (isBn ? '⚔️ প্রতিযোগিতার চ্যালেঞ্জ পাঠান' : '⚔️ Send Battle Challenge')}
              </span>
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // ==========================================
  // MODAL: LIVE BATTLE STATS ARENA
  // ==========================================
  const renderBattleStatsModal = () => {
    if (!showBattleStatsModal) return null;

    const modalContent = (
      <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-xl rounded-3xl bg-gradient-to-br from-[#041a12] via-[#02100b] to-[#010805] border border-emerald-500/40 p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black shadow-lg">
                <Trophy className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>{isBn ? 'লাইভ ব্যাটল অ্যারিনা' : 'Live Battle Arena'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold animate-pulse">
                    LIVE
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-300/80">
                  {isBn ? 'সার্কেলদ্বয়ের রিয়েলটাইম পয়েন্ট ও আমল তুলনা' : 'Real-time Points & Progress Comparison'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBattleStatsModal(false);
                setSelectedBattleStats(null);
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {statsLoading || !selectedBattleStats ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs">{isBn ? 'লাইভ পরিসংখ্যান লোড হচ্ছে...' : 'Loading live arena stats...'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* VS Matchup & Score Card */}
              {(() => {
                const b = selectedBattleStats.battle;
                const cStats = selectedBattleStats.challengerStats || {};
                const oStats = selectedBattleStats.challengedStats || {};
                const cTotal = cStats.totalPoints || 0;
                const oTotal = oStats.totalPoints || 0;
                const maxPoints = Math.max(cTotal + oTotal, 1);
                const cPercent = Math.round((cTotal / maxPoints) * 100);
                const oPercent = 100 - cPercent;

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-3 shadow-lg">
                    <div className="grid grid-cols-2 gap-3 items-center">
                      {/* Challenger Side */}
                      <div className="text-left space-y-1 min-w-0">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase truncate inline-block">
                          {b.challenger_name}
                        </span>
                        <h4 className="text-2xl font-black text-emerald-400 tabular-nums">
                          {fmtNum(cTotal)} <span className="text-xs font-normal text-slate-400">{isBn ? 'পয়েন্ট' : 'pts'}</span>
                        </h4>
                      </div>

                      {/* Opponent Side */}
                      <div className="text-right space-y-1 min-w-0">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase truncate inline-block">
                          {b.challenged_name}
                        </span>
                        <h4 className="text-2xl font-black text-amber-400 tabular-nums">
                          {fmtNum(oTotal)} <span className="text-xs font-normal text-slate-400">{isBn ? 'পয়েন্ট' : 'pts'}</span>
                        </h4>
                      </div>
                    </div>

                    {/* Progress Tug-of-War Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-700" 
                        style={{ width: `${cPercent}%` }} 
                        title={`${b.challenger_name}: ${cPercent}%`}
                      />
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700" 
                        style={{ width: `${oPercent}%` }} 
                        title={`${b.challenged_name}: ${oPercent}%`}
                      />
                    </div>

                    {/* Leading indicator */}
                    <div className="text-center text-[11px] font-bold text-slate-300">
                      {cTotal > oTotal ? (
                        <span className="text-emerald-400">🔥 {b.challenger_name} {isBn ? 'এগিয়ে আছে' : 'is in the lead'} (+{fmtNum(cTotal - oTotal)} {isBn ? 'পয়েন্ট' : 'pts'})</span>
                      ) : oTotal > cTotal ? (
                        <span className="text-amber-400">🔥 {b.challenged_name} {isBn ? 'এগিয়ে আছে' : 'is in the lead'} (+{fmtNum(oTotal - cTotal)} {isBn ? 'পয়েন্ট' : 'pts'})</span>
                      ) : (
                        <span className="text-slate-400">⚖️ {isBn ? 'উভয় সার্কেলের পয়েন্ট সমান!' : 'Tied match!'}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Point Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isBn ? 'আমলভিত্তিক বিস্তারিত স্কোর' : 'Detailed Amals Breakdown'}</span>
                </h4>

                <div className="space-y-1.5">
                  {/* Salah row */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sunrise className="w-4 h-4" />
                      <span>{isBn ? 'জামাতে সালাত পয়েন্ট' : 'Salah Points'}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono font-bold tabular-nums">
                      <span className="text-emerald-300">{fmtNum(selectedBattleStats.challengerStats?.salahPoints || 0)} pts</span>
                      <span className="text-slate-600">vs</span>
                      <span className="text-amber-300">{fmtNum(selectedBattleStats.challengedStats?.salahPoints || 0)} pts</span>
                    </div>
                  </div>

                  {/* Quran row */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>{isBn ? 'কুরআন খতম ও তিলাওয়াত' : 'Quran Points'}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono font-bold tabular-nums">
                      <span className="text-emerald-300">{fmtNum(selectedBattleStats.challengerStats?.quranPoints || 0)} pts</span>
                      <span className="text-slate-600">vs</span>
                      <span className="text-amber-300">{fmtNum(selectedBattleStats.challengedStats?.quranPoints || 0)} pts</span>
                    </div>
                  </div>

                  {/* Dhikr row */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>{isBn ? 'যিকির ও আমল' : 'Dhikr & Tokens'}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono font-bold tabular-nums">
                      <span className="text-emerald-300">{fmtNum(selectedBattleStats.challengerStats?.dhikrPoints || 0)} pts</span>
                      <span className="text-slate-600">vs</span>
                      <span className="text-amber-300">{fmtNum(selectedBattleStats.challengedStats?.dhikrPoints || 0)} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Contributors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Challenger Top Companions */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                  <h5 className="text-[11px] font-bold text-emerald-300 truncate">
                    ⭐ {selectedBattleStats.battle?.challenger_name} {isBn ? 'শীর্ষ সাথীবৃন্দ' : 'Top Performers'}
                  </h5>
                  <div className="space-y-1.5">
                    {selectedBattleStats.topChallengers?.length > 0 ? (
                      selectedBattleStats.topChallengers.map((m: any, idx: number) => (
                        <div key={m.id || idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-emerald-400">#{fmtNum(idx + 1)}</span>
                            <span className="text-slate-200 truncate">{m.full_name || 'সাথী'}</span>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">{fmtNum(m.salah_count || 0)} {isBn ? 'ওয়াক্ত' : 'prayers'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500">{isBn ? 'এখনো কোনো ডাটা নেই' : 'No data yet'}</p>
                    )}
                  </div>
                </div>

                {/* Challenged Top Companions */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-2">
                  <h5 className="text-[11px] font-bold text-amber-300 truncate">
                    ⭐ {selectedBattleStats.battle?.challenged_name} {isBn ? 'শীর্ষ সাথীবৃন্দ' : 'Top Performers'}
                  </h5>
                  <div className="space-y-1.5">
                    {selectedBattleStats.topChallenged?.length > 0 ? (
                      selectedBattleStats.topChallenged.map((m: any, idx: number) => (
                        <div key={m.id || idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-900/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-amber-400">#{fmtNum(idx + 1)}</span>
                            <span className="text-slate-200 truncate">{m.full_name || 'সাথী'}</span>
                          </div>
                          <span className="text-[11px] font-mono text-amber-400 font-bold">{fmtNum(m.salah_count || 0)} {isBn ? 'ওয়াক্ত' : 'prayers'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500">{isBn ? 'এখনো কোনো ডাটা নেই' : 'No data yet'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowBattleStatsModal(false);
                setSelectedBattleStats(null);
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // ==========================================
  // MODAL: USER MESSAGE REPORT (Phase 3)
  // ==========================================
  const renderReportModal = () => {
    if (!reportingMessage) return null;

    const reportCategories = [
      { id: 'HARASSMENT', label: isBn ? 'হয়রানি বা ব্যক্তিগত আক্রমণ' : 'Harassment or Bullying', icon: '⚠️' },
      { id: 'HATE_ABUSE', label: isBn ? 'বিদ্বেষমূলক বক্তব্য বা গালাগালি' : 'Hate Speech or Abuse', icon: '🚫' },
      { id: 'EXPLICIT_SEXUAL', label: isBn ? 'অশ্লীল বা অনৈতিক বিষয়বস্তু' : 'Explicit or Sexual Content', icon: '🔞' },
      { id: 'SPAM', label: isBn ? 'স্প্যাম বা অনিচ্ছাকৃত বিজ্ঞাপন' : 'Spam or Promotions', icon: '📢' },
      { id: 'MALICIOUS_LINK', label: isBn ? 'ক্ষতিকর বা সন্দেহজনক লিংক' : 'Suspicious or Phishing Links', icon: '🔗' },
      { id: 'INAPPROPRIATE_SOLICITATION', label: isBn ? 'অননুমোদিত আর্থিক বা ব্যক্তিগত অফার' : 'Inappropriate Solicitation', icon: '💸' },
      { id: 'OTHER', label: isBn ? 'অন্যান্য নীতিমালা লঙ্ঘন' : 'Other Policy Violations', icon: '📝' }
    ];

    const modalContent = (
      <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
        <div className="relative w-full max-w-md rounded-3xl bg-[#0f172a] border border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Flag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isBn ? 'বার্তা রিপোর্ট করুন' : 'Report Message'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isBn ? 'কেভ সার্কেলের পবিত্রতা রক্ষায় সহায়তা করুন' : 'Help keep Cave Circle safe and respectful'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseReportModal}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reported Message Preview */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-amber-400">{reportingMessage.sender_name || (isBn ? 'সাথী' : 'Companion')}</span>
              <span className="text-[10px] text-slate-500">
                {reportingMessage.created_at ? new Date(reportingMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <p className="text-xs text-slate-200 line-clamp-3 italic">
              "{reportingMessage.content}"
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">
              {isBn ? 'রিপোর্টের কারণ নির্বাচন করুন *' : 'Select Reason for Reporting *'}
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {reportCategories.map((cat) => (
                <label
                  key={cat.id}
                  onClick={() => setReportCategory(cat.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reportCategory === cat.id
                      ? 'bg-rose-500/15 border-rose-500/50 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                  <input
                    type="radio"
                    name="reportCategory"
                    checked={reportCategory === cat.id}
                    onChange={() => setReportCategory(cat.id)}
                    className="accent-rose-500 w-3.5 h-3.5"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Optional Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isBn ? 'অতিরিক্ত বিবরণ (ঐচ্ছিক)' : 'Additional details (optional)'}
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder={isBn ? 'রিপোর্টের বিষয়ে প্রয়োজনীয় অতিরিক্ত তথ্য লিখুন...' : 'Provide any additional details...'}
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCloseReportModal}
              disabled={isSubmittingReport}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmittingReport}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{isSubmittingReport ? (isBn ? 'পাঠানো হচ্ছে...' : 'Submitting...') : (isBn ? 'রিপোর্ট পাঠান' : 'Submit Report')}</span>
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // ==========================================
  // VIEW: FULLSCREEN WHATSAPP / SLACK CHAT VIEW
  // ==========================================
  if (isChatFullscreen && activeCircleId && circleDetails) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0b0f19] flex flex-col animate-fadeIn">
        {/* WhatsApp-Style Top Header Bar */}
        <header className="px-3 sm:px-4 py-2.5 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsChatFullscreen(false)}
              className="p-2 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="সার্কেল ড্যাশবোর্ডে ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* WhatsApp Avatar */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black flex items-center justify-center text-sm shadow-md ring-2 ring-emerald-500/40">
                🏕️
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0f172a]" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate leading-tight flex items-center gap-1.5">
                <span>{circleDetails.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-500/20 text-emerald-400 font-normal">
                  حَلْقَةُ
                </span>
              </h2>
              <p className="text-[11px] text-emerald-400/90 truncate flex items-center gap-1">
                <span>{fmtNum(members.length)} {isBn ? 'জন সাথী' : 'Companions'}</span>
                <span>•</span>
                <span className="text-emerald-300 font-medium">{isBn ? 'অনলাইন' : 'Online'}</span>
              </p>
            </div>
          </div>

          {/* Top Actions: Direct Invite Modal, Refresh & Minimize */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCallMembersModalOpen(true)}
              className="p-2 rounded-full text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title={isBn ? "অডিও কল ও সদস্য তালিকা" : "Audio Call & Members"}
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="p-2 rounded-full text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title={isBn ? "ফোন নম্বর দিয়ে আমন্ত্রণ জানান" : "Invite via phone number"}
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fetchMessages(activeCircleId)}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isBn ? "মেসেজ রিফ্রেশ করুন" : "Refresh messages"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsChatFullscreen(false)}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isBn ? "মিনিমাইজ করুন" : "Minimize"}
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* WhatsApp Message Feed with Minimalist Slack/WA Bubbles */}
        <div 
          ref={fullscreenChatScrollRef}
          className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 custom-scrollbar bg-[#070b14] relative"
        >
          {/* Subtle Ambient Background Watermark / Motif */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b98108_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

          {/* Date / Halqa Welcome Separator */}
          <div className="flex justify-center my-2 relative z-10">
            <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] font-semibold text-slate-400 shadow-sm">
              ✨ Assalamu Alaikum • {isBn ? 'হালাকা নিরাপদ চ্যাট' : 'Halaqah Secure Chat'}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{isBn ? 'এখনো কোনো বার্তা পাঠানো হয়নি' : 'No messages sent yet'}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {isBn ? 'সাথীদের সাথে সালাম বিনিময় করুন অথবা সালাত ও কুরআন তিলাওয়াতের তাগিদ দিন।' : 'Greet companions or send prayer and Quran recitation reminders.'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              const isNudge = msg.message_type === 'NUDGE';
              const isMilestone = msg.message_type === 'QURAN_MILESTONE';
              const isAudio = msg.message_type === 'AUDIO';
              const senderMember = members.find(m => m.user_id === msg.user_id);
              const isSenderAmir = senderMember?.role === 'ADMIN';

              if (isNudge || isMilestone) {
                return (
                  <div key={msg.id} className="flex justify-center my-3 relative z-10">
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 shadow-md ${
                      isMilestone 
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                        : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.content}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col relative z-10 ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md relative group transition-all ${
                    isMe 
                      ? 'bg-[#005c4b] text-emerald-50 rounded-tr-xs border border-emerald-600/30' 
                      : 'bg-[#1e293b] text-slate-100 rounded-tl-xs border border-slate-700/60'
                  }`}>
                    {/* Sender Header for Received Messages with Report Action */}
                    {!isMe && (
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-amber-400">
                            {msg.sender_name || (isBn ? 'সাথী' : 'Companion')}
                          </span>
                          {isSenderAmir && (
                            <span className="text-[9px] px-1 py-0.2 rounded-sm bg-amber-500/20 text-amber-300 font-bold">
                              {isBn ? 'আমীর 👑' : 'Amir 👑'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(msg)}
                          className="opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                          title={isBn ? 'বার্তাটি রিপোর্ট করুন' : 'Report this message'}
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Audio or Text Message Body */}
                    {isAudio ? (
                      <div className="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAudioPlay(msg)}
                          className="p-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 transition-transform active:scale-95 cursor-pointer shadow-md"
                        >
                          {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="space-y-1.5 flex-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold flex items-center gap-1">
                              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                              {isBn ? 'ভয়েস বার্তা' : 'Voice Message'}
                            </span>
                            <span className="text-[10px] text-slate-300 tabular-nums">0:0{msg.audio_duration_sec || 3}</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div className={`h-full bg-amber-300 rounded-full transition-all ${playingAudioId === msg.id ? 'w-full animate-pulse' : 'w-1/3'}`} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}

                    {/* Timestamp and WhatsApp Status Ticks */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-300/80 font-mono tabular-nums select-none">
                      <span>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'এখন'}
                      </span>
                      {isMe && renderMessageStatusTicks(msg)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp-Style Sticky Bottom Input Bar */}
        <footer className="p-2 sm:p-3 bg-[#0f172a] border-t border-slate-800 shrink-0 space-y-2">
          {/* Quick Islamic Phrase Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {quickPhrases.map((phrase, idx) => (
              <button
                key={`fs-phrase-${idx}`}
                type="button"
                onClick={() => handleSendMessage(phrase)}
                className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-emerald-500/20 border border-slate-700/80 hover:border-emerald-500/50 text-[11px] text-slate-200 hover:text-emerald-300 font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Input & Record Controls */}
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between px-4 py-2.5 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold">{isBn ? 'ভয়েস রেকর্ড হচ্ছে...' : 'Recording voice...'} ({recordingSeconds}s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelVoiceRecording}
                    className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAndSendVoice}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold cursor-pointer shadow-md"
                  >
                    {isBn ? 'পাঠান' : 'Send'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 flex items-center bg-[#1e293b] border border-slate-700/80 focus-within:border-emerald-500 rounded-full px-3 py-1.5 shadow-inner">
                  <input 
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder={isBn ? "মেসেজ লিখুন..." : "Type a message..."}
                    className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden px-2"
                  />
                  <button
                    type="button"
                    onClick={handleStartVoiceRecording}
                    className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title={isBn ? "ভয়েস মেসেজ রেকর্ড করুন" : "Record voice message"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                {/* WhatsApp Circular Green Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!newMessageText.trim() || isSendingMessage}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer shrink-0"
                  title="পাঠান"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </footer>
        {renderInviteModal()}
        {renderCallMembersModal()}
        {renderReportModal()}
        {renderAudioCallModal()}
        {renderIncomingCallModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW: SINGLE CIRCLE DETAIL VIEW
  // ==========================================
  if (activeCircleId && circleDetails) {
    const isAmir = members.find(m => m.user_id === user?.id)?.role === 'ADMIN';

    return (
      <div className="space-y-4 max-w-4xl mx-auto pb-16 animate-fadeIn">
        {/* Top Header Card with Islamic Aesthetic */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06241a] via-[#041912] to-[#020b08] border border-emerald-500/30 p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
          {/* Ambient Gold & Emerald Glow Spots */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Symmetrical Icon Back Button */}
              <button 
                type="button"
                onClick={() => setActiveCircleId(null)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                title={isBn ? "সকল সার্কেলে ফিরে যান" : "Back to all circles"}
              >
                <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase shrink-0">
                    حَلْقَةُ الرِّفَاقِ
                  </span>
                  <span className="text-[11px] sm:text-xs text-amber-400/90 font-medium flex items-center gap-1 shrink-0">
                    <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400" />
                    <span>{fmtNum(7)} {isBn ? 'দিনের স্ট্রিক' : 'Days Streak'}</span>
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white mt-0.5 truncate leading-tight">
                  {circleDetails.name}
                </h1>
                {circleDetails.description && (
                  <p className="text-[11px] sm:text-xs text-slate-400/80 max-w-[150px] xs:max-w-xs sm:max-w-md truncate leading-tight mt-0.5">
                    {circleDetails.description}
                  </p>
                )}
              </div>
            </div>

            {/* Compact Action Controls on Absolute Right Corner */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">


              {/* Icon-only Chat Button */}
              <button
                type="button"
                onClick={() => setIsChatFullscreen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                title={isBn ? "চ্যাট" : "Chat"}
              >
                <MessageCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>

              {/* Compact Sleek Invite Pill */}
              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="px-2.5 sm:px-3.5 py-2 h-9 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
                title={isBn ? "সাথীদের আমন্ত্রণ জানান" : "Invite companions"}
              >
                <Share2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                <span className="hidden min-[400px]:inline">{isBn ? 'ইনভাইট' : 'Invite'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setSubTab('salah')}
              className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'salah'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Sunrise className="w-3.5 h-3.5" />
              <span>{isBn ? 'সালাত ট্র্যাকার' : 'Salah'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('quran')}
              className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'quran'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isBn ? 'কুরআন' : 'Quran'} ({fmtNum(completedJuzCount)}/{fmtNum(30)})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('battles')}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'battles'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 shadow-lg shadow-amber-950/50 font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900/50'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>{isBn ? '⚔️ প্রতিযোগিতা' : '⚔️ Battles'}</span>
              {circleBattles.some(b => b.status === 'ACTIVE' || b.status === 'PENDING') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubTab('members')}
              className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'members'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isBn ? 'সাথীবৃন্দ' : 'Companions'} ({fmtNum(members.length)})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SALAH CONGREGATION TRACKER */}
        {subTab === 'salah' && (
          <div className="space-y-4">
            {/* Collective Congregation Progress Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#031a12] via-[#02130e] to-[#010a07] border border-emerald-500/25 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/40 pb-3">
                <div>
                  <h3 className="text-emerald-300 font-black text-base flex items-center gap-2">
                    {isBn ? '🕌 আজকের জামাতে সালাত ট্র্যাকার' : '🕌 Today Jamah Prayer Tracker'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isBn ? 'সার্কেলের সদস্যদের সম্মিলিত সালাত অগ্রগতি ও জামাত হাজিরা' : 'Collective prayer progress and congregation attendance'}
                  </p>
                </div>
                <span className="text-xs text-amber-400/90 font-medium self-start sm:self-auto bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  {isBn ? `সদস্য: ${fmtNum(members.length)} জন` : `Members: ${fmtNum(members.length)}`}
                </span>
              </div>

              {/* 5 Prayers Visual Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: 'fajr', name: isBn ? 'ফজর' : 'Fajr', icon: Sunrise, time: isBn ? 'ভোর' : 'Dawn' },
                  { key: 'dhuhr', name: isBn ? 'যোহর' : 'Dhuhr', icon: Sun, time: isBn ? 'দুপুর' : 'Noon' },
                  { key: 'asr', name: isBn ? 'আসর' : 'Asr', icon: Sun, time: isBn ? 'বিকাল' : 'Afternoon' },
                  { key: 'maghrib', name: isBn ? 'মাগরিব' : 'Maghrib', icon: Sunset, time: isBn ? 'সন্ধ্যা' : 'Evening' },
                  { key: 'isha', name: isBn ? 'ইশা' : 'Isha', icon: Moon, time: isBn ? 'রাত' : 'Night' }
                ].map((p, idx) => {
                  const Icon = p.icon;
                  const count = aggregateProgress ? aggregateProgress[p.key] || 0 : 0;
                  const total = members.length || 1;
                  const percentage = Math.round((count / total) * 100);

                  return (
                    <div 
                      key={`circle-p-${p.key}-${idx}`} 
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{p.time}</span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-white block">{p.name}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xl font-black text-emerald-400">{fmtNum(count)}</span>
                          <span className="text-xs text-slate-500 font-bold">/ {fmtNum(total)}</span>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Spiritual Nudges Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                type="button"
                onClick={() => handleSendNudge('REMINDER')}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center gap-3.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-white/15 text-white">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm block">{isBn ? 'চলো মসজিদে 🕌' : 'To Masjid 🕌'}</span>
                  <span className="text-[11px] text-emerald-100/80">{isBn ? 'জামাতের স্মরণ করিয়ে দিন' : 'Remind for Jamah'}</span>
                </div>
              </button>
              
              <button 
                type="button"
                onClick={() => handleSendNudge('ENCOURAGEMENT')}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white flex items-center gap-3.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm block">{isBn ? 'উৎসাহ দিন 🌱' : 'Encourage 🌱'}</span>
                  <span className="text-[11px] text-slate-400">{isBn ? 'ঈমানী শক্তি বৃদ্ধি করুন' : 'Strengthen faith'}</span>
                </div>
              </button>
              
              <button 
                type="button"
                onClick={() => handleSendNudge('NOSIHA')}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white flex items-center gap-3.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm block">{isBn ? 'নসীহা দিন 📖' : 'Give Nasiha 📖'}</span>
                  <span className="text-[11px] text-slate-400">{isBn ? 'জিকির ও দোয়ার আহ্বান' : 'Dhikr & Dua reminder'}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: COLLECTIVE QURAN KHATAM (30 JUZ) */}
        {subTab === 'quran' && (
          <div className="space-y-4">
            {/* Khatam Overview Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#031a12] via-[#02130e] to-[#010a07] border border-emerald-500/25 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {isBn ? 'যৌথ খতম লক্ষ্যমাত্রা' : 'Collective Goal'}
                  </span>
                  <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                    📖 {isBn ? '৩০ পারা যৌথ কুরআন খতম' : '30 Juz Joint Quran Completion'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isBn ? 'আপনার পড়া পারাটিতে ক্লিক করে সম্পন্ন বা বুকিং হিসেবে চিহ্নিত করুন' : 'Click a Juz to mark it complete or reserved'}
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center sm:text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{isBn ? 'সর্বমোট অগ্রগতি' : 'Overall Progress'}</span>
                  <span className="text-xl font-black text-emerald-400">
                    {fmtNum(completedJuzCount)} <span className="text-xs text-slate-400">/ {isBn ? '৩০ পারা' : '30 Juz'}</span>
                  </span>
                  <span className="text-xs font-bold text-amber-400 block mt-0.5">
                    ({fmtNum(Math.round((completedJuzCount / 30) * 100))}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-emerald-500/20 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.round((completedJuzCount / 30) * 100)}%` }}
                />
              </div>
            </div>

            {/* 30 Juz Grid */}
            <div className="rounded-3xl bg-[#03130e]/90 border border-emerald-500/20 p-5 shadow-xl">
              <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                {isBn ? 'পারা নির্বাচন ও সম্পূর্ণতার তালিকা (১-৩০)' : 'Select Juz & Completion Progress (1-30)'}
              </h4>

              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                  const record = completedJuzMap.get(juzNum);
                  const isDone = Boolean(record);
                  const isDoneByMe = record && record.userId === user?.id;

                  return (
                    <button
                      key={`juz-btn-${juzNum}`}
                      type="button"
                      onClick={() => handleToggleJuz(juzNum)}
                      className={`p-2.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                        isDoneByMe
                          ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                          : isDone
                          ? 'bg-teal-900/40 border-teal-500/50 text-teal-200'
                          : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white'
                      }`}
                      title={isDone ? (isBn ? `পারা ${juzNum}: সম্পন্ন করেছেন ${record.userName || 'সাথী'}` : `Juz ${juzNum}: Completed by ${record.userName || 'Companion'}`) : (isBn ? `পারা ${juzNum} সম্পন্ন হিসেবে চিহ্নিত করতে ক্লিক করুন` : `Click to mark Juz ${juzNum} complete`)}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isBn ? 'পারা' : 'Juz'}</span>
                      <span className="text-sm font-black">{fmtNum(juzNum)}</span>
                      {isDone ? (
                        <div className="flex items-center gap-0.5 text-[9px] text-emerald-300 font-bold truncate max-w-full">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="truncate">{isDoneByMe ? (isBn ? 'আমি' : 'Me') : record.userName?.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500">{isBn ? 'বাকি' : 'Pending'}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPANIONS ROSTER & SETTINGS */}
        {subTab === 'members' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-[#03130e]/90 border border-emerald-500/20 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {isBn ? `সার্কেলের সাথীদের তালিকা (${fmtNum(members.length)} জন)` : `Circle Companions List (${fmtNum(members.length)})`}
                </h3>
                <button
                  type="button"
                  onClick={handleOpenInviteModal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'আমন্ত্রণ জানান' : 'Invite'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m) => {
                  const isMemberAmir = m.role === 'ADMIN';
                  const isCurrent = m.user_id === user?.id;
                  const memberPhoto = isCurrent 
                    ? (user?.photoUrl || m.photo_url || m.photoUrl) 
                    : (m.photo_url || m.photoUrl);

                  return (
                    <div 
                      key={m.user_id}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs overflow-hidden shrink-0 border border-emerald-500/30 shadow-md">
                          {memberPhoto ? (
                            <img 
                              src={memberPhoto} 
                              alt={m.full_name || 'Companion'} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{m.full_name?.charAt(0) || 'S'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white">{m.full_name || (isBn ? 'সাথী' : 'Companion')}</h4>
                            {isCurrent && (
                              <span className="text-[10px] text-emerald-400 font-bold">{isBn ? '(আমি)' : '(Me)'}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {isMemberAmir ? (isBn ? 'সার্কেল আমীর 👑' : 'Circle Amir 👑') : (isBn ? 'সাথী' : 'Companion')}
                          </p>
                        </div>
                      </div>

                      {isMemberAmir && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {isBn ? 'আমীর' : 'Amir'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger / Settings Zone */}
            <div className="rounded-3xl bg-slate-950/80 border border-rose-500/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {isConfirmingLeave ? (
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">{isBn ? 'আপনি কি নিশ্চিতভাবে সার্কেলটি ত্যাগ করতে চান?' : 'Are you sure you want to leave?'}</h4>
                    <p className="text-[10px] text-slate-400">{isBn ? 'পরবর্তীতে পুনরায় যোগ দিতে হলে ইনভাইট কোডের প্রয়োজন হবে।' : 'You will need an invite code to rejoin later.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingLeave(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors hover:bg-slate-800"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLeave}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-rose-950/50"
                    >
                      {isBn ? 'হ্যাঁ, ত্যাগ করুন' : 'Yes, Leave'}
                    </button>
                  </div>
                </div>
              ) : isConfirmingDelete ? (
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">{isBn ? 'আপনি কি নিশ্চিতভাবে এই পুরো সার্কেলটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this circle?'}</h4>
                    <p className="text-[10px] text-slate-400">{isBn ? 'এটি আর ফিরিয়ে আনা যাবে না এবং সকল তথ্য চিরতরে মুছে যাবে।' : 'This action is irreversible and all data will be lost.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors hover:bg-slate-800"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-rose-950/50"
                    >
                      {isBn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-bold text-white">{isBn ? 'সার্কেল সেটিংস ও নিয়ন্ত্রণ' : 'Circle Settings & Controls'}</h4>
                    <p className="text-[11px] text-slate-400">{isBn ? 'প্রয়োজনে সার্কেল ত্যাগ করুন বা মুছুন' : 'Leave or delete circle if needed'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLeave}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সার্কেল ত্যাগ করুন' : 'Leave Circle'}</span>
                    </button>
                    {isAmir && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'সার্কেল মুছুন' : 'Delete Circle'}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INTER-CIRCLE BATTLES & COMPETITION ARENA */}
        {subTab === 'battles' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Battles Header Banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1a1103] via-[#100b02] to-[#080501] border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚔️</span>
                  <h3 className="text-base font-black text-amber-300">
                    {isBn ? 'আন্তঃসার্কেল পয়েন্ট ব্যাটেল ও প্রতিযোগিতা' : 'Inter-Circle Points Battle Arena'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 max-w-md">
                  {isBn 
                    ? 'অন্যান্য সার্কেলের সাথীদের সাথে নামায, কুরআন তিলাওয়াত ও যিকিরে নেক আমলের প্রতিযোগিতায় অংশ নিন।' 
                    : 'Compete in Salah congregation, Quran completion and Dhikr with other circles.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCircleId(null);
                  setSearchQuery('');
                  onShowToast('info', isBn ? 'সার্কেল সার্চ করুন' : 'Search Circles', isBn ? 'সার্চ বক্সে যেকোনো সার্কেল খুঁজে সরাসরি চ্যালেঞ্জ জানান!' : 'Search any circle to throw a challenge directly!');
                }}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-950/60 active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0 relative z-10"
              >
                <Swords className="w-4 h-4" />
                <span>{isBn ? 'অন্য সার্কেলকে চ্যালেঞ্জ দিন' : 'Challenge Another Circle'}</span>
              </button>
            </div>

            {battlesLoading ? (
              <div className="p-10 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                <p className="text-xs text-slate-400">{isBn ? 'প্রতিযোগিতার তথ্য লোড হচ্ছে...' : 'Loading battles...'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. ACTIVE BATTLES */}
                {circleBattles.filter(b => b.status === 'ACTIVE').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>{isBn ? 'চলমান সক্রিয় প্রতিযোগিতা (Live Battles)' : 'Active Battles'}</span>
                    </h4>

                    {circleBattles.filter(b => b.status === 'ACTIVE').map((b) => {
                      const cTotal = Number(b.challenger_points) || 0;
                      const oTotal = Number(b.challenged_points) || 0;
                      const maxPts = Math.max(cTotal + oTotal, 1);
                      const cPercent = Math.round((cTotal / maxPts) * 100);
                      const oPercent = 100 - cPercent;

                      return (
                        <div
                          key={b.id}
                          className="p-5 rounded-3xl bg-slate-950/90 border border-amber-500/40 shadow-xl space-y-4 relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold animate-pulse">
                                🔥 LIVE BATTLE
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                {b.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{fmtNum(b.duration_days || 3)} {isBn ? 'দিনের লড়াই' : 'Days'}</span>
                            </span>
                          </div>

                          {/* VS Tug-Of-War Arena */}
                          <div className="grid grid-cols-2 gap-3 items-center">
                            {/* Circle 1 */}
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-emerald-400 truncate flex items-center gap-1">
                                <span>🏕️</span> {b.challenger_circle_name}
                              </p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white tabular-nums">{fmtNum(cTotal)}</span>
                                <span className="text-[10px] text-slate-400">{isBn ? 'পয়েন্ট' : 'pts'}</span>
                              </div>
                            </div>

                            {/* Circle 2 */}
                            <div className="space-y-1 text-right">
                              <p className="text-xs font-bold text-amber-400 truncate flex items-center justify-end gap-1">
                                {b.challenged_circle_name} <span>🏕️</span>
                              </p>
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-black text-white tabular-nums">{fmtNum(oTotal)}</span>
                                <span className="text-[10px] text-slate-400">{isBn ? 'পয়েন্ট' : 'pts'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bar */}
                          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-700" 
                              style={{ width: `${cPercent}%` }} 
                            />
                            <div 
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700" 
                              style={{ width: `${oPercent}%` }} 
                            />
                          </div>

                          {/* Pillar breakdown */}
                          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-slate-300">
                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                              <span className="text-emerald-400 block font-bold">🕌 {isBn ? 'নামায পয়েন্ট' : 'Salah'}</span>
                              <span className="font-mono font-bold text-white">{fmtNum(b.challenger_salah_points || 0)} vs {fmtNum(b.challenged_salah_points || 0)}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                              <span className="text-amber-400 block font-bold">📖 {isBn ? 'কুরআন পয়েন্ট' : 'Quran'}</span>
                              <span className="font-mono font-bold text-white">{fmtNum(b.challenger_quran_points || 0)} vs {fmtNum(b.challenged_quran_points || 0)}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                              <span className="text-teal-400 block font-bold">📿 {isBn ? 'যিকির পয়েন্ট' : 'Dhikr'}</span>
                              <span className="font-mono font-bold text-white">{fmtNum(b.challenger_dhikr_points || 0)} vs {fmtNum(b.challenged_dhikr_points || 0)}</span>
                            </div>
                          </div>

                          {/* Action to View Live Arena Stats */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => openBattleStatsModal(b.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>{isBn ? '📊 লাইভ স্কোর ও সাথীদের র‍্যাংক' : 'Live Score & Companion Ranks'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. PENDING INCOMING CHALLENGES */}
                {circleBattles.filter(b => b.status === 'PENDING' && b.challenged_circle_id === activeCircleId).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{isBn ? 'আগত চ্যালেঞ্জসমূহ (Incoming Challenges)' : 'Incoming Challenges'}</span>
                    </h4>

                    {circleBattles.filter(b => b.status === 'PENDING' && b.challenged_circle_id === activeCircleId).map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-3xl bg-slate-950/90 border border-amber-500/40 space-y-3 shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black flex items-center justify-center text-lg shrink-0">
                              ⚔️
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">
                                <span className="text-amber-400 font-extrabold">{b.challenger_circle_name}</span> {isBn ? 'আপনাদের চ্যালেঞ্জ পাঠিয়েছে!' : 'has challenged your circle!'}
                              </h4>
                              <p className="text-[11px] text-slate-300 mt-0.5">
                                {isBn ? 'সময়কাল:' : 'Duration:'} {fmtNum(b.duration_days || 3)} {isBn ? 'দিন' : 'Days'} • {isBn ? 'আমীর:' : 'Amir:'} <span className="text-emerald-400 font-semibold">{b.challenger_admin_name}</span>
                              </p>
                              {b.rules_note && (
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                  "{b.rules_note}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-850">
                          <button
                            type="button"
                            onClick={() => handleRespondBattle(b.id, 'DECLINE')}
                            disabled={respondingBattleId === b.id}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isBn ? 'প্রত্যাখ্যান' : 'Decline'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondBattle(b.id, 'ACCEPT')}
                            disabled={respondingBattleId === b.id}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{respondingBattleId === b.id ? (isBn ? 'শুরু হচ্ছে...' : 'Starting...') : (isBn ? 'চ্যালেঞ্জ গ্রহণ করুন' : 'Accept Challenge')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. PENDING OUTGOING CHALLENGES */}
                {circleBattles.filter(b => b.status === 'PENDING' && b.challenger_circle_id === activeCircleId).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{isBn ? 'প্রেরিত চ্যালেঞ্জসমূহ (অপেক্ষমাণ)' : 'Outgoing Challenges (Pending)'}</span>
                    </h4>

                    {circleBattles.filter(b => b.status === 'PENDING' && b.challenger_circle_id === activeCircleId).map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base">🏕️</span>
                          <div className="min-w-0">
                            <span className="text-white font-bold block truncate">{b.challenged_circle_name}</span>
                            <span className="text-[10px] text-slate-400">{fmtNum(b.duration_days || 3)} {isBn ? 'দিনের পয়েন্ট চ্যালেঞ্জ' : 'Days Challenge'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold shrink-0">
                          ⏳ {isBn ? 'উত্তরের অপেক্ষায়...' : 'Pending Response...'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. COMPLETED BATTLES HISTORY */}
                {circleBattles.filter(b => b.status === 'COMPLETED').length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>{isBn ? 'সম্পন্ন প্রতিযোগিতার রেকর্ড (Battle History)' : 'Battle History'}</span>
                    </h4>

                    {circleBattles.filter(b => b.status === 'COMPLETED').map((b) => {
                      const isWinner = b.winner_circle_id === activeCircleId;
                      const isDraw = b.winner_circle_id === 'DRAW';

                      return (
                        <div
                          key={b.id}
                          className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs shadow-md"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isWinner ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 flex items-center gap-1">
                                  👑 {isBn ? 'বিজয় অর্জন' : 'Victory'}
                                </span>
                              ) : isDraw ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                                  🤝 {isBn ? 'ড্র' : 'Draw'}
                                </span>
                              ) : (
                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 font-bold">
                                  🏁 {isBn ? 'সম্পন্ন' : 'Finished'}
                                </span>
                              )}
                              <span className="font-bold text-white truncate">
                                {b.challenger_circle_name} vs {b.challenged_circle_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {fmtNum(b.challenger_points || 0)} pts - {fmtNum(b.challenged_points || 0)} pts
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openBattleStatsModal(b.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                          >
                            {isBn ? 'ফলাফল' : 'Stats'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* EMPTY STATE */}
                {circleBattles.length === 0 && (
                  <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-850 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                      <Swords className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {isBn ? 'এখনো কোনো সার্কেল প্রতিযোগিতা নেই' : 'No battles yet'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {isBn 
                        ? 'প্ল্যাটফর্মের যেকোনো সার্কেলকে সার্চ করে নামায, কুরআন ও যিকিরের পয়েন্ট লড়াইয়ে চ্যালেঞ্জ জানান!' 
                        : 'Search any circle on the platform to challenge them in Salah, Quran and Dhikr points!'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* INVITE & AUDIO CALL & BATTLE & REPORT MODALS */}
        {renderInviteModal()}
        {renderAudioCallModal()}
        {renderIncomingCallModal()}
        {renderChallengeModal()}
        {renderBattleStatsModal()}
        {renderReportModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW: DEDICATED CAVE CIRCLES NOTIFICATIONS PAGE
  // ==========================================
  if (isViewingCircleNotifications) {
    const totalCircleCount = pendingInvitations.length + circleNotifications.length;
    const unreadCircleCount = pendingInvitations.length + circleNotifications.filter(n => !n.read).length;
    const filteredCircleNotifs = circleNotifFilter === 'unread' 
      ? circleNotifications.filter(n => !n.read)
      : circleNotifications;

    return (
      <div className="space-y-4 w-full max-w-4xl mx-auto pb-20 animate-fadeIn text-slate-100 min-h-screen px-1 sm:px-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsViewingCircleNotifications(false)}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95 shrink-0"
              title={isBn ? "সার্কেলে ফিরে যান" : "Back to Circles"}
            >
              <ArrowLeft className="w-5 h-5 text-emerald-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 truncate">
                <Bell className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{isBn ? 'সার্কেল নোটিফিকেশন' : 'Circle Notifications'}</span>
              </h1>
              <p className="text-[10px] text-slate-400 truncate">
                {isBn ? 'শুধুমাত্র কেভ সার্কেল সংক্রান্ত সকল নোটিফিকেশন ও আমন্ত্রণ' : 'Cave Circles notifications & invitations only'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {circleNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllCircleNotifications}
                disabled={isClearingAllNotifs}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-xs active:scale-95"
                title={isBn ? 'সব নোটিফিকেশন মুছুন' : 'Clear All'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isBn ? 'সব মুছুন' : 'Clear All'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                fetchPendingInvitations();
                fetchCircleNotifications();
              }}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-amber-400 transition-all flex items-center justify-center cursor-pointer"
              title={isBn ? "রিফ্রেশ" : "Refresh"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="w-full flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setCircleNotifFilter('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              circleNotifFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'সব' : 'All'} ({fmtNum(totalCircleCount)})
          </button>
          <button
            type="button"
            onClick={() => setCircleNotifFilter('unread')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              circleNotifFilter === 'unread'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'অপঠিত' : 'Unread'}
            {unreadCircleCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {fmtNum(unreadCircleCount)}
              </span>
            )}
          </button>
        </div>

        {/* 1. Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{isBn ? 'সার্কেল আমন্ত্রণপত্র' : 'Circle Invitations'} ({fmtNum(pendingInvitations.length)})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {pendingInvitations.map((inv) => (
                <div 
                  key={inv.id}
                  className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col gap-3 shadow-lg relative"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                      🏕️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                          <span>{inv.circle_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-normal">
                            {fmtNum(inv.member_count || 1)} {isBn ? 'সদস্য' : 'Members'}
                          </span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvitation(inv.id)}
                          disabled={respondingInviteId === inv.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={isBn ? 'আমন্ত্রণ মুছুন' : 'Delete Invitation'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">
                        {isBn ? (
                          <>
                            <span className="text-amber-400 font-semibold">{inv.inviter_name}</span> আপনাকে <strong>"{inv.circle_name}"</strong> সার্কেলে যোগদানের আমন্ত্রণ জানিয়েছেন।
                          </>
                        ) : (
                          <>
                            <span className="text-amber-400 font-semibold">{inv.inviter_name}</span> invited you to join <strong>"{inv.circle_name}"</strong> circle.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
                    <button
                      type="button"
                      onClick={() => handleRespondInvitation(inv.id, 'REJECT')}
                      disabled={respondingInviteId === inv.id}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isBn ? 'প্রত্যাখ্যান' : 'Reject'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespondInvitation(inv.id, 'ACCEPT')}
                      disabled={respondingInviteId === inv.id}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{respondingInviteId === inv.id ? (isBn ? 'যুক্ত হচ্ছে...' : 'Joining...') : (isBn ? 'যোগ দিন (Accept)' : 'Accept')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Other Circle Notifications */}
        {filteredCircleNotifs.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isBn ? 'সার্কেল নোটিফিকেশন তালিকা' : 'Circle Updates'} ({fmtNum(filteredCircleNotifs.length)})</span>
              </span>
              {circleNotifications.some(n => !n.read) && (
                <button
                  type="button"
                  onClick={handleMarkAllCircleNotificationsRead}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সব পঠিত' : 'Mark all read'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {filteredCircleNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleOpenCircleChatFromNotification(notif)}
                  className={`p-4 rounded-2xl border transition-all relative cursor-pointer hover:scale-[1.01] active:scale-[0.99] group ${
                    !notif.read
                      ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/50 shadow-md hover:border-emerald-400/80'
                      : 'bg-slate-950/80 border-slate-850 hover:border-slate-700 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {notif.title_bn || notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                        {notif.message_bn || notif.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-850/60">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(notif.created_at || notif.createdAt || Date.now()).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>{isBn ? 'চ্যাটে যান' : 'Go to Chat'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCircleNotification(notif.id);
                      }}
                      disabled={deletingNotificationId === notif.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Empty State */}
        {pendingInvitations.length === 0 && filteredCircleNotifs.length === 0 && (
          <div className="p-8 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 text-center py-12 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {circleNotifFilter === 'unread' 
                ? (isBn ? 'কোনো অপঠিত সার্কেল নোটিফিকেশন নেই' : 'No unread circle notifications')
                : (isBn ? 'সার্কেল সংক্রান্ত কোনো নোটিফিকেশন নেই' : 'No circle notifications')}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {isBn 
                ? 'নতুন সার্কেল আমন্ত্রণ বা আপডেট আসলে এখানে জমা হবে।' 
                : 'New circle invitations and alerts will appear here.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: CIRCLES MAIN LOBBY LIST
  // ==========================================
  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto pb-16 animate-fadeIn text-slate-100 min-h-screen px-1 sm:px-2">
      {/* Top Profile / Cave Circles Nav Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {/* Left: Back button + Logo + Title together */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95 shrink-0"
            title={isBn ? "প্রোফাইলে ফিরে যান" : "Back to Profile"}
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <AppLogo className="w-6 h-6 rounded-lg overflow-hidden border border-amber-500/40 shadow-xs shrink-0" />
            <h1 className="text-base font-extrabold text-white tracking-tight truncate">
              {isBn ? 'কেভ সার্কেল' : 'Cave Circles'}
            </h1>
          </div>
        </div>

        {/* Right: Join with Code (Link icon) + Create Circle (Plus icon) + Bell Notification button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Join with Code (Chain / Link Icon Button) */}
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95"
            title={isBn ? "কোড দিয়ে সার্কেলে যোগ দিন" : "Join Circle with Code"}
          >
            <LinkIcon className="w-4 h-4 stroke-[2.2px]" />
          </button>

          {/* Create Circle Button (Plus Icon) */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95"
            title={isBn ? "নতুন সার্কেল তৈরি করুন" : "Create New Circle"}
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5px]" />
          </button>

          {/* Notification Bell with Badge -> Opens Dedicated Circle Notifications Page */}
          <button
            type="button"
            onClick={() => setIsViewingCircleNotifications(true)}
            className="relative p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-amber-400 transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95"
            title={isBn ? "সার্কেল নোটিফিকেশন পেজ" : "Circle Notifications Page"}
          >
            <Bell className="w-4 h-4" />
            {(pendingInvitations.length + circleNotifications.length) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-sm">
                {fmtNum(pendingInvitations.length + circleNotifications.length)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER SEGMENTS */}
      <div className="space-y-3">
        {/* Lobby Filter Segments (Only User's Circles) */}
        <div className="flex bg-slate-950/80 border border-slate-800/80 rounded-2xl p-1">
          {[
            { id: 'all_my', label: isBn ? 'আমার সকল সার্কেল' : 'My Circles' },
            { id: 'mine', label: isBn ? 'আমার তৈরি' : 'Created by Me' },
            { id: 'joined', label: isBn ? 'যুক্ত আছি' : 'Joined' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setLobbyTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                lobbyTab === tab.id && !searchQuery
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Category Pill Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar scrollbar-hidden">
          {[
            { id: 'All', label: isBn ? 'সব ক্যাটাগরি' : 'All' },
            { id: 'Islamic', label: isBn ? 'ইসলামিক' : 'Islamic' },
            { id: 'Education', label: isBn ? 'শিক্ষা' : 'Education' },
            { id: 'Community', label: isBn ? 'কমিউনিটি' : 'Community' }
          ].map((cat) => (
            <button
              key={`cat-pill-${cat.id}`}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-[#062c1e] text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Global Search Bar to find ANY Circle across the Platform for Battle */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? "যেকোনো সার্কেল খুঁজুন ও চ্যালেঞ্জ জানান..." : "Search any circle to challenge..."}
            className="w-full bg-slate-950/80 border border-amber-500/30 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-9 text-xs text-white placeholder-slate-400 focus:outline-hidden shadow-inner"
          />
          <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white text-xs font-bold absolute right-3 top-2.5 p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Circle Cards Grid */}
      <div className="space-y-3">
        {/* If user is typing in Search Query -> Render Global Search Results */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>{isBn ? 'গ্লোবাল সার্কেল সার্চ ফলাফল' : 'Global Search Results'}</span>
              </span>
              {isSearchingGlobal && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  {isBn ? 'খোঁজা হচ্ছে...' : 'Searching...'}
                </span>
              )}
            </div>

            {globalSearchResults.length === 0 && !isSearchingGlobal ? (
              <div className="rounded-3xl bg-slate-950/40 border border-slate-850 p-8 text-center space-y-2">
                <p className="text-sm font-bold text-white">{isBn ? 'কোনো সার্কেল পাওয়া যায়নি' : 'No circle found'}</p>
                <p className="text-xs text-slate-400">{isBn ? 'অন্য কোনো নাম লিখে সার্চ করুন' : 'Try searching with another name'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {globalSearchResults.map((c) => {
                  const theme = getCategoryTheme(c.category || 'Islamic');
                  const isMyCircle = circles.some(mc => mc.id === c.id) || c.is_joined || c.admin_id === user?.id;

                  return (
                    <div
                      key={`global-${c.id}`}
                      className="p-4 rounded-3xl bg-slate-950/90 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Circle Avatar */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-inner ${theme.avatarBg}`}>
                          {theme.emoji}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                              {c.name}
                            </h3>
                            <span className={`text-[9px] font-bold px-2 py-0.2 rounded uppercase ${theme.badge}`}>
                              {theme.label}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 flex items-center gap-2">
                            <span>{isBn ? 'আমীর:' : 'Amir:'} <strong className="text-emerald-400 font-semibold">{c.admin_name || (isBn ? 'আমীর' : 'Amir')}</strong></span>
                            <span>•</span>
                            <span>{fmtNum(c.member_count || 1)} {isBn ? 'জন সাথী' : 'Members'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action Button: ONLY Direct Competition Challenge for Other Circles */}
                      <div className="shrink-0 flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                        {isMyCircle ? (
                          <button
                            type="button"
                            onClick={() => setActiveCircleId(c.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{isBn ? 'আমার সার্কেল খুলুন' : 'Open Circle'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChallengeModal(c)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-950/60 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Swords className="w-4 h-4" />
                            <span>{isBn ? '⚔️ প্রতিযোগিতার চ্যালেঞ্জ জানান' : '⚔️ Challenge Circle'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-950/30 rounded-3xl border border-slate-850">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <p className="text-xs">{isBn ? 'সার্কেলসমূহ লোড হচ্ছে...' : 'Loading circles...'}</p>
          </div>
        ) : filteredCircles.length === 0 ? (
          <div className="rounded-3xl bg-slate-950/40 border border-slate-850 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {lobbyTab === 'mine' 
                ? (isBn ? 'আপনার তৈরি কোনো সার্কেল নেই' : 'You have not created any circles')
                : lobbyTab === 'joined'
                ? (isBn ? 'আপনি কোনো সার্কেলে যুক্ত নেই' : 'You have not joined any circles')
                : (isBn ? 'আপনার কোনো সার্কেল পাওয়া যায়নি' : 'No circles found')}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {isBn 
                ? 'নতুন একটি সার্কেল তৈরি করুন অথবা উপরের সার্চ বক্সে যেকোনো সার্কেল খুঁজে চ্যালেঞ্জ জানান!' 
                : 'Create a new circle or search any circle above to challenge them!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredCircles.map((c) => {
              const theme = getCategoryTheme(c.category || 'Islamic');
              const isCircleAdmin = c.admin_id === user?.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveCircleId(c.id)}
                  className="p-4 rounded-3xl bg-slate-950/80 hover:bg-slate-900/80 border border-slate-850 hover:border-emerald-500/30 transition-all shadow-xl relative overflow-hidden flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Circle Mockup-Style Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 shadow-inner ${theme.avatarBg}`}>
                      {theme.emoji}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {c.name}
                        </h3>
                        {/* Amir/Role Indicator */}
                        {isCircleAdmin && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            👑 {isBn ? 'আমীর' : 'Amir'}
                          </span>
                        )}
                      </div>

                      {/* Mockup-Style Streaks */}
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        <span>🔥</span>
                        <span>{fmtNum(c.jamaat_streak || 7)} {isBn ? 'দিনের জামাত স্ট্রিক' : 'Days Jama\'at Streak'}</span>
                      </p>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{fmtNum(c.member_count || 1)} {isBn ? 'জন সাথী' : 'Members'}</span>
                        {c.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{c.description}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Right Chevron */}
                  <div className="shrink-0 flex items-center gap-1">
                    <span className={`absolute top-3.5 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${theme.badge}`}>
                      {theme.label}
                    </span>

                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all mt-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE CIRCLE MODAL: REDESIGNED HUBEHU MOCKUP IMAGE 2 */}
      {showCreate && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#041912] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-fadeIn text-white relative">
            {/* Mockup Back Arrow inside Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="p-1 rounded-full text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-emerald-400" />
                </button>
                <h3 className="text-base font-black text-white">
                  {isBn ? 'নতুন সার্কেল তৈরি' : 'Create New Circle'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Circular Green Group Icon with Plus (Mockup visual) */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 py-1">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 bg-emerald-950/60 flex items-center justify-center shadow-lg relative">
                <Users className="w-7 h-7 text-emerald-400" />
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center border border-[#041912]">
                  +
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">
                  {isBn ? 'অর্থপূর্ণ কিছু শুরু করুন' : 'Start Something Meaningful'}
                </h4>
                <p className="text-[11px] text-slate-300/80 max-w-xs mx-auto leading-relaxed">
                  {isBn 
                    ? 'বিশ্বস্ত বন্ধুদের নিয়ে হালাকা তৈরি করে ঈমান ও আমলে সংযুক্ত থাকুন এবং পরস্পরকে সাহায্য করুন।' 
                    : 'Build a circle with trusted friends to stay connected in faith, learn together and support each other.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1">
                  {isBn ? 'সার্কেলের নাম *' : 'Circle Name *'} <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  placeholder={isBn ? "যেমন: আসহাবে কাহাফ" : "e.g. Ashabe kahaf"}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-hidden shadow-inner"
                />
              </div>

              {/* Mockup Premium Category Field */}
              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1">
                  {isBn ? 'সার্কেল ক্যাটাগরি' : 'Circle Category'}
                </label>
                <select
                  value={newCircleCategory}
                  onChange={(e) => setNewCircleCategory(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-hidden"
                >
                  <option value="Islamic">{isBn ? '🕌 ইসলামিক (Islamic)' : '🕌 Islamic'}</option>
                  <option value="Education">{isBn ? '📚 শিক্ষা (Education)' : '📚 Education'}</option>
                  <option value="Community">{isBn ? '👥 কমিউনিটি (Community)' : '👥 Community'}</option>
                  <option value="Other">{isBn ? '🏕️ অন্যান্য (Other)' : '🏕️ Other'}</option>
                </select>
              </div>

              {/* Mockup Initial Streak Field */}
              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1">
                  {isBn ? 'প্রাথমিক জামাত সালাত স্ট্রিক (দিন)' : 'Initial Jama\'at Streak (Days)'}
                </label>
                <input 
                  type="number"
                  min={1}
                  max={30}
                  value={newCircleStreak}
                  onChange={(e) => setNewCircleStreak(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-300 block mb-1">
                  {isBn ? 'বিবরণ বা উদ্দেশ্য (ঐচ্ছিক)' : 'Description (Optional)'}
                </label>
                <textarea 
                  value={newCircleDesc}
                  onChange={(e) => setNewCircleDesc(e.target.value)}
                  rows={2}
                  placeholder={isBn ? "সার্কেলের লক্ষ্য ও অঙ্গীকার..." : "Tell others about your circle..."}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-hidden shadow-inner"
                />
              </div>
            </div>

            {/* Mockup Circular Create Circle Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting || !newCircleName.trim()}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black tracking-wide cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                {isSubmitting ? (isBn ? 'তৈরি হচ্ছে...' : 'Creating...') : (isBn ? 'সার্কেল তৈরি করুন' : 'Create Circle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN CIRCLE MODAL */}
      {showJoin && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#041912] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-400" />
                {isBn ? 'ইনভাইট কোড দিয়ে সার্কেলে যুক্ত হোন' : 'Join Circle with Invite Code'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowJoin(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                {isBn ? 'সার্কেল ইনভাইট কোড *' : 'Circle Invite Code *'}
              </label>
              <input 
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder={isBn ? "যেমন: A1B2C3D4" : "e.g. A1B2C3D4"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 uppercase tracking-widest font-mono text-center font-bold text-sm shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-800"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting || !inviteCodeInput.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {isSubmitting ? (isBn ? 'যুক্ত হচ্ছে...' : 'Joining...') : (isBn ? 'যুক্ত হোন' : 'Join')}
              </button>
            </div>
          </div>
        </div>
      )}
      {renderAudioCallModal()}
      {renderIncomingCallModal()}
      {renderChallengeModal()}
      {renderBattleStatsModal()}
      {renderReportModal()}
    </div>
  );
};

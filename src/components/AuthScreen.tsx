import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RegistrationView, RegistrationData } from './RegistrationView';
import { AppLogo } from './AppLogo';
import { api } from '../services/api';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  Bike,
  Globe,
  X,
  ChevronRight
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onOpenMerchantLogin?: () => void;
  onOpenRiderLogin?: () => void;
}

type AuthMode = 'login' | 'register' | 'register-otp' | 'forgot' | 'forgot-verify' | 'link-google' | 'google-profile-completion';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onCancel,
  onOpenMerchantLogin,
  onOpenRiderLogin
}) => {
  const { login, registerRequest, registerVerify, forgotPasswordRequest, forgotPasswordVerify, logout, loginWithTokenAndUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOthersSheet, setShowOthersSheet] = useState(false);

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Auth Specific States
  const [googleSub, setGoogleSub] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleCredential, setGoogleCredential] = useState('');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileFullName, setProfileFullName] = useState('');
  const [profileGender, setProfileGender] = useState('male');
  const [profileAge, setProfileAge] = useState('');
  const [profileDistrict, setProfileDistrict] = useState('');
  const [profileUpazila, setProfileUpazila] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  // Registration Payload State for resending verification code
  const [phone, setPhone] = useState('');
  const [registrationPayload, setRegistrationPayload] = useState<RegistrationData | null>(null);

  // OTP Fields
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(0);

  // Countdown timer helper
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetAlerts = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Google Identity Services (GSI) callback handler
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response.credential) return;

    setIsLoading(true);
    resetAlerts();

    try {
      const res = await api.googleLogin(response.credential);
      if (res.success && res.token && res.user) {
        loginWithTokenAndUser(res.token, res.user);
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Google sign-in failed');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[Google Login Error]', err);

      const errorData = err.data || err.response?.data;
      const errorCode = err.code || errorData?.error || errorData?.code;

      if (errorCode === 'LINKING_REQUIRED') {
        setGoogleSub(errorData?.googleSub || '');
        setGoogleEmail(errorData?.googleEmail || '');
        setGoogleCredential(response.credential);
        setMode('link-google');
        setIsLoading(false);
      } else if (errorCode === 'PROFILE_COMPLETION_REQUIRED') {
        setGoogleSub(errorData?.googleSub || '');
        setGoogleEmail(errorData?.googleEmail || '');
        setGoogleName(errorData?.googleName || '');
        setGoogleCredential(response.credential);
        setProfileFullName(errorData?.googleName || '');
        setMode('google-profile-completion');
        setIsLoading(false);
      } else {
        const fallbackMsg = language === 'bn'
          ? 'গুগল লগইন করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'An error occurred during Google login. Please try again.';
        setErrorMessage(err.message || fallbackMsg);
        setIsLoading(false);
      }
    }
  };

  // Handle initialization and button rendering for GSI
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const initGoogleSignIn = async () => {
      try {
        const config = await api.getGoogleConfig();
        if (!isMounted) return;

        intervalId = setInterval(() => {
          const g = (window as any).google;
          if (g?.accounts?.id) {
            clearInterval(intervalId);
            
            g.accounts.id.initialize({
              client_id: config.clientId,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true
            });

            const container = document.getElementById('google-signin-btn-container');
            if (container) {
              g.accounts.id.renderButton(container, {
                type: 'standard',
                theme: 'filled_blue',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: container.clientWidth || 320
              });
            }
          }
        }, 200);
      } catch (err) {
        console.error('[Google Auth GSI Init Error]', err);
      }
    };

    if (mode === 'login') {
      initGoogleSignIn();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      isMounted = false;
    };
  }, [mode]);

  const handleGoogleClick = () => {
    // Left as empty or fallback since the transparent GSI button lies on top and gets clicked natively
    resetAlerts();
  };

  const handleGoogleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!linkingPassword.trim()) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে আপনার পাসওয়ার্ড প্রদান করুন।'
          : 'Please enter your password.'
      );
      return;
    }

    setIsLoading(true);
    resetAlerts();

    try {
      const res = await api.googleLink({
        credential: googleCredential,
        googleSub,
        googleEmail,
        password: linkingPassword
      });

      if (res.success && res.token && res.user) {
        loginWithTokenAndUser(res.token, res.user);
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(
          language === 'bn'
            ? 'পাসওয়ার্ডটি ভুল। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Incorrect password. Please try again.'
        );
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[Google Link Error]', err);
      setErrorMessage(err.message || 'Error linking account.');
      setIsLoading(false);
    }
  };

  const handleGoogleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!profileFullName.trim()) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে আপনার নাম লিখুন।'
          : 'Please enter your name.'
      );
      return;
    }

    if (!profilePhone.trim()) {
      setErrorMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন।'
          : 'Please enter your phone number.'
      );
      return;
    }

    setIsLoading(true);
    resetAlerts();

    try {
      const res = await api.googleRegister({
        credential: googleCredential,
        googleSub,
        googleEmail,
        fullName: profileFullName,
        phone: profilePhone,
        gender: profileGender,
        age: profileAge ? Number(profileAge) : undefined,
        district: profileDistrict || undefined,
        upazila: profileUpazila || undefined,
        address: profileAddress || undefined
      });

      if (res.success && res.token && res.user) {
        loginWithTokenAndUser(res.token, res.user);
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Registration failed.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[Google Register Error]', err);
      setErrorMessage(err.message || 'Error creating profile.');
      setIsLoading(false);
    }
  };

  // --- 1. HANDLE LOGIN ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    resetAlerts();

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage(t('auth.enterBothCredentialsErr'));
      setIsLoading(false);
      return;
    }

    try {
      const ok = await login(identifier.trim(), password.trim());
      if (ok) {
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      let friendlyMessage = t('auth.invalidCredentialsErr');
      const errorMessageStr = err.message || '';
      
      if (
        errorMessageStr.includes('PHONE_NOT_FOUND') ||
        errorMessageStr.includes('USER_NOT_FOUND') ||
        errorMessageStr.includes('NOT_FOUND') ||
        errorMessageStr.includes('বিদ্যমান নেই') ||
        errorMessageStr.includes('পাওয়া যায়নি') ||
        errorMessageStr.includes('পাওয়া যায়নি')
      ) {
        friendlyMessage = t('auth.phoneNotFoundErr');
      } else if (errorMessageStr.includes('INVALID_PIN') || errorMessageStr.includes('INVALID_PASSWORD')) {
        friendlyMessage = t('auth.invalidPinErr');
      } else if (errorMessageStr.includes('ACCOUNT_PENDING')) {
        friendlyMessage = t('auth.accountPendingErr');
      } else if (
        (errorMessageStr.includes('SUSPENDED') || errorMessageStr.includes('ACCOUNT_SUSPENDED') || errorMessageStr.includes('স্থগিত') || errorMessageStr.includes('সাসপেন্ড')) &&
        !errorMessageStr.includes('বিদ্যমান নেই')
      ) {
        friendlyMessage = t('auth.accountSuspendedErr');
      } else {
        friendlyMessage = errorMessageStr || friendlyMessage;
      }

      setErrorMessage(friendlyMessage);
      setIsLoading(false);
    }
  };

  // --- 2. HANDLE REGISTER REQUEST ---
  const handleRegistrationViewSubmit = async (data: RegistrationData) => {
    if (isLoading) return;
    resetAlerts();
    setIsLoading(true);
    try {
      const res = await registerRequest({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        maritalStatus: data.maritalStatus,
        district: data.district,
        upazila: data.upazila,
        address: data.address,
        password: data.password || '',
        confirmPassword: data.confirmPassword || ''
      });

      setRegistrationPayload(data);
      setPhone(data.phone);
      setIdentifier(data.phone);

      setSuccessMessage(res.message);
      setDevOtpHint(res.devOtp);
      setMode('register-otp');
      setCountdown(60);
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.regReqErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2.1 RESEND REGISTRATION OTP CODE ---
  const handleResendRegisterCode = async () => {
    if (!registrationPayload) return;
    resetAlerts();
    setIsLoading(true);
    try {
      const res = await registerRequest({
        fullName: registrationPayload.fullName,
        phone: registrationPayload.phone,
        email: registrationPayload.email,
        gender: registrationPayload.gender,
        dateOfBirth: registrationPayload.dateOfBirth,
        maritalStatus: registrationPayload.maritalStatus,
        district: registrationPayload.district,
        upazila: registrationPayload.upazila,
        address: registrationPayload.address,
        password: registrationPayload.password || '',
        confirmPassword: registrationPayload.confirmPassword || ''
      });
      setSuccessMessage(t('auth.newCodeSentMessage'));
      setDevOtpHint(res.devOtp);
      setCountdown(60);
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.codeResendErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. HANDLE REGISTER OTP VERIFY ---
  const handleRegisterOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    resetAlerts();

    if (!otpCode || otpCode.length < 4) {
      setErrorMessage(t('auth.otpReqErr'));
      return;
    }

    setIsLoading(true);
    try {
      const ok = await registerVerify(phone.trim() || identifier.trim(), otpCode.trim());
      if (ok) {
        logout();
        setSuccessMessage(t('auth.verifySuccessMessage'));
        setIdentifier(phone.trim());
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.otpVerifyErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. HANDLE FORGOT PASSWORD REQUEST ---
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();

    if (!identifier.trim()) {
      setErrorMessage(t('auth.identifierReqErr'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPasswordRequest(identifier.trim());
      setSuccessMessage(res.message);
      setDevOtpHint(res.devOtp);
      setMode('forgot-verify');
      setCountdown(60);
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.forgotReqErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. HANDLE FORGOT PASSWORD VERIFY & RESET ---
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();

    if (!otpCode || otpCode.length < 4) {
      setErrorMessage(t('auth.otpReqErr'));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t('auth.minPasswordLengthErr'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatchErr'));
      return;
    }

    setIsLoading(true);
    try {
      const ok = await forgotPasswordVerify(identifier.trim(), otpCode.trim(), password, confirmPassword);
      if (ok) {
        setSuccessMessage(t('auth.resetSuccessMessage'));
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.forgotVerifyErr'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040e0b] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none relative font-sans overflow-x-hidden">
      
      {/* Background Atmosphere Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Main Centered Container */}
      <div className="w-full max-w-sm sm:max-w-md my-auto py-6 space-y-6 relative z-10">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-slate-950/80 border border-emerald-900/60 shadow-md mb-1">
            <AppLogo className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-widest uppercase">
            CAVE COMPANIONS
          </h1>
          <p className="text-xs sm:text-sm font-medium text-emerald-400/80 tracking-wide">
            {language === 'bn' ? 'আপনার Cave-এ স্বাগতম' : 'Welcome to your Cave'}
          </p>
        </div>

        {/* Global Alert Banners */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* ================= MODE 1: LOGIN ================= */}
        {mode === 'login' && (
          <div className="space-y-5">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Identifier Field */}
              <div className="space-y-1.5">
                <label htmlFor="user-login-identifier" className="block text-xs font-semibold text-slate-300">
                  {language === 'bn' ? 'ইমেইল বা মোবাইল নম্বর' : 'Email or mobile number'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="user-login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={language === 'bn' ? 'আপনার ইমেইল বা মোবাইল নম্বর লিখুন' : 'Enter your email or mobile number'}
                    className="w-full pl-10 pr-4 py-3 bg-[#0a1813]/90 border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-600/80 focus:ring-1 focus:ring-emerald-600/50 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="user-login-password" className="block text-xs font-semibold text-slate-300">
                    {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetAlerts();
                      setMode('forgot');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                  >
                    {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="user-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={language === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password'}
                    className="w-full pl-10 pr-10 py-3 bg-[#0a1813]/90 border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-600/80 focus:ring-1 focus:ring-emerald-600/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                id="user-login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] text-sm sm:text-base disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>{language === 'bn' ? 'সংযুক্ত হচ্ছে...' : 'Connecting...'}</span>
                  </>
                ) : (
                  <span>{language === 'bn' ? 'লগইন' : 'Log In'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-1 items-center justify-center">
              <div className="grow border-t border-slate-800/80"></div>
              <span className="shrink mx-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                {language === 'bn' ? 'অথবা' : 'or'}
              </span>
              <div className="grow border-t border-slate-800/80"></div>
            </div>

            {/* Google Login Secondary Option */}
            <div className="relative">
              <button
                id="user-google-login-btn"
                type="button"
                onClick={handleGoogleClick}
                className="w-full py-3 px-4 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
              >
                <GoogleIcon />
                <span>{language === 'bn' ? 'Google দিয়ে চালিয়ে যান' : 'Continue with Google'}</span>
              </button>
              {/* Invisible Google official GSI button container overlaid on top */}
              <div
                id="google-signin-btn-container"
                className="absolute inset-0 opacity-[0.01] overflow-hidden z-10 cursor-pointer [&>div]:w-full [&>div]:h-full"
              />
            </div>

            {/* Secondary Link: Registration */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                {language === 'bn' ? 'নতুন এখানে?' : 'New here?'}{' '}
              </span>
              <button
                id="user-goto-register-btn"
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('register');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline ml-1 cursor-pointer transition-colors"
              >
                {language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 2: REGISTER ================= */}
        {mode === 'register' && (
          <RegistrationView
            onSubmit={handleRegistrationViewSubmit}
            onBackToLogin={() => {
              resetAlerts();
              setMode('login');
            }}
            isLoading={isLoading}
            externalError={errorMessage}
          />
        )}

        {/* ================= MODE 3: REGISTER OTP VERIFICATION ================= */}
        {mode === 'register-otp' && (
          <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-slate-200">{t('auth.enterOtpTitle')}</h2>
              <p className="text-xs text-slate-400 mt-1">
                <span className="font-mono text-emerald-300">{phone || identifier}</span> {t('auth.codeSentTo')}
              </p>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full pl-10 pr-4 py-3 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-600 text-xl font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Dev Helper Hint */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span>{t('auth.testCode')} </span>
                  <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{devOtpHint || '123456'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint || '123456')}
                  className="px-2.5 py-1 bg-emerald-600 text-slate-950 text-[11px] font-bold rounded hover:bg-emerald-500"
                >
                  {t('auth.useCode')}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('register');
                }}
                className="flex items-center gap-1 hover:text-slate-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.editInfo')}
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleResendRegisterCode}
                className={`text-emerald-400 font-medium ${
                  countdown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                }`}
              >
                {countdown > 0 
                  ? t('auth.resendCodeCountdown').replace('{count}', countdown.toString()) 
                  : t('auth.resendCode')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('auth.verifyAndActivate')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE 4: FORGOT PASSWORD REQUEST ================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-slate-200">{t('auth.forgotTitle')}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {t('auth.forgotSubtitle')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('auth.emailOrPhone')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={t('auth.emailOrPhonePlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.sendResetCode')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('login');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE 5: FORGOT PASSWORD VERIFY & RESET ================= */}
        {mode === 'forgot-verify' && (
          <form onSubmit={handleForgotVerify} className="space-y-3.5">
            <div className="text-center mb-1">
              <h2 className="text-sm font-bold text-slate-200">{t('auth.setNewPasswordTitle')}</h2>
              <p className="text-xs text-slate-400 mt-1">{t('auth.setNewPasswordSubtitle')}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.verificationCodeLabel')}</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-full px-4 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-600 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span>{t('auth.testCode')} <span className="font-mono font-bold text-amber-300">{devOtpHint || '123456'}</span></span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint || '123456')}
                  className="px-2.5 py-1 bg-emerald-600 text-slate-950 text-[11px] font-bold rounded hover:bg-emerald-500"
                >
                  {t('auth.useCode')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.newPasswordLabel')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('auth.confirmNewPasswordLabel')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('auth.setPasswordAndLogin')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE 6: SECURE GOOGLE LINKING ================= */}
        {mode === 'link-google' && (
          <form onSubmit={handleGoogleLinkSubmit} className="space-y-4 animate-fadeIn">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-slate-200">
                {language === 'bn' ? 'অ্যাকাউন্ট লিঙ্ক নিশ্চিত করুন' : 'Secure Account Linking'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {language === 'bn'
                  ? 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। গুগল অ্যাকাউন্টটি সংযুক্ত করতে পাসওয়ার্ড দিন।'
                  : 'A Cave Companions account already exists with this email. Please enter your password to securely link your Google account.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'গুগল ইমেইল' : 'Google Email'}
              </label>
              <input
                type="text"
                disabled
                value={googleEmail}
                className="w-full px-3 py-2.5 bg-[#0a1813]/40 border border-emerald-900/30 rounded-xl text-slate-400 text-xs sm:text-sm select-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={linkingPassword}
                  onChange={e => setLinkingPassword(e.target.value)}
                  placeholder={language === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password'}
                  className="w-full pl-10 pr-10 py-3 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !linkingPassword.trim()}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2 text-xs sm:text-sm"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{language === 'bn' ? 'সংযোগ করা হচ্ছে...' : 'Linking Account...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'নিরাপদে অ্যাকাউন্ট লিঙ্ক করুন' : 'Securely Link Google'}</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('login');
                  setLinkingPassword('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE 7: GOOGLE PROFILE COMPLETION ================= */}
        {mode === 'google-profile-completion' && (
          <form onSubmit={handleGoogleRegisterSubmit} className="space-y-4 animate-fadeIn">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-slate-200">
                {language === 'bn' ? 'প্রোফাইল তথ্য সম্পন্ন করুন' : 'Complete Your Profile'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {language === 'bn'
                  ? 'নিবন্ধন সম্পন্ন করতে অনুগ্রহ করে আপনার মোবাইল নম্বর এবং অন্যান্য তথ্য প্রদান করুন।'
                  : 'Please provide your phone number and profile info to complete registration.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'পুরো নাম' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={profileFullName}
                onChange={e => setProfileFullName(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: মোহাম্মদ আলী' : 'e.g. Mohammad Ali'}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              </label>
              <input
                type="tel"
                required
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={language === 'bn' ? 'যেমন: 017XXXXXXXX' : 'e.g. 017XXXXXXXX'}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'লিঙ্গ' : 'Gender'}
              </label>
              <select
                value={profileGender}
                onChange={e => setProfileGender(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="male">{language === 'bn' ? 'পুরুষ' : 'Male'}</option>
                <option value="female">{language === 'bn' ? 'নারী' : 'Female'}</option>
                <option value="other">{language === 'bn' ? 'অন্যান্য' : 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'বয়স (ঐচ্ছিক)' : 'Age (Optional)'}
              </label>
              <input
                type="number"
                value={profileAge}
                onChange={e => setProfileAge(e.target.value.replace(/\D/g, ''))}
                placeholder={language === 'bn' ? 'আপনার বয়স' : 'Your Age'}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'জেলা (ঐচ্ছিক)' : 'District (Optional)'}
                </label>
                <input
                  type="text"
                  value={profileDistrict}
                  onChange={e => setProfileDistrict(e.target.value)}
                  placeholder={language === 'bn' ? 'জেলা' : 'District'}
                  className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'উপজেলা (ঐচ্ছিক)' : 'Upazila (Optional)'}
                </label>
                <input
                  type="text"
                  value={profileUpazila}
                  onChange={e => setProfileUpazila(e.target.value)}
                  placeholder={language === 'bn' ? 'উপজেলা' : 'Upazila'}
                  className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'ঠিকানা (ঐচ্ছিক)' : 'Address (Optional)'}
              </label>
              <input
                type="text"
                value={profileAddress}
                onChange={e => setProfileAddress(e.target.value)}
                placeholder={language === 'bn' ? 'বাসা/রোড/এলাকা' : 'Home/Road/Area'}
                className="w-full px-3 py-2.5 bg-[#0a1813] border border-emerald-900/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !profileFullName.trim() || !profilePhone.trim()}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2 text-xs sm:text-sm"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{language === 'bn' ? 'নিবন্ধন করা হচ্ছে...' : 'Completing registration...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Complete Registration'}</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('login');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        )}

        {onCancel && (
          <div className="mt-4 text-center border-t border-slate-800/60 pt-3">
            <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
              {t('auth.goBack')}
            </button>
          </div>
        )}
      </div>

      {/* Absolute Bottom: Others Entry */}
      <div className="mt-auto pt-6 pb-2 text-center w-full relative z-10">
        <button
          id="auth-others-btn"
          type="button"
          onClick={() => setShowOthersSheet(true)}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer shadow-xs"
        >
          <span>{language === 'bn' ? 'অন্যান্য →' : 'Others →'}</span>
        </button>
      </div>

      {/* Others Bottom Sheet Overlay */}
      {showOthersSheet && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowOthersSheet(false)}
          />
          <div className="w-full sm:max-w-md bg-[#0a1814] border border-emerald-900/60 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-6 relative z-10 animate-slideUp">
            
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {language === 'bn' ? 'অন্যান্য অপশন' : 'Options'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'ভাষা ও পার্টনার পোর্টাল এক্সেস' : 'Language & Partner Access'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOthersSheet(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-emerald-900/40 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'ভাষা নির্বাচন করুন (Language)' : 'Language'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-emerald-950">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-emerald-600 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('bn')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    language === 'bn'
                      ? 'bg-emerald-600 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  বাংলা
                </button>
              </div>
            </div>

            {/* Partner Login Flow Entries */}
            <div className="space-y-2.5 pt-2 border-t border-emerald-900/40">
              {onOpenMerchantLogin && (
                <button
                  id="auth-merchant-login-link"
                  type="button"
                  onClick={() => {
                    setShowOthersSheet(false);
                    onOpenMerchantLogin();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-900/60 hover:border-amber-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-300 transition-colors">
                        {language === 'bn' ? 'মার্চেন্ট লগইন' : 'Merchant Login'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {language === 'bn' ? 'পার্টনার শপ ও ব্যবসার পোর্টাল' : 'For partner shops & business owners'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}

              {onOpenRiderLogin && (
                <button
                  id="auth-rider-login-link"
                  type="button"
                  onClick={() => {
                    setShowOthersSheet(false);
                    onOpenRiderLogin();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-900/60 hover:border-cyan-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-cyan-300 transition-colors">
                        {language === 'bn' ? 'রাইডার লগইন' : 'Rider Login'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {language === 'bn' ? 'ডেলিভারি রাইডার পোর্টাল' : 'For delivery rider partners'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}

              {/* Manufacturer Login Architecture Future Placeholder (Extensible architecture) */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


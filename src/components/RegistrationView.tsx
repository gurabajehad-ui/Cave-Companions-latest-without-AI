import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  ShieldCheck,
  Check,
  AlertCircle,
  MapPin,
  Calendar
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, getDistrictUpazilaItems } from '../data/bangladeshGeo';
import { useLanguage } from '../context/LanguageContext';

export interface RegistrationData {
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  maritalStatus: string;
  district: string;
  upazila: string;
  address: string;
  password?: string;
  confirmPassword?: string;
}

interface RegistrationViewProps {
  onSubmit: (data: RegistrationData) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  externalError: string | null;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  onSubmit,
  onBackToLogin,
  isLoading,
  externalError
}) => {
  const { language, t } = useLanguage();

  // Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('married');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation States
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'none' | 'weak' | 'medium' | 'strong'>('none');
  const [strengthScore, setStrengthScore] = useState(0); // 0 to 4

  // Real-time password strength evaluator
  useEffect(() => {
    if (!password) {
      setPasswordStrength('none');
      setStrengthScore(0);
      return;
    }

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    setStrengthScore(score);

    if (password.length < 6) {
      setPasswordStrength('weak');
    } else if (score <= 2) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  }, [password]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation: Form Completion
    if (!fullName.trim()) {
      setError(t('auth.fullNameReqErr'));
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError(t('auth.phoneReqErr'));
      return;
    }

    // BD Mobile validation (11 digits, starts with 01)
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      setError(t('auth.bdPhoneFormatErr'));
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.emailFormatErr'));
      return;
    }

    if (!dateOfBirth) {
      setError(t('auth.dobReqErr'));
      return;
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    if (dob > today) {
      setError(t('auth.futureDobErr'));
      return;
    }

    const ageDiff = today.getFullYear() - dob.getFullYear();
    if (ageDiff < 5) {
      setError(t('auth.minAgeErr'));
      return;
    }

    const cleanAddress = address.trim();
    if (!district) {
      setError(t('auth.districtReqErr'));
      return;
    }

    if (!upazila) {
      setError(t('auth.upazilaReqErr'));
      return;
    }

    if (!cleanAddress) {
      setError(t('auth.addressReqErr'));
      return;
    }

    // 2. Validation: Password Strength
    if (password.length < 6) {
      setError(t('auth.minPasswordLengthErr'));
      return;
    }

    // 3. Validation: Password Match
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatchErr'));
      return;
    }

    // All local validation passed, call onSubmit
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        gender,
        dateOfBirth,
        maritalStatus,
        district,
        upazila,
        address: cleanAddress,
        password,
        confirmPassword
      });
    } catch (err: any) {
      // Parent component will handle setting loading and displaying API error
    }
  };

  return (
    <form onSubmit={handleSubmit} id="registration-form" className="space-y-4">
      {/* Local & API Error Alert */}
      {(error || externalError) && (
        <div id="reg-error-banner" className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error || externalError}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label htmlFor="reg-fullname" className="block text-xs font-semibold text-emerald-200 mb-1">
          {t('auth.fullNameLabel')} <span className="text-amber-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/70">
            <UserIcon className="w-4 h-4" />
          </div>
          <input
            id="reg-fullname"
            type="text"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder={t('auth.fullNamePlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>
      </div>

      {/* Phone and Email Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-phone" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.phoneLabel')} <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/70">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="reg-phone"
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full pl-9 pr-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-emerald-200 mb-1">{t('auth.emailOptional')}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/70">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="w-full pl-9 pr-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>
      </div>

      {/* Gender Selection */}
      <div>
        <label className="block text-xs font-semibold text-emerald-200 mb-1">
          {t('auth.gender')} <span className="text-amber-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            id="reg-gender-male"
            type="button"
            onClick={() => setGender('male')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              gender === 'male'
                ? 'bg-amber-500 text-emerald-950 border-amber-400 shadow-md'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800/40'
            }`}
          >
            {t('auth.male')}
          </button>
          <button
            id="reg-gender-female"
            type="button"
            onClick={() => setGender('female')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              gender === 'female'
                ? 'bg-teal-400 text-emerald-950 border-teal-300 shadow-md'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800/40'
            }`}
          >
            {t('auth.female')}
          </button>
        </div>
      </div>

      {/* DOB & Marital Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-dob" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.dobLabel')} <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/70">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="reg-dob"
              type="date"
              required
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-marital" className="block text-xs font-semibold text-emerald-200 mb-1">{t('auth.maritalStatusLabel')}</label>
          <select
            id="reg-marital"
            value={maritalStatus}
            onChange={e => setMaritalStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="married" className="bg-emerald-950 text-white">
              {t('auth.married')}
            </option>
            <option value="single" className="bg-emerald-950 text-white">
              {t('auth.single')}
            </option>
            <option value="other" className="bg-emerald-950 text-white">
              {t('auth.maritalOther')}
            </option>
          </select>
        </div>
      </div>

      {/* District & Upazila Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-district" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.district')} <span className="text-amber-400">*</span>
          </label>
          <select
            id="reg-district"
            required
            value={district}
            onChange={e => {
              setDistrict(e.target.value);
              setUpazila(''); // Reset upazila when district changes
            }}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="" className="bg-emerald-950 text-white/50">{t('auth.selectDistrict')}</option>
            {BANGLADESH_DISTRICTS.map((d, idx) => (
              <option key={`${d.district}-${idx}`} value={d.district} className="bg-emerald-950 text-white">
                {language === 'bn' ? d.districtBn : d.district}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reg-upazila" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.thana')} <span className="text-amber-400">*</span>
          </label>
          <select
            id="reg-upazila"
            required
            disabled={!district}
            value={upazila}
            onChange={e => setUpazila(e.target.value)}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-emerald-950 text-white/50">
              {!district ? t('auth.selectDistrictFirst') : t('auth.selectThana')}
            </option>
            {district && getDistrictUpazilaItems(district).map((u, idx) => (
              <option key={`${u.nameEn}-${idx}`} value={language === 'bn' ? u.nameBn : u.nameEn} className="bg-emerald-950 text-white">
                {language === 'bn' ? u.label : `${u.nameEn} (${u.nameBn})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Address Field */}
      <div>
        <label htmlFor="reg-address" className="block text-xs font-semibold text-emerald-200 mb-1">
          {t('auth.addressLabel')} <span className="text-amber-400">*</span>
        </label>
        <div className="relative">
          <textarea
            id="reg-address"
            required
            rows={2}
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={t('auth.addressPlaceholder')}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
          />
        </div>
      </div>

      {/* Password & Confirm Password Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.password')} <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.newPasswordPlaceholder')}
              className="w-full px-3 pr-10 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-400/60 hover:text-emerald-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-emerald-200 mb-1">
            {t('auth.confirmPasswordLabel')} <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className="w-full px-3 pr-10 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-400/60 hover:text-emerald-300"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Password Strength Indicator */}
      {passwordStrength !== 'none' && (
        <div id="password-strength-indicator" className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-1.5 animate-fadeIn">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-300">{t('auth.passwordStrength')}</span>
            <span className={`font-bold uppercase tracking-wider text-[11px] ${
              passwordStrength === 'weak' ? 'text-rose-400' :
              passwordStrength === 'medium' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {passwordStrength === 'weak' ? t('auth.weak') :
               passwordStrength === 'medium' ? t('auth.medium') : t('auth.strong')}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                passwordStrength === 'weak' ? 'w-1/4 bg-rose-500' :
                passwordStrength === 'medium' ? 'w-2/3 bg-amber-500' : 'w-full bg-emerald-500'
              }`}
            />
          </div>
          {/* Helper feedback text */}
          <p className="text-[10px] text-emerald-400/75 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            {passwordStrength === 'weak' && t('auth.weakNote')}
            {passwordStrength === 'medium' && t('auth.mediumNote')}
            {passwordStrength === 'strong' && t('auth.strongNote')}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        id="reg-submit-btn"
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
      >
        {isLoading ? (
          <>
            <span className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></span>
            <span>{t('auth.loggingIn')}</span>
          </>
        ) : (
          <>
            <span>{t('auth.sendRegCodeBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Back to Login link */}
      <div className="text-center pt-2">
        <span className="text-xs text-emerald-300/80">{t('auth.haveAccount')}{' '}</span>
        <button
          id="reg-back-to-login"
          type="button"
          onClick={onBackToLogin}
          className="text-xs text-amber-300 font-bold hover:underline ml-1"
        >
          {t('auth.login')}
        </button>
      </div>
    </form>
  );
};

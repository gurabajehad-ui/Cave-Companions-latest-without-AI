import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const RiderLogin = ({ onLogin }: { onLogin: () => void }) => {
  const { language } = useLanguage();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = async () => {
    // In real app, call /api/auth/rider-login
    onLogin();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">
        {language === 'bn' ? 'রাইডার লগইন' : 'Rider Login'}
      </h1>
      <input 
        type="text" 
        placeholder={language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full p-3 mb-4 border rounded-xl"
      />
      <input 
        type="password" 
        placeholder={language === 'bn' ? 'পিন' : 'PIN'}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="w-full p-3 mb-6 border rounded-xl"
      />
      <button 
        onClick={handleLogin}
        className="w-full p-3 bg-emerald-600 text-white rounded-xl font-bold"
      >
        {language === 'bn' ? 'লগইন' : 'Login'}
      </button>
    </div>
  );
};

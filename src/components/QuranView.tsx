import React from 'react';
import { QuranMajidView } from './quran/QuranMajidView';

interface QuranViewProps {
  onBack?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const QuranView: React.FC<QuranViewProps> = ({ onBack, onShowToast }) => {
  const handleBack = onBack || (() => {
    if ((window as any).setAppActiveTab) {
      (window as any).setAppActiveTab('home');
    }
  });

  const handleShowToast = (msg: string, type: 'success' | 'error' | 'info') => {
    if (onShowToast) {
      onShowToast(type, type.toUpperCase(), msg);
    }
  };

  return <QuranMajidView onBack={handleBack} onShowToast={handleShowToast} />;
};

export default QuranView;

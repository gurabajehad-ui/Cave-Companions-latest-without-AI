import React from 'react';
import { HisnulMuslimView as InnerHisnulMuslimView } from './hisnulMuslim/HisnulMuslimView';

interface HisnulMuslimViewProps {
  onBack?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const HisnulMuslimView: React.FC<HisnulMuslimViewProps> = ({ onBack, onShowToast }) => {
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

  return <InnerHisnulMuslimView onBack={handleBack} onShowToast={handleShowToast} />;
};

export default HisnulMuslimView;

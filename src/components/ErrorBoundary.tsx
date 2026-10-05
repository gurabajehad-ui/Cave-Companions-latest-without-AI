import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  componentDidMount() {
    // Clear recovery flag on clean mount
    try {
      sessionStorage.removeItem('chunk_recovery_retry');
    } catch (e) {}
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'অ্যাপ্লিকেশনে অপ্রত্যাশিত সমস্যা হয়েছে।'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);

    // Controlled one-time auto-recovery for stale dynamic chunk import errors
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /loading chunk|failed to fetch dynamically imported module|failed to load script/i.test(error?.message || '');

    if (isChunkError) {
      try {
        const hasRetried = sessionStorage.getItem('chunk_recovery_retry');
        if (!hasRetried) {
          sessionStorage.setItem('chunk_recovery_retry', 'true');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  handleResetHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl text-white">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">একটি সমস্যা হয়েছে</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {this.state.errorMessage || 'অ্যাপ্লিকেশন রেন্ডার করতে গিয়ে অপ্রত্যাশিত ত্রুটি ঘটেছে।'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>রিফ্রেশ করুন</span>
              </button>
              <button
                onClick={this.handleResetHome}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>হোমে ফিরুন</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

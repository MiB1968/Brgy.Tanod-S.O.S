import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🏥 CRITICAL SYSTEM FAILURE:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-8 text-center font-mono">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50 animate-pulse">
            <span className="text-4xl">🚨</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">FATAL CRASH DETECTED</h1>
          <p className="text-red-400 text-xs mb-8 uppercase tracking-[0.3em]">Neural Interface Disconnected</p>
          
          <div className="w-full max-w-2xl bg-black/40 border border-white/5 rounded-2xl p-6 text-left overflow-auto max-h-[40vh] custom-scrollbar">
            <p className="text-red-500 font-bold mb-2 text-sm uppercase">[REASON]</p>
            <p className="text-white/80 text-xs leading-relaxed mb-4">{this.state.error?.message || 'Unknown system error'}</p>
            
            <p className="text-white/30 font-bold mb-2 text-[10px] uppercase">[RECOVERY_SUGGESTION]</p>
            <p className="text-white/40 text-[10px] leading-relaxed">
              1. Check AI Studio Settings (Gear Icon) for missing Supabase keys.<br/>
              2. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.<br/>
              3. Try clearing browser cache and refreshing.<br/>
              4. If the error persists, the current build might be unstable.
            </p>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all"
          >
            Re-Initialize System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


import React, { useEffect } from 'react';

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="relative overflow-hidden rounded-xl border border-red-500/50 bg-black/60 backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.2)] p-4 flex gap-4 items-start">
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
        
        {/* Warning Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-orbitron font-bold text-red-400 tracking-widest uppercase mb-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Neural Interference
          </h3>
          <p className="text-sm text-red-100/80 leading-snug">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="flex-shrink-0 text-red-400/50 hover:text-red-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Cyber Decorative Line */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-[shrink_8s_linear_forwards]" style={{ width: '100%' }} />
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ErrorNotification;

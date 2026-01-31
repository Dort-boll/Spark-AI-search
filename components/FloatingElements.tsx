import React from 'react';

const FloatingElements: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-5 overflow-hidden">
      {/* Structural Separators */}
      <div className="absolute top-[10%] left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
      <div className="absolute bottom-[10%] left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
      
      {/* Corner Precision Accents */}
      <div className="absolute top-12 left-12 flex gap-4 opacity-10">
        <div className="w-1 h-8 bg-white" />
        <div className="w-8 h-1 bg-white" />
      </div>
      <div className="absolute top-12 right-12 flex flex-col items-end gap-4 opacity-10">
        <div className="w-1 h-8 bg-white" />
        <div className="w-8 h-1 bg-white -mt-8" />
      </div>

      {/* Floating Measurement Lines */}
      <div className="absolute top-1/4 left-8 flex flex-col gap-1 opacity-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-px bg-white ${i % 2 === 0 ? 'w-4' : 'w-2'}`} />
        ))}
      </div>
      
      <div className="absolute bottom-1/4 right-8 flex flex-col items-end gap-1 opacity-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-px bg-white ${i % 2 === 0 ? 'w-4' : 'w-2'}`} />
        ))}
      </div>

      {/* Refined Kinetic Elements */}
      <div className="absolute top-[20%] right-[15%] w-3 h-3 border border-cyan-500/20 rounded-full animate-pulse" />
      <div className="absolute bottom-[25%] left-[15%] w-1.5 h-1.5 bg-cyan-400/10 rounded-full" />
      
      {/* Subtle Scan Line */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent h-24 w-full animate-[scan_10s_linear_infinite] opacity-30" />

      <style>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default FloatingElements;
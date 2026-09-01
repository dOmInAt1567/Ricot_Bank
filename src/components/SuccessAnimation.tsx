import { useEffect } from 'react';
import { playSuccess } from '@/lib/sounds';

export default function SuccessAnimation({ message, onComplete }: { message: string; onComplete?: () => void }) {
  useEffect(() => {
    playSuccess();
    if (onComplete) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-28 h-28 rounded-full border-4 border-green-500/30 flex items-center justify-center animate-circle-pop">
            {/* Inner circle */}
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
              {/* Checkmark SVG */}
              <svg viewBox="0 0 52 52" className="w-12 h-12">
                <path
                  className="animate-checkmark"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27 L22 35 L38 18"
                />
              </svg>
            </div>
          </div>
          {/* Expanding ring */}
          <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-green-500/40 animate-circle-pop" style={{ animationDelay: '0.15s' }} />
        </div>
        <h2 className="text-2xl font-bold text-white mt-8 animate-slide-up">Transfer Successful</h2>
        <p className="text-gray-400 text-sm mt-2 animate-slide-up">{message}</p>
      </div>
    </div>
  );
}

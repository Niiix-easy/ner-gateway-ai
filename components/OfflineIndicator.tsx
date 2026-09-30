'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-4 py-2.5 bg-amber-500 text-white rounded-xl shadow-2xl border border-amber-400 font-bold text-[10px] uppercase tracking-widest"
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <WifiOff className="w-4 h-4" />
          Modo Offline — Usando cache local
        </motion.div>
      )}
    </AnimatePresence>
  );
}

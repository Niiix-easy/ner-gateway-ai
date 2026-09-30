'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layout, Package, ShoppingBag, ArrowRight, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMANDS = [
  { id: 'dash', label: 'Dashboard', icon: Layout, href: '/dashboard', description: 'Visão geral do sistema' },
  { id: 'prod', label: 'Produtos', icon: Package, href: '/products', description: 'Gerenciar catálogo' },
  { id: 'check', label: 'Checkout Demo', icon: ShoppingBag, href: '/checkout', description: 'Testar fluxo de venda' },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          router.push(filteredCommands[selectedIndex].href);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, router, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 md:p-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden pointer-events-auto"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="O que você está procurando?"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                    <Command className="w-3 h-3" /> K
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-1">
                  {filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          router.push(cmd.href);
                          onClose();
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left group",
                          selectedIndex === idx 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl" 
                            : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2.5 rounded-xl transition-colors",
                            selectedIndex === idx ? "bg-white/10 dark:bg-slate-900/10" : "bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900"
                          )}>
                            <cmd.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{cmd.label}</p>
                            <p className={cn(
                              "text-[10px] font-medium uppercase tracking-widest mt-0.5",
                              selectedIndex === idx ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500"
                            )}>
                              {cmd.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={cn(
                          "w-4 h-4 transition-transform",
                          selectedIndex === idx ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                        )} />
                      </button>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nenhum comando encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-400 uppercase">↑↓</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Navegar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-400 uppercase">Enter</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selecionar</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-400 uppercase">Esc</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fechar</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Package, 
  Layout, 
  Globe, 
  Bell, 
  ChevronRight, 
  Command,
  Moon,
  Sun,
  Search,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CommandPalette } from './CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const theme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && systemDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { label: 'Visão Geral', icon: BarChart3, href: '/dashboard' },
    { label: 'Produtos', icon: Package, href: '/products' },
    { label: 'Checkout', icon: Layout, href: '/checkout' },
    { label: 'Relatórios', icon: Globe, href: '/dashboard' },
  ];

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-500">
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800 z-[110] transition-all duration-500 lg:translate-x-0 lg:static flex flex-col",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-10 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Command className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Ner Gateway</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl transition-all relative group",
                  isActive 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.2)] dark:shadow-white/5" 
                    : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-white dark:text-slate-900" : "text-slate-400")} />
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute inset-0 bg-slate-900 dark:bg-white rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-8">
          <div className="p-6 bg-slate-900 dark:bg-white rounded-3xl text-white dark:text-slate-900 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
              <Sun className="w-12 h-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-slate-500 dark:bg-slate-200 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900">MQ</div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] truncate">M. Quevedo</p>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Admin Dev</p>
                </div>
              </div>
              <button className="w-full py-3 bg-white/10 dark:bg-slate-900/5 hover:bg-white/20 dark:hover:bg-slate-900/10 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 dark:border-slate-200">
                <LogOut className="w-3.5 h-3.5" />
                Terminal Log
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="h-24 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between px-10 transition-all duration-300">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:flex">
              <Layout className="w-4 h-4" />
              <ChevronRight className="w-3 h-3 opacity-30" />
              <span className="text-slate-900 dark:text-white">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>TERMINAL...</span>
              <span className="ml-8 px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm opacity-50 font-mono">⌘K</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 border border-slate-200 dark:border-slate-800 transition-all group"
              >
                {isDark ? <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" /> : <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />}
              </button>
              <button className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-rose-500 hover:shadow-xl hover:shadow-rose-500/10 border border-slate-200 dark:border-slate-800 transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_50%)]">
          <div className="p-12 max-w-[1440px] w-full mx-auto">
            {(title || subtitle || actions) && (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operational Hub</span>
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">{title}</h1>
                  {subtitle && <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed">{subtitle}</p>}
                </motion.div>
                {actions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                  >
                    {actions}
                  </motion.div>
                )}
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
          
          <footer className="p-12 border-t border-slate-200 dark:border-slate-900/50 mt-12 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">© 2026 NER GATEWAY • ENGINE v4.2.0</p>
            <div className="flex gap-8">
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Docs</a>
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Support</a>
              <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest">Status</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

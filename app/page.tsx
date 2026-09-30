'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  ChevronRight, 
  Globe, 
  Lock,
  Cpu,
  Sparkles,
  Command
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase italic">Ner Gateway</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Recursos</a>
            <a href="#security" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Segurança</a>
            <a href="#pricing" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="px-6 py-2.5 bg-white text-slate-950 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-white/5"
            >
              Acessar Painel
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">IA Generativa Integrada</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
              PAGAMENTOS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-indigo-400 animate-gradient-x">INTELIGENTES.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              O gateway de pagamento definitivo para infoprodutores e SaaS. 
              Processamento ultra-rápido, checkout otimizado e analytics preditivo com IA.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                href="/dashboard"
                className="group w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                Ver Demonstração
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-24 relative"
          >
            <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] -z-10" />
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="px-4 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                  <Command className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard v2.4</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversão 24h</p>
                  <p className="text-3xl font-bold">92.4%</p>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '92.4%' }}
                      transition={{ delay: 1, duration: 1.5 }}
                      className="h-full bg-indigo-500" 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume Processado</p>
                  <p className="text-3xl font-bold">R$ 1.2M</p>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ delay: 1.2, duration: 1.5 }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fraudes Bloqueadas</p>
                  <p className="text-3xl font-bold">4.2k</p>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }}
                      transition={{ delay: 1.4, duration: 1.5 }}
                      className="h-full bg-rose-500" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-24 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Potência em cada transação.</h2>
            <p className="text-slate-400 text-lg">Tecnologia de ponta para garantir que você nunca perca uma venda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: "Checkout de 1 Clique", 
                desc: "Minimize o atrito e aumente sua conversão em até 35% com nosso fluxo simplificado.",
                icon: Zap,
                color: "bg-amber-500"
              },
              { 
                title: "IA Preditiva", 
                desc: "Preveja churn e identifique tendências de faturamento antes que aconteçam.",
                icon: Cpu,
                color: "bg-indigo-500"
              },
              { 
                title: "Antifraude Neural", 
                desc: "Nossa rede neural bloqueia 99.9% das tentativas de fraude em tempo real.",
                icon: ShieldCheck,
                color: "bg-emerald-500"
              },
              { 
                title: "Split Global", 
                desc: "Pague afiliados e parceiros instantaneamente com regras customizáveis.",
                icon: Globe,
                color: "bg-blue-500"
              },
              { 
                title: "Dashboard Realtime", 
                desc: "Métricas profundas atualizadas a cada milissegundo em todos os seus dispositivos.",
                icon: BarChart3,
                color: "bg-purple-500"
              },
              { 
                title: "Segurança Nível 1", 
                desc: "Certificação PCI-DSS de conformidade máxima para seus dados.",
                icon: Lock,
                color: "bg-rose-500"
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/[0.08] transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl", f.color)}>
                  <f.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-12 tracking-tight text-white leading-tight">
            Mais de <span className="text-indigo-950">50.000</span> empresas confiam na Ner Gateway para escalar seus negócios.
          </h2>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale invert">
            {/* Logos representados por placeholders de texto para design clean */}
            {['STRIPE', 'MERCADO PAGO', 'EFI', 'PAGSEGURO', 'REDE', 'CIELO'].map(l => (
              <span key={l} className="text-xl font-black tracking-widest">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-20">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <span className="text-lg font-bold tracking-tighter uppercase italic">Ner Gateway</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Revolucionando o ecossistema de pagamentos digitais com inteligência e segurança.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <p className="text-xs font-bold text-white uppercase tracking-widest">Produto</p>
                <ul className="space-y-2">
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Recursos</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Integrações</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">API Docs</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-bold text-white uppercase tracking-widest">Empresa</p>
                <ul className="space-y-2">
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Sobre</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Carreiras</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Blog</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-bold text-white uppercase tracking-widest">Suporte</p>
                <ul className="space-y-2">
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Central</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Status</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">Contato</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
              © 2026 Ner Gateway AI. Todos os direitos reservados.
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-slate-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Privacidade</a>
              <a href="#" className="text-slate-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

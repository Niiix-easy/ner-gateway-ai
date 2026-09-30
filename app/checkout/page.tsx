'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Info,
  Smartphone,
  Layout,
  Mail,
  User,
  Fingerprint,
  CheckCircle2,
  Copy,
  ArrowRight,
  QrCode,
  X,
  Command
} from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from '@/components/CommandPalette';
import { Toast } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const [method, setMethod] = useState('card');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixQR, setShowPixQR] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const maskExpiry = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})\d+?$/, '$1');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf') maskedValue = maskCPF(value);
    if (name === 'cardNumber') maskedValue = maskCardNumber(value);
    if (name === 'expiry') maskedValue = maskExpiry(value);
    if (name === 'cvv') maskedValue = value.replace(/\D/g, '').slice(0, 4);

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: '1', // Hardcoded for demo, could be dynamic
          amount: 297.00,
          customerEmail: formData.email,
          name: formData.name
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        setToastMsg(result.error || 'Erro no pagamento');
        setShowToast(true);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      if (method === 'pix') {
        setShowPixQR(true);
      } else {
        setShowSuccess(true);
      }
    } catch (error) {
      setToastMsg('Erro de conexão com o servidor de pagamentos');
      setShowToast(true);
      setIsProcessing(false);
    }
  };

  const handleFinishSuccess = () => {
    setShowSuccess(false);
    setShowFeedback(true);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row font-sans transition-colors duration-300">
      <Toast isVisible={showToast} message={toastMsg} onClose={() => setShowToast(false)} />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <div className="flex-1 p-8 lg:p-16 flex justify-center items-start overflow-auto">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Finalizar Pagamento</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Transação segura processada por Ner Gateway.</p>
            </div>
            <Link href="/" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
              Voltar
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: 'card', label: 'Cartão', icon: CreditCard },
              { id: 'pix', label: 'PIX', icon: Smartphone },
              { id: 'boleto', label: 'Boleto', icon: Layout },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border rounded-xl transition-all",
                  method === m.id 
                    ? "border-slate-900 dark:border-white bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" 
                    : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <m.icon className={cn("w-5 h-5", method === m.id ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
              </button>
            ))}
          </div>

          <form className="space-y-6 bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <div className="relative">
                    <input 
                      name="name"
                      type="text" 
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all pl-10 text-sm dark:text-white"
                      placeholder="Seu nome"
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                  <div className="relative">
                    <input 
                      name="email"
                      type="email" 
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all pl-10 text-sm dark:text-white"
                      placeholder="exemplo@email.com"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">CPF / CNPJ</label>
                <div className="relative">
                  <input 
                    name="cpf"
                    type="text" 
                    value={formData.cpf}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all pl-10 text-sm dark:text-white"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
              
              {method === 'card' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Número do Cartão</label>
                    <div className="relative">
                      <input 
                        name="cardNumber"
                        type="text" 
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all pl-10 text-sm dark:text-white"
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                      />
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Validade</label>
                      <input 
                        name="expiry"
                        type="text" 
                        value={formData.expiry}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all text-sm dark:text-white"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">CVV</label>
                      <input 
                        name="cvv"
                        type="text" 
                        value={formData.cvv}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 dark:focus:border-white transition-all text-sm dark:text-white"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className={cn(
                "w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5 flex items-center justify-center gap-2",
                isProcessing && "opacity-70 cursor-not-allowed"
              )} 
              type="button"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isProcessing ? 'Processando...' : 'Finalizar Compra'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-8 lg:p-12 transition-colors duration-300">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-8 tracking-tight uppercase text-xs tracking-widest">Resumo</h2>
        <div className="space-y-6 mb-8">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
              <Layout className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">Curso de Inteligência Artificial para Negócios</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-bold tracking-widest">Acesso Vitalício</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">R$ 297,00</p>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-900 dark:text-white">R$ 297,00</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-50 dark:border-slate-800">
            <span className="text-slate-900 dark:text-white">Total</span>
            <span className="text-slate-900 dark:text-white">R$ 297,00</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-900 p-12 text-center text-white">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-2 tracking-tight">Sucesso!</h2>
                <p className="text-slate-400 text-sm">Seu pagamento foi confirmado.</p>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">E-mail de acesso</span>
                  <span className="font-bold">{formData.email || 'usuario@exemplo.com'}</span>
                </div>
                <button 
                  onClick={handleFinishSuccess}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"
                >
                  Voltar ao Início
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-10 text-center"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">O que achou da experiência?</h2>
              <p className="text-slate-500 text-sm mb-8">Sua opinião é fundamental para melhorarmos nossa plataforma.</p>
              
              <div className="flex justify-center gap-4 mb-10">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className={cn(
                      "w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center text-lg font-bold",
                      feedbackRating === star 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "border-slate-100 text-slate-300 hover:border-slate-200"
                    )}
                  >
                    {star}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <textarea 
                  placeholder="Deixe um comentário (opcional)..."
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 resize-none"
                />
                <Link 
                  href="/"
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"
                >
                  Enviar Feedback
                </Link>
                <Link 
                  href="/"
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors inline-block"
                >
                  Pular por enquanto
                </Link>
              </div>
            </motion.div>
          </div>
        )}

        {showPixQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative p-10 text-center"
            >
              <button onClick={() => setShowPixQR(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
              <QrCode className="w-12 h-12 text-slate-900 mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-8">Pague com PIX</h2>
              <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                <Image 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=NerGateway" 
                  alt="QR" 
                  width={200}
                  height={200}
                  className="mx-auto" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <button 
                onClick={() => {
                  setShowPixQR(false);
                  setShowSuccess(true);
                }}
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl"
              >
                Confirmar Pagamento
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

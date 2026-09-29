'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Info,
  Smartphone,
  Layout
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CheckoutPage() {
  const [method, setMethod] = useState('card');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Checkout Form */}
      <div className="flex-1 p-8 lg:p-16 flex justify-center items-start overflow-auto">
        <div className="w-full max-w-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Finalizar Pagamento</h1>
            <p className="text-slate-500">Insira seus dados para concluir a compra com segurança.</p>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: 'card', label: 'Cartão', icon: CreditCard },
              { id: 'pix', label: 'PIX', icon: Smartphone },
              { id: 'boleto', label: 'Boleto', icon: Layout },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border rounded-xl transition-all",
                  method === m.id 
                    ? "border-slate-900 bg-white shadow-sm text-slate-900" 
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                <m.icon className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">{m.label}</span>
              </button>
            ))}
          </div>

          <form className="space-y-6 bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                  placeholder="Como no cartão"
                />
              </div>
              
              {method === 'card' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número do Cartão</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all pr-12"
                        placeholder="0000 0000 0000 0000"
                      />
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Validade</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                        placeholder="MM/AA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CVV</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </>
              )}

              {method === 'pix' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-600">O código PIX será gerado após clicar em finalizar. Você terá 30 minutos para realizar o pagamento.</p>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2" type="button">
              <Lock className="w-4 h-4" />
              Pagar R$ 297,00
            </button>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                Ambiente Seguro
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Lock className="w-4 h-4" />
                SSL 256 Bits
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="lg:w-96 bg-white border-l border-slate-200 p-8 lg:p-12">
        <h2 className="text-lg font-bold text-slate-900 mb-8">Resumo do Pedido</h2>
        
        <div className="space-y-6 mb-8">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <Layout className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 line-clamp-2">Curso de Inteligência Artificial para Negócios</p>
              <p className="text-xs text-slate-500 mt-1">Quantidade: 1</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900">R$ 297,00</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-900 font-medium">R$ 297,00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Taxas</span>
            <span className="text-slate-900 font-medium">R$ 0,00</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900 underline decoration-slate-900/20 underline-offset-4">R$ 297,00</span>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ao finalizar a compra, você concorda com nossos Termos de Uso e Política de Privacidade. Seu acesso será enviado imediatamente após a confirmação do pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}

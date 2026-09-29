'use client';

import React from 'react';
import { 
  Plus, 
  MoreVertical, 
  ExternalLink, 
  Trash2, 
  Edit2,
  Package,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";

const PRODUCTS = [
  { id: '1', name: "Curso de Inteligência Artificial", price: 297.00, sales: 45, status: 'active', type: 'Digital' },
  { id: '2', name: "E-book Growth Hacking", price: 47.00, sales: 128, status: 'active', type: 'Digital' },
  { id: '3', name: "SaaS Starter Template", price: 99.00, sales: 12, status: 'paused', type: 'SaaS' },
  { id: '4', name: "Consultoria Premium", price: 1500.00, sales: 3, status: 'active', type: 'Service' },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Meus Produtos</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Preço</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Vendas</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PRODUCTS.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{product.type}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-slate-900">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-slate-600 font-mono">{product.sales}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      product.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {product.status === 'active' ? 'Ativo' : 'Pausado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {PRODUCTS.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-slate-900 font-medium mb-1">Nenhum produto encontrado</h3>
              <p className="text-slate-500 text-sm mb-6">Comece cadastrando seu primeiro produto para vender.</p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                <Plus className="w-4 h-4" />
                Novo Produto
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

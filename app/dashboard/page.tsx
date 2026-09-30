'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Package,
  Globe,
  Key,
  RefreshCw,
  CheckCircle2,
  Activity,
  Sparkles,
  RotateCcw,
  Eye,
  Activity as LatencyIcon,
  X,
  Search,
  Zap,
  Server,
  Cpu,
  Settings2,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from "@/lib/utils";
import nextDynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '@/components/Toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { io } from 'socket.io-client';

const SalesChart = nextDynamic(() => import('@/components/DashboardCharts').then(mod => mod.SalesChart), { ssr: false });
const RevenuePieChart = nextDynamic(() => import('@/components/DashboardCharts').then(mod => mod.RevenuePieChart), { ssr: false });

// Mock data generator for different timeframes
const getDashboardData = (filter: string) => {
  const multiplier = filter === '7d' ? 0.25 : filter === 'ytd' ? 6.5 : 1;
  
  return {
    vendas_totais: 12540.50 * multiplier,
    quantidade_vendas: Math.floor(142 * multiplier),
    ticket_medio: 88.31,
    taxa_conversao: 4.2,
    ultimas_vendas: [
      { id: 1, cliente: "João Silva", produto: "Curso de IA", valor: 297.00, status: "completed", data: "Agora mesmo" },
      { id: 2, cliente: "Maria Souza", produto: "E-book Growth", valor: 47.00, status: "pending", data: "15 min atrás" },
      { id: 3, cliente: "Pedro Santos", produto: "SaaS Starter", valor: 99.00, status: "completed", data: "1h atrás" },
    ],
    grafico_vendas: [
      { data: "00", total: 120 * multiplier },
      { data: "04", total: 80 * multiplier },
      { data: "08", total: 450 * multiplier },
      { data: "12", total: 1200 * multiplier },
      { data: "16", total: 950 * multiplier },
      { data: "20", total: 1500 * multiplier },
      { data: "23", total: 600 * multiplier },
    ],
    crescimento_mensal: [
      { mes: 'Jan', receita: 4500, crescimento: 10 },
      { mes: 'Fev', receita: 5200, crescimento: 15 },
      { mes: 'Mar', receita: 4800, crescimento: 12 },
      { mes: 'Abr', receita: 6100, crescimento: 20 },
      { mes: 'Mai', receita: 7500, crescimento: 28 },
      { mes: 'Jun', receita: 8900, crescimento: 32 },
    ],
    distribuicao_produto: [
      { name: 'Cursos', value: 4500 * multiplier },
      { name: 'SaaS', value: 3200 * multiplier },
      { name: 'E-books', value: 1800 * multiplier },
      { name: 'Serviços', value: 3040 * multiplier },
    ],
    integracoes: [
      { nome: 'Stripe Webhook', status: 'online', latencia: '120ms', ultima_chamada: '2 min atrás' },
      { nome: 'Mercado Pago', status: 'online', latencia: '245ms', ultima_chamada: '5 min atrás' },
      { nome: 'EFI Pix Gateway', status: 'maintenance', latencia: '-', ultima_chamada: '1h atrás' },
    ]
  };
};

const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-colors">
        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-white dark:group-hover:text-slate-900" />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center text-[10px] font-bold uppercase tracking-widest",
          trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h3>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
      {subtext && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{subtext}</span>}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    completed: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    pending: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    online: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    maintenance: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
  };
  
  const currentStyle = styles[status] || "text-slate-700 bg-slate-50 dark:text-slate-400 dark:bg-slate-800";

  const isOnline = status === 'online' || status === 'completed';

  return (
    <div className="flex items-center gap-2">
      {isOnline && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />
      )}
      {status === 'maintenance' && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
        />
      )}
      <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", currentStyle)}>
        {status === 'completed' ? 'Pago' : status === 'pending' ? 'Pendente' : status}
      </span>
    </div>
  );
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('30d');
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [activitySearch, setActivitySearch] = useState('');
  const [showLatencyFor, setShowLatencyFor] = useState<string | null>(null);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const [secretToken, setSecretToken] = useState('ner_live_67x...99p');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [liveSales, setLiveSales] = useState([
    { id: 1, cliente: "João Silva", produto: "Curso de IA", valor: 297.00, status: "completed", data: "Agora mesmo" },
    { id: 2, cliente: "Maria Souza", produto: "E-book Growth", valor: 47.00, status: "pending", data: "15 min atrás" },
    { id: 3, cliente: "Pedro Santos", produto: "SaaS Starter", valor: 99.00, status: "completed", data: "1h atrás" },
  ]);

  useEffect(() => {
    setMounted(true);
    
    const socket = io();

    socket.on('activity', (data) => {
      console.log('Dashboard activity received:', data);
      
      const newSale = {
        id: data.id,
        cliente: data.data?.name || "Cliente API",
        produto: data.data?.productName || "Produto via Webhook",
        valor: data.data?.amount || 0,
        status: "completed",
        data: "Agora mesmo"
      };

      setLiveSales(prev => [newSale, ...prev.slice(0, 4)]);
      setToastMsg(`Venda capturada via Webhook: R$ ${newSale.valor.toFixed(2)}`);
      setShowToast(true);
    });

    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        const names = ["Lucas Lima", "Carla Dias", "Felipe Amorim", "Juliana Vaz"];
        const products = ["Curso de IA", "E-book Growth", "SaaS Starter", "Consultoria Premium"];
        const newSale = {
          id: Date.now(),
          cliente: names[Math.floor(Math.random() * names.length)],
          produto: products[Math.floor(Math.random() * products.length)],
          valor: [47, 99, 297, 1500][Math.floor(Math.random() * 4)],
          status: Math.random() > 0.2 ? "completed" : "pending",
          data: "Agora mesmo"
        };
        
        setLiveSales(prev => [newSale, ...prev.slice(0, 4)]);
        setToastMsg(`Nova venda: R$ ${newSale.valor.toFixed(2)}`);
        setShowToast(true);
      }, 10000);
    }

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [isLive]);

  const filteredLiveSales = useMemo(() => {
    if (!activitySearch) return liveSales;
    const search = activitySearch.toLowerCase();
    return liveSales.filter(s => 
      s.cliente.toLowerCase().includes(search) || 
      s.produto.toLowerCase().includes(search)
    );
  }, [liveSales, activitySearch]);

  const memoizedData = useMemo(() => getDashboardData(filter), [filter]);

  const insights = useMemo(() => {
    const trend = memoizedData.crescimento_mensal[memoizedData.crescimento_mensal.length - 1].crescimento;
    const bestProduct = [...memoizedData.distribuicao_produto].sort((a, b) => b.value - a.value)[0].name;
    
    return {
      title: trend > 20 ? "Crescimento Acelerado" : "Estabilidade Operacional",
      summary: `Seu faturamento em ${memoizedData.crescimento_mensal[memoizedData.crescimento_mensal.length - 1].mes} cresceu ${trend}% em relação ao mês anterior. O segmento de ${bestProduct} continua sendo o seu maior motor de receita.`,
      recommendation: trend > 25 ? "Considere reinvestir o lucro excedente em campanhas de tráfego pago para escalar." : "Mantenha o foco na retenção de clientes para estabilizar o ticket médio."
    };
  }, [memoizedData]);

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        {[
          { id: '7d', label: '7D' },
          { id: '30d', label: '30D' },
          { id: 'ytd', label: 'YTD' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
              filter === f.id 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <button className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
        <Zap className="w-3.5 h-3.5" />
        Upgrade Plan
      </button>
    </div>
  ), [filter]);

  if (!mounted) return null;

  return (
    <DashboardLayout 
      title="Visão Geral" 
      subtitle="Aqui está o que aconteceu no seu gateway nas últimas 24 horas."
      actions={headerActions}
    >
      <Toast isVisible={showToast} message={toastMsg} onClose={() => setShowToast(false)} />
      
      {/* Dynamic Control Bar */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2"
      >
        <div className="md:col-span-2 flex items-center gap-4 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Gerar Relatório
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            Sincronizar Dados
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
          <button className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Core Engine</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">v4.2.0-stable</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">99.98%</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Uptime</p>
          </div>
        </div>
      </motion.section>
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-3xl border border-white/10 dark:border-slate-200 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-24 h-24" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 dark:text-emerald-600">Insights da IA</span>
          </div>
          <h4 className="text-xl font-bold mb-3">{insights.title}</h4>
          <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed mb-6">{insights.summary}</p>
          <div className="pt-6 border-t border-white/10 dark:border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Recomendação Estratégica</p>
            <p className="text-[13px] text-emerald-400 dark:text-emerald-600 font-medium italic">&quot;{insights.recommendation}&quot;</p>
          </div>
        </div>
      </motion.section>

      {/* Stats Grid */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        <StatCard title="Faturamento Bruto" value={`R$ ${data.vendas_totais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend={12.5} icon={TrendingUp} />
        <StatCard title="Novas Vendas" value={data.quantidade_vendas} trend={5.2} icon={ShoppingBag} />
        <StatCard title="Taxa de Conversão" value={`${data.taxa_conversao}%`} trend={0.8} icon={Activity} />
        <StatCard title="Ticket Médio" value={`R$ ${data.ticket_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend={-1.2} icon={BarChart3} />
      </motion.section>

      {/* Main Charts Grid */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest">Fluxo de Transações ({filter})</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowPredictions(!showPredictions)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                  showPredictions 
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                )}
              >
                <Sparkles className={cn("w-3 h-3", showPredictions ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                Previsão IA
              </button>
               <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendas</span>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            <SalesChart data={data.grafico_vendas} showPrediction={showPredictions} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <h3 className="text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest mb-10">Mix de Produtos</h3>
          <div className="h-[400px]">
            <RevenuePieChart data={data.distribuicao_produto} />
          </div>
        </div>
      </motion.section>

      {/* Lower Grid: Integrations & Recent Activity */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <div className="bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest mb-1">Status de Integrações</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Webhooks & API Endpoints</p>
            </div>
            <button 
              onClick={generateToken}
              className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all group"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Novo Token</span>
            </button>
          </div>

          <div className="space-y-6">
            {data.integracoes.map((item) => (
              <div key={item.nome} className="relative group/card">
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                      <Globe className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Latência: {item.latencia}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setShowLatencyFor(showLatencyFor === item.nome ? null : item.nome)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        Ver Detalhes
                      </button>
                    </div>
                    <button
                      onClick={() => handleRetry(item.nome)}
                      disabled={retryingIds.includes(item.nome)}
                      className={cn(
                        "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all group/retry",
                        retryingIds.includes(item.nome) && "opacity-50 cursor-not-allowed"
                      )}
                      title="Reenviar Payload"
                    >
                      <RotateCcw className={cn(
                        "w-3.5 h-3.5",
                        retryingIds.includes(item.nome) ? "animate-spin" : "group-hover/retry:rotate-180 transition-transform duration-500"
                      )} />
                    </button>
                    <div className="text-right">
                      <StatusBadge status={item.status} />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{item.ultima_chamada}</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showLatencyFor === item.nome && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 z-20 w-64 bg-slate-900 dark:bg-white p-5 rounded-2xl shadow-2xl border border-white/10 dark:border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10 dark:border-slate-100">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <LatencyIcon className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Histórico 24h</span>
                        </div>
                        <button onClick={() => setShowLatencyFor(null)} className="text-slate-500 hover:text-white dark:hover:text-slate-900"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="h-24 flex items-end gap-1 px-1">
                        {[45, 60, 30, 80, 45, 90, 40, 55, 75, 45, 65, 35].map((h, i) => (
                          <div key={i} className="flex-1 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-t-sm relative group/bar">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-t-sm"
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-800 dark:bg-slate-200 text-[8px] rounded opacity-0 group-hover/bar:opacity-100 transition-opacity text-white dark:text-slate-900 pointer-events-none">
                              {h*3}ms
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-4 text-center">Latência média: 142ms</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-slate-900 dark:bg-white rounded-2xl text-white dark:text-slate-900 shadow-xl shadow-slate-900/20 dark:shadow-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Secret Access Token</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white/5 dark:bg-slate-900/5 p-4 rounded-xl font-mono text-xs border border-white/10 dark:border-slate-200">
              <span className="opacity-80">{secretToken}</span>
              <button className="text-emerald-400 dark:text-emerald-600 hover:text-emerald-300 dark:hover:text-emerald-500 font-bold uppercase text-[9px] tracking-widest">Copiar</button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-3">
              <h3 className="text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest">Atividade em Tempo Real</h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <motion.div 
                  animate={{ opacity: isLive ? [0.4, 1, 0.4] : 0.4 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
                />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="flex flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="FILTRAR VENDAS..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-[9px] font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:text-white transition-all uppercase"
              />
            </div>

            <button 
              onClick={() => setIsLive(!isLive)}
              className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors whitespace-nowrap"
            >
              {isLive ? 'Pausar Simulação' : 'Retomar Simulação'}
            </button>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredLiveSales.map((venda) => (
                <motion.div 
                  key={venda.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-center justify-between p-6 border border-slate-50 dark:border-slate-800/50 rounded-2xl hover:border-slate-100 dark:hover:border-slate-700 transition-all group overflow-hidden"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all">
                      {venda.cliente.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{venda.cliente}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{venda.produto}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">R$ {venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{venda.data}</span>
                      <StatusBadge status={venda.status} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-12 p-8 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
            <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-emerald-900 dark:text-emerald-400 font-bold text-sm mb-1 tracking-tight">Sua operação está saudável</h4>
            <p className="text-emerald-600 dark:text-emerald-500/70 text-xs font-bold uppercase tracking-widest">Nenhuma queda de webhook detectada nas últimas 48h.</p>
          </div>
        </div>
      </motion.section>
    </DashboardLayout>
  );
}

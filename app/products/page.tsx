'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer,
  YAxis,
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit2,
  Package,
  Download,
  Search,
  Check,
  X,
  AlertCircle,
  Copy,
  RotateCcw,
  ChevronDown,
  Terminal,
  Settings,
  Link as LinkIcon,
  Filter,
  Pause,
  Play,
  MoreVertical,
  Eye,
  WifiOff,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Toast } from '@/components/Toast';
import { ProductAPI, Product, WebhookConfig } from '@/lib/api';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { io } from 'socket.io-client';

export default function ProductsPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [hoveredRowId, setExpandedHoverId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [metadataSearch, setMetadataSearch] = useState('');

  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAll, setExpandedAll] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [latencyAlerts, setLatencyAlerts] = useState<Record<string, boolean>>({});
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [webhookProvider, setWebhookProvider] = useState<Record<string, 'mercadopago' | 'stripe' | 'pagbank'>>({});
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null);
  const [latencyData, setLatencyData] = useState<Record<string, { val: number }[]>>({});
  const [lastTestSuccess, setLastTestSuccess] = useState<Record<string, boolean>>({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Record<string, number>>({});
  const [historyModalId, setHistoryModalId] = useState<string | null>(null);
  const [webhookStats, setWebhookStats] = useState<Record<string, any[]>>({});
  const [transactionStream, setTransactionStream] = useState<Record<string, any[]>>({});

  const loadProducts = useCallback(async () => {
    try {
      const data = await ProductAPI.getProducts();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products", e);
    }
  }, []);

  const handleCopyConfigs = useCallback((product: any) => {
    const config = {
      id: product.id,
      name: product.name,
      type: product.type,
      public_key: `pk_live_ner_${product.id.repeat(4)}`,
      webhooks: ['success', 'pending', 'refund'].map(e => `payment.${e}`),
      api_version: 'v2026.04'
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setToastMsg('Configurações copiadas como JSON!');
    setShowToast(true);
  }, []);

  const handleStartEdit = (product: any) => {
    setEditingId(product.id);
    setTempPrice(product.price.toString());
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempPrice('');
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    const newPrice = parseFloat(tempPrice);
    
    // Robust Validation
    if (isNaN(newPrice) || newPrice < 0) {
      setError(newPrice < 0 ? "O preço deve ser positivo" : "Valor inválido");
      // Trigger temporary extra shake on input if already in error state
      return;
    }

    setIsSaving(id);

    try {
      const product = products.find(p => p.id === id);
      if (product) {
        setLastPriceUpdate(prev => ({ ...prev, [id]: product.price }));
      }
      
      await ProductAPI.updateProduct(id, { price: newPrice });
      await loadProducts();
      
      setIsSaving(null);
      setEditingId(null);
      setTempPrice('');
      setError(null);
      setToastMsg('Preço atualizado com sucesso!');
      setShowToast(true);
    } catch (e) {
      setError("Erro ao salvar produto");
      setIsSaving(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAll(false);
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);
    setMetadataSearch('');

    if (isExpanding && !latencyData[id]) {
      // Generate mock 60-min multi-region latency data
      const regions = ['US-East', 'EU-West', 'SA-East'];
      const data = Array.from({ length: 20 }, (_, i) => ({
        time: `${i * 3}m`,
        'US-East': 80 + Math.random() * 30 + Math.sin(i / 2) * 15,
        'EU-West': 120 + Math.random() * 40 + Math.cos(i / 3) * 20,
        'SA-East': 180 + Math.random() * 60 + Math.sin(i / 1.5) * 25,
      }));
      setLatencyData(prev => ({ ...prev, [id]: data as any }));

      // Generate mock webhook stats
      const stats = [
        { code: '200', count: Math.floor(Math.random() * 100) + 400, color: '#10b981' },
        { code: '400', count: Math.floor(Math.random() * 50) + 10, color: '#f59e0b' },
        { code: '500', count: Math.floor(Math.random() * 20) + 5, color: '#f43f5e' },
      ];
      setWebhookStats(prev => ({ ...prev, [id]: stats }));

      // Generate mock transaction stream
      const stream = [
        { id: 'tx_1', type: 'payment_success', amount: 297.00, time: '2 min ago', status: 'success' },
        { id: 'tx_2', type: 'payment_pending', amount: 150.00, time: '15 min ago', status: 'pending' },
        { id: 'tx_3', type: 'refund_requested', amount: 47.00, time: '1 hour ago', status: 'alert' },
        { id: 'tx_4', type: 'payment_success', amount: 297.00, time: '3 hours ago', status: 'success' },
        { id: 'tx_5', type: 'subscription_created', amount: 99.00, time: '5 hours ago', status: 'success' },
      ];
      setTransactionStream(prev => ({ ...prev, [id]: stream }));
    }
  };

  const handleTestWebhook = async (id: string) => {
    const url = webhookUrls[id];
    const provider = webhookProvider[id] || 'mercadopago';

    if (!url || !url.startsWith('https')) {
      setToastMsg('URL de webhook inválida! (Deve iniciar com https://)');
      setShowToast(true);
      return;
    }

    setIsTestingWebhook(id);
    try {
      // 1. Register Webhook in API
      await ProductAPI.registerWebhook(id, {
        url,
        provider,
        events: ['payment.succeeded', 'payment.failed']
      });

      // 2. Validate Protocol
      const isValid = await ProductAPI.validateWebhook(id, provider);
      
      if (isValid) {
        setLastTestSuccess(prev => ({ ...prev, [id]: true }));
        setToastMsg(`Webhook ${provider.toUpperCase()} validado e registrado!`);
      } else {
        setToastMsg('Erro na validação do protocolo SSL/TLS');
      }
      setShowToast(true);
    } catch (e) {
      setToastMsg('Erro ao registrar webhook');
      setShowToast(true);
    } finally {
      setIsTestingWebhook(null);
    }

    // Reset success badge after 10s
    setTimeout(() => {
      setLastTestSuccess(prev => ({ ...prev, [id]: false }));
    }, 10000);
  };

  const handleUndoPrice = async (id: string) => {
    const prevPrice = lastPriceUpdate[id];
    if (prevPrice === undefined) {
      setToastMsg('Nenhuma alteração anterior encontrada.');
      setShowToast(true);
      return;
    }

    setIsSaving(id);
    try {
      await ProductAPI.updateProduct(id, { price: prevPrice });
      await loadProducts();
      setLastPriceUpdate(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setIsSaving(null);
      setToastMsg('Alteração desfeita com sucesso!');
      setShowToast(true);
    } catch (e) {
      setToastMsg('Erro ao desfazer alteração.');
      setShowToast(true);
      setIsSaving(null);
    }
  };

  const handleDuplicate = async (product: any) => {
    setLoadingId(product.id);
    try {
      await ProductAPI.duplicateProduct(product.id);
      await loadProducts();
      setToastMsg('Produto duplicado no servidor!');
      setShowToast(true);
    } catch (e) {
      setToastMsg('Erro ao duplicar produto.');
      setShowToast(true);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      await ProductAPI.deleteProduct(id);
      await loadProducts();
      setDeleteConfirmationId(null);
      setToastMsg('Produto removido do sistema.');
      setShowToast(true);
    } catch (e) {
      setToastMsg('Erro ao remover produto.');
      setShowToast(true);
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (expandedId) {
      interval = setInterval(() => {
      setLatencyData(prev => {
        const current = prev[expandedId] || [];
        const newEntry = { 
          val: 120 + Math.random() * 600 + (Math.sin(Date.now() / 5000) * 20) 
        };
        const newData = [...current.slice(1), newEntry];

        // Alert logic: consecutive > 500ms for more than 3 reqs
        const recent = newData.slice(-4);
        const isAlert = recent.length >= 4 && recent.every(r => r.val > 500);
        setLatencyAlerts(prevAlerts => ({ ...prevAlerts, [expandedId]: isAlert }));

        return { ...prev, [expandedId]: newData };
      });
      }, 5000); // Update every 5s
    }
    return () => clearInterval(interval);
  }, [expandedId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut 'x' to expand all
      if (e.key.toLowerCase() === 'x' && !editingId && !metadataSearch) {
        setExpandedAll(prev => !prev);
      }

      // Shortcut 'c' to copy config if a row is expanded
      if (e.key.toLowerCase() === 'c' && expandedId && !editingId && !metadataSearch) {
        const product = products.find(p => p.id === expandedId);
        if (product) {
          handleCopyConfigs(product);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedId, products, editingId, metadataSearch, handleCopyConfigs]);

  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('activity', (data) => {
      console.log('Real-time activity received:', data);
      setToastMsg(`Nova atividade: ${data.provider} - ${data.type}`);
      setShowToast(true);

      // Update transaction stream if it matches an expanded product or just global
      // For simulation, we'll add it to the first product if none expanded, or all
      setTransactionStream(prev => {
        const next = { ...prev };
        const productId = data.data?.productId || '1'; // Default to ID '1' for demo
        const currentStream = next[productId] || [];
        const newEvent = {
          id: data.id,
          type: data.type,
          amount: data.data?.amount || 0,
          time: 'Just now',
          status: data.status === 'success' ? 'success' : 'alert'
        };
        next[productId] = [newEvent, ...currentStream.slice(0, 4)];
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, typeFilter]);

  const handleExportLogs = (id: string) => {
    const stream = transactionStream[id] || [];
    const stats = webhookStats[id] || [];
    const exportData = {
      productId: id,
      exportDate: new Date().toISOString(),
      transactionStream: stream,
      responseStats: stats,
      systemLogs: [
        { level: 'INFO', msg: 'System healthy', t: Date.now() - 100000 },
        { level: 'DEBUG', msg: 'Handshake successful', t: Date.now() - 50000 },
        { level: 'INFO', msg: 'Endpoint verified', t: Date.now() - 10000 }
      ]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg('Logs exportados com sucesso!');
    setShowToast(true);
  };

  const handleBulkPause = async () => {
    setIsBulkActionLoading(true);
    const updatedProducts: Product[] = products.map(p => 
      selectedIds.includes(p.id) ? { ...p, status: 'paused' } : p
    );
    await ProductAPI.saveProducts(updatedProducts);
    await loadProducts();
    setSelectedIds([]);
    setIsBulkActionLoading(false);
    setToastMsg(`${selectedIds.length} produtos pausados.`);
    setShowToast(true);
  };

  const handleBulkActivate = async () => {
    setIsBulkActionLoading(true);
    const updatedProducts: Product[] = products.map(p => 
      selectedIds.includes(p.id) ? { ...p, status: 'active' } : p
    );
    await ProductAPI.saveProducts(updatedProducts);
    await loadProducts();
    setSelectedIds([]);
    setIsBulkActionLoading(false);
    setToastMsg(`${selectedIds.length} produtos ativados.`);
    setShowToast(true);
  };

  const handleBatchTestWebhook = async () => {
    setIsBulkActionLoading(true);
    setToastMsg(`Iniciando teste em ${selectedIds.length} produtos...`);
    setShowToast(true);

    for (const id of selectedIds) {
      await handleTestWebhook(id);
    }
    
    setIsBulkActionLoading(false);
    setToastMsg(`Teste em lote concluído.`);
    setShowToast(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Produto', 'Tipo', 'Preço', 'Vendas', 'Status'];
    const rows = filteredProducts.map(p => [
      p.id,
      p.name,
      p.type,
      p.price.toFixed(2),
      p.sales,
      p.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const product_id_alias = (id: string) => {
    return btoa(id).substring(0, 8).toLowerCase();
  };

  if (!mounted) return null;

  const actions = (
    <>
      <PWAInstallButton />
      <button 
        onClick={downloadCSV}
        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm"
      >
        <Download className="w-4 h-4" />
        Exportar CSV
      </button>
      <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5">
        <Plus className="w-4 h-4" />
        Novo Produto
      </button>
    </>
  );

  return (
    <div className="min-h-screen">
      <Toast isVisible={showToast} message={toastMsg} onClose={() => setShowToast(false)} />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 w-10">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-4 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Produto</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Tipo</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Preço</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Vendas</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Tendência</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <motion.tr 
                    whileHover={{ scale: 1.01, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                    onClick={() => toggleExpand(product.id)}
                    onMouseEnter={(e) => {
                      setExpandedHoverId(product.id);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setExpandedHoverId(null)}
                    className={cn(
                      "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group relative z-10",
                      expandedId === product.id && "bg-slate-50/50 dark:bg-slate-800/30",
                      selectedIds.includes(product.id) && "bg-indigo-50/30 dark:bg-indigo-500/5"
                    )}
                  >
                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border",
                          expandedId === product.id 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 group-hover:border-slate-200 dark:group-hover:border-slate-600"
                        )}>
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight block">{product.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            ID: {product.id}
                            <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", expandedId === product.id && "rotate-180")} />
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{product.type}</span>
                    </td>
                      <td className="px-8 py-6 text-right" onClick={(e) => editingId === product.id && e.stopPropagation()}>
                        <AnimatePresence mode="wait">
                          {editingId === product.id ? (
                            <motion.div 
                              key="editing"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="flex flex-col items-end gap-1"
                            >
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                <motion.input
                                  type="number"
                                  step="0.01"
                                  value={tempPrice}
                                  animate={error ? { 
                                    x: [-2, 2, -2, 2, 0],
                                    boxShadow: [
                                      "0 0 0 0px rgba(244, 63, 94, 0)",
                                      "0 0 0 8px rgba(244, 63, 94, 0.2)",
                                      "0 0 0 0px rgba(244, 63, 94, 0)"
                                    ]
                                  } : {}}
                                  transition={error ? { 
                                    x: { duration: 0.4 },
                                    boxShadow: { repeat: Infinity, duration: 1.5 } 
                                  } : {}}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTempPrice(val);
                                    const num = parseFloat(val);
                                    if (isNaN(num) || num < 0) {
                                      setError(num < 0 ? "Preço negativo" : "Formato inválido");
                                    } else {
                                      setError(null);
                                    }
                                  }}
                                  className={cn(
                                    "w-32 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl pl-9 pr-8 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none transition-all text-right",
                                    error 
                                      ? "border-rose-500 ring-4 ring-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
                                      : "border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                  )}
                                  autoFocus
                                />
                                {error && (
                                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                )}
                              </div>
                              <AnimatePresence>
                                {error && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-rose-500 text-[8px] font-black uppercase tracking-widest mt-1 bg-rose-500/5 px-2 py-0.5 rounded-md"
                                  >
                                    {error}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ) : (
                            <motion.span 
                              key="static"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm font-bold text-slate-900 dark:text-white"
                            >
                              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </td>
                    <td className="px-8 py-6 text-right">
                      {(() => {
                        const trend = product.trend;
                        const variation = trend.length < 2 ? 0 : (((trend[trend.length - 1] - trend[0]) / trend[0]) * 100).toFixed(1);
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-mono font-medium">{product.sales}</span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              parseFloat(variation.toString()) >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
                            )}>
                              {parseFloat(variation.toString()) >= 0 ? '+' : ''}{variation}%
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="h-10 w-24 mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={product.trend.map((val, idx) => ({ val, idx }))}>
                            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                            <Line 
                              type="monotone" 
                              dataKey="val" 
                              stroke={product.trend[6] >= product.trend[0] ? "#10b981" : "#f43f5e"} 
                              strokeWidth={2} 
                              dot={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                        product.status === 'active' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      )}>
                        {product.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {editingId === product.id ? (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleSaveEdit(product.id)}
                                  disabled={isSaving === product.id}
                                  className={cn(
                                    "p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-all flex items-center justify-center",
                                    isSaving === product.id && "opacity-70 cursor-not-allowed"
                                  )}
                                  title="Salvar"
                                >
                                  {isSaving === product.id ? (
                                    <RotateCcw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button 
                                  onClick={handleCancelEdit}
                                  disabled={isSaving === product.id}
                                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              ) : (
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(activeDropdownId === product.id ? null : product.id);
                                  }}
                                  className={cn(
                                    "p-2 rounded-xl transition-all border",
                                    activeDropdownId === product.id 
                                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg" 
                                      : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                  )}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                  {activeDropdownId === product.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden p-1.5"
                                    >
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(product);
                                          setActiveDropdownId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group/item"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors" />
                                        Editar Preço
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicate(product);
                                          setActiveDropdownId(null);
                                        }}
                                        disabled={loadingId === product.id}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group/item disabled:opacity-50"
                                      >
                                        <Copy className={cn("w-3.5 h-3.5 group-hover/item:text-indigo-500 transition-colors", loadingId === product.id && "animate-spin")} />
                                        {loadingId === product.id ? 'Duplicando...' : 'Duplicar'}
                                      </button>
                                      {lastPriceUpdate[product.id] !== undefined && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUndoPrice(product.id);
                                            setActiveDropdownId(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors group/item"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 group-hover/item:rotate-[-45deg] transition-transform" />
                                          Desfazer Alteração
                                        </button>
                                      )}
                                      <Link 
                                        href="/checkout"
                                        onClick={() => setActiveDropdownId(null)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group/item"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors" />
                                        Ver Checkout
                                      </Link>
                                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5 mx-2" />
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmationId(product.id);
                                          setActiveDropdownId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors group/item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remover
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                      </div>
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {(expandedAll || expandedId === product.id) && (
                      <tr>
                    <td colSpan={8} className="px-8 py-0 border-none">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pb-8 pt-4">
                              <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                                      <Terminal className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Painel de Desenvolvedor</h4>
                                        <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">v2.4</span>
                                        { (product.webhookFrequency || Math.floor(Math.random() * 60)) > 50 && (
                                          <motion.div
                                            initial={{ opacity: 0.5 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.5 }}
                                            className="text-[9px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded"
                                          >
                                            Rate Limited
                                          </motion.div>
                                        )}
                                        { (product.consecutiveErrors || Math.floor(Math.random() * 5)) >= 3 && (
                                          <motion.div
                                            initial={{ opacity: 0.5 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.5 }}
                                            className="text-[9px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded"
                                          >
                                            Erro de Webhook
                                          </motion.div>
                                        )}
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configurações técnicas e chaves de acesso</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="relative group/search">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                                      <input 
                                        type="text"
                                        placeholder="BUSCAR EM METADADOS..."
                                        value={metadataSearch}
                                        onChange={(e) => setMetadataSearch(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-[9px] font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all w-64 uppercase"
                                      />
                                      {metadataSearch && (
                                        <button 
                                          onClick={() => setMetadataSearch('')}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => handleCopyConfigs(product)}
                                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                    >
                                      <Copy className="w-3 h-3" />
                                      Copiar Configurações
                                    </button>
                                    <button 
                                      onClick={() => handleTestWebhook(product.id)}
                                      disabled={isTestingWebhook === product.id}
                                      className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm",
                                        lastTestSuccess[product.id] 
                                          ? "bg-emerald-500 text-white" 
                                          : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                      )}
                                    >
                                      {isTestingWebhook === product.id ? (
                                        <RotateCcw className="w-3 h-3 animate-spin" />
                                      ) : lastTestSuccess[product.id] ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                      ) : (
                                        <WifiOff className="w-3 h-3" />
                                      )}
                                      {isTestingWebhook === product.id ? 'Testando...' : lastTestSuccess[product.id] ? 'Conectado' : 'Testar Webhook'}
                                    </button>
                                  </div>
                                </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Consumo de Cota API</span>
                                        <span>{(Math.random() * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-indigo-500 rounded-full" 
                                          style={{ width: `${Math.random() * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                            <span className="text-[8px] font-bold text-emerald-400">EU-West</span>
                                            <span className="text-[8px] font-bold text-amber-400">SA-East</span>
                                          </div>
                                        </div>
                                        <div className="h-28 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={latencyData[product.id] || []}>
                                              <defs>
                                                <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorEu" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorSa" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                </linearGradient>
                                              </defs>
                                              <XAxis dataKey="time" hide />
                                              <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                              />
                                              <Area type="monotone" dataKey="US-East" stroke="#6366f1" fillOpacity={1} fill="url(#colorUs)" />
                                              <Area type="monotone" dataKey="EU-West" stroke="#10b981" fillOpacity={1} fill="url(#colorEu)" />
                                              <Area type="monotone" dataKey="SA-East" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSa)" />
                                            </AreaChart>
                                          </ResponsiveContainer>
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Análise de picos geográficos ativa</p>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportLogs(product.id);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                          >
                                            <Download className="w-3 h-3" />
                                            Exportar Logs
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}

                                    {(!metadataSearch || 'webhook'.toLowerCase().includes(metadataSearch.toLowerCase()) || 'status'.toLowerCase().includes(metadataSearch.toLowerCase()) || 'resposta'.toLowerCase().includes(metadataSearch.toLowerCase())) && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <BarChart className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Response Codes (30d)</span>
                                          </div>
                                          <div className="flex gap-2">
                                            {['200', '400', '500'].map(code => (
                                              <div key={code} className="flex items-center gap-1">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", code === '200' ? "bg-emerald-500" : code === '400' ? "bg-amber-500" : "bg-rose-500")} />
                                                <span className="text-[8px] font-bold text-slate-400">{code}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="h-24 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={webhookStats[product.id] || []}>
                                              <XAxis dataKey="code" hide />
                                              <Tooltip 
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                content={({ active, payload }) => {
                                                  if (active && payload && payload.length) {
                                                    return (
                                                      <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg shadow-xl">
                                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">{payload[0].payload.code}: {payload[0].value} calls</p>
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                }}
                                              />
                                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {(webhookStats[product.id] || []).map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                              </Bar>
                                            </BarChart>
                                          </ResponsiveContainer>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center italic">Taxa de sucesso: 98.2%</p>
                                      </motion.div>
                                    )}

                                    {(!metadataSearch || 'webhook'.toLowerCase().includes(metadataSearch.toLowerCase()) || 'endpoint'.toLowerCase().includes(metadataSearch.toLowerCase()) || 'url'.toLowerCase().includes(metadataSearch.toLowerCase())) && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <LinkIcon className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Endpoint de Notificação</span>
                                          </div>
                                          {lastTestSuccess[product.id] && (
                                            <motion.div 
                                              initial={{ scale: 0 }} 
                                              animate={{ scale: 1 }} 
                                              className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20"
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
                                            </motion.div>
                                          )}
                                        </div>
                                        <div className="space-y-3">
                                          <div className="flex gap-2">
                                            {(['mercadopago', 'stripe', 'pagbank'] as const).map(p => (
                                              <button
                                                key={p}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setWebhookProvider(prev => ({ ...prev, [product.id]: p }));
                                                }}
                                                className={cn(
                                                  "px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest border transition-all",
                                                  (webhookProvider[product.id] || 'mercadopago') === p
                                                    ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300"
                                                )}
                                              >
                                                {p}
                                              </button>
                                            ))}
                                          </div>
                                          <input 
                                            type="text"
                                            placeholder="https://suaapi.com/webhook"
                                            value={webhookUrls[product.id] || ''}
                                            onChange={(e) => setWebhookUrls(prev => ({ ...prev, [product.id]: e.target.value }))}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                                          />
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTestWebhook(product.id);
                                            }}
                                            disabled={isTestingWebhook === product.id}
                                            className={cn(
                                              "w-full flex items-center justify-center gap-2 py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                              lastTestSuccess[product.id] 
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-lg shadow-slate-900/10"
                                            )}
                                          >
                                            {isTestingWebhook === product.id ? (
                                              <>
                                                <RotateCcw className="w-3 h-3 animate-spin" />
                                                Validando Protocolo...
                                              </>
                                            ) : lastTestSuccess[product.id] ? (
                                              <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Conexão Validada
                                              </>
                                            ) : (
                                              <>
                                                <Terminal className="w-3 h-3" />
                                                Testar Conexão
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}

                                    {(!metadataSearch || ['transação', 'stream', 'eventos', 'recentes', 'transaction', 'live'].some(k => k.includes(metadataSearch.toLowerCase()))) && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group/stream">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <Play className="w-4 h-4 group-hover/stream:text-indigo-500 transition-colors" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Live Transaction Stream</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                                          </div>
                                        </div>
                                        <div className="space-y-2.5">
                                          {(transactionStream[product.id] || []).map((tx) => (
                                            <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group/tx hover:border-indigo-500/30 hover:bg-indigo-50/5 transition-all">
                                              <div className="flex items-center gap-3">
                                                <div className={cn(
                                                  "w-2 h-2 rounded-full",
                                                  tx.status === 'success' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : tx.status === 'pending' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                                )} />
                                                <div>
                                                  <p className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{tx.type.replace('_', ' ')}</p>
                                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    {tx.time}
                                                    <span className="opacity-30">•</span>
                                                    ID: {tx.id.substring(3)}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white">R$ {tx.amount.toFixed(2)}</span>
                                                <div className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">BRL</div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <button 
                                          onClick={() => setHistoryModalId(product.id)}
                                          className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:border-indigo-500/30 hover:bg-indigo-50/10 transition-all"
                                        >
                                          Ver Atividade Completa
                                        </button>
                                      </motion.div>
                                    )}

                                    {(!metadataSearch || ['public key', 'api', 'configuração', 'chaves'].some(k => k.includes(metadataSearch.toLowerCase()))) && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                          <Settings className="w-4 h-4" />
                                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Configuração de API</span>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Key</p>
                                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                                            <span className="opacity-60">pk_live_ner_{product.id.repeat(4)}</span>
                                            <button 
                                              onClick={() => {
                                                navigator.clipboard.writeText(`pk_live_ner_${product.id.repeat(4)}`);
                                                setToastMsg('Chave pública copiada!');
                                                setShowToast(true);
                                              }}
                                              className="text-indigo-500 hover:text-indigo-600 font-bold uppercase text-[9px] tracking-widest"
                                            >
                                              Copiar
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}

                                    {(!metadataSearch || ['metadados', 'custom', 'customizados', 'tags', 'metadata'].some(k => k.includes(metadataSearch.toLowerCase()))) && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                          <Filter className="w-4 h-4" />
                                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Metadados Customizados</span>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex flex-wrap gap-2">
                                            {[
                                              { k: 'env', v: 'production' },
                                              { k: 'region', v: 'sa-east-1' },
                                              { k: 'tier', v: 'platinum' },
                                              { k: 'auto_refund', v: 'true' }
                                            ].map((meta, i) => (
                                              <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{meta.k}:</span>
                                                <span className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{meta.v}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-900 dark:text-white font-bold text-sm">Nenhum produto encontrado</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-widest">Tente outro termo de busca ou limpe o filtro</p>
                      </div>
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest underline underline-offset-4"
                        >
                          Limpar busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {historyModalId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0c0c0c] w-full max-w-4xl h-[600px] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-mono"
            >
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#1a1a1a] border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Terminal className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Debug Console – Product ID: {historyModalId}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryModalId(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Terminal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {[...Array(15)].map((_, i) => {
                  const date = new Date(Date.now() - i * 1000 * 60 * 15).toISOString();
                  const status = i % 5 === 0 ? 500 : i % 8 === 0 ? 400 : 200;
                  const latency = Math.floor(Math.random() * 150) + 80;
                  
                  return (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group/log flex items-start gap-4 text-[11px] leading-relaxed"
                    >
                      <span className="text-slate-600 shrink-0">[{date.split('T')[1].split('.')[0]}]</span>
                      <span className={cn(
                        "font-black uppercase tracking-tighter w-12 shrink-0",
                        status === 200 ? "text-emerald-500" : status === 400 ? "text-amber-500" : "text-rose-500"
                      )}>
                        {status} OK
                      </span>
                      <span className="text-indigo-400 shrink-0">POST</span>
                      <span className="text-slate-300 flex-1 truncate">/api/v1/webhooks/p_{historyModalId.substring(0,6)}/events</span>
                      <span className="text-slate-600 group-hover/log:text-slate-400 transition-colors">{latency}ms</span>
                    </motion.div>
                  );
                })}
                <div className="pt-4 flex items-center gap-2 text-emerald-500 animate-pulse">
                  <span className="text-xs">❯</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest">Listening for new events...</span>
                </div>
              </div>

              {/* Terminal Footer */}
              <div className="px-6 py-4 bg-[#141414] border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gateway: Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stream: Active</span>
                  </div>
                </div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                  Buffer: 1024KB / Memory: 42MB
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl shadow-2xl border border-white/10 dark:border-slate-200 flex items-center gap-8 min-w-[500px]"
          >
            <div className="flex items-center gap-3 pr-8 border-r border-white/10 dark:border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black">
                {selectedIds.length}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Selecionados</span>
            </div>
            
            <div className="flex items-center gap-4 flex-1">
              <button 
                onClick={handleBulkPause}
                disabled={isBulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 dark:hover:bg-slate-50 rounded-xl transition-all group disabled:opacity-50"
              >
                <Pause className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{isBulkActionLoading ? 'Processando...' : 'Pausar'}</span>
              </button>
              <button 
                onClick={handleBulkActivate}
                disabled={isBulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 dark:hover:bg-slate-50 rounded-xl transition-all group disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{isBulkActionLoading ? 'Processando...' : 'Ativar'}</span>
              </button>
              <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 dark:hover:bg-slate-50 rounded-xl transition-all group"
              >
                <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Exportar</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 hover:bg-rose-500/10 rounded-xl transition-all group ml-auto"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Excluir</span>
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedIds([])}
              className="p-2 hover:bg-white/5 dark:hover:bg-slate-50 rounded-full transition-all"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </motion.div>
        )}

        {hoveredRowId && expandedId !== hoveredRowId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed', 
              left: mousePos.x + 20, 
              top: mousePos.y + 20,
              zIndex: 50
            }}
            className="pointer-events-none p-5 bg-slate-950/90 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-900 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 dark:border-slate-200 min-w-[240px]"
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/10 dark:border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Terminal className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Intel</span>
              </div>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-black uppercase tracking-widest">v2026.04</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Product ID</p>
                <p className="text-[11px] font-mono text-indigo-300 dark:text-indigo-600 font-bold">{hoveredRowId}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5 dark:border-slate-50">
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gateway</p>
                  <p className="text-[11px] font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    142ms
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stability</p>
                  <p className="text-[11px] font-bold text-emerald-400">99.9%</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 dark:border-slate-50">
              <p className="text-[8px] font-bold text-slate-400 italic">Pressione para expandir detalhes avançados</p>
            </div>
          </motion.div>
        )}

        {deleteConfirmationId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Remover Produto?</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Esta ação não pode ser desfeita. O produto será permanentemente removido da sua conta.</p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmationId(null)}
                    className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteConfirmationId)}
                    className="flex-1 py-3.5 px-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

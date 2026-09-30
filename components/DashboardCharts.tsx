'use client';

import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function SalesChart({ data, showPrediction = false }: { data: any[], showPrediction?: boolean }) {
  const chartData = React.useMemo(() => {
    if (!showPrediction) return data;
    return data.map(item => ({
      ...item,
      prediction: item.total * 1.224
    }));
  }, [data, showPrediction]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
        <XAxis 
          dataKey="data" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
          dy={15}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
          tickFormatter={(v) => `R$ ${v}`}
        />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: '#0F172A', color: '#fff' }}
          labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '4px' }}
          formatter={(v: any, name: string) => [
            `R$ ${v.toLocaleString('pt-BR')}`, 
            name === 'prediction' ? 'Previsto' : 'Atual'
          ]}
        />
        <Area 
          type="monotone" 
          dataKey="total" 
          stroke="#6366F1" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorTotal)" 
        />
        {showPrediction && (
          <Area 
            type="monotone" 
            dataKey="prediction" 
            stroke="#10B981" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorPrediction)" 
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
        <XAxis 
          dataKey="mes" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
        />
        <YAxis hide />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: '#0F172A', color: '#fff' }}
          labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}
        />
        <Line 
          type="monotone" 
          dataKey="crescimento" 
          stroke="#10B981" 
          strokeWidth={3} 
          dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
        <XAxis 
          dataKey="mes" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
          tickFormatter={(v) => `R$ ${v}`}
        />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: '#0F172A', color: '#fff' }}
          labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}
          formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']}
        />
        <Line 
          type="stepAfter" 
          dataKey="receita" 
          stroke="#6366F1" 
          strokeWidth={3} 
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899'];

export function RevenuePieChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px', backgroundColor: '#0F172A', color: '#fff' }}
          labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

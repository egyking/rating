
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationRecord, Inspector, Target } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { exportToExcel } from '../services/exportService';

interface ReportsViewProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ReportsView: React.FC<ReportsViewProps> = ({ userRole, userId }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [activeTab, setActiveTab] = useState<'targets' | 'compare' | 'items' | 'trends' | 'pivot'>('targets');

  const [filterDate, setFilterDate] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { fetchData(); }, [userRole, userId, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    let [rec, ins, tar] = await Promise.all([
      supabaseService.getRecords(),
      supabaseService.getInspectors(),
      supabaseService.getTargets()
    ]);

    rec = rec.filter(r => r.date >= filterDate.from && r.date <= filterDate.to);

    if (userRole === 'inspector') {
      rec = rec.filter(r => r.inspector_id === userId);
      ins = ins.filter(i => i.id === userId);
      tar = tar.filter(t => t.inspector_id === userId);
    }

    setRecords(rec);
    setInspectors(ins);
    setTargets(tar);
    setLoading(false);
  };

  // 1. المستهدفات مقابل الإنجاز
  const targetAchievementData = (userRole === 'admin' ? inspectors : inspectors.filter(i => i.id === userId)).map(ins => {
    const insRecs = records.filter(r => r.inspector_id === ins.id || r.inspector_name === ins.name);
    const actual = insRecs.reduce((sum, r) => sum + r.count, 0);
    const insTargets = targets.filter(t => t.inspector_id === ins.id);
    const targetVal = insTargets.reduce((sum, t) => sum + t.target_value, 0) || 0;
    const percent = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;
    return { name: ins.name, actual, target: targetVal, percent };
  }).filter(d => d.target > 0 || d.actual > 0);

  // 2. مقارنة أداء المفتشين
  const comparisonData = (userRole === 'admin' ? inspectors : inspectors.filter(i => i.id === userId)).map(ins => ({
    name: ins.name,
    units: records.filter(r => r.inspector_id === ins.id || r.inspector_name === ins.name).reduce((sum, r) => sum + r.count, 0),
    tasks: records.filter(r => r.inspector_id === ins.id || r.inspector_name === ins.name).length
  })).sort((a, b) => b.units - a.units).slice(0, 10);

  // 3. توزيع البنود
  const itemDistribution = Array.from(new Set(records.map(r => r.main_item))).map(name => ({
    name,
    value: records.filter(r => r.main_item === name).reduce((sum, r) => sum + r.count, 0)
  }));

  // 4. الاتجاهات الزمنية
  const dateMap = new Map();
  records.forEach(r => {
    dateMap.set(r.date, (dateMap.get(r.date) || 0) + r.count);
  });
  const trendData = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date: date.split('-').slice(1).join('/'), count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 5. مصفوفة المحوري
  const uniqueSubItems = Array.from(new Set(records.map(r => r.sub_item))).sort();
  const pivotData = (userRole === 'admin' ? inspectors : inspectors.filter(i => i.id === userId)).map(ins => {
    const row: any = { name: ins.name, total: 0 };
    uniqueSubItems.forEach(item => {
      const count = records.filter(r => (r.inspector_id === ins.id || r.inspector_name === ins.name) && r.sub_item === item).reduce((sum, r) => sum + r.count, 0);
      row[item] = count;
      row.total += count;
    });
    return row;
  }).filter(r => r.total > 0);

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header & Export Controls */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <i className="fas fa-file-chart-column"></i>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">استخراج التقارير التحليلية</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تحليل الأداء والمستهدفات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-gray-100 p-1 rounded-xl text-[10px] font-black">
              <input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} className="bg-transparent border-none focus:ring-0 p-1" />
              <span className="flex items-center text-gray-400 mx-1">إلى</span>
              <input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} className="bg-transparent border-none focus:ring-0 p-1" />
           </div>
           <button onClick={() => exportToExcel(records)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2">
             <i className="fas fa-file-excel"></i> Excel
           </button>
           <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 flex items-center gap-2">
             <i className="fas fa-file-pdf"></i> PDF
           </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap gap-2 no-print">
        <TabButton active={activeTab === 'targets'} onClick={() => setActiveTab('targets')} icon="fa-bullseye" label="المستهدفات مقابل الإنجاز" />
        <TabButton active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} icon="fa-users-viewfinder" label="الأداء المقارن" />
        <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon="fa-chart-pie" label="توزيع البنود" />
        <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon="fa-chart-line" label="الاتجاهات الزمنية" />
        <TabButton active={activeTab === 'pivot'} onClick={() => setActiveTab('pivot')} icon="fa-table" label="المصفوفة التفصيلية" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* REPORT 1: Targets vs Achievement */}
        {activeTab === 'targets' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-md font-black text-slate-800 mb-8 flex items-center gap-2"><i className="fas fa-bullseye text-red-500"></i> المستهدفات مقابل الإنجاز الفعلي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {targetAchievementData.map((item, idx) => (
                <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${item.percent >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                      {item.percent}%
                    </span>
                    <div className="text-right">
                      <p className="font-black text-slate-800 text-sm">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">الهدف: {item.target}</p>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${item.percent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500">
                    <span>المنجز: {item.actual}</span>
                    <span>المتبقي: {Math.max(0, item.target - item.actual)}</span>
                  </div>
                </div>
              ))}
              {targetAchievementData.length === 0 && <div className="col-span-full p-20 text-center text-gray-400 font-bold">لا توجد بيانات مستهدفات لهذه الفترة</div>}
            </div>
          </div>
        )}

        {/* REPORT 2: Comparative Performance */}
        {activeTab === 'compare' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-md font-black text-slate-800 mb-8 flex items-center gap-2"><i className="fas fa-users-viewfinder text-blue-600"></i> مقارنة الأداء بين المفتشين</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical" margin={{left: 40}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} width={120} orientation="right" />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="units" name="الوحدات" fill="#3b82f6" radius={[10, 0, 0, 10]} barSize={20} />
                  <Bar dataKey="tasks" name="العمليات" fill="#10b981" radius={[10, 0, 0, 10]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* REPORT 3: Item Distribution */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-md font-black text-slate-800 mb-8 text-right">📂 توزيع البنود والأقسام</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={itemDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {itemDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 overflow-y-auto max-h-[400px]">
               <h3 className="text-sm font-black text-slate-800 mb-6 text-right">تحليل الأوزان النسبية</h3>
               <div className="space-y-4">
                  {itemDistribution.sort((a,b) => b.value - a.value).map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                       <span className="font-black text-blue-600">{item.value}</span>
                       <span className="font-bold text-xs">{item.name}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* REPORT 4: Temporal Trends */}
        {activeTab === 'trends' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-md font-black text-slate-800 mb-8 flex items-center gap-2"><i className="fas fa-chart-line text-orange-500"></i> الاتجاهات الزمنية للأداء</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTrends" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="الإنجاز اليومي" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTrends)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* REPORT 5: Pivot matrix */}
        {activeTab === 'pivot' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-gray-100">
               <h3 className="text-sm font-black text-slate-800 text-right">مصفوفة الإنجاز التفصيلية</h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-right min-w-[1200px]">
                 <thead>
                   <tr className="bg-slate-800 text-white text-[10px] font-black">
                     <th className="p-4 sticky right-0 bg-slate-800 z-10 border-l border-slate-700">المفتش</th>
                     {uniqueSubItems.map((item, idx) => <th key={idx} className="p-4 text-center border-l border-slate-700">{item}</th>)}
                     <th className="p-4 bg-blue-700 text-center sticky left-0 z-10">الإجمالي</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {pivotData.map((row, i) => (
                     <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                       <td className="p-4 font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 text-xs">{row.name}</td>
                       {uniqueSubItems.map((item, idx) => (
                         <td key={idx} className={`p-4 text-center text-xs ${row[item] > 0 ? 'font-bold text-slate-800 bg-blue-50/10' : 'text-gray-200'}`}>{row[item] || '-'}</td>
                       ))}
                       <td className="p-4 font-black text-blue-600 text-center bg-blue-50 sticky left-0 z-10 border-r border-blue-100">{row.total}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100'}`}
  >
    <i className={`fas ${icon}`}></i> {label}
  </button>
);

export default ReportsView;

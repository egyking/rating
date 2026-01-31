
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
  const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'compare' | 'items' | 'trends' | 'pivot'>('overview');

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

    // تطبيق فلترة التاريخ
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

  // --- معالجة البيانات للتقارير ---

  // 1. تقرير المستهدفات
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

  // 5. الجدول المحوري (Pivot Matrix)
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

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: 'fa-house' },
    { id: 'targets', label: 'المستهدفات', icon: 'fa-bullseye' },
    { id: 'compare', label: 'المقارنة', icon: 'fa-users-viewfinder' },
    { id: 'items', label: 'توزيع البنود', icon: 'fa-chart-pie' },
    { id: 'trends', label: 'الاتجاهات', icon: 'fa-chart-line' },
    { id: 'pivot', label: 'التقرير المحوري', icon: 'fa-table' },
  ];

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-6 items-center justify-between no-print">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-analytics text-xl"></i>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800">مركز التحليلات والتقارير</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">إحصائيات الأداء الميداني والمكتبي</p>
           </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 text-white p-2 rounded-2xl text-[10px] font-black">
             <input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} className="bg-transparent border-none focus:ring-0 p-0 text-right" />
             <i className="fas fa-calendar-alt text-blue-400"></i>
             <input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} className="bg-transparent border-none focus:ring-0 p-0 text-right" />
          </div>
          <button onClick={() => exportToExcel(records)} className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-200 transition-colors" title="تصدير Excel">
            <i className="fas fa-file-excel"></i>
          </button>
          <button onClick={() => window.print()} className="bg-blue-100 text-blue-700 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-200 transition-colors" title="حفظ PDF / طباعة">
            <i className="fas fa-print"></i>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="إجمالي الوحدات" value={records.reduce((s, r) => s + r.count, 0)} icon="fa-box-check" color="blue" />
            <StatsCard title="عدد العمليات" value={records.length} icon="fa-clipboard-list" color="emerald" />
            <StatsCard title="المفتشين النشطين" value={new Set(records.map(r => r.inspector_id)).size} icon="fa-users" color="purple" />
            <StatsCard title="متوسط الإنجاز اليومي" value={Math.round(records.reduce((s, r) => s + r.count, 0) / (trendData.length || 1))} icon="fa-bolt" color="orange" />
            
            <div className="lg:col-span-3 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 min-h-[400px]">
               <h3 className="text-sm font-black text-slate-800 mb-8 uppercase flex items-center gap-2 text-right">
                 <i className="fas fa-chart-line text-blue-600"></i> منحنى الإنتاجية العام
               </h3>
               <ResponsiveContainer width="100%" height={300}>
                 <AreaChart data={trendData}>
                   <defs>
                     <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                   <Tooltip />
                   <Area type="monotone" dataKey="count" name="إنجاز يومي" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>

            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl flex flex-col no-print">
               <h3 className="text-sm font-black mb-6 flex items-center gap-2"><i className="fas fa-medal text-yellow-400"></i> الأعلى إنجازاً</h3>
               <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  {comparisonData.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                      <span className="text-blue-400 font-black text-sm">{d.units}</span>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs font-bold">{d.name}</span>
                        <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* TAB: Targets */}
        {activeTab === 'targets' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2 text-right"><i className="fas fa-bullseye text-red-500"></i> حالة المستهدفات مقابل الإنجاز الفعلي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {targetAchievementData.map((item, idx) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${item.percent >= 100 ? 'bg-emerald-100 text-emerald-600' : item.percent >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                      {item.percent}%
                    </span>
                    <div className="text-right">
                      <h4 className="font-black text-slate-800 text-sm">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">الهدف: {item.target}</p>
                    </div>
                  </div>
                  <div className="relative h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 right-0 h-full transition-all duration-1000 ${item.percent >= 100 ? 'bg-emerald-500' : item.percent >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(item.percent, 100)}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 italic">
                    <span>المتبقي: {Math.max(0, item.target - item.actual)}</span>
                    <span>المنجز: {item.actual}</span>
                  </div>
                </div>
              ))}
              {targetAchievementData.length === 0 && (
                <div className="col-span-full p-20 text-center text-gray-400 font-bold italic">لا توجد بيانات مستهدفات لهذه الفترة</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Compare */}
        {activeTab === 'compare' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2 text-right"><i className="fas fa-balance-scale text-blue-600"></i> مقارنة أداء المفتشين (الوحدات مقابل العمليات)</h3>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical" margin={{left: 40}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} width={120} orientation="right" />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend verticalAlign="top" align="center" iconType="circle" />
                  <Bar dataKey="units" name="إجمالي الوحدات" fill="#3b82f6" radius={[10, 0, 0, 10]} barSize={20} />
                  <Bar dataKey="tasks" name="عدد العمليات" fill="#10b981" radius={[10, 0, 0, 10]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB: Items */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
               <h3 className="text-sm font-black text-slate-800 mb-8 text-right">📦 توزيع الوحدات حسب البند الرئيسي</h3>
               <div className="h-[350px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={itemDistribution} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                       {itemDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" align="center" />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
               <h3 className="text-sm font-black text-slate-800 mb-8 text-right">📊 قائمة الأوزان النسبية للبنود</h3>
               <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                  {itemDistribution.sort((a,b) => b.value - a.value).map((item, i) => {
                    const total = itemDistribution.reduce((s, r) => s + r.value, 0);
                    const weight = Math.round((item.value / total) * 100);
                    return (
                      <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className="text-left">
                            <p className="font-black text-blue-600 text-sm">{item.value}</p>
                            <p className="text-[9px] text-gray-400 font-bold">{weight}% من المجموع</p>
                         </div>
                         <div className="flex items-center gap-3 text-right">
                            <span className="font-bold text-xs">{item.name}</span>
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {/* TAB: Trends */}
        {activeTab === 'trends' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2 text-right"><i className="fas fa-history text-orange-500"></i> تحليل المسار الزمني ومعدل النمو</h3>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="إجمالي اليوم" stroke="#f59e0b" strokeWidth={4} dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB: Pivot */}
        {activeTab === 'pivot' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
               <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1 rounded-full">{uniqueSubItems.length} بند فرعي مدرج</span>
               <h3 className="text-lg font-black text-slate-800 italic text-right">مصفوفة الإنجاز التفصيلية (Pivot Table)</h3>
             </div>
             <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-right border-collapse min-w-[1200px]">
                 <thead>
                   <tr className="bg-slate-800 text-white text-[9px] font-black uppercase">
                     <th className="px-6 py-5 sticky right-0 bg-slate-800 z-10 border-l border-slate-700">المفتش</th>
                     {uniqueSubItems.map((item, idx) => (
                       <th key={idx} className="px-4 py-5 text-center border-l border-slate-700 min-w-[140px]">{item}</th>
                     ))}
                     <th className="px-6 py-5 bg-blue-700 text-center sticky left-0 z-10">الإجمالي</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {pivotData.map((row, i) => (
                     <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                       <td className="px-6 py-5 font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 shadow-sm text-xs">{row.name}</td>
                       {uniqueSubItems.map((item, idx) => (
                         <td key={idx} className={`px-4 py-5 text-center font-bold text-xs border-l border-gray-50 ${row[item] > 0 ? 'text-slate-800 bg-blue-50/10' : 'text-gray-200'}`}>
                           {row[item] || '-'}
                         </td>
                       ))}
                       <td className="px-6 py-5 font-black text-blue-600 text-center bg-blue-50 z-10 sticky left-0 border-r border-blue-100 shadow-sm text-sm">{row.total}</td>
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

const StatsCard = ({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 text-right justify-end">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">{title}</p>
        <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${colorMap[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
  );
};

export default ReportsView;

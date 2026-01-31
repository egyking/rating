
import React, { useState, useEffect, useMemo } from 'react';
import { supabaseService } from '../supabase';
import { reportAnalytics } from '../services/reportAnalytics';
import { exportToExcel, exportAnalyticsReport, printReport } from '../services/exportService';
import { EvaluationRecord, Inspector, Target } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

interface ReportsViewProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ReportsView: React.FC<ReportsViewProps> = ({ userRole, userId }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'individual' | 'team' | 'strategic'>('individual');
  
  // Data State
  const [allRecords, setAllRecords] = useState<EvaluationRecord[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  // Filter State
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>(userRole === 'inspector' ? userId : 'all');

  useEffect(() => {
    fetchData();
  }, [userRole, userId]);

  const fetchData = async () => {
    setLoading(true);
    const [rec, ins, tar] = await Promise.all([
      supabaseService.getRecords(),
      supabaseService.getInspectors(),
      supabaseService.getTargets()
    ]);
    setAllRecords(rec);
    setInspectors(ins);
    setTargets(tar);
    setLoading(false);
  };

  // --- Computed Analytics (Memoized) ---
  
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      const dateValid = r.date >= dateFrom && r.date <= dateTo;
      const inspectorValid = selectedInspectorId === 'all' || r.inspector_id === selectedInspectorId;
      return dateValid && inspectorValid;
    });
  }, [allRecords, dateFrom, dateTo, selectedInspectorId]);

  const kpis = useMemo(() => reportAnalytics.calculateGlobalKPIs(filteredRecords), [filteredRecords]);
  
  const inspectorPerformance = useMemo(() => 
    reportAnalytics.aggregateInspectorPerformance(filteredRecords, inspectors), 
  [filteredRecords, inspectors]);

  const categoryData = useMemo(() => reportAnalytics.getCategoryBreakdown(filteredRecords), [filteredRecords]);
  
  const trendData = useMemo(() => reportAnalytics.getTrendData(filteredRecords), [filteredRecords]);

  const targetAnalysis = useMemo(() => reportAnalytics.getTargetAnalysis(inspectorPerformance, targets), [inspectorPerformance, targets]);

  const handleExport = () => {
    exportToExcel(filteredRecords, `تقرير_تفصيلي_${dateFrom}_${dateTo}`);
  };

  const handleExportAnalytics = () => {
    exportAnalyticsReport(inspectorPerformance, categoryData, `تحليل_الأداء_${dateFrom}_${dateTo}`);
  };

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      
      {/* 1. Control Panel & Filters */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <i className="fas fa-chart-pie text-blue-600"></i> مركز التقارير والتحليلات
          </h2>
          <p className="text-[11px] text-gray-400 font-bold">تحليل الأداء المؤسسي والفردي</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
           {/* Date Range */}
           <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
             <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent border-none text-[11px] font-bold p-2 outline-none" />
             <span className="text-gray-400 mx-1"><i className="fas fa-arrow-left text-[10px]"></i></span>
             <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent border-none text-[11px] font-bold p-2 outline-none" />
           </div>

           {/* Inspector Filter (Admin Only) */}
           {userRole === 'admin' && (
             <select 
                value={selectedInspectorId} 
                onChange={e => setSelectedInspectorId(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-slate-700 text-[11px] font-bold rounded-xl p-2.5 outline-none min-w-[150px]"
             >
                <option value="all">جميع المفتشين</option>
                {inspectors.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
             </select>
           )}

           <div className="flex gap-2">
             <button onClick={handleExportAnalytics} className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all" title="تصدير التحليل"><i className="fas fa-file-powerpoint"></i></button>
             <button onClick={handleExport} className="w-9 h-9 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all" title="تصدير البيانات"><i className="fas fa-file-excel"></i></button>
             <button onClick={printReport} className="w-9 h-9 flex items-center justify-center bg-slate-700 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all" title="طباعة"><i className="fas fa-print"></i></button>
           </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit no-print overflow-x-auto">
        <TabButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} label={userRole === 'admin' ? 'تحليل تفصيلي' : 'أدائي الشخصي'} icon="fa-user-astronaut" />
        {userRole === 'admin' && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} label="مقارنة الفريق" icon="fa-users-viewfinder" />}
        {userRole === 'admin' && <TabButton active={activeTab === 'strategic'} onClick={() => setActiveTab('strategic')} label="التحليل الاستراتيجي" icon="fa-chess" />}
      </div>

      {/* 3. Global KPI Cards (Always Visible) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
            <div className={`absolute right-0 top-0 bottom-0 w-1.5 bg-${kpi.color}-500`}></div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${kpi.color}-50 text-${kpi.color}-500 text-xl group-hover:scale-110 transition-transform`}>
               <i className={`fas ${kpi.icon}`}></i>
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{kpi.label}</p>
               <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Content Views */}
      <div className="animate-in fade-in duration-500">
        
        {/* === INDIVIDUAL VIEW === */}
        {activeTab === 'individual' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart: Activity Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-chart-line text-blue-500"></i> النشاط الزمني</h3>
                   <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Donut Chart: Categories */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-chart-pie text-emerald-500"></i> توزيع الأعمال</h3>
                   <div className="h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                               {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                         </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-center">
                            <p className="text-2xl font-black text-slate-800">{categoryData.length}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">تصنيفات</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Recent Records Table */}
             <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                   <h3 className="text-sm font-black text-slate-800">سجل العمليات التفصيلي</h3>
                   <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{filteredRecords.length} عملية</span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase">
                         <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">المفتش</th>
                            <th className="px-6 py-3">البند</th>
                            <th className="px-6 py-3 text-center">العدد</th>
                            <th className="px-6 py-3 text-center">الحالة</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {filteredRecords.slice(0, 10).map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-3 text-[10px] font-bold text-gray-600">{r.date}</td>
                               <td className="px-6 py-3 text-[10px] font-bold text-gray-800">{r.inspector_name}</td>
                               <td className="px-6 py-3">
                                  <p className="text-[11px] font-black text-slate-700">{r.sub_item}</p>
                                  <p className="text-[8px] text-gray-400">{r.main_item}</p>
                               </td>
                               <td className="px-6 py-3 text-center">
                                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black">{r.count}</span>
                               </td>
                               <td className="px-6 py-3 text-center">
                                  {r.status === 'approved' 
                                     ? <span className="text-emerald-500 text-[10px] font-black"><i className="fas fa-check-circle"></i> معتمد</span> 
                                     : <span className="text-orange-400 text-[10px] font-black"><i className="fas fa-clock"></i> معلق</span>}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {/* === TEAM VIEW (ADMIN) === */}
        {activeTab === 'team' && userRole === 'admin' && (
          <div className="space-y-6">
             {/* Ranking Bar Chart */}
             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-ranking-star text-amber-500"></i> ترتيب الأداء (حسب النقاط)</h3>
                <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inspectorPerformance} layout="vertical" margin={{left: 40}}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" hide />
                         <YAxis dataKey="inspectorName" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} width={100} orientation="right" />
                         <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                         <Bar dataKey="score" fill="#3b82f6" radius={[10, 0, 0, 10]} barSize={24} name="نقاط الأداء" />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Detailed Performance Matrix */}
             <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-800 text-white text-[10px] font-black">
                         <tr>
                            <th className="p-4">المفتش</th>
                            <th className="p-4 text-center">النقاط</th>
                            <th className="p-4 text-center">إجمالي الحركات</th>
                            <th className="p-4 text-center">الوحدات</th>
                            <th className="p-4 text-center">نسبة الاعتماد</th>
                            <th className="p-4 text-center">مؤشر المخاطر</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {inspectorPerformance.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                               <td className="p-4 font-black text-xs text-slate-800">{p.inspectorName}</td>
                               <td className="p-4 text-center font-black text-blue-600">{p.score}</td>
                               <td className="p-4 text-center text-xs font-bold text-gray-600">{p.totalInspections}</td>
                               <td className="p-4 text-center text-xs font-bold text-gray-600">{p.totalItems}</td>
                               <td className="p-4 text-center">
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                     <div className={`h-full ${p.approvalRate > 80 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{width: `${p.approvalRate}%`}}></div>
                                  </div>
                                  <span className="text-[9px] text-gray-400 font-bold">{p.approvalRate}%</span>
                               </td>
                               <td className="p-4 text-center">
                                  {p.riskFactor === 'high' && <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[9px] font-black">عالي</span>}
                                  {p.riskFactor === 'medium' && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[9px] font-black">متوسط</span>}
                                  {p.riskFactor === 'low' && <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[9px] font-black">طبيعي</span>}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {/* === STRATEGIC VIEW (ADMIN) === */}
        {activeTab === 'strategic' && userRole === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Target Achievement Gauges */}
             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                <h3 className="text-sm font-black text-slate-800 mb-6"><i className="fas fa-bullseye text-red-500"></i> تحقيق المستهدفات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {targetAnalysis.length > 0 ? targetAnalysis.map((t, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                         <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-xs text-slate-700">{t.inspectorName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${t.status === 'achieved' ? 'bg-emerald-100 text-emerald-600' : (t.status === 'on-track' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}`}>
                               {t.status === 'achieved' ? 'مكتمل' : (t.status === 'on-track' ? 'جيد' : 'متأخر')}
                            </span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-1">
                            <div className={`h-full transition-all duration-1000 ${t.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${Math.min(t.progress, 100)}%`}}></div>
                         </div>
                         <div className="flex justify-between text-[9px] text-gray-500 font-bold">
                            <span>{t.totalItems} / {t.targetValue}</span>
                            <span>{t.progress}%</span>
                         </div>
                      </div>
                   )) : <p className="text-gray-400 text-xs font-bold text-center col-span-3 py-10">لم يتم تحديد مستهدفات لهذه الفترة</p>}
                </div>
             </div>

             {/* Department Composition Radar */}
             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
                <h3 className="text-sm font-black text-slate-800 mb-2 w-full text-right"><i className="fas fa-draw-polygon text-purple-500"></i> بصمة الأداء</h3>
                <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryData.slice(0, 6)}>
                         <PolarGrid stroke="#e2e8f0" />
                         <PolarAngleAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} />
                         <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                         <Radar name="النشاط" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                         <Tooltip />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Simple Insight Card */}
             <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-center">
                <h3 className="text-lg font-black mb-4"><i className="fas fa-lightbulb text-yellow-400"></i> رؤية تحليلية</h3>
                <ul className="space-y-4 text-sm font-bold text-gray-300">
                   <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-emerald-400">1</span>
                      <span>أعلى إنتاجية كانت يوم <span className="text-white font-black">{trendData.sort((a,b) => b.count - a.count)[0]?.date || '-'}</span>.</span>
                   </li>
                   <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-blue-400">2</span>
                      <span>البند الأكثر تكراراً هو <span className="text-white font-black">{categoryData[0]?.name || '-'}</span> بنسبة {categoryData[0]?.percentage || 0}%.</span>
                   </li>
                   <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-orange-400">3</span>
                      <span>متوسط معدل الاعتماد للفريق هو <span className="text-white font-black">{Math.round(inspectorPerformance.reduce((a,b) => a + b.approvalRate, 0) / (inspectorPerformance.length || 1))}%</span>.</span>
                   </li>
                </ul>
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
    className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 shrink-0 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-200'}`}
  >
    <i className={`fas ${icon}`}></i> {label}
  </button>
);

export default ReportsView;

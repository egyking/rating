
import React, { useState, useEffect, useMemo } from 'react';
import { supabaseService } from '../supabase';
import { reportAnalytics } from '../services/reportAnalytics';
import { exportToExcel, exportDeepReport, printReport } from '../services/exportService';
import { EvaluationRecord, Inspector, Target, AdvancedPerformanceMetric, ItemPerformance, ComparativeMatrixRow, KPIMetric } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';

interface ReportsViewProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const ReportsView: React.FC<ReportsViewProps> = ({ userRole, userId }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'matrix' | 'items' | 'risk'>('overview');
  
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

  // 0. General KPIs (Restored)
  const globalKPIs: KPIMetric[] = useMemo(() => {
     return reportAnalytics.calculateGlobalKPIs(filteredRecords);
  }, [filteredRecords]);

  // 1. Personal Deep Metric
  const personalMetric: AdvancedPerformanceMetric | null = useMemo(() => {
    const targetId = selectedInspectorId === 'all' ? userId : selectedInspectorId; 
    const inspector = inspectors.find(i => i.id === targetId);
    if (!inspector) return null;
    return reportAnalytics.generateInspectorPerformance(filteredRecords, inspector, targets, dateFrom, dateTo);
  }, [filteredRecords, inspectors, targets, dateFrom, dateTo, selectedInspectorId, userId]);

  // 2. Comparative Matrix (For Admins)
  const matrixData: ComparativeMatrixRow[] = useMemo(() => {
    if (userRole !== 'admin') return [];
    return reportAnalytics.generateComparativeMatrix(allRecords.filter(r => r.date >= dateFrom && r.date <= dateTo), inspectors, targets, dateFrom, dateTo);
  }, [allRecords, inspectors, targets, dateFrom, dateTo, userRole]);

  // 3. Item Analysis
  const itemAnalysis: ItemPerformance[] = useMemo(() => {
    return reportAnalytics.getItemPerformance(filteredRecords);
  }, [filteredRecords]);

  // 4. Trend Data
  const trendData = useMemo(() => reportAnalytics.getTrendData(filteredRecords), [filteredRecords]);

  // Handlers
  const handleExportRaw = () => exportToExcel(filteredRecords, `سجل_البيانات_${dateFrom}`);
  const handleExportDeep = () => exportDeepReport(matrixData, itemAnalysis, `التقرير_التحليلي_${dateFrom}`);

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      
      {/* --- Control Panel --- */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <i className="fas fa-chart-pie text-blue-600"></i> التقارير والتحليلات
          </h2>
          <p className="text-[11px] text-gray-400 font-bold">مركز البيانات الشامل</p>
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
                <option value="all">كل الفريق</option>
                {inspectors.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
             </select>
           )}

           <div className="flex gap-2">
             {userRole === 'admin' && <button onClick={handleExportDeep} className="w-9 h-9 flex items-center justify-center bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all" title="تصدير المصفوفة"><i className="fas fa-table-cells"></i></button>}
             <button onClick={handleExportRaw} className="w-9 h-9 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all" title="تصدير البيانات"><i className="fas fa-file-excel"></i></button>
             <button onClick={printReport} className="w-9 h-9 flex items-center justify-center bg-slate-700 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all" title="طباعة"><i className="fas fa-print"></i></button>
           </div>
        </div>
      </div>

      {/* --- Tabs --- */}
      <div className="flex gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit no-print overflow-x-auto">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="نظرة عامة" icon="fa-chart-simple" />
        <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} label="التقرير الفردي" icon="fa-user-chart" />
        {userRole === 'admin' && <TabButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} label="مصفوفة الفريق" icon="fa-table-columns" />}
        {userRole === 'admin' && <TabButton active={activeTab === 'risk'} onClick={() => setActiveTab('risk')} label="تحليل المخاطر" icon="fa-triangle-exclamation" />}
        <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} label="تحليل البنود" icon="fa-list-check" />
      </div>

      <div className="animate-in fade-in duration-500">
        
        {/* === 0. Overview / General Tab (Restored) === */}
        {activeTab === 'overview' && (
           <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {globalKPIs.map((kpi, idx) => (
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

              {/* Main Trend Chart */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-chart-line text-blue-500"></i> النشاط العام للفترة</h3>
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                              <defs>
                                  <linearGradient id="colorTrendOverview" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <Tooltip contentStyle={{borderRadius: '12px'}} />
                              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrendOverview)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
           </div>
        )}

        {/* === 1. Personal Deep Report === */}
        {activeTab === 'personal' && personalMetric && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-[2.5rem] shadow-xl md:col-span-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fas fa-award text-9xl"></i></div>
                    <div className="relative z-10">
                        <p className="text-blue-200 text-xs font-bold mb-1">الدرجة النهائية الموزونة</p>
                        <h2 className="text-5xl font-black mb-2">{personalMetric.weightedScore}<span className="text-xl opacity-60">/100</span></h2>
                        <div className={`inline-block px-3 py-1 rounded-lg text-xs font-black bg-white/20 backdrop-blur-sm`}>
                            التقدير: {personalMetric.scoreGrade === 'A' ? 'ممتاز' : personalMetric.scoreGrade === 'B' ? 'جيد جداً' : personalMetric.scoreGrade === 'C' ? 'جيد' : 'ضعيف'}
                        </div>
                        <div className="mt-6 text-[10px] text-blue-100 font-bold space-y-1">
                            <p>المعادلة: (المستهدف × 0.4) + (الالتزام × 0.3) + (الجودة × 0.3)</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <MetricCard title="تحقيق المستهدف" value={`${Math.round(personalMetric.targetAchievement)}%`} sub={`${personalMetric.totalUnits} / ${personalMetric.targetValue}`} icon="fa-bullseye" color="emerald" />
                    <MetricCard title="نسبة الالتزام" value={`${personalMetric.commitmentRate}%`} sub={`${personalMetric.daysActive} يوم من ${personalMetric.daysExpected}`} icon="fa-calendar-check" color="blue" />
                    <MetricCard title="جودة التسجيل" value={`${Math.round(personalMetric.approvalRate)}%`} sub={`${personalMetric.approvalRate < 60 ? 'يحتاج تحسين' : 'مقبول'}`} icon="fa-star" color={personalMetric.approvalRate < 60 ? 'orange' : 'purple'} />
                </div>
             </div>
          </div>
        )}

        {/* === 2. Comparative Matrix (Admin) === */}
        {activeTab === 'matrix' && userRole === 'admin' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800">مصفوفة الأداء المقارن</h3>
                <span className="text-xs text-gray-400 font-bold">ترتيب تنازلي حسب الدرجة الموزونة</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-right">
                   <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase">
                      <tr>
                         <th className="p-4">المفتش</th>
                         <th className="p-4 text-center text-blue-600">الدرجة النهائية</th>
                         <th className="p-4 text-center">تحقيق المستهدف</th>
                         <th className="p-4 text-center">الالتزام</th>
                         <th className="p-4 text-center">الجودة</th>
                         <th className="p-4 text-center">المعدل اليومي</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-xs font-bold text-slate-700">
                      {matrixData.map((row, idx) => (
                         <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">{idx+1}</span>
                                {row.inspectorName}
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-lg ${row.weightedScore >= 80 ? 'bg-emerald-100 text-emerald-700' : (row.weightedScore >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}`}>
                                    {row.weightedScore}
                                </span>
                            </td>
                            <td className="p-4 text-center">{row.targetAchieved}%</td>
                            <td className="p-4 text-center">{row.commitment}%</td>
                            <td className="p-4 text-center">{row.quality}%</td>
                            <td className="p-4 text-center">{row.dailyAvg}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* === 3. Risk Analysis === */}
        {activeTab === 'risk' && userRole === 'admin' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matrixData.filter(m => m.riskLevel !== 'low').map((m, idx) => (
                 <div key={idx} className="bg-white p-5 rounded-[2rem] border border-red-100 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 right-0 h-1.5 w-full ${m.riskLevel === 'critical' ? 'bg-red-600' : (m.riskLevel === 'high' ? 'bg-orange-500' : 'bg-yellow-400')}`}></div>
                    <div className="flex justify-between items-start mb-4 mt-2">
                       <div>
                          <h4 className="font-black text-slate-800">{m.inspectorName}</h4>
                          <p className={`text-[10px] font-bold uppercase mt-1 ${m.riskLevel === 'critical' ? 'text-red-600' : 'text-orange-500'}`}>
                             مستوى الخطورة: {m.riskLevel === 'critical' ? 'حرج جداً' : (m.riskLevel === 'high' ? 'عالي' : 'متوسط')}
                          </p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                          <i className="fas fa-user-injured"></i>
                       </div>
                    </div>
                    <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                       {m.commitment < 50 && <p className="flex items-center gap-2"><i className="fas fa-calendar-times text-red-400"></i> التزام منخفض ({m.commitment}%)</p>}
                       {m.targetAchieved < 50 && <p className="flex items-center gap-2"><i className="fas fa-chart-down text-red-400"></i> فشل في المستهدف ({m.targetAchieved}%)</p>}
                       {m.quality < 60 && <p className="flex items-center gap-2"><i className="fas fa-thumbs-down text-red-400"></i> جودة منخفضة ({m.quality}%)</p>}
                    </div>
                 </div>
              ))}
           </div>
        )}

        {/* === 4. Item Analysis === */}
        {activeTab === 'items' && (
           <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Top Items Chart */}
                 <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <h3 className="font-black text-slate-800 mb-6">أكثر البنود تسجيلاً</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={itemAnalysis.slice(0, 7)} layout="vertical" margin={{left: 20}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="subItem" type="category" width={120} tick={{fontSize: 9, fontWeight: 'bold'}} interval={0} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 10, 10, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Composition */}
                 <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <h3 className="font-black text-slate-800 mb-6">توزيع البنود</h3>
                    <div className="h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                       {itemAnalysis.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                             <div className="overflow-hidden">
                                <p className="font-bold text-[10px] text-slate-700 truncate w-32">{item.subItem}</p>
                                <p className="text-[8px] text-gray-400">{item.mainItem}</p>
                             </div>
                             <div className="text-left">
                                <span className="block font-black text-blue-600 text-xs">{item.count}</span>
                                <span className="block text-[8px] text-gray-400">{item.percentage}%</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
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
    className={`px-5 py-3 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 shrink-0 ${active ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-200'}`}
  >
    <i className={`fas ${icon}`}></i> {label}
  </button>
);

const MetricCard = ({ title, value, sub, icon, color }: any) => (
    <div className={`bg-${color}-50 p-4 rounded-2xl border border-${color}-100 flex items-center justify-between`}>
        <div>
            <p className={`text-${color}-600 text-[10px] font-black uppercase mb-1`}>{title}</p>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-[9px] text-gray-400 font-bold mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-${color}-500 shadow-sm`}>
            <i className={`fas ${icon}`}></i>
        </div>
    </div>
);

export default ReportsView;

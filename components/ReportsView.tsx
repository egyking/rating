
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationRecord, Target, Inspector } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ReportsViewProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportsView: React.FC<ReportsViewProps> = ({ userRole, userId }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filterDate, setFilterDate] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [userRole, userId, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    let [rec, tar, ins] = await Promise.all([
      supabaseService.getRecords(),
      supabaseService.getTargets(),
      supabaseService.getInspectors()
    ]);

    // فلترة السجلات حسب التاريخ
    rec = rec.filter(r => r.date >= filterDate.from && r.date <= filterDate.to);

    if (userRole === 'inspector') {
      rec = rec.filter(r => r.inspector_id === userId);
      tar = tar.filter(t => t.inspector_id === userId);
      ins = ins.filter(i => i.id === userId);
    }

    setRecords(rec);
    setTargets(tar);
    setInspectors(ins);
    setLoading(false);
  };

  // 1. حساب تقرير المستهدفات
  const targetReport = targets.map(t => {
    const achieved = records
      .filter(r => r.inspector_id === t.inspector_id && (t.main_item === 'جميع البنود' || r.main_item === t.main_item))
      .reduce((sum, r) => sum + r.count, 0);
    const percent = t.target_value > 0 ? Math.round((achieved / t.target_value) * 100) : 0;
    return { ...t, achieved, percent, gap: Math.max(0, t.target_value - achieved) };
  });

  // 2. توزيع البنود (Pie Chart Data)
  const itemDistribution = Array.from(new Set(records.map(r => r.main_item))).map(name => ({
    name,
    value: records.filter(r => r.main_item === name).reduce((sum, r) => sum + r.count, 0)
  })).sort((a, b) => b.value - a.value);

  // 3. أداء المفتشين (Bar Chart Data)
  const performanceReport = inspectors.map(ins => {
    const insRecords = records.filter(r => r.inspector_id === ins.id);
    return {
      name: ins.name,
      total: insRecords.reduce((sum, r) => sum + r.count, 0),
      count: insRecords.length,
      avg: insRecords.length > 0 ? (insRecords.reduce((sum, r) => sum + r.count, 0) / insRecords.length).toFixed(1) : 0
    };
  }).sort((a, b) => b.total - a.total);

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 no-print">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <i className="fas fa-chart-line text-blue-600"></i>
          {userRole === 'admin' ? 'مركز التقارير التحليلي' : 'تقرير الأداء الشخصي'}
        </h2>
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
          <span className="text-xs font-black text-gray-400 px-2">الفترة:</span>
          <input 
            type="date" 
            value={filterDate.from} 
            onChange={e => setFilterDate({...filterDate, from: e.target.value})}
            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0"
          />
          <i className="fas fa-arrow-left text-gray-300"></i>
          <input 
            type="date" 
            value={filterDate.to} 
            onChange={e => setFilterDate({...filterDate, to: e.target.value})}
            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0"
          />
        </div>
      </div>

      {/* Target Progress Section */}
      <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-3">
          <i className="fas fa-bullseye text-red-500"></i> تقرير تحقيق المستهدفات
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {targetReport.map(report => (
            <div key={report.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-800">{report.inspector_name}</h4>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{report.main_item}</p>
                </div>
                <div className="text-left">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${report.percent >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {report.percent}% محقق
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>المنجز: {report.achieved}</span>
                  <span>المستهدف: {report.target_value}</span>
                </div>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${report.percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min(report.percent, 100)}%` }} 
                  />
                </div>
                {report.gap > 0 && (
                  <p className="text-[10px] text-red-400 font-bold">⚠️ متبقي {report.gap} وحدات لتحقيق الهدف</p>
                )}
              </div>
            </div>
          ))}
          {targetReport.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed">
              <i className="fas fa-ghost text-4xl mb-4 opacity-20"></i>
              <p className="font-bold">لا توجد مستهدفات محددة لهذه الفترة</p>
            </div>
          )}
        </div>
      </section>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Item Distribution Chart */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 h-[500px]">
          <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-3">
            <i className="fas fa-chart-pie text-purple-500"></i> توزيع النشاط حسب البنود
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={itemDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {itemDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inspector Performance Chart */}
        {userRole === 'admin' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 h-[500px]">
            <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-3">
              <i className="fas fa-ranking-star text-amber-500"></i> مقارنة حجم الإنجاز بين المفتشين
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceReport} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} width={100} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Detail Data Table */}
      <section className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-800">بيانات التقييم التفصيلية</h3>
          <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black">{records.length} سجل</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">المفتش</th>
                <th className="px-8 py-4 text-center">المنجز</th>
                <th className="px-8 py-4">أكثر البنود تكراراً</th>
                <th className="px-8 py-4">متوسط الحركة</th>
                <th className="px-8 py-4">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {performanceReport.map((stat, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-4 font-bold text-gray-700">{stat.name}</td>
                  <td className="px-8 py-4 text-center font-black text-blue-600">{stat.total}</td>
                  <td className="px-8 py-4 text-xs text-gray-500">
                    {records.filter(r => r.inspector_name === stat.name)[0]?.sub_item || '-'}
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-emerald-600">{stat.avg} وحدة/حركة</td>
                  <td className="px-8 py-4 text-[10px] text-gray-400 font-bold">
                    {records.filter(r => r.inspector_name === stat.name).sort((a,b) => b.date.localeCompare(a.date))[0]?.date || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ReportsView;


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
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'aggregate'>('summary');

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

  // التقرير المجمع (Aggregate Report)
  const aggregateReport = inspectors.map(ins => {
    const insRecs = records.filter(r => r.inspector_id === ins.id);
    const itemBreakdown = Array.from(new Set(insRecs.map(r => r.sub_item))).map(item => ({
      item,
      count: insRecs.filter(r => r.sub_item === item).reduce((sum, r) => sum + r.count, 0)
    }));
    return {
      name: ins.name,
      total: insRecs.reduce((sum, r) => sum + r.count, 0),
      breakdown: itemBreakdown
    };
  }).sort((a, b) => b.total - a.total);

  // توزيع البنود للرسم البياني
  const itemDistribution = Array.from(new Set(records.map(r => r.main_item))).map(name => ({
    name,
    value: records.filter(r => r.main_item === name).reduce((sum, r) => sum + r.count, 0)
  })).sort((a, b) => b.value - a.value);

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Search/Filter Bar */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
           <i className="fas fa-analytics text-blue-600"></i> تحليلات الأداء
        </h2>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button onClick={() => setActiveReportTab('summary')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${activeReportTab === 'summary' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>نظرة عامة</button>
          <button onClick={() => setActiveReportTab('aggregate')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${activeReportTab === 'aggregate' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>التقرير المجمع</button>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 text-white p-2 rounded-2xl w-full md:w-auto">
           <input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} className="bg-transparent border-none text-[10px] font-black focus:ring-0" />
           <i className="fas fa-arrow-left text-blue-400"></i>
           <input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} className="bg-transparent border-none text-[10px] font-black focus:ring-0" />
        </div>
      </div>

      {activeReportTab === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
           {/* Chart 1 */}
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 h-[450px]">
              <h3 className="text-sm font-black text-slate-700 mb-6 uppercase tracking-widest">📊 توزيع الإنجاز حسب البند الرئيسي</h3>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={itemDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {itemDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
           </div>
           
           {/* Summary Stats Table */}
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
              <h3 className="text-sm font-black text-slate-700 mb-6 uppercase tracking-widest">🏆 ترتيب الإنجاز الكلي</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {aggregateReport.map((stat, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                       <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">{i+1}</span>
                       <p className="font-black text-slate-700 text-sm">{stat.name}</p>
                    </div>
                    <p className="text-lg font-black text-blue-600">{stat.total} <span className="text-[10px] text-gray-400">وحدة</span></p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      ) : (
        /* Aggregate Report (The Sheet Style) */
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-500">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
             <h3 className="text-lg font-black text-slate-800 italic">التقرير التجميعي المفصل (Sub-Items Analysis)</h3>
             <button onClick={() => window.print()} className="bg-white border-2 border-gray-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-50"><i className="fas fa-print ml-2"></i> طباعة</button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-right border-collapse">
               <thead>
                 <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest">
                   <th className="px-8 py-5 border-l border-slate-700">المفتش</th>
                   <th className="px-8 py-5 border-l border-slate-700">إجمالي الوحدات</th>
                   <th className="px-8 py-5">تفصيل البنود الفرعية</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {aggregateReport.map((row, i) => (
                   <tr key={i} className="hover:bg-blue-50/30">
                     <td className="px-8 py-5 font-black text-slate-700 border-l border-gray-50">{row.name}</td>
                     <td className="px-8 py-5 font-black text-blue-600 border-l border-gray-50 text-xl">{row.total}</td>
                     <td className="px-8 py-5">
                       <div className="flex flex-wrap gap-2">
                         {row.breakdown.map((b, idx) => (
                           <span key={idx} className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm">
                             <span className="text-slate-500">{b.item}:</span> <span className="text-blue-600 font-black">{b.count}</span>
                           </span>
                         ))}
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;

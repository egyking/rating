
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationRecord, Inspector } from '../types';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface ReportsViewProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportsView: React.FC<ReportsViewProps> = ({ userRole, userId }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'pivot'>('summary');

  const [filterDate, setFilterDate] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { fetchData(); }, [userRole, userId, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    let [rec, ins] = await Promise.all([
      supabaseService.getRecords(),
      supabaseService.getInspectors()
    ]);

    rec = rec.filter(r => r.date >= filterDate.from && r.date <= filterDate.to);

    if (userRole === 'inspector') {
      rec = rec.filter(r => r.inspector_id === userId);
      ins = ins.filter(i => i.id === userId);
    }

    setRecords(rec);
    setInspectors(ins);
    setLoading(false);
  };

  // 1. استخراج جميع البنود الفرعية الفريدة (أعمدة الجدول المحوري)
  const uniqueSubItems = Array.from(new Set(records.map(r => r.sub_item))).sort();

  // 2. بناء بيانات الـ Pivot Table
  const pivotData = (userRole === 'admin' ? inspectors : inspectors.filter(i => i.id === userId)).map(ins => {
    const row: any = { name: ins.name, total: 0 };
    uniqueSubItems.forEach(item => {
      const count = records
        .filter(r => (r.inspector_id === ins.id || r.inspector_name === ins.name) && r.sub_item === item)
        .reduce((sum, r) => sum + r.count, 0);
      row[item] = count;
      row.total += count;
    });
    return row;
  }).filter(row => row.total > 0);

  // 3. حساب إجماليات الأعمدة (Footer)
  const columnTotals: any = { total: pivotData.reduce((sum, r) => sum + r.total, 0) };
  uniqueSubItems.forEach(item => {
    columnTotals[item] = pivotData.reduce((sum, r) => sum + (r[item] || 0), 0);
  });

  const itemDistribution = Array.from(new Set(records.map(r => r.main_item))).map(name => ({
    name,
    value: records.filter(r => r.main_item === name).reduce((sum, r) => sum + r.count, 0)
  })).sort((a, b) => b.value - a.value);

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header & Tabs */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
           <i className="fas fa-analytics text-blue-600"></i> تحليلات ذكية
        </h2>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveReportTab('summary')} className={`px-6 py-2 rounded-xl text-xs font-black ${activeReportTab === 'summary' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>نظرة عامة</button>
          <button onClick={() => setActiveReportTab('pivot')} className={`px-6 py-2 rounded-xl text-xs font-black ${activeReportTab === 'pivot' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>التقرير المحوري (Pivot)</button>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 text-white p-2 rounded-2xl">
           <input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} className="bg-transparent border-none text-[10px] font-black focus:ring-0" />
           <i className="fas fa-arrow-left text-blue-400 text-[10px]"></i>
           <input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} className="bg-transparent border-none text-[10px] font-black focus:ring-0" />
        </div>
      </div>

      {activeReportTab === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 h-[450px]">
              <h3 className="text-sm font-black text-slate-700 mb-6 text-right uppercase">توزيع الإنتاجية</h3>
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
           
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
              <h3 className="text-sm font-black text-slate-700 mb-6 text-right uppercase">ترتيب الإنجاز الكلي</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {pivotData.map((stat, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-lg font-black text-blue-600">{stat.total}</p>
                    <div className="flex items-center gap-3 text-right">
                       <p className="font-black text-slate-700 text-sm">{stat.name}</p>
                       <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">{i+1}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      ) : (
        /* Pivot Table Concept */
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-500">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
             <button onClick={() => window.print()} className="bg-white border-2 border-gray-200 px-4 py-2 rounded-xl text-xs font-black"><i className="fas fa-print ml-2"></i> طباعة الجدول</button>
             <h3 className="text-lg font-black text-slate-800 italic">التقرير التجميعي المحوري (Pivot Analysis)</h3>
           </div>
           <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-right border-collapse min-w-[800px]">
               <thead>
                 <tr className="bg-slate-800 text-white text-[9px] font-black uppercase">
                   <th className="px-6 py-5 sticky right-0 bg-slate-800 z-10 border-l border-slate-700">اسم المفتش</th>
                   {uniqueSubItems.map((item, idx) => (
                     <th key={idx} className="px-4 py-5 text-center border-l border-slate-700 min-w-[100px]">{item}</th>
                   ))}
                   <th className="px-6 py-5 bg-blue-700 text-center">الإجمالي</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {pivotData.map((row, i) => (
                   <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                     <td className="px-6 py-5 font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 shadow-sm">{row.name}</td>
                     {uniqueSubItems.map((item, idx) => (
                       <td key={idx} className={`px-4 py-5 text-center font-bold text-xs border-l border-gray-50 ${row[item] > 0 ? 'text-slate-800' : 'text-gray-200'}`}>
                         {row[item] || '-'}
                       </td>
                     ))}
                     <td className="px-6 py-5 font-black text-blue-600 text-center bg-blue-50/30">{row.total}</td>
                   </tr>
                 ))}
               </tbody>
               <tfoot>
                 <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                   <td className="px-6 py-5 sticky right-0 bg-slate-50 z-10 border-l border-gray-200">إجمالي البند</td>
                   {uniqueSubItems.map((item, idx) => (
                     <td key={idx} className="px-4 py-5 text-center text-blue-600 border-l border-gray-200">{columnTotals[item]}</td>
                   ))}
                   <td className="px-6 py-5 text-center bg-blue-100 text-blue-800 text-lg">{columnTotals.total}</td>
                 </tr>
               </tfoot>
             </table>
           </div>
           <div className="p-4 bg-blue-50 text-blue-600 text-[10px] font-bold text-center italic">
             * هذا الجدول يعرض تقاطع الحركات بين الموظفين والبنود الفرعية المسجلة في الفترة المحددة.
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;

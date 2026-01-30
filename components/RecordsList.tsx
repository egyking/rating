
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationRecord } from '../types';
import { exportToExcel, printReport } from '../services/exportService';

const RecordsList: React.FC = () => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ employee: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const data = await supabaseService.getRecords(filters);
    setRecords(data);
    setLoading(false);
  };

  const handleExcelExport = () => {
    if (records.length === 0) return alert('لا توجد بيانات لتصديرها');
    exportToExcel(records, `سجلات_التفتيش`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExcelExport}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <i className="fas fa-file-excel"></i>
            تصدير Excel
          </button>
          <button 
            onClick={printReport}
            className="bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-700/20"
          >
            <i className="fas fa-print"></i>
            طباعة تقرير PDF
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end no-print">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest mr-1">بحث بالمفتش</label>
          <div className="relative">
            <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="اسم المفتش..."
              className="w-full bg-gray-50 border-none rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-blue-500 transition-all"
              value={filters.employee}
              onChange={(e) => setFilters({...filters, employee: e.target.value})}
            />
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest mr-1">من تاريخ</label>
          <input 
            type="date" 
            className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest mr-1">إلى تاريخ</label>
          <input 
            type="date" 
            className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
          />
        </div>
        <button 
          onClick={loadRecords}
          className="bg-blue-600 text-white h-[52px] px-8 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          بحث
        </button>
      </div>

      {/* Records Table Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
           <h3 className="text-lg font-bold text-gray-800">تفاصيل السجلات</h3>
           <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-bold">عدد النتائج: {records.length}</span>
        </div>
        
        {loading ? (
          <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>
        ) : records.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-bold">لا توجد بيانات متوفرة حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5 border-b border-gray-100">التاريخ</th>
                  <th className="px-8 py-5 border-b border-gray-100">المفتش</th>
                  <th className="px-8 py-5 border-b border-gray-100">البند / النوع</th>
                  <th className="px-8 py-5 border-b border-gray-100 text-center">العدد</th>
                  <th className="px-8 py-5 border-b border-gray-100">ملاحظات</th>
                  <th className="px-8 py-5 border-b border-gray-100 text-center no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(record => (
                  <tr key={record.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap font-bold text-gray-600">{record.date}</td>
                    <td className="px-8 py-5 whitespace-nowrap font-bold">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                            {record.inspector_name.charAt(0)}
                          </div>
                          {record.inspector_name}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-800">{record.sub_item}</p>
                      <span className="inline-block bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter mt-1">{record.sub_type || 'افتراضي'}</span>
                    </td>
                    <td className="px-8 py-5 text-center font-black text-blue-700 text-lg">
                      {record.count}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 max-w-xs truncate">
                      {record.notes || '-'}
                    </td>
                    <td className="px-8 py-5 text-center no-print">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><i className="fas fa-edit"></i></button>
                         <button className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsList;

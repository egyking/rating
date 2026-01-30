
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationRecord } from '../types';
import { exportToExcel, printReport } from '../services/exportService';

interface RecordsListProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const RecordsList: React.FC<RecordsListProps> = ({ userRole, userId }) => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ employee: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    loadRecords();
  }, [userRole, userId]);

  const loadRecords = async () => {
    setLoading(true);
    let data = await supabaseService.getRecords(filters);
    
    // فلترة السجلات الشخصية فقط إذا كان مفتشاً
    if (userRole === 'inspector') {
      data = data.filter(r => r.inspector_id === userId);
    }
    
    setRecords(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-xl font-black text-gray-800">
          {userRole === 'admin' ? 'أرشيف جميع التقييمات' : 'أرشيف تقييماتي الشخصية'}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel(records)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button onClick={printReport} className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <i className="fas fa-print"></i> طباعة
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end no-print">
        {userRole === 'admin' && (
          <div className="flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="اسم المفتش..."
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
              value={filters.employee}
              onChange={(e) => setFilters({...filters, employee: e.target.value})}
            />
          </div>
        )}
        <div className="flex-1 min-w-[150px]">
          <input 
            type="date" 
            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
          />
        </div>
        <button onClick={loadRecords} className="bg-blue-600 text-white h-[48px] px-8 rounded-xl font-bold hover:bg-blue-700">بحث</button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-blue-600"></i></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المفتش</th>
                  <th className="px-6 py-4">البند</th>
                  <th className="px-6 py-4 text-center">العدد</th>
                  <th className="px-6 py-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{record.inspector_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-xs">{record.sub_item}</p>
                      <span className="text-[10px] text-gray-400">{record.sub_type}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-blue-600">{record.count}</td>
                    <td className="px-6 py-4 text-xs text-gray-400 max-w-xs truncate">{record.notes}</td>
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

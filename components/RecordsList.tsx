
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
  const [filters, setFilters] = useState({ employee: '', dateFrom: '', dateTo: '', sub_item: '', status: '' });

  useEffect(() => {
    loadRecords();
  }, [userRole, userId]);

  const loadRecords = async () => {
    setLoading(true);
    let data = await supabaseService.getRecords(filters);
    
    if (userRole === 'inspector') {
      data = data.filter(r => r.inspector_id === userId);
    }
    
    setRecords(data);
    setLoading(false);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ employee: '', dateFrom: '', dateTo: '', sub_item: '', status: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <h3 className="text-xl font-black text-gray-800">
          {userRole === 'admin' ? 'أرشيف التقييمات' : 'أرشيف تقييماتي الشخصية'}
        </h3>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => exportToExcel(records)} className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button onClick={printReport} className="flex-1 md:flex-none bg-slate-700 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-slate-500/20">
            <i className="fas fa-print"></i> طباعة
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 no-print space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userRole === 'admin' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">المفتش</label>
              <input 
                type="text" 
                placeholder="بحث باسم المفتش..."
                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 px-4 text-xs font-bold transition-all"
                value={filters.employee}
                onChange={(e) => handleFilterChange('employee', e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">اسم البند</label>
            <input 
              type="text" 
              placeholder="بحث في أسماء البنود..."
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 px-4 text-xs font-bold transition-all"
              value={filters.sub_item}
              onChange={(e) => handleFilterChange('sub_item', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">الحالة</label>
            <select 
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 px-4 text-xs font-bold transition-all"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">الكل</option>
              <option value="approved">معتمد</option>
              <option value="pending">بانتظار الاعتماد</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">من تاريخ</label>
              <input 
                type="date" 
                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 px-4 text-[10px] font-bold transition-all"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">إلى تاريخ</label>
              <input 
                type="date" 
                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 px-4 text-[10px] font-bold transition-all"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRecords} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
             تطبيق الفلاتر
          </button>
          <button onClick={clearFilters} className="px-6 bg-gray-100 text-gray-400 py-3 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all">
             مسح
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-blue-600 text-2xl"></i></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المفتش</th>
                  <th className="px-6 py-4">البند</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4 text-center">العدد</th>
                  <th className="px-6 py-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.length > 0 ? records.map(record => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-700">{record.inspector_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-black text-xs text-slate-800">{record.sub_item}</p>
                      <span className="text-[10px] text-blue-400 font-bold">{record.main_item} | {record.code}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                         record.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                       }`}>
                         {record.status === 'approved' ? 'معتمد' : 'معلق'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-blue-600 text-lg">{record.count}</td>
                    <td className="px-6 py-4 text-[10px] text-gray-400 max-w-xs truncate font-bold italic">{record.notes || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-gray-300 font-black">لا توجد سجلات مطابقة للبحث</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsList;

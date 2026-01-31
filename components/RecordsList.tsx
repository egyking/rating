
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
    <div className="space-y-3">
      <div className="flex justify-between items-center no-print px-1">
        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">أرشيف التقييمات</h3>
        <div className="flex gap-1.5">
          <button onClick={() => exportToExcel(records)} className="bg-emerald-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
            <i className="fas fa-file-excel text-[10px]"></i>
          </button>
          <button onClick={printReport} className="bg-slate-700 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
            <i className="fas fa-print text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Compact Filters - Dense Grid */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 no-print grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 items-end">
        {userRole === 'admin' && (
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-[8px] font-black text-gray-400 mr-1">المفتش</label>
            <input type="text" placeholder="الاسم..." className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5 text-[10px] font-bold" value={filters.employee} onChange={e => handleFilterChange('employee', e.target.value)} />
          </div>
        )}
        <div className="space-y-1 col-span-2 md:col-span-1">
          <label className="text-[8px] font-black text-gray-400 mr-1">البند الفرعي</label>
          <input type="text" placeholder="البحث..." className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5 text-[10px] font-bold" value={filters.sub_item} onChange={e => handleFilterChange('sub_item', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-gray-400 mr-1">الحالة</label>
          <select className="w-full bg-gray-50 border border-gray-100 rounded-lg p-1.5 text-[10px] font-bold" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">الكل</option>
            <option value="approved">معتمد</option>
            <option value="pending">معلق</option>
          </select>
        </div>
        <div className="flex gap-1 h-8">
           <button onClick={loadRecords} className="flex-1 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase">تحديث</button>
           <button onClick={clearFilters} className="bg-gray-100 text-gray-400 px-2.5 rounded-lg text-[9px] font-black">X</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {loading ? (
          <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-blue-600"></i></div>
        ) : records.length > 0 ? (
          records.map(record => (
            <div key={record.id} className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
               <div className="flex-1 overflow-hidden ml-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                     <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${record.status === 'approved' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                     <p className="font-black text-slate-800 text-[10px] truncate">{record.sub_item}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] text-gray-400 font-bold">
                    <span>{record.inspector_name}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span>{record.date}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span className="text-blue-500">{record.code}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <div className="text-center bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">
                     <p className="text-[10px] font-black text-blue-600">{record.count}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                    record.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {record.status === 'approved' ? 'معتمد' : 'معلق'}
                  </span>
               </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-300 font-black text-[10px] uppercase">لا توجد سجلات مطابقة</div>
        )}
      </div>
    </div>
  );
};

export default RecordsList;

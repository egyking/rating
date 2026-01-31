
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
    <div className="space-y-4">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">أرشيف التقييمات</h3>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel(records)} className="bg-emerald-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
            <i className="fas fa-file-excel text-xs"></i>
          </button>
          <button onClick={printReport} className="bg-slate-700 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
            <i className="fas fa-print text-xs"></i>
          </button>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 no-print grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
        {userRole === 'admin' && (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase mr-1">المفتش</label>
            <input type="text" placeholder="الاسم..." className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] font-bold" value={filters.employee} onChange={e => handleFilterChange('employee', e.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase mr-1">البند</label>
          <input type="text" placeholder="البند الفرعي..." className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] font-bold" value={filters.sub_item} onChange={e => handleFilterChange('sub_item', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase mr-1">الحالة</label>
          <select className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] font-bold" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">الكل</option>
            <option value="approved">معتمد</option>
            <option value="pending">معلق</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase mr-1">الفترة</label>
          <div className="grid grid-cols-2 gap-1">
             <input type="date" className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] font-bold" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} />
             <input type="date" className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] font-bold" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-1 h-9">
           <button onClick={loadRecords} className="flex-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">فلترة</button>
           <button onClick={clearFilters} className="bg-gray-100 text-gray-400 px-3 rounded-lg text-[10px] font-black">X</button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-blue-600"></i></div>
        ) : records.length > 0 ? (
          records.map(record => (
            <div key={record.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
               <div className="flex-1 overflow-hidden ml-4">
                  <div className="flex items-center gap-2 mb-0.5">
                     <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'approved' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                     <p className="font-black text-slate-800 text-[11px] truncate">{record.sub_item}</p>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">
                    {record.inspector_name} • {record.date} • {record.code}
                  </p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="text-center bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                     <p className="text-[10px] font-black text-blue-600 leading-none">{record.count}</p>
                     <p className="text-[7px] font-bold text-blue-400 uppercase mt-0.5">العدد</p>
                  </div>
                  <span className={`hidden sm:inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    record.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {record.status === 'approved' ? 'معتمد' : 'معلق'}
                  </span>
               </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center text-gray-300 font-black text-xs uppercase tracking-widest">لا توجد سجلات</div>
        )}
      </div>
    </div>
  );
};

export default RecordsList;

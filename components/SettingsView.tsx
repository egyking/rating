
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector, EvaluationItem, EvaluationRecord } from '../types';

const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inspectors' | 'items' | 'approvals' | 'item_suggestions'>('item_suggestions');
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [pendingItems, setPendingItems] = useState<EvaluationItem[]>([]);
  const [pendingRecords, setPendingRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeSubTab === 'inspectors') setInspectors(await supabaseService.getInspectors());
    if (activeSubTab === 'items') setItems(await supabaseService.getItems({ status: 'approved' }));
    if (activeSubTab === 'item_suggestions') setPendingItems(await supabaseService.getItems({ status: 'pending' }));
    if (activeSubTab === 'approvals') {
      const recs = await supabaseService.getRecords({ status: 'pending' });
      setPendingRecords(recs as EvaluationRecord[]);
    }
    setLoading(false);
  };

  const handleApproveSuggestedItem = async (itemId: string) => {
    if (!confirm('هل تريد اعتماد هذا البند؟')) return;
    const res = await supabaseService.approveProposedItem(itemId);
    if (res.success) loadData();
  };

  const handleApproveRecord = async (id: string) => {
    const res = await supabaseService.updateRecordStatus(id, 'approved');
    if (res.success) setPendingRecords(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-20 px-1 lg:px-2">
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl w-fit no-print">
        <TabSubButton active={activeSubTab === 'item_suggestions'} onClick={() => setActiveSubTab('item_suggestions')} icon="fa-lightbulb" label="المقترحات" count={pendingItems.length} color="amber" />
        <TabSubButton active={activeSubTab === 'approvals'} onClick={() => setActiveSubTab('approvals')} icon="fa-check-double" label="الحركات" count={pendingRecords.length} color="emerald" />
        <TabSubButton active={activeSubTab === 'inspectors'} onClick={() => setActiveSubTab('inspectors')} icon="fa-users" label="المفتشين" />
        <TabSubButton active={activeSubTab === 'items'} onClick={() => setActiveSubTab('items')} icon="fa-list-check" label="البنود" />
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {loading ? <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-blue-600"></i></div> : (
          <div className="animate-in fade-in duration-200">
            
            {activeSubTab === 'item_suggestions' && (
               <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">بنود بانتظار الاعتماد</h3>
                  </div>
                  {pendingItems.length === 0 ? (
                    <div className="p-10 text-center text-gray-300 text-xs font-bold">لا توجد مقترحات حالياً</div>
                  ) : (
                    <div className="space-y-1.5">
                       {pendingItems.map(item => (
                         <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-white border border-gray-100 rounded-xl transition-all">
                            <div className="flex-1 overflow-hidden">
                               <h4 className="font-black text-slate-800 text-[11px] truncate">{item.sub_item}</h4>
                               <p className="text-[9px] text-gray-400 font-bold">الكود: {item.code || '-'}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => handleApproveSuggestedItem(item.id)} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-black text-[9px]">اعتماد</button>
                               <button onClick={async () => { if(confirm('حذف؟')) { await supabaseService.deleteItem(item.id); loadData(); } }} className="text-gray-300 hover:text-red-500 p-1.5"><i className="fas fa-trash-alt text-[10px]"></i></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'approvals' && (
               <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-widest">حركات بانتظار المراجعة</h3>
                  {pendingRecords.length === 0 ? (
                    <div className="p-10 text-center text-gray-300 text-xs font-bold">كل الحركات معتمدة</div>
                  ) : (
                    <div className="space-y-1.5">
                       {pendingRecords.map(rec => (
                         <div key={rec.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex-1 overflow-hidden">
                               <h4 className="font-black text-slate-800 text-[11px] truncate">{rec.sub_item}</h4>
                               <p className="text-[9px] text-gray-400 font-bold">{rec.inspector_name} • {rec.date} • العدد: {rec.count}</p>
                            </div>
                            <button onClick={() => handleApproveRecord(rec.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-black text-[9px] shadow-sm">اعتماد</button>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'inspectors' && (
               <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-widest">إدارة فريق العمل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                     {inspectors.map(ins => (
                       <div key={ins.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                          <span className="font-bold text-[11px] text-slate-700">{ins.name}</span>
                          <span className="text-[8px] bg-white border border-gray-100 px-2 py-0.5 rounded text-gray-400 font-black uppercase">{ins.role}</span>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeSubTab === 'items' && (
               <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-widest">البنود المعتمدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                     {items.map(item => (
                       <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{item.sub_item}</p>
                          <p className="text-[9px] text-blue-500 font-black mt-0.5">{item.code}</p>
                       </div>
                     ))}
                  </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabSubButton = ({ active, onClick, icon, label, count, color = 'blue' }: any) => {
  const activeClass = active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50';
  const countColor = color === 'amber' ? 'bg-amber-500' : (color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500');

  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${activeClass}`}>
      <i className={`fas ${icon} opacity-60`}></i> {label}
      {count !== undefined && count > 0 && <span className={`${countColor} text-white px-1.5 py-0.5 rounded-full text-[8px]`}>{count}</span>}
    </button>
  );
};

export default SettingsView;

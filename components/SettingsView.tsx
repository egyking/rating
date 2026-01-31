
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
    if (!confirm('هل تريد اعتماد هذا البند كبند رسمي في النظام؟')) return;
    const res = await supabaseService.approveProposedItem(itemId);
    if (res.success) {
      alert('✅ تم اعتماد البند بنجاح وأصبح متاحاً للجميع.');
      loadData();
    } else {
      alert('❌ فشل الاعتماد');
    }
  };

  const handleApproveRecord = async (id: string) => {
    const res = await supabaseService.updateRecordStatus(id, 'approved');
    if (res.success) {
      setPendingRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-200/50 rounded-2xl w-fit no-print">
        <TabSubButton active={activeSubTab === 'item_suggestions'} onClick={() => setActiveSubTab('item_suggestions')} icon="fa-lightbulb" label="مقترحات البنود" count={pendingItems.length} color="amber" />
        <TabSubButton active={activeSubTab === 'approvals'} onClick={() => setActiveSubTab('approvals')} icon="fa-check-double" label="اعتماد الحركات" count={pendingRecords.length} color="emerald" />
        <TabSubButton active={activeSubTab === 'inspectors'} onClick={() => setActiveSubTab('inspectors')} icon="fa-users" label="المفتشين" />
        <TabSubButton active={activeSubTab === 'items'} onClick={() => setActiveSubTab('items')} icon="fa-layer-group" label="البنود المعتمدة" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-gray-100 min-h-[500px]">
        {loading ? <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i></div> : (
          <div className="animate-in fade-in duration-300">
            
            {activeSubTab === 'item_suggestions' && (
               <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-800">اقتراحات بنود جديدة من المفتشين</h3>
                  </div>
                  {pendingItems.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 font-bold">لا توجد اقتراحات حالياً</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {pendingItems.map(item => (
                         <div key={item.id} className="bg-amber-50/30 border-2 border-amber-100 p-6 rounded-[2.5rem] flex flex-col justify-between gap-4">
                            <div className="text-right">
                               <h4 className="font-black text-slate-800 text-sm">{item.sub_item}</h4>
                               <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">الكود المقترح: {item.code}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => handleApproveSuggestedItem(item.id)} className="flex-1 bg-amber-500 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20">
                                  اعتماد كبند رسمي
                               </button>
                               <button onClick={async () => { if(confirm('حذف الاقتراح؟')) { await supabaseService.deleteItem(item.id); loadData(); } }} className="px-4 bg-white text-gray-400 py-3 rounded-2xl font-black text-xs border border-gray-100">
                                  رفض
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'approvals' && (
               <div className="space-y-8">
                  <h3 className="text-xl font-black text-gray-800">اعتماد الحركات اليومية</h3>
                  {pendingRecords.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 font-bold">كل الحركات معتمدة</div>
                  ) : (
                    <div className="space-y-3">
                       {pendingRecords.map(rec => (
                         <div key={rec.id} className="bg-white border-2 border-gray-100 p-5 rounded-[2rem] flex justify-between items-center">
                            <div className="text-right">
                               <h4 className="font-black text-slate-800 text-sm">{rec.sub_item}</h4>
                               <p className="text-[10px] text-gray-400">{rec.inspector_name} | {rec.date} | العدد: {rec.count}</p>
                            </div>
                            <button onClick={() => handleApproveRecord(rec.id)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs">اعتماد</button>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'inspectors' && (
               <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-800">إدارة المفتشين</h3>
                  {/* ... باقي كود المفتشين ... */}
               </div>
            )}

            {activeSubTab === 'items' && (
               <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-800">البنود الرسمية المعتمدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {items.map(item => (
                       <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-bold text-gray-800 text-xs">{item.sub_item}</p>
                          <p className="text-[9px] text-blue-500 font-black mt-1">{item.code}</p>
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
  const activeClass = color === 'emerald' ? 'bg-white text-emerald-600 shadow-md' : (color === 'amber' ? 'bg-white text-amber-600 shadow-md' : 'bg-white text-blue-600 shadow-md');
  const countClass = color === 'emerald' ? 'bg-emerald-500' : (color === 'amber' ? 'bg-amber-500' : 'bg-red-500');

  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${active ? activeClass : 'text-gray-500'}`}>
      <i className={`fas ${icon}`}></i> {label}
      {count !== undefined && count > 0 && <span className={`${countClass} text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]`}>{count}</span>}
    </button>
  );
};

export default SettingsView;

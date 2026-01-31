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

  // Modals State
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<'single' | 'batch'>('single');
  const [toastMsg, setToastMsg] = useState('');

  // Forms State
  const [newInspector, setNewInspector] = useState({ name: '', department: 'الجنوب', role: 'inspector', password: '123' });
  const [batchInspectorText, setBatchInspectorText] = useState('');
  const [newItem, setNewItem] = useState({ sub_item: '', main_item: '', code: '', department: 'الجنوب', questions: '[]' });

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

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

  const handleAddInspector = async () => {
    if (inspectorMode === 'single') {
      if (!newInspector.name) return showToast('❌ يرجى إدخال الاسم');
      const res = await supabaseService.createInspector(newInspector);
      if (res.success) {
        showToast('✅ تم إضافة المفتش بنجاح');
        setShowInspectorModal(false);
        setNewInspector({ name: '', department: 'الجنوب', role: 'inspector', password: '123' });
        loadData();
      } else {
        showToast('❌ فشل الإضافة');
      }
    } else {
      const names = batchInspectorText.split('\n').filter(n => n.trim() !== '');
      if (names.length === 0) return showToast('❌ لا توجد أسماء');
      const inspectors = names.map(name => ({
        name: name.trim(),
        department: 'الجنوب',
        role: 'inspector',
        password: '123'
      }));
      const res = await supabaseService.createInspectorsBatch(inspectors);
      if (res.success) {
        showToast(`✅ تم إضافة ${names.length} مفتشين بنجاح`);
        setShowInspectorModal(false);
        setBatchInspectorText('');
        loadData();
      } else {
        showToast('❌ فشل الإضافة الجماعية');
      }
    }
  };

  const handleAddItem = async () => {
    if (!newItem.sub_item || !newItem.main_item || !newItem.code) return showToast('❌ يرجى ملء الحقول الإجبارية');
    
    // Validate JSON
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(newItem.questions);
    } catch (e) {
      return showToast('❌ تنسيق JSON للأسئلة غير صحيح');
    }

    const res = await supabaseService.saveItem({ ...newItem, questions: parsedQuestions, status: 'approved' });
    if (res.success) {
      showToast('✅ تم إضافة البند بنجاح');
      setShowItemModal(false);
      setNewItem({ sub_item: '', main_item: '', code: '', department: 'الجنوب', questions: '[]' });
      loadData();
    } else {
      showToast('❌ حدث خطأ أثناء الحفظ');
    }
  };

  const handleApproveSuggestedItem = async (itemId: string) => {
    if (!confirm('هل تريد اعتماد هذا البند كبند رسمي في النظام؟')) return;
    const res = await supabaseService.approveProposedItem(itemId);
    if (res.success) { showToast('✅ تم الاعتماد'); loadData(); }
  };

  const handleApproveRecord = async (id: string) => {
    const res = await supabaseService.updateRecordStatus(id, 'approved');
    if (res.success) { 
      showToast('✅ تم الاعتماد'); 
      setPendingRecords(prev => prev.filter(r => r.id !== id)); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-20 px-1 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in font-bold text-xs flex items-center gap-2">
           <i className="fas fa-info-circle"></i> {toastMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl w-fit no-print">
        <TabSubButton active={activeSubTab === 'item_suggestions'} onClick={() => setActiveSubTab('item_suggestions')} icon="fa-lightbulb" label="المقترحات" count={pendingItems.length} color="amber" />
        <TabSubButton active={activeSubTab === 'approvals'} onClick={() => setActiveSubTab('approvals')} icon="fa-check-double" label="الحركات" count={pendingRecords.length} color="emerald" />
        <TabSubButton active={activeSubTab === 'inspectors'} onClick={() => setActiveSubTab('inspectors')} icon="fa-users" label="المفتشين" />
        <TabSubButton active={activeSubTab === 'items'} onClick={() => setActiveSubTab('items')} icon="fa-list-check" label="البنود" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        {loading ? <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-blue-600"></i></div> : (
          <div className="animate-in fade-in duration-200">
            
            {activeSubTab === 'item_suggestions' && (
               <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">بنود بانتظار الاعتماد</h3>
                  {pendingItems.length === 0 ? (
                    <div className="p-10 text-center text-gray-300 text-[10px] font-bold">لا توجد مقترحات حالياً</div>
                  ) : (
                    <div className="space-y-1.5">
                       {pendingItems.map(item => (
                         <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-white border border-gray-100 rounded-lg transition-all">
                            <div className="flex-1 overflow-hidden">
                               <h4 className="font-black text-slate-800 text-[11px] truncate">{item.sub_item}</h4>
                               <p className="text-[8px] text-gray-400 font-bold uppercase">الكود: {item.code || '-'}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => handleApproveSuggestedItem(item.id)} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md font-black text-[9px]">اعتماد</button>
                               <button onClick={async () => { if(confirm('حذف؟')) { await supabaseService.deleteItem(item.id); loadData(); } }} className="text-gray-300 hover:text-red-500 p-1"><i className="fas fa-trash-alt text-[10px]"></i></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'approvals' && (
               <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">حركات بانتظار المراجعة</h3>
                  {pendingRecords.length === 0 ? (
                    <div className="p-10 text-center text-gray-300 text-[10px] font-bold">كل الحركات معتمدة</div>
                  ) : (
                    <div className="space-y-1.5">
                       {pendingRecords.map(rec => (
                         <div key={rec.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex-1 overflow-hidden">
                               <h4 className="font-black text-slate-800 text-[11px] truncate">{rec.sub_item}</h4>
                               <p className="text-[8px] text-gray-400 font-bold">{rec.inspector_name} • {rec.date} • العدد: {rec.count}</p>
                            </div>
                            <button onClick={() => handleApproveRecord(rec.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-md font-black text-[9px] shadow-sm">اعتماد</button>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'inspectors' && (
               <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إدارة فريق العمل</h3>
                    <button onClick={() => setShowInspectorModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm hover:bg-blue-700">
                       <i className="fas fa-plus"></i> إضافة مفتش
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                     {inspectors.map(ins => (
                       <div key={ins.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                          <span className="font-bold text-[10px] text-slate-700">{ins.name}</span>
                          <span className="text-[7px] bg-white border border-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-black uppercase">{ins.role}</span>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeSubTab === 'items' && (
               <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">البنود المعتمدة</h3>
                    <button onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm hover:bg-blue-700">
                       <i className="fas fa-plus"></i> إضافة بند
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                     {items.map(item => (
                       <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-gray-100">
                          <p className="font-bold text-slate-800 text-[10px] truncate">{item.sub_item}</p>
                          <p className="text-[8px] text-blue-500 font-black mt-0.5 tracking-tighter">{item.code}</p>
                       </div>
                     ))}
                  </div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* --- ADD INSPECTOR MODAL --- */}
      {showInspectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-sm font-black text-slate-800 mb-4">إضافة مفتش جديد</h3>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setInspectorMode('single')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${inspectorMode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                فردي
              </button>
              <button 
                onClick={() => setInspectorMode('batch')} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${inspectorMode === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                جماعي
              </button>
            </div>

            {inspectorMode === 'single' ? (
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="اسم المفتش" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                  value={newInspector.name}
                  onChange={e => setNewInspector({ ...newInspector, name: e.target.value })}
                />
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none"
                  value={newInspector.role}
                  onChange={e => setNewInspector({ ...newInspector, role: e.target.value })}
                >
                  <option value="inspector">مفتش</option>
                  <option value="admin">مدير</option>
                </select>
                <input 
                  type="text" 
                  placeholder="القسم" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                  value={newInspector.department}
                  onChange={e => setNewInspector({ ...newInspector, department: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea 
                  placeholder="اكتب الأسماء هنا (اسم في كل سطر)..."
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none resize-none"
                  value={batchInspectorText}
                  onChange={e => setBatchInspectorText(e.target.value)}
                ></textarea>
                <p className="text-[9px] text-gray-400">سيتم إنشاء الحسابات بكلمة مرور افتراضية: 123</p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button onClick={handleAddInspector} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-black text-xs hover:bg-blue-700">حفظ</button>
              <button onClick={() => setShowInspectorModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-2.5 rounded-xl font-black text-xs hover:bg-gray-200">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD ITEM MODAL --- */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-black text-slate-800 mb-4">إضافة بند تقييم جديد</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[9px] text-gray-400 font-bold">اسم البند (الفرعي)</label>
                   <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                    value={newItem.sub_item}
                    onChange={e => setNewItem({ ...newItem, sub_item: e.target.value })}
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] text-gray-400 font-bold">التصنيف الرئيسي</label>
                   <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                    value={newItem.main_item}
                    onChange={e => setNewItem({ ...newItem, main_item: e.target.value })}
                   />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[9px] text-gray-400 font-bold">الكود</label>
                   <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                    value={newItem.code}
                    onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] text-gray-400 font-bold">القسم</label>
                   <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none" 
                    value={newItem.department}
                    onChange={e => setNewItem({ ...newItem, department: e.target.value })}
                   />
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 font-bold">هيكلية الأسئلة (JSON)</label>
                <textarea 
                  className="w-full h-40 bg-slate-900 text-green-400 border border-slate-700 rounded-xl p-3 text-[10px] font-mono outline-none resize-none"
                  value={newItem.questions}
                  onChange={e => setNewItem({ ...newItem, questions: e.target.value })}
                  placeholder='[{"question": "...", "type": "choice", "options": [...]}]'
                  dir="ltr"
                ></textarea>
                <p className="text-[8px] text-gray-400">تأكد من صحة تنسيق JSON لضمان عمل النموذج بشكل صحيح.</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleAddItem} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-black text-xs hover:bg-blue-700">حفظ البند</button>
              <button onClick={() => setShowItemModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-2.5 rounded-xl font-black text-xs hover:bg-gray-200">إلغاء</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const TabSubButton = ({ active, onClick, icon, label, count, color = 'blue' }: any) => {
  const activeClass = active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50';
  const countColor = color === 'amber' ? 'bg-amber-500' : (color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500');

  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg font-black text-[9px] flex items-center gap-1.5 transition-all ${activeClass}`}>
      <i className={`fas ${icon} opacity-60`}></i> {label}
      {count !== undefined && count > 0 && <span className={`${countColor} text-white px-1.5 py-0.5 rounded-full text-[7px]`}>{count}</span>}
    </button>
  );
};

export default SettingsView;
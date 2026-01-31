
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector, EvaluationItem, EvaluationRecord } from '../types';

const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inspectors' | 'items' | 'approvals'>('inspectors');
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [pendingRecords, setPendingRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<{show: boolean, inspector: Inspector | null}>({show: false, inspector: null});
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [bulkInput, setBulkInput] = useState('');
  const [deptInput, setDeptInput] = useState('قسم التفتيش');
  const [defaultPassword, setDefaultPassword] = useState('123456');

  const [newItem, setNewItem] = useState<any>({
    sub_item: '', main_item: 'تفتيش ميداني', code: '', department: 'الجنوب', sub_types: '', once_per_day: false, questions_json: '[]'
  });

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeSubTab === 'inspectors') setInspectors(await supabaseService.getInspectors());
    if (activeSubTab === 'items') setItems(await supabaseService.getItems());
    if (activeSubTab === 'approvals') {
      const recs = await supabaseService.getRecords({ status: 'pending' });
      setPendingRecords(recs as EvaluationRecord[]);
    }
    setLoading(false);
  };

  const handleBulkAddInspectors = async () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return alert('الرجاء إدخال أسماء');

    const existingNames = inspectors.map(ins => ins.name.toLowerCase());
    const uniqueNewNames = names.filter(name => !existingNames.includes(name.toLowerCase()));

    if (uniqueNewNames.length === 0) return alert('جميع هؤلاء المفتشين موجودون مسبقاً!');

    setIsSaving(true);
    const payload = uniqueNewNames.map(name => ({ 
      name, 
      password: defaultPassword, 
      department: deptInput, 
      active: true, 
      role: 'inspector' 
    }));
    
    const res = await supabaseService.saveInspectors(payload);
    setIsSaving(false);
    
    if (res.success) {
      alert(`✅ تم إضافة ${uniqueNewNames.length} مستخدم بنجاح`);
      setBulkInput('');
      setShowBulkModal(false);
      loadData();
    } else {
      alert(`❌ خطأ في الإضافة: ${res.error?.message || 'مشكلة في قاعدة البيانات'}`);
    }
  };

  const handleUpdatePassword = async () => {
    if (!showPasswordModal.inspector || !newPassword) return;
    setIsSaving(true);
    const res = await supabaseService.updateInspectorPassword(showPasswordModal.inspector.id, newPassword);
    setIsSaving(false);
    if (res.success) {
      alert('✅ تم تحديث كلمة المرور بنجاح');
      setShowPasswordModal({show: false, inspector: null});
      setNewPassword('');
    } else {
      alert('❌ فشل التحديث');
    }
  };

  const handleApprove = async (id: string) => {
    const res = await supabaseService.updateRecordStatus(id, 'approved');
    if (res.success) {
      setPendingRecords(prev => prev.filter(r => r.id !== id));
    } else {
      alert('❌ فشل الاعتماد');
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.sub_item || !newItem.code) return alert('أكمل البيانات الأساسية');
    setIsSaving(true);
    try {
      const questionsParsed = JSON.parse(newItem.questions_json || '[]');
      const subTypesArray = newItem.sub_types.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      const res = await supabaseService.saveItem({
        ...newItem,
        sub_types: subTypesArray,
        questions: questionsParsed
      });
      if (res.success) {
        setShowItemModal(false);
        setNewItem({ sub_item: '', main_item: 'تفتيش ميداني', code: '', department: 'الجنوب', sub_types: '', once_per_day: false, questions_json: '[]' });
        loadData();
      } else {
        alert('❌ خطأ: ' + res.error?.message);
      }
    } catch (e) { alert('❌ خطأ في تنسيق JSON الأسئلة'); }
    setIsSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-200/50 rounded-2xl w-fit no-print">
        <button onClick={() => setActiveSubTab('inspectors')} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${activeSubTab === 'inspectors' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>
          <i className="fas fa-users"></i> المفتشين
        </button>
        <button onClick={() => setActiveSubTab('items')} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeSubTab === 'items' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>
          <i className="fas fa-layer-group"></i> البنود
        </button>
        <button onClick={() => setActiveSubTab('approvals')} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeSubTab === 'approvals' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>
          <i className="fas fa-check-double"></i> اعتماد التقييمات 
          {pendingRecords.length > 0 && <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{pendingRecords.length}</span>}
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-gray-100 min-h-[500px]">
        {loading ? <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i></div> : (
          <div className="animate-in fade-in duration-300">
            {activeSubTab === 'inspectors' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center no-print">
                   <h3 className="text-xl font-black text-gray-800">إدارة المستخدمين وكلمات المرور</h3>
                   <button onClick={() => setShowBulkModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">إضافة مجموعة مستخدمين</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {inspectors.map(ins => (
                    <div key={ins.id} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-4 hover:border-blue-200 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-gray-800 text-sm">{ins.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{ins.department} | {ins.role === 'admin' ? 'مدير' : 'مفتش'}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setShowPasswordModal({show: true, inspector: ins})} className="text-blue-500 hover:bg-blue-100 p-2 rounded-xl transition-colors" title="تغيير كلمة السر"><i className="fas fa-key"></i></button>
                          <button onClick={async () => { if(confirm('حذف المستخدم نهائياً؟')) { await supabaseService.deleteInspector(ins.id); loadData(); } }} className="text-gray-300 hover:text-red-500 transition-colors p-2"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] bg-blue-100/50 p-2 rounded-xl text-blue-700 font-black italic">
                        <i className="fas fa-lock text-[8px]"></i> {ins.password || '******'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSubTab === 'approvals' && (
               <div className="space-y-8">
                  <div className="flex justify-between items-center no-print">
                    <h3 className="text-xl font-black text-gray-800">التقييمات المقترحة بانتظار الاعتماد</h3>
                    <p className="text-xs font-bold text-gray-400">{pendingRecords.length} سجل متبقي</p>
                  </div>
                  {pendingRecords.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                       <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm">
                          <i className="fas fa-check-circle"></i>
                       </div>
                       <p className="font-black text-gray-400">لا توجد تقييمات بانتظار الاعتماد حالياً</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                       {pendingRecords.map(rec => (
                         <div key={rec.id} className="bg-white border-2 border-gray-100 p-5 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 hover:border-emerald-200 transition-all">
                            <div className="flex-1 text-right">
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">مقترح</span>
                                  <h4 className="font-black text-slate-800 text-sm">{rec.sub_item}</h4>
                               </div>
                               <p className="text-[10px] text-gray-400 font-bold">{rec.inspector_name} | {rec.date} | {rec.main_item}</p>
                               {rec.notes && <p className="text-[10px] text-blue-500 italic mt-1 font-bold">ملاحظة: {rec.notes}</p>}
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="text-center">
                                  <p className="text-[10px] font-black text-gray-400">العدد</p>
                                  <p className="text-xl font-black text-blue-600">{rec.count}</p>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={() => handleApprove(rec.id)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                                     <i className="fas fa-check"></i> اعتماد
                                  </button>
                                  <button onClick={async () => { if(confirm('حذف هذا المقترح؟')) { await supabaseService.updateRecordStatus(rec.id, 'approved'); /* logic can be reject too */ loadData(); } }} className="bg-gray-100 text-gray-400 px-4 py-3 rounded-2xl font-black text-xs hover:bg-red-50 hover:text-red-500 transition-all">
                                     <i className="fas fa-times"></i>
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            {activeSubTab === 'items' && (
               <div className="space-y-8">
                  <div className="flex justify-between items-center no-print">
                    <button onClick={() => setShowItemModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all">إضافة بند جديد</button>
                    <h3 className="text-xl font-black text-gray-800">قائمة بنود التقييم</h3>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-gray-100">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                        <tr>
                          <th className="p-5">البند الفرعي</th>
                          <th className="p-5">البند الرئيسي</th>
                          <th className="p-5">الكود</th>
                          <th className="p-5 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-5 text-sm font-bold text-gray-700">{item.sub_item}</td>
                            <td className="p-5 text-xs text-blue-600 font-bold">{item.main_item}</td>
                            <td className="p-5 font-mono text-xs">{item.code}</td>
                            <td className="p-5 text-center">
                              <button onClick={async () => { if(confirm('حذف هذا البند؟')) { await supabaseService.deleteItem(item.id); loadData(); } }} className="text-gray-300 hover:text-red-500 p-2 transition-colors"><i className="fas fa-trash-alt"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Password Update Modal */}
      {showPasswordModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 space-y-6 shadow-2xl animate-in zoom-in duration-200">
             <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-key"></i></div>
                <h4 className="text-xl font-black text-gray-800">تغيير كلمة السر</h4>
                <p className="text-xs font-bold text-gray-400 mt-1">للمفتش: {showPasswordModal.inspector?.name}</p>
             </div>
             <input 
                type="text" 
                autoFocus
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-center text-lg tracking-widest text-blue-600" 
                placeholder="كلمة السر الجديدة" 
              />
             <div className="flex gap-3">
                <button disabled={isSaving} onClick={handleUpdatePassword} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20">حفظ</button>
                <button onClick={() => setShowPasswordModal({show: false, inspector: null})} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk User Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl animate-in zoom-in duration-200">
            <h4 className="text-xl font-black text-gray-800 text-right">إضافة مستخدمين جدد</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">القسم</label>
                <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="القسم" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">كلمة المرور للجميع</label>
                <input type="text" value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="كلمة المرور" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">الأسماء</label>
                <textarea rows={5} value={bulkInput} onChange={e => setBulkInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="اسم المفتش في كل سطر..."></textarea>
              </div>
            </div>
            <div className="flex gap-4">
              <button disabled={isSaving} onClick={handleBulkAddInspectors} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/30">
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : 'تأكيد الحفظ'}
              </button>
              <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal Placeholder (Simpler for space) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 space-y-6 shadow-2xl">
              <h4 className="text-xl font-black text-gray-800 text-right">إضافة بند تقييم جديد</h4>
              <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="اسم البند" value={newItem.sub_item} onChange={e => setNewItem({...newItem, sub_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-right text-sm font-bold" />
                 <input type="text" placeholder="الكود" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-right text-sm font-bold" />
                 <select value={newItem.main_item} onChange={e => setNewItem({...newItem, main_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-right text-sm font-bold">
                    <option value="تفتيش ميداني">تفتيش ميداني</option>
                    <option value="إجراءات مكتبية">إجراءات مكتبية</option>
                    <option value="أخرى">أخرى</option>
                 </select>
                 <input type="text" placeholder="القسم" value={newItem.department} onChange={e => setNewItem({...newItem, department: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-right text-sm font-bold" />
              </div>
              <textarea placeholder="الخيارات المتاحة (افصل بينها بفاصلة ,)" value={newItem.sub_types} onChange={e => setNewItem({...newItem, sub_types: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-right text-sm font-bold" rows={2}></textarea>
              <div className="flex gap-4">
                <button disabled={isSaving} onClick={handleSaveItem} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/30">حفظ البند</button>
                <button onClick={() => setShowItemModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

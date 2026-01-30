
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector, EvaluationItem, Holiday } from '../types';

const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inspectors' | 'items' | 'holidays'>('inspectors');
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Bulk Inspector Form
  const [bulkInput, setBulkInput] = useState('');
  const [deptInput, setDeptInput] = useState('قسم التفتيش');

  // New Item Form
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
    if (activeSubTab === 'holidays') setHolidays(await supabaseService.getHolidays());
    setLoading(false);
  };

  const handleDeleteInspector = async (id: string) => {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا المفتش؟')) {
      await supabaseService.deleteInspector(id);
      loadData();
    }
  };

  const handleBulkAddInspectors = async () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return alert('الرجاء إدخال أسماء');

    // تصفية الأسماء الموجودة مسبقاً لمنع خطأ التكرار (Unique Constraint)
    const existingNames = inspectors.map(ins => ins.name.toLowerCase());
    const uniqueNewNames = names.filter(name => !existingNames.includes(name.toLowerCase()));

    if (uniqueNewNames.length === 0) return alert('جميع هؤلاء المفتشين موجودون مسبقاً!');

    const payload = uniqueNewNames.map(name => ({ name, department: deptInput, active: true, role: 'inspector' }));
    const res = await supabaseService.saveInspectors(payload);
    
    if (res.success) {
      alert(`✅ تم إضافة ${uniqueNewNames.length} مفتش بنجاح.`);
      setBulkInput('');
      setShowBulkModal(false);
      loadData();
    } else {
      alert('❌ خطأ في الإضافة: ' + (res.error?.message || 'تأكد من عدم تكرار الأسماء'));
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.sub_item || !newItem.code) return alert('أكمل البيانات الأساسية');
    
    try {
      const questionsParsed = JSON.parse(newItem.questions_json || '[]');
      const subTypesArray = newItem.sub_types.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

      const payload = {
        sub_item: newItem.sub_item,
        main_item: newItem.main_item,
        code: newItem.code,
        department: newItem.department,
        sub_types: subTypesArray,
        once_per_day: newItem.once_per_day,
        questions: questionsParsed
      };

      const res = await supabaseService.saveItem(payload);
      if (res.success) {
        setShowItemModal(false);
        setNewItem({ sub_item: '', main_item: 'تفتيش ميداني', code: '', department: 'الجنوب', sub_types: '', once_per_day: false, questions_json: '[]' });
        loadData();
      }
    } catch (e) {
      alert('❌ خطأ في صيغة الـ JSON للأسئلة. تأكد من كتابة JSON صحيح.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('حذف هذا البند نهائياً؟')) {
      await supabaseService.deleteItem(id);
      loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Tabs Header */}
      <div className="flex gap-2 p-1.5 bg-gray-200/50 rounded-2xl w-fit backdrop-blur-sm">
        {[
          { id: 'inspectors', label: 'المفتشين', icon: 'fa-users' },
          { id: 'items', label: 'بنود التقييم (JSON)', icon: 'fa-brain' },
          { id: 'holidays', label: 'العطلات', icon: 'fa-calendar-day' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 min-h-[500px] relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* Inspectors Tab Content */}
            {activeSubTab === 'inspectors' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-gray-800">إدارة فريق العمل</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">تحديد من يحق له الدخول وتسجيل البيانات</p>
                  </div>
                  <button onClick={() => setShowBulkModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                    <i className="fas fa-user-plus"></i> إضافة مجموعة
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {inspectors.map(ins => (
                    <div key={ins.id} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black">{ins.name.charAt(0)}</div>
                        <div>
                          <p className="font-black text-gray-800 text-sm">{ins.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ins.department}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteInspector(ins.id)} className="w-8 h-8 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Tab Content */}
            {activeSubTab === 'items' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-gray-800">قاعدة البنود الذكية</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">إدارة منطق الأسئلة الشرطية وتوليد البنود التلقائية</p>
                  </div>
                  <button onClick={() => setShowItemModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <i className="fas fa-plus-circle"></i> إضافة بند (JSON)
                  </button>
                </div>
                <div className="overflow-x-auto rounded-3xl border border-gray-100">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                      <tr>
                        <th className="p-5">البند الفرعي</th>
                        <th className="p-5">الكود</th>
                        <th className="p-5">الأسئلة (JSON)</th>
                        <th className="p-5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-5">
                             <p className="font-black text-gray-800 text-sm">{item.sub_item}</p>
                             <p className="text-[10px] font-bold text-blue-500">{item.main_item}</p>
                          </td>
                          <td className="p-5 font-mono text-xs font-black text-gray-400">{item.code}</td>
                          <td className="p-5">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${item.questions?.length > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.questions?.length > 0 ? `${item.questions.length} أسئلة منطقية` : 'لا يوجد أسئلة'}
                            </span>
                          </td>
                          <td className="p-5 text-center">
                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Holidays Placeholder */}
            {activeSubTab === 'holidays' && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <i className="fas fa-calendar-alt text-6xl mb-4 opacity-10"></i>
                <p className="font-bold">قسم إدارة العطلات قيد التطوير</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Inspector Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8">
            <h4 className="text-xl font-black text-gray-800">إضافة فريق مفتشين</h4>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">القسم</label>
                <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm focus:border-blue-500" placeholder="مثال: قسم الجنوب" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">قائمة الأسماء (اسم في كل سطر)</label>
                <textarea rows={6} value={bulkInput} onChange={e => setBulkInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm focus:border-blue-500" placeholder="محمد أحمد&#10;خالد عبدالله..."></textarea>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleBulkAddInspectors} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20">تأكيد الإضافة</button>
              <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal (Supports JSON Questions) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 my-10 space-y-8">
            <h4 className="text-xl font-black text-gray-800 flex items-center gap-3">
               <i className="fas fa-code text-emerald-500"></i> إعداد بند تقييم ذكي
            </h4>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">اسم البند</label>
                <input type="text" value={newItem.sub_item} onChange={e => setNewItem({...newItem, sub_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="مثال: جولة تفتيشية" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">كود الحركة</label>
                <input type="text" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="101-A" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">التصنيف الرئيسي</label>
                <select value={newItem.main_item} onChange={e => setNewItem({...newItem, main_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm">
                  <option value="تفتيش ميداني">تفتيش ميداني</option>
                  <option value="إجراءات مكتبية">إجراءات مكتبية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">الأنواع (مفصولة بفاصلة , )</label>
                <input type="text" value={newItem.sub_types} onChange={e => setNewItem({...newItem, sub_types: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="نهاري, ليلي, طوارئ" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-purple-600 uppercase mb-2 block">أسئلة الـ JSON الشرطية (متقدم)</label>
                <textarea 
                  rows={8} 
                  value={newItem.questions_json} 
                  onChange={e => setNewItem({...newItem, questions_json: e.target.value})} 
                  className="w-full bg-slate-900 text-emerald-400 border-none rounded-2xl p-5 font-mono text-xs custom-scrollbar"
                  placeholder='[ { "question": "هل تم رصد مخالفة؟", "options": [ { "text": "نعم", "value": "yes", "evaluations": [{ "item": "تحرير مخالفة", "code": "VIO-01" }] } ] } ]'
                ></textarea>
                <p className="text-[9px] text-gray-400 mt-2">انسخ كود الـ JSON الخاص بالأسئلة من نظام شيتس القديم هنا.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleSaveItem} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20">حفظ البند الذكي</button>
              <button onClick={() => setShowItemModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

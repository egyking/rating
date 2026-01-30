
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
  const [newItem, setNewItem] = useState<Partial<EvaluationItem>>({
    sub_item: '', main_item: 'تفتيش ميداني', code: '', department: 'الجنوب', sub_types: [], once_per_day: false
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
    if (confirm('حذف المفتش؟')) {
      await supabaseService.deleteInspector(id);
      loadData();
    }
  };

  const handleBulkAddInspectors = async () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const payload = names.map(name => ({ name, department: deptInput, active: true }));
    const res = await supabaseService.saveInspectors(payload);
    if (res.success) {
      setBulkInput('');
      setShowBulkModal(false);
      loadData();
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.sub_item || !newItem.code) return alert('أكمل البيانات');
    const res = await supabaseService.saveItem(newItem);
    if (res.success) {
      setShowItemModal(false);
      setNewItem({ sub_item: '', main_item: 'تفتيش ميداني', code: '', department: 'الجنوب', sub_types: [], once_per_day: false });
      loadData();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('حذف هذا البند نهائياً؟')) {
      await supabaseService.deleteItem(id);
      loadData();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Tabs Header */}
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl w-fit">
        {[
          { id: 'inspectors', label: 'المفتشين', icon: 'fa-users' },
          { id: 'items', label: 'بنود التقييم', icon: 'fa-list-check' },
          { id: 'holidays', label: 'العطلات', icon: 'fa-calendar-day' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-64"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* Inspectors Tab Content */}
            {activeSubTab === 'inspectors' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black">إدارة فريق العمل</h3>
                  <button onClick={() => setShowBulkModal(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20">
                    + إضافة مجموعة
                  </button>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                   <i className="fas fa-key text-blue-600"></i>
                   <p className="text-xs text-blue-800 font-bold">كلمة المرور الافتراضية لجميع المفتشين هي: <span className="bg-blue-600 text-white px-2 py-0.5 rounded ml-1">123</span></p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inspectors.map(ins => (
                    <div key={ins.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">{ins.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-sm">{ins.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{ins.department}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteInspector(ins.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Tab Content */}
            {activeSubTab === 'items' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black">قاعدة بنود التقييم</h3>
                  <button onClick={() => setShowItemModal(true)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">
                    + إضافة بند جديد
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                      <tr>
                        <th className="p-4">البند الفرعي</th>
                        <th className="p-4">القسم الرئيسي</th>
                        <th className="p-4 text-center">الكود</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-bold text-sm">{item.sub_item}</td>
                          <td className="p-4 text-xs font-bold text-blue-500">{item.main_item}</td>
                          <td className="p-4 text-center font-mono font-bold text-gray-400">{item.code}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Holidays Tab Content */}
            {activeSubTab === 'holidays' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-800">العطلات الرسمية والسنوية</h3>
                <p className="text-sm text-gray-400 font-bold">تؤثر العطلات على حساب معدل الإنجاز اليومي المتوقع.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {holidays.map(h => (
                    <div key={h.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-calendar-star text-amber-500"></i>
                        <span className="font-bold text-sm">{h.name} - {h.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Inspector Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <h4 className="text-lg font-black">إضافة فريق مفتشين</h4>
            <div className="space-y-4">
              <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="القسم (مثال: الجنوب)" />
              <textarea rows={6} value={bulkInput} onChange={e => setBulkInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="الأسماء (اسم في كل سطر)..."></textarea>
            </div>
            <div className="flex gap-4">
              <button onClick={handleBulkAddInspectors} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">تأكيد</button>
              <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <h4 className="text-lg font-black">إضافة بند تقييم جديد</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">اسم البند</label>
                <input type="text" value={newItem.sub_item} onChange={e => setNewItem({...newItem, sub_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="مثال: جولة تفتيشية مسائية" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">التصنيف</label>
                <select value={newItem.main_item} onChange={e => setNewItem({...newItem, main_item: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm">
                  <option value="تفتيش ميداني">تفتيش ميداني</option>
                  <option value="إجراءات مكتبية">إجراءات مكتبية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">كود الحركة</label>
                <input type="text" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm" placeholder="مثال: 101-A" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleSaveItem} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black">حفظ البند</button>
              <button onClick={() => setShowItemModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

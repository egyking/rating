
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector, EvaluationItem, Holiday } from '../types';

const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'inspectors' | 'items' | 'holidays'>('inspectors');
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Bulk Inspector Form
  const [bulkInput, setBulkInput] = useState('');
  const [deptInput, setDeptInput] = useState('قسم التفتيش');
  const [defaultPassword, setDefaultPassword] = useState('123456');

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
    setLoading(false);
  };

  const handleBulkAddInspectors = async () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return alert('الرجاء إدخال أسماء');

    const existingNames = inspectors.map(ins => ins.name.toLowerCase());
    const uniqueNewNames = names.filter(name => !existingNames.includes(name.toLowerCase()));

    if (uniqueNewNames.length === 0) return alert('جميع هؤلاء المفتشين موجودون مسبقاً!');

    const payload = uniqueNewNames.map(name => ({ 
      name, 
      password: defaultPassword, 
      department: deptInput, 
      active: true, 
      role: 'inspector' 
    }));
    
    const res = await supabaseService.saveInspectors(payload);
    
    if (res.success) {
      alert(`✅ تم إضافة ${uniqueNewNames.length} مفتش بكلمة مرور: ${defaultPassword}`);
      setBulkInput('');
      setShowBulkModal(false);
      loadData();
    } else {
      alert('❌ خطأ في الإضافة');
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.sub_item || !newItem.code) return alert('أكمل البيانات الأساسية');
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
      }
    } catch (e) { alert('❌ خطأ في JSON'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex gap-2 p-1.5 bg-gray-200/50 rounded-2xl w-fit">
        {[
          { id: 'inspectors', label: 'المستخدمين', icon: 'fa-users' },
          { id: 'items', label: 'البنود', icon: 'fa-layer-group' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 min-h-[500px]">
        {loading ? <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i></div> : (
          <div className="animate-in fade-in duration-300">
            {activeSubTab === 'inspectors' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black text-gray-800">إدارة المستخدمين وكلمات المرور</h3>
                   <button onClick={() => setShowBulkModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm">إضافة مجموعة مستخدمين</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {inspectors.map(ins => (
                    <div key={ins.id} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{ins.name}</p>
                        <p className="text-[10px] text-blue-500 font-bold">كلمة المرور: {(ins as any).password || '123456'}</p>
                      </div>
                      <button onClick={async () => { if(confirm('حذف؟')) { await supabaseService.deleteInspector(ins.id); loadData(); } }} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeSubTab === 'items' && (
               <div className="space-y-8 text-right">
                  <div className="flex justify-between items-center">
                    <button onClick={() => setShowItemModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm">إضافة بند جديد</button>
                    <h3 className="text-xl font-black text-gray-800">قائمة بنود التقييم</h3>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-gray-100">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                        <tr>
                          <th className="p-5">البند</th>
                          <th className="p-5">الكود</th>
                          <th className="p-5 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                          <tr key={item.id}>
                            <td className="p-5 text-sm font-bold">{item.sub_item}</td>
                            <td className="p-5 font-mono text-xs">{item.code}</td>
                            <td className="p-5 text-center">
                              <button onClick={async () => { if(confirm('حذف؟')) { await supabaseService.deleteItem(item.id); loadData(); } }} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
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

      {/* Bulk User Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6">
            <h4 className="text-xl font-black text-gray-800 text-right">إضافة مستخدمين جدد</h4>
            <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="القسم" />
            <input type="text" value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="كلمة المرور الافتراضية للجميع" />
            <textarea rows={5} value={bulkInput} onChange={e => setBulkInput(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm text-right" placeholder="أسماء المفتشين (اسم في كل سطر)"></textarea>
            <div className="flex gap-4">
              <button onClick={handleBulkAddInspectors} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black">تأكيد</button>
              <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

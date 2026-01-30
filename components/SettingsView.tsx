
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector } from '../types';

const SettingsView: React.FC = () => {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [department, setDepartment] = useState('قسم التفتيش');

  useEffect(() => {
    loadInspectors();
  }, []);

  const loadInspectors = async () => {
    setLoading(true);
    const data = await supabaseService.getInspectors();
    setInspectors(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المفتش؟ سيؤدي ذلك لحذف مستهدفاته أيضاً.')) return;
    const res = await supabaseService.deleteInspector(id);
    if (res.success) loadInspectors();
  };

  const handleBulkAdd = async () => {
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;

    const newInspectors = names.map(name => ({
      name,
      department,
      active: true,
      role: 'inspector' as const
    }));

    const res = await supabaseService.saveInspectors(newInspectors);
    if (res.success) {
      alert(`✅ تم إضافة ${names.length} مفتش بنجاح`);
      setBulkInput('');
      setShowBulkModal(false);
      loadInspectors();
    } else {
      alert('❌ حدث خطأ أثناء الإضافة الجماعية');
    }
  };

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-black text-gray-800">👥 إدارة فريق المفتشين</h3>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">تحكم كامل في أعضاء النظام وصلاحياتهم</p>
          </div>
          <button 
            onClick={() => setShowBulkModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <i className="fas fa-users-medical"></i> إضافة مجموعة
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inspectors.map(ins => (
            <div key={ins.id} className="group flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-white transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                  {ins.name.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-gray-800 text-sm">{ins.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{ins.department || 'غير مصنف'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(ins.id)} 
                className="w-8 h-8 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            </div>
          ))}
          {inspectors.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-[2rem]">
               <i className="fas fa-user-slash text-4xl mb-4 opacity-20"></i>
               <p className="font-bold">قائمة المفتشين فارغة</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-50 pb-4">
              <h4 className="text-lg font-black text-gray-800">إضافة مجموعة مفتشين</h4>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🏢 القسم الموحد</label>
                <input 
                  type="text" 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 transition-all"
                  placeholder="مثال: قسم الرقابة الصحية"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase">📝 قائمة الأسماء (اسم في كل سطر)</label>
                <textarea 
                  rows={8}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 transition-all text-sm custom-scrollbar"
                  placeholder="محمد أحمد&#10;خالد عبدالله&#10;سارة علي..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleBulkAdd}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                تأكيد الإضافة الجماعية
              </button>
              <button 
                onClick={() => setShowBulkModal(false)}
                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Settings Placeholder */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-gray-800 mb-6">⚙️ تفضيلات النظام</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all">
            <div>
              <p className="font-bold text-gray-800">تفعيل النقاط المحفزة</p>
              <p className="text-[10px] text-gray-400 font-bold">تطبيق خوارزمية السكورينج التلقائية في التقارير</p>
            </div>
            <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;

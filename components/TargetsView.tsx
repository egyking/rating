
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Target, Inspector } from '../types';

const TargetsView: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedInspectors, setSelectedInspectors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    main_item: 'جميع البنود',
    target_value: 100,
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [t, ins] = await Promise.all([
      supabaseService.getTargets(),
      supabaseService.getInspectors()
    ]);
    setTargets(t);
    setInspectors(ins);
    setLoading(false);
  };

  const toggleInspector = (id: string) => {
    setSelectedInspectors(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedInspectors.length === inspectors.length) setSelectedInspectors([]);
    else setSelectedInspectors(inspectors.map(i => i.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInspectors.length === 0) {
      alert('يرجى اختيار مفتش واحد على الأقل');
      return;
    }

    setIsSaving(true);
    const batchTargets = selectedInspectors.map(id => {
      const ins = inspectors.find(i => i.id === id);
      return {
        ...formData,
        inspector_id: id,
        inspector_name: ins?.name
      };
    });

    const res = await supabaseService.saveBatchTargets(batchTargets);
    if (res.success) {
      alert(`✅ تم إضافة المستهدفات لعدد ${selectedInspectors.length} مفتش بنجاح`);
      setSelectedInspectors([]);
      fetchData();
    } else {
      alert('❌ حدث خطأ أثناء الحفظ');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستهدف؟')) return;
    const res = await supabaseService.deleteTarget(id);
    if (res.success) fetchData();
  };

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h3 className="text-xl font-black mb-8 text-gray-800 flex items-center gap-3">
          <i className="fas fa-bullseye-arrow text-blue-600"></i> تحديد مستهدفات (فردية أو جماعية)
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-black text-gray-400 uppercase">👥 اختيار المفتشين</label>
                <button type="button" onClick={selectAll} className="text-xs font-bold text-blue-600 hover:underline">
                  {selectedInspectors.length === inspectors.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[200px] overflow-y-auto p-2 custom-scrollbar border-2 border-dashed border-gray-100 rounded-2xl">
                {inspectors.map(ins => (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => toggleInspector(ins.id)}
                    className={`p-3 rounded-xl text-xs font-bold transition-all border-2 text-center ${
                      selectedInspectors.includes(ins.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                    }`}
                  >
                    {ins.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase">📦 البند الرئيسي</label>
              <select 
                required
                value={formData.main_item}
                onChange={(e) => setFormData({...formData, main_item: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 transition-all"
              >
                <option value="جميع البنود">جميع البنود</option>
                <option value="تفتيش ميداني">تفتيش ميداني</option>
                <option value="إجراءات مكتبية">إجراءات مكتبية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🔢 القيمة المستهدفة</label>
              <input 
                type="number" 
                required
                min="1"
                value={formData.target_value}
                onChange={(e) => setFormData({...formData, target_value: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase text-[10px]">من</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase text-[10px]">إلى</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-3"
            >
              {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
              إضافة المستهدف لـ ({selectedInspectors.length}) مفتشين
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-black text-gray-800">سجل المستهدفات الحالية</h3>
          <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black">{targets.length} مستهدف</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">المفتش</th>
                <th className="px-8 py-4">البند</th>
                <th className="px-8 py-4 text-center">الهدف</th>
                <th className="px-8 py-4">الفترة</th>
                <th className="px-8 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {targets.map(target => (
                <tr key={target.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-4 font-bold text-gray-700">{target.inspector_name}</td>
                  <td className="px-8 py-4 text-xs font-bold text-blue-500">{target.main_item}</td>
                  <td className="px-8 py-4 text-center font-black text-slate-800">{target.target_value}</td>
                  <td className="px-8 py-4 text-[10px] text-gray-400 font-bold">
                    {target.start_date} <i className="fas fa-arrow-left mx-1"></i> {target.end_date}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button onClick={() => handleDelete(target.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TargetsView;

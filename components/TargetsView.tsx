
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Target, Inspector } from '../types';

const TargetsView: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    inspector_id: '',
    main_item: '',
    target_value: 0,
    start_date: '',
    end_date: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inspector = inspectors.find(i => i.id === formData.inspector_id);
    await supabaseService.saveTarget({
      ...formData,
      inspector_name: inspector?.name
    });
    setFormData({ inspector_id: '', main_item: '', target_value: 0, start_date: '', end_date: '' });
    fetchData();
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-3xl"></i></div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* New Target Form */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 text-gray-800">➕ تحديد مستهدف جديد</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">المفتش</label>
            <select 
              required
              value={formData.inspector_id}
              onChange={(e) => setFormData({...formData, inspector_id: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">اختر...</option>
              {inspectors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">البند الرئيسي</label>
            <select 
              required
              value={formData.main_item}
              onChange={(e) => setFormData({...formData, main_item: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">اختر...</option>
              <option value="تفتيش ميداني">تفتيش ميداني</option>
              <option value="إجراءات مكتبية">إجراءات مكتبية</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">القيمة المستهدفة</label>
            <input 
              type="number" 
              required
              value={formData.target_value}
              onChange={(e) => setFormData({...formData, target_value: parseInt(e.target.value)})}
              className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">من تاريخ</label>
            <input 
              type="date" 
              required
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">إلى تاريخ</label>
            <input 
              type="date" 
              required
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all">
              إضافة المستهدف
            </button>
          </div>
        </form>
      </div>

      {/* Targets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {targets.map(target => (
          <div key={target.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-800">{target.inspector_name}</h4>
                <p className="text-sm text-gray-500">{target.main_item}</p>
              </div>
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm font-bold">
                هدف: {target.target_value}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span><i className="far fa-calendar-alt ml-1"></i> {target.start_date}</span>
              <span><i className="fas fa-arrow-left ml-1"></i></span>
              <span><i className="far fa-calendar-alt ml-1"></i> {target.end_date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TargetsView;

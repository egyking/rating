
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { Inspector, EvaluationItem } from '../types';

interface EvaluationFormProps {
  onSaved: () => void;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSaved }) => {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInspector, setSelectedInspector] = useState('');
  const [cards, setCards] = useState<any[]>([{ 
    id: Date.now(), 
    item_id: '', 
    count: 1, 
    sub_type: '', 
    notes: '', 
    location: null,
    image: null
  }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [ins, itm] = await Promise.all([
        supabaseService.getInspectors(),
        supabaseService.getItems()
      ]);
      setInspectors(ins);
      setItems(itm);
      setLoading(false);
    };
    fetchData();
  }, []);

  const addCard = () => {
    setCards([...cards, { id: Date.now(), item_id: '', count: 1, sub_type: '', notes: '', location: null, image: null }]);
  };

  const removeCard = (id: number) => {
    if (cards.length > 1) {
      setCards(cards.filter(c => c.id !== id));
    }
  };

  const updateCard = (id: number, field: string, value: any) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const captureLocation = (id: number) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        updateCard(id, 'location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, (error) => {
        alert("فشل الحصول على الموقع الجغرافي. تأكد من تفعيل الـ GPS.");
      });
    }
  };

  const captureImage = (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => updateCard(id, 'image', reader.result);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!selectedInspector) return alert('يرجى اختيار المفتش');
    
    setIsSaving(true);
    const inspector = inspectors.find(i => i.id === selectedInspector);
    
    const evaluationList = cards.map(card => {
      const item = items.find(i => i.id === card.item_id);
      return {
        date,
        inspector_id: selectedInspector,
        inspector_name: inspector?.name,
        item_id: card.item_id,
        sub_item: item?.sub_item,
        main_item: item?.main_item,
        sub_type: card.sub_type,
        code: item?.code,
        department: item?.department,
        count: card.count,
        notes: card.notes,
        location: card.location,
        image_url: card.image // In a real app, this would be a link to storage
      };
    });

    const res = await supabaseService.saveBatchEvaluations(evaluationList);
    setIsSaving(false);
    if (res.success) {
      alert(`تم حفظ ${res.count} تقييم بنجاح مع بيانات الموقع.`);
      onSaved();
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-3xl"></i></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      {/* Header Info */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700 mb-2">📅 تاريخ اليوم</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700 mb-2">👤 المفتش المسؤول</label>
          <select 
            value={selectedInspector}
            onChange={(e) => setSelectedInspector(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          >
            <option value="">اختر المفتش...</option>
            {inspectors.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
          </select>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-6">
        {cards.map((card, index) => (
          <div key={card.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative group">
            <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{index + 1}</span>
                 <span className="text-gray-800 font-bold">بند تقييم جديد</span>
              </div>
              {cards.length > 1 && (
                <button onClick={() => removeCard(card.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <i className="fas fa-trash-alt"></i>
                </button>
              )}
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">📝 اختيار البند</label>
                  <select 
                    value={card.item_id}
                    onChange={(e) => updateCard(card.id, 'item_id', e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">اختر البند الفرعي...</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.sub_item} - {item.code}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🔢 الكمية / العدد</label>
                  <input 
                    type="number" 
                    min="1"
                    value={card.count}
                    onChange={(e) => updateCard(card.id, 'count', parseInt(e.target.value))}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🔖 تصنيف إضافي</label>
                  <select 
                    value={card.sub_type}
                    onChange={(e) => updateCard(card.id, 'sub_type', e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">تلقائي</option>
                    {items.find(i => i.id === card.item_id)?.sub_types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Advanced Capture Actions */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => captureLocation(card.id)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${card.location ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-blue-200'}`}
                >
                  <i className={`fas ${card.location ? 'fa-location-dot' : 'fa-map-pin'}`}></i>
                  {card.location ? 'تم تحديد الموقع' : 'تحديد الموقع GPS'}
                </button>
                <button 
                  onClick={() => captureImage(card.id)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${card.image ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-blue-200'}`}
                >
                  <i className={`fas ${card.image ? 'fa-image' : 'fa-camera'}`}></i>
                  {card.image ? 'تم إرفاق صورة' : 'التقاط صورة'}
                </button>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">💬 ملاحظات التفتيش</label>
                <textarea 
                  value={card.notes}
                  onChange={(e) => updateCard(card.id, 'notes', e.target.value)}
                  placeholder="اكتب تفاصيل التقرير الفنية هنا..."
                  className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 transition-all h-24"
                />
              </div>

              {card.image && (
                <div className="mt-4 relative w-32 h-32 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                   <img src={card.image} className="w-full h-full object-cover" />
                   <button onClick={() => updateCard(card.id, 'image', null)} className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full text-[10px]"><i className="fas fa-times"></i></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center pb-12">
        <button 
          onClick={addCard}
          className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all w-full md:w-auto flex items-center justify-center gap-2 shadow-lg"
        >
          <i className="fas fa-plus"></i>
          إضافة بند آخر في الزيارة
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all w-full md:w-auto flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
        >
          {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
          اعتماد وحفظ السجلات
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

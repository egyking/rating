
import React, { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationItem, AuthUser } from '../types';

interface EvaluationFormProps {
  onSaved: () => void;
  currentUser: AuthUser;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSaved, currentUser }) => {
  const [itemsDB, setItemsDB] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Suggestion State
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestForm, setSuggestForm] = useState({ sub_item: '', main_item: 'تفتيش ميداني', code: '' });
  const [activeCardIdForSuggest, setActiveCardIdForSuggest] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});
  const [isSearchOpen, setIsSearchOpen] = useState<{ [key: number]: boolean }>({});
  const searchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cards, setCards] = useState<any[]>([{ 
    id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] 
  }]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadItems();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadItems = async () => {
    const items = await supabaseService.getItems();
    setItemsDB(items);
    setLoading(false);
  };

  const handleSelectItem = (cardId: number, item: EvaluationItem) => {
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId: item.id, subType: '', answers: {}, generatedEvals: [] 
    } : c));
    setIsSearchOpen(prev => ({ ...prev, [cardId]: false }));
    setSearchQuery(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleQuickSuggest = (cardId: number) => {
    setActiveCardIdForSuggest(cardId);
    setSuggestForm({ ...suggestForm, sub_item: searchQuery[cardId] || '' });
    setShowSuggestModal(true);
  };

  const handleSaveSuggest = async () => {
    if (!suggestForm.sub_item || !suggestForm.code) return alert('يرجى كتابة الاسم والكود المقترح');
    setIsSaving(true);
    
    // حفظ البند كبند مقترح (Pending)
    const res = await supabaseService.saveItem({
      ...suggestForm,
      department: currentUser.department || 'الجنوب',
      status: 'pending',
      sub_types: [],
      questions: []
    });

    if (res.success && res.data) {
      const newItem = res.data as EvaluationItem;
      setItemsDB(prev => [...prev, newItem]);
      if (activeCardIdForSuggest) {
        handleSelectItem(activeCardIdForSuggest, newItem);
      }
      setShowSuggestModal(false);
      alert('✅ تم إضافة البند كمقترح، سيتم مراجعته واعتماده من قبل المدير.');
    } else {
      alert('❌ فشل إرسال الاقتراح');
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const finalBatch: any[] = [];
    const recordStatus = 'pending'; // دائماً بانتظار الاعتماد للمفتش

    for (const card of cards) {
      const item = itemsDB.find(i => i.id === card.itemId);
      if (!item) continue;

      finalBatch.push({
        date,
        inspector_id: currentUser.id,
        inspector_name: currentUser.fullName,
        item_id: item.id,
        sub_item: item.sub_item,
        main_item: item.main_item,
        sub_type: card.subType,
        code: item.code,
        department: item.department,
        count: card.count,
        notes: card.notes,
        answers: card.answers,
        status: recordStatus
      });
    }

    if (finalBatch.length === 0) {
      setIsSaving(false);
      return alert('يرجى اختيار بند واحد على الأقل');
    }

    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) {
      alert(`✅ تم إرسال ${res.count} تقييمات بنجاح للمراجعة.`);
      onSaved();
    } else {
      alert('❌ فشل الحفظ');
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-40 px-2 lg:px-0">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="flex-1 text-right">
          <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">📅 تاريخ التقييم</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-800" />
        </div>
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          const currentQuery = searchQuery[card.id] || '';
          const filtered = itemsDB.filter(i => 
            i.sub_item.toLowerCase().includes(currentQuery.toLowerCase()) || 
            i.code.toLowerCase().includes(currentQuery.toLowerCase())
          ).slice(0, 10);

          return (
            <div key={card.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
                <span className="text-xs font-black">حركة تقييم #{index + 1}</span>
                {cards.length > 1 && <button onClick={() => setCards(cards.filter(c => c.id !== card.id))}><i className="fas fa-times-circle"></i></button>}
              </div>
              
              <div className="p-6 space-y-6">
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <label className="block text-[10px] font-black text-gray-400 mb-2">📋 اختر البند (أو ابحث لإضافة جديد)</label>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className="w-full bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl p-4 transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <i className="fas fa-search text-gray-300"></i>
                    {selectedItem ? (
                      <div className="flex-1 text-right">
                        <p className="font-black text-slate-800 text-sm">{selectedItem.sub_item}</p>
                        <p className="text-[10px] text-blue-500 font-bold">{selectedItem.code} {selectedItem.status === 'pending' && '(مقترح)'}</p>
                      </div>
                    ) : <p className="text-gray-400 text-sm">اضغط للبحث عن بند...</p>}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 overflow-hidden">
                      <div className="p-3 bg-gray-50">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="ابحث بالاسم أو الكود..."
                          className="w-full bg-white border-2 border-blue-100 rounded-xl p-3 text-sm font-bold outline-none"
                          value={currentQuery}
                          onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto">
                        {filtered.map(item => (
                          <div key={item.id} onClick={() => handleSelectItem(card.id, item)} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between">
                            <div className="text-right">
                               <p className="font-black text-slate-700 text-xs">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400">{item.main_item}</p>
                            </div>
                            {item.status === 'pending' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[8px] font-black self-center">مقترح</span>}
                          </div>
                        ))}
                        <div 
                          onClick={() => handleQuickSuggest(card.id)}
                          className="p-4 bg-blue-50 text-blue-600 font-black text-xs text-center cursor-pointer hover:bg-blue-100"
                        >
                          <i className="fas fa-plus-circle ml-2"></i>
                          لم تجد البند؟ اضغط هنا لإضافته كمقترح
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedItem && (
                  <div className="flex items-center gap-4 bg-blue-50/30 p-4 rounded-2xl">
                    <div className="flex-1 text-right">
                        <label className="block text-[10px] font-black text-blue-600 mb-1">🔢 العدد المنجز</label>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm">
                        <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-10 h-10 flex items-center justify-center text-red-400"><i className="fas fa-minus"></i></button>
                        <span className="w-12 text-center font-black text-lg">{card.count}</span>
                        <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-10 h-10 flex items-center justify-center text-blue-500"><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 lg:bottom-10 left-4 right-4 flex gap-3 z-50">
        <button onClick={() => setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] }])} className="flex-1 bg-white text-blue-600 border-2 border-blue-600 p-4 rounded-2xl font-black shadow-xl">إضافة حركة أخرى</button>
        <button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-blue-600 text-white p-4 rounded-2xl font-black shadow-xl">
           {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane ml-2"></i>}
           إرسال للتقييم
        </button>
      </div>

      {/* Suggest Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-200">
              <div className="text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-lightbulb"></i></div>
                 <h4 className="text-lg font-black text-gray-800">اقتراح بند جديد</h4>
                 <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">سيتم إرسال هذا الاسم للمدير لاعتماده كبند دائم</p>
              </div>
              <div className="space-y-4">
                 <input 
                   type="text" 
                   value={suggestForm.sub_item} 
                   onChange={e => setSuggestForm({...suggestForm, sub_item: e.target.value})}
                   className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-right text-sm"
                   placeholder="اسم البند المقترح"
                 />
                 <input 
                   type="text" 
                   value={suggestForm.code} 
                   onChange={e => setSuggestForm({...suggestForm, code: e.target.value})}
                   className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-right text-sm"
                   placeholder="كود البند (مثال: FR-22)"
                 />
              </div>
              <div className="flex gap-3">
                 <button onClick={handleSaveSuggest} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">تأكيد الاقتراح</button>
                 <button onClick={() => setShowSuggestModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

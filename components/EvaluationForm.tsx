
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
    loadItems();
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(searchRefs.current).forEach(id => {
        if (searchRefs.current[Number(id)] && !searchRefs.current[Number(id)]?.contains(event.target as Node)) {
          setIsSearchOpen(prev => ({ ...prev, [Number(id)]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadItems = async () => {
    const items = await supabaseService.getItems();
    setItemsDB(items);
    setLoading(false);
  };

  const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
      .trim()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '') // حذف التشكيل
      .toLowerCase();
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
    if (!suggestForm.sub_item) return alert('يرجى كتابة الاسم المقترح');
    setIsSaving(true);
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
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const finalBatch = cards
      .filter(card => card.itemId)
      .map(card => {
        const item = itemsDB.find(i => i.id === card.itemId);
        return {
          date,
          inspector_id: currentUser.id,
          inspector_name: currentUser.fullName,
          item_id: item?.id,
          sub_item: item?.sub_item,
          main_item: item?.main_item,
          sub_type: card.subType,
          code: item?.code,
          department: item?.department || currentUser.department,
          count: card.count,
          notes: card.notes,
          answers: card.answers,
          status: 'pending'
        };
      });

    if (finalBatch.length === 0) {
      setIsSaving(false);
      return alert('يرجى اختيار بند واحد على الأقل');
    }

    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) {
      alert(`✅ تم الإرسال للمراجعة`);
      onSaved();
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-blue-600"></i></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-2 pb-40 px-2">
      {/* Date Bar - Compact */}
      <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <i className="fas fa-calendar-day text-blue-500 text-xs"></i>
           <span className="text-[10px] font-black text-gray-400 uppercase">التاريخ</span>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none p-0 font-bold text-gray-800 text-xs focus:ring-0 text-left" />
      </div>

      <div className="space-y-2">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          const currentQuery = searchQuery[card.id] || '';
          const normalizedQuery = normalizeArabic(currentQuery);
          
          const filtered = itemsDB.filter(i => 
            normalizeArabic(i.sub_item).includes(normalizedQuery) || 
            normalizeArabic(i.code).includes(normalizedQuery)
          ).slice(0, 10);

          return (
            <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-gray-100">
                <span className="text-[10px] font-black text-slate-500">الحركة #{index + 1}</span>
                {cards.length > 1 && (
                  <button onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-gray-300 hover:text-red-500">
                    <i className="fas fa-times-circle text-xs"></i>
                  </button>
                )}
              </div>
              
              <div className="p-3 space-y-3">
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className={`w-full bg-gray-50 border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer transition-all ${isSearchOpen[card.id] ? 'border-blue-400 bg-white ring-2 ring-blue-50' : 'border-gray-100'}`}
                  >
                    <i className="fas fa-search text-gray-300 text-[10px]"></i>
                    {selectedItem ? (
                      <div className="flex-1 text-right overflow-hidden">
                        <p className="font-black text-slate-800 text-xs truncate">{selectedItem.sub_item}</p>
                        <p className="text-[9px] text-blue-500 font-bold">{selectedItem.code}</p>
                      </div>
                    ) : <p className="text-gray-400 text-[11px] font-medium">اختر البند الفرعي...</p>}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="p-2 bg-gray-50 border-b border-gray-100">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="ابحث بالاسم أو الكود..."
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-400"
                          value={currentQuery}
                          onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                        />
                      </div>
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? filtered.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleSelectItem(card.id, item)} 
                            className="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center group"
                          >
                            <div className="text-right">
                               <p className="font-black text-slate-700 text-[11px] group-hover:text-blue-700">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400">{item.main_item} | {item.code}</p>
                            </div>
                            {item.status === 'pending' && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black">مقترح</span>}
                          </div>
                        )) : (
                          <div className="p-5 text-center">
                            <p className="text-[10px] text-gray-400 font-bold mb-2">لا توجد نتائج</p>
                            <button 
                              onClick={() => handleQuickSuggest(card.id)}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px]"
                            >
                              إضافة "{currentQuery}" كمقترح
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedItem && (
                  <div className="flex items-center justify-between bg-blue-50/30 p-2.5 rounded-xl border border-blue-100/50">
                    <span className="text-[11px] font-black text-blue-700">الكمية/العدد</span>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-blue-100">
                        <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded"><i className="fas fa-minus text-[10px]"></i></button>
                        <span className="w-6 text-center font-black text-sm text-slate-800">{card.count}</span>
                        <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded"><i className="fas fa-plus text-[10px]"></i></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 flex gap-2 z-50">
        <button onClick={() => setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] }])} className="flex-1 bg-white text-slate-700 border border-gray-200 py-3 rounded-xl font-black shadow-lg text-xs flex items-center justify-center gap-2">
          <i className="fas fa-plus"></i> إضافة بند
        </button>
        <button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black shadow-xl text-xs flex items-center justify-center gap-2">
           {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
           إرسال للتقييم
        </button>
      </div>

      {/* Suggest Modal - Compact */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xs rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="text-center">
                 <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">اقتراح بند جديد</h4>
              </div>
              <div className="space-y-2">
                 <input type="text" value={suggestForm.sub_item} onChange={e => setSuggestForm({...suggestForm, sub_item: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold text-right text-xs" placeholder="اسم البند" />
                 <input type="text" value={suggestForm.code} onChange={e => setSuggestForm({...suggestForm, code: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold text-right text-xs" placeholder="الكود (اختياري)" />
              </div>
              <div className="flex gap-2">
                 <button onClick={handleSaveSuggest} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-black text-[10px]">تأكيد</button>
                 <button onClick={() => setShowSuggestModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-2.5 rounded-lg font-black text-[10px]">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

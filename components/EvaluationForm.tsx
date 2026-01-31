
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
    id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {} 
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
    try {
      const items = await supabaseService.getItems();
      setItemsDB(items);
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
      .trim()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '')
      .toLowerCase();
  };

  const handleSelectItem = (cardId: number, item: EvaluationItem) => {
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId: item.id, subType: '', answers: {}, count: 1 
    } : c));
    setIsSearchOpen(prev => ({ ...prev, [cardId]: false }));
    setSearchQuery(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleUpdateAnswer = (cardId: number, questionLabel: string, value: any) => {
    setCards(cards.map(c => c.id === cardId ? {
      ...c,
      answers: { ...c.answers, [questionLabel]: value }
    } : c));
  };

  // وظيفة التحقق من الشروط لعرض السؤال
  const shouldShowQuestion = (question: any, cardAnswers: any) => {
    if (!question.showIf) return true;
    const { field, value } = question.showIf;
    return cardAnswers[field] === value;
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    const validCards = cards.filter(card => card.itemId);
    if (validCards.length === 0) {
      return alert('يرجى اختيار بند واحد على الأقل قبل الإرسال');
    }

    setIsSaving(true);
    const finalBatch = validCards.map(card => {
      const item = itemsDB.find(i => i.id === card.itemId);
      const inspectorId = currentUser.id === '00000000-0000-0000-0000-000000000000' ? null : currentUser.id;

      return {
        date,
        inspector_id: inspectorId,
        inspector_name: currentUser.fullName,
        item_id: item?.id,
        sub_item: item?.sub_item,
        main_item: item?.main_item,
        sub_type: card.subType || '',
        code: item?.code || '',
        department: item?.department || currentUser.department || 'الجنوب',
        count: card.count,
        notes: card.notes || '',
        answers: card.answers || {},
        status: 'pending'
      };
    });

    try {
      const res = await supabaseService.saveBatchEvaluations(finalBatch);
      if (res.success) {
        alert(`✅ تم إرسال التقييم بنجاح للمراجعة`);
        onSaved();
      } else {
        alert(`❌ فشل في الحفظ: ${res.error?.message || 'تأكد من استقرار الإنترنت'}`);
      }
    } catch (error: any) {
      alert('❌ حدث خطأ غير متوقع أثناء الإرسال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSuggest = (cardId: number) => {
    setActiveCardIdForSuggest(cardId);
    setSuggestForm({ ...suggestForm, sub_item: searchQuery[cardId] || '' });
    setShowSuggestModal(true);
  };

  const handleSaveSuggest = async () => {
    if (!suggestForm.sub_item) return alert('يرجى كتابة الاسم المقترح');
    setIsSaving(true);
    try {
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
        if (activeCardIdForSuggest) handleSelectItem(activeCardIdForSuggest, newItem);
        setShowSuggestModal(false);
      }
    } catch (err) { alert('خطأ في الاتصال'); }
    finally { setIsSaving(false); }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-blue-600"></i></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-40 px-2">
      {/* Date Bar */}
      <div className="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <i className="fas fa-calendar-check text-blue-500 text-xs"></i>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">تاريخ المهمة</span>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          className="bg-transparent border-none p-0 font-bold text-gray-800 text-xs focus:ring-0 text-left cursor-pointer" 
        />
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          const currentQuery = searchQuery[card.id] || '';
          const normalizedQuery = normalizeArabic(currentQuery);
          
          const filtered = itemsDB.filter(i => 
            normalizeArabic(i.sub_item).includes(normalizedQuery) || 
            normalizeArabic(i.code).includes(normalizedQuery)
          ).slice(0, 10);

          // تحويل الأسئلة لمصفوفة بشكل آمن
          let itemQuestions: any[] = [];
          if (selectedItem?.questions) {
            try {
              itemQuestions = Array.isArray(selectedItem.questions) 
                ? selectedItem.questions 
                : (typeof selectedItem.questions === 'string' ? JSON.parse(selectedItem.questions) : []);
            } catch(e) {
              console.error("Questions parse error", e);
            }
          }

          return (
            <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible relative transition-all">
              <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-gray-100 rounded-t-2xl">
                <span className="text-[10px] font-black text-slate-500">حركة #{index + 1}</span>
                {cards.length > 1 && (
                  <button onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                    <i className="fas fa-times-circle text-sm"></i>
                  </button>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                {/* Search / Selection Area */}
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className={`w-full bg-gray-50 border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all ${isSearchOpen[card.id] ? 'border-blue-500 bg-white ring-2 ring-blue-50' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <i className="fas fa-search text-gray-300 text-xs"></i>
                    {selectedItem ? (
                      <div className="flex-1 text-right overflow-hidden">
                        <p className="font-black text-slate-800 text-xs truncate">{selectedItem.sub_item}</p>
                        <p className="text-[9px] text-blue-500 font-bold">{selectedItem.code}</p>
                      </div>
                    ) : <p className="text-gray-400 text-xs font-bold">ابحث عن البند الفرعي...</p>}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-[70] bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                      <div className="p-2 bg-gray-50 border-b border-gray-100">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="اكتب للبحث..."
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-bold outline-none"
                          value={currentQuery}
                          onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                        />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? filtered.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleSelectItem(card.id, item)} 
                            className="p-3.5 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center group"
                          >
                            <div className="text-right">
                               <p className="font-black text-slate-700 text-xs group-hover:text-blue-700 transition-colors">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400">{item.main_item} • {item.code}</p>
                            </div>
                            {item.status === 'pending' && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">مقترح</span>}
                          </div>
                        )) : (
                          <div className="p-6 text-center">
                            <button 
                                onClick={() => handleQuickSuggest(card.id)} 
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                إضافة "{currentQuery}" كمقترح جديد
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conditional Questions & Counter */}
                {selectedItem && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                    
                    {/* Questions Area */}
                    {itemQuestions.length > 0 && (
                      <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100/50 space-y-4 shadow-inner">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">المتطلبات الإضافية</h4>
                         </div>
                         {itemQuestions.map((q: any, qIdx: number) => {
                           // التحقق من الشرطية قبل العرض
                           if (!shouldShowQuestion(q, card.answers)) return null;

                           return (
                             <div key={qIdx} className="space-y-1.5 animate-in fade-in zoom-in duration-200">
                                <label className="text-[11px] font-black text-slate-700 block pr-1">
                                    {q.label} {q.required && <span className="text-red-400">*</span>}
                                </label>
                                {q.type === 'select' ? (
                                  <select 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold shadow-sm outline-none focus:border-blue-500"
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  >
                                    <option value="">اختر الإجابة...</option>
                                    {q.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : q.type === 'boolean' ? (
                                  <div className="flex gap-2">
                                    {['نعم', 'لا'].map(opt => (
                                      <button
                                        key={opt}
                                        onClick={() => handleUpdateAnswer(card.id, q.label, opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-black border transition-all ${card.answers[q.label] === opt ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'}`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold shadow-sm outline-none focus:border-blue-500"
                                    placeholder="أدخل البيانات..."
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  />
                                )}
                             </div>
                           );
                         })}
                      </div>
                    )}

                    {/* Quantity Counter */}
                    <div className="flex items-center justify-between bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                      <div className="flex flex-col">
                         <span className="text-[11px] font-black text-emerald-700">العدد أو الكمية المنجزة</span>
                         <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Total Quantity</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-emerald-100">
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"><i className="fas fa-minus text-xs"></i></button>
                          <span className="w-9 text-center font-black text-sm text-slate-800">{card.count}</span>
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><i className="fas fa-plus text-xs"></i></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Buttons Bar */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 flex gap-2 z-50">
        <button 
          onClick={() => setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {} }])} 
          className="flex-1 bg-white text-slate-700 border border-gray-200 py-4 rounded-2xl font-black shadow-lg text-xs flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <i className="fas fa-plus"></i> إضافة بند آخر
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
           {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
           إرسال التقييم النهائي
        </button>
      </div>

      {/* Suggest Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xs rounded-[2rem] p-7 space-y-5 shadow-2xl animate-in zoom-in duration-200">
              <div className="text-center">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-xl mb-3 shadow-sm">
                    <i className="fas fa-lightbulb"></i>
                 </div>
                 <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">اقتراح بند غير مسجل</h4>
              </div>
              <div className="space-y-3">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 mr-1 uppercase">اسم البند الجديد</label>
                    <input type="text" value={suggestForm.sub_item} onChange={e => setSuggestForm({...suggestForm, sub_item: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-right text-xs focus:bg-white focus:border-blue-400 outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 mr-1 uppercase">كود التمييز</label>
                    <input type="text" value={suggestForm.code} onChange={e => setSuggestForm({...suggestForm, code: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-right text-xs focus:bg-white focus:border-blue-400 outline-none" placeholder="مثال: A-202" />
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={handleSaveSuggest} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] shadow-lg shadow-blue-500/20">حفظ المقترح</button>
                 <button onClick={() => setShowSuggestModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-black text-[11px]">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

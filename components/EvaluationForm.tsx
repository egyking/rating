
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

  // منطق التحقق من الشرط (ShowIf)
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
        alert(`✅ تم حفظ وإرسال البيانات بنجاح`);
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
      {/* Header Bar */}
      <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs">
              <i className="fas fa-calendar-day"></i>
           </div>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">التاريخ الحالي</span>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          className="bg-transparent border-none p-0 font-black text-gray-800 text-xs focus:ring-0 text-left" 
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

          // استخراج الأسئلة والأنواع الفرعية بشكل آمن
          let itemQuestions: any[] = [];
          let subTypes: string[] = [];
          
          if (selectedItem) {
            // معالجة الأسئلة
            if (selectedItem.questions) {
                try {
                    itemQuestions = Array.isArray(selectedItem.questions) 
                        ? selectedItem.questions 
                        : (typeof selectedItem.questions === 'string' ? JSON.parse(selectedItem.questions) : []);
                } catch(e) { console.error("Parse questions error", e); }
            }
            // معالجة الأنواع الفرعية
            if (selectedItem.sub_types) {
                try {
                    subTypes = Array.isArray(selectedItem.sub_types)
                        ? selectedItem.sub_types
                        : (typeof selectedItem.sub_types === 'string' ? JSON.parse(selectedItem.sub_types) : []);
                } catch(e) { console.error("Parse subtypes error", e); }
            }
          }

          return (
            <div key={card.id} className="bg-white rounded-[1.8rem] shadow-sm border border-gray-100 overflow-visible relative">
              <div className="bg-slate-50/80 px-4 py-2 flex justify-between items-center border-b border-gray-100 rounded-t-[1.8rem]">
                <span className="text-[10px] font-black text-slate-500">حركة التفتيش #{index + 1}</span>
                {cards.length > 1 && (
                  <button onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                    <i className="fas fa-minus-circle"></i>
                  </button>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                {/* Search / Item Selection */}
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className={`w-full bg-gray-50 border rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-all ${isSearchOpen[card.id] ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <i className="fas fa-magnifying-glass text-gray-300 text-xs"></i>
                    {selectedItem ? (
                      <div className="flex-1 text-right overflow-hidden">
                        <p className="font-black text-slate-800 text-xs truncate">{selectedItem.sub_item}</p>
                        <p className="text-[9px] text-blue-500 font-bold uppercase">{selectedItem.code}</p>
                      </div>
                    ) : <p className="text-gray-400 text-xs font-bold">ابحث عن البند (مثلاً: تفتيش مطاعم)...</p>}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-[70] bg-white border border-gray-200 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in zoom-in duration-150">
                      <div className="p-2.5 bg-gray-50 border-b border-gray-100">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="اكتب الاسم أو الكود..."
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                          value={currentQuery}
                          onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? filtered.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleSelectItem(card.id, item)} 
                            className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center group transition-colors"
                          >
                            <div className="text-right">
                               <p className="font-black text-slate-700 text-[11px] group-hover:text-blue-700">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400">{item.main_item} • {item.code}</p>
                            </div>
                            {item.status === 'pending' && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">مقترح</span>}
                          </div>
                        )) : (
                          <div className="p-8 text-center">
                            <button 
                                onClick={() => handleQuickSuggest(card.id)} 
                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[11px] shadow-xl shadow-blue-500/30"
                            >
                                إضافة "{currentQuery}" كبند جديد
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* DYNAMIC GENERATED AREA - الانبثاق */}
                {selectedItem && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    
                    {/* 1. Sub-Types (Conditional Dropdown) */}
                    {subTypes.length > 0 && (
                      <div className="space-y-1.5 p-1">
                        <label className="text-[10px] font-black text-slate-500 mr-1 uppercase flex items-center gap-1">
                           <i className="fas fa-layer-group text-blue-400"></i> التصنيف الفرعي (إلزامي)
                        </label>
                        <select 
                          className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                          value={card.subType}
                          onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, subType: e.target.value} : c))}
                        >
                          <option value="">اختر النوع من القائمة...</option>
                          {subTypes.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    )}

                    {/* 2. Conditional Questions (ShowIf Logic) */}
                    {itemQuestions.length > 0 && (
                      <div className="bg-slate-50/50 p-5 rounded-[1.8rem] border border-slate-100 space-y-5 shadow-inner">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تعبئة البيانات الشرطية</h4>
                         </div>
                         {itemQuestions.map((q: any, qIdx: number) => {
                           // التحقق من الشرطية (Logic)
                           if (!shouldShowQuestion(q, card.answers)) return null;

                           return (
                             <div key={qIdx} className="space-y-2 animate-in fade-in zoom-in duration-200">
                                <label className="text-[11px] font-black text-slate-700 block pr-1">
                                    {q.label} {q.required && <span className="text-red-500">*</span>}
                                </label>
                                {q.type === 'select' ? (
                                  <select 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:border-blue-500 outline-none"
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  >
                                    <option value="">-- اختر الإجابة --</option>
                                    {q.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : q.type === 'boolean' ? (
                                  <div className="flex gap-2">
                                    {['نعم', 'لا'].map(opt => (
                                      <button
                                        key={opt}
                                        onClick={() => handleUpdateAnswer(card.id, q.label, opt)}
                                        className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${card.answers[q.label] === opt ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:bg-white hover:border-blue-300'}`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:border-blue-500 outline-none"
                                    placeholder="اكتب الإجابة هنا..."
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  />
                                )}
                             </div>
                           );
                         })}
                      </div>
                    )}

                    {/* 3. Quantity / Counter */}
                    <div className="flex items-center justify-between bg-emerald-50/20 p-4 rounded-[1.8rem] border border-emerald-100/30">
                      <div className="flex flex-col">
                         <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tighter">الكمية / الإجمالي</span>
                         <span className="text-[8px] text-emerald-400 font-bold">Total Done Units</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-1 rounded-2xl shadow-sm border border-emerald-100">
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all"><i className="fas fa-minus"></i></button>
                          <span className="w-8 text-center font-black text-sm text-slate-800">{card.count}</span>
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><i className="fas fa-plus"></i></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FIXED ACTION BAR */}
      <div className="fixed bottom-20 lg:bottom-8 left-4 right-4 flex gap-3 z-50">
        <button 
          onClick={() => setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {} }])} 
          className="flex-1 bg-white text-slate-700 border border-gray-200 py-4.5 rounded-[1.5rem] font-black shadow-xl text-xs flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <i className="fas fa-plus"></i> حركة أخرى
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-[2.5] bg-blue-600 text-white py-4.5 rounded-[1.5rem] font-black shadow-2xl shadow-blue-500/40 text-xs flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
           {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-double"></i>}
           إرسال التقييم للنظام
        </button>
      </div>

      {/* Suggest Item Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center text-2xl mb-4 shadow-sm">
                    <i className="fas fa-file-signature"></i>
                 </div>
                 <h4 className="text-sm font-black text-gray-800">اقتراح بند جديد</h4>
                 <p className="text-[10px] text-gray-400 font-bold mt-1">هذا البند سيحتاج لاعتماد الإدارة قبل ظهوره بشكل رسمي</p>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">اسم البند</label>
                    <input type="text" value={suggestForm.sub_item} onChange={e => setSuggestForm({...suggestForm, sub_item: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-right text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none" placeholder="اسم البند المقترح..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">كود التمييز (إن وجد)</label>
                    <input type="text" value={suggestForm.code} onChange={e => setSuggestForm({...suggestForm, code: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-right text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none" placeholder="مثال: X-101" />
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={handleSaveSuggest} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-black text-[12px] shadow-lg shadow-blue-500/20">تأكيد الإرسال</button>
                 <button onClick={() => setShowSuggestModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-3.5 rounded-2xl font-black text-[12px]">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

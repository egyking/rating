
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
    return text.trim()
      .replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '').toLowerCase();
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

  const shouldShowQuestion = (question: any, cardAnswers: any) => {
    if (!question.showIf) return true;
    const { field, value } = question.showIf;
    return cardAnswers[field] == value; 
  };

  const getQuestionType = (q: any) => {
    const definedType = (q.type || '').toLowerCase();
    if (definedType === 'select' || (q.options && Array.isArray(q.options) && q.options.length > 0)) {
        return 'select';
    }
    if (definedType === 'boolean' || definedType === 'radio') {
        return 'boolean';
    }
    return 'text';
  };

  const safeJsonParse = (data: any) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
    return [];
  };

  // Helper to safely extract label from string or object option
  const getOptionLabel = (opt: any) => {
    if (typeof opt === 'object' && opt !== null) {
      return opt.text || opt.label || opt.name || opt.value || JSON.stringify(opt);
    }
    return String(opt);
  };

  // Helper to safely extract value from string or object option
  const getOptionValue = (opt: any) => {
    if (typeof opt === 'object' && opt !== null) {
      return opt.value || opt.id || opt.text || JSON.stringify(opt);
    }
    return String(opt);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const validCards = cards.filter(card => card.itemId);
    if (validCards.length === 0) return alert('يرجى اختيار بند واحد على الأقل');

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
        alert(`✅ تم إرسال البيانات بنجاح`);
        onSaved();
      } else {
        alert(`❌ خطأ: ${res.error?.message}`);
      }
    } catch (error: any) {
      alert('❌ فشل في الاتصال بالخادم');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-blue-600"></i></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-40 px-2">
      {/* Date Header */}
      <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <i className="fas fa-calendar-day text-blue-500"></i>
           <span className="text-[10px] font-black text-gray-400 uppercase">تاريخ التقرير</span>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none p-0 font-black text-gray-800 text-xs text-left" />
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          const currentQuery = searchQuery[card.id] || '';
          const filtered = itemsDB.filter(i => 
            normalizeArabic(i.sub_item).includes(normalizeArabic(currentQuery)) || 
            normalizeArabic(i.code).includes(normalizeArabic(currentQuery))
          ).slice(0, 10);

          let itemQuestions: any[] = [];
          let subTypes: any[] = [];
          if (selectedItem) {
             itemQuestions = safeJsonParse(selectedItem.questions);
             subTypes = safeJsonParse(selectedItem.sub_types);
          }

          return (
            <div key={card.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-visible transition-all">
              <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-gray-100 rounded-t-[2rem]">
                <span className="text-[10px] font-black text-slate-400">حركة #{index + 1}</span>
                {cards.length > 1 && (
                  <button onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>
              
              <div className="p-5 space-y-5">
                {/* Search / Selector */}
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className={`w-full bg-gray-50 border rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all ${isSearchOpen[card.id] ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <i className="fas fa-search text-gray-300 text-xs"></i>
                    {selectedItem ? (
                      <div className="flex-1 text-right">
                        <p className="font-black text-slate-800 text-xs">{selectedItem.sub_item}</p>
                        <p className="text-[9px] text-blue-500 font-bold">{selectedItem.code}</p>
                      </div>
                    ) : <p className="text-gray-400 text-xs font-bold">اختر البند الفرعي...</p>}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-[70] bg-white border border-gray-200 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in zoom-in duration-150">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="ابحث هنا..."
                        className="w-full bg-gray-50 border-b border-gray-100 p-4 text-xs font-bold outline-none"
                        value={currentQuery}
                        onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                      />
                      <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? filtered.map(item => (
                          <div key={item.id} onClick={() => handleSelectItem(card.id, item)} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center group">
                            <div className="text-right">
                               <p className="font-black text-slate-700 text-xs group-hover:text-blue-700">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400">{item.code}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="p-6 text-center">
                            <button onClick={() => { setActiveCardIdForSuggest(card.id); setSuggestForm({ ...suggestForm, sub_item: currentQuery }); setShowSuggestModal(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg">إضافة كبند مقترح</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* الأسئلة المولدة ديناميكياً - Dynamic Pop-up Area */}
                {selectedItem && (
                  <div className="space-y-5 animate-in slide-in-from-top-3 duration-500">
                    
                    {/* التصنيف الفرعي (إذا وُجد) */}
                    {subTypes.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 mr-1 uppercase flex items-center gap-1">
                           <i className="fas fa-tags text-blue-300"></i> التصنيف الفرعي
                        </label>
                        <select 
                          className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 text-xs font-black outline-none focus:ring-2 focus:ring-blue-100"
                          value={card.subType}
                          onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, subType: e.target.value} : c))}
                        >
                          <option value="">اختر النوع...</option>
                          {subTypes.map((st: any, idx) => (
                            <option key={idx} value={getOptionValue(st)}>{getOptionLabel(st)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* الأسئلة المخصصة من عمود Questions */}
                    {itemQuestions.length > 0 && (
                      <div className="bg-blue-50/30 p-5 rounded-[1.5rem] border border-blue-100/50 space-y-4">
                         <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">البيانات الإضافية المطلوبة</h4>
                         {itemQuestions.map((q: any, qIdx: number) => {
                           if (!shouldShowQuestion(q, card.answers)) return null;

                           const qType = getQuestionType(q);

                           return (
                             <div key={qIdx} className="space-y-1.5 animate-in fade-in duration-300">
                                <label className="text-[11px] font-black text-slate-700 pr-1">{q.label} {q.required && <span className="text-red-500">*</span>}</label>
                                
                                {qType === 'select' ? (
                                  <select 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500"
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  >
                                    <option value="">-- اختر من القائمة --</option>
                                    {q.options?.map((opt: any, optIdx: number) => (
                                      <option key={optIdx} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                                    ))}
                                  </select>
                                ) : qType === 'boolean' ? (
                                  <div className="flex gap-2">
                                    {['نعم', 'لا'].map(opt => (
                                      <button
                                        key={opt}
                                        onClick={() => handleUpdateAnswer(card.id, q.label, opt)}
                                        className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${card.answers[q.label] === opt ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'}`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500"
                                    placeholder="اكتب الإجابة..."
                                    value={card.answers[q.label] || ''}
                                    onChange={e => handleUpdateAnswer(card.id, q.label, e.target.value)}
                                  />
                                )}
                             </div>
                           );
                         })}
                      </div>
                    )}

                    {/* العداد (Quantity) */}
                    <div className="flex items-center justify-between bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/30">
                      <span className="text-[11px] font-black text-emerald-800 uppercase">إجمالي العدد المنجز</span>
                      <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-emerald-100">
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"><i className="fas fa-minus text-xs"></i></button>
                          <span className="w-8 text-center font-black text-sm text-slate-800">{card.count}</span>
                          <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg"><i className="fas fa-plus text-xs"></i></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-20 lg:bottom-10 left-4 right-4 flex gap-3 z-50">
        <button 
          onClick={() => setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {} }])} 
          className="flex-1 bg-white text-slate-700 border border-gray-200 py-4 rounded-2xl font-black shadow-lg text-xs"
        >
          <i className="fas fa-plus mr-1"></i> حركة أخرى
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-blue-500/40 text-xs flex items-center justify-center gap-2"
        >
           {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
           إرسال التقييم
        </button>
      </div>

      {/* Suggest Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-300">
              <h4 className="text-sm font-black text-center text-gray-800 uppercase tracking-widest">مقترح بند جديد</h4>
              <div className="space-y-4">
                 <input type="text" value={suggestForm.sub_item} onChange={e => setSuggestForm({...suggestForm, sub_item: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-right text-xs" placeholder="اسم البند..." />
                 <input type="text" value={suggestForm.code} onChange={e => setSuggestForm({...suggestForm, code: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-right text-xs" placeholder="كود التمييز..." />
              </div>
              <div className="flex gap-3">
                 <button onClick={async () => {
                    setIsSaving(true);
                    const res = await supabaseService.saveItem({ ...suggestForm, status: 'pending' });
                    if(res.success && res.data) {
                       setItemsDB(prev => [...prev, res.data as EvaluationItem]);
                       handleSelectItem(activeCardIdForSuggest!, res.data as EvaluationItem);
                       setShowSuggestModal(false);
                    }
                    setIsSaving(false);
                 }} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[11px]">حفظ</button>
                 <button onClick={() => setShowSuggestModal(false)} className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-black text-[11px]">إغلاق</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

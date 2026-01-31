
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

  // حالة البحث لكل بطاقة
  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});
  const [isSearchOpen, setIsSearchOpen] = useState<{ [key: number]: boolean }>({});
  const searchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cards, setCards] = useState<any[]>([{ 
    id: Date.now(), 
    itemId: '', 
    count: 1, 
    subType: '', 
    notes: '', 
    answers: {}, 
    generatedEvals: [] // كل عنصر هنا سيكون: { item, code, count, sourceQuestion }
  }]);

  useEffect(() => {
    supabaseService.getItems().then(items => {
      setItemsDB(items);
      setLoading(false);
    });
  }, []);

  // إغلاق قوائم البحث عند الضغط خارجها
  useEffect(() => {
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

  const addCard = () => {
    setCards([...cards, { id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] }]);
  };

  const removeCard = (id: number) => {
    if (cards.length > 1) setCards(cards.filter(c => c.id !== id));
  };

  const handleSelectItem = (cardId: number, item: EvaluationItem) => {
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId: item.id, subType: '', answers: {}, generatedEvals: [] 
    } : c));
    setIsSearchOpen(prev => ({ ...prev, [cardId]: false }));
    setSearchQuery(prev => ({ ...prev, [cardId]: '' }));
  };

  const updateGeneratedCount = (cardId: number, genIdx: number, delta: number) => {
    setCards(prev => prev.map(card => {
      if (card.id !== cardId) return card;
      const newGens = [...card.generatedEvals];
      newGens[genIdx].count = Math.max(1, (newGens[genIdx].count || 1) + delta);
      return { ...card, generatedEvals: newGens };
    }));
  };

  const handleAnswerChange = (cardId: number, questionIndex: number, value: any, question: any) => {
    setCards(prevCards => prevCards.map(card => {
      if (card.id !== cardId) return card;
      const newAnswers = { ...card.answers, [questionIndex]: value };
      
      // منطق التوليد (JSON Logic)
      let newGenerated = [...(card.generatedEvals || [])].filter(g => g.sourceQuestionIndex !== questionIndex);
      const selectedOption = question.options?.find((opt: any) => opt.value === value);
      
      if (selectedOption?.evaluations) {
        selectedOption.evaluations.forEach((ev: any) => {
          newGenerated.push({ 
            item: ev.subItem || ev.item, 
            code: ev.code || 'AUTO', 
            count: ev.defaultCount || 1,
            mainItem: ev.mainItem || 'توليد تلقائي',
            dept: ev.dept || card.department || 'الجنوب',
            sourceQuestionIndex: questionIndex, 
            sourceQuestion: question.question 
          });
        });
      }
      return { ...card, answers: newAnswers, generatedEvals: newGenerated };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const finalBatch: any[] = [];
    
    for (const card of cards) {
      const item = itemsDB.find(i => i.id === card.itemId);
      if (!item) continue;

      // 1. إضافة البند الأساسي
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
        metadata: { is_base: true }
      });

      // 2. إضافة البنود المولدة (إذا اختارها المفتش)
      card.generatedEvals.forEach((gen: any) => {
        finalBatch.push({
          date,
          inspector_id: currentUser.id,
          inspector_name: currentUser.fullName,
          sub_item: gen.item,
          main_item: gen.mainItem, // يتم الحفظ بالبند الرئيسي المرتبط بالـ JSON
          code: gen.code,
          department: gen.dept,
          count: gen.count,
          notes: `توليد بناءً على: ${gen.sourceQuestion}`,
          metadata: { is_generated: true, parent_item: item.sub_item }
        });
      });
    }

    if (finalBatch.length === 0) {
      setIsSaving(false);
      return alert('⚠️ يرجى اختيار بند واحد على الأقل');
    }

    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) {
      alert(`✅ تم حفظ ${res.count} سجل بنجاح.`);
      onSaved();
    } else {
      alert('❌ فشل الحفظ: ' + res.error?.message);
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-40 px-2 lg:px-0">
      {/* Date Select */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-4">
        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">📅 التاريخ المختار</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-800" />
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
            <div key={card.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
                <span className="text-xs font-black flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-[10px]">{index + 1}</span>
                  تسجيل حركة ميدانية
                </span>
                {cards.length > 1 && (
                  <button onClick={() => removeCard(card.id)} className="text-gray-400 hover:text-red-400"><i className="fas fa-times-circle"></i></button>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                {/* Search Engine Like Old Sheets */}
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">📋 ابحث بالاسم أو الكود (مثل Sheets)</label>
                  <div 
                    onClick={() => setIsSearchOpen(prev => ({ ...prev, [card.id]: true }))}
                    className="w-full bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl p-4 transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <i className="fas fa-search text-gray-300"></i>
                    {selectedItem ? (
                      <div className="flex-1 overflow-hidden">
                        <p className="font-black text-slate-800 truncate text-sm">{selectedItem.sub_item}</p>
                        <p className="text-[10px] text-blue-500 font-bold">{selectedItem.code}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm font-bold italic">اكتب هنا للبحث...</p>
                    )}
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 overflow-hidden">
                      <div className="p-3 border-b border-gray-50 bg-gray-50">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="مثلاً: جولة، 101، مخالفة..."
                          value={currentQuery}
                          onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                          className="w-full bg-white border-2 border-blue-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? filtered.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => handleSelectItem(card.id, item)}
                            className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors flex justify-between items-center"
                          >
                            <div>
                               <p className="font-black text-slate-700 text-xs">{item.sub_item}</p>
                               <p className="text-[9px] text-gray-400 font-bold">{item.main_item}</p>
                            </div>
                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[9px] font-black">{item.code}</span>
                          </div>
                        )) : (
                          <div className="p-8 text-center text-gray-400 text-xs font-bold">لا توجد نتائج مطابقة</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Count with +/- buttons */}
                <div className="flex items-center gap-4 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                   <div className="flex-1">
                      <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">🔢 العدد</label>
                      <p className="text-[9px] text-gray-400 font-bold">العدد الإجمالي للحركة المحددة</p>
                   </div>
                   <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm">
                      <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: Math.max(1, c.count - 1)} : c))} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"><i className="fas fa-minus"></i></button>
                      <span className="w-12 text-center font-black text-lg text-slate-800">{card.count}</span>
                      <button onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, count: c.count + 1} : c))} className="w-10 h-10 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><i className="fas fa-plus"></i></button>
                   </div>
                </div>

                {/* Sub Types Selector */}
                {selectedItem?.sub_types?.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">🔖 تصنيف الإجراء</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.sub_types.map((t: string) => (
                        <button 
                          key={t}
                          onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, subType: t} : c))}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${card.subType === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Questions Logic */}
                {selectedItem?.questions?.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                    <p className="font-black text-slate-700 text-xs flex items-center gap-2">
                       <i className="fas fa-question-circle text-blue-400"></i>
                       {q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt: any) => (
                        <button 
                          key={opt.value}
                          onClick={() => handleAnswerChange(card.id, qIdx, opt.value, q)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${card.answers[qIdx] === opt.value ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Generated Evaluations with editable Counts */}
                {card.generatedEvals?.length > 0 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 border-t border-gray-100 pt-6">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                       <i className="fas fa-magic"></i> بنود تم توليدها تلقائياً
                    </h4>
                    <div className="space-y-2">
                      {card.generatedEvals.map((g: any, gIdx: number) => (
                        <div key={gIdx} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center group">
                          <div className="flex-1 overflow-hidden">
                             <p className="font-black text-emerald-700 text-[11px] truncate">{g.item}</p>
                             <p className="text-[9px] text-emerald-600 font-bold uppercase">{g.mainItem} | {g.code}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm border border-emerald-100">
                             <button onClick={() => updateGeneratedCount(card.id, gIdx, -1)} className="w-8 h-8 text-emerald-400 hover:text-red-500"><i className="fas fa-minus text-xs"></i></button>
                             <span className="w-6 text-center font-black text-sm text-emerald-700">{g.count}</span>
                             <button onClick={() => updateGeneratedCount(card.id, gIdx, 1)} className="w-8 h-8 text-emerald-400 hover:text-blue-500"><i className="fas fa-plus text-xs"></i></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <textarea 
                  value={card.notes}
                  onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, notes: e.target.value} : c))}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-xs min-h-[70px] focus:ring-2 focus:ring-blue-100"
                  placeholder="هل توجد أي ملاحظات ميدانية أخرى؟"
                ></textarea>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Mobile Bottom Bar */}
      <div className="fixed bottom-20 lg:bottom-10 left-4 right-4 flex gap-3 z-50">
        <button onClick={addCard} className="flex-1 bg-white text-blue-600 border-2 border-blue-600 p-4 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <i className="fas fa-plus-circle text-lg"></i> إضافة بند آخر
        </button>
        <button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-blue-600 text-white p-4 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-2 shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-transform">
          {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save text-lg"></i>}
          إرسال الحركة بالكامل
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

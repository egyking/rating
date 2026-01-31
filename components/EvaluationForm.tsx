
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

  // البحث عن البنود
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState<{ [key: number]: boolean }>({});
  const searchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cards, setCards] = useState<any[]>([{ 
    id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] 
  }]);

  useEffect(() => {
    supabaseService.getItems().then(items => {
      setItemsDB(items);
      setLoading(false);
    });
  }, []);

  const addCard = () => {
    setCards([...cards, { 
      id: Date.now(), itemId: '', count: 1, subType: '', notes: '', answers: {}, generatedEvals: [] 
    }]);
  };

  const removeCard = (id: number) => {
    if (cards.length > 1) setCards(cards.filter(c => c.id !== id));
  };

  const handleSelectItem = (cardId: number, item: EvaluationItem) => {
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId: item.id, subType: '', answers: {}, generatedEvals: [] 
    } : c));
    setIsSearchOpen({ ...isSearchOpen, [cardId]: false });
    setSearchQuery('');
  };

  const updateCount = (cardId: number, delta: number) => {
    setCards(cards.map(c => c.id === cardId ? { ...c, count: Math.max(1, c.count + delta) } : c));
  };

  const handleAnswerChange = (cardId: number, questionIndex: number, value: any, question: any) => {
    setCards(prevCards => prevCards.map(card => {
      if (card.id !== cardId) return card;
      const newAnswers = { ...card.answers, [questionIndex]: value };
      let newGenerated = [...(card.generatedEvals || [])].filter(g => g.sourceQuestionIndex !== questionIndex);
      const selectedOption = question.options?.find((opt: any) => opt.value === value);
      if (selectedOption?.evaluations) {
        selectedOption.evaluations.forEach((ev: any) => {
          newGenerated.push({ ...ev, sourceQuestionIndex: questionIndex, sourceQuestion: question.question });
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
      finalBatch.push({
        date, inspector_id: currentUser.id, inspector_name: currentUser.fullName,
        item_id: card.itemId, sub_item: item.sub_item, main_item: item.main_item,
        sub_type: card.subType, code: item.code, department: item.department,
        count: card.count, notes: card.notes, answers: card.answers, metadata: { is_base: true }
      });
      card.generatedEvals.forEach((gen: any) => {
        finalBatch.push({
          date, inspector_id: currentUser.id, inspector_name: currentUser.fullName,
          sub_item: gen.subItem || gen.item, main_item: gen.mainItem || item.main_item,
          code: gen.code || 'GEN-00', department: gen.dept || item.department,
          count: gen.defaultCount || 1, notes: `توليد تلقائي: ${gen.sourceQuestion}`,
          metadata: { is_generated: true, source_item: item.sub_item }
        });
      });
    }
    if (finalBatch.length === 0) { setIsSaving(false); return alert('يرجى اختيار بند واحد على الأقل'); }
    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) { alert(`✅ تم حفظ ${res.count} سجل بنجاح`); onSaved(); }
    else alert('❌ فشل الحفظ: ' + res.error?.message);
  };

  const filteredItems = itemsDB.filter(item => 
    item.sub_item.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="max-w-xl mx-auto space-y-4 lg:space-y-8 pb-32">
      {/* Date Header - Compact on mobile */}
      <div className="bg-white p-4 lg:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div>
           <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">📅 التاريخ</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold" />
        </div>
      </div>

      <div className="space-y-4 lg:space-y-6">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          return (
            <div key={card.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-800 px-6 py-3 flex justify-between items-center text-white">
                <span className="text-xs font-bold flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-[10px]">{index + 1}</span>
                  إدخال حركة
                </span>
                {cards.length > 1 && (
                  <button onClick={() => removeCard(card.id)} className="text-slate-400 hover:text-red-400"><i className="fas fa-trash-alt"></i></button>
                )}
              </div>
              
              <div className="p-5 lg:p-8 space-y-6">
                {/* Searchable Sub-item Select (The "Old Sheets" logic) */}
                {/* Fix: Ref callback must return void. Wrapped assignment in curly braces to avoid implicit return. */}
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">📋 ابحث عن البند أو الكود</label>
                  <div 
                    onClick={() => setIsSearchOpen({ ...isSearchOpen, [card.id]: true })}
                    className="w-full bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div className="flex-1 overflow-hidden">
                      {selectedItem ? (
                        <div>
                          <p className="font-black text-gray-800 text-sm truncate">{selectedItem.sub_item}</p>
                          <p className="text-[10px] text-blue-600 font-bold">{selectedItem.code}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm font-bold">انقر للبحث والاختيار...</p>
                      )}
                    </div>
                    <i className={`fas ${isSearchOpen[card.id] ? 'fa-chevron-up' : 'fa-search'} text-gray-300`}></i>
                  </div>

                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-gray-50">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="اكتب الاسم أو الكود هنا..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredItems.length > 0 ? (
                          filteredItems.map(item => (
                            <div 
                              key={item.id} 
                              onClick={() => handleSelectItem(card.id, item)}
                              className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                            >
                              <p className="font-black text-gray-800 text-sm">{item.sub_item}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.main_item}</span>
                                <span className="bg-blue-100 text-blue-600 text-[9px] px-2 py-0.5 rounded-md font-black">{item.code}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-400 text-xs font-bold">لا توجد نتائج مطابقة</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile-Friendly Count Control */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">🔢 العدد / الوحدات</label>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1">
                       <button onClick={() => updateCount(card.id, -1)} className="w-12 h-12 bg-white rounded-xl shadow-sm text-gray-400 flex items-center justify-center hover:text-red-500"><i className="fas fa-minus"></i></button>
                       <input type="number" min="1" value={card.count} onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, count: parseInt(e.target.value) || 1} : c))} className="flex-1 bg-transparent border-none text-center font-black text-lg focus:ring-0" />
                       <button onClick={() => updateCount(card.id, 1)} className="w-12 h-12 bg-white rounded-xl shadow-sm text-gray-400 flex items-center justify-center hover:text-blue-500"><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                </div>

                {/* Sub Types - Toggle Buttons on mobile */}
                {selectedItem?.sub_types?.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">🔖 التصنيف الفرعي</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.sub_types.map((t: string) => (
                        <button 
                          key={t}
                          onClick={() => setCards(cards.map(c => c.id === card.id ? {...c, subType: t} : c))}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${card.subType === t ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions Logic */}
                {selectedItem?.questions?.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <p className="font-black text-slate-700 text-xs">{q.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt: any) => (
                        <button 
                          key={opt.value}
                          onClick={() => handleAnswerChange(card.id, qIdx, opt.value, q)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${card.answers[qIdx] === opt.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Generated Preview */}
                {card.generatedEvals?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {card.generatedEvals.map((g: any, i: number) => (
                      <span key={i} className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[8px] font-black border border-emerald-100">
                        ✨ {g.subItem || g.item} (+{g.defaultCount || 1})
                      </span>
                    ))}
                  </div>
                )}

                <textarea 
                  value={card.notes}
                  onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, notes: e.target.value} : c))}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-xs min-h-[60px]"
                  placeholder="ملاحظات الحركة (اختياري)..."
                ></textarea>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Buttons - Optimised for mobile reach */}
      <div className="fixed bottom-20 lg:bottom-10 left-4 right-4 flex gap-3 z-40">
        <button onClick={addCard} className="flex-1 bg-white text-blue-600 border-2 border-blue-600 p-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
          <i className="fas fa-plus"></i> إضافة حركة
        </button>
        <button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-blue-600 text-white p-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 shadow-blue-500/20 disabled:opacity-50">
          {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>}
          حفظ الكل
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

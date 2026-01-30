
import React, { useState, useEffect } from 'react';
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

  const handleItemChange = (cardId: number, itemId: string) => {
    const item = itemsDB.find(i => i.id === itemId);
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId, subType: '', answers: {}, generatedEvals: [] 
    } : c));
  };

  const handleAnswerChange = (cardId: number, questionIndex: number, value: any, question: any) => {
    setCards(prevCards => prevCards.map(card => {
      if (card.id !== cardId) return card;

      const newAnswers = { ...card.answers, [questionIndex]: value };
      let newGenerated = [...(card.generatedEvals || [])];

      // منطق التوليد التلقائي (Generated Evaluations) من الكود القديم
      if (question.generateEvaluations && question.options) {
        const selectedOption = question.options.find((opt: any) => opt.value === value);
        newGenerated = newGenerated.filter(g => g.sourceQuestionIndex !== questionIndex);
        
        if (selectedOption?.evaluations) {
          selectedOption.evaluations.forEach((ev: any) => {
            newGenerated.push({ 
              ...ev, 
              sourceQuestionIndex: questionIndex, 
              sourceQuestion: question.question 
            });
          });
        }
      }

      return { ...card, answers: newAnswers, generatedEvals: newGenerated };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const finalBatch: any[] = [];

    cards.forEach(card => {
      const item = itemsDB.find(i => i.id === card.itemId);
      if (!item) return;

      finalBatch.push({
        date,
        inspector_id: currentUser.id,
        inspector_name: currentUser.fullName,
        item_id: card.itemId,
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

      card.generatedEvals.forEach((gen: any) => {
        finalBatch.push({
          date,
          inspector_id: currentUser.id,
          inspector_name: currentUser.fullName,
          sub_item: gen.subItem,
          main_item: gen.mainItem,
          code: gen.code,
          department: gen.dept,
          count: gen.defaultCount || 1,
          notes: `توليد تلقائي: ${gen.sourceQuestion}`,
          metadata: { is_generated: true, source_item: item.sub_item }
        });
      });
    });

    if (finalBatch.length === 0) {
      alert('يرجى اختيار بنود للتقييم');
      setIsSaving(false);
      return;
    }

    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) {
      alert(`✅ تم حفظ ${res.count} سجل بنجاح`);
      onSaved();
    }
  };

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase">📅 تاريخ الحركة</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 focus:border-blue-500 transition-all font-bold" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase">👤 المفتش</label>
          <div className="w-full bg-gray-100 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-600">
            {currentUser.fullName}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          return (
            <div key={card.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-slate-800 px-8 py-4 flex justify-between items-center">
                <span className="text-white font-bold text-sm">البطاقة #{index + 1}</span>
                {cards.length > 1 && (
                  <button onClick={() => removeCard(card.id)} className="text-slate-400 hover:text-red-400">
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">📋 البند الفرعي</label>
                    <select 
                      value={card.itemId} 
                      onChange={e => handleItemChange(card.id, e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">اختر البند...</option>
                      {itemsDB.map(item => <option key={item.id} value={item.id}>{item.sub_item} ({item.department})</option>)}
                    </select>
                  </div>

                  {selectedItem?.sub_types?.length > 0 && (
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🔖 النوع</label>
                      <select 
                        value={card.subType} 
                        onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, subType: e.target.value} : c))} 
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold"
                      >
                        <option value="">اختر...</option>
                        {selectedItem.sub_types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🔢 العدد</label>
                    <input type="number" min="1" value={card.count} onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, count: parseInt(e.target.value)} : c))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold" />
                  </div>
                </div>

                {selectedItem?.questions?.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <p className="font-bold text-slate-700 text-sm">{q.question}</p>
                    <div className="flex flex-wrap gap-3">
                      {q.options?.map((opt: any) => (
                        <button 
                          key={opt.value}
                          onClick={() => handleAnswerChange(card.id, qIdx, opt.value, q)}
                          className={`px-6 py-2 rounded-xl font-bold transition-all border-2 text-xs ${card.answers[qIdx] === opt.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {card.generatedEvals?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {card.generatedEvals.map((g: any, i: number) => (
                      <span key={i} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-emerald-100">
                        ✨ بند مرتبط: {g.subItem}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-40 bg-white/90 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl border border-gray-100">
        <button onClick={addCard} className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-2xl font-black hover:bg-blue-50 transition-all flex items-center gap-2">
          <i className="fas fa-plus"></i> إضافة بطاقة
        </button>
        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50">
          {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
          حفظ الكل
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

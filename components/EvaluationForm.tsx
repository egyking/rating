
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
    setCards(cards.map(c => c.id === cardId ? { 
      ...c, itemId, subType: '', answers: {}, generatedEvals: [] 
    } : c));
  };

  const handleAnswerChange = (cardId: number, questionIndex: number, value: any, question: any) => {
    setCards(prevCards => prevCards.map(card => {
      if (card.id !== cardId) return card;

      const newAnswers = { ...card.answers, [questionIndex]: value };
      
      // منطق التوليد التلقائي (Generated Evaluations)
      // إذا كان الخيار المختار يحتوي على "evaluations" في الـ JSON
      let newGenerated = [...(card.generatedEvals || [])];
      
      // حذف التوليدات القديمة المرتبطة بنفس السؤال لتجنب التكرار عند تغيير الإجابة
      newGenerated = newGenerated.filter(g => g.sourceQuestionIndex !== questionIndex);
      
      const selectedOption = question.options?.find((opt: any) => opt.value === value);
      if (selectedOption?.evaluations) {
        selectedOption.evaluations.forEach((ev: any) => {
          newGenerated.push({ 
            ...ev, 
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

      // البند الأساسي
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

      // البنود المولدة تلقائياً من منطق الـ JSON
      card.generatedEvals.forEach((gen: any) => {
        finalBatch.push({
          date,
          inspector_id: currentUser.id,
          inspector_name: currentUser.fullName,
          sub_item: gen.subItem || gen.item,
          main_item: gen.mainItem || item.main_item,
          code: gen.code || 'GEN-00',
          department: gen.dept || item.department,
          count: gen.defaultCount || 1,
          notes: `توليد تلقائي بناءً على: ${gen.sourceQuestion}`,
          metadata: { is_generated: true, source_item: item.sub_item }
        });
      });
    }

    if (finalBatch.length === 0) {
      alert('⚠️ يرجى اختيار بند واحد على الأقل');
      setIsSaving(false);
      return;
    }

    const res = await supabaseService.saveBatchEvaluations(finalBatch);
    setIsSaving(false);
    if (res.success) {
      alert(`✅ تم حفظ ${res.count} سجل (بما في ذلك البنود المولدة تلقائياً)`);
      onSaved();
    } else {
      alert('❌ حدث خطأ أثناء الحفظ: ' + (res.error?.message || 'خطأ مجهول'));
    }
  };

  if (loading) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      {/* Date & User Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase">📅 تاريخ الحركة</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 focus:border-blue-500 transition-all font-bold" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase">👤 المفتش</label>
          <div className="w-full bg-gray-100 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-600 flex items-center gap-3">
            <i className="fas fa-user-check text-blue-500"></i>
            {currentUser.fullName}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          return (
            <div key={card.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-slate-800 px-8 py-4 flex justify-between items-center">
                <span className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center text-[10px]">{index + 1}</span>
                  بطاقة التقييم
                </span>
                {cards.length > 1 && (
                  <button onClick={() => removeCard(card.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">📋 البند الفرعي (الحركة)</label>
                    <select 
                      value={card.itemId} 
                      onChange={e => handleItemChange(card.id, e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">-- اختر البند المراد تسجيله --</option>
                      {itemsDB.map(item => <option key={item.id} value={item.id}>{item.sub_item} | {item.code}</option>)}
                    </select>
                  </div>

                  {selectedItem?.sub_types?.length > 0 && (
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🔖 نوع الإجراء</label>
                      <select 
                        value={card.subType} 
                        onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, subType: e.target.value} : c))} 
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold"
                      >
                        <option value="">اختر النوع...</option>
                        {selectedItem.sub_types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase">🔢 العدد</label>
                    <input type="number" min="1" value={card.count} onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, count: parseInt(e.target.value) || 1} : c))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold" />
                  </div>
                </div>

                {/* نظام الأسئلة الذكي المعتمد على الـ JSON */}
                {selectedItem?.questions && selectedItem.questions.length > 0 && (
                  <div className="space-y-4 border-t border-gray-50 pt-6">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">أسئلة تفاعلية (منطق JSON)</h4>
                    {selectedItem.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 space-y-4">
                        <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                           <i className="fas fa-question-circle text-blue-400"></i>
                           {q.question}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {q.options?.map((opt: any) => (
                            <button 
                              key={opt.value}
                              onClick={() => handleAnswerChange(card.id, qIdx, opt.value, q)}
                              className={`px-6 py-2.5 rounded-xl font-bold transition-all border-2 text-xs ${card.answers[qIdx] === opt.value ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
                            >
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* عرض التنبيه بالبنود التي سيتم توليدها تلقائياً */}
                {card.generatedEvals?.length > 0 && (
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                    <p className="text-[10px] font-black text-emerald-700 uppercase">✨ سيتم إضافة البنود التالية تلقائياً:</p>
                    <div className="flex flex-wrap gap-2">
                      {card.generatedEvals.map((g: any, i: number) => (
                        <span key={i} className="bg-white text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 shadow-sm">
                          {g.subItem || g.item} (+{g.defaultCount || 1})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-400 mb-2 uppercase">📝 ملاحظات إضافية</label>
                  <textarea 
                    value={card.notes}
                    onChange={e => setCards(cards.map(c => c.id === card.id ? {...c, notes: e.target.value} : c))}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm min-h-[80px]"
                    placeholder="أدخل أي ملاحظات تتعلق بهذه الحركة..."
                  ></textarea>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-40 bg-white/90 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl border border-gray-100">
        <button onClick={addCard} className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-2xl font-black hover:bg-blue-50 transition-all flex items-center gap-2">
          <i className="fas fa-plus-circle"></i> إضافة بطاقة
        </button>
        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50">
          {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          حفظ التقييمات
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

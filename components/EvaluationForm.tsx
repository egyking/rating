
import React, { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../supabase';
import { EvaluationItem, AuthUser } from '../types';

interface EvaluationFormProps {
  onSaved: () => void;
  currentUser: AuthUser;
}

// تعريفات الهيكلية الجديدة للأسئلة
interface EvaluationOutput {
  subItem: string;
  code: string;
  mainItem: string;
  dept: string;
  defaultCount?: number;
}

interface QuestionOption {
  text: string;
  value: string;
  evaluations?: EvaluationOutput[];
  requiresInput?: boolean;
  inputType?: string;
  inputLabel?: string;
}

interface QuestionSchema {
  question: string;
  type: 'choice' | 'multichoice' | 'yesno' | 'rating' | 'text' | 'choice_with_input';
  options?: QuestionOption[] | Record<string, any>;
  conditionalQuestions?: Record<string, QuestionSchema[]>; // للأسئلة المتداخلة
  generateEvaluations?: boolean;
  multipleSelection?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  labels?: Record<string, string>; // للتقييم
  evaluationsByRating?: Record<string, EvaluationOutput[]>; // للتقييم
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onSaved, currentUser }) => {
  const [itemsDB, setItemsDB] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Cards (Each card represents a flow starting from a Trigger Item)
  const [cards, setCards] = useState<any[]>([{ 
    id: Date.now(), 
    itemId: '', 
    answers: {}, 
    customCounts: {}, // لتخزين العدادات المعدلة يدوياً للبنود المولدة
    count: 1, // العداد الرئيسي للبند المختار نفسه
    notes: ''
  }]);

  // Search Logic
  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});
  const [isSearchOpen, setIsSearchOpen] = useState<{ [key: number]: boolean }>({});
  const searchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
      ...c, itemId: item.id, answers: {}, customCounts: {}, count: 1 
    } : c));
    setIsSearchOpen(prev => ({ ...prev, [cardId]: false }));
    setSearchQuery(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleAnswerChange = (cardId: number, questionIdx: string, value: any) => {
    setCards(prevCards => prevCards.map(c => {
      if (c.id !== cardId) return c;
      const newAnswers = { ...c.answers, [questionIdx]: value };
      return { ...c, answers: newAnswers };
    }));
  };

  const handleMainCountChange = (cardId: number, delta: number) => {
    setCards(cards.map(c => {
        if (c.id !== cardId) return c;
        return { ...c, count: Math.max(0, (c.count || 0) + delta) };
    }));
  };

  const handleCustomCountChange = (cardId: number, itemCode: string, delta: number) => {
    setCards(cards.map(c => {
      if (c.id !== cardId) return c;
      const currentCount = c.customCounts[itemCode] || 1;
      const newCount = Math.max(0, currentCount + delta);
      return { ...c, customCounts: { ...c.customCounts, [itemCode]: newCount } };
    }));
  };

  // --- Logic to Parse JSON and Generate Items ---

  const getGeneratedEvaluations = (card: any, selectedItem: EvaluationItem) => {
    if (!selectedItem || !selectedItem.questions) return [];
    
    let questions: QuestionSchema[] = [];
    try {
        questions = Array.isArray(selectedItem.questions) 
            ? selectedItem.questions 
            : JSON.parse(selectedItem.questions as any || '[]');
    } catch (e) { return []; }

    const generatedItems: EvaluationOutput[] = [];

    const processQuestions = (qs: QuestionSchema[], parentPrefix = '') => {
        qs.forEach((q, idx) => {
            const qKey = parentPrefix ? `${parentPrefix}_${idx}` : `${idx}`;
            const answer = card.answers[qKey];

            if (!answer) return;

            if (q.type === 'choice' || q.type === 'choice_with_input' || q.type === 'multichoice') {
                const selectedOptions = Array.isArray(answer) ? answer : [answer];
                const optionsArr = Array.isArray(q.options) ? q.options : [];
                
                selectedOptions.forEach((val: string) => {
                    const opt = optionsArr.find((o: any) => o.value === val);
                    if (opt && opt.evaluations) {
                        generatedItems.push(...opt.evaluations);
                    }
                });
            } else if (q.type === 'yesno') {
                const opts = q.options as Record<string, any>;
                const selectedOpt = opts[answer as string];
                if (selectedOpt && selectedOpt.evaluations) {
                    generatedItems.push(...selectedOpt.evaluations);
                }
            } else if (q.type === 'rating') {
                if (q.evaluationsByRating && q.evaluationsByRating[answer]) {
                    generatedItems.push(...q.evaluationsByRating[answer]);
                }
            }

            if (q.conditionalQuestions && q.conditionalQuestions[answer]) {
                processQuestions(q.conditionalQuestions[answer], qKey);
            }
        });
    };

    processQuestions(questions);
    return generatedItems;
  };

  // --- Rendering Components ---

  const renderQuestionInput = (q: QuestionSchema, qKey: string, card: any) => {
    const answer = card.answers[qKey];

    switch (q.type) {
        case 'choice':
        case 'choice_with_input':
            const options = Array.isArray(q.options) ? q.options : [];
            return (
                <div className="flex flex-wrap gap-2">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswerChange(card.id, qKey, opt.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                answer === opt.value 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                            }`}
                        >
                            {opt.text}
                        </button>
                    ))}
                </div>
            );

        case 'multichoice':
            const mOptions = Array.isArray(q.options) ? q.options : [];
            const currentSelected = Array.isArray(answer) ? answer : [];
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mOptions.map((opt, idx) => {
                        const isSelected = currentSelected.includes(opt.value);
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    const newSel = isSelected 
                                        ? currentSelected.filter((v: string) => v !== opt.value)
                                        : [...currentSelected, opt.value];
                                    handleAnswerChange(card.id, qKey, newSel);
                                }}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                                    isSelected 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-white text-gray-600 border-gray-200'
                                }`}
                            >
                                <span>{opt.text}</span>
                                {isSelected && <i className="fas fa-check-circle text-blue-600"></i>}
                            </button>
                        );
                    })}
                </div>
            );

        case 'yesno':
            const ynOptions = q.options as Record<string, any>;
            return (
                <div className="flex gap-3">
                    {['yes', 'no'].map((key) => {
                        const opt = ynOptions[key];
                        if (!opt) return null;
                        return (
                            <button
                                key={key}
                                onClick={() => handleAnswerChange(card.id, qKey, key)}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                                    answer === key 
                                    ? (key === 'yes' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500')
                                    : 'bg-white text-gray-500 border-gray-200'
                                }`}
                            >
                                {opt.text}
                            </button>
                        );
                    })}
                </div>
            );

        case 'rating':
            const range = Array.from({ length: (q.max || 5) - (q.min || 1) + 1 }, (_, i) => (i + (q.min || 1)).toString());
            return (
                <div className="flex justify-between gap-1 bg-gray-50 p-1 rounded-xl">
                    {range.map(val => (
                        <button
                            key={val}
                            onClick={() => handleAnswerChange(card.id, qKey, val)}
                            className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${
                                answer === val 
                                ? 'bg-amber-400 text-white shadow-sm transform scale-105' 
                                : 'text-gray-400 hover:bg-white'
                            }`}
                        >
                            {val}
                        </button>
                    ))}
                </div>
            );
            
        case 'text':
            return (
                <textarea
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 min-h-[80px]"
                    placeholder={q.question}
                    value={answer || ''}
                    onChange={(e) => handleAnswerChange(card.id, qKey, e.target.value)}
                />
            );

        default:
            return <p className="text-red-400 text-[10px]">نوع السؤال غير مدعوم: {q.type}</p>;
    }
  };

  const renderQuestionsRecursive = (questions: QuestionSchema[], card: any, parentPrefix = '') => {
    return questions.map((q, idx) => {
        const qKey = parentPrefix ? `${parentPrefix}_${idx}` : `${idx}`;
        const answer = card.answers[qKey];
        const isAnswered = answer !== undefined && answer !== null && answer !== '' && (Array.isArray(answer) ? answer.length > 0 : true);

        return (
            <div key={qKey} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {q.question}
                        {q.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderQuestionInput(q, qKey, card)}
                </div>

                {isAnswered && q.conditionalQuestions && q.conditionalQuestions[answer] && (
                    <div className="mr-3 pl-3 border-r-2 border-blue-100 space-y-4 mt-2">
                        {renderQuestionsRecursive(q.conditionalQuestions[answer], card, qKey)}
                    </div>
                )}
            </div>
        );
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    const validCards = cards.filter(card => card.itemId);
    if (validCards.length === 0) return alert('يرجى اختيار بند واحد على الأقل');

    setIsSaving(true);
    let allRecordsToSave: any[] = [];

    for (const card of validCards) {
        const itemDB = itemsDB.find(i => i.id === card.itemId);
        if (!itemDB) continue;

        const generatedItems = getGeneratedEvaluations(card, itemDB);

        // 1. حفظ البند الرئيسي (الأب) إذا كان له عدد
        if ((card.count || 0) > 0) {
            allRecordsToSave.push({
                date,
                inspector_id: currentUser.id === '00000000-0000-0000-0000-000000000000' ? null : currentUser.id,
                inspector_name: currentUser.fullName,
                item_id: itemDB.id,
                sub_item: itemDB.sub_item,
                main_item: itemDB.main_item,
                sub_type: '',
                code: itemDB.code,
                department: itemDB.department,
                count: card.count || 0,
                notes: card.notes || '',
                answers: card.answers,
                status: 'pending'
            });
        }

        // 2. حفظ البنود المولدة (الفرعية)
        generatedItems.forEach(genItem => {
            const countKey = genItem.code; 
            const finalCount = card.customCounts[countKey] !== undefined 
                ? card.customCounts[countKey] 
                : (genItem.defaultCount || 1);

            if (finalCount > 0) {
                allRecordsToSave.push({
                    date,
                    inspector_id: currentUser.id === '00000000-0000-0000-0000-000000000000' ? null : currentUser.id,
                    inspector_name: currentUser.fullName,
                    item_id: itemDB.id,
                    sub_item: genItem.subItem,
                    main_item: genItem.mainItem,
                    sub_type: '', 
                    code: genItem.code,
                    department: genItem.dept || itemDB.department,
                    count: finalCount,
                    notes: card.notes || '',
                    answers: card.answers,
                    metadata: { parent_item: itemDB.sub_item },
                    status: 'pending'
                });
            }
        });
    }

    if (allRecordsToSave.length === 0) {
        setIsSaving(false);
        return alert('لا توجد سجلات ذات كميات للحفظ (تأكد من العدادات).');
    }

    try {
      const res = await supabaseService.saveBatchEvaluations(allRecordsToSave);
      if (res.success) {
        alert(`✅ تم حفظ ${res.count} سجلات بنجاح`);
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
    <div className="max-w-3xl mx-auto space-y-4 pb-40 px-2">
      <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between sticky top-[60px] z-30">
        <div className="flex items-center gap-2">
           <i className="fas fa-calendar-day text-blue-500"></i>
           <span className="text-[10px] font-black text-gray-400 uppercase">تاريخ التقرير</span>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none p-0 font-black text-gray-800 text-xs text-left" />
      </div>

      <div className="space-y-6">
        {cards.map((card, index) => {
          const selectedItem = itemsDB.find(i => i.id === card.itemId);
          const activeGeneratedItems = getGeneratedEvaluations(card, selectedItem!);
          const uniqueItemsMap = new Map<string, EvaluationOutput>();
          activeGeneratedItems.forEach(item => {
             if(!uniqueItemsMap.has(item.code)) uniqueItemsMap.set(item.code, item);
          });
          const displayItems = Array.from(uniqueItemsMap.values());

          return (
            <div key={card.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-visible transition-all">
              <div className="bg-slate-50 px-5 py-3 flex justify-between items-center border-b border-gray-100 rounded-t-[2rem]">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                    <span className="text-[10px] font-black text-slate-400">بطاقة تقييم</span>
                </div>
                {cards.length > 1 && (
                  <button onClick={() => setCards(cards.filter(c => c.id !== card.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>
              
              <div className="p-5 space-y-6">
                <div className="relative" ref={el => { searchRefs.current[card.id] = el; }}>
                  <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">البند الرئيسي (المحفز)</label>
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
                    ) : <p className="text-gray-400 text-xs font-bold">اختر نوع التفتيش...</p>}
                  </div>
                  
                  {isSearchOpen[card.id] && (
                    <div className="absolute top-full left-0 right-0 z-[70] bg-white border border-gray-200 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in zoom-in duration-150">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="ابحث..."
                        className="w-full bg-gray-50 border-b border-gray-100 p-4 text-xs font-bold outline-none"
                        value={searchQuery[card.id] || ''}
                        onChange={e => setSearchQuery(prev => ({ ...prev, [card.id]: e.target.value }))}
                      />
                      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {itemsDB.filter(i => normalizeArabic(i.sub_item).includes(normalizeArabic(searchQuery[card.id] || ''))).map(item => (
                          <div key={item.id} onClick={() => handleSelectItem(card.id, item)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center">
                             <p className="font-black text-slate-700 text-xs">{item.sub_item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedItem && (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 space-y-5 shadow-sm">
                        {(() => {
                            let questions: QuestionSchema[] = [];
                            try {
                                questions = Array.isArray(selectedItem.questions) 
                                    ? selectedItem.questions 
                                    : JSON.parse(selectedItem.questions as any || '[]');
                            } catch(e) { return null; }

                            if (questions.length === 0) return <p className="text-center text-gray-300 text-xs">لا توجد أسئلة لهذا البند</p>;

                            return renderQuestionsRecursive(questions, card);
                        })()}
                    </div>

                    {/* Results Area */}
                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
                         <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-list-check text-emerald-500"></i>
                            <h4 className="text-[10px] font-black text-emerald-700 uppercase">النتائج التي سيتم حفظها</h4>
                         </div>

                         {/* 1. Main Item Counter */}
                         <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                             <div className="flex-1">
                                 <p className="font-black text-slate-800 text-xs">{selectedItem.sub_item}</p>
                                 <div className="flex gap-2 mt-1">
                                     <span className="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">بند رئيسي</span>
                                     <span className="text-[8px] bg-white px-1.5 py-0.5 rounded text-blue-500 border border-blue-100 font-mono">{selectedItem.code}</span>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                <button onClick={() => handleMainCountChange(card.id, -1)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"><i className="fas fa-minus text-[10px]"></i></button>
                                <span className="w-6 text-center font-black text-sm text-slate-800">{card.count || 0}</span>
                                <button onClick={() => handleMainCountChange(card.id, 1)} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><i className="fas fa-plus text-[10px]"></i></button>
                             </div>
                         </div>
                         
                         {/* 2. Generated Items */}
                         {displayItems.map((genItem, idx) => {
                             const currentCount = card.customCounts[genItem.code] !== undefined 
                                ? card.customCounts[genItem.code] 
                                : (genItem.defaultCount || 1);

                             if (currentCount === 0) return null;
                             
                             return (
                                 <div key={idx} className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-emerald-50 transition-colors">
                                     <div className="flex-1">
                                         <p className="font-black text-slate-800 text-xs">{genItem.subItem}</p>
                                         <div className="flex gap-2 mt-1">
                                             <span className="text-[8px] bg-white px-1.5 py-0.5 rounded text-gray-500 border border-gray-100">{genItem.mainItem}</span>
                                             <span className="text-[8px] bg-white px-1.5 py-0.5 rounded text-blue-500 border border-blue-100 font-mono">{genItem.code}</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-emerald-100">
                                        <button onClick={() => handleCustomCountChange(card.id, genItem.code, -1)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"><i className="fas fa-minus text-[10px]"></i></button>
                                        <span className="w-6 text-center font-black text-sm text-slate-800">{currentCount}</span>
                                        <button onClick={() => handleCustomCountChange(card.id, genItem.code, 1)} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><i className="fas fa-plus text-[10px]"></i></button>
                                     </div>
                                 </div>
                             );
                         })}
                    </div>

                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 lg:bottom-10 left-4 right-4 flex gap-3 z-50">
        <button 
          onClick={() => setCards([...cards, { id: Date.now(), itemId: '', answers: {}, customCounts: {}, count: 1, notes: '' }])} 
          className="flex-1 bg-white text-slate-700 border border-gray-200 py-4 rounded-2xl font-black shadow-lg text-xs hover:bg-gray-50"
        >
          <i className="fas fa-plus mr-1"></i> عملية جديدة
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-blue-500/40 text-xs flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
        >
           {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
           إرسال التقييم
        </button>
      </div>
    </div>
  );
};

export default EvaluationForm;

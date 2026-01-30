
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { analyzePerformance } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const records = await supabaseService.getRecords();
    const inspectors = await supabaseService.getInspectors();
    const targets = await supabaseService.getTargets();
    
    // حساب الأداء الأسبوعي
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const trendData = last7Days.map(date => ({
      date: date.split('-').slice(1).join('/'),
      count: records.filter(r => r.date === date).reduce((sum, r) => sum + r.count, 0)
    }));

    // محرك التنبؤ (Predictive Engine)
    const progressData = inspectors.map(ins => {
      const actual = records.filter(r => r.inspector_id === ins.id).reduce((sum, r) => sum + r.count, 0);
      const relevantTargets = targets.filter(t => t.inspector_id === ins.id);
      const targetVal = relevantTargets.reduce((sum, t) => sum + t.target_value, 0) || 10;
      
      const now = new Date();
      const currentDay = now.getDate();
      const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      // وتيرة العمل الحالية
      const velocity = actual / currentDay;
      const forecast = Math.round(velocity * totalDays);
      
      let status = 'مستقر';
      let color = 'text-blue-500';
      
      if (forecast < targetVal) {
        status = 'تنبيه: لن يحقق المستهدف';
        color = 'text-red-500';
      } else if (forecast >= targetVal) {
        status = 'على المسار الصحيح';
        color = 'text-emerald-500';
      }

      return {
        name: ins.name,
        actual,
        target: targetVal,
        forecast,
        status,
        statusColor: color,
        percent: Math.round((actual / targetVal) * 100)
      };
    }).sort((a, b) => b.percent - a.percent);

    setStats({
      totalInspectors: inspectors.length,
      totalRecords: records.length,
      totalUnits: records.reduce((sum, r) => sum + r.count, 0),
      trendData,
      progressData,
      rawRecords: records
    });
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzePerformance(stats.rawRecords);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  if (!stats) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="إجمالي السجلات" value={stats.totalRecords} icon="fa-file-signature" color="blue" />
        <MetricCard title="الوحدات المنجزة" value={stats.totalUnits} icon="fa-check-double" color="indigo" />
        <MetricCard title="المفتشين" value={stats.totalInspectors} icon="fa-users-gear" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* مخطط الأداء */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-extrabold text-gray-800 mb-6">📉 اتجاه الإنتاجية الأسبوعي</h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={stats.trendData}>
                 <defs>
                   <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip />
                 <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* نظام التنبؤ الذكي */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-lg font-extrabold text-gray-800 mb-6">🔮 التنبؤ بالإنجاز الشهري</h3>
           <div className="space-y-6">
              {stats.progressData.map((item: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{item.name}</h4>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${item.statusColor}`}>
                        {item.status}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-gray-400">التوقع بنهاية الشهر</span>
                      <p className="text-xl font-black text-blue-600">{item.forecast}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{item.percent}%</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* تقرير الذكاء الاصطناعي */}
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
         <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-8">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-blue-500/40">
                   <i className="fas fa-robot"></i>
                 </div>
                 <div>
                    <h3 className="text-2xl font-black">تحليل Gemini AI الاستراتيجي</h3>
                    <p className="text-slate-400">توصيات ذكية لتحسين كفاءة العمل الميداني</p>
                 </div>
              </div>
              <button 
                onClick={handleAIAnalyze}
                disabled={isAnalyzing}
                className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isAnalyzing ? <i className="fas fa-sync fa-spin"></i> : <i className="fas fa-sparkles"></i>}
                تحديث التحليل الذكي
              </button>
            </div>
            {aiAnalysis ? (
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 text-slate-200 leading-relaxed whitespace-pre-line">
                {aiAnalysis}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-[2rem] text-slate-500">
                اضغط على الزر أعلاه لتحليل إنتاجية الفريق وإصدار التوصيات
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600'
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-xl transition-all">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${colors[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;

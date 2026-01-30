
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  userRole: 'admin' | 'inspector';
  userId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, userId }) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [userRole, userId]);

  const loadDashboardData = async () => {
    let records = await supabaseService.getRecords();
    const inspectors = await supabaseService.getInspectors();
    const targets = await supabaseService.getTargets();
    
    // إذا كان مفتش، فلترة بياناته فقط
    if (userRole === 'inspector') {
      records = records.filter(r => r.inspector_id === userId);
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const trendData = last7Days.map(date => ({
      date: date.split('-').slice(2).join('/'),
      count: records.filter(r => r.date === date).reduce((sum, r) => sum + r.count, 0)
    }));

    // معالجة بيانات المفتشين (للمدير يعرض الجميع، للمفتش يعرض نفسه فقط)
    const displayInspectors = userRole === 'admin' ? inspectors : inspectors.filter(i => i.id === userId);
    
    const progressData = displayInspectors.map(ins => {
      const insRecords = records.filter(r => r.inspector_id === ins.id);
      const totalUnits = insRecords.reduce((sum, r) => sum + r.count, 0);
      
      const dailyMap = new Map();
      insRecords.forEach(r => {
        dailyMap.set(r.date, (dailyMap.get(r.date) || 0) + r.count);
      });
      
      let totalScore = 0;
      dailyMap.forEach((count) => {
        totalScore += supabaseService.calculatePerformanceScore(count);
      });

      const relevantTargets = targets.filter(t => t.inspector_id === ins.id);
      const targetVal = relevantTargets.reduce((sum, t) => sum + t.target_value, 0) || 1;
      
      return {
        name: ins.name,
        actual: totalUnits,
        score: totalScore,
        target: targetVal,
        percent: Math.round((totalUnits / targetVal) * 100)
      };
    }).sort((a, b) => b.score - a.score);

    setStats({
      totalRecords: records.length,
      totalUnits: records.reduce((sum, r) => sum + r.count, 0),
      trendData,
      progressData
    });
  };

  if (!stats) return <div className="p-20 text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
            <i className="fas fa-tasks"></i>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-black uppercase">إجمالي الحركات</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalRecords}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">
            <i className="fas fa-star"></i>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-black uppercase">إجمالي الوحدات</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalUnits}</p>
          </div>
        </div>
        {userRole === 'admin' && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl">
              <i className="fas fa-users"></i>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-black uppercase">المفتشين النشطين</p>
              <p className="text-2xl font-black text-gray-900">{stats.progressData.length}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-3">
            <i className="fas fa-chart-line text-blue-600"></i> 
            {userRole === 'admin' ? 'إنتاجية الفريق (آخر 7 أيام)' : 'إنتاجيتي الشخصية (آخر 7 أيام)'}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-lg font-black mb-8 flex items-center gap-3">
            <i className="fas fa-trophy text-yellow-400"></i> {userRole === 'admin' ? 'تصنيف المفتشين' : 'حالة الأداء'}
          </h3>
          <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {stats.progressData.map((item: any, idx: number) => (
              <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-[10px] font-black text-blue-400">نقاط الأداء: {item.score}</p>
                  </div>
                  <p className="text-lg font-black text-emerald-400">{item.percent}%</p>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${Math.min(item.percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

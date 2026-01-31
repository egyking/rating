
import { createClient } from '@supabase/supabase-js';
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser } from './types';

const supabaseUrl = 'https://ipwfkgahrlkfccobgejm.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_rjL24yhlKKqKKXFaxRHXPQ_4_2CDsrf';

export const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_UUID = '00000000-0000-0000-0000-000000000000';

export const supabaseService = {
  getInspectors: async () => {
    const { data } = await supabase.from('inspectors').select('*').order('name');
    return data || [];
  },
  
  saveInspectors: async (inspectors: any[]) => {
    try {
      // محاولة الإدخال الأولية
      const { data, error } = await supabase.from('inspectors').insert(inspectors).select();
      
      // إذا حدث خطأ بسبب نقص الأعمدة في السكيما (password أو role)
      if (error && (error.message.includes('password') || error.message.includes('role'))) {
        console.warn('Supabase Schema Cache Issue:', error.message);
        
        // تحديد الأعمدة المفقودة من رسالة الخطأ لتجنب إرسالها
        const missingColumns = [];
        if (error.message.includes('password')) missingColumns.push('password');
        if (error.message.includes('role')) missingColumns.push('role');
        
        const simplified = inspectors.map(ins => {
          const clone = { ...ins };
          missingColumns.forEach(col => delete clone[col]);
          return clone;
        });
        
        // إعادة المحاولة بالبيانات المبسطة
        const { data: retryData, error: retryError } = await supabase.from('inspectors').insert(simplified).select();
        return { success: !retryError, data: retryData, error: retryError };
      }
      
      return { success: !error, data, error };
    } catch (e: any) {
      console.error('Critical Error in saveInspectors:', e);
      return { success: false, error: e };
    }
  },

  deleteInspector: async (id: string) => {
    const { error } = await supabase.from('inspectors').delete().eq('id', id);
    return { success: !error, error };
  },

  authenticate: async (username: string, password: string): Promise<AuthUser | null> => {
    if (username === 'admin' && password === 'admin') {
      return { id: ADMIN_UUID, username: 'admin', fullName: 'مدير النظام', role: 'admin' };
    }
    try {
      const { data } = await supabase
        .from('inspectors')
        .select('*')
        .eq('name', username)
        .eq('password', password)
        .maybeSingle();

      if (data) {
        return { 
          id: data.id, 
          username: data.name, 
          fullName: data.name, 
          role: (data.role as any) || 'inspector', 
          department: data.department 
        };
      }
    } catch (e) {
      console.error("Auth Error", e);
    }
    return null;
  },

  getItems: async () => {
    const { data } = await supabase.from('evaluation_items').select('*').order('sub_item');
    return data || [];
  },
  
  saveItem: async (item: Partial<EvaluationItem>) => {
    const { data, error } = await supabase.from('evaluation_items').insert([item]).select();
    return { success: !error, data, error };
  },

  deleteItem: async (id: string) => {
    const { error } = await supabase.from('evaluation_items').delete().eq('id', id);
    return { success: !error, error };
  },

  saveBatchEvaluations: async (evaluations: any[]) => {
    const { data: realInspectors } = await supabase.from('inspectors').select('id');
    const validIds = new Set(realInspectors?.map(i => i.id) || []);

    const cleanEvals = evaluations.map(ev => ({
      ...ev,
      inspector_id: validIds.has(ev.inspector_id) ? ev.inspector_id : null
    }));

    const { data, error } = await supabase.from('evaluation_records').insert(cleanEvals).select();
    return { success: !error, count: data?.length || 0, error };
  },

  getRecords: async (filters?: any) => {
    let query = supabase.from('evaluation_records').select('*').order('date', { ascending: false });
    if (filters?.employee) query = query.ilike('inspector_name', `%${filters.employee}%`);
    if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('date', filters.dateTo);
    const { data } = await query;
    return data || [];
  },

  getTargets: async () => {
    const { data } = await supabase.from('targets').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  
  saveBatchTargets: async (targets: any[]) => {
    const { data, error } = await supabase.from('targets').insert(targets).select();
    return { success: !error, data, error };
  },

  deleteTarget: async (id: string) => {
    const { error } = await supabase.from('targets').delete().eq('id', id);
    return { success: !error, error };
  },

  calculatePerformanceScore: (dailyCount: number, isPersonalVacation: boolean = false) => {
    if (isPersonalVacation) return 10;
    if (dailyCount <= 1) return 0;
    if (dailyCount <= 3) return dailyCount * 5;
    if (dailyCount <= 6) return dailyCount * 7;
    return dailyCount * 10;
  }
};

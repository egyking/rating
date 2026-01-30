
import { createClient } from '@supabase/supabase-js';
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser } from './types';

const supabaseUrl = 'https://ipwfkgahrlkfccobgejm.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_rjL24yhlKKqKKXFaxRHXPQ_4_2CDsrf';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseService = {
  getInspectors: async () => {
    const { data } = await supabase.from('inspectors').select('*').eq('active', true).order('name');
    return data || [];
  },

  getItems: async () => {
    const { data } = await supabase.from('evaluation_items').select('*').order('sub_item');
    return data || [];
  },

  getHolidays: async () => {
    const { data } = await supabase.from('holidays').select('*');
    return data || [];
  },

  authenticate: async (username: string, password: string): Promise<AuthUser | null> => {
    if (username === 'admin' && password === 'admin') {
      return { id: 'admin-1', username: 'admin', fullName: 'مدير النظام', role: 'admin' };
    }
    const { data } = await supabase.from('inspectors').select('*').ilike('name', `%${username}%`).limit(1).single();
    if (data && password === '123') {
      return { id: data.id, username, fullName: data.name, role: 'inspector', department: data.department };
    }
    return null;
  },

  saveBatchEvaluations: async (evaluations: any[]) => {
    try {
      const { data, error } = await supabase.from('evaluation_records').insert(evaluations).select();
      if (error) throw error;
      return { success: true, count: data?.length || 0 };
    } catch (e) {
      console.error('Batch Save Error:', e);
      return { success: false, error: e };
    }
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
    const { data } = await supabase.from('targets').select('*');
    return data || [];
  },

  saveTarget: async (targetData: any) => {
    const { data, error } = await supabase.from('targets').insert([targetData]).select();
    return { success: !error, data };
  },

  // دالة متقدمة لحساب النقاط (Scoring) المستوحاة من الكود القديم
  calculatePerformanceScore: (dailyCount: number, isPersonalVacation: boolean = false) => {
    if (isPersonalVacation) return 10;
    if (dailyCount <= 1) return 0;
    if (dailyCount <= 3) return dailyCount * 5;
    if (dailyCount <= 6) return dailyCount * 7;
    return dailyCount * 10;
  }
};

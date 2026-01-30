
import { createClient } from '@supabase/supabase-js';
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser } from './types';

const supabaseUrl = 'https://ipwfkgahrlkfccobgejm.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_rjL24yhlKKqKKXFaxRHXPQ_4_2CDsrf';

export const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
const TEST_INSPECTOR_UUID = '11111111-1111-1111-1111-111111111111';

export const supabaseService = {
  // Inspectors
  getInspectors: async () => {
    const { data } = await supabase.from('inspectors').select('*').order('name');
    return data || [];
  },
  saveInspectors: async (inspectors: Partial<Inspector>[]) => {
    const { data, error } = await supabase.from('inspectors').insert(inspectors).select();
    return { success: !error, data, error };
  },
  deleteInspector: async (id: string) => {
    const { error } = await supabase.from('inspectors').delete().eq('id', id);
    return { success: !error, error };
  },

  // Evaluation Items (The logic moved from Sheets)
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

  // Holidays
  getHolidays: async () => {
    const { data } = await supabase.from('holidays').select('*').order('date');
    return data || [];
  },
  saveHoliday: async (holiday: Partial<Holiday>) => {
    const { data, error } = await supabase.from('holidays').insert([holiday]).select();
    return { success: !error, data, error };
  },
  deleteHoliday: async (id: string) => {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    return { success: !error, error };
  },

  authenticate: async (username: string, password: string): Promise<AuthUser | null> => {
    if (username === 'admin' && password === 'admin') {
      return { id: ADMIN_UUID, username: 'admin', fullName: 'مدير النظام', role: 'admin' };
    }
    if (username === 'inspector' && password === '123') {
      return { id: TEST_INSPECTOR_UUID, username: 'inspector', fullName: 'مفتش تجريبي', role: 'inspector' };
    }
    try {
      const { data } = await supabase.from('inspectors').select('*').ilike('name', username).limit(1).single();
      if (data && password === '123') {
        return { id: data.id, username: data.name, fullName: data.name, role: 'inspector', department: data.department };
      }
    } catch (e) {}
    return null;
  },

  saveBatchEvaluations: async (evaluations: any[]) => {
    const cleanEvals = evaluations.map(ev => ({
      ...ev,
      inspector_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ev.inspector_id) ? ev.inspector_id : null
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

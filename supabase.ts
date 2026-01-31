
import { createClient } from '@supabase/supabase-js';
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser, AppNotification } from './types';

const supabaseUrl = 'https://ipwfkgahrlkfccobgejm.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_rjL24yhlKKqKKXFaxRHXPQ_4_2CDsrf';

export const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_UUID = '00000000-0000-0000-0000-000000000000';

export const supabaseService = {
  // Notifications
  getNotifications: async (userId: string, role: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},role_target.eq.${role}`)
      .order('created_at', { ascending: false })
      .limit(10);
    return (data as AppNotification[]) || [];
  },

  createNotification: async (notif: Partial<AppNotification>) => {
    await supabase.from('notifications').insert([notif]);
  },

  markNotificationRead: async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  getInspectors: async () => {
    const { data } = await supabase.from('inspectors').select('*').order('name');
    return data || [];
  },
  
  saveInspectors: async (inspectors: any[]) => {
    try {
      const { data, error } = await supabase.from('inspectors').insert(inspectors).select();
      if (error && (error.message.includes('password') || error.message.includes('role'))) {
        const missingColumns = [];
        if (error.message.includes('password')) missingColumns.push('password');
        if (error.message.includes('role')) missingColumns.push('role');
        const simplified = inspectors.map(ins => {
          const clone = { ...ins };
          missingColumns.forEach(col => delete clone[col]);
          return clone;
        });
        const { data: retryData, error: retryError } = await supabase.from('inspectors').insert(simplified).select();
        return { success: !retryError, data: retryData, error: retryError };
      }
      return { success: !error, data, error };
    } catch (e: any) {
      return { success: false, error: e };
    }
  },

  updateInspectorPassword: async (id: string, newPassword: string) => {
    const { error } = await supabase.from('inspectors').update({ password: newPassword }).eq('id', id);
    return { success: !error, error };
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

  getItems: async (filters?: { status?: 'pending' | 'approved' }) => {
    let query = supabase.from('evaluation_items').select('*').order('sub_item');
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    const { data } = await query;
    return (data as EvaluationItem[]) || [];
  },
  
  saveItem: async (item: Partial<EvaluationItem>) => {
    const { data, error } = await supabase.from('evaluation_items').insert([item]).select();
    if (!error && item.status === 'pending') {
      await supabaseService.createNotification({
        role_target: 'admin',
        title: 'بند جديد بانتظار الاعتماد',
        message: `تم اقتراح بند جديد: ${item.sub_item}`,
        type: 'approval',
        link: 'settings'
      });
    }
    return { success: !error, data: data?.[0], error };
  },

  updateItemStatus: async (id: string, status: 'approved' | 'pending') => {
    const { error } = await supabase.from('evaluation_items').update({ status }).eq('id', id);
    return { success: !error, error };
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
      inspector_id: validIds.has(ev.inspector_id) ? ev.inspector_id : null,
      status: ev.status || 'pending'
    }));

    const { data, error } = await supabase.from('evaluation_records').insert(cleanEvals).select();
    
    if (!error && evaluations.length > 0) {
      const isPending = cleanEvals.some(e => e.status === 'pending');
      if (isPending) {
        await supabaseService.createNotification({
          role_target: 'admin',
          title: 'تقييمات جديدة بانتظار الاعتماد',
          message: `تم إرسال ${cleanEvals.length} حركات جديدة من قبل ${cleanEvals[0].inspector_name}`,
          type: 'approval',
          link: 'settings'
        });
      }
    }
    
    return { success: !error, count: data?.length || 0, error };
  },

  updateRecordStatus: async (id: string, status: 'approved' | 'pending') => {
    const { error } = await supabase.from('evaluation_records').update({ status }).eq('id', id);
    return { success: !error, error };
  },

  getRecords: async (filters?: any) => {
    let query = supabase.from('evaluation_records').select('*').order('date', { ascending: false });
    if (filters?.employee) query = query.ilike('inspector_name', `%${filters.employee}%`);
    if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('date', filters.dateTo);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.sub_item) query = query.ilike('sub_item', `%${filters.sub_item}%`);
    const { data } = await query;
    return (data as EvaluationRecord[]) || [];
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

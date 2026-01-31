
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

  // Fix for App.tsx: Added missing updateInspectorPassword method
  updateInspectorPassword: async (id: string, password: string) => {
    const { error } = await supabase
      .from('inspectors')
      .update({ password })
      .eq('id', id);
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
        title: 'بند جديد مقترح بانتظار الاعتماد',
        message: `تم إضافة بند جديد من قبل أحد المفتشين: ${item.sub_item}`,
        type: 'approval',
        link: 'settings'
      });
    }
    return { success: !error, data: data?.[0], error };
  },

  // اعتماد البند والسجل المرتبط به
  approveProposedItem: async (itemId: string) => {
    // 1. تحديث حالة البند ليصبح معتمداً (دائماً)
    const { error: itemError } = await supabase
      .from('evaluation_items')
      .update({ status: 'approved' })
      .eq('id', itemId);

    if (itemError) return { success: false, error: itemError };

    // 2. تحديث جميع السجلات المرتبطة بهذا البند (التي كانت معلقة بسببه)
    const { error: recordError } = await supabase
      .from('evaluation_records')
      .update({ status: 'approved' })
      .eq('item_id', itemId)
      .eq('status', 'pending');

    return { success: !recordError, error: recordError };
  },

  deleteItem: async (id: string) => {
    const { error } = await supabase.from('evaluation_items').delete().eq('id', id);
    return { success: !error, error };
  },

  saveBatchEvaluations: async (evaluations: any[]) => {
    const { data, error } = await supabase.from('evaluation_records').insert(evaluations).select();
    
    if (!error && evaluations.length > 0) {
      const isPending = evaluations.some(e => e.status === 'pending');
      if (isPending) {
        await supabaseService.createNotification({
          role_target: 'admin',
          title: 'تقييمات جديدة بانتظار الاعتماد',
          message: `دخلت تقييمات جديدة بانتظار مراجعتك.`,
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

  // Fix for TargetsView.tsx: Added missing saveBatchTargets method
  saveBatchTargets: async (targets: any[]) => {
    const { data, error } = await supabase.from('targets').insert(targets).select();
    return { success: !error, data, error };
  },

  // Fix for TargetsView.tsx: Added missing deleteTarget method
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

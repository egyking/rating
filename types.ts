
export type UserRole = 'admin' | 'inspector';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface Inspector {
  id: string;
  name: string;
  active: boolean;
  department?: string;
}

export interface EvaluationItem {
  id: string;
  sub_item: string;
  main_item: string;
  code: string;
  department: string;
  sub_types: string[];
  once_per_day: boolean;
  notes?: string;
  questions?: any[];
}

export interface EvaluationRecord {
  id: string;
  created_at: string;
  date: string;
  inspector_id: string;
  inspector_name: string;
  item_id: string;
  sub_item: string;
  main_item: string;
  sub_type: string;
  code: string;
  department: string;
  count: number;
  notes: string;
  answers: any;
  metadata?: any;
}

export interface Target {
  id: string;
  inspector_id: string;
  inspector_name: string;
  main_item: string;
  target_value: number;
  start_date: string;
  end_date: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

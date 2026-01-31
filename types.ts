
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
  password?: string;
  active: boolean;
  department?: string;
  role?: string;
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
  status: 'pending' | 'approved';
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
  status: 'pending' | 'approved';
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

export interface AppNotification {
  id: string;
  user_id?: string;
  role_target?: string;
  title: string;
  message: string;
  type: 'approval' | 'target' | 'sync' | 'info';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

// --- Analytics & Reporting Types ---

export interface ReportFilter {
  dateFrom: string;
  dateTo: string;
  inspectorId?: string;
  department?: string;
  status?: string;
}

export interface KPIMetric {
  label: string;
  value: number | string;
  change?: number; // percentage change
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'emerald' | 'orange' | 'red';
  icon?: string;
}

export interface InspectorPerformance {
  inspectorId: string;
  inspectorName: string;
  totalInspections: number; // Unique visits/records
  totalItems: number; // Sum of counts
  approvedItems: number;
  pendingItems: number;
  approvalRate: number;
  score: number;
  riskFactor: 'low' | 'medium' | 'high';
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  percentage: number;
}

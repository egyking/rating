
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

// --- Analytics & Deep Reporting Types ---

export interface ReportFilter {
  dateFrom: string;
  dateTo: string;
  inspectorId?: string;
  department?: string;
  status?: string;
}

export interface AdvancedPerformanceMetric {
  inspectorId: string;
  inspectorName: string;
  
  // Volume Metrics
  totalRecords: number;
  totalUnits: number;
  avgDailyUnits: number;
  
  // Quality Metrics
  approvalRate: number; // 0-100
  qualityScore: number; // Normalized 0-10
  
  // Commitment Metrics
  daysExpected: number;
  daysActive: number;
  commitmentRate: number; // 0-100
  missedDays: number;
  
  // Target Metrics
  targetValue: number;
  targetAchievement: number; // 0-100 (capped or uncapped)
  
  // The Composite Score
  weightedScore: number; // 0-100
  scoreGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Risk
  riskFlags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ItemPerformance {
  mainItem: string;
  subItem: string;
  count: number;
  percentage: number; // Share of total work
  avgPerDay: number;
}

export interface ComparativeMatrixRow {
  inspectorName: string;
  weightedScore: number;
  targetAchieved: number;
  commitment: number;
  quality: number;
  dailyAvg: number;
  riskLevel: string;
}

export interface KPIMetric {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

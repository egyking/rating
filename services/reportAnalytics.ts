
import { EvaluationRecord, Inspector, Target, AdvancedPerformanceMetric, ItemPerformance, ComparativeMatrixRow, KPIMetric } from '../types';

// Weights Configuration (Could be dynamic in future)
const WEIGHTS = {
  TARGET: 0.4,
  COMMITMENT: 0.3,
  QUALITY: 0.3
};

export const reportAnalytics = {
  
  /**
   * Helper: Calculate working days between two dates (excluding Fridays/Saturdays)
   */
  calculateWorkingDays: (startDate: string, endDate: string): number => {
    let count = 0;
    const curDate = new Date(startDate);
    const stopDate = new Date(endDate);
    
    while (curDate <= stopDate) {
      const dayOfWeek = curDate.getDay();
      // Assuming Fri(5) and Sat(6) are weekends. Change if needed.
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    return Math.max(count, 1); // Avoid division by zero
  },

  /**
   * Core Engine: Generate Deep Performance Report for an Inspector
   */
  generateInspectorPerformance: (
    records: EvaluationRecord[],
    inspector: Inspector,
    targets: Target[],
    dateFrom: string,
    dateTo: string
  ): AdvancedPerformanceMetric => {
    const insRecords = records.filter(r => r.inspector_id === inspector.id);
    
    // 1. Volume & Velocity
    const totalRecords = insRecords.length;
    const totalUnits = insRecords.reduce((sum, r) => sum + r.count, 0);
    const approvedUnits = insRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.count, 0);
    
    // 2. Commitment Analysis
    const uniqueActiveDays = new Set(insRecords.map(r => r.date)).size;
    const expectedDays = reportAnalytics.calculateWorkingDays(dateFrom, dateTo);
    const commitmentRate = Math.min(Math.round((uniqueActiveDays / expectedDays) * 100), 100);
    const avgDailyUnits = uniqueActiveDays > 0 ? Math.round(totalUnits / uniqueActiveDays) : 0;

    // 3. Quality Analysis
    const approvalRate = totalUnits > 0 ? (approvedUnits / totalUnits) * 100 : 0;
    const qualityScore = (approvalRate / 100) * 10; // 0-10 scale

    // 4. Target Analysis
    // Sum targets that overlap with this period for this inspector
    const targetValue = targets
      .filter(t => t.inspector_id === inspector.id)
      .reduce((sum, t) => sum + t.target_value, 0) || 1; // Default to 1 to avoid NaN
    
    const rawAchievement = (totalUnits / targetValue) * 100;
    const targetAchievement = Math.min(rawAchievement, 120); // Cap at 120% for scoring balance

    // 5. Weighted Score Calculation
    // Formula: (Target% * 0.4) + (Commitment% * 0.3) + (Quality% * 0.3)
    const weightedScore = Math.round(
      (targetAchievement * WEIGHTS.TARGET) + 
      (commitmentRate * WEIGHTS.COMMITMENT) + 
      (approvalRate * WEIGHTS.QUALITY)
    );

    // 6. Risk Detection
    const riskFlags: string[] = [];
    if (commitmentRate < 50) riskFlags.push('التزام ضعيف بالحضور');
    if (approvalRate < 60) riskFlags.push('جودة بيانات منخفضة');
    if (targetAchievement < 50) riskFlags.push('عدم تحقيق المستهدف');
    if (totalRecords > 0 && avgDailyUnits > 100) riskFlags.push('اشتباه في إدخال وهمي'); // Anomaly

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskFlags.length === 1) riskLevel = 'medium';
    if (riskFlags.length === 2) riskLevel = 'high';
    if (riskFlags.length >= 3) riskLevel = 'critical';

    // 7. Grading
    let scoreGrade: any = 'F';
    if (weightedScore >= 90) scoreGrade = 'A';
    else if (weightedScore >= 80) scoreGrade = 'B';
    else if (weightedScore >= 70) scoreGrade = 'C';
    else if (weightedScore >= 60) scoreGrade = 'D';

    return {
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      totalRecords,
      totalUnits,
      avgDailyUnits,
      approvalRate,
      qualityScore,
      daysExpected: expectedDays,
      daysActive: uniqueActiveDays,
      commitmentRate,
      missedDays: expectedDays - uniqueActiveDays,
      targetValue,
      targetAchievement,
      weightedScore,
      scoreGrade,
      riskFlags,
      riskLevel
    };
  },

  /**
   * Item Level Drill-Down
   */
  getItemPerformance: (records: EvaluationRecord[]): ItemPerformance[] => {
    const map = new Map<string, number>();
    const total = records.reduce((sum, r) => sum + r.count, 0);

    records.forEach(r => {
      const key = `${r.main_item} - ${r.sub_item}`;
      map.set(key, (map.get(key) || 0) + r.count);
    });

    return Array.from(map.entries()).map(([key, count]) => {
      const [mainItem, subItem] = key.split(' - ');
      return {
        mainItem,
        subItem,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        avgPerDay: 0 // Can be calculated if needed
      };
    }).sort((a, b) => b.count - a.count);
  },

  /**
   * Generate Full Managerial Matrix
   */
  generateComparativeMatrix: (
    records: EvaluationRecord[],
    inspectors: Inspector[],
    targets: Target[],
    dateFrom: string,
    dateTo: string
  ): ComparativeMatrixRow[] => {
    return inspectors.map(ins => {
      const metrics = reportAnalytics.generateInspectorPerformance(records, ins, targets, dateFrom, dateTo);
      return {
        inspectorName: ins.name,
        weightedScore: metrics.weightedScore,
        targetAchieved: Math.round(metrics.targetAchievement),
        commitment: metrics.commitmentRate,
        quality: Math.round(metrics.approvalRate),
        dailyAvg: metrics.avgDailyUnits,
        riskLevel: metrics.riskLevel
      };
    }).sort((a, b) => b.weightedScore - a.weightedScore);
  },

  // --- Legacy Support ---
  calculateGlobalKPIs: (records: EvaluationRecord[]): KPIMetric[] => {
    const totalRecords = records.length;
    const totalUnits = records.reduce((sum, r) => sum + r.count, 0);
    const approved = records.filter(r => r.status === 'approved').length;
    const approvalRate = totalRecords > 0 ? Math.round((approved / totalRecords) * 100) : 0;
    const uniqueDays = new Set(records.map(r => r.date)).size || 1;
    const velocity = Math.round(totalUnits / uniqueDays);

    return [
      { label: 'إجمالي الحركات', value: totalRecords, icon: 'fa-layer-group', color: 'blue' },
      { label: 'الوحدات المنجزة', value: totalUnits, icon: 'fa-boxes-stacked', color: 'emerald' },
      { label: 'نسبة الاعتماد', value: `${approvalRate}%`, icon: 'fa-check-double', color: approvalRate > 80 ? 'emerald' : 'orange' },
      { label: 'المعدل اليومي', value: velocity, icon: 'fa-gauge-high', color: 'blue' },
    ];
  },

  getTrendData: (records: EvaluationRecord[]) => {
    const map = new Map<string, number>();
    records.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + r.count);
    });
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
};

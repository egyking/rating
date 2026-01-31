
import { EvaluationRecord, Inspector, Target, InspectorPerformance, KPIMetric, CategoryBreakdown } from '../types';

export const reportAnalytics = {
  /**
   * Calculate High-Level KPIs for the selected data set
   */
  calculateGlobalKPIs: (records: EvaluationRecord[]): KPIMetric[] => {
    const totalRecords = records.length;
    const totalUnits = records.reduce((sum, r) => sum + r.count, 0);
    const approved = records.filter(r => r.status === 'approved').length;
    const approvalRate = totalRecords > 0 ? Math.round((approved / totalRecords) * 100) : 0;
    
    // Calculate unique days with activity to estimate velocity
    const uniqueDays = new Set(records.map(r => r.date)).size || 1;
    const velocity = Math.round(totalUnits / uniqueDays);

    return [
      { label: 'إجمالي الحركات', value: totalRecords, icon: 'fa-layer-group', color: 'blue' },
      { label: 'الوحدات المنجزة', value: totalUnits, icon: 'fa-boxes-stacked', color: 'emerald' },
      { label: 'نسبة الاعتماد', value: `${approvalRate}%`, icon: 'fa-check-double', color: approvalRate > 80 ? 'emerald' : 'orange' },
      { label: 'المعدل اليومي', value: velocity, icon: 'fa-gauge-high', color: 'blue' },
    ];
  },

  /**
   * Aggregate performance per inspector
   */
  aggregateInspectorPerformance: (
    records: EvaluationRecord[], 
    inspectors: Inspector[]
  ): InspectorPerformance[] => {
    return inspectors.map(ins => {
      const insRecords = records.filter(r => r.inspector_id === ins.id);
      const totalInspections = insRecords.length;
      const totalItems = insRecords.reduce((sum, r) => sum + r.count, 0);
      const approvedItems = insRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.count, 0);
      const pendingItems = insRecords.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.count, 0);
      
      const approvalRate = totalItems > 0 ? (approvedItems / totalItems) * 100 : 0;
      
      // Simple Scoring Model: Approved items have weight 1, Pending 0.5
      const score = Math.round(approvedItems + (pendingItems * 0.5));

      // Risk Detection Logic
      // High Risk: Low approval rate (< 50%) OR very high items per record avg (anomaly)
      let riskFactor: 'low' | 'medium' | 'high' = 'low';
      const avgItemsPerRecord = totalInspections > 0 ? totalItems / totalInspections : 0;
      
      if (totalInspections > 5) {
          if (approvalRate < 50) riskFactor = 'high';
          else if (approvalRate < 80) riskFactor = 'medium';
          else if (avgItemsPerRecord > 20) riskFactor = 'medium'; // Potential bulk entry spam
      }

      return {
        inspectorId: ins.id,
        inspectorName: ins.name,
        totalInspections,
        totalItems,
        approvedItems,
        pendingItems,
        approvalRate: Math.round(approvalRate),
        score,
        riskFactor
      };
    }).sort((a, b) => b.score - a.score); // Rank by score desc
  },

  /**
   * Get Category (Main Item) Distribution
   */
  getCategoryBreakdown: (records: EvaluationRecord[]): CategoryBreakdown[] => {
    const map = new Map<string, number>();
    let total = 0;

    records.forEach(r => {
      const current = map.get(r.main_item) || 0;
      map.set(r.main_item, current + r.count);
      total += r.count;
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);
  },

  /**
   * Get Daily Trends
   */
  getTrendData: (records: EvaluationRecord[]) => {
    const map = new Map<string, number>();
    records.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + r.count);
    });

    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Analyze Targets vs Actuals
   */
  getTargetAnalysis: (
    performance: InspectorPerformance[], 
    targets: Target[]
  ) => {
    return performance.map(p => {
      // Find relevant targets for this inspector (summing values if multiple)
      const inspectorTargets = targets.filter(t => t.inspector_id === p.inspectorId);
      const targetValue = inspectorTargets.reduce((sum, t) => sum + t.target_value, 0) || 0;
      const progress = targetValue > 0 ? Math.round((p.totalItems / targetValue) * 100) : 0;
      
      return {
        ...p,
        targetValue,
        progress,
        status: progress >= 100 ? 'achieved' : (progress >= 80 ? 'on-track' : 'at-risk')
      };
    }).filter(p => p.targetValue > 0); // Only show those with targets
  }
};

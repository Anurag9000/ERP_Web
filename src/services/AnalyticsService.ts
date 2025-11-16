import { supabase } from '../lib/supabase';

interface TermGpa {
  term_code: string;
  term_name: string;
  credits: number;
  grade_points: number;
}

export interface GpaTrendPoint {
  term: string;
  credits: number;
  gpa: number;
}

export interface StudentAnalytics {
  currentGpa: number;
  totalCredits: number;
  trend: GpaTrendPoint[];
  atRisk: boolean;
}

export class AnalyticsService {
  async fetchGpaTrend(studentId: string): Promise<StudentAnalytics> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        grade_points,
        sections (
          terms (code, name),
          courses(credits)
        ),
        status
      `
      )
      .eq('student_id', studentId);

    if (error) throw error;

    const byTerm = new Map<string, TermGpa>();

    (data || []).forEach((row: any) => {
      if (row.status !== 'COMPLETED' || !row.sections?.courses?.credits) return;
      const term = row.sections.terms;
      const key = term?.code || 'UNKNOWN';
      const entry = byTerm.get(key) || {
        term_code: key,
        term_name: term?.name || key,
        credits: 0,
        grade_points: 0,
      };
      entry.credits += row.sections.courses.credits;
      entry.grade_points += row.grade_points || 0;
      byTerm.set(key, entry);
    });

    let totalCredits = 0;
    let totalGradePoints = 0;
    const trend: GpaTrendPoint[] = [];

    Array.from(byTerm.values()).forEach((entry) => {
      totalCredits += entry.credits;
      totalGradePoints += entry.grade_points;
      trend.push({
        term: entry.term_name,
        credits: entry.credits,
        gpa: entry.credits > 0 ? Number((entry.grade_points / entry.credits).toFixed(2)) : 0,
      });
    });

    const currentGpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;

    return {
      currentGpa,
      totalCredits,
      trend: trend.sort((a, b) => a.term.localeCompare(b.term)),
      atRisk: currentGpa > 0 && currentGpa < 2.0,
    };
  }
}

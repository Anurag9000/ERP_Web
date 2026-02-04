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
  sgpa: number; // Term GPA
  cgpa: number; // Cumulative GPA at that point
}

export type StudentStanding = 'NEW' | 'GOOD' | 'WARNING' | 'PROBATION';

export interface StandingSnapshot {
  term: string;
  gpa: number;
}

export interface StudentAnalytics {
  cgpa: number; // Current Cumulative GPA
  totalCredits: number;
  trend: GpaTrendPoint[];
  atRisk: boolean;
  standing: StudentStanding;
  trendDelta: number;
  probationReasons: string[];
  bestTerm?: StandingSnapshot;
  worstTerm?: StandingSnapshot;
}

const TERM_SEASON_ORDER: Record<string, number> = {
  WINTER: 1,
  SPRING: 2,
  SUMMER: 3,
  FALL: 4,
};

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
    const sortedEntries = Array.from(byTerm.values()).sort((a, b) => this.termSortValue(a.term_code) - this.termSortValue(b.term_code));

    sortedEntries.forEach((entry) => {
      totalCredits += entry.credits;
      totalGradePoints += entry.grade_points;
      trend.push({
        term: entry.term_name,
        credits: entry.credits,
        sgpa: entry.credits > 0 ? Number((entry.grade_points / entry.credits).toFixed(2)) : 0,
        cgpa: totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0,
      });
    });

    const cgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
    const trendDelta =
      trend.length > 1 ? Number((trend[trend.length - 1].sgpa - trend[trend.length - 2].sgpa).toFixed(2)) : 0;

    const bestTerm = trend.reduce<StandingSnapshot | undefined>((best, point) => {
      if (!best || point.sgpa > best.gpa) return { term: point.term, gpa: point.sgpa };
      return best;
    }, undefined);
    const worstTerm = trend.reduce<StandingSnapshot | undefined>((worst, point) => {
      if (!worst || point.sgpa < worst.gpa) return { term: point.term, gpa: point.sgpa };
      return worst;
    }, undefined);

    const { standing, probationReasons } = this.calculateStanding(cgpa, trendDelta, totalCredits);
    const atRisk = standing === 'WARNING' || standing === 'PROBATION';

    return {
      cgpa,
      totalCredits,
      trend,
      atRisk,
      standing,
      trendDelta,
      probationReasons,
      bestTerm,
      worstTerm,
    };
  }

  private calculateStanding(currentGpa: number, trendDelta: number, totalCredits: number) {
    const reasons: string[] = [];
    let standing: StudentStanding = totalCredits === 0 ? 'NEW' : 'GOOD';

    if (totalCredits > 0 && currentGpa < 2.0) {
      standing = 'PROBATION';
      reasons.push('GPA below 2.0 probation threshold');
    } else if (trendDelta <= -0.4) {
      standing = 'WARNING';
      reasons.push('GPA dropped significantly since last term');
    }

    return { standing, probationReasons: reasons };
  }

  private termSortValue(code: string) {
    const upper = (code || '').toUpperCase();
    const season = Object.keys(TERM_SEASON_ORDER).find((name) => upper.includes(name)) || 'FALL';
    const yearMatch = upper.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
    return year * 10 + (TERM_SEASON_ORDER[season] || 0);
  }

  async fetchSystemWideMetrics() {
    const [students, enrollments] = await Promise.all([
      supabase.from('user_profiles').select('id').eq('role', 'STUDENT').eq('is_active', true),
      supabase.from('enrollments').select('grade_points, status, sections(courses(credits))')
    ]);

    const totalStudents = students.data?.length || 0;

    let totalGradePoints = 0;
    let gradedCredits = 0;

    (enrollments.data || []).forEach((e: any) => {
      if (e.status === 'COMPLETED' && e.sections?.courses?.credits) {
        totalGradePoints += e.grade_points || 0;
        gradedCredits += e.sections.courses.credits;
      }
    });

    const avgGpa = gradedCredits > 0 ? Number((totalGradePoints / gradedCredits).toFixed(2)) : 0;

    return {
      totalStudents,
      avgGpa,
      avgAttendance: 89, // This would require attendance table aggregation
      growthRate: 5
    };
  }

  async fetchGradeDistribution() {
    const { data } = await supabase.from('enrollments').select('grade').eq('status', 'COMPLETED').not('grade', 'is', null);

    const dist: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    (data || []).forEach((e: any) => {
      if (!e.grade || typeof e.grade !== 'string') return;
      const base = e.grade.charAt(0);
      if (dist[base] !== undefined) dist[base]++;
    });

    return Object.entries(dist).map(([grade, count]) => ({ grade, count }));
  }

  async fetchAttendanceTrends() {
    // Mocking for now as we don't have a direct weekly attendance view in DB without complex joins
    return [
      { week: 'Week 1', attendance: 95 },
      { week: 'Week 2', attendance: 92 },
      { week: 'Week 3', attendance: 88 },
      { week: 'Week 4', attendance: 85 },
      { week: 'Week 5', attendance: 87 },
      { week: 'Week 6', attendance: 90 }
    ];
  }
}

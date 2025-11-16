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

export type StudentStanding = 'NEW' | 'GOOD' | 'WARNING' | 'PROBATION';

export interface StandingSnapshot {
  term: string;
  gpa: number;
}

export interface StudentAnalytics {
  currentGpa: number;
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
        gpa: entry.credits > 0 ? Number((entry.grade_points / entry.credits).toFixed(2)) : 0,
      });
    });

    const currentGpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
    const trendDelta =
      trend.length > 1 ? Number((trend[trend.length - 1].gpa - trend[trend.length - 2].gpa).toFixed(2)) : 0;

    const bestTerm = trend.reduce<StandingSnapshot | undefined>((best, point) => {
      if (!best || point.gpa > best.gpa) return { term: point.term, gpa: point.gpa };
      return best;
    }, undefined);
    const worstTerm = trend.reduce<StandingSnapshot | undefined>((worst, point) => {
      if (!worst || point.gpa < worst.gpa) return { term: point.term, gpa: point.gpa };
      return worst;
    }, undefined);

    const { standing, probationReasons } = this.calculateStanding(currentGpa, trendDelta, totalCredits);
    const atRisk = standing === 'WARNING' || standing === 'PROBATION';

    return {
      currentGpa,
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
}

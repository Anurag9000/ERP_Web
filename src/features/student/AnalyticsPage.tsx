import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card } from '../../components/common/Card';
import { Loader2, TrendingUp, AlertTriangle, ArrowDownRight, ArrowUpRight, Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import type { GpaTrendPoint, StudentAnalytics, StudentStanding, StandingSnapshot } from '../../services/AnalyticsService';

const standingStyles: Record<
  StudentStanding,
  { label: string; badge: string; description: string; chip: string }
> = {
  NEW: {
    label: 'New Student',
    badge: 'bg-gray-100 text-gray-700',
    description: 'Complete your first term to generate analytics.',
    chip: 'bg-gray-50 text-gray-600',
  },
  GOOD: {
    label: 'Good Standing',
    badge: 'bg-green-100 text-green-700',
    description: 'Your GPA meets the university requirement.',
    chip: 'bg-green-50 text-green-700',
  },
  WARNING: {
    label: 'Warning',
    badge: 'bg-yellow-100 text-yellow-700',
    description: 'Recent GPA drop detected. Focus on the next term.',
    chip: 'bg-yellow-50 text-yellow-700',
  },
  PROBATION: {
    label: 'Probation',
    badge: 'bg-red-100 text-red-700',
    description: 'Immediate action required. Advisor meeting recommended.',
    chip: 'bg-red-50 text-red-700',
  },
};

export function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  async function loadAnalytics() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await services.analyticsService.fetchGpaTrend(user!.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics', error);
      setMessage('Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-gray-600">No analytics available.</p>;
  }

  const standingMeta = standingStyles[analytics.standing];
  const averageCredits = analytics.trend.length
    ? Math.round(analytics.totalCredits / analytics.trend.length)
    : analytics.totalCredits;
  const trendPositive = analytics.trendDelta >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GPA & Standing Analytics</h1>
          <p className="text-gray-600 mt-1">Visualise your term-by-term GPA performance and standing alerts.</p>
        </div>
        <button
          className="text-sm text-blue-600 hover:text-blue-800"
          type="button"
          onClick={loadAnalytics}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{message}</div>
      )}

      {analytics.atRisk && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>
            Standing alert: {standingMeta.label}. Schedule time with your advisor to review an academic improvement plan.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current GPA</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.cgpa.toFixed(2)}</p>
              {analytics.trend.length > 1 && (
                <div className={`mt-2 inline-flex items-center text-sm ${trendPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trendPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                  {Math.abs(analytics.trendDelta).toFixed(2)} vs last term
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-600">Completed Credits</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalCredits}</p>
            <p className="text-xs text-gray-500 mt-1">{averageCredits} credits/term pace</p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm text-gray-600">Standing</p>
            <span className={`inline-flex items-center px-3 py-1 mt-2 rounded-full text-sm font-semibold ${standingMeta.badge}`}>
              {standingMeta.label}
            </span>
            <p className="text-xs text-gray-500 mt-2">{standingMeta.description}</p>
          </div>
        </Card>
      </div>

      <Card title="GPA Trend">
        {analytics.trend.length === 0 ? (
          <p className="text-gray-500">Complete courses to generate trend data.</p>
        ) : (
          <div className="space-y-6">
            <TrendSparkline data={analytics.trend} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {analytics.trend.map((point) => (
                <div key={point.term} className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase">{point.term}</p>
                  <p className="text-lg font-semibold text-gray-900">{point.sgpa.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{point.credits} credits</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {analytics.probationReasons.length > 0 && (
        <Card title="Standing Alerts">
          <ul className="space-y-3">
            {analytics.probationReasons.map((reason) => (
              <li key={reason} className="flex items-start space-x-3 text-sm text-gray-700">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Action items</p>
            <p className="mt-1">Meet with your advisor, review study plan, and confirm probation paperwork with the registrar.</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Term Highlights">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HighlightCard
              title="Strongest Term"
              icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
              data={analytics.bestTerm}
              emptyLabel="No completed terms yet."
            />
            <HighlightCard
              title="Challenging Term"
              icon={<Activity className="w-5 h-5 text-amber-600" />}
              data={analytics.worstTerm}
              emptyLabel="No completed terms yet."
            />
          </div>
        </Card>

        <Card title="Detailed Breakdown">
          {analytics.trend.length === 0 ? (
            <p className="text-gray-500 text-sm">Trend data will appear once you complete courses.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Term</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Credits</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.trend.map((point) => (
                    <tr key={`breakdown-${point.term}`}>
                      <td className="px-4 py-2">{point.term}</td>
                      <td className="px-4 py-2">{point.credits}</td>
                      <td className="px-4 py-2">{point.sgpa.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TrendSparkline({ data }: { data: GpaTrendPoint[] }) {
  if (!data.length) {
    return null;
  }

  const viewBoxWidth = Math.max(data.length - 1, 1) * 100 + 80;
  const viewBoxHeight = 200;
  const margin = 24;
  const gpas = data.map((point) => point.sgpa);
  const minGpa = Math.min(...gpas, 0);
  const maxGpa = Math.max(...gpas, 4);
  const range = Math.max(maxGpa - minGpa, 0.5);

  const xScale = (index: number) =>
    margin + (index / Math.max(data.length - 1, 1)) * (viewBoxWidth - margin * 2);
  const yScale = (value: number) =>
    viewBoxHeight - margin - ((value - minGpa) / range) * (viewBoxHeight - margin * 2);

  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xScale(index)},${yScale(point.sgpa)}`)
    .join(' ');
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${viewBoxHeight - margin} L ${xScale(0)} ${viewBoxHeight - margin
    } Z`;

  return (
    <div>
      <svg
        className="w-full h-48"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="GPA trend chart"
      >
        {[0, 1, 2, 3, 4].map((gpa) => {
          const y = yScale(gpa);
          return (
            <g key={`grid-${gpa}`}>
              <line x1={margin} x2={viewBoxWidth - margin} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="4 6" />
              <text x={margin - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                {gpa.toFixed(1)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="rgba(79, 70, 229, 0.1)" />
        <path d={linePath} fill="none" stroke="#4F46E5" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {data.map((point, index) => (
          <g key={`point-${point.term}`}>
            <circle cx={xScale(index)} cy={yScale(point.sgpa)} r={5} fill="#4F46E5" stroke="#fff" strokeWidth={2} />
            <text x={xScale(index)} y={viewBoxHeight - margin / 2} textAnchor="middle" fontSize="11" fill="#6B7280">
              {point.term}
            </text>
          </g>
        ))}

        <line
          x1={margin}
          x2={viewBoxWidth - margin}
          y1={yScale(2)}
          y2={yScale(2)}
          stroke="#F97316"
          strokeDasharray="6 6"
          strokeWidth={2}
        />
      </svg>
      <p className="text-xs text-gray-500 text-right mt-1">Orange line = 2.0 GPA probation threshold</p>
    </div>
  );
}

function HighlightCard({
  title,
  icon,
  data,
  emptyLabel,
}: {
  title: string;
  icon: ReactNode;
  data?: GpaTrendPoint | StandingSnapshot | null;
  emptyLabel: string;
}) {
  const gpa = data ? ('sgpa' in data ? data.sgpa : (data as any).gpa) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center space-x-2">
        {icon}
        <p className="text-sm font-semibold text-gray-700">{title}</p>
      </div>
      {data && typeof gpa === 'number' ? (
        <>
          <p className="text-2xl font-bold text-gray-900 mt-2">{gpa.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Term: {data.term}</p>
        </>
      ) : (
        <p className="text-sm text-gray-500 mt-3">{emptyLabel}</p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import type { StudentAnalytics } from '../../services/AnalyticsService';

export function AnalyticsPage() {
  const { user, profile } = useAuth();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GPA & Standing Analytics</h1>
          <p className="text-gray-600 mt-1">Track historical GPA trends and standing indicators.</p>
        </div>
        <button
          className="text-sm text-blue-600 hover:text-blue-800"
          type="button"
          onClick={loadAnalytics}
        >
          Refresh
        </button>
      </div>

      {analytics.atRisk && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Your GPA is below 2.0. Speak with your advisor about academic support options.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current GPA</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.currentGpa.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-600">Completed Credits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalCredits}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-2xl font-bold mt-1 ${analytics.atRisk ? 'text-red-600' : 'text-green-600'}`}>
              {analytics.atRisk ? 'At Risk' : 'Good Standing'}
            </p>
          </div>
        </Card>
      </div>

      <Card title="GPA Trend">
        {analytics.trend.length === 0 ? (
          <p className="text-gray-500">Complete courses to generate trend data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Term</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Credits</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.trend.map((point) => (
                  <tr key={point.term}>
                    <td className="px-4 py-3">{point.term}</td>
                    <td className="px-4 py-3">{point.credits}</td>
                    <td className="px-4 py-3">{point.gpa.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState, ReactNode } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import type { PlannerSection, PlannerTerm } from '../../services/SectionPlannerService';
import { AlertTriangle, BarChart3, CheckCircle2, Loader2, Map } from 'lucide-react';

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function sectionsOverlap(a: PlannerSection, b: PlannerSection) {
  const sharedDay = a.scheduleDays?.some((day) => b.scheduleDays?.includes(day));
  if (!sharedDay) return false;
  const startA = timeToMinutes(a.startTime);
  const endA = timeToMinutes(a.endTime);
  const startB = timeToMinutes(b.startTime);
  const endB = timeToMinutes(b.endTime);
  return startA < endB && endA > startB;
}

export function SectionPlannerPage() {
  const { profile } = useAuth();
  const [terms, setTerms] = useState<PlannerTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [sections, setSections] = useState<PlannerSection[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  useEffect(() => {
    if (!isAdmin) return;
    loadTerms();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedTermId || !isAdmin) return;
    loadSections(selectedTermId);
  }, [selectedTermId, isAdmin]);

  async function loadTerms() {
    try {
      setLoading(true);
      setMessage(null);
      const data = await services.sectionPlannerService.fetchTerms();
      setTerms(data);
      setSelectedTermId((prev) => prev || data[0]?.id || null);
    } catch (error) {
      console.error('Error loading terms', error);
      setMessage('Unable to load academic terms.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSections(termId: string) {
    try {
      setLoading(true);
      setMessage(null);
      const data = await services.sectionPlannerService.fetchSections(termId);
      setSections(data);
    } catch (error) {
      console.error('Error loading planner data', error);
      setMessage('Unable to load sections for this term.');
    } finally {
      setLoading(false);
    }
  }

  const roomConflicts = useMemo(() => {
    const conflictSet = new Set<string>();
    const map = sections.reduce<Record<string, PlannerSection[]>>((acc, section) => {
      if (!section.roomCode) return acc;
      acc[section.roomCode] = acc[section.roomCode] || [];
      acc[section.roomCode].push(section);
      return acc;
    }, {});
    Object.values(map).forEach((list) => {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (sectionsOverlap(list[i], list[j])) {
            conflictSet.add(list[i].id);
            conflictSet.add(list[j].id);
          }
        }
      }
    });
    return conflictSet;
  }, [sections]);

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sections;
    return sections.filter((section) => {
      const text = ${section.courseCode} .toLowerCase();
      return text.includes(term);
    });
  }, [sections, search]);

  const capacityWarnings = sections.filter((section) => section.enrolledCount >= section.capacity).map((s) => s.id);

  if (!isAdmin) {
    return <p className="text-gray-600">You do not have access to this planner.</p>;
  }

  if (loading && !sections.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Section Planner</h1>
          <p className="text-gray-600 mt-1">Review room usage and capacity risks for the selected term.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-gray-700">
            Term
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedTermId || ''}
              onChange={(event) => setSelectedTermId(event.target.value)}
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.code})
                </option>
              ))}
            </select>
          </label>
          <Input placeholder="Search courses" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {message && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          title="Sections"
          value={sections.length.toString()}
          subtitle="Active in this term"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          title="Capacity warnings"
          value={capacityWarnings.length.toString()}
          subtitle="Enrolled = capacity"
        />
        <SummaryCard
          icon={<Map className="w-5 h-5 text-amber-600" />}
          title="Room clashes"
          value={roomConflicts.size.toString()}
          subtitle="Overlapping times"
        />
      </div>

      <Card title="Planner matrix">
        {filteredSections.length === 0 ? (
          <p className="text-sm text-gray-500">No sections match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Schedule</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Room</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Enrollment</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSections.map((section) => {
                  const capacityRisk = section.enrolledCount >= section.capacity;
                  const clash = roomConflicts.has(section.id);
                  return (
                    <tr key={section.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">
                          {section.courseCode} — Section {section.sectionNumber}
                        </p>
                        <p className="text-sm text-gray-600">{section.courseName}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{section.scheduleDays.join(', ')}</p>
                        <p className="text-xs text-gray-500">
                          {section.startTime} - {section.endTime}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{section.roomCode || 'TBA'}</p>
                        {section.roomCapacity && (
                          <p className="text-xs text-gray-500">Room cap {section.roomCapacity}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {section.enrolledCount}/{section.capacity}
                        {section.waitlistCount > 0 && (
                          <span className="block text-xs text-gray-500">Waitlist: {section.waitlistCount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        {!capacityRisk && !clash && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                          </span>
                        )}
                        {capacityRisk && (
                          <span className="block text-xs font-semibold text-red-600">Capacity reached</span>
                        )}
                        {clash && (
                          <span className="block text-xs font-semibold text-amber-600">Room clash detected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}

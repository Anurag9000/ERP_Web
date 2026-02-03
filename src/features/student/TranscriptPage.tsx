import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader2, FileText, Printer, Download } from 'lucide-react';
import { services } from '../../services/serviceLocator';
import type {
  RegistrarRequest,
  RegistrarRequestType,
  RegistrarDeliveryFormat,
  RegistrarChannel,
} from '../../services/RegistrarService';

interface TranscriptEntry {
  id: string;
  status: string;
  grade: string | null;
  grade_points: number | null;
  sections: {
    id: string;
    section_number: string;
    courses: {
      code: string;
      name: string;
      credits: number;
    };
    terms: {
      name: string;
      code: string;
      start_date: string;
    } | null;
  };
}

export function TranscriptPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<RegistrarRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    requestType: 'TRANSCRIPT' as RegistrarRequestType,
    deliveryFormat: 'PDF' as RegistrarDeliveryFormat,
    preferredChannel: 'EMAIL' as RegistrarChannel,
    message: '',
  });

  useEffect(() => {
    if (user) {
      loadTranscript();
      loadRequests();
    }
  }, [user]);

  async function loadTranscript() {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(
          `
            id,
            status,
            grade,
            grade_points,
            sections(
              id,
              section_number,
              courses(code, name, credits),
              terms(name, code, start_date)
            )
          `
        )
        .eq('student_id', user!.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRecords((data as TranscriptEntry[]) || []);
    } catch (error) {
      console.error('Error loading transcript:', error);
      setMessage('Unable to load transcript data at this time.');
    } finally {
      setLoading(false);
    }
  }

  const groupedByTerm = useMemo(() => {
    const terms = new Map<string, TranscriptEntry[]>();
    records.forEach((record) => {
      const termLabel =
        record.sections?.terms?.name && record.sections?.terms?.code
          ? `${record.sections.terms.name} (${record.sections.terms.code})`
          : 'Unassigned Term';
      const list = terms.get(termLabel) || [];
      list.push(record);
      terms.set(termLabel, list);
    });
    return Array.from(terms.entries());
  }, [records]);

  const totals = useMemo(() => {
    const completed = records.filter((record) => record.status === 'COMPLETED');
    const credits = completed.reduce(
      (sum, record) => sum + (record.sections?.courses?.credits || 0),
      0
    );
    const gradePoints = completed.reduce(
      (sum, record) => sum + (record.grade_points || 0),
      0
    );
    const gpa = credits > 0 ? (gradePoints / credits).toFixed(2) : '0.00';
    return { credits, gpa };
  }, [records]);

  function exportCsv() {
    if (!records.length) {
      setMessage('No transcript data available to export.');
      return;
    }
    const rows = [['term', 'course_code', 'course_name', 'credits', 'grade', 'status']];
    records.forEach((record) => {
      rows.push([
        record.sections?.terms?.code || '',
        record.sections?.courses?.code || '',
        record.sections?.courses?.name || '',
        String(record.sections?.courses?.credits ?? 0),
        record.grade || '',
        record.status,
      ]);
    });
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transcript.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadRequests() {
    if (!user) return;
    try {
      setRequestsLoading(true);
      const data = await services.registrarService.fetchRequests(user.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading registrar requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  }

  function printTranscript() {
    if (!records.length) {
      setMessage('No transcript data available to print.');
      return;
    }

    const tableRows = records
      .map((record) => {
        const term = record.sections?.terms?.code || '';
        const course = `${record.sections?.courses?.code || ''} - ${record.sections?.courses?.name || ''}`;
        const credits = record.sections?.courses?.credits ?? '';
        const grade = record.grade || '';
        const status = record.status;
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${term}</td>
          <td style="padding:8px;border:1px solid #ddd;">${course}</td>
          <td style="padding:8px;border:1px solid #ddd;">${credits}</td>
          <td style="padding:8px;border:1px solid #ddd;">${grade}</td>
          <td style="padding:8px;border:1px solid #ddd;">${status}</td>
        </tr>`;
      })
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Transcript</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 48px; position: relative; color: #111827; }
            h1 { margin-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; margin-top: 24px; }
            th { background: #f4f4f5; text-align: left; padding: 8px; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
            .summary { margin-top: 4px; color: #374151; }
            .watermark {
              position: fixed;
              top: 35%;
              left: 50%;
              transform: translateX(-50%) rotate(-25deg);
              font-size: 96px;
              letter-spacing: 8px;
              color: rgba(79, 70, 229, 0.08);
              text-transform: uppercase;
              pointer-events: none;
            }
            .meta { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="watermark">Unofficial Copy</div>
          <h1>Academic Transcript</h1>
          <p>Student: ${user?.email || ''}</p>
          <p class="summary">Total Credits: ${totals.credits} | GPA: ${totals.gpa}</p>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Course</th>
                <th>Credits</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <p class="meta">Generated on ${new Date().toLocaleString()} · Official sealed copies must be requested from the registrar.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No transcript history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Official Transcript</h1>
          <p className="text-gray-600 mt-1">
            Review your academic history and export the record for official use.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCertificate('ENROLLMENT')}>
            <FileText className="w-4 h-4 mr-2" />
            Enrollment Certificate
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCertificate('STANDING')}>
            <FileText className="w-4 h-4 mr-2" />
            Standing Certificate
          </Button>
          <Button size="sm" onClick={printTranscript}>
            <Printer className="w-4 h-4 mr-2" />
            Print Transcript
          </Button>
        </div>
      </div>

      {message && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completed Credits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.credits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cumulative GPA</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.gpa}</p>
          </div>
        </div>
      </Card>

      {groupedByTerm.map(([term, entries]) => (
        <Card key={term} title={term}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Credits</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {record.sections?.courses?.code} · {record.sections?.courses?.name}
                    </td>
                    <td className="px-4 py-3">{record.sections?.courses?.credits}</td>
                    <td className="px-4 py-3">{record.grade ?? '--'}</td>
                    <td className="px-4 py-3">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card title="Registrar Service Desk">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form className="space-y-4" onSubmit={handleSubmitRequest}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-gray-700">
                Request type
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={requestForm.requestType}
                  onChange={(event) =>
                    setRequestForm((prev) => ({ ...prev, requestType: event.target.value as RegistrarRequestType }))
                  }
                >
                  <option value="TRANSCRIPT">Official transcript</option>
                  <option value="ENROLLMENT_CERTIFICATE">Enrollment certificate</option>
                  <option value="GRADUATION_CERTIFICATE">Graduation certificate</option>
                  <option value="OTHER">Other / clarification</option>
                </select>
              </label>
              <label className="text-sm text-gray-700">
                Delivery format
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={requestForm.deliveryFormat}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      deliveryFormat: event.target.value as RegistrarDeliveryFormat,
                    }))
                  }
                >
                  <option value="PDF">PDF (email)</option>
                  <option value="PAPER">Paper pick-up</option>
                  <option value="NOTARIZED">Notarized copy</option>
                </select>
              </label>
            </div>
            <label className="text-sm text-gray-700">
              Preferred channel
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={requestForm.preferredChannel}
                onChange={(event) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    preferredChannel: event.target.value as RegistrarChannel,
                  }))
                }
              >
                <option value="EMAIL">Email delivery</option>
                <option value="PICKUP">Campus pick-up</option>
              </select>
            </label>
            <label className="text-sm text-gray-700 block">
              Message / instructions
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={4}
                value={requestForm.message}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Provide delivery instructions, destination email, or registrar questions..."
              />
            </label>
            <Button type="submit" disabled={submittingRequest}>
              {submittingRequest ? 'Sending...' : 'Send to registrar'}
            </Button>
            <p className="text-xs text-gray-500">
              The registrar will respond via email. You can track request status on the right.
            </p>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Recent requests</h3>
              {requestsLoading && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">No registrar requests yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {requests.map((request) => (
                  <div key={request.id} className="p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {request.request_type.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[request.status] || 'bg-gray-100 text-gray-700'}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {new Date(request.created_at).toLocaleDateString()} · {request.delivery_format} via {request.preferred_channel.toLowerCase()}
                    </p>
                    {request.message && <p className="text-sm text-gray-700 mt-2">{request.message}</p>}
                    {request.admin_notes && (
                      <p className="text-xs text-blue-700 mt-2">Registrar notes: {request.admin_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
  function downloadCertificate(type: 'ENROLLMENT' | 'STANDING') {
    if (!user) return;
    const windowTitle = type === 'ENROLLMENT' ? 'Enrollment Verification' : 'Certificate of Good Standing';
    const bodyCopy =
      type === 'ENROLLMENT'
        ? `This certifies that ${user.email || 'the student'} is currently enrolled and in good academic standing for the active term.`
        : `This certifies that ${user.email || 'the student'} has completed ${totals.credits} credit hours with a cumulative GPA of ${totals.gpa}.`;

    const certificateWindow = window.open('', '_blank');
    if (!certificateWindow) return;
    certificateWindow.document.write(`
      <html>
        <head>
          <title>${windowTitle}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 60px; text-align: center; background: #f9fafb; color: #111827; position: relative; }
            h1 { font-size: 32px; margin-bottom: 8px; letter-spacing: 2px; }
            h2 { font-size: 20px; letter-spacing: 4px; margin-bottom: 32px; color: #6b7280; }
            p { font-size: 16px; margin: 12px 0; line-height: 1.6; }
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 90px;
              color: rgba(59, 7, 100, 0.05);
              text-transform: uppercase;
              pointer-events: none;
            }
            .seal { margin-top: 40px; font-size: 18px; letter-spacing: 4px; color: #4f46e5; }
            .signature { margin-top: 60px; font-size: 14px; color: #374151; }
            .panel { border: 3px double #d4d4d8; padding: 40px; background: white; position: relative; }
          </style>
        </head>
        <body>
          <div class="panel">
            <div class="watermark">${type === 'ENROLLMENT' ? 'Enrollment' : 'Standing'}</div>
            <h1>${windowTitle}</h1>
            <h2>Registrar's Office</h2>
            <p>${bodyCopy}</p>
            <p>Issued on ${new Date().toLocaleDateString()} · Reference ID #${Date.now().toString().slice(-6)}</p>
            <div class="seal">UNIVERSITY REGISTRAR</div>
            <div class="signature">Digitally generated via student portal · Contact registrar for notarised copies.</div>
          </div>
        </body>
      </html>
    `);
    certificateWindow.document.close();
    certificateWindow.focus();
    certificateWindow.print();
  }

  async function handleSubmitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!requestForm.message.trim()) {
      setMessage('Please describe your request so the registrar can process it.');
      return;
    }
    try {
      setSubmittingRequest(true);
      await services.registrarService.submitRequest(user.id, requestForm);
      setMessage('Registrar request submitted. You will be notified once processed.');
      setRequestForm((prev) => ({ ...prev, message: '' }));
      await loadRequests();
    } catch (error) {
      console.error('Error submitting registrar request:', error);
      setMessage('Could not submit registrar request. Please try again later.');
    } finally {
      setSubmittingRequest(false);
    }
  }

  const statusStyles: Record<string, string> = {
    OPEN: 'bg-amber-50 text-amber-700',
    PROCESSING: 'bg-blue-50 text-blue-700',
    READY: 'bg-emerald-50 text-emerald-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  };
}

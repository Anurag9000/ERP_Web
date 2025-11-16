import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader2, FileText, Printer, Download } from 'lucide-react';

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

  useEffect(() => {
    if (user) {
      loadTranscript();
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
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 24px; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #f4f4f5; text-align: left; padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>Academic Transcript</h1>
          <p>Student: ${user?.email || ''}</p>
          <p>Total Credits: ${totals.credits} | GPA: ${totals.gpa}</p>
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
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
          <Button size="sm" onClick={printTranscript}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
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

      <div className="text-sm text-gray-500 flex items-center space-x-2">
        <FileText className="w-4 h-4" />
        <span>Contact the registrar for sealed transcripts or notarized copies.</span>
      </div>
    </div>
  );
}

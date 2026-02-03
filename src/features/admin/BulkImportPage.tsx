import { useState, useRef, FormEvent } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { services } from '../../services/serviceLocator';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

type ImportType = 'students' | 'courses' | 'enrollments';

export function BulkImportPage() {
    const [importType, setImportType] = useState<ImportType>('students');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setResult(null);
        parseAndValidate(selectedFile);
    }

    async function parseAndValidate(file: File) {
        try {
            const { data, errors: parseErrors } = await services.importExportService.parseCSV(file);

            setPreview(data.slice(0, 10)); // Show first 10 rows

            // Validate based on type
            let validationErrors: any[] = [];
            if (importType === 'students') {
                validationErrors = services.importExportService.validateStudentData(data);
            } else if (importType === 'courses') {
                validationErrors = services.importExportService.validateCourseData(data);
            } else if (importType === 'enrollments') {
                validationErrors = services.importExportService.validateEnrollmentData(data);
            }

            setValidationErrors([...parseErrors, ...validationErrors]);
        } catch (error) {
            console.error('Error parsing file:', error);
        }
    }

    async function handleImport(e: FormEvent) {
        e.preventDefault();
        if (!file || validationErrors.length > 0) return;

        setImporting(true);
        setResult(null);

        try {
            const { data } = await services.importExportService.parseCSV(file);

            let importResult;
            if (importType === 'students') {
                importResult = await services.importExportService.importStudents(data);
            } else if (importType === 'courses') {
                importResult = await services.importExportService.importCourses(data);
            } else if (importType === 'enrollments') {
                importResult = await services.importExportService.importEnrollments(data);
            }

            setResult(importResult);

            if (importResult?.success) {
                setFile(null);
                setPreview([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error: any) {
            setResult({
                success: false,
                imported: 0,
                failed: 0,
                errors: [error.message]
            });
        } finally {
            setImporting(false);
        }
    }

    async function handleExport(type: ImportType) {
        try {
            let csv = '';
            if (type === 'students') {
                csv = await services.importExportService.exportStudents();
            } else if (type === 'courses') {
                csv = await services.importExportService.exportCourses();
            } else if (type === 'enrollments') {
                csv = await services.importExportService.exportEnrollments();
            }

            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting:', error);
        }
    }

    function downloadTemplate(type: ImportType) {
        let headers = '';
        if (type === 'students') {
            headers = 'student_id,first_name,last_name,email,phone,password';
        } else if (type === 'courses') {
            headers = 'code,name,description,credits,department_code';
        } else if (type === 'enrollments') {
            headers = 'student_id,course_code,section_number,status,grade,enrolled_at';
        }

        const blob = new Blob([headers], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_template.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    const hasErrors = validationErrors.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Import/Export</h1>
                <p className="text-gray-600 mt-1">Import or export data in bulk using CSV files</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Import Section */}
                <Card title="Import Data">
                    <form onSubmit={handleImport} className="space-y-4">
                        <Select
                            label="Data Type"
                            value={importType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setImportType(e.target.value as ImportType);
                                setFile(null);
                                setPreview([]);
                                setValidationErrors([]);
                                setResult(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                        >
                            <option value="students">Students</option>
                            <option value="courses">Courses</option>
                            <option value="enrollments">Enrollments</option>
                        </Select>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CSV File
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadTemplate(importType)}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Template
                                </Button>
                            </div>
                        </div>

                        {file && (
                            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFile(null);
                                        setPreview([]);
                                        setValidationErrors([]);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {hasErrors && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-900 text-sm">
                                            {validationErrors.length} Validation Error(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {validationErrors.slice(0, 10).map((error, idx) => (
                                        <p key={idx} className="text-xs text-red-700">
                                            Row {error.row}: {error.field} - {error.message}
                                        </p>
                                    ))}
                                    {validationErrors.length > 10 && (
                                        <p className="text-xs text-red-600 font-medium">
                                            ...and {validationErrors.length - 10} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {result && (
                            <div
                                className={`rounded-lg p-4 ${result.success
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-yellow-50 border border-yellow-200'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <CheckCircle
                                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${result.success ? 'text-green-600' : 'text-yellow-600'
                                            }`}
                                    />
                                    <div>
                                        <p className={`font-semibold text-sm ${result.success ? 'text-green-900' : 'text-yellow-900'}`}>
                                            Import {result.success ? 'Completed' : 'Partially Completed'}
                                        </p>
                                        <p className={`text-xs mt-1 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
                                            Imported: {result.imported} | Failed: {result.failed}
                                        </p>
                                        {result.errors.length > 0 && (
                                            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                                                {result.errors.slice(0, 5).map((error: string, idx: number) => (
                                                    <p key={idx} className="text-xs text-yellow-700">{error}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={!file || hasErrors || importing}
                            className="w-full"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {importing ? 'Importing...' : 'Import Data'}
                        </Button>
                    </form>
                </Card>

                {/* Export Section */}
                <Card title="Export Data">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Export existing data to CSV format for backup or analysis.
                        </p>

                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                onClick={() => handleExport('students')}
                                className="w-full justify-start"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Students
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => handleExport('courses')}
                                className="w-full justify-start"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Courses
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => handleExport('enrollments')}
                                className="w-full justify-start"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Enrollments
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Preview Table */}
            {preview.length > 0 && (
                <Card title="Data Preview (First 10 Rows)">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {Object.keys(preview[0]).map((key) => (
                                        <th
                                            key={key}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {preview.map((row, idx) => (
                                    <tr key={idx}>
                                        {Object.values(row).map((value: any, cellIdx) => (
                                            <td key={cellIdx} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                {String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

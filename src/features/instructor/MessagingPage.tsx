import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import type {
  MessagingSection,
  MessagingStudent,
  SectionMessage,
} from '../../services/InstructorMessagingService';
import { Send, Users, Mail, MessageSquare } from 'lucide-react';

export function MessagingPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<MessagingSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [students, setStudents] = useState<MessagingStudent[]>([]);
  const [messages, setMessages] = useState<SectionMessage[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<'IN_APP' | 'EMAIL'>('IN_APP');
  const [scope, setScope] = useState<'SECTION' | 'STUDENT'>('SECTION');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSections();
  }, [user]);

  useEffect(() => {
    if (!selectedSectionId) return;
    loadSectionData(selectedSectionId);
  }, [selectedSectionId]);

  async function loadSections() {
    if (!user) return;
    try {
      setLoading(true);
      const result = await services.instructorMessagingService.fetchSections(user.id);
      setSections(result);
      if (!selectedSectionId && result.length) {
        setSelectedSectionId(result[0].id);
      }
    } catch (error) {
      console.error('Error loading sections', error);
      setMessage('Unable to load messaging sections.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSectionData(sectionId: string) {
    try {
      setLoading(true);
      const [rosterData, messageData] = await Promise.all([
        services.instructorMessagingService.fetchStudents(sectionId),
        services.instructorMessagingService.fetchMessages(sectionId),
      ]);
      setStudents(rosterData);
      setMessages(messageData);
      setSelectedRecipients(new Set(rosterData.map((student) => student.id)));
    } catch (error) {
      console.error('Error loading messaging data', error);
      setMessage('Unable to load messaging data.');
    } finally {
      setLoading(false);
    }
  }

  function toggleRecipient(studentId: string) {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selectedSectionId) return;
    if (!title.trim() || !body.trim()) {
      setMessage('Please enter a title and message.');
      return;
    }
    const recipientIds = scope === 'SECTION' ? students.map((student) => student.id) : Array.from(selectedRecipients);
    if (!recipientIds.length) {
      setMessage('Select at least one recipient.');
      return;
    }
    try {
      setSending(true);
      await services.instructorMessagingService.sendMessage(user.id, {
        sectionId: selectedSectionId,
        title,
        body,
        deliveryScope: scope,
        deliveryChannel,
        recipientIds,
      });
      setMessage('Message sent successfully.');
      setTitle('');
      setBody('');
      await loadSectionData(selectedSectionId);
    } catch (error) {
      console.error('Error sending message', error);
      setMessage('Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  if (loading && !sections.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading messaging hub...</div>
      </div>
    );
  }

  if (!selectedSectionId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No sections assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instructor Messaging Hub</h1>
          <p className="text-gray-600 mt-1">Reach sections or individual students with targeted announcements.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-700">
            Section
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedSectionId}
              onChange={(event) => setSelectedSectionId(event.target.value)}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.courseCode} - {section.termName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {message && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">{message}</div>}

      <form onSubmit={handleSend}>
        <Card title="Compose message">
          <div className="space-y-4">
            <Input placeholder="Subject" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Message body"
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-gray-700">
                Delivery scope
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as 'SECTION' | 'STUDENT')}
                >
                  <option value="SECTION">Entire section</option>
                  <option value="STUDENT">Selected students</option>
                </select>
              </label>
              <label className="text-sm text-gray-700">
                Channel
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={deliveryChannel}
                  onChange={(event) => setDeliveryChannel(event.target.value as 'IN_APP' | 'EMAIL')}
                >
                  <option value="IN_APP">In-app notification</option>
                  <option value="EMAIL">Email follow-up (stub)</option>
                </select>
              </label>
            </div>

            {scope === 'STUDENT' && (
              <div>
                <p className="text-sm text-gray-700 mb-2">Recipients ({selectedRecipients.size})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-3">
                  {students.map((student) => (
                    <label key={student.id} className="flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.has(student.id)}
                        onChange={() => toggleRecipient(student.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        {student.fullName} — <span className="text-gray-500">{student.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending...' : 'Send message'}
                <Send className="w-4 h-4 ml-2" />
              </Button>
              <span className="text-xs text-gray-500">Email delivery is stubbed; connect providers before production use.</span>
            </div>
          </div>
        </Card>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Recent messages" className="lg:col-span-2">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages sent to this section yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-gray-900">{message.title}</p>
                    <span className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 uppercase">
                    {message.deliveryScope} · {message.deliveryChannel}
                  </p>
                  <p className="text-gray-700 mt-2 whitespace-pre-line">{message.body}</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {message.recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {recipient.student?.fullName || recipient.studentId}
                          </p>
                          <p className="text-xs text-gray-500">{recipient.student?.email}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            recipient.status === 'READ' ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          {recipient.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Roster snapshot">
          {students.length === 0 ? (
            <p className="text-sm text-gray-500">No students enrolled.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-900">{student.fullName}</p>
                    <p className="text-xs text-gray-500">{student.email}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{selectedRecipients.has(student.id) ? 'Selected' : 'Muted'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

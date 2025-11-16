import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Wallet, AlertTriangle, Bell, CalendarClock, CheckCircle2, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import type {
  FinanceOverview,
  ReminderPreference,
  ReminderDeliveryMethod,
  FeeScheduleItem,
  InstallmentItem,
} from '../../services/FinanceService';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function FinancePage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reminder, setReminder] = useState<ReminderPreference | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    if (user) {
      loadFinance();
    }
  }, [user]);

  async function loadFinance() {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await services.financeService.fetchOverview(user.id);
      setOverview(data);
      setReminder(data.reminder);
    } catch (error) {
      console.error('Error loading finance overview', error);
      setMessage('Unable to load fees and installments at the moment.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReminderUpdate(updates: Partial<ReminderPreference>) {
    if (!user || !reminder) return;
    const nextPreference: ReminderPreference = { ...reminder, ...updates };
    setReminder(nextPreference);
    try {
      setSavingReminder(true);
      const saved = await services.financeService.saveReminderPreference(user.id, nextPreference);
      setReminder(saved);
      setMessage('Reminder preferences updated.');
    } catch (error) {
      console.error('Error updating reminder preference', error);
      setMessage('Could not update reminder preferences. Try again later.');
    } finally {
      setSavingReminder(false);
    }
  }

  const upcomingInstallment = useMemo(() => {
    if (!overview?.installments?.length) return null;
    return overview.installments
      .filter((installment) => installment.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }, [overview]);

  const recentPayments = useMemo(() => {
    if (!overview?.fees?.length) return [];
    return overview.fees
      .flatMap((fee) =>
        fee.payments.map((payment) => ({
          ...payment,
          feeName: fee.feeName,
        }))
      )
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5);
  }, [overview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No finance data available.</p>
        <Button className="mt-4" onClick={loadFinance}>
          Retry
        </Button>
      </div>
    );
  }

  const reminderText = upcomingInstallment
    ? `Next installment reminder scheduled for ${new Date(upcomingInstallment.dueDate).toLocaleDateString()}.`
    : 'All installments are up to date.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fees & Installments</h1>
          <p className="text-gray-600 mt-1">
            Review your fee schedule, visualise installment progress, and control reminder notifications.
          </p>
        </div>
        <Button variant="outline" onClick={loadFinance}>
          Refresh
        </Button>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Outstanding Balance"
          value={currency.format(overview.totals.outstanding)}
          icon={<Wallet className="w-5 h-5 text-blue-600" />}
        />
        <SummaryCard
          title="Paid to Date"
          value={currency.format(overview.totals.paid)}
          icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
        />
        <SummaryCard
          title="Fees Overdue"
          value={overview.totals.overdueCount.toString()}
          color="red"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <SummaryCard
          title="Next Due Date"
          value={overview.totals.nextDueDate ? new Date(overview.totals.nextDueDate).toLocaleDateString() : 'None'}
          icon={<CalendarClock className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card
          title="Fee Schedule"
          subtitle="Track each fee component, payment progress, and due dates"
          className="lg:col-span-2"
        >
          {overview.fees.length === 0 ? (
            <p className="text-sm text-gray-500">No fee items assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {overview.fees.map((fee) => (
                <FeeRow key={fee.id} fee={fee} />
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Reminder Settings"
          subtitle={reminderText}
        >
          {reminder && (
            <div className="space-y-4 text-sm text-gray-700">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={reminder.enabled}
                  onChange={(event) => handleReminderUpdate({ enabled: event.target.checked })}
                  disabled={savingReminder}
                />
                <span>Enable finance reminders for upcoming fees</span>
              </label>
              <div>
                <p className="mb-1 text-xs uppercase text-gray-500">Delivery method</p>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={reminder.deliveryMethod}
                  onChange={(event) =>
                    handleReminderUpdate({ deliveryMethod: event.target.value as ReminderDeliveryMethod })
                  }
                  disabled={savingReminder}
                >
                  <option value="IN_APP">In-app notification</option>
                  <option value="EMAIL">Email summary</option>
                  <option value="DIGEST">Weekly digest</option>
                </select>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800 flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>
                  {reminder.enabled
                    ? `Reminders will be sent via ${formatDelivery(reminder.deliveryMethod)}.`
                    : 'Reminders are currently disabled.'}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card
          title="Installment Visualisation"
          subtitle="Monitor progress and outstanding amounts per installment"
        >
          {overview.installments.length === 0 ? (
            <p className="text-sm text-gray-500">Installment plan not configured.</p>
          ) : (
            <InstallmentTimeline installments={overview.installments} />
          )}
        </Card>

        <Card title="Recent Payments" subtitle="Chronological log of last payments">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="p-3 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{currency.format(payment.amount)}</p>
                    <span className="text-xs text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{payment.feeName}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{payment.paymentMethod || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  color?: 'red';
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color === 'red' ? 'bg-red-50' : 'bg-blue-50'}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function FeeRow({ fee }: { fee: FeeScheduleItem }) {
  const progress = Math.min(100, Math.round((fee.amountPaid / (fee.amount || 1)) * 100));
  return (
    <div className="rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{fee.feeName}</p>
          <p className="text-sm text-gray-500">{fee.term}</p>
          <p className="text-xs text-gray-400 uppercase mt-1">{fee.feeType}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Due {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'Flexible'}</p>
          <p className="text-lg font-semibold text-gray-900">{currency.format(fee.amount)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{currency.format(fee.amountPaid)} paid</span>
          <StatusBadge status={fee.status} />
        </div>
      </div>
    </div>
  );
}

function InstallmentTimeline({ installments }: { installments: InstallmentItem[] }) {
  return (
    <div className="space-y-6">
      {installments.map((installment, index) => {
        const progress = Math.min(100, Math.round((installment.paidAmount / (installment.amount || 1)) * 100));
        const isLast = index === installments.length - 1;
        return (
          <div key={installment.id} className="relative pl-8">
            <div className="absolute left-0 top-2">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  installment.status === 'PAID'
                    ? 'bg-green-100 border-green-500'
                    : installment.status === 'OVERDUE'
                    ? 'bg-red-100 border-red-500'
                    : 'bg-blue-100 border-blue-500'
                }`}
              />
              {!isLast && <span className="block w-px h-full bg-gray-200 mx-auto" style={{ height: '100%' }} />}
            </div>
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Installment {installment.installmentNumber}</p>
                  <p className="text-sm text-gray-600">
                    Due {new Date(installment.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900">{currency.format(installment.amount)}</p>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full ${installment.status === 'OVERDUE' ? 'bg-red-400' : 'bg-indigo-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{currency.format(installment.paidAmount)} paid</span>
                  <StatusBadge status={installment.status} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Paid
      </span>
    );
  }

  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      Pending
    </span>
  );
}

function formatDelivery(method: ReminderDeliveryMethod) {
  if (method === 'DIGEST') return 'weekly digest';
  if (method === 'EMAIL') return 'email delivery';
  return 'in-app alerts';
}

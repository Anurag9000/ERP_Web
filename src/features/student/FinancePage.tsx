import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Wallet, AlertTriangle, CalendarClock, CheckCircle2, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import { StudentFee, PaymentTransaction } from '../../services/FinanceService';
import { PaymentModal } from '../finance/PaymentModal';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function FinancePage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Payment Modal State
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);

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
      const [feesData, historyData] = await Promise.all([
        services.financeService.fetchStudentFees(user.id),
        services.financeService.getTransactionHistory(user.id)
      ]);
      setFees(feesData);
      setTransactions(historyData);
    } catch (error) {
      console.error('Error loading finance data', error);
      setMessage('Unable to load finance data at the moment.');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const outstanding = fees.reduce((acc, fee) => acc + (fee.amount - (fee.amount_paid || 0)), 0);
    const paid = fees.reduce((acc, fee) => acc + (fee.amount_paid || 0), 0);
    const overdueCount = fees.filter(f => f.status === 'OVERDUE').length;

    // Find next due date
    const pendingFees = fees.filter(f => f.status !== 'PAID' && f.due_date);
    const nextDueDate = pendingFees.length > 0
      ? pendingFees.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0].due_date
      : null;

    return { outstanding, paid, overdueCount, nextDueDate };
  }, [fees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fees & Payments</h1>
          <p className="text-gray-600 mt-1">
            Manage your tuition fees, view payment history, and make payments.
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
          value={currency.format(totals.outstanding)}
          icon={<Wallet className="w-5 h-5 text-blue-600" />}
        />
        <SummaryCard
          title="Paid to Date"
          value={currency.format(totals.paid)}
          icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
        />
        <SummaryCard
          title="Fees Overdue"
          value={totals.overdueCount.toString()}
          color="red"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <SummaryCard
          title="Next Due Date"
          value={totals.nextDueDate ? new Date(totals.nextDueDate).toLocaleDateString() : 'None'}
          icon={<CalendarClock className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card
          title="Fee Schedule"
          subtitle="All assigned fees and their status"
          className="lg:col-span-2"
        >
          {fees.length === 0 ? (
            <p className="text-sm text-gray-500">No fees assigned.</p>
          ) : (
            <div className="space-y-4">
              {fees.map((fee) => (
                <FeeRow
                  key={fee.id}
                  fee={fee}
                  onPay={() => setSelectedFee(fee)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Transactions" subtitle="Payment history">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions found.</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((payment) => (
                <div key={payment.id} className="p-3 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{currency.format(payment.amount)}</p>
                    <span className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{payment.payment_method}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Payment Modal */}
      {selectedFee && (
        <PaymentModal
          fee={selectedFee}
          onClose={() => setSelectedFee(null)}
          onSuccess={() => {
            loadFinance(); // Refresh data
            setSelectedFee(null);
          }}
        />
      )}
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

function FeeRow({ fee, onPay }: { fee: StudentFee; onPay: () => void }) {
  const progress = Math.min(100, Math.round(((fee.amount_paid || 0) / (fee.amount || 1)) * 100));
  const isPaid = fee.status === 'PAID';
  const remaining = fee.amount - (fee.amount_paid || 0);

  return (
    <div className="rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{fee.fee_type}</p>
          {fee.terms && <p className="text-sm text-gray-500">{fee.terms.name}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Due {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'Flexible'}</p>
          <p className="text-lg font-semibold text-gray-900">{currency.format(fee.amount)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-gray-600 font-medium">{progress}%</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>{currency.format(fee.amount_paid || 0)} paid</span>
          <div className="flex items-center gap-2">
            <StatusBadge status={fee.status} />
            {!isPaid && (
              <Button size="sm" onClick={onPay}>Pay ${remaining}</Button>
            )}
          </div>
        </div>
      </div>
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

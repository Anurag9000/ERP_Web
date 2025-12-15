
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { services } from '../../services/serviceLocator';
import { StudentFee } from '../../services/FinanceService';

interface PaymentModalProps {
    fee: StudentFee;
    onClose: () => void;
    onSuccess: () => void;
}

export function PaymentModal({ fee, onClose, onSuccess }: PaymentModalProps) {
    const [amount, setAmount] = useState((fee.amount - fee.amount_paid).toString());
    const [method, setMethod] = useState('CREDIT_CARD');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const remaining = fee.amount - fee.amount_paid;

    async function handleSubmit() {
        setLoading(true);
        setError(null);
        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val <= 0) throw new Error('Invalid amount');
            if (val > remaining) throw new Error(`Amount cannot exceed outstanding balance of $${remaining}`);

            // Simulate network delay for "processing"
            await new Promise(r => setTimeout(r, 1000));

            await services.financeService.recordPayment(fee.student_id, fee.id, val, method);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Successful</h2>
                    <p className="text-gray-600 mt-2">Your transaction has been recorded.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Make Payment
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Paying: {fee.fee_type}</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-gray-600">Outstanding Balance</span>
                        <span className="font-bold text-lg text-gray-900">${remaining.toFixed(2)}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            min="0.01"
                            max={remaining}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            {/* <option value="SCHOLARSHIP">Scholarship</option> */}
                        </select>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {loading ? 'Processing...' : 'Pay Now'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

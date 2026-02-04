

import { supabase } from '../lib/supabase';

export interface StudentFee {
  id: string;
  student_id: string;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  fee_type: string; // e.g., 'TUITION', 'LAB', 'LIBRARY'
  term_id: string;
  terms: { name: string; code: string };
  fee_structures?: { name: string };
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id: string | null;
  status?: string;
}

export class FinanceService {
  async fetchStudentFees(studentId: string): Promise<StudentFee[]> {
    const { data, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        terms (name, code),
        fee_structures (name)
      `)
      .eq('student_id', studentId)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
      ...(row as StudentFee),
      fee_type: (row as any).fee_structures?.name || 'Fee', // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
  }

  async recordPayment(studentId: string, feeId: string, amount: number, method: string) {
    // 1. Record Payment
    const { data: payment, error: payError } = await (supabase
      .from('payments') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        student_id: studentId,
        student_fee_id: feeId,
        amount,
        payment_method: method,
        payment_date: new Date().toISOString(),
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select()
      .single() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (payError) throw payError;

    // 2. Update Fee Status
    // Fetch current fee status to calculate new paid amount
    const { data: fee } = await supabase
      .from('student_fees')
      .select('amount, amount_paid')
      .eq('id', feeId)
      .single();

    if (fee) {
      const updatedAmountPaid = (fee as any).amount_paid + amount; // eslint-disable-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('student_fees') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
          amount_paid: updatedAmountPaid,
          status: updatedAmountPaid >= (fee as any).amount ? 'PAID' : 'PARTIAL' // eslint-disable-line @typescript-eslint/no-explicit-any
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .eq('id', feeId) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw error;
    }

    return payment;
  }

  async getTransactionHistory(studentId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

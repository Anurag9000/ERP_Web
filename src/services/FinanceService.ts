import { supabase } from '../lib/supabase';

export type ReminderDeliveryMethod = 'IN_APP' | 'EMAIL' | 'DIGEST';

export interface ReminderPreference {
  enabled: boolean;
  deliveryMethod: ReminderDeliveryMethod;
}

export interface InstallmentItem {
  id: string;
  studentFeeId: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
}

export interface FeeScheduleItem {
  id: string;
  term: string;
  feeName: string;
  feeType: string;
  amount: number;
  amountPaid: number;
  dueDate: string | null;
  status: string;
  installments: InstallmentItem[];
  payments: {
    id: string;
    amount: number;
    paymentMethod: string | null;
    paymentDate: string;
  }[];
}

export interface FinanceOverview {
  fees: FeeScheduleItem[];
  totals: {
    outstanding: number;
    paid: number;
    overdueCount: number;
    nextDueDate: string | null;
  };
  installments: InstallmentItem[];
  reminder: ReminderPreference;
}

type StudentFeeRow = {
  id: string;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  fee_structures?: {
    name: string;
    fee_type: string;
  } | null;
  terms?: {
    name: string;
    code: string;
  } | null;
  installment_plans?: {
    id: string;
    student_fee_id: string;
    installment_number: number;
    amount: number;
    paid_amount: number;
    due_date: string;
    status: string;
  }[];
  payments?: {
    id: string;
    amount: number;
    payment_method: string | null;
    payment_date: string;
  }[];
};

export class FinanceService {
  async fetchOverview(studentId: string): Promise<FinanceOverview> {
    const [feeResp, preferenceResp] = await Promise.all([
      supabase
        .from('student_fees')
        .select(
          `
            id,
            amount,
            amount_paid,
            due_date,
            status,
            fee_structures (
              name,
              fee_type
            ),
            terms (
              name,
              code
            ),
            installment_plans!student_fee_id (
              id,
              student_fee_id,
              installment_number,
              amount,
              paid_amount,
              due_date,
              status
            ),
            payments!student_fee_id (
              id,
              amount,
              payment_method,
              payment_date
            )
          `
        )
        .eq('student_id', studentId),
      supabase
        .from('notification_preferences')
        .select('enabled, delivery_method')
        .eq('user_id', studentId)
        .eq('category', 'FINANCE')
        .maybeSingle(),
    ]);

    if (feeResp.error) throw feeResp.error;
    if (preferenceResp.error) throw preferenceResp.error;

    const feeRows = (feeResp.data as StudentFeeRow[]) || [];
    const fees: FeeScheduleItem[] = feeRows.map((row) => ({
      id: row.id,
      term: row.terms ? `${row.terms.name} (${row.terms.code})` : 'Unassigned',
      feeName: row.fee_structures?.name || 'Fee',
      feeType: (row.fee_structures?.fee_type || 'GENERAL').replace('_', ' '),
      amount: row.amount || 0,
      amountPaid: row.amount_paid || 0,
      dueDate: row.due_date,
      status: row.status,
      installments:
        row.installment_plans?.map((inst) => ({
          id: inst.id,
          studentFeeId: inst.student_fee_id,
          installmentNumber: inst.installment_number,
          amount: Number(inst.amount || 0),
          paidAmount: Number(inst.paid_amount || 0),
          dueDate: inst.due_date,
          status: inst.status,
        })) || [],
      payments:
        row.payments?.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount || 0),
          paymentMethod: payment.payment_method,
          paymentDate: payment.payment_date,
        })) || [],
    }));

    const outstanding = fees.reduce((sum, fee) => sum + Math.max(fee.amount - fee.amountPaid, 0), 0);
    const paid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    const overdueCount = fees.filter((fee) => fee.status === 'OVERDUE').length;

    const upcoming = fees
      .filter((fee) => fee.dueDate)
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
    const nextDueDate = upcoming.length ? upcoming[0].dueDate ?? null : null;

    const installments = fees.flatMap((fee) => fee.installments);

    const reminder: ReminderPreference = preferenceResp.data
      ? {
          enabled: preferenceResp.data.enabled ?? true,
          deliveryMethod: (preferenceResp.data.delivery_method as ReminderDeliveryMethod) || 'IN_APP',
        }
      : {
          enabled: true,
          deliveryMethod: 'IN_APP',
        };

    return {
      fees,
      totals: {
        outstanding,
        paid,
        overdueCount,
        nextDueDate,
      },
      installments: installments.sort((a, b) => a.installmentNumber - b.installmentNumber),
      reminder,
    };
  }

  async saveReminderPreference(studentId: string, preference: ReminderPreference): Promise<ReminderPreference> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: studentId,
          category: 'FINANCE',
          enabled: preference.enabled,
          delivery_method: preference.deliveryMethod,
        },
        { onConflict: 'user_id,category' }
      )
      .select('enabled, delivery_method')
      .maybeSingle();

    if (error) throw error;

    return {
      enabled: data?.enabled ?? preference.enabled,
      deliveryMethod: (data?.delivery_method as ReminderDeliveryMethod) || preference.deliveryMethod,
    };
  }
}

import { supabase } from '../lib/supabase';

export type RegistrarRequestType = 'TRANSCRIPT' | 'ENROLLMENT_CERTIFICATE' | 'GRADUATION_CERTIFICATE' | 'OTHER';
export type RegistrarDeliveryFormat = 'PDF' | 'PAPER' | 'NOTARIZED';
export type RegistrarChannel = 'EMAIL' | 'PICKUP';
export type RegistrarStatus = 'OPEN' | 'PROCESSING' | 'READY' | 'CLOSED';

export interface RegistrarRequest {
  id: string;
  student_id: string;
  request_type: RegistrarRequestType;
  delivery_format: RegistrarDeliveryFormat;
  preferred_channel: RegistrarChannel;
  message: string | null;
  status: RegistrarStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface RegistrarRequestPayload {
  requestType: RegistrarRequestType;
  deliveryFormat: RegistrarDeliveryFormat;
  preferredChannel: RegistrarChannel;
  message: string;
}

export class RegistrarService {
  private table() {
    return (supabase as any).from('registrar_requests');
  }

  async fetchRequests(studentId: string): Promise<RegistrarRequest[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as RegistrarRequest[]) || [];
  }

  async submitRequest(studentId: string, payload: RegistrarRequestPayload) {
    const { error } = await this.table().insert({
      student_id: studentId,
      request_type: payload.requestType,
      delivery_format: payload.deliveryFormat,
      preferred_channel: payload.preferredChannel,
      message: payload.message,
    });
    if (error) throw error;
  }

  async fetchCourses(): Promise<any[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, name')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
}

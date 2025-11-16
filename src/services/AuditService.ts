import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

interface AuditPayload {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Json;
  newValues?: Json;
}

export class AuditService {
  async record(payload: AuditPayload) {
    const { userId, action, entityType, entityId = null, oldValues = null, newValues = null } = payload;
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
    });
    if (error) {
      console.error('Failed to write audit log', error);
    }
  }

  async maintenanceToggle(userId: string, enabled: boolean) {
    await this.record({
      userId,
      action: enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
      entityType: 'MAINTENANCE',
      newValues: { enabled },
    });
  }

  async maintenanceWindow(userId: string, windowId: string) {
    await this.record({
      userId,
      action: 'MAINTENANCE_WINDOW_CREATED',
      entityType: 'MAINTENANCE',
      entityId: windowId,
    });
  }

  async enrollment(userId: string, sectionId: string, action: 'ENROLLED' | 'DROPPED' | 'WAITLISTED') {
    await this.record({
      userId,
      action,
      entityType: 'ENROLLMENT',
      entityId: sectionId,
    });
  }

  async gradeEdit(userId: string, assessmentId: string, studentId: string, marks: number) {
    await this.record({
      userId,
      action: 'GRADE_EDITED',
      entityType: 'GRADE',
      entityId: assessmentId,
      newValues: { studentId, marks },
    });
  }
}

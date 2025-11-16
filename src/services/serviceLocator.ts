import { EnrollmentService } from './EnrollmentService';
import { GradebookService } from './GradebookService';
import { AuditService } from './AuditService';

class ServiceLocator {
  readonly auditService = new AuditService();
  readonly enrollmentService = new EnrollmentService(this.auditService);
  readonly gradebookService = new GradebookService(this.auditService);
}

export const services = new ServiceLocator();

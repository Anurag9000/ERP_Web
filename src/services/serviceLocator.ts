import { EnrollmentService } from './EnrollmentService';
import { GradebookService } from './GradebookService';
import { AuditService } from './AuditService';
import { AnalyticsService } from './AnalyticsService';
import { RegistrarService } from './RegistrarService';
import { FinanceService } from './FinanceService';
import { InstructorAttendanceService } from './InstructorAttendanceService';

class ServiceLocator {
  readonly auditService = new AuditService();
  readonly enrollmentService = new EnrollmentService(this.auditService);
  readonly gradebookService = new GradebookService(this.auditService);
  readonly analyticsService = new AnalyticsService();
  readonly registrarService = new RegistrarService();
  readonly financeService = new FinanceService();
  readonly instructorAttendanceService = new InstructorAttendanceService();
}

export const services = new ServiceLocator();

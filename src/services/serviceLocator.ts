import { EnrollmentService } from './EnrollmentService';
import { GradebookService } from './GradebookService';

class ServiceLocator {
  readonly enrollmentService = new EnrollmentService();
  readonly gradebookService = new GradebookService();
}

export const services = new ServiceLocator();

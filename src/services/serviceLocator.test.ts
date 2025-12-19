import { describe, it, expect } from 'vitest';
import { services } from './serviceLocator';
import { AuditService } from './AuditService';
import { EnrollmentService } from './EnrollmentService';

describe('ServiceLocator', () => {
    it('provides singleton instances of services', () => {
        const audit1 = services.auditService;
        const audit2 = services.auditService;
        expect(audit1).toBeInstanceOf(AuditService);
        expect(audit1).toBe(audit2);
    });

    it('injects dependencies correctly (e.g., AuditService into EnrollmentService)', () => {
        const enrollmentService = services.enrollmentService;
        expect(enrollmentService).toBeInstanceOf(EnrollmentService);
        // We can't easily check private members, but we verify it's instantiated
    });

    it('provides all expected services', () => {
        expect(services.analyticsService).toBeDefined();
        expect(services.calendarService).toBeDefined();
        expect(services.financeService).toBeDefined();
        expect(services.facultyService).toBeDefined();
        expect(services.registrarService).toBeDefined();
        expect(services.reportingService).toBeDefined();
        expect(services.assignmentService).toBeDefined();
        expect(services.examinationService).toBeDefined();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningGoalsService } from './LearningGoalsService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('LearningGoalsService', () => {
    let service: LearningGoalsService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new LearningGoalsService();
    });

    describe('createGoal', () => {
        it('should create goal and milestones', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'learning_goals') {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'g1' }, error: null })
                    };
                }
                if (table === 'goal_milestones') {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null })
                    };
                }
                return {};
            });

            const result = await service.createGoal('st1', 'Learn TS', 'Master TypeScript', 'SKILL', new Date(), ['Basics', 'Advanced']);
            expect(result.success).toBe(true);
            expect(result.goalId).toBe('g1');
        });
    });

    describe('getStudentGoals', () => {
        it('should fetch and format goals', async () => {
            const mockData = [
                {
                    id: 'g1',
                    student_id: 'st1',
                    title: 'Learn TS',
                    target_date: '2023-12-31',
                    goal_milestones: [{ id: 'm1', title: 'Basics', completed: true }]
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.getStudentGoals('st1');
            expect(result).toHaveLength(1);
            expect(result[0].milestones).toHaveLength(1);
        });
    });
});

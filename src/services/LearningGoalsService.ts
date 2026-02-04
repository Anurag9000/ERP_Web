
import { supabase } from '../lib/supabase';

export interface LearningGoal {
    id: string;
    studentId: string;
    title: string;
    description: string;
    category: 'ACADEMIC' | 'SKILL' | 'CAREER' | 'PERSONAL';
    targetDate: Date;
    progress: number; // 0-100
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    milestones: GoalMilestone[];
    createdAt: Date;
    updatedAt: Date;
}

export interface GoalMilestone {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Date;
}

export class LearningGoalsService {
    /**
     * Create a new learning goal
     */
    async createGoal(
        studentId: string,
        title: string,
        description: string,
        category: LearningGoal['category'],
        targetDate: Date,
        milestones: string[]
    ): Promise<{ success: boolean; goalId?: string; error?: string }> {
        try {
            // Create goal
            const { data: goal, error: goalError } = await supabase
                .from('learning_goals')
                .insert({
                    student_id: studentId,
                    title,
                    description,
                    category,
                    target_date: targetDate.toISOString(),
                    progress: 0,
                    status: 'NOT_STARTED'
                } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select()
                .single() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            if (goalError) throw goalError;



            if (milestones.length > 0) {
                const milestoneData = milestones.map(m => ({
                    goal_id: goal.id,
                    title: m,
                    completed: false
                }));

                const { error: milestoneError } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .from('goal_milestones')
                    .insert(milestoneData);

                if (milestoneError) throw milestoneError;
            }

            return { success: true, goalId: goal.id };
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all goals for a student
     */
    async getStudentGoals(studentId: string): Promise<LearningGoal[]> {
        const { data, error } = await supabase
            .from('learning_goals')
            .select(`
        *,
        goal_milestones (
          id,
          title,
          completed,
          completed_at
        )
      `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((goal: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: goal.id,
            studentId: goal.student_id,
            title: goal.title,
            description: goal.description,
            category: goal.category,
            targetDate: new Date(goal.target_date),
            progress: goal.progress,
            status: goal.status,
            milestones: (goal.goal_milestones || []).map((m: any) => ({
                id: m.id,
                title: m.title,
                completed: m.completed,
                completedAt: m.completed_at ? new Date(m.completed_at) : undefined
            })),
            createdAt: new Date(goal.created_at),
            updatedAt: new Date(goal.updated_at)
        }));
    }

    /**
     * Update goal progress
     */
    async updateProgress(
        goalId: string,
        progress: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const status = progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

            const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('learning_goals')
                .update({
                    progress,
                    status,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', goalId) as any;

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle milestone completion
     */
    async toggleMilestone(
        milestoneId: string,
        completed: boolean
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Get goal ID first to avoid nested calls if possible
            const { data: milestone } = await (supabase as any)
                .from('goal_milestones')
                .select('goal_id')
                .eq('id', milestoneId)
                .single();

            if (!milestone) return { success: false, error: 'Milestone not found' };

            const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('goal_milestones')
                .update({
                    completed,
                    completed_at: completed ? new Date().toISOString() : null
                } as any)
                .eq('id', milestoneId) as any;

            if (error) throw error;

            // Recalculate goal progress
            await this.recalculateGoalProgress(milestone.goal_id);

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Recalculate goal progress based on milestones
     */
    private async recalculateGoalProgress(goalId: string): Promise<void> {
        // Get all milestones for the goal
        const { data: milestones } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .from('goal_milestones')
            .select('completed')
            .eq('goal_id', goalId);

        if (!milestones || milestones.length === 0) {
            await this.updateProgress(goalId, 0);
            return;
        }

        const completedCount = (milestones as any[]).filter(m => m.completed).length;
        const progress = Math.round((completedCount / (milestones as any[]).length) * 100);

        await this.updateProgress(goalId, progress);
    }

    /**
     * Delete a goal
     */
    async deleteGoal(goalId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Delete milestones first
            await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('goal_milestones')
                .delete()
                .eq('goal_id', goalId);

            // Delete goal
            const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('learning_goals')
                .delete()
                .eq('id', goalId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get goal statistics
     */
    async getGoalStatistics(studentId: string): Promise<{
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        averageProgress: number;
    }> {
        const goals = await this.getStudentGoals(studentId);

        const stats = {
            total: goals.length,
            completed: goals.filter(g => g.status === 'COMPLETED').length,
            inProgress: goals.filter(g => g.status === 'IN_PROGRESS').length,
            notStarted: goals.filter(g => g.status === 'NOT_STARTED').length,
            averageProgress: goals.length > 0
                ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
                : 0
        };

        return stats;
    }
}

import { vi } from 'vitest';

export const mockSupabaseResponse = {
    data: null,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
};

const createMockChain = () => {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
        maybeSingle: vi.fn().mockResolvedValue(mockSupabaseResponse),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        csv: vi.fn().mockReturnThis(),
        then: vi.fn((onfulfilled) => Promise.resolve(mockSupabaseResponse).then(onfulfilled)),
        catch: vi.fn((onrejected) => Promise.resolve(mockSupabaseResponse).catch(onrejected)),
    };
    return chain;
};

export const mockSupabase = {
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn(() => Promise.resolve(mockSupabaseResponse)),
    auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    storage: {
        from: vi.fn(() => ({
            upload: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
            remove: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            list: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
    },
};

vi.mock('../../lib/supabase', () => ({
    supabase: mockSupabase,
}));

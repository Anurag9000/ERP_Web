import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '../../types/database';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface UserProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const roleOptions: UserRole[] = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF'];

export function UserManagementPage() {
  const { profile } = useAuth();
  const { canWrite } = useMaintenance();
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          `
            id,
            first_name,
            last_name,
            email,
            role,
            department_id,
            is_active,
            must_change_password,
            departments(id, name, code)
          `
        )
        .order('last_name');

      if (error) throw error;
      setUsers((data as UserProfileRow[]) || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, payload: Partial<UserProfileRow>) {
    if (!canWrite) {
      setMessage('Maintenance mode is active. Admin-only write actions are allowed.');
      return;
    }
    try {
      setSavingId(userId);
      const { error } = await supabase.from('user_profiles').update(payload).eq('id', userId);
      if (error) throw error;
      setMessage('User updated.');
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage('Could not update user. Please try again.');
      setSavingId(null);
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.first_name.toLowerCase().includes(term) ||
        user.last_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    );
  }, [users, search]);

  if (!isAdmin) {
    return <p className="text-gray-600">You do not have access to this page.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Update roles, activate/deactivate accounts, and flag password resets.
          </p>
        </div>
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-80"
        />
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {user.departments ? (
                      <Badge variant="info">{user.departments.code}</Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      disabled={savingId === user.id || !canWrite}
                      onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole })}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? 'success' : 'warning'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === user.id || !canWrite}
                      onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={savingId === user.id || !canWrite}
                      onClick={() => updateUser(user.id, { must_change_password: true })}
                    >
                      Force Password Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

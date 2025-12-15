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
import { services } from '../../services/serviceLocator';

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

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

const roleOptions: UserRole[] = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF'];

export function UserManagementPage() {
  const { profile } = useAuth();
  const { canWrite } = useMaintenance();
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    authUserId: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'STUDENT' as UserRole,
    departmentId: '',
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const [userResp, departmentResp] = await Promise.all([
        supabase
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
          .order('last_name'),
        supabase.from('departments').select('id, name, code').eq('is_active', true).order('name'),
      ]);

      if (userResp.error) throw userResp.error;
      if (departmentResp.error) throw departmentResp.error;

      setUsers((userResp.data as UserProfileRow[]) || []);
      setDepartments(departmentResp.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  }

  async function createUserProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      setMessage('Maintenance mode restricts write operations to admins only.');
      return;
    }
    if (!newUserForm.authUserId) {
      setMessage('Provide the Auth user ID so the profile can be linked.');
      return;
    }
    try {
      setSavingId('create');
      const { error } = await supabase.from('user_profiles').insert({
        id: newUserForm.authUserId,
        first_name: newUserForm.firstName,
        last_name: newUserForm.lastName,
        email: newUserForm.email,
        role: newUserForm.role,
        department_id: newUserForm.departmentId || null,
        is_active: true,
        must_change_password: true,
      });
      if (error) throw error;
      await services.auditService.record({
        userId: profile?.id || null,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: newUserForm.authUserId,
        newValues: {
          email: newUserForm.email,
          role: newUserForm.role,
        },
      });
      setMessage('User profile created.');
      setNewUserForm({ authUserId: '', firstName: '', lastName: '', email: '', role: 'STUDENT', departmentId: '' });
      await loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage('Unable to create user profile.');
    } finally {
      setSavingId(null);
    }
  }

  async function updateUser(userId: string, payload: Partial<UserProfileRow>, auditAction: string) {
    if (!canWrite) {
      setMessage('Maintenance mode is active. Admin-only write actions are allowed.');
      return;
    }
    try {
      setSavingId(userId);
      const { error } = await supabase.from('user_profiles').update(payload).eq('id', userId);
      if (error) throw error;
      await services.auditService.record({
        userId: profile?.id || null,
        action: auditAction,
        entityType: 'USER',
        entityId: userId,
        newValues: payload,
      });
      setMessage('User updated.');
      await loadData();
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
          <h1 className="text-3xl font-bold text-gray-900">User Lifecycle Management</h1>
          <p className="text-gray-600 mt-1">Create accounts, manage roles, and audit suspensions/resets.</p>
        </div>
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-80" />
      </div>

      {message && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">{message}</div>}

      <Card title="Create user profile">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={createUserProfile}>
          <Input
            label="Auth user ID"
            value={newUserForm.authUserId}
            onChange={(e) => setNewUserForm((prev) => ({ ...prev, authUserId: e.target.value }))}
            placeholder="Paste the auth.users UUID"
          />
          <Input
            label="Email"
            type="email"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="First name"
            value={newUserForm.firstName}
            onChange={(e) => setNewUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
          />
          <Input
            label="Last name"
            value={newUserForm.lastName}
            onChange={(e) => setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
          />
          <label className="text-sm text-gray-700">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={newUserForm.role}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Department
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={newUserForm.departmentId}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, departmentId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={savingId === 'create'}>
              {savingId === 'create' ? 'Creating...' : 'Create user'}
            </Button>
          </div>
        </form>
      </Card>

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
                      onChange={(e) => updateUser(user.id, { role: e.target.value as UserRole }, 'ROLE_UPDATED'))
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
                      {user.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === user.id || !canWrite}
                      onClick={() =>
                        updateUser(
                          user.id,
                          { is_active: !user.is_active },
                          user.is_active ? 'USER_SUSPENDED' : 'USER_ACTIVATED'
                        )
                      }
                    >
                      {user.is_active ? 'Suspend' : 'Reactivate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={savingId === user.id || !canWrite}
                      onClick={() => updateUser(user.id, { must_change_password: true }, 'PASSWORD_RESET_FORCED')}
                    >
                      Force password reset
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

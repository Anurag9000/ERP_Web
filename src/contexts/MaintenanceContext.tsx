// @ts-nocheck
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MaintenanceContextValue {
  maintenanceActive: boolean;
  maintenanceMessage: string;
  canWrite: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextValue>({
  maintenanceActive: false,
  maintenanceMessage: '',
  canWrite: true,
});

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['ADMIN', 'STAFF']);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 60000);
    return () => clearInterval(interval);
  }, []);

  async function checkMaintenance() {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (data?.value === 'true') {
        setMaintenanceActive(true);
        setMaintenanceMessage('The system is in maintenance mode. Write actions are currently disabled.');
        return;
      }

      const { data: window } = await supabase
        .from('maintenance_windows')
        .select('*')
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .maybeSingle();

      if (window) {
        const startTime = new Date(window.start_time);
        const now = new Date();
        if (startTime > now) {
          const minutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
          setMaintenanceActive(true);
          setMaintenanceMessage(`Scheduled maintenance begins in ${minutes} minutes. Save your work.`);
        } else {
          setMaintenanceActive(true);
          setMaintenanceMessage('Maintenance is currently in progress.');
        }
      } else {
        setMaintenanceActive(false);
        setMaintenanceMessage('');
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel('maintenance-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, checkMaintenance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_windows' }, checkMaintenance)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentRole(data.session?.user.user_metadata?.role || null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentRole(session?.user.user_metadata?.role || null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const canWrite = useMemo(() => {
    if (!maintenanceActive) return true;
    if (!currentRole) return false;
    return allowedRoles.includes(currentRole);
  }, [maintenanceActive, currentRole, allowedRoles]);

  return (
    <MaintenanceContext.Provider value={{ maintenanceActive, maintenanceMessage, canWrite }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

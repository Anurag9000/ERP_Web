import { ReactNode, useEffect, useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    checkMaintenanceMode();
    const interval = setInterval(checkMaintenanceMode, 60000);
    return () => clearInterval(interval);
  }, []);

  async function checkMaintenanceMode() {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (data?.value === 'true') {
      setMaintenanceMode(true);
      setMaintenanceMessage('System maintenance is currently in progress. Some features may be unavailable.');
    } else {
      const { data: maintenanceWindow } = await supabase
        .from('maintenance_windows')
        .select('*')
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .maybeSingle();

      if (maintenanceWindow) {
        const startTime = new Date(maintenanceWindow.start_time);
        const now = new Date();
        if (startTime > now) {
          const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / 60000);
          setMaintenanceMode(true);
          setMaintenanceMessage(`Scheduled maintenance in ${minutesUntil} minutes. Please save your work.`);
        } else {
          setMaintenanceMode(true);
          setMaintenanceMessage('System maintenance is currently in progress.');
        }
      } else {
        setMaintenanceMode(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {maintenanceMode && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{maintenanceMessage}</span>
          </div>
        </div>
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

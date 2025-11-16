import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AlertCircle } from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { maintenanceActive, maintenanceMessage } = useMaintenance();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {maintenanceActive && (
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

import React, { useState } from 'react';
import RoleStatsCards from './RoleStatsCards';
import CreateUserForm from './CreateUserForm';
import { ResidentVerification } from './ResidentVerification'; // The 'PendingRegistrations' component
import ManageUsers from './ManageUsers'; // The 'ViewAllUsers' component
import OfflineSyncButton from './OfflineSyncButton';
import { Users, UserPlus, UserCheck, Shield } from 'lucide-react';

type Tab = 'overview' | 'create' | 'pending' | 'all-users';

export default function AdminUsersDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('all-users');
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
    { key: 'create', label: 'Create New User', icon: <UserPlus className="w-4 h-4" /> },
    { key: 'pending', label: 'Pending Registrations', icon: <UserCheck className="w-4 h-4" /> },
    { key: 'all-users', label: 'All Users', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-tactical-cyan/10 border border-tactical-cyan/20 rounded-2xl text-tactical-cyan">
             <Users className="w-6 h-6 animate-pulse" />
           </div>
           <div>
             <h2 className="text-2xl font-black font-mono tracking-tight text-white uppercase">
               Admin Dashboard
             </h2>
             <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-0.5">
               Super Admin Panel
             </p>
           </div>
        </div>
      </div>

      {/* Stats Overview (shown regardless of tab if it's overview, or kept persistent. The prompt says "Stats Overview" "Tabs" "Tab Content") */}
      <div className="mb-8">
        <RoleStatsCards />
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="text-gray-400 bg-darker border border-white/10 rounded-2xl p-6">
            Welcome to the Admin Panel. Use the tabs above to manage users and pending registrations.
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-2xl">
            <CreateUserForm onSuccess={handleSuccess} key={`create-${refreshKey}`} />
          </div>
        )}

        {activeTab === 'pending' && <ResidentVerification key={`verify-${refreshKey}`} />}

        {activeTab === 'all-users' && <ManageUsers key={`manage-${refreshKey}`} />}
      </div>

      {/* Offline Sync Button */}
      <OfflineSyncButton />
    </div>
  );
}

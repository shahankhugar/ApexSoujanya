import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { ClientDashboard } from './components/ClientDashboard.tsx';
import { RequestHistoryView } from './components/RequestHistoryView.tsx';
import { MonthlyScriptIdeasView } from './components/MonthlyScriptIdeasView.tsx';
import { MonthlyAllocationView } from './components/MonthlyAllocationView.tsx';
import { ClientProfileView } from './components/ClientProfileView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ProductionCalendarView } from './components/ProductionCalendarView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { SubmitIdeaModal } from './components/SubmitIdeaModal.tsx';
import { RequestDetailModal } from './components/RequestDetailModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal.tsx';
import { BrandLogo, ApexWatermark } from './components/BrandLogo.tsx';
import { LoginView } from './components/LoginView.tsx';
import {
  ScriptEditorModal,
  ProductionModal,
  ReleaseSlotModal,
  AllocationManagerModal,
  DeleteRequestModal,
} from './components/AdminModals.tsx';
import { appendRequestToGoogleSheets } from './lib/googleSheetsService.ts';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Key,
  Shield,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  Client,
  MonthlyAllocation,
  ContentRequest,
  AuditLog,
  RequestStatus,
  ScriptVersion,
  AppBootstrapData,
  PricingSettings,
  AuthUser,
  ScriptAttachment,
  GoogleSheetIntegration,
} from './types.ts';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // App Navigation & Context State
  const [currentRole, setCurrentRole] = useState<'client' | 'admin'>('client');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [client, setClient] = useState<Client | null>(null);
  const [currentAllocation, setCurrentAllocation] = useState<MonthlyAllocation | null>(null);
  const [allAllocations, setAllAllocations] = useState<MonthlyAllocation[]>([]);
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pricing, setPricing] = useState<PricingSettings>({
    id: 'pricing-1',
    enabled: true,
    monthlyRetainer: '$3,500',
    billingCycle: 'Monthly',
    includedReels: 4,
    includedScripts: 'Unlimited',
    overagePerReel: '$750 / reel',
    rushFee: '$250 / reel',
    currency: 'USD',
    termsNotes: 'Includes dedicated Apexmedia creative directors, 4K multi-cam filming, and color grading.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Apexmedia Management',
  });

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [googleSheetConfig, setGoogleSheetConfig] = useState<GoogleSheetIntegration | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<ContentRequest | null>(null);

  // Admin Modal trigger states for detail view
  const [adminScriptReq, setAdminScriptReq] = useState<ContentRequest | null>(null);
  const [adminProdReq, setAdminProdReq] = useState<ContentRequest | null>(null);
  const [adminReleaseReq, setAdminReleaseReq] = useState<ContentRequest | null>(null);
  const [adminDeleteReq, setAdminDeleteReq] = useState<ContentRequest | null>(null);

  // Toast Banner State
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Bootstrap data fetch
  const fetchBootstrapData = async (month = selectedMonth, year = selectedYear) => {
    try {
      const res = await fetch(`/api/bootstrap?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch application data.');
      const data: AppBootstrapData = await res.json();

      setClient(data.client);
      setCurrentAllocation(data.currentAllocation);
      setAllAllocations(data.allAllocations);
      setRequests(data.requests);
      setAuditLogs(data.auditLogs);
      if (data.pricingSettings) {
        setPricing(data.pricingSettings);
      }
      if (data.googleSheetConfig) {
        setGoogleSheetConfig(data.googleSheetConfig);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check local storage for existing session
    const savedUser = localStorage.getItem('apex_user');
    if (savedUser) {
      try {
        const parsed: AuthUser = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setCurrentRole(parsed.role);
      } catch (e) {
        console.error(e);
      }
    }
    fetchBootstrapData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    localStorage.setItem('apex_user', JSON.stringify(user));
    setShowLoginModal(false);
    showToast(`Signed in as ${user.name} (${user.role === 'admin' ? 'Admin Portal' : 'Client Access'})`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('apex_user');
    showToast('Signed out of Apexmedia Portal', 'info');
  };

  // Handle Month Switcher (e.g. Test September reset to 0/4)
  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Submit Idea Success Handler
  const handleSubmitSuccess = (newRequest: ContentRequest, updatedAllocation: MonthlyAllocation) => {
    setRequests((prev) => [newRequest, ...prev]);
    setCurrentAllocation(updatedAllocation);
    setAllAllocations((prev) =>
      prev.map((a) => (a.id === updatedAllocation.id ? updatedAllocation : a))
    );

    // Refresh audit logs
    fetch(`/api/audit-logs?clientId=${client?.id}`)
      .then((r) => r.json())
      .then((logs) => setAuditLogs(logs))
      .catch(console.error);

    // Auto append to Google Sheets if connected
    if (googleSheetConfig?.spreadsheetId) {
      appendRequestToGoogleSheets(newRequest.id, googleSheetConfig.spreadsheetId).catch((e) =>
        console.warn('Auto-sync to Google Sheets failed:', e)
      );
    }

    showToast(
      newRequest.requestType === 'FULL_PRODUCTION'
        ? `Full Production Reel confirmed! (Used 1 slot: ${updatedAllocation.productionUsed}/${updatedAllocation.productionLimit})`
        : 'Script Only request submitted successfully! (0 slots used)',
      'success'
    );
  };

  // Update Status Handler
  const handleStatusChange = async (requestId: string, status: RequestStatus) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actorName: currentRole === 'admin' ? 'Apexmedia Lead' : client?.name }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();

      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(updated);

      showToast(`Status updated to "${status}"`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save Script Handler (Supports Google Docs URL & PDF File attachments)
  const handleSaveScript = async (
    requestId: string,
    scriptData: {
      content?: string;
      hook?: string;
      body?: string;
      callToAction?: string;
      visualNotes?: string;
      googleDocUrl?: string;
      attachment?: ScriptAttachment;
    }
  ) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData),
      });
      if (!res.ok) throw new Error('Failed to save script');
      const updated = await res.json();

      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(updated);

      showToast(
        scriptData.googleDocUrl
          ? 'Google Docs link & script deliverable published!'
          : scriptData.attachment
          ? `Attached ${scriptData.attachment.fileName} & script saved!`
          : `Script Version ${updated.currentScriptVersion} saved & published!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save Production Details Handler
  const handleSaveProduction = async (requestId: string, details: any) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      if (!res.ok) throw new Error('Failed to update production schedule');
      const updated = await res.json();

      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(updated);

      showToast('Production schedule updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Release Production Slot Handler (Admin action)
  const handleReleaseSlot = async (requestId: string, reason: string) => {
    const res = await fetch(`/api/requests/${requestId}/release-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, adminName: currentUser?.name || 'Apexmedia Studio Director' }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to release slot');
    }

    const data = await res.json();
    setRequests((prev) => prev.map((r) => (r.id === requestId ? data.request : r)));
    setCurrentAllocation(data.allocation);
    setAllAllocations((prev) =>
      prev.map((a) => (a.id === data.allocation.id ? data.allocation : a))
    );
    if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(data.request);

    // Refresh audit logs
    fetch(`/api/audit-logs?clientId=${client?.id}`)
      .then((r) => r.json())
      .then((logs) => setAuditLogs(logs))
      .catch(console.error);

    showToast(`1 Production Slot released back to client! New total: ${data.allocation.productionUsed}/${data.allocation.productionLimit}`, 'success');
  };

  // Alter / Override Monthly Allocation Usage (Admin action)
  const handleUpdateAllocation = async (params: {
    productionUsed: number;
    productionLimit?: number;
    reason?: string;
  }) => {
    if (!currentAllocation) return;
    const res = await fetch('/api/allocations/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: currentAllocation.id,
        productionUsed: params.productionUsed,
        productionLimit: params.productionLimit,
        reason: params.reason,
        adminName: currentUser?.name || 'Apexmedia Admin',
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update allocation.');
    }

    const data = await res.json();
    setCurrentAllocation(data.allocation);
    setAllAllocations((prev) =>
      prev.map((a) => (a.id === data.allocation.id ? data.allocation : a))
    );
    fetchBootstrapData();
    showToast(`Monthly reel quota updated to ${data.allocation.productionUsed}/${data.allocation.productionLimit}`, 'success');
  };

  // Reset Monthly Reel Usage to 0/4 (Admin action)
  const handleResetAllocation = async (reason?: string) => {
    if (!currentAllocation) return;
    const res = await fetch('/api/allocations/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: currentAllocation.id,
        reason: reason || 'Admin manual quota reset',
        adminName: currentUser?.name || 'Apexmedia Admin',
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to reset allocation.');
    }

    const data = await res.json();
    setCurrentAllocation(data.allocation);
    setAllAllocations((prev) =>
      prev.map((a) => (a.id === data.allocation.id ? data.allocation : a))
    );
    fetchBootstrapData();
    showToast('Reel quota has been reset to 0/4 for this month!', 'success');
  };

  // Delete Request Handler (Admin action)
  const handleDeleteRequest = async (requestId: string, refundSlot: boolean) => {
    const res = await fetch(`/api/requests/${requestId}?refundSlot=${refundSlot}&adminName=${encodeURIComponent(currentUser?.name || 'Apexmedia Admin')}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to delete request.');
    }

    const data = await res.json();
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (data.allocation) {
      setCurrentAllocation(data.allocation);
      setAllAllocations((prev) =>
        prev.map((a) => (a.id === data.allocation.id ? data.allocation : a))
      );
    }
    if (selectedRequestDetail?.id === requestId) {
      setSelectedRequestDetail(null);
    }
    fetchBootstrapData();
    showToast(
      refundSlot
        ? 'Request deleted and 1 production slot was restored!'
        : 'Request deleted successfully.',
      'info'
    );
  };

  // Update Retainer Pricing Settings (Admin action)
  const handleUpdatePricing = async (updated: Partial<PricingSettings>) => {
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pricing: updated,
        adminName: currentUser?.name || 'Apexmedia Admin',
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update pricing');
    }

    const data = await res.json();
    setPricing(data.pricing);
    showToast('Retainer pricing settings updated!', 'success');
  };

  // Convert Script Only to Full Production Handler
  const handleConvertToProduction = async (requestId: string) => {
    const res = await fetch(`/api/requests/${requestId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorName: currentUser?.name || client?.name || 'Client' }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to convert request.');
    }

    setRequests((prev) => prev.map((r) => (r.id === requestId ? data.request : r)));
    setCurrentAllocation(data.allocation);
    setAllAllocations((prev) =>
      prev.map((a) => (a.id === data.allocation.id ? data.allocation : a))
    );
    if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(data.request);

    // Refresh audit logs
    fetch(`/api/audit-logs?clientId=${client?.id}`)
      .then((r) => r.json())
      .then((logs) => setAuditLogs(logs))
      .catch(console.error);

    showToast(`Request converted to Full Production! (Used slot: ${data.allocation.productionUsed}/${data.allocation.productionLimit})`, 'success');
  };

  // Client feedback / Revision notes Handler
  const handleAddFeedback = async (requestId: string, feedback: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: feedback,
          type: 'client',
          authorName: currentUser?.name || client?.name || 'Client',
        }),
      });
      if (!res.ok) throw new Error('Failed to send feedback');
      const updated = await res.json();

      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      if (selectedRequestDetail?.id === requestId) setSelectedRequestDetail(updated);

      showToast('Revision request sent to the production team!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center text-gray-900 space-y-4 relative overflow-hidden">
        <ApexWatermark />
        <BrandLogo size="lg" />
        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold z-10">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Connecting to Apexmedia Portal...</span>
        </div>
      </div>
    );
  }

  if (error || !client || !currentAllocation) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 text-gray-900 relative overflow-hidden">
        <ApexWatermark />
        <div className="max-w-md bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-4 shadow-sm z-10">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Connection Error</h2>
          <p className="text-xs text-gray-500">{error || 'Could not load data.'}</p>
          <button
            onClick={() => fetchBootstrapData()}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-xs font-semibold transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Mandatory Authentication Gate: features are only visible once logged in
  if (!currentUser) {
    return (
      <>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-bold border ${
                toastMessage.type === 'success'
                  ? 'bg-white text-emerald-800 border-emerald-200 shadow-emerald-50'
                  : toastMessage.type === 'error'
                  ? 'bg-white text-rose-800 border-rose-200 shadow-rose-50'
                  : 'bg-white text-indigo-800 border-indigo-200 shadow-indigo-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{toastMessage.title}</span>
            </div>
          </div>
        )}
        <LoginView
          isOpen={true}
          isMandatory={true}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex flex-col font-sans antialiased relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Subtle Apexmedia Watermark Reflection in Canvas */}
      <ApexWatermark />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-bold border ${
            toastMessage.type === 'success'
              ? 'bg-white text-emerald-800 border-emerald-200 shadow-emerald-50'
              : toastMessage.type === 'error'
              ? 'bg-white text-rose-800 border-rose-200 shadow-rose-50'
              : 'bg-white text-indigo-800 border-indigo-200 shadow-indigo-50'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{toastMessage.title}</span>
          </div>
        </div>
      )}

      {/* Top Banner with ID & Password info pill */}
      <div className="bg-gray-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-2 max-w-2xl truncate">
          <span className="px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-extrabold uppercase tracking-wider">
            Apexmedia Secure Portal
          </span>
          <span className="text-gray-300 text-[11px] truncate">
            {currentUser ? (
              <>Signed in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.role === 'admin' ? 'Admin Authority' : 'Client Access'})</>
            ) : (
              <>Quick ID &amp; Password Access for Admin &amp; Client available</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserCheck className="w-3 h-3 text-indigo-400" />
                <span>Switch ID / Account</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-rose-950 hover:text-rose-300 text-gray-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Key className="w-3 h-3" />
              <span>Login with ID &amp; Password</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={(role) => {
          setCurrentRole(role);
          setActiveTab(role === 'client' ? 'dashboard' : 'admin-overview');
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentClient={client}
        currentAllocation={currentAllocation}
        sheetConfig={googleSheetConfig}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsModalOpen(true)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthSelect={handleMonthSelect}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10">
        {currentRole === 'client' ? (
          <>
            {activeTab === 'dashboard' && (
              <ClientDashboard
                allocation={currentAllocation}
                requests={requests}
                pricing={pricing}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                onSelectRequest={setSelectedRequestDetail}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'requests' && (
              <RequestHistoryView
                requests={requests}
                onSelectRequest={setSelectedRequestDetail}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            )}

            {activeTab === 'scripts' && (
              <MonthlyScriptIdeasView
                requests={requests}
                allocation={currentAllocation}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                onSelectRequest={setSelectedRequestDetail}
              />
            )}

            {activeTab === 'allocation' && (
              <MonthlyAllocationView
                allocations={allAllocations}
                requests={requests}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthSelect={handleMonthSelect}
                onSelectRequest={setSelectedRequestDetail}
              />
            )}

            {activeTab === 'profile' && (
              <ClientProfileView
                client={client}
                allocation={currentAllocation}
              />
            )}
          </>
        ) : (
          <>
            {(activeTab === 'admin-overview' || activeTab === 'admin-requests') && (
              <AdminDashboard
                client={client}
                allocation={currentAllocation}
                requests={requests}
                auditLogs={auditLogs}
                pricing={pricing}
                sheetConfig={googleSheetConfig}
                onUpdatePricing={handleUpdatePricing}
                onUpdateAllocation={handleUpdateAllocation}
                onResetAllocation={handleResetAllocation}
                onDeleteRequest={handleDeleteRequest}
                onStatusChange={handleStatusChange}
                onSaveScript={handleSaveScript}
                onSaveProduction={handleSaveProduction}
                onReleaseSlot={handleReleaseSlot}
                onSelectRequest={setSelectedRequestDetail}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenGoogleSheetsSync={() => setIsGoogleSheetsModalOpen(true)}
              />
            )}

            {activeTab === 'admin-calendar' && (
              <ProductionCalendarView
                requests={requests}
                allocation={currentAllocation}
                onSelectRequest={setSelectedRequestDetail}
              />
            )}

            {activeTab === 'admin-audit' && (
              <AuditLogView
                auditLogs={auditLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <SubmitIdeaModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        allocation={currentAllocation}
        onSubmitSuccess={handleSubmitSuccess}
        clientId={client.id}
      />

      <RequestDetailModal
        isOpen={!!selectedRequestDetail}
        onClose={() => setSelectedRequestDetail(null)}
        request={selectedRequestDetail}
        allocation={currentAllocation}
        onConvertToProduction={handleConvertToProduction}
        onAddFeedback={handleAddFeedback}
        onStatusChange={handleStatusChange}
        isAdmin={currentRole === 'admin'}
        onOpenScriptEditor={(req) => setAdminScriptReq(req)}
        onOpenProductionScheduler={(req) => setAdminProdReq(req)}
        onOpenReleaseSlot={(req) => setAdminReleaseReq(req)}
        onOpenDeleteRequest={(req) => setAdminDeleteReq(req)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        client={client}
        allocation={currentAllocation}
        requests={requests}
        sheetConfig={googleSheetConfig}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Google Sheets Sync Live Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        client={client}
        allocation={currentAllocation}
        requests={requests}
        sheetConfig={googleSheetConfig}
        onSyncSuccess={(newConfig) => {
          setGoogleSheetConfig(newConfig);
          showToast('Google Sheet synchronized & saved successfully!', 'success');
        }}
      />

      {/* Login / Switch Account Modal */}
      <LoginView
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRole={currentRole}
      />

      {/* Admin Specific Action Modals triggered from RequestDetailModal */}
      {currentAllocation && (
        <>
          <ScriptEditorModal
            isOpen={!!adminScriptReq}
            onClose={() => setAdminScriptReq(null)}
            request={adminScriptReq}
            onSaveScript={handleSaveScript}
          />

          <ProductionModal
            isOpen={!!adminProdReq}
            onClose={() => setAdminProdReq(null)}
            request={adminProdReq}
            onSaveProduction={handleSaveProduction}
          />

          <ReleaseSlotModal
            isOpen={!!adminReleaseReq}
            onClose={() => setAdminReleaseReq(null)}
            request={adminReleaseReq}
            allocation={currentAllocation}
            onConfirmRelease={handleReleaseSlot}
          />

          <DeleteRequestModal
            isOpen={!!adminDeleteReq}
            onClose={() => setAdminDeleteReq(null)}
            request={adminDeleteReq}
            onConfirmDelete={handleDeleteRequest}
          />
        </>
      )}

      {/* Footer with Apexmedia Branding */}
      <footer className="border-t border-gray-200 bg-white py-6 text-xs text-gray-500 z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showTagline={false} />
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 font-semibold tracking-wide uppercase text-[10px]">
              IN WHICH ONLY AFFECTS MEDIA
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-400">
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-gray-600 hover:text-indigo-600 font-semibold cursor-pointer"
            >
              Account Credentials (ID / Password)
            </button>
            <span>&bull;</span>
            <p>
              Apexmedia Video Agency Operating Engine &bull; {selectedYear}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


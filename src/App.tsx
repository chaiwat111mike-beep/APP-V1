import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GarageProvider, useGarage } from './context/GarageContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { JobOrdersView } from './components/JobOrdersView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { ServiceBaysView } from './components/ServiceBaysView';
import { BillingReportView } from './components/BillingReportView';
import { SettingsView } from './components/SettingsView';
import { RepairHistoryView } from './components/RepairHistoryView';
import { GoogleSheetsLiveView } from './components/GoogleSheetsLiveView';
import { JobOrderFormModal } from './components/JobOrderFormModal';
import { JobOrderDetailModal } from './components/JobOrderDetailModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { LoginModal } from './components/LoginModal';
import { JobOrder, Customer, CustomerVehicle } from './types';

const GarageAppInner: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Modals state
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState<boolean>(false);
  const [newJobPrefill, setNewJobPrefill] = useState<{ customer: Customer | null; vehicle: CustomerVehicle | null }>({
    customer: null,
    vehicle: null,
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  
  // Print state
  const [printDoc, setPrintDoc] = useState<{
    job: JobOrder | null;
    type: 'job_order' | 'quotation' | 'receipt';
    isOpen: boolean;
  }>({
    job: null,
    type: 'job_order',
    isOpen: false,
  });

  const { jobOrders, spareParts } = useGarage();

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsJobDetailOpen(true);
  };

  const handlePrintJob = (job: JobOrder, docType: 'job_order' | 'quotation' | 'receipt') => {
    setPrintDoc({
      job,
      type: docType,
      isOpen: true,
    });
  };

  const handleOpenNewJobForVehicle = (customer: Customer, vehicle: CustomerVehicle) => {
    setNewJobPrefill({ customer, vehicle });
    setIsNewJobModalOpen(true);
  };

  const handleOpenNewJob = () => {
    setNewJobPrefill({ customer: null, vehicle: null });
    setIsNewJobModalOpen(true);
  };

  const activeJobCount = jobOrders.filter((j) => j.status !== 'delivered' && j.status !== 'closed').length;
  const lowStockCount = spareParts.filter((p) => p.stockQty <= p.minStockQty).length;

  return (
    <div className="min-h-screen bg-[#0F1113] text-gray-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenNewJobModal={handleOpenNewJob}
        onOpenAuthModal={() => setIsLoginModalOpen(true)}
        onSelectJob={handleSelectJob}
        activeTab={currentTab}
        setActiveTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={currentTab}
          setActiveTab={(tab) => {
            setCurrentTab(tab);
            setIsSidebarOpen(false);
          }}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeJobCount={activeJobCount}
          lowStockCount={lowStockCount}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                onSelectJob={handleSelectJob}
                onOpenNewJobModal={handleOpenNewJob}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                setActiveTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'jobs' && (
              <JobOrdersView
                onSelectJob={handleSelectJob}
                onOpenNewJobModal={handleOpenNewJob}
                onPrintJob={handlePrintJob}
                onNavigateToHistory={() => setCurrentTab('history')}
              />
            )}

            {currentTab === 'history' && (
              <RepairHistoryView
                onSelectJob={handleSelectJob}
                onPrintJob={handlePrintJob}
                onOpenNewJobModal={handleOpenNewJob}
              />
            )}

            {currentTab === 'inventory' && <InventoryView />}

            {currentTab === 'customers' && (
              <CustomersView
                onSelectJob={handleSelectJob}
                onOpenNewJobForVehicle={handleOpenNewJobForVehicle}
              />
            )}

            {currentTab === 'bays' && (
              <ServiceBaysView
                onSelectJob={handleSelectJob}
                onOpenNewJobModal={handleOpenNewJob}
              />
            )}

            {currentTab === 'billing' && (
              <BillingReportView
                onSelectJob={handleSelectJob}
                onPrintJob={handlePrintJob}
              />
            )}

            {currentTab === 'sheets' && <GoogleSheetsLiveView />}

            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>

      </div>

      {/* Modals */}
      <JobOrderFormModal
        isOpen={isNewJobModalOpen}
        initialCustomer={newJobPrefill.customer}
        initialVehicle={newJobPrefill.vehicle}
        onClose={() => {
          setIsNewJobModalOpen(false);
          setNewJobPrefill({ customer: null, vehicle: null });
        }}
        onJobCreated={(newJob) => {
          setSelectedJobId(newJob.id);
          setIsJobDetailOpen(true);
        }}
      />

      <JobOrderDetailModal
        jobId={selectedJobId}
        isOpen={isJobDetailOpen}
        onClose={() => {
          setIsJobDetailOpen(false);
          setSelectedJobId(null);
        }}
        onPrintJob={handlePrintJob}
        onSwitchJob={(newId) => setSelectedJobId(newId)}
      />

      <PrintDocumentModal
        job={printDoc.job}
        docType={printDoc.type}
        isOpen={printDoc.isOpen}
        onClose={() => setPrintDoc({ ...printDoc, isOpen: false })}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GarageProvider>
        <GarageAppInner />
      </GarageProvider>
    </AuthProvider>
  );
}

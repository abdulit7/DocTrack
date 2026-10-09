import { useState, useEffect, useCallback } from 'react';
import { Shipment, DocStatus, AuditLogItem, ActiveTab, DocumentItem, Customer, ShipmentStage, TradeType } from './types';
import { ShipmentService } from './services/shipmentService';
import { CustomerService } from './services/customerService';
import { AuditService } from './services/auditService';
import { DocConfigService } from './services/docConfigService';
import { MasterDocConfig, CustomStatusConfig, INITIAL_MASTER_DOCS, DEFAULT_STATUS_CONFIGS } from './components/documents/DocConfigPage';
import { ShipsGoHeader } from './components/common/ShipsGoHeader';
import { ShipsGoSidebar } from './components/common/ShipsGoSidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ShipmentsView } from './components/shipments/ShipmentsView';
import { ContainersView } from './components/shipments/ContainersView';
import { DocumentsListView } from './components/documents/DocumentsListView';
import { DocConfigPage } from './components/documents/DocConfigPage';
import { ApiWebhooksView } from './components/integrations/ApiWebhooksView';
import { ShipsGoDashboardView } from './components/shipments/ShipsGoDashboardView';
import { ShipsGoLiveFeedView } from './components/shipments/ShipsGoLiveFeedView';
import { CustomersView } from './components/customers/CustomersView';
import { NewCustomerModal } from './components/customers/NewCustomerModal';
import { EditCustomerModal } from './components/customers/EditCustomerModal';
import { InvoicesView } from './components/invoices/InvoicesView';
import { CreateInvoiceModal } from './components/invoices/CreateInvoiceModal';
import { EditInvoiceModal } from './components/invoices/EditInvoiceModal';
import { ContainerTrackerModal } from './components/shipments/ContainerTrackerModal';
import { UrgentComplianceModal } from './components/common/UrgentComplianceModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [masterDocs, setMasterDocs] = useState<MasterDocConfig[]>([]);
  const [docStatuses, setDocStatuses] = useState<CustomStatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals & Editing states
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Shipment | null>(null);

  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [hasAutoOpenedAlert, setHasAutoOpenedAlert] = useState(false);
  const [isContainerTrackerOpen, setIsContainerTrackerOpen] = useState(false);
  const [selectedTrackerContainer, setSelectedTrackerContainer] = useState<string>('');

  const handleOpenContainerTracker = (containerNo?: string) => {
    setSelectedTrackerContainer(containerNo || '');
    setIsContainerTrackerOpen(true);
  };

  const fetchDocConfigs = useCallback(async () => {
    try {
      const config = await DocConfigService.get();
      if (config?.masterDocs) setMasterDocs(config.masterDocs);
      if (config?.statuses) setDocStatuses(config.statuses);
    } catch (err) {
      console.warn('Error fetching doc configs:', err);
    }
  }, []);

  // Load shipments, customers & audit logs data from Express REST API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedShipments, fetchedCustomers, fetchedLogs] = await Promise.all([
        ShipmentService.getAll(),
        CustomerService.getAll(),
        AuditService.getAll().catch(() => []),
        fetchDocConfigs()
      ]);
      setShipments(fetchedShipments);
      setCustomers(fetchedCustomers);
      if (fetchedLogs && Array.isArray(fetchedLogs)) {
        setAuditLogs(fetchedLogs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchDocConfigs]);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const logs = await AuditService.getAll();
      if (logs && Array.isArray(logs)) {
        setAuditLogs(logs);
      }
    } catch (err) {
      console.warn('Error refreshing audit logs:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic refresh for real-time audit event logs
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAuditLogs();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshAuditLogs]);

  // Calculate urgent shipments (Approaching ETA + Incomplete Docs)
  const urgentShipments = shipments
    .filter(s => s.status !== 'Delivered')
    .map(s => {
      const pendingDocs = (s.docs || [])
        .map((d, index) => ({ index, name: d.name, status: d.status }))
        .filter(d => d.status !== 'Completed');

      let daysLeft = 999;
      if (s.eta) {
        const dateParts = s.eta.split('/');
        let dateObj: Date | null = null;
        if (dateParts.length === 3) {
          dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        } else {
          dateObj = new Date(s.eta);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          daysLeft = Math.round((dateObj.getTime() - today.getTime()) / (1000 * 86400));
        }
      }

      return { shipment: s, customer: undefined, daysLeft, pendingDocs };
    })
    .filter(item => item.pendingDocs.length > 0 && item.daysLeft <= 10);

  // Auto alert popup on page load if incomplete docs & approaching ETA
  useEffect(() => {
    if (!loading && urgentShipments.length > 0 && !hasAutoOpenedAlert) {
      setIsUrgentModalOpen(true);
      setHasAutoOpenedAlert(true);
    }
  }, [loading, urgentShipments.length, hasAutoOpenedAlert]);

  // Save / Attach Document Handler
  const handleSaveAttachDoc = async (shipmentData: {
    id?: string;
    invoice: string;
    containerNo: string;
    dest: string;
    pol?: string;
    etd: string;
    eta: string;
    status?: any;
    docs: DocumentItem[];
  }) => {
    let saved: Shipment;
    if (shipmentData.id) {
      // Update existing or ShipsGo shipment
      saved = await ShipmentService.update(shipmentData.id, {
        invoice: shipmentData.invoice,
        containerNo: shipmentData.containerNo,
        dest: shipmentData.dest,
        pol: shipmentData.pol,
        etd: shipmentData.etd,
        eta: shipmentData.eta,
        docs: shipmentData.docs,
      });
    } else {
      // Create new shipment with attached docs
      saved = await ShipmentService.create({
        invoice: shipmentData.invoice,
        customerId: 'general',
        dest: shipmentData.dest,
        containerNo: shipmentData.containerNo,
        trackingLink: shipmentData.containerNo ? `https://shipsgo.com/tracking/${shipmentData.containerNo}` : '',
        etd: shipmentData.etd,
        eta: shipmentData.eta,
        docs: shipmentData.docs,
        status: shipmentData.status || 'Documentation',
      });
    }

    setShipments(prev => {
      const exists = prev.some(s => s.id === saved.id);
      if (exists) {
        return prev.map(s => (s.id === saved.id ? saved : s));
      } else {
        return [saved, ...prev];
      }
    });

    fetchData();
  };

  const handleUpdateShipmentDocStatus = async (shipmentId: string, docIndex: number, status: DocStatus) => {
    try {
      const updated = await ShipmentService.updateDocStatus(shipmentId, docIndex, status);
      if (updated && updated.docs && updated.docs.length > 0 && updated.docs.every(d => d.status === 'Completed')) {
        const stageUpdated = await ShipmentService.update(shipmentId, { status: 'Delivered', docs: updated.docs });
        setShipments(prev => prev.map(s => (s.id === shipmentId ? stageUpdated : s)));
      } else {
        setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      }
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to update document status: ${err.message}`);
    }
  };

  const handleUpdateShipmentDocs = async (shipmentId: string, docs: { name: string; status: DocStatus }[]) => {
    try {
      const allCompleted = docs.length > 0 && docs.every(d => d.status === 'Completed');
      const updates: any = { docs };
      if (allCompleted) {
        updates.status = 'Delivered';
      }
      const updated = await ShipmentService.update(shipmentId, updates);
      setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to update shipment docs: ${err.message}`);
    }
  };

  const handleOpenEditInvoice = (shipment: Shipment) => {
    setEditingInvoice(shipment);
    setIsEditInvoiceOpen(true);
  };

  const handleUpdateInvoice = async (shipmentId: string, updates: Partial<Shipment>) => {
    try {
      const updated = await ShipmentService.update(shipmentId, updates);
      setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      setIsEditInvoiceOpen(false);
      setEditingInvoice(null);
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to update invoice: ${err.message}`);
    }
  };

  const handleDeleteShipment = async (id: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this shipment/invoice?')) return;
    try {
      await ShipmentService.delete(id);
      setShipments(prev => prev.filter(s => s.id !== id && s.invoice !== id && (s as any)._id !== id));
      refreshAuditLogs();
    } catch (err: any) {
      // Even on network/server error, ensure UI updates if user confirmed deletion
      setShipments(prev => prev.filter(s => s.id !== id && s.invoice !== id && (s as any)._id !== id));
      refreshAuditLogs();
      alert(`Notice: ${err.message || 'Shipment removed'}`);
    }
  };

  const handleAddCustomDocToShipment = async (shipmentId: string, docName: string) => {
    try {
      const updated = await ShipmentService.addCustomDoc(shipmentId, docName);
      if (docName && !masterDocs.some(m => m.name.toLowerCase() === docName.trim().toLowerCase())) {
        await DocConfigService.addMasterDoc({ name: docName, linkedStatuses: ['Not Started', 'Completed'] });
        await fetchDocConfigs();
      }
      setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to add custom document: ${err.message}`);
    }
  };

  // Customer Management Handlers
  const handleCreateCustomer = async (data: { name: string; requiredDocs?: string[] }) => {
    try {
      const created = await CustomerService.create({
        name: data.name,
        requiredDocs: data.requiredDocs || [],
        docs: (data.requiredDocs || []).map(docName => ({ name: docName, status: 'Not Started' })),
      });
      if (data.requiredDocs && data.requiredDocs.length > 0) {
        for (const docName of data.requiredDocs) {
          const nameStr = typeof docName === 'string' ? docName : (docName as any)?.name;
          if (nameStr && !masterDocs.some(m => m.name.toLowerCase() === nameStr.trim().toLowerCase())) {
            await DocConfigService.addMasterDoc({ name: nameStr, linkedStatuses: ['Not Started', 'Completed'] });
          }
        }
        await fetchDocConfigs();
      }
      setCustomers(prev => [...prev, created]);
      setIsNewCustomerOpen(false);
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to create customer: ${err.message}`);
    }
  };

  const handleUpdateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const updated = await CustomerService.update(customerId, updates);

      if (updates.requiredDocs) {
        // Ensure master docs exist if new doc names were introduced
        for (const docName of updates.requiredDocs) {
          const nameStr = typeof docName === 'string' ? docName : (docName as any)?.name;
          if (nameStr && !masterDocs.some(m => m.name.toLowerCase() === nameStr.trim().toLowerCase())) {
            await DocConfigService.addMasterDoc({ name: nameStr, linkedStatuses: ['Not Started', 'Completed'] });
          }
        }
        await fetchDocConfigs();

        // Automatically update all linked shipments for this customer
        const newReqDocs = updates.requiredDocs
          .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
          .filter(Boolean);

        const affectedShipments = shipments.filter(s => s.customerId === customerId);
        if (affectedShipments.length > 0) {
          const updatedShipmentPromises = affectedShipments.map(async s => {
            const existingMap = new Map<string, DocStatus>(
              (s.docs || []).map(d => [
                typeof d === 'string' ? d : d.name,
                typeof d === 'string' ? ('Not Started' as DocStatus) : d.status
              ])
            );

            const newShipmentDocs = newReqDocs.map(docName => ({
              name: docName,
              status: existingMap.get(docName) || ('Not Started' as DocStatus)
            }));

            const allCompleted = newShipmentDocs.length > 0 && newShipmentDocs.every(d => d.status === 'Completed');
            const newStage = allCompleted ? 'Delivered' : (s.status === 'Delivered' ? 'Documentation' : s.status);

            return ShipmentService.update(s.id, {
              docs: newShipmentDocs,
              status: newStage
            });
          });

          const updatedShipmentResults = await Promise.all(updatedShipmentPromises);
          setShipments(prev => prev.map(s => {
            const match = updatedShipmentResults.find(u => u.id === s.id);
            return match || s;
          }));
        }
      }

      setCustomers(prev => prev.map(c => (c.id === customerId ? updated : c)));
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to update customer: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await CustomerService.delete(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to delete customer: ${err.message}`);
    }
  };

  const handleUpdateCustomerDocStatus = async (customerId: string, docIndex: number, status: DocStatus) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust || !cust.docs) return;
    const updatedDocs = [...cust.docs];
    if (updatedDocs[docIndex]) {
      updatedDocs[docIndex] = { ...updatedDocs[docIndex], status };
    }
    await handleUpdateCustomer(customerId, { docs: updatedDocs });
  };

  const handleLinkShipmentToCustomer = async (shipmentId: string, customerId: string) => {
    try {
      const cust = customers.find(c => c.id === customerId);
      const reqDocs = (cust?.requiredDocs || [])
        .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
        .filter(Boolean);

      const ship = shipments.find(s => s.id === shipmentId);
      const existingMap = new Map<string, DocStatus>(
        (ship?.docs || []).map(d => [
          typeof d === 'string' ? d : d.name,
          typeof d === 'string' ? ('Not Started' as DocStatus) : d.status
        ])
      );

      const newDocs = reqDocs.map(docName => ({
        name: docName,
        status: existingMap.get(docName) || ('Not Started' as DocStatus)
      }));

      const updated = await ShipmentService.update(shipmentId, {
        customerId,
        ...(newDocs.length > 0 ? { docs: newDocs } : {})
      });
      setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      refreshAuditLogs();
      alert(`✓ Successfully linked shipment to customer!`);
    } catch (err: any) {
      alert(`Failed to link shipment: ${err.message}`);
    }
  };

  const handleUpdateShipmentStage = async (shipmentId: string, newStage: ShipmentStage) => {
    try {
      const updated = await ShipmentService.update(shipmentId, { status: newStage });
      setShipments(prev => prev.map(s => (s.id === shipmentId ? updated : s)));
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to update stage: ${err.message}`);
    }
  };

  const handleCreateInvoiceSubmit = async (payload: {
    invoice: string;
    customerId: string;
    newCustomerName?: string;
    tradeType: TradeType;
    containerNo: string;
    dest: string;
    status: ShipmentStage;
    etd: string;
    eta: string;
    docs: any[];
    shipsgoReference?: string;
    isShipsGoLinked?: boolean;
  }) => {
    try {
      let finalCustomerId = payload.customerId;
      if (payload.customerId === '__new__' && payload.newCustomerName) {
        const newCust = await CustomerService.create({
          name: payload.newCustomerName,
          requiredDocs: payload.docs.map(d => (typeof d === 'string' ? d : d.name)),
          docs: payload.docs.map(d => ({ name: typeof d === 'string' ? d : d.name, status: 'Not Started' })),
        });
        setCustomers(prev => [...prev, newCust]);
        finalCustomerId = newCust.id;
      }

      const docItems: DocumentItem[] = payload.docs.map(d => {
        if (typeof d === 'string') return { name: d, status: 'Not Started' as DocStatus };
        return { name: d.name || 'Document', status: d.status || ('Not Started' as DocStatus) };
      });

      const created = await ShipmentService.create({
        invoice: payload.invoice,
        customerId: finalCustomerId,
        dest: payload.dest,
        status: payload.status,
        tradeType: payload.tradeType,
        containerNo: payload.containerNo,
        trackingLink: payload.containerNo ? `https://shipsgo.com/tracking/${payload.containerNo}` : '',
        etd: payload.etd,
        eta: payload.eta,
        shipsgoReference: payload.shipsgoReference,
        isShipsGoLinked: payload.isShipsGoLinked,
        docs: docItems,
      });

      setShipments(prev => [created, ...prev]);
      setIsCreateInvoiceOpen(false);
      refreshAuditLogs();
      fetchData();
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message}`);
    }
  };

  // Active shipments where documents are attached and processing but not completed
  const activeProcessingShipmentsCount = shipments.filter(s => {
    if (s.status === 'Delivered') return false;
    const docs = s.docs || [];
    if (docs.length === 0) return false;
    const completedCount = docs.filter(d => d.status === 'Completed').length;
    return completedCount < docs.length;
  }).length;

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-800 overflow-hidden">
      {/* Top Header */}
      <ShipsGoHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenContainerTracker={() => handleOpenContainerTracker()}
        urgentCount={urgentShipments.length}
        onOpenUrgentModal={() => setIsUrgentModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <ShipsGoSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          urgentCount={urgentShipments.length}
          activeShipmentsCount={activeProcessingShipmentsCount}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Region */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto w-full min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold font-mono uppercase tracking-wider">Loading ShipsGo DocTrack Workspace...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  shipments={shipments}
                  masterDocs={masterDocs}
                  auditLogs={auditLogs}
                  onUpdateDocStatus={handleUpdateShipmentDocStatus}
                  onOpenContainerTracker={handleOpenContainerTracker}
                  onOpenUrgentModal={() => setIsUrgentModalOpen(true)}
                  onSelectTab={setActiveTab}
                  onRefreshAuditLogs={refreshAuditLogs}
                />
              )}

              {activeTab === 'shipments' && (
                <ShipmentsView
                  shipments={shipments}
                  masterDocs={masterDocs}
                  onOpenContainerTracker={handleOpenContainerTracker}
                  onUpdateDocStatus={handleUpdateShipmentDocStatus}
                  onDeleteShipment={handleDeleteShipment}
                  onRefreshWorkspaceShipments={fetchData}
                />
              )}

              {activeTab === 'api_feed' && (
                <ShipsGoLiveFeedView
                  savedShipments={shipments}
                  onOpenContainerTracker={handleOpenContainerTracker}
                  onRefreshWorkspaceShipments={fetchData}
                  onNavigateToSettings={() => setActiveTab('api_webhooks')}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView
                  customers={customers}
                  shipments={shipments}
                  masterDocs={masterDocs}
                  onOpenNewCustomerModal={() => setIsNewCustomerOpen(true)}
                  onEditCustomer={cust => {
                    setEditingCustomer(cust);
                    setIsEditCustomerOpen(true);
                  }}
                  onUpdateCustomer={handleUpdateCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  onUpdateCustomerDocStatus={handleUpdateCustomerDocStatus}
                  onUpdateShipmentDocStatus={handleUpdateShipmentDocStatus}
                  onUpdateShipmentDocs={handleUpdateShipmentDocs}
                  onLinkShipmentToCustomer={handleLinkShipmentToCustomer}
                  onJumpToShipment={() => setActiveTab('invoices')}
                />
              )}

              {activeTab === 'invoices' && (
                <InvoicesView
                  shipments={shipments}
                  customers={customers}
                  masterDocs={masterDocs}
                  onUpdateDocStatus={handleUpdateShipmentDocStatus}
                  onUpdateShipmentDocs={handleUpdateShipmentDocs}
                  onUpdateShipmentStage={handleUpdateShipmentStage}
                  onCreateInvoiceOpen={() => setIsCreateInvoiceOpen(true)}
                  onEditShipment={handleOpenEditInvoice}
                  onDeleteShipment={handleDeleteShipment}
                />
              )}

              {activeTab === 'containers' && (
                <ContainersView
                  shipments={shipments}
                  customers={customers}
                  onOpenContainerTracker={handleOpenContainerTracker}
                />
              )}

              {activeTab === 'track' && (
                <ShipsGoDashboardView onOpenTracker={handleOpenContainerTracker} />
              )}

              {activeTab === 'documents' && (
                <DocumentsListView
                  shipments={shipments}
                  customers={customers}
                  masterDocs={masterDocs}
                  onUpdateDocStatus={handleUpdateShipmentDocStatus}
                  onOpenContainerTracker={handleOpenContainerTracker}
                />
              )}

              {(activeTab === 'doc_config' as any) && (
                <DocConfigPage
                  customers={customers}
                  shipments={shipments}
                  masterDocs={masterDocs}
                  statuses={docStatuses}
                  onUpdateDocStatus={handleUpdateShipmentDocStatus}
                  onAddCustomDocToShipment={handleAddCustomDocToShipment}
                  onReloadDocConfigs={fetchDocConfigs}
                />
              )}

              {activeTab === 'api_webhooks' && <ApiWebhooksView />}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        masterDocs={masterDocs || []}
        availableMasterDocs={(masterDocs || []).map(d => d.name)}
        onClose={() => setIsNewCustomerOpen(false)}
        onSubmit={handleCreateCustomer}
      />

      {editingCustomer && (
        <EditCustomerModal
          isOpen={isEditCustomerOpen}
          customer={editingCustomer}
          masterDocs={masterDocs || []}
          availableMasterDocs={(masterDocs || []).map(d => d.name)}
          onClose={() => {
            setIsEditCustomerOpen(false);
            setEditingCustomer(null);
          }}
          onSubmit={async data => {
            const cust = customers.find(c => c.id === editingCustomer.id);
            const reqDocsSanitized = (data.requiredDocs || [])
              .map(d => (typeof d === 'string' ? d : (d as any)?.name || ''))
              .filter(Boolean);
            const existingDocsMap = new Map<string, DocStatus>(
              (cust?.docs || []).map(d => [
                typeof d === 'string' ? d : d.name,
                typeof d === 'string' ? ('Not Started' as DocStatus) : d.status
              ])
            );
            const updatedDocs = reqDocsSanitized.map(docName => ({
              name: docName,
              status: existingDocsMap.get(docName) || ('Not Started' as DocStatus),
            }));

            await handleUpdateCustomer(editingCustomer.id, {
              name: data.name,
              requiredDocs: reqDocsSanitized,
              docs: updatedDocs,
            });
            setIsEditCustomerOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        customers={customers}
        shipments={shipments}
        masterDocs={masterDocs || []}
        availableMasterDocs={(masterDocs || []).map(d => d.name)}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSubmit={handleCreateInvoiceSubmit}
      />

      {editingInvoice && (
        <EditInvoiceModal
          isOpen={isEditInvoiceOpen}
          shipment={editingInvoice}
          customers={customers}
          shipments={shipments}
          onClose={() => {
            setIsEditInvoiceOpen(false);
            setEditingInvoice(null);
          }}
          onSubmit={handleUpdateInvoice}
        />
      )}

      {isContainerTrackerOpen && (
        <ContainerTrackerModal
          initialContainerNo={selectedTrackerContainer}
          customers={customers}
          existingShipments={shipments}
          onLinkShipment={async (data) => {
            await handleSaveAttachDoc({
              invoice: data.invoice,
              containerNo: data.containerNo,
              dest: data.dest,
              etd: data.etd,
              eta: data.eta,
              docs: [
                { name: 'Commercial Invoice', status: 'Not Started' },
                { name: 'Packing List', status: 'Not Started' },
                { name: 'Bill of Lading / AWB', status: 'Not Started' },
                { name: 'Certificate of Origin', status: 'Not Started' },
                { name: 'Customs Declaration', status: 'Not Started' },
              ],
            });
          }}
          onClose={() => setIsContainerTrackerOpen(false)}
        />
      )}

      {isUrgentModalOpen && (
        <UrgentComplianceModal
          urgentShipments={urgentShipments}
          onClose={() => setIsUrgentModalOpen(false)}
          onUpdateDocStatus={handleUpdateShipmentDocStatus}
          onOpenContainerTracker={handleOpenContainerTracker}
        />
      )}
    </div>
  );
}

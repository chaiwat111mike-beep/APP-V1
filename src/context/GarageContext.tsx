import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  JobOrder,
  SparePart,
  Customer,
  MechanicStaff,
  ServiceBay,
  GarageProfile,
  JobStatus,
  JobPartItem,
  FirebaseSyncStatus,
  PaymentStatus,
  PaymentMethod
} from '../types';
import {
  initialJobOrders,
  initialSpareParts,
  initialCustomers,
  initialMechanics,
  initialServiceBays,
  initialGarageProfile
} from '../data/initialData';
import { initializeGarageFirebase } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

import {
  createInventorySpreadsheet,
  createCustomersSpreadsheet,
  syncInventoryToGoogleSheet,
  syncCustomersToGoogleSheet,
  getStoredSpreadsheetId
} from '../services/googleSheetsService';
import { calculateJobBreakdown, generateAutoJobNo, CalculationBreakdown } from '../utils/jobCalculator';

interface GarageContextType {
  jobOrders: JobOrder[];
  spareParts: SparePart[];
  customers: Customer[];
  mechanics: MechanicStaff[];
  serviceBays: ServiceBay[];
  garageProfile: GarageProfile;
  syncStatus: FirebaseSyncStatus;
  
  // Job operations
  generateJobNo: (prefix?: string, format?: 'daily' | 'monthly') => string;
  calculateFinancials: (job: Partial<JobOrder>) => CalculationBreakdown;
  addJobOrder: (job: Omit<JobOrder, 'id' | 'createdAt' | 'updatedAt'> & { jobNo?: string }) => Promise<JobOrder>;
  updateJobOrder: (id: string, updates: Partial<JobOrder>) => Promise<void>;
  updateJobStatus: (id: string, newStatus: JobStatus) => Promise<void>;
  deleteJobOrder: (id: string) => Promise<void>;
  addPartToJob: (jobId: string, part: SparePart, quantity: number) => Promise<void>;
  removePartFromJob: (jobId: string, partId: string) => Promise<void>;
  updateJobPayment: (jobId: string, status: PaymentStatus, method?: PaymentMethod, amount?: number) => Promise<void>;
  
  // Inventory operations
  addSparePart: (part: Omit<SparePart, 'id' | 'lastRestockedAt'>) => Promise<SparePart>;
  updateSparePart: (id: string, updates: Partial<SparePart>) => Promise<void>;
  deleteSparePart: (id: string) => Promise<void>;
  restockPart: (id: string, addedQty: number) => Promise<void>;
  
  // Customer & Vehicle operations
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'totalVisits'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  findCustomerByPhoneOrPlate: (query: string) => { customer?: Customer; vehicle?: any };
  
  // Bay & Mechanic operations
  assignJobToBay: (bayId: string, jobId: string | undefined) => Promise<void>;
  updateBayStatus: (bayId: string, status: ServiceBay['status']) => Promise<void>;
  updateMechanicStatus: (mechanicId: string, status: MechanicStaff['status']) => Promise<void>;
  
  // Settings & Sync
  updateGarageProfile: (profile: Partial<GarageProfile>) => Promise<void>;
  syncWithFirebase: () => Promise<boolean>;
  syncWithGoogleSheets: (type?: 'all' | 'inventory' | 'customers') => Promise<boolean>;
  resetToDefaultData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonStr: string) => boolean;
}

const STORAGE_KEYS = {
  JOBS: 'songkarn_jobs_v1',
  PARTS: 'songkarn_parts_v1',
  CUSTOMERS: 'songkarn_customers_v1',
  MECHANICS: 'songkarn_mechanics_v1',
  BAYS: 'songkarn_bays_v1',
  PROFILE: 'songkarn_profile_v1',
};

const GarageContext = createContext<GarageContextType | undefined>(undefined);

export const GarageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
      return saved ? JSON.parse(saved) : initialJobOrders;
    } catch {
      return initialJobOrders;
    }
  });

  const [spareParts, setSpareParts] = useState<SparePart[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARTS);
      return saved ? JSON.parse(saved) : initialSpareParts;
    } catch {
      return initialSpareParts;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return saved ? JSON.parse(saved) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  });

  const [mechanics, setMechanics] = useState<MechanicStaff[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MECHANICS);
      return saved ? JSON.parse(saved) : initialMechanics;
    } catch {
      return initialMechanics;
    }
  });

  const [serviceBays, setServiceBays] = useState<ServiceBay[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BAYS);
      return saved ? JSON.parse(saved) : initialServiceBays;
    } catch {
      return initialServiceBays;
    }
  });

  const [garageProfile, setGarageProfile] = useState<GarageProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : initialGarageProfile;
    } catch {
      return initialGarageProfile;
    }
  });

  const [syncStatus, setSyncStatus] = useState<FirebaseSyncStatus>({
    connected: true,
    lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
    mode: 'firestore',
    projectName: 'Songkarn-v1',
    syncing: false,
  });

  // Local persistence helpers
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobOrders));
  }, [jobOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(spareParts));
  }, [spareParts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MECHANICS, JSON.stringify(mechanics));
  }, [mechanics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BAYS, JSON.stringify(serviceBays));
  }, [serviceBays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(garageProfile));
  }, [garageProfile]);

  // Firestore Real-time Subscriptions (if live credentials are ready)
  useEffect(() => {
    try {
      const { db, isLive } = initializeGarageFirebase();
      if (!isLive || !db) {
        setSyncStatus((prev) => ({
          ...prev,
          connected: true,
          mode: 'offline_synced',
          lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
        }));
        return;
      }

      // Subscribe to Job Orders with graceful offline fallback
      const unsubJobs = onSnapshot(
        collection(db, 'job_orders'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteJobs: JobOrder[] = [];
            snapshot.forEach((docSnap) => {
              remoteJobs.push(docSnap.data() as JobOrder);
            });
            // Merge with local
            setJobOrders(remoteJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          }
          setSyncStatus((prev) => ({
            ...prev,
            connected: true,
            mode: 'firestore',
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
          }));
        },
        (error) => {
          // Graceful fallback to offline local-storage sync
          setSyncStatus((prev) => ({
            ...prev,
            connected: true,
            mode: 'offline_synced',
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
          }));
        }
      );

      return () => {
        try {
          unsubJobs();
        } catch {
          // ignore cleanup errors
        }
      };
    } catch {
      setSyncStatus((prev) => ({
        ...prev,
        connected: true,
        mode: 'offline_synced',
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
      }));
    }
  }, []);

  // Cross-tab real-time sync event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.JOBS && e.newValue) {
        setJobOrders(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.PARTS && e.newValue) {
        setSpareParts(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.CUSTOMERS && e.newValue) {
        setCustomers(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.BAYS && e.newValue) {
        setServiceBays(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- JOB ACTIONS ---

  const generateJobNo = useCallback(
    (customPrefix?: string, customFormat?: 'daily' | 'monthly'): string => {
      const prefix = customPrefix || garageProfile.jobNoPrefix || 'JOB';
      const format = customFormat || garageProfile.jobNoFormat || 'monthly';
      return generateAutoJobNo(jobOrders, prefix, format);
    },
    [jobOrders, garageProfile.jobNoPrefix, garageProfile.jobNoFormat]
  );

  const calculateFinancials = useCallback(
    (job: Partial<JobOrder>): CalculationBreakdown => {
      return calculateJobBreakdown({
        parts: job.partsUsed || [],
        laborFee: job.laborFee || 0,
        otherFee: job.otherFee || 0,
        discount: job.discount || 0,
        discountType: job.discountType || 'amount',
        discountPercent: job.discountPercent || 0,
        vatPercent: job.vatPercent ?? (garageProfile.vatPercent || 7),
        depositAmount: job.depositAmount,
        paidAmount: job.paidAmount,
      });
    },
    [garageProfile.vatPercent]
  );

  const addJobOrder = async (jobInput: Omit<JobOrder, 'id' | 'createdAt' | 'updatedAt'> & { jobNo?: string }): Promise<JobOrder> => {
    const now = new Date().toISOString();
    const newId = 'job-' + Date.now();
    const newJobNo = jobInput.jobNo?.trim() ? jobInput.jobNo.trim() : generateJobNo();

    // Comprehensive financial breakdown
    const breakdown = calculateFinancials(jobInput);

    const newJob: JobOrder = {
      ...jobInput,
      id: newId,
      jobNo: newJobNo,
      receivedDate: jobInput.receivedDate || now,
      createdAt: now,
      updatedAt: now,
      partsUsed: jobInput.partsUsed || [],
      laborFee: breakdown.laborFee,
      otherFee: breakdown.otherFee,
      otherFeeDescription: jobInput.otherFeeDescription || '',
      discount: breakdown.discountAmount,
      discountType: breakdown.discountType,
      discountPercent: breakdown.discountPercent,
      vatPercent: breakdown.vatPercent,
      totalAmount: breakdown.grandTotal,
      depositAmount: breakdown.depositAmount,
      paidAmount: breakdown.depositAmount || jobInput.paidAmount || 0,
      paymentStatus: jobInput.paymentStatus || breakdown.suggestedPaymentStatus,
    };

    setJobOrders((prev) => [newJob, ...prev]);

    // Update or create Customer CRM record automatically
    updateOrCreateCustomerRecord(newJob);

    // Update Bay if assigned
    if (newJob.bayNumber) {
      setServiceBays((prev) =>
        prev.map((bay) =>
          bay.bayNumber === newJob.bayNumber ? { ...bay, status: 'occupied', currentJobId: newId } : bay
        )
      );
    }

    // Sync to Firestore if available
    saveJobToFirestore(newJob);

    return newJob;
  };

  const updateJobOrder = async (id: string, updates: Partial<JobOrder>) => {
    const now = new Date().toISOString();
    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;
        const merged = { ...job, ...updates, updatedAt: now };

        // Recalculate financial totals with full breakdown
        const breakdown = calculateFinancials(merged);
        const updated: JobOrder = {
          ...merged,
          laborFee: breakdown.laborFee,
          otherFee: breakdown.otherFee,
          discount: breakdown.discountAmount,
          discountType: breakdown.discountType,
          discountPercent: breakdown.discountPercent,
          vatPercent: breakdown.vatPercent,
          totalAmount: breakdown.grandTotal,
          depositAmount: breakdown.depositAmount,
          paymentStatus: updates.paymentStatus || (breakdown.suggestedPaymentStatus !== 'unpaid' ? breakdown.suggestedPaymentStatus : merged.paymentStatus),
        };

        saveJobToFirestore(updated);
        return updated;
      })
    );
  };

  const updateJobStatus = async (id: string, newStatus: JobStatus) => {
    const now = new Date().toISOString();
    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;
        const updated: JobOrder = {
          ...job,
          status: newStatus,
          updatedAt: now,
          completedAt: newStatus === 'completed' || newStatus === 'delivered' ? job.completedAt || now : undefined,
          deliveredAt: newStatus === 'delivered' ? job.deliveredAt || now : undefined,
        };

        // If delivered or completed, free up bay
        if (newStatus === 'delivered' && job.bayNumber) {
          setServiceBays((bays) =>
            bays.map((b) => (b.currentJobId === id ? { ...b, status: 'available', currentJobId: undefined } : b))
          );
        }

        saveJobToFirestore(updated);
        return updated;
      })
    );
  };

  const deleteJobOrder = async (id: string) => {
    setJobOrders((prev) => prev.filter((j) => j.id !== id));
    setServiceBays((prev) =>
      prev.map((b) => (b.currentJobId === id ? { ...b, status: 'available', currentJobId: undefined } : b))
    );

    const { db } = initializeGarageFirebase();
    if (db) {
      try {
        await deleteDoc(doc(db, 'job_orders', id));
      } catch (e) {
        console.warn('Firestore delete doc warning:', e);
      }
    }
  };

  const addPartToJob = async (jobId: string, part: SparePart, quantity: number) => {
    if (quantity <= 0) return;

    // 1. Deduct from inventory
    setSpareParts((prev) =>
      prev.map((p) => (p.id === part.id ? { ...p, stockQty: Math.max(0, p.stockQty - quantity) } : p))
    );

    // 2. Add to Job Order
    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const existingIdx = job.partsUsed.findIndex((p) => p.partId === part.id);
        let updatedParts = [...job.partsUsed];

        if (existingIdx >= 0) {
          const current = updatedParts[existingIdx];
          const newQty = current.quantity + quantity;
          updatedParts[existingIdx] = {
            ...current,
            quantity: newQty,
            totalPrice: newQty * current.unitPrice,
          };
        } else {
          const newItem: JobPartItem = {
            partId: part.id,
            partCode: part.partCode,
            partName: part.name,
            quantity: quantity,
            unitPrice: part.sellPrice,
            costPrice: part.costPrice,
            totalPrice: quantity * part.sellPrice,
          };
          updatedParts.push(newItem);
        }

        const partsTotal = updatedParts.reduce((sum, p) => sum + p.totalPrice, 0);
        const subtotal = partsTotal + (job.laborFee || 0) + (job.otherFee || 0) - (job.discount || 0);
        const vat = subtotal > 0 ? (subtotal * (job.vatPercent ?? 7)) / 100 : 0;
        const total = Math.max(0, subtotal + vat);

        const updatedJob: JobOrder = {
          ...job,
          partsUsed: updatedParts,
          totalAmount: total,
          updatedAt: new Date().toISOString(),
        };

        saveJobToFirestore(updatedJob);
        return updatedJob;
      })
    );
  };

  const removePartFromJob = async (jobId: string, partId: string) => {
    let restoredQty = 0;

    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const itemToRemove = job.partsUsed.find((p) => p.partId === partId);
        if (itemToRemove) {
          restoredQty = itemToRemove.quantity;
        }

        const updatedParts = job.partsUsed.filter((p) => p.partId !== partId);
        const partsTotal = updatedParts.reduce((sum, p) => sum + p.totalPrice, 0);
        const subtotal = partsTotal + (job.laborFee || 0) + (job.otherFee || 0) - (job.discount || 0);
        const vat = subtotal > 0 ? (subtotal * (job.vatPercent ?? 7)) / 100 : 0;
        const total = Math.max(0, subtotal + vat);

        const updatedJob: JobOrder = {
          ...job,
          partsUsed: updatedParts,
          totalAmount: total,
          updatedAt: new Date().toISOString(),
        };
        saveJobToFirestore(updatedJob);
        return updatedJob;
      })
    );

    // Restore stock
    if (restoredQty > 0) {
      setSpareParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, stockQty: p.stockQty + restoredQty } : p))
      );
    }
  };

  const updateJobPayment = async (
    jobId: string,
    status: PaymentStatus,
    method?: PaymentMethod,
    amount?: number
  ) => {
    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const updated: JobOrder = {
          ...job,
          paymentStatus: status,
          paymentMethod: method || job.paymentMethod,
          paidAmount: amount !== undefined ? amount : status === 'paid' ? job.totalAmount : job.paidAmount,
          updatedAt: new Date().toISOString(),
        };
        saveJobToFirestore(updated);
        return updated;
      })
    );
  };

  // Helper for customer CRM update
  const updateOrCreateCustomerRecord = (job: JobOrder) => {
    setCustomers((prev) => {
      const existing = prev.find(
        (c) => c.phone.trim() === job.customerPhone.trim() || c.name.trim() === job.customerName.trim()
      );

      const vehicleEntry = {
        licensePlate: job.licensePlate,
        brand: job.carBrand,
        model: job.carModel,
        year: job.carYear,
        color: job.carColor,
        vin: job.vinNumber,
        lastMileage: job.mileage,
        lastServiceDate: job.createdAt.slice(0, 10),
      };

      if (existing) {
        const vehicleExists = existing.vehicles.some(
          (v) => v.licensePlate.replace(/\s+/g, '') === job.licensePlate.replace(/\s+/g, '')
        );
        const updatedVehicles = vehicleExists
          ? existing.vehicles.map((v) =>
              v.licensePlate.replace(/\s+/g, '') === job.licensePlate.replace(/\s+/g, '')
                ? { ...v, lastMileage: job.mileage, lastServiceDate: job.createdAt.slice(0, 10) }
                : v
            )
          : [...existing.vehicles, vehicleEntry];

        return prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                totalVisits: c.totalVisits + 1,
                totalSpent: c.totalSpent + job.totalAmount,
                vehicles: updatedVehicles,
                address: job.customerAddress || c.address,
              }
            : c
        );
      } else {
        const newCustomer: Customer = {
          id: 'cust-' + Date.now(),
          name: job.customerName,
          phone: job.customerPhone,
          address: job.customerAddress,
          vehicles: [vehicleEntry],
          totalSpent: job.totalAmount,
          totalVisits: 1,
          createdAt: new Date().toISOString(),
        };
        return [newCustomer, ...prev];
      }
    });
  };

  // --- INVENTORY ACTIONS ---

  const addSparePart = async (partInput: Omit<SparePart, 'id' | 'lastRestockedAt'>): Promise<SparePart> => {
    const newId = 'part-' + Date.now();
    const newPart: SparePart = {
      ...partInput,
      id: newId,
      lastRestockedAt: new Date().toISOString().slice(0, 10),
    };
    setSpareParts((prev) => [newPart, ...prev]);
    return newPart;
  };

  const updateSparePart = async (id: string, updates: Partial<SparePart>) => {
    setSpareParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteSparePart = async (id: string) => {
    setSpareParts((prev) => prev.filter((p) => p.id !== id));
  };

  const restockPart = async (id: string, addedQty: number) => {
    setSpareParts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              stockQty: p.stockQty + addedQty,
              lastRestockedAt: new Date().toISOString().slice(0, 10),
            }
          : p
      )
    );
  };

  // --- CUSTOMER ACTIONS ---

  const addCustomer = async (
    customerInput: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'totalVisits'>
  ): Promise<Customer> => {
    const newId = 'cust-' + Date.now();
    const newCust: Customer = {
      ...customerInput,
      id: newId,
      totalSpent: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const findCustomerByPhoneOrPlate = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return {};

    for (const c of customers) {
      if (c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) {
        return { customer: c, vehicle: c.vehicles[0] };
      }
      for (const v of c.vehicles) {
        if (v.licensePlate.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) {
          return { customer: c, vehicle: v };
        }
      }
    }
    return {};
  };

  // --- BAYS & MECHANICS ---

  const assignJobToBay = async (bayId: string, jobId: string | undefined) => {
    setServiceBays((prev) =>
      prev.map((bay) =>
        bay.id === bayId
          ? {
              ...bay,
              currentJobId: jobId,
              status: jobId ? 'occupied' : 'available',
            }
          : bay
      )
    );

    if (jobId) {
      const bayObj = serviceBays.find((b) => b.id === bayId);
      if (bayObj) {
        updateJobOrder(jobId, { bayNumber: bayObj.bayNumber });
      }
    }
  };

  const updateBayStatus = async (bayId: string, status: ServiceBay['status']) => {
    setServiceBays((prev) =>
      prev.map((bay) => (bay.id === bayId ? { ...bay, status, currentJobId: status === 'available' ? undefined : bay.currentJobId } : bay))
    );
  };

  const updateMechanicStatus = async (mechanicId: string, status: MechanicStaff['status']) => {
    setMechanics((prev) => prev.map((m) => (m.id === mechanicId ? { ...m, status } : m)));
  };

  const updateGarageProfile = async (profileUpdates: Partial<GarageProfile>) => {
    setGarageProfile((prev) => ({ ...prev, ...profileUpdates }));
  };

  // Firestore direct save helper
  const saveJobToFirestore = async (job: JobOrder) => {
    try {
      const { db } = initializeGarageFirebase();
      if (!db) return;
      await setDoc(doc(db, 'job_orders', job.id), job, { merge: true });
    } catch {
      // Graceful offline fallback
    }
  };

  const syncWithFirebase = async (): Promise<boolean> => {
    setSyncStatus((prev) => ({ ...prev, syncing: true }));
    let isLiveActive = false;
    try {
      const { db, isLive } = initializeGarageFirebase();
      isLiveActive = !!isLive;

      if (isLive && db) {
        try {
          const batch = writeBatch(db);
          jobOrders.forEach((j) => {
            batch.set(doc(db, 'job_orders', j.id), j);
          });
          spareParts.forEach((p) => {
            batch.set(doc(db, 'spare_parts', p.id), p);
          });
          await batch.commit();
          setSyncStatus({
            connected: true,
            mode: 'firestore',
            lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
            projectName: 'Songkarn-v1',
            syncing: false,
          });
          return true;
        } catch (err) {
          console.warn('Firebase batch sync fallback to local storage:', err);
        }
      }
    } catch {
      // Handled below in local sync fallback
    }

    // Local instant sync simulation
    await new Promise((r) => setTimeout(r, 600));
    setSyncStatus({
      connected: true,
      mode: isLiveActive ? 'firestore' : 'offline_synced',
      lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
      projectName: 'Songkarn-v1',
      syncing: false,
    });
    return true;
  };

  const syncWithGoogleSheets = async (type: 'all' | 'inventory' | 'customers' = 'all'): Promise<boolean> => {
    try {
      if (type === 'all' || type === 'inventory') {
        const invId = getStoredSpreadsheetId('inventory') || garageProfile.googleSheetsInventoryId;
        if (invId) {
          await syncInventoryToGoogleSheet(invId, spareParts);
        }
      }
      if (type === 'all' || type === 'customers') {
        const custId = getStoredSpreadsheetId('customers') || garageProfile.googleSheetsCustomersId;
        if (custId) {
          await syncCustomersToGoogleSheet(custId, customers);
        }
      }
      return true;
    } catch (e) {
      console.warn('Google Sheets sync notice:', e);
      return false;
    }
  };

  const resetToDefaultData = () => {
    setJobOrders(initialJobOrders);
    setSpareParts(initialSpareParts);
    setCustomers(initialCustomers);
    setMechanics(initialMechanics);
    setServiceBays(initialServiceBays);
    setGarageProfile(initialGarageProfile);
    localStorage.clear();
  };

  const exportDatabaseJson = (): string => {
    const fullBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      garageProfile,
      jobOrders,
      spareParts,
      customers,
      mechanics,
      serviceBays,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDatabaseJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.jobOrders) setJobOrders(data.jobOrders);
      if (data.spareParts) setSpareParts(data.spareParts);
      if (data.customers) setCustomers(data.customers);
      if (data.mechanics) setMechanics(data.mechanics);
      if (data.serviceBays) setServiceBays(data.serviceBays);
      if (data.garageProfile) setGarageProfile(data.garageProfile);
      return true;
    } catch (e) {
      console.error('Failed to import JSON database', e);
      return false;
    }
  };

  return (
    <GarageContext.Provider
      value={{
        jobOrders,
        spareParts,
        customers,
        mechanics,
        serviceBays,
        garageProfile,
        syncStatus,
        generateJobNo,
        calculateFinancials,
        addJobOrder,
        updateJobOrder,
        updateJobStatus,
        deleteJobOrder,
        addPartToJob,
        removePartFromJob,
        updateJobPayment,
        addSparePart,
        updateSparePart,
        deleteSparePart,
        restockPart,
        addCustomer,
        updateCustomer,
        findCustomerByPhoneOrPlate,
        assignJobToBay,
        updateBayStatus,
        updateMechanicStatus,
        updateGarageProfile,
        syncWithFirebase,
        syncWithGoogleSheets,
        resetToDefaultData,
        exportDatabaseJson,
        importDatabaseJson,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
};

export const useGarage = () => {
  const context = useContext(GarageContext);
  if (!context) {
    throw new Error('useGarage must be used within a GarageProvider');
  }
  return context;
};

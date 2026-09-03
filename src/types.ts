export type UserRole = 'owner' | 'lead_mechanic' | 'mechanic' | 'receptionist';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
}

export type JobStatus =
  | 'pending'        // รอดำเนินการ / รับรถ
  | 'inspecting'      // กำลังตรวจเช็ค
  | 'waiting_parts'   // รออะไหล่
  | 'in_progress'     // กำลังซ่อม
  | 'qc'              // ทดสอบรถ / QC
  | 'completed'       // ซ่อมเสร็จสมบูรณ์
  | 'delivered';      // ส่งมอบรถแล้ว / ปิดงาน

export type JobPriority = 'normal' | 'urgent' | 'appointment';

export type PaymentStatus = 'unpaid' | 'deposit' | 'paid';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'insurance' | 'promptpay';

export interface JobPartItem {
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
}

export interface JobInspection {
  fuelLevel: number; // 0-100%
  dashboardMileage: number;
  exteriorScratches: string[];
  valuableItemsChecked: boolean;
  spareTirePresent: boolean;
  batteryHealth?: string;
  brakesCondition?: string;
}

export interface JobOrder {
  id: string;
  jobNo: string; // e.g. JOB-202608-001
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerTaxId?: string;
  licensePlate: string; // ทะเบียนรถ e.g. 8กข 9988 กทม.
  carBrand: string;     // e.g. Toyota, Honda, Isuzu, Ford
  carModel: string;     // e.g. Hilux Revo, Civic, D-Max
  carYear?: string;
  carColor?: string;
  vinNumber?: string;   // เลขตัวถัง
  mileage: number;      // เลขไมล์ปัจจุบัน
  
  issueDescription: string; // อาการเสียที่แจ้ง
  technicianNotes?: string; // บันทึกของช่าง
  
  inspection?: JobInspection;
  
  mechanicId?: string;
  mechanicName?: string;
  bayNumber?: number; // ช่องซ่อม 1-3
  
  status: JobStatus;
  priority: JobPriority;
  
  partsUsed: JobPartItem[];
  laborFee: number;
  otherFee?: number;
  otherFeeDescription?: string;
  discount: number;
  discountType?: 'amount' | 'percent';
  discountPercent?: number;
  vatPercent: number; // default 7
  totalAmount: number;
  
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
  depositAmount?: number;
  
  receivedDate?: string; // วันที่และเวลารับรถเข้าอู่
  estimatedCompletionDate?: string; // วันที่และเวลากำหนดส่งมอบรถ
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deliveredAt?: string;
}

export interface SparePart {
  id: string;
  partCode: string;
  name: string;
  category: 'engine' | 'brake' | 'suspension' | 'electrical' | 'filter' | 'oil_fluid' | 'tire' | 'body' | 'other';
  brand: string;
  compatibleModels: string; // e.g. "Toyota Vios 2013-2022, Yaris"
  unit: string; // ชิ้น, ลิตร, แกลลอน, ชุด, เส้น
  stockQty: number;
  minStockQty: number;
  costPrice: number;
  sellPrice: number;
  supplier?: string;
  locationRack?: string; // ตำแหน่งเก็บ เช่น ชั้น A-02
  lastRestockedAt?: string;
}

export interface CustomerVehicle {
  licensePlate: string;
  brand: string;
  model: string;
  year?: string;
  color?: string;
  vin?: string;
  lastMileage: number;
  lastServiceDate: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  lineId?: string;
  taxId?: string;
  notes?: string;
  vehicles: CustomerVehicle[];
  totalSpent: number;
  totalVisits: number;
  createdAt: string;
}

export interface MechanicStaff {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'lead' | 'mechanic' | 'electrician' | 'apprentice';
  avatar?: string;
  specialties: string[];
  activeJobsCount: number;
  completedJobsCount: number;
  rating: number;
  status: 'available' | 'busy' | 'leave';
}

export interface ServiceBay {
  id: string;
  bayNumber: number;
  name: string;
  type: 'general' | 'engine' | 'suspension' | 'quick_service' | 'alignment';
  currentJobId?: string;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface GarageProfile {
  name: string; // display name alias
  garageName: string;
  tagline: string;
  phone: string;
  mechanicPhone?: string; // 061-069-2036
  mechanicName?: string; // ช่างไมค์
  lineId?: string; // chaiwatmike
  lineDirectUrl?: string; // https://line.me/ti/p/~chaiwatmike
  lineNotifyToken?: string;
  email: string;
  address: string;
  taxId: string;
  vatPercent?: number;
  promptPayId: string; // เลขพร้อมเพย์ เบอร์โทร หรือ เลขบัตร
  promptPayType: 'phone' | 'citizenId' | 'eWallet';
  bankName: string;
  bankAccount: string;
  bankAccountNumber?: string;
  bankAccountName: string;
  firebaseDbName: string;
  logoText: string;
  terms: string;
  warrantyTerms?: string;
  logoImage?: string; // Base64 or URL
  bannerImage?: string;
  jobNoPrefix?: string; // e.g. "JOB", "SK", "REP"
  jobNoFormat?: 'daily' | 'monthly'; // 'daily' (JOB-YYYYMMDD-XXX) or 'monthly' (JOB-YYYYMM-XXX)
  googleSheetsInventoryId?: string;
  googleSheetsCustomersId?: string;
  autoSyncGoogleSheets?: boolean;
}

export interface GoogleSheetsSyncConfig {
  inventorySpreadsheetId?: string;
  inventorySpreadsheetUrl?: string;
  customersSpreadsheetId?: string;
  customersSpreadsheetUrl?: string;
  autoSync: boolean;
  lastInventorySyncAt?: string;
  lastCustomersSyncAt?: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

export interface LineNotifyTemplate {
  id: string;
  title: string;
  template: (job: JobOrder, garage: GarageProfile) => string;
}

export interface FirebaseSyncStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  mode: 'firestore' | 'offline_synced';
  projectName: string;
  syncing: boolean;
}

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Download,
  PlusCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Copy,
  Trash2,
  Search,
  Table,
  HelpCircle,
  LogIn,
  Check,
  Activity,
  Sparkles,
  Code,
  Wrench,
  Radio,
  ArrowDownCircle,
  FolderDown,
  Layers,
  Eye,
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { loginWithGoogleFirebase } from '../firebase/config';
import {
  createInventorySpreadsheet,
  createCustomersSpreadsheet,
  syncInventoryToGoogleSheet,
  syncCustomersToGoogleSheet,
  syncJobOrdersToGoogleSheet,
  syncFinancialSummaryToGoogleSheet,
  syncAllToGoogleSheet,
  generateGoogleAppsScriptCode,
  TARGET_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  getStoredSpreadsheetId,
  setStoredSpreadsheetId,
  clearStoredSpreadsheetId,
  isRealGoogleSpreadsheetId,
  extractSpreadsheetId,
  getSpreadsheetUrl,
  copyDataForGoogleSheets,
  downloadCsvFile,
  requestGoogleOAuthToken,
  getStoredGoogleToken,
  getStoredGoogleEmail,
  clearStoredGoogleToken,
  testGoogleSheetsConnection,
  fetchSheetDataFromGoogle,
  parseSparePartsFromRows,
  parseCustomersFromRows,
  FetchedSheetData,
} from '../services/googleSheetsService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTab?: 'fetch' | 'inventory' | 'customers' | 'jobs' | 'all';
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  targetTab = 'all',
}) => {
  const {
    spareParts,
    customers,
    jobOrders,
    garageProfile,
    updateGarageProfile,
    googleSheetsSyncStatus,
    setGoogleSheetId,
    toggleGoogleSheetAutoSync,
    importSpareParts,
    importCustomers,
  } = useGarage();

  const [activeSubTab, setActiveSubTab] = useState<'fetch' | 'inventory' | 'jobs' | 'customers' | 'script'>(
    targetTab === 'customers' ? 'customers' : targetTab === 'jobs' ? 'jobs' : targetTab === 'inventory' ? 'inventory' : 'fetch'
  );

  const [inventorySheetId, setInventorySheetId] = useState<string | null>(TARGET_SPREADSHEET_ID);
  const [customersSheetId, setCustomersSheetId] = useState<string | null>(TARGET_SPREADSHEET_ID);
  const [jobsSheetId, setJobsSheetId] = useState<string | null>(TARGET_SPREADSHEET_ID);

  const [manualSheetInput, setManualSheetInput] = useState<string>('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isCreatingViaApi, setIsCreatingViaApi] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    authenticated: boolean;
    email?: string;
    spreadsheetTitle?: string;
    latencyMs: number;
    message: string;
  } | null>(null);

  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch / Live Google Sheet Viewer states
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [selectedFetchTabName, setSelectedFetchTabName] = useState<string>('คลังสต็อกอะไหล่');
  const [fetchedSheetData, setFetchedSheetData] = useState<FetchedSheetData | null>(null);
  const [searchFetchTerm, setSearchFetchTerm] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Synchronize state when opened
  useEffect(() => {
    if (isOpen) {
      const primaryId = getStoredSpreadsheetId('all') || TARGET_SPREADSHEET_ID;
      const invId = getStoredSpreadsheetId('inventory') || primaryId;
      const custId = getStoredSpreadsheetId('customers') || primaryId;
      setInventorySheetId(invId);
      setCustomersSheetId(custId);
      setJobsSheetId(primaryId);
      setManualSheetInput('');
      setIsEditingLink(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      setTestResult(null);

      const email = getStoredGoogleEmail();
      setGoogleUserEmail(email);

      // Auto test connection
      const token = getStoredGoogleToken();
      if (token) {
        handleTestConnection(primaryId);
      }

      // If opening in fetch mode, auto fetch
      if (activeSubTab === 'fetch' && !fetchedSheetData) {
        handleFetchLiveSheet(primaryId, selectedFetchTabName);
      }
    }
  }, [isOpen, activeSubTab]);

  if (!isOpen) return null;

  const currentSheetId =
    activeSubTab === 'inventory'
      ? inventorySheetId || TARGET_SPREADSHEET_ID
      : activeSubTab === 'customers'
      ? customersSheetId || TARGET_SPREADSHEET_ID
      : jobsSheetId || TARGET_SPREADSHEET_ID;

  const isSheetValid = isRealGoogleSpreadsheetId(currentSheetId);
  const currentSheetUrl = isSheetValid && currentSheetId ? getSpreadsheetUrl(currentSheetId) : null;
  const hasGoogleToken = !!getStoredGoogleToken();

  // Prepare structured headers and rows for inventory
  const inventoryHeaders = [
    'รหัสอะไหล่',
    'ชื่ออะไหล่',
    'หมวดหมู่',
    'ยี่ห้อ',
    'รุ่นรถยนต์',
    'หน่วย',
    'จำนวนคงเหลือ',
    'จุดสั่งซื้อขั้นต่ำ',
    'ราคาต้นทุน',
    'ราคาขาย',
    'ตำแหน่งเก็บ',
    'ผู้จำหน่าย',
  ];

  const inventoryRows = spareParts.map((p) => [
    p.partCode,
    p.name,
    p.category,
    p.brand,
    p.compatibleModels,
    p.unit,
    p.stockQty,
    p.minStockQty,
    p.costPrice,
    p.sellPrice,
    p.locationRack || '-',
    p.supplier || '-',
  ]);

  // Prepare structured headers and rows for customers
  const customerHeaders = [
    'รหัสลูกค้า',
    'ชื่อ-นามสกุล',
    'เบอร์โทรศัพท์',
    'LINE ID',
    'อีเมล',
    'ที่อยู่',
    'ทะเบียนรถยนต์',
    'ยี่ห้อ/รุ่นรถ',
    'เลขไมล์ล่าสุด',
    'ยอดใช้จ่ายสะสม',
    'จำนวนครั้งที่เข้าใช้',
  ];

  const customerRows: any[][] = [];
  customers.forEach((c) => {
    const v = c.vehicles && c.vehicles.length > 0 ? c.vehicles[0] : null;
    customerRows.push([
      c.id,
      c.name,
      c.phone,
      c.lineId || '-',
      c.email || '-',
      c.address || '-',
      v ? v.licensePlate : '-',
      v ? `${v.brand} ${v.model}` : '-',
      v ? v.lastMileage : 0,
      c.totalSpent,
      c.totalVisits,
    ]);
  });

  // Prepare structured headers and rows for job orders
  const jobHeaders = [
    'เลขที่ใบสั่งซ่อม',
    'วันที่รับรถ',
    'ทะเบียนรถ',
    'ยี่ห้อ / รุ่นรถ',
    'ชื่อลูกค้า',
    'เบอร์โทรศัพท์',
    'อาการเสียที่แจ้ง',
    'สถานะงานซ่อม',
    'ความเร่งด่วน',
    'ช่างผู้รับผิดชอบ',
    'ช่องซ่อม',
    'ยอดรวมสุทธิ (บาท)',
    'สถานะชำระเงิน',
    'กำหนดส่งมอบรถ',
  ];

  const jobRows = jobOrders.map((j) => [
    j.jobNo,
    j.receivedDate || j.createdAt.slice(0, 10),
    j.licensePlate,
    `${j.carBrand} ${j.carModel}`,
    j.customerName,
    j.customerPhone,
    j.issueDescription || '-',
    j.status,
    j.priority,
    j.mechanicName || 'ช่างไมค์',
    j.bayNumber ? `ช่อง ${j.bayNumber}` : '-',
    j.totalAmount,
    j.paymentStatus,
    j.estimatedCompletionDate || '-',
  ]);

  const activeHeaders =
    activeSubTab === 'inventory'
      ? inventoryHeaders
      : activeSubTab === 'jobs'
      ? jobHeaders
      : customerHeaders;

  const activeRows =
    activeSubTab === 'inventory'
      ? inventoryRows
      : activeSubTab === 'jobs'
      ? jobRows
      : customerRows;

  // Filter rows for interactive in-app preview table
  const filteredRows = activeRows.filter((row) =>
    row.some((cell) => String(cell).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 1. Action: Connect Google Account (GSI Token with Firebase fallback)
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setErrorMessage(null);
    try {
      await requestGoogleOAuthToken();
      const email = getStoredGoogleEmail();
      setGoogleUserEmail(email);
      setSuccessMessage('เชื่อมต่อบัญชี Google สำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMessage(null), 4000);
      handleTestConnection(currentSheetId);
    } catch (err: any) {
      console.warn('GSI popup attempt notice, trying Firebase popup fallback:', err);
      try {
        const fbRes = await loginWithGoogleFirebase();
        if (fbRes.success && fbRes.accessToken) {
          const email = getStoredGoogleEmail() || fbRes.user?.email || null;
          setGoogleUserEmail(email);
          setSuccessMessage('เชื่อมต่อบัญชี Google สำเร็จเรียบร้อยแล้ว!');
          setTimeout(() => setSuccessMessage(null), 4000);
          handleTestConnection(currentSheetId);
          return;
        }
      } catch (fbErr) {
        console.warn('Firebase fallback notice:', fbErr);
      }
      setErrorMessage(
        'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป (Popup Blocked): กรุณากด "อนุญาตป๊อปอัป" (Allow Popups) ที่ Address Bar ด้านบน หรือใช้งานระบบดึงข้อมูลสด (Live Sheets) และปุ่ม "คัดลอกข้อมูลไปวางใน Google Sheets" ได้ทันที'
      );
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // 2. Action: Test Connection Ping
  const handleTestConnection = async (targetId?: string | null) => {
    setIsTesting(true);
    try {
      const res = await testGoogleSheetsConnection(targetId !== undefined ? targetId : currentSheetId);
      setTestResult(res);
      if (res.email) {
        setGoogleUserEmail(res.email);
      }
    } catch (err: any) {
      setTestResult({
        connected: false,
        authenticated: false,
        latencyMs: 0,
        message: err?.message || 'การทดสอบขัดข้อง',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 2.1 Action: Fetch Live Data Directly from Google Sheets
  const handleFetchLiveSheet = async (
    targetSpreadsheetId?: string,
    sheetTab?: string
  ) => {
    const idToUse = targetSpreadsheetId || currentSheetId || TARGET_SPREADSHEET_ID;
    const tabToUse = sheetTab || selectedFetchTabName || 'คลังสต็อกอะไหล่';

    setIsFetchingSheet(true);
    setErrorMessage(null);
    setImportFeedback(null);
    try {
      const data = await fetchSheetDataFromGoogle(idToUse, tabToUse);
      setFetchedSheetData(data);
      setSelectedFetchTabName(data.sheetTitle);
      setSuccessMessage(
        `ดึงข้อมูลสดจาก Google Sheet (${data.sheetTitle}) สำเร็จแล้ว! พบ ${data.totalRows} แถว`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.warn('Fetch live sheet error:', err);
      setErrorMessage(
        err?.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบสิทธิ์การแชร์หรือลองใหม่อีกครั้ง'
      );
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // 2.2 Action: Import Fetched Google Sheet Rows into App State
  const handleImportFetchedData = () => {
    if (!fetchedSheetData || fetchedSheetData.rows.length === 0) {
      setErrorMessage('ไม่มีข้อมูลสำหรับนำเข้า');
      return;
    }

    try {
      const tab = (fetchedSheetData.sheetTitle || '').toLowerCase();
      if (tab.includes('สต็อก') || tab.includes('อะไหล่') || tab.includes('inventory')) {
        const parts = parseSparePartsFromRows(fetchedSheetData.headers, fetchedSheetData.rows);
        if (parts.length === 0) {
          setErrorMessage('ไม่สามารถแปลงข้อมูลเป็นรายการอะไหล่ได้ กรุณาตรวจสอบหัวตารางในชีต');
          return;
        }
        importSpareParts(parts, 'merge');
        setImportFeedback(`✅ นำเข้าและอัปเดตสต็อกอะไหล่สำเร็จจำนวน ${parts.length} รายการ!`);
        setSuccessMessage(`นำเข้าสต็อกอะไหล่จาก Google Sheets ${parts.length} รายการเรียบร้อยแล้ว`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (tab.includes('ลูกค้า') || tab.includes('รถ') || tab.includes('customer')) {
        const custs = parseCustomersFromRows(fetchedSheetData.headers, fetchedSheetData.rows);
        if (custs.length === 0) {
          setErrorMessage('ไม่สามารถแปลงข้อมูลเป็นข้อมูลลูกค้าได้ กรุณาตรวจสอบหัวตารางในชีต');
          return;
        }
        importCustomers(custs, 'merge');
        setImportFeedback(`✅ นำเข้าและอัปเดตข้อมูลลูกค้าสำเร็จจำนวน ${custs.length} รายการ!`);
        setSuccessMessage(`นำเข้าข้อมูลลูกค้าจาก Google Sheets ${custs.length} รายการเรียบร้อยแล้ว`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setImportFeedback(`ดึงข้อมูล ${fetchedSheetData.totalRows} แถวแสดงผลเรียบร้อยแล้ว (แผ่นงาน: ${fetchedSheetData.sheetTitle})`);
      }
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการนำเข้า: ${err?.message || err}`);
    }
  };

  // 3. Action: Create Spreadsheet automatically via Google API
  const handleCreateSheetViaApi = async () => {
    setIsCreatingViaApi(true);
    setErrorMessage(null);
    try {
      let created: { spreadsheetId: string; spreadsheetUrl: string };
      if (activeSubTab === 'inventory') {
        created = await createInventorySpreadsheet(garageProfile.name, spareParts);
        setInventorySheetId(created.spreadsheetId);
        updateGarageProfile({ googleSheetsInventoryId: created.spreadsheetId });
      } else {
        created = await createCustomersSpreadsheet(garageProfile.name, customers);
        setCustomersSheetId(created.spreadsheetId);
        updateGarageProfile({ googleSheetsCustomersId: created.spreadsheetId });
      }

      setSuccessMessage(`สร้างและเชื่อมต่อ Google Sheet สำเร็จเรียบร้อย! (ID: ${created.spreadsheetId})`);
      setTimeout(() => setSuccessMessage(null), 5000);
      handleTestConnection(created.spreadsheetId);
    } catch (err: any) {
      console.warn('Create via API failed, opening sheets.new fallback:', err);
      // Fallback: Open sheets.new
      window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
      setSuccessMessage(
        'เปิดหน้าสร้าง Google Sheet (sheets.new) ในแท็บใหม่แล้ว! เมื่อได้หน้าชีต ให้คัดลอกลิงก์มาวางด้านล่าง'
      );
      setTimeout(() => setSuccessMessage(null), 8000);
    } finally {
      setIsCreatingViaApi(false);
    }
  };

  // 4. Action: Save manually pasted Google Sheets URL or ID
  const handleSaveManualSheet = () => {
    if (!manualSheetInput.trim()) {
      setErrorMessage('กรุณาระบุลิงก์หรือ Spreadsheet ID ของ Google Sheets');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const cleanId = extractSpreadsheetId(manualSheetInput);
    if (!isRealGoogleSpreadsheetId(cleanId)) {
      setErrorMessage('รูปแบบลิงก์หรือ Spreadsheet ID ไม่ถูกต้อง (ต้องเป็น ID จริงจาก Google Sheets)');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setStoredSpreadsheetId(activeSubTab, cleanId);

    if (activeSubTab === 'inventory') {
      setInventorySheetId(cleanId);
      updateGarageProfile({ googleSheetsInventoryId: cleanId });
    } else {
      setCustomersSheetId(cleanId);
      updateGarageProfile({ googleSheetsCustomersId: cleanId });
    }

    setManualSheetInput('');
    setIsEditingLink(false);
    setErrorMessage(null);
    setSuccessMessage('เชื่อมโยง Google Sheet สำเร็จเรียบร้อยแล้ว!');
    setTimeout(() => setSuccessMessage(null), 4000);
    handleTestConnection(cleanId);
  };

  // 5. Action: Disconnect / Clear sheet link
  const handleDisconnectSheet = () => {
    clearStoredSpreadsheetId(activeSubTab);
    if (activeSubTab === 'inventory') {
      setInventorySheetId(null);
      updateGarageProfile({ googleSheetsInventoryId: '' });
    } else {
      setCustomersSheetId(null);
      updateGarageProfile({ googleSheetsCustomersId: '' });
    }
    setTestResult(null);
    setSuccessMessage('ยกเลิกการเชื่อมโยง Google Sheet เรียบร้อยแล้ว');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 6. Action: Copy All Table Data for Direct Paste into Google Sheets (Ctrl+V)
  const handleCopyForSheets = async () => {
    const success = await copyDataForGoogleSheets(activeHeaders, activeRows);
    if (success) {
      setSuccessMessage(
        `คัดลอกข้อมูลทั้งหมด (${activeRows.length} แถว) ลงคลิปบอร์ดแล้ว! คุณสามารถเปิด Google Sheets แล้วกดปุ่ม Ctrl+V (วาง) ที่ช่อง A1 ได้ทันที`
      );
      setTimeout(() => setSuccessMessage(null), 6000);
    } else {
      setErrorMessage('ไม่สามารถคัดลอกลงคลิปบอร์ดได้ กรุณาลองใช้ปุ่มดาวน์โหลด CSV แทน');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // 7. Action: Download CSV File
  const handleDownloadCsv = () => {
    const filename =
      activeSubTab === 'inventory'
        ? `[อู่สงกรานต์]-สต็อกอะไหล่-${Date.now()}.csv`
        : `[อู่สงกรานต์]-ประวัติลูกค้าและรถยนต์-${Date.now()}.csv`;
    downloadCsvFile(filename, [activeHeaders, ...activeRows]);
    setSuccessMessage(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว! นำเข้า Google Sheets ได้ที่เมนู: ไฟล์ > นำเข้า`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // 8. Action: Push Sync to Live Google Sheets
  const handleSyncNow = async () => {
    const targetId = currentSheetId || TARGET_SPREADSHEET_ID;
    if (!targetId || !isRealGoogleSpreadsheetId(targetId)) {
      setErrorMessage('ยังไม่ได้เชื่อมโยง Google Sheets! กรุณาสร้างชีตหรือระบุลิงก์ก่อนซิงค์');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      if (activeSubTab === 'inventory') {
        await syncInventoryToGoogleSheet(targetId, spareParts);
      } else if (activeSubTab === 'jobs') {
        await syncJobOrdersToGoogleSheet(targetId, jobOrders);
      } else if (activeSubTab === 'customers') {
        await syncCustomersToGoogleSheet(targetId, customers);
      }
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setSuccessMessage('ซิงค์และบันทึกข้อมูลลงใน Google Sheets สำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMessage(null), 4000);
      handleTestConnection(targetId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`เกิดข้อผิดพลาดในการซิงค์: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 9. Action: Sync All Tabs at once
  const handleSyncAllTabs = async () => {
    const targetId = currentSheetId || TARGET_SPREADSHEET_ID;
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await syncAllToGoogleSheet(targetId, {
        parts: spareParts,
        customers: customers,
        jobOrders: jobOrders,
      });
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      if (res.success) {
        setSuccessMessage(`ซิงค์ข้อมูลเรียลไทม์ครบทั้ง 4 แท็บสำเร็จ! (${res.syncedTabs.join(', ')})`);
      } else {
        setErrorMessage(`ข้อผิดพลาดบางส่วน: ${res.errors.join('; ')}`);
      }
      setTimeout(() => setSuccessMessage(null), 6000);
      handleTestConnection(targetId);
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการซิงค์รวม: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyPresetSheetId = () => {
    setInventorySheetId(TARGET_SPREADSHEET_ID);
    setCustomersSheetId(TARGET_SPREADSHEET_ID);
    setJobsSheetId(TARGET_SPREADSHEET_ID);
    setStoredSpreadsheetId('all', TARGET_SPREADSHEET_ID);
    setStoredSpreadsheetId('inventory', TARGET_SPREADSHEET_ID);
    setStoredSpreadsheetId('customers', TARGET_SPREADSHEET_ID);
    setGoogleSheetId(TARGET_SPREADSHEET_ID);
    setSuccessMessage(`กำหนดเป้าหมายเชื่อมโยง Google Sheet ID: ${TARGET_SPREADSHEET_ID} เรียบร้อยแล้ว!`);
    setTimeout(() => setSuccessMessage(null), 4000);
    handleTestConnection(TARGET_SPREADSHEET_ID);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#1A1D21] to-[#121417] border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F9D58] text-white flex items-center justify-center shadow-lg shadow-[#0F9D58]/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>จัดการและเชื่อมต่อ Google Sheets</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0F9D58]/20 text-[#0F9D58] border border-[#0F9D58]/30">
                  REAL-TIME SYNC
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  ID: 1XIH-RiKcciGRgWwNgQQ7ECsqnmMOX5pZNEAheJrtrYA
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                ระบบจัดการสต็อกอะไหล่ ใบสั่งซ่อม และข้อมูลลูกค้า อู่สงกรานต์ (ช่างไมค์ 061-069-2036)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Live Sync Status Banner */}
        <div className="bg-[#0F1113] border-b border-[#2D3135] p-3 sm:px-6 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-gray-300 font-medium">สถานะซิงค์เรียลไทม์:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
              {googleSheetsSyncStatus.autoSync ? '🟢 Auto-Sync เปิดทำงานอยู่' : '⚪ ปิด Auto-Sync'}
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">
              ชีตเป้าหมาย:{' '}
              <strong className="text-orange-400 font-mono">
                {googleSheetsSyncStatus.spreadsheetId.slice(0, 10)}...{googleSheetsSyncStatus.spreadsheetId.slice(-6)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleGoogleSheetAutoSync()}
              className="px-2.5 py-1 rounded-lg bg-[#16191D] border border-[#2D3135] hover:border-gray-500 text-gray-300 text-[11px] font-medium transition-colors"
            >
              {googleSheetsSyncStatus.autoSync ? 'ปิด Auto-Sync' : 'เปิด Auto-Sync'}
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncAllTabs}
              className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ซิงค์ทุกแท็บเดี๋ยวนี้ (Sync All)</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2D3135] bg-[#121417] px-4 sm:px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveSubTab('fetch');
              setShowDataTable(false);
              if (!fetchedSheetData) {
                handleFetchLiveSheet(currentSheetId, selectedFetchTabName);
              }
            }}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'fetch'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
            <span>📥 ดึงข้อมูลใน Google Sheets มาแสดง (Live Data)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40">
              ใหม่
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('inventory');
              setShowDataTable(false);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'inventory'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. สต็อกอะไหล่ ({spareParts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('jobs');
              setShowDataTable(false);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'jobs'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>2. ใบสั่งซ่อมและสถานะ ({jobOrders.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('customers');
              setShowDataTable(false);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'customers'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>3. ลูกค้า & รถยนต์ ({customers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('script');
              setShowDataTable(false);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'script'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>4. โค้ด Apps Script (เชื่อมต่อเรียลไทม์)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Google Account Connection & Diagnostic Status Card */}
          <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0F9D58]" />
                <span className="font-bold text-gray-200">สถานะการเชื่อมต่อบัญชี Google & API</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(currentSheetId)}
                  disabled={isTesting}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#16191D] border border-[#2D3135] hover:border-[#0F9D58] text-gray-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#0F9D58]' : ''}`} />
                  <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบสัญญาณ API'}</span>
                </button>

                {!hasGoogleToken ? (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-gray-100 text-slate-900 flex items-center gap-1.5 transition-all shadow active:scale-95 disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isConnectingGoogle ? 'กำลังเปิดหน้าต่าง...' : 'เชื่อมต่อบัญชี Google'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      clearStoredGoogleToken();
                      setGoogleUserEmail(null);
                      setTestResult(null);
                      setSuccessMessage('ออกจากระบบ Google แล้ว');
                      setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                    className="px-2.5 py-1 text-[10px] rounded-lg bg-[#16191D] hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-[#2D3135] transition-colors"
                  >
                    เปลี่ยนบัญชี
                  </button>
                )}
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  testResult.connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {testResult.connected ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                )}
                <div>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.spreadsheetTitle && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      ชื่อไฟล์สเปรดชีต: &ldquo;{testResult.spreadsheetTitle}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current Connected Sheet Card */}
          {activeSubTab === 'script' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2">
                      <Code className="w-4 h-4 text-orange-400" />
                      <span>Google Apps Script สำหรับเชื่อมต่อสองทางแบบ Real-time</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      สคริปต์นี้จะตรวจจับการแก้ไขใน Google Sheet ID:{' '}
                      <span className="text-orange-400 font-mono font-bold">{TARGET_SPREADSHEET_ID}</span>{' '}
                      ทันที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generateGoogleAppsScriptCode(TARGET_SPREADSHEET_ID));
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 3000);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow text-xs"
                  >
                    {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedScript ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                  </button>
                </div>

                <div className="bg-[#0A0C0E] border border-[#2D3135] rounded-xl p-3.5 overflow-x-auto font-mono text-[11px] text-emerald-400 max-h-72">
                  <pre>{generateGoogleAppsScriptCode(TARGET_SPREADSHEET_ID)}</pre>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 text-xs text-blue-200">
                  <p className="font-bold text-blue-300">📌 วิธีติดตั้งสคริปต์ใน Google Sheets (ไม่เกิน 1 นาที):</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
                    <li>เปิด Google Sheet <strong className="text-white font-mono">{TARGET_SPREADSHEET_ID}</strong></li>
                    <li>ไปที่เมนูด้านบน: <span className="text-orange-300">ส่วนขยาย (Extensions) &gt; Apps Script</span></li>
                    <li>ลบโค้ดเริ่มต้น แล้ววางโค้ดที่คัดลอกจากปุ่มด้านบนลงไป</li>
                    <li>กดไอคอน <strong className="text-white">บันทึก (Save)</strong> (รูปแผ่นดิสก์ หรือ Ctrl+S)</li>
                    <li>คลิกเมนู <strong className="text-white">ทริกเกอร์ (Triggers)</strong> รูปนาฬิกาด้านซ้าย &gt; เพิ่มทริกเกอร์: ฟังก์ชัน <span className="text-orange-300">onSpreadsheetEdit</span>, แหล่งที่มา: <span className="text-orange-300">จากสเปรดชีต</span>, เหตุการณ์: <span className="text-orange-300">เมื่อแก้ไข (On edit)</span></li>
                  </ol>
                </div>
              </div>
            </div>
          ) : activeSubTab === 'fetch' ? (
            <div className="space-y-4">
              {/* Fetch Control Bar */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                        <span>ดึงข้อมูลสดจาก Google Sheets (Live Data Pull & Viewer)</span>
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                        v2.0 LIVE
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      ดึงข้อมูลจริงจากสเปรดชีต ID:{' '}
                      <strong className="text-orange-400 font-mono select-all">{currentSheetId}</strong>{' '}
                      มาแสดงผลบนหน้าจอทันที
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {currentSheetUrl && (
                      <a
                        href={currentSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-[#16191D] hover:bg-[#1E2329] border border-[#2D3135] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>เปิดไฟล์ Sheet จริง</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={isFetchingSheet}
                      onClick={() => handleFetchLiveSheet(currentSheetId, selectedFetchTabName)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSheet ? 'animate-spin' : ''}`} />
                      <span>{isFetchingSheet ? 'กำลังดึงข้อมูลจากชีต...' : '🔄 ดึงข้อมูลสดเดี๋ยวนี้'}</span>
                    </button>
                  </div>
                </div>

                {/* Sheet Tabs selector pills */}
                <div className="pt-3 border-t border-[#2D3135] flex items-center gap-2 flex-wrap">
                  <span className="text-gray-400 text-xs font-medium">เลือกแผ่นงาน (Sheet Tab):</span>
                  {[
                    { id: 'คลังสต็อกอะไหล่', label: '📦 คลังสต็อกอะไหล่' },
                    { id: 'ใบสั่งซ่อมและสถานะ', label: '📋 ใบสั่งซ่อมและสถานะ' },
                    { id: 'ประวัติลูกค้าและรถยนต์', label: '👥 ประวัติลูกค้าและรถยนต์' },
                    { id: 'สรุปภาพรวมและการเงิน', label: '📊 สรุปภาพรวมและการเงิน' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSelectedFetchTabName(tab.id);
                        handleFetchLiveSheet(currentSheetId, tab.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedFetchTabName === tab.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                          : 'bg-[#16191D] text-gray-400 hover:text-gray-200 border border-[#2D3135]'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Import Feedback notice */}
              {importFeedback && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">{importFeedback}</span>
                  </div>
                  <button
                    onClick={() => setImportFeedback(null)}
                    className="text-gray-400 hover:text-white text-xs underline"
                  >
                    ปิด
                  </button>
                </div>
              )}

              {/* Fetched Data Summary & Actions */}
              {fetchedSheetData && (
                <div className="p-4 rounded-xl bg-[#16191D] border border-[#2D3135] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>พบข้อมูล: {fetchedSheetData.totalRows} แถว</span>
                      </span>

                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-300 font-mono">
                        {fetchedSheetData.headers.length} คอลัมน์
                      </span>

                      <span className="text-xs text-gray-400">
                        ดึงเมื่อ: <strong className="text-gray-200 font-mono">{fetchedSheetData.fetchedAt}</strong>
                      </span>

                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {fetchedSheetData.source === 'google_api' ? '⚡ Google Sheets API v4' : '🌐 Web Stream'}
                      </span>
                    </div>

                    {/* Import into App Button */}
                    {(selectedFetchTabName.includes('สต็อก') || selectedFetchTabName.includes('ลูกค้า')) && (
                      <button
                        type="button"
                        onClick={handleImportFetchedData}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                      >
                        <FolderDown className="w-4 h-4" />
                        <span>
                          {selectedFetchTabName.includes('สต็อก')
                            ? `📥 นำเข้าสต็อกอะไหล่ (${fetchedSheetData.totalRows} รายการ)`
                            : `📥 นำเข้าข้อมูลลูกค้า (${fetchedSheetData.totalRows} ราย)`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Live Search in Fetched Rows */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchFetchTerm}
                      onChange={(e) => setSearchFetchTerm(e.target.value)}
                      placeholder={`ค้นหาข้อความในตาราง Google Sheets (${selectedFetchTabName})...`}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Rendered Live Table from Google Sheets */}
                  <div className="border border-[#2D3135] rounded-xl overflow-hidden bg-[#0A0C0E]">
                    <div className="overflow-x-auto max-h-[460px]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-[#161A1F] border-b-2 border-emerald-500/40 shadow-sm">
                            <th className="p-3 text-gray-300 font-mono text-xs w-12 text-center bg-[#161A1F] font-bold">#</th>
                            {fetchedSheetData.headers.map((h, i) => (
                              <th key={i} className="p-3 text-white font-bold whitespace-nowrap bg-[#161A1F] text-xs uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#22272E]">
                          {fetchedSheetData.rows
                            .filter((r) =>
                              !searchFetchTerm.trim() ||
                              r.some((cell) =>
                                String(cell || '').toLowerCase().includes(searchFetchTerm.toLowerCase())
                              )
                            )
                            .map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#1C222A] transition-colors even:bg-[#0E1114] odd:bg-[#121519]">
                                <td className="p-3 text-gray-300 font-mono text-xs font-bold text-center bg-[#0F1113]/70">
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-3 text-gray-100 whitespace-nowrap text-sm font-medium">
                                    {String(cell || '-')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* If not fetched yet and not loading */}
              {!fetchedSheetData && !isFetchingSheet && (
                <div className="p-8 rounded-xl bg-[#0F1113] border border-dashed border-[#2D3135] text-center space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto opacity-75" />
                  <div className="space-y-1">
                    <p className="font-bold text-gray-200 text-sm">พร้อมดึงข้อมูลจาก Google Sheets</p>
                    <p className="text-gray-400 text-xs max-w-md mx-auto">
                      คลิกปุ่มด้านล่างเพื่อดึงข้อมูลสดจากแผ่นงาน &ldquo;{selectedFetchTabName}&rdquo; ใน Google Sheet ของคุณมาแสดงผล
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchLiveSheet(currentSheetId, selectedFetchTabName)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    <span>ดึงข้อมูลแผ่นงาน &ldquo;{selectedFetchTabName}&rdquo; ตอนนี้</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
          <div className="p-4 sm:p-5 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isSheetValid ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                  }`}
                ></span>
                <span className="font-bold text-gray-200 text-sm">
                  {activeSubTab === 'inventory'
                    ? 'ตารางสต็อกอะไหล่ (Inventory Sheet)'
                    : activeSubTab === 'jobs'
                    ? 'ตารางใบสั่งซ่อมและสถานะงาน (Job Orders Sheet)'
                    : 'ตารางข้อมูลลูกค้า & รถยนต์ (CRM Sheet)'}
                </span>
                {isSheetValid ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-bold">
                    เชื่อมต่ออยู่
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                    ยังไม่เชื่อมต่อชีต
                  </span>
                )}
              </div>

              {lastSyncTime && (
                <span className="text-[11px] text-gray-400">
                  ซิงค์ล่าสุด: <strong className="text-gray-200 font-mono">{lastSyncTime}</strong>
                </span>
              )}
            </div>

            {/* Condition: Sheet is connected and valid */}
            {isSheetValid && currentSheetUrl ? (
              <div className="p-4 rounded-xl bg-[#16191D] border border-[#2D3135] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400">Google Spreadsheet ID ที่เชื่อมโยง:</p>
                    <p className="text-xs font-mono font-bold text-orange-400 truncate mt-0.5 select-all">
                      {currentSheetId}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={currentSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#0F9D58] hover:bg-[#0c8047] text-white font-bold flex items-center gap-1.5 shadow-md shadow-[#0F9D58]/20 transition-all active:scale-95"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>เปิด Google Sheets บน Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsEditingLink(!isEditingLink)}
                      className="px-3 py-2 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-[#2D3135] text-gray-300 transition-colors"
                    >
                      แก้ไขลิงก์
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectSheet}
                      title="ยกเลิกการเชื่อมต่อชีตนี้"
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isEditingLink && (
                  <div className="pt-3 border-t border-[#2D3135] flex items-center gap-2">
                    <input
                      type="text"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                      placeholder="วาง URL หรือ Spreadsheet ID ใหม่ที่ต้องการเปลี่ยน..."
                      className="flex-1 px-3 py-2 rounded-lg bg-[#0F1113] border border-[#2D3135] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveManualSheet}
                      className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold whitespace-nowrap"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingLink(false)}
                      className="px-3 py-2 rounded-lg bg-[#1C2025] text-gray-400"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Condition: No sheet connected yet */
              <div className="p-4 sm:p-5 rounded-xl bg-[#16191D] border border-dashed border-[#2D3135] space-y-4">
                <div className="text-center space-y-1.5">
                  <p className="text-gray-200 font-bold text-sm">
                    เริ่มต้นใช้งาน Google Sheets สำหรับ
                    {activeSubTab === 'inventory' ? 'สต็อกอะไหล่' : 'ข้อมูลลูกค้า'}
                  </p>
                  <p className="text-gray-400 text-xs max-w-xl mx-auto">
                    คลิกปุ่มด้านล่างเพื่อสร้าง Google Sheet อัตโนมัติลงในบัญชี Google Drive ของคุณ
                    หรือวางลิงก์ของไฟล์สเปรดชีตที่คุณสร้างไว้แล้ว
                  </p>
                </div>

                {/* Primary Action: Auto create spreadsheet via API */}
                <div className="flex justify-center flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleCreateSheetViaApi}
                    disabled={isCreatingViaApi}
                    className="px-5 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0c8047] text-white font-bold flex items-center gap-2 shadow-lg shadow-[#0F9D58]/20 transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isCreatingViaApi
                        ? 'กำลังสร้างและเขียนตารางลง Google Drive...'
                        : 'สร้าง Google Sheet ใหม่อัตโนมัติ'}
                    </span>
                  </button>
                </div>

                {/* Paste Link Form */}
                <div className="pt-3 border-t border-[#2D3135]/80 space-y-2">
                  <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                    <span>หรือ วางลิงก์ Google Sheets (หรือระบุ Spreadsheet ID) ที่คุณมีอยู่แล้ว:</span>
                  </label>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                      placeholder="เช่น https://docs.google.com/spreadsheets/d/1w3q9z.../edit"
                      className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-lg bg-[#0F1113] border border-[#2D3135] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#0F9D58]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveManualSheet}
                      className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold whitespace-nowrap active:scale-95 transition-all shadow-md shadow-orange-500/20"
                    >
                      บันทึกและเชื่อมต่อ
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    💡 เคล็ดลับ: สามารถวางลิงก์ทั้ง URL จากเบราว์เซอร์ได้เลย ระบบจะแยก Spreadsheet ID
                    ให้อัตโนมัติ
                  </p>
                </div>
              </div>
            )}
          </div>
          )}

          {activeSubTab !== 'script' && activeSubTab !== 'fetch' && (
            <>
              {/* Quick Data Operations: Copy, Download, Sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tool 1: Pull Live Data from Google Sheets */}
            <div className="p-3.5 rounded-xl bg-[#0F1113] border border-emerald-500/30 flex flex-col justify-between space-y-3 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  <span>ดึงข้อมูลชีตมาแสดง (Pull)</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  ดึงข้อมูลล่าสุดจริงจาก Google Sheets มาดูตารางและนำเข้าสู่ระบบ
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetTabName =
                    activeSubTab === 'inventory'
                      ? 'คลังสต็อกอะไหล่'
                      : activeSubTab === 'jobs'
                      ? 'ใบสั่งซ่อมและสถานะ'
                      : 'ประวัติลูกค้าและรถยนต์';
                  setSelectedFetchTabName(targetTabName);
                  setActiveSubTab('fetch');
                  handleFetchLiveSheet(currentSheetId, targetTabName);
                }}
                className="w-full py-2 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs shadow-sm"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>เปิดดูข้อมูลชีตสด</span>
              </button>
            </div>

            {/* Tool 2: Synchronize Live (Push) */}
            <div className="p-3.5 rounded-xl bg-[#0F1113] border border-[#2D3135] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold">
                  <RefreshCw className="w-4 h-4 text-orange-400" />
                  <span>ซิงค์ข้อมูล (Push Sync)</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  ส่งข้อมูลล่าสุดในอู่ไปยัง Google Sheets ที่เชื่อมโยงไว้ในทันที
                </p>
              </div>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncNow}
                className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-orange-500/30 text-orange-400 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
              </button>
            </div>

            {/* Tool 3: Copy All Data to Clipboard */}
            <div className="p-3.5 rounded-xl bg-[#0F1113] border border-[#2D3135] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>คัดลอกตาราง</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  คัดลอกตาราง ({activeRows.length} แถว) เพื่อนำไปกด Ctrl+V วางใน Google Sheets
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyForSheets}
                className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกข้อมูลทั้งหมด</span>
              </button>
            </div>

            {/* Tool 4: Download CSV */}
            <div className="p-3.5 rounded-xl bg-[#0F1113] border border-[#2D3135] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>ดาวน์โหลด CSV</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  ส่งออกไฟล์ .CSV รองรับภาษาไทยสมบูรณ์ เปิดใน Excel
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-sky-500/30 text-sky-400 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด .CSV</span>
              </button>
            </div>
          </div>

          {/* Interactive In-App Data Table Toggle */}
          <div className="border border-[#2D3135] rounded-xl overflow-hidden bg-[#0F1113]">
            <div className="p-3.5 bg-[#16191D] border-b border-[#2D3135] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDataTable(!showDataTable)}
                className="flex items-center gap-2 text-white font-bold hover:text-orange-400 transition-colors"
              >
                <Table className="w-4 h-4 text-orange-400" />
                <span>
                  {showDataTable ? 'ซ่อนตารางข้อมูลในระบบ' : 'ดูตัวอย่างตารางข้อมูลในระบบ (In-App Table)'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2D3135] text-gray-300">
                  {activeRows.length} รายการ
                </span>
              </button>

              {showDataTable && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาข้อมูลในตาราง..."
                    className="pl-8 pr-3 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}
            </div>

            {showDataTable && (
              <div className="overflow-x-auto max-h-60 p-2">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#2D3135] bg-[#121417]">
                      {activeHeaders.map((head, idx) => (
                        <th key={idx} className="p-2 text-gray-400 font-bold whitespace-nowrap">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2327]">
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#16191D]/80">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 text-gray-300 whitespace-nowrap">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={activeHeaders.length} className="p-4 text-center text-gray-500">
                          ไม่พบข้อมูลที่ตรงกับคำค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
          )}

          {/* Quick Guide */}
          <div className="p-3.5 rounded-xl bg-[#0F9D58]/10 border border-[#0F9D58]/25 text-[11px] text-gray-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#0F9D58]">
              <ShieldCheck className="w-4 h-4" />
              <span>คำแนะนำการเชื่อมต่อ Google Sheets แบบ Real-time:</span>
            </div>
            <p>
              1. ระบบผูกเชื่อมโยงเป้าหมายกับ <strong>Google Sheet ID: 1XIH-RiKcciGRgWwNgQQ7ECsqnmMOX5pZNEAheJrtrYA</strong> เรียบร้อยแล้ว
            </p>
            <p>
              2. เมื่อเปิดระบบ <strong>Auto-Sync</strong> ไว้ ทุกครั้งที่มีการบันทึกหรือแก้ไขอะไหล่/ลูกค้า/ใบสั่งซ่อม ระบบจะซิงค์ข้อมูลขึ้น Google Sheets อัตโนมัติในเบื้องหลัง
            </p>
            <p>
              3. ไปที่แท็บ <strong>&ldquo;4. โค้ด Apps Script&rdquo;</strong> เพื่อคัดลอกโค้ดไปวางใน Google Sheet ให้สามารถอัปเดตข้อมูลกลับมายังระบบได้แบบ Real-time สองทาง
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121417] border-t border-[#2D3135] flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            อู่สงกรานต์ (ช่างไมค์ 061-069-2036) • Google Sheets Online Integration
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-orange-500/20"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

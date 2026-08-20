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
  Database
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import {
  createInventorySpreadsheet,
  createCustomersSpreadsheet,
  syncInventoryToGoogleSheet,
  syncCustomersToGoogleSheet,
  getStoredSpreadsheetId,
  downloadCsvFile,
  requestGoogleOAuthToken
} from '../services/googleSheetsService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTab?: 'inventory' | 'customers' | 'all';
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  targetTab = 'all',
}) => {
  const { spareParts, customers, garageProfile, updateGarageProfile } = useGarage();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'customers'>(
    targetTab === 'customers' ? 'customers' : 'inventory'
  );

  const [inventorySheetId, setInventorySheetId] = useState<string | null>(() =>
    getStoredSpreadsheetId('inventory')
  );
  const [customersSheetId, setCustomersSheetId] = useState<string | null>(() =>
    getStoredSpreadsheetId('customers')
  );

  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    new Date().toLocaleTimeString('th-TH')
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setInventorySheetId(getStoredSpreadsheetId('inventory'));
    setCustomersSheetId(getStoredSpreadsheetId('customers'));
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Create Spreadsheet for Inventory
  const handleCreateInventorySheet = async () => {
    setIsCreating(true);
    try {
      await requestGoogleOAuthToken();
      const res = await createInventorySpreadsheet(garageProfile.name, spareParts);
      setInventorySheetId(res.spreadsheetId);
      updateGarageProfile({ googleSheetsInventoryId: res.spreadsheetId });
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setSuccessMessage('สร้าง Google Sheet สต็อกอะไหล่สำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSuccessMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets: ' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Create Spreadsheet for Customers
  const handleCreateCustomersSheet = async () => {
    setIsCreating(true);
    try {
      await requestGoogleOAuthToken();
      const res = await createCustomersSpreadsheet(garageProfile.name, customers);
      setCustomersSheetId(res.spreadsheetId);
      updateGarageProfile({ googleSheetsCustomersId: res.spreadsheetId });
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setSuccessMessage('สร้าง Google Sheet ประวัติลูกค้า & รถยนต์สำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSuccessMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets: ' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Push Sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      if (activeSubTab === 'inventory') {
        const id = inventorySheetId || getStoredSpreadsheetId('inventory');
        if (id) {
          await syncInventoryToGoogleSheet(id, spareParts);
        } else {
          await handleCreateInventorySheet();
        }
      } else {
        const id = customersSheetId || getStoredSpreadsheetId('customers');
        if (id) {
          await syncCustomersToGoogleSheet(id, customers);
        } else {
          await handleCreateCustomersSheet();
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setSuccessMessage('ซิงค์ข้อมูลเรียลไทม์กับ Google Sheets ล่าสุดสำเร็จแล้ว!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Download CSV
  const handleDownloadCsv = () => {
    if (activeSubTab === 'inventory') {
      const headers = [
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
        'ผู้จำหน่าย'
      ];
      const rows = spareParts.map((p) => [
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
        p.locationRack || '',
        p.supplier || ''
      ]);
      downloadCsvFile(`Songkarn-Auto-Inventory-${Date.now()}.csv`, [headers, ...rows]);
    } else {
      const headers = [
        'รหัสลูกค้า',
        'ชื่อลูกค้า',
        'เบอร์โทรศัพท์',
        'LINE ID',
        'อีเมล',
        'ที่อยู่',
        'ทะเบียนรถ',
        'ยี่ห้อ/รุ่น',
        'เลขไมล์ล่าสุด',
        'ยอดใช้จ่ายรวม (บาท)',
        'จำนวนครั้งที่เข้าใช้'
      ];
      const rows: any[][] = [];
      customers.forEach((c) => {
        const v = c.vehicles[0];
        rows.push([
          c.id,
          c.name,
          c.phone,
          c.lineId || '',
          c.email || '',
          c.address || '',
          v ? v.licensePlate : '-',
          v ? `${v.brand} ${v.model}` : '-',
          v ? v.lastMileage : 0,
          c.totalSpent,
          c.totalVisits
        ]);
      });
      downloadCsvFile(`Songkarn-Auto-Customers-${Date.now()}.csv`, [headers, ...rows]);
    }
  };

  const currentSheetId = activeSubTab === 'inventory' ? inventorySheetId : customersSheetId;
  const currentSheetUrl = currentSheetId
    ? `https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#1A1D21] to-[#121417] border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F9D58] text-white flex items-center justify-center shadow-lg shadow-[#0F9D58]/20">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>เชื่อมต่อและบันทึกข้อมูล Google Sheets</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0F9D58]/20 text-[#0F9D58] border border-[#0F9D58]/30">
                  REAL-TIME SYNC
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                ระบบจัดการสต็อกอะไหล่และประวัติลูกค้าอู่สงกรานต์ บันทึกลง Google Sheets แบบเรียลไทม์
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

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2D3135] bg-[#121417] px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === 'inventory'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. สต็อกอะไหล่ (Inventory Stock) ({spareParts.length} รายการ)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('customers')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === 'customers'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>2. ประวัติลูกค้า & ข้อมูลรถยนต์ ({customers.length} ราย)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          
          {successMessage && (
            <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Connected Sheet Status Card */}
          <div className="p-5 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-bold text-gray-200 text-sm">
                  {activeSubTab === 'inventory' ? 'ตารางสต็อกอะไหล่ (Auto Parts Sheet)' : 'ตารางประวัติลูกค้า & ข้อมูลรถยนต์ (CRM Sheet)'}
                </span>
              </div>

              {lastSyncTime && (
                <span className="text-[11px] text-gray-400">
                  ซิงค์ล่าสุด: <strong className="text-gray-200 font-mono">{lastSyncTime}</strong>
                </span>
              )}
            </div>

            {currentSheetId ? (
              <div className="p-3.5 rounded-lg bg-[#16191D] border border-[#2D3135] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[11px] text-gray-400">Spreadsheet ID ที่เชื่อมต่อ:</p>
                  <p className="text-xs font-mono font-bold text-orange-400 mt-0.5">{currentSheetId}</p>
                </div>

                <a
                  href={currentSheetUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-[#0F9D58] hover:bg-[#0c8047] text-white font-bold flex items-center gap-1.5 shadow-md shadow-[#0F9D58]/20 transition-all active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>เปิด Google Sheets บน Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#16191D] border border-dashed border-[#2D3135] text-center space-y-3">
                <p className="text-gray-400">
                  ยังไม่ได้สร้างสเปรดชีตบน Google Sheets สำหรับส่วนนี้ คุณสามารถคลิกปุ่มด้านล่างเพื่อสร้างไฟล์ Google Sheet ใหม่และซิงค์ข้อมูลได้ทันที
                </p>

                <button
                  type="button"
                  disabled={isCreating}
                  onClick={activeSubTab === 'inventory' ? handleCreateInventorySheet : handleCreateCustomersSheet}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 mx-auto shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                >
                  {isCreating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>
                    {activeSubTab === 'inventory'
                      ? 'สร้าง Google Sheet สต็อกอะไหล่ทันที'
                      : 'สร้าง Google Sheet ประวัติลูกค้าทันที'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Controls & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Action 1: Real-time Synchronize */}
            <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                <span>ซิงค์ข้อมูลล่าสุด (Push & Update)</span>
              </div>
              <p className="text-[11px] text-gray-400">
                ส่งข้อมูลอะไหล่/ลูกค้าในระบบปัจจุบัน ไปบันทึกลงใน Google Sheets แถวตารางทันที
              </p>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncNow}
                className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-[#2D3135] text-gray-200 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-400' : ''}`} />
                <span>{isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
              </button>
            </div>

            {/* Action 2: Export CSV */}
            <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Download className="w-4 h-4 text-sky-400" />
                <span>ดาวน์โหลดไฟล์ CSV (Excel / Sheet)</span>
              </div>
              <p className="text-[11px] text-gray-400">
                ส่งออกข้อมูลเป็นไฟล์ .CSV สำหรับเปิดใน Microsoft Excel หรือนำไปประมวลผลต่อ
              </p>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full py-2 px-3 rounded-lg bg-[#1C2025] hover:bg-[#282E35] border border-[#2D3135] text-sky-400 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด CSV ทันที</span>
              </button>
            </div>

          </div>

          {/* Real-time Feature Guarantee */}
          <div className="p-3.5 rounded-xl bg-[#0F9D58]/10 border border-[#0F9D58]/25 text-[11px] text-[#0F9D58] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 text-[#0F9D58]" />
            <div>
              <p className="font-bold">ระบบบันทึกคลังสองทางแบบเรียลไทม์ (Auto Real-time Sync Active)</p>
              <p className="text-gray-300 mt-0.5">
                เมื่อมีการเพิ่มอะไหล่ใหม่, ตัดสต็อกจากการซ่อม, เติมสต็อก หรือเพิ่มประวัติลูกค้า ระบบจะบันทึกข้อมูลเข้า Google Sheets และระบบคลังอัตโนมัติ
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121417] border-t border-[#2D3135] flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            อู่สงกรานต์ (ช่างไมค์ 061-069-2036) • Google Sheets & Drive API v4
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-orange-500/20"
          >
            เสร็จสิ้น (Done)
          </button>
        </div>

      </div>
    </div>
  );
};

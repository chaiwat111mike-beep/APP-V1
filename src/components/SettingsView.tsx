import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Database,
  Cloud,
  Save,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  History,
  ExternalLink,
  Users,
  Wrench,
  Plus,
  Trash2,
  DollarSign,
  Download,
  Upload,
  FileDown,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { GarageProfile, LaborServiceItem } from '../types';
import { initialStandardLaborPresets } from '../data/initialData';
import { GarageLogo } from './GarageLogo';
import { PromptPayQRCard } from './PromptPayQRCard';
import { MechanicManagerModal } from './MechanicManagerModal';
import { downloadCsvFile } from '../services/googleSheetsService';

export const SettingsView: React.FC = () => {
  const {
    garageProfile,
    updateGarageProfile,
    syncStatus,
    isOnline,
    mechanics,
    jobOrders,
    spareParts,
    customers,
    exportDatabaseJson,
    importDatabaseJson,
    resetToDefaultData
  } = useGarage();
  const [isMechanicModalOpen, setIsMechanicModalOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const [formData, setFormData] = useState<GarageProfile>({
    name: garageProfile.name || 'อู่สงกรานต์ ออโต้เซอร์วิส',
    phone: garageProfile.phone || '061-069-2036',
    email: garageProfile.email || '',
    address: garageProfile.address || '',
    taxId: garageProfile.taxId || '',
    vatPercent: garageProfile.vatPercent ?? 7,
    promptPayId: garageProfile.promptPayId || '061-069-2036',
    bankAccountName: garageProfile.bankAccountName || 'สงกรานต์ ออโต้เซอร์วิส',
    bankAccountNumber: garageProfile.bankAccountNumber || '',
    warrantyTerms: garageProfile.warrantyTerms || 'รับประกันงานซ่อมและอะไหล่แท้ 3 เดือน หรือ 5,000 กิโลเมตร',
    defaultLaborFee: garageProfile.defaultLaborFee ?? 400,
    standardLaborPresets: garageProfile.standardLaborPresets && garageProfile.standardLaborPresets.length > 0 
      ? garageProfile.standardLaborPresets 
      : initialStandardLaborPresets,
    ...garageProfile,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [presetList, setPresetList] = useState<LaborServiceItem[]>(
    garageProfile.standardLaborPresets && garageProfile.standardLaborPresets.length > 0
      ? garageProfile.standardLaborPresets
      : initialStandardLaborPresets
  );
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetFee, setNewPresetFee] = useState<string>('');

  // Keep in sync if profile updates
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...garageProfile,
      name: garageProfile.name || '',
      phone: garageProfile.phone || '',
      email: garageProfile.email || '',
      address: garageProfile.address || '',
      taxId: garageProfile.taxId || '',
      vatPercent: garageProfile.vatPercent ?? 7,
      promptPayId: garageProfile.promptPayId || '',
      bankAccountName: garageProfile.bankAccountName || '',
      bankAccountNumber: garageProfile.bankAccountNumber || '',
      warrantyTerms: garageProfile.warrantyTerms || '',
      defaultLaborFee: garageProfile.defaultLaborFee ?? 400,
      standardLaborPresets: garageProfile.standardLaborPresets && garageProfile.standardLaborPresets.length > 0
        ? garageProfile.standardLaborPresets
        : initialStandardLaborPresets,
    }));
    if (garageProfile.standardLaborPresets && garageProfile.standardLaborPresets.length > 0) {
      setPresetList(garageProfile.standardLaborPresets);
    }
  }, [garageProfile]);

  const handleAddPreset = () => {
    if (!newPresetTitle.trim()) return;
    const item: LaborServiceItem = {
      id: `labor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newPresetTitle.trim(),
      fee: Math.max(0, Number(newPresetFee) || 0),
    };
    const updated = [...presetList, item];
    setPresetList(updated);
    setFormData((prev) => ({ ...prev, standardLaborPresets: updated }));
    updateGarageProfile({
      ...formData,
      standardLaborPresets: updated,
    });
    setNewPresetTitle('');
    setNewPresetFee('');
  };

  const handleDeletePreset = (id: string) => {
    const updated = presetList.filter((p) => p.id !== id);
    setPresetList(updated);
    setFormData((prev) => ({ ...prev, standardLaborPresets: updated }));
    updateGarageProfile({
      ...formData,
      standardLaborPresets: updated,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGarageProfile({
      ...formData,
      standardLaborPresets: presetList,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportJson = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `[อู่สงกรานต์]-สำรองข้อมูลระบบ-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMessage({ text: '📥 ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', type: 'success' });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importDatabaseJson(content);
        if (success) {
          setBackupMessage({ text: '✅ กู้คืนข้อมูลจากไฟล์ JSON สำเร็จเรียบร้อย!', type: 'success' });
        } else {
          setBackupMessage({ text: '❌ ไม่สามารถกู้คืนข้อมูลได้ รูปแบบไฟล์ไม่ถูกต้อง', type: 'error' });
        }
      } catch {
        setBackupMessage({ text: '❌ เกิดข้อผิดพลาดในการอ่านไฟล์', type: 'error' });
      }
      setTimeout(() => setBackupMessage(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJobsExcel = () => {
    const headers = [
      'เลขที่ใบงาน',
      'วันที่เปิดใบงาน',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'ทะเบียนรถ',
      'ยี่ห้อ/รุ่น',
      'เลขไมล์ (กม.)',
      'อาการที่แจ้งซ่อม',
      'สถานะใบงาน',
      'ช่างผู้ดูแล',
      'ช่องซ่อม',
      'ค่าอะไหล่ (บาท)',
      'ค่าแรง (บาท)',
      'ส่วนลด (บาท)',
      'ภาษี VAT (บาท)',
      'ยอดสุทธิทั้งสิ้น (บาท)',
      'สถานะการชำระเงิน',
    ];
    const rows = (jobOrders || []).map((j) => [
      j.jobNo,
      j.createdAt?.slice(0, 10) || '',
      j.customerName,
      j.customerPhone,
      j.licensePlate,
      `${j.carBrand} ${j.carModel}`,
      j.mileage,
      j.issueDescription,
      j.status,
      j.mechanicName || '-',
      j.bayNumber ? `ช่อง ${j.bayNumber}` : '-',
      (j.partsUsed || []).reduce((acc, p) => acc + (p.totalPrice || 0), 0),
      j.laborFee || 0,
      j.discount || 0,
      ((j.totalAmount || 0) * (j.vatPercent || 0)) / 100,
      j.totalAmount || 0,
      j.paymentStatus === 'paid' ? 'ชำระแล้ว' : j.paymentStatus === 'deposit' ? 'มัดจำแล้ว' : 'รอชำระ',
    ]);
    downloadCsvFile(`[อู่สงกรานต์]-ตารางใบสั่งซ่อมทั้งหมด-${new Date().toISOString().slice(0, 10)}.csv`, [
      headers,
      ...rows,
    ]);
    setBackupMessage({ text: '📊 ส่งออกไฟล์ Excel ตารางใบสั่งซ่อมเรียบร้อยแล้ว', type: 'success' });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleExportPartsExcel = () => {
    const headers = [
      'รหัสอะไหล่',
      'ชื่อรายการอะไหล่',
      'หมวดหมู่',
      'ยี่ห้อ/แบรนด์',
      'รุ่นรถที่รองรับ',
      'หน่วยนับ',
      'จำนวนคงเหลือ',
      'จุดสั่งซื้อขั้นต่ำ',
      'ราคาทุน (บาท)',
      'ราคาขาย (บาท)',
      'ตำแหน่งจัดเก็บ',
    ];
    const rows = (spareParts || []).map((p) => [
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
    ]);
    downloadCsvFile(`[อู่สงกรานต์]-ตารางสต็อกอะไหล่-${new Date().toISOString().slice(0, 10)}.csv`, [
      headers,
      ...rows,
    ]);
    setBackupMessage({ text: '📦 ส่งออกไฟล์ Excel สต็อกอะไหล่เรียบร้อยแล้ว', type: 'success' });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleExportCustomersExcel = () => {
    const headers = [
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'LINE ID',
      'ที่อยู่',
      'จำนวนรถยนต์ที่บันทึก',
      'ทะเบียนรถยนต์',
      'ยอดใช้จ่ายสะสม (บาท)',
      'จำนวนครั้งที่เข้าซ่อม',
    ];
    const rows = (customers || []).map((c) => [
      c.name,
      c.phone,
      c.lineId || '-',
      c.address || '-',
      c.vehicles?.length || 0,
      (c.vehicles || []).map((v) => `${v.licensePlate} (${v.brand} ${v.model})`).join(' | '),
      c.totalSpent || 0,
      c.totalVisits || 0,
    ]);
    downloadCsvFile(`[อู่สงกรานต์]-ตารางลูกค้าและรถยนต์-${new Date().toISOString().slice(0, 10)}.csv`, [
      headers,
      ...rows,
    ]);
    setBackupMessage({ text: '👥 ส่งออกไฟล์ Excel รายชื่อลูกค้าและรถยนต์เรียบร้อยแล้ว', type: 'success' });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  const handleResetConfirmed = () => {
    resetToDefaultData();
    setIsConfirmingReset(false);
    setBackupMessage({ text: '🔄 รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว', type: 'success' });
    setTimeout(() => setBackupMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16191D] border border-[#2D3135] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-orange-500" />
            <span>ตั้งค่าระบบอู่ซ่อมรถ (Garage Configuration)</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            ข้อมูลกิจการสำหรับหัวบิล ใบสั่งซ่อม ใบเสนอราคา และบัญชีรับเงินพร้อมเพย์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 ${
            syncStatus === 'synced' || syncStatus === 'offline_synced'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          }`}>
            <Database className="w-3.5 h-3.5" />
            <span>สถานะระบบ: {syncStatus === 'offline_synced' ? 'Local-First DB ทำงานสมบูรณ์' : 'Firebase Sync Real-time'}</span>
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <span>บันทึกการตั้งค่าอู่ซ่อมรถเรียบร้อยแล้ว ข้อมูลจะปรากฏบนหัวเอกสารพิมพ์และใบเสร็จทุกใบ</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Business Profile & Logo Banner */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>1. โลโก้ & ข้อมูลอู่ซ่อมรถ (หัวเอกสาร)</span>
            </h2>
            <span className="text-[11px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
              โลโก้ทางการใช้งานอยู่
            </span>
          </div>

          {/* Current Logo Banner Showcase */}
          <div className="rounded-xl overflow-hidden border border-yellow-500/30 bg-[#0F1113] p-1">
            <GarageLogo variant="banner" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-semibold mb-1">ชื่ออู่ซ่อมรถ / ชื่อกิจการ *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="text"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">อีเมลกิจการ</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-semibold mb-1">ที่อยู่อู่ซ่อมรถ</label>
              <textarea
                rows={2}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">อัตราภาษีมูลค่าเพิ่ม VAT (%)</label>
              <input
                type="number"
                value={formData.vatPercent ?? 7}
                onChange={(e) => setFormData({ ...formData, vatPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: PromptPay & Bank Details */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span>2. บัญชีรับเงิน & พร้อมเพย์ QR Code</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">เบอร์ / เลขพร้อมเพย์ (PromptPay)</label>
              <input
                type="text"
                value={formData.promptPayId || ''}
                onChange={(e) => setFormData({ ...formData, promptPayId: e.target.value })}
                placeholder="เช่น 0610692036"
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">รองรับเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก</span>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">ชื่อบัญชีธนาคาร</label>
              <input
                type="text"
                value={formData.bankAccountName || ''}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เลขที่บัญชี / ธนาคาร</label>
              <input
                type="text"
                value={formData.bankAccountNumber || ''}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="pt-3 border-t border-[#2D3135] flex flex-col md:flex-row items-center gap-6 bg-[#0F1113] p-4 rounded-xl">
            <div className="w-full max-w-[280px]">
              <PromptPayQRCard
                promptPayId={formData.promptPayId || '0610692036'}
                accountName={formData.bankAccountName || formData.name}
                bankName={formData.bankName}
                bankAccountNumber={formData.bankAccountNumber}
                shopName={formData.name}
                showActions={false}
              />
            </div>
            <div className="flex-1 space-y-2 text-xs text-gray-300">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>QR Code พร้อมเพย์มาตรฐาน ธปท. (EMVCo) ถูกต้อง 100%</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                ระบบสร้าง QR Code พร้อมคำนวณรหัส CRC16-XMODEM ตามมาตรฐานของธนาคารแห่งประเทศไทย (BOT) และ National ITMX สามารถใช้แอปธนาคารทุกแห่งในประเทศไทย (K PLUS, SCB EASY, Krungthai NEXT, Bualuang, ttb, ออมสิน ฯลฯ) สแกนจ่ายได้จริง
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-lg transition-all shadow-md shadow-orange-500/20"
                >
                  บันทึกข้อมูลพร้อมเพย์
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Terms & Warranty */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>3. เงื่อนไขการรับประกันงานซ่อม (ท้ายใบเสร็จ)</span>
          </h2>

          <div className="text-xs">
            <textarea
              rows={2}
              value={formData.warrantyTerms || ''}
              onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
              className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Section 4: Standard Labor & Service Fees */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2D3135]">
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>4. กำหนดรายการค่าแรงและค่าบริการมาตรฐานประจำอู่ (Custom Labor & Services)</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              เจ้าของอู่กำหนดรายการและราคาเองได้อิสระ เพื่อใช้เรียกใช้รวดเร็วตอนเปิดใบสั่งซ่อม
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                ค่าแรงเริ่มต้นเมื่อเปิดใบสั่งซ่อม (บาท):
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultLaborFee ?? 400}
                onChange={(e) => setFormData({ ...formData, defaultLaborFee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-white font-mono focus:outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                กำหนดเป็น 0 ได้หากต้องการให้เริ่มต้นเป็นฟรีค่าแรง
              </p>
            </div>
          </div>

          {/* Preset Services List */}
          <div className="space-y-3 pt-2">
            <label className="block text-gray-200 font-bold text-xs">
              รายการค่าบริการสำเร็จรูปของอู่ ({presetList.length} รายการ):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presetList.map((preset, pIdx) => (
                <div
                  key={preset.id || pIdx}
                  className="flex items-center justify-between p-3 bg-[#0F1113] border border-[#2D3135] hover:border-orange-500/40 rounded-xl text-xs transition-all"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-semibold text-white block truncate">{preset.title}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">฿{Number(preset.fee || 0).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Preset Row */}
            <div className="p-3 bg-[#0F1113] border border-orange-500/30 rounded-xl space-y-2">
              <span className="text-[11px] text-orange-400 font-bold block">
                + เพิ่มรายการค่าบริการมาตรฐานใหม่:
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="ชื่อบริการ/ค่าแรง เช่น เปลี่ยนถ่ายน้ำมันเกียร์, ล้างปีกผีเสื้อ, ซ่อมไดสตาร์ท..."
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="ราคา (บาท)"
                    value={newPresetFee}
                    onChange={(e) => setNewPresetFee(e.target.value)}
                    className="w-28 px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md shadow-orange-500/20"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>บันทึกการตั้งค่าทั้งหมด</span>
          </button>
        </div>

      </form>

      {/* Staff & Mechanics Management Section */}
      <div className="bg-[#16191D] border border-orange-500/30 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>จัดการทีมช่างซ่อมและบุคลากรประจำอู่ ({mechanics.length} ท่าน)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                เจ้าของอู่สามารถ เพิ่ม ลบ และแก้ไขรายชื่อช่าง เบอร์โทรศัพท์ และความเชี่ยวชาญได้โดยตรง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMechanicModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            <span>+ จัดการรายชื่อช่าง (เพิ่ม/ลบ/แก้ไข)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[#2D3135]">
          {mechanics.slice(0, 3).map((mech, index) => (
            <div key={mech.id} className="p-3 bg-[#0F1113] rounded-xl border border-[#2D3135] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{mech.name}</p>
                <p className="text-[11px] text-gray-400 font-mono">{mech.phone} • {mech.positionTitle || 'ช่างประจำ'}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                mech.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
              }`}>
                {mech.status === 'available' ? 'พร้อมรับงาน' : 'กำลังซ่อม'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mechanic Manager Modal */}
      <MechanicManagerModal
        isOpen={isMechanicModalOpen}
        onClose={() => setIsMechanicModalOpen(false)}
      />

      {/* Backup Notification Toast */}
      {backupMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border animate-in fade-in ${
            backupMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <span>{backupMessage.text}</span>
          <button
            type="button"
            onClick={() => setBackupMessage(null)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section: Data Backup, Excel & JSON Export */}
      <div className="bg-[#16191D] border border-blue-500/30 rounded-xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3135] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>สำรองข้อมูลระบบอู่ & ส่งออกไฟล์ Excel / JSON (Data Backup & Excel Export)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                บันทึกข้อมูลลงเครื่องคอมพิวเตอร์อย่างปลอดภัย นำไปเปิดใน Microsoft Excel หรือกู้คืนได้ทันที
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
            Local-First Auto-Saved
          </span>
        </div>

        {/* 1. Full Database JSON Backup & Restore */}
        <div className="p-4 bg-[#0F1113] border border-[#2D3135] rounded-xl space-y-3">
          <span className="text-xs font-bold text-white block flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>1. สำรองข้อมูลระบบทั้งหมด (Full System Backup - JSON)</span>
          </span>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            ไฟล์ JSON จะบันทึกข้อมูลทุกอย่าง: ใบสั่งซ่อมทั้งหมด, สต็อกอะไหล่, รายชื่อลูกค้าและรถยนต์, ทีมช่าง, ช่องซ่อม และการตั้งค่าอู่
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.JSON)</span>
            </button>

            <label className="px-4 py-2.5 rounded-xl bg-[#1C2025] hover:bg-[#25292E] text-gray-200 hover:text-white border border-[#2D3135] font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>นำเข้าไฟล์กู้คืน (.JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 2. Excel (CSV UTF-8 with BOM) Exports */}
        <div className="p-4 bg-[#0F1113] border border-[#2D3135] rounded-xl space-y-3">
          <span className="text-xs font-bold text-white block flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>2. ส่งออกไฟล์ตาราง Excel (.CSV เปิดใน Excel ภาษาไทยไม่เพี้ยน)</span>
          </span>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            ส่งออกไฟล์ข้อมูลตารางแยกตามหมวดหมู่เพื่อนำไปทำบัญชี วิเคราะห์ยอดขาย หรือเก็บสต็อกใน Microsoft Excel
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportJobsExcel}
              className="p-3 bg-[#16191D] hover:bg-[#20252A] rounded-xl border border-[#2D3135] hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span>ตารางใบสั่งซ่อมทั้งหมด</span>
                <FileDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400">
                {jobOrders.length} รายการ (เลขที่, ลูกค้า, อาการ, ยอดเงิน)
              </p>
            </button>

            <button
              type="button"
              onClick={handleExportPartsExcel}
              className="p-3 bg-[#16191D] hover:bg-[#20252A] rounded-xl border border-[#2D3135] hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span>ตารางสต็อกอะไหล่</span>
                <FileDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400">
                {spareParts.length} รายการ (รหัส, ชื่อ, จำนวน, ราคาทุน/ขาย)
              </p>
            </button>

            <button
              type="button"
              onClick={handleExportCustomersExcel}
              className="p-3 bg-[#16191D] hover:bg-[#20252A] rounded-xl border border-[#2D3135] hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span>ตารางลูกค้า & รถยนต์</span>
                <FileDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400">
                {customers.length} ท่าน (เบอร์โทร, ทะเบียนรถ, ยอดสะสม)
              </p>
            </button>
          </div>
        </div>

        {/* 3. System Reset Option */}
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-red-400 block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>รีเซ็ตระบบเป็นค่าเริ่มต้น (Reset Demo Data)</span>
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              ล้างข้อมูลที่บันทึกไว้ในเครื่องและคืนค่าเป็นข้อมูลตัวอย่างเริ่มต้น
            </p>
          </div>

          {!isConfirmingReset ? (
            <button
              type="button"
              onClick={() => setIsConfirmingReset(true)}
              className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all self-start sm:self-auto cursor-pointer"
            >
              รีเซ็ตข้อมูลระบบ
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-red-300 font-bold">ยืนยันหรือไม่?</span>
              <button
                type="button"
                onClick={handleResetConfirmed}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                ยืนยันล้างข้อมูล
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="px-2.5 py-1.5 rounded-lg bg-[#2D3135] text-gray-300 hover:text-white text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      </div>

      {/* System Version & What's New in v2.0 */}
      <div className="bg-[#16191D] border border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ระบบบริหารจัดการอู่ซ่อมรถยนต์ Songkarn Auto Service</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/40">
                  เวอร์ชั่น 2.0.0 (ใหม่ล่าสุด)
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                อัปเดตระบบใหญ่ รองรับ 2-Way Google Sheets Live Pull & History Archive
              </p>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            สถานะ: <strong className="text-emerald-400 font-bold">🟢 พร้อมใช้งานจริง (Production Ready)</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#2D3135]">
          <div className="p-3.5 bg-[#0F1113] rounded-xl border border-[#2D3135] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดึงข้อมูล Google Sheets สด</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              รองรับการอ่านและแสดงตารางข้อมูลจริงจาก Google Sheets ทุกแผ่นงาน พร้อมปุ่มนำเข้าข้อมูลกลับเข้าสู่ระบบอู่อัตโนมัติ
            </p>
          </div>

          <div className="p-3.5 bg-[#0F1113] rounded-xl border border-[#2D3135] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-400 text-xs">
              <History className="w-4 h-4" />
              <span>คลังประวัติใบซ่อมย้อนหลัง</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              เปิดดูประวัติงานซ่อมย้อนหลังตามทะเบียนรถ เลขที่ใบซ่อม หรือเบอร์โทร ดูอาการเดิม อะไหล่ที่เปลี่ยน และพิมพ์ใบเสร็จย้อนหลัง
            </p>
          </div>

          <div className="p-3.5 bg-[#0F1113] rounded-xl border border-[#2D3135] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-orange-400 text-xs">
              <Database className="w-4 h-4" />
              <span>Local-First & Firebase Sync</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              ทำงานออฟไลน์ได้ 100% ข้อมูลไม่สูญหาย พร้อมระบบเชื่อมโยงคลาวด์ Firebase และ Google Drive อัตโนมัติ
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

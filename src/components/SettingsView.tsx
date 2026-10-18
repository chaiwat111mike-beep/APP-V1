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
  DollarSign
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { GarageProfile, LaborServiceItem } from '../types';
import { initialStandardLaborPresets } from '../data/initialData';
import { GarageLogo } from './GarageLogo';
import { PromptPayQRCard } from './PromptPayQRCard';
import { MechanicManagerModal } from './MechanicManagerModal';

export const SettingsView: React.FC = () => {
  const { garageProfile, updateGarageProfile, syncStatus, isOnline, mechanics } = useGarage();
  const [isMechanicModalOpen, setIsMechanicModalOpen] = useState(false);

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

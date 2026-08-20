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
  RotateCcw
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { GarageProfile } from '../types';
import { GarageLogo } from './GarageLogo';

export const SettingsView: React.FC = () => {
  const { garageProfile, updateGarageProfile, syncStatus, isOnline } = useGarage();

  const [formData, setFormData] = useState<GarageProfile>({ ...garageProfile });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGarageProfile(formData);
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">อีเมลกิจการ</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-semibold mb-1">ที่อยู่อู่ซ่อมรถ</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">อัตราภาษีมูลค่าเพิ่ม VAT (%)</label>
              <input
                type="number"
                value={formData.vatPercent}
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
                value={formData.promptPayId}
                onChange={(e) => setFormData({ ...formData, promptPayId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">ชื่อบัญชีธนาคาร</label>
              <input
                type="text"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">เลขที่บัญชี / ธนาคาร</label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
              />
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
              value={formData.warrantyTerms}
              onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
              className="w-full px-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
            />
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

    </div>
  );
};

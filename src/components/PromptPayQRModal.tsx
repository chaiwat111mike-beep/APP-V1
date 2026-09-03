import React, { useState, useEffect } from 'react';
import { useGarage } from '../context/GarageContext';
import { PromptPayQRCard } from './PromptPayQRCard';
import { JobOrder } from '../types';
import { 
  X, 
  QrCode, 
  Car, 
  CheckCircle2, 
  Printer, 
  Share2, 
  DollarSign, 
  FileText, 
  MessageSquare,
  Sparkles,
  RefreshCw,
  Building2,
  Phone
} from 'lucide-react';
import { generateJobCompletedMessage, getLineShareUrl, openLineShare } from '../services/lineService';

interface PromptPayQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJobId?: string;
  initialAmount?: number;
  initialReference?: string;
  onPaymentComplete?: (jobId: string) => void;
}

export const PromptPayQRModal: React.FC<PromptPayQRModalProps> = ({
  isOpen,
  onClose,
  initialJobId,
  initialAmount,
  initialReference,
  onPaymentComplete,
}) => {
  const { garageProfile, jobOrders, updateJobPayment } = useGarage();

  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [customAmount, setCustomAmount] = useState<string>(
    initialAmount !== undefined ? initialAmount.toString() : ''
  );
  const [customReference, setCustomReference] = useState<string>(initialReference || '');
  const [selectedPromptPayId, setSelectedPromptPayId] = useState<string>(garageProfile.promptPayId || '0610692036');
  const [accountName, setAccountName] = useState<string>(garageProfile.bankAccountName || 'อู่สงกรานต์ (ช่างไมค์)');
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);
  const [paidSuccess, setPaidSuccess] = useState<boolean>(false);
  const [lineStatus, setLineStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'no_job'>('idle');

  // Find active job if selected
  const currentJob: JobOrder | undefined = jobOrders.find((j) => j.id === selectedJobId);

  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
      const job = jobOrders.find((j) => j.id === initialJobId);
      if (job) {
        setCustomAmount(job.totalAmount.toString());
        setCustomReference(`งานซ่อม #${job.jobNo || job.id.slice(-4)} (${job.licensePlate})`);
      }
    } else if (initialAmount !== undefined) {
      setCustomAmount(initialAmount.toString());
      if (initialReference) setCustomReference(initialReference);
    }
  }, [initialJobId, initialAmount, initialReference, jobOrders]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) {
      setCustomReference('');
      return;
    }
    const job = jobOrders.find((j) => j.id === jobId);
    if (job) {
      setCustomAmount(job.totalAmount.toString());
      setCustomReference(`ใบสั่งซ่อม #${job.jobNo || job.id.slice(-4)} (${job.licensePlate})`);
    }
  };

  const handlePresetAmount = (preset: number) => {
    setCustomAmount(preset.toString());
  };

  const handleAddPreset = (addVal: number) => {
    const curr = Number(customAmount) || 0;
    setCustomAmount((curr + addVal).toString());
  };

  const parsedAmount = customAmount ? parseFloat(customAmount) : undefined;

  const handleMarkAsPaid = async () => {
    if (!selectedJobId) return;
    setIsMarkingPaid(true);
    try {
      await updateJobPayment(selectedJobId, 'paid', 'promptpay', parsedAmount);
      setPaidSuccess(true);
      if (onPaymentComplete) {
        onPaymentComplete(selectedJobId);
      }
      setTimeout(() => {
        setPaidSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error marking job as paid:', err);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleSendLine = async () => {
    if (!currentJob) {
      setLineStatus('no_job');
      setTimeout(() => setLineStatus('idle'), 3500);
      return;
    }

    setLineStatus('sending');
    try {
      const msg = generateJobCompletedMessage(currentJob, garageProfile);
      const paymentMsg = `${msg}\n\n📱 สรุปยอดชำระเงินผ่าน PromptPay: ฿${(parsedAmount || currentJob.totalAmount).toLocaleString()} บาท\nเลขพร้อมเพย์: ${selectedPromptPayId} (${accountName})`;
      
      const res = await openLineShare(paymentMsg);
      if (res.success) {
        setLineStatus('success');
      } else {
        setLineStatus('error');
      }
      setTimeout(() => setLineStatus('idle'), 3500);
    } catch (e) {
      console.error('Failed to send LINE:', e);
      setLineStatus('error');
      setTimeout(() => setLineStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#1C2025] border-b border-[#2D3135] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>สร้าง QR Code รับชำระเงิน พร้อมเพย์ (PromptPay)</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/40">
                  EMVCo Thai QR
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                สร้าง QR Code สแกนจ่ายด้วยแอปธนาคารทุกธนาคาร พร้อมระบุยอดเงินตรงตามใบสั่งซ่อม
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2D3135] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Amount Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Select Source / Job */}
            <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-3">
              <label className="block text-xs font-bold text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-orange-400" />
                  <span>ดึงยอดจากใบสั่งซ่อม / ทะเบียนรถ (Optional)</span>
                </span>
                <span className="text-[10px] text-gray-500 font-normal">เลือกเพื่อระบุยอดอัตโนมัติ</span>
              </label>

              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#16191D] border border-[#2D3135] rounded-xl text-xs text-gray-100 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="">-- กำหนดจำนวนเงินเอง (เคาน์เตอร์แคชเชียร์อิสระ) --</option>
                {jobOrders.map((job) => (
                  <option key={job.id} value={job.id}>
                    #{job.jobNo || job.id.slice(-4)} • {job.licensePlate} ({job.customerName}) — ฿{job.totalAmount.toLocaleString()} [{job.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}]
                  </option>
                ))}
              </select>

              {currentJob && (
                <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">ลูกค้า:</span>
                    <span className="font-semibold text-white">{currentJob.customerName} ({currentJob.customerPhone})</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">อาการ/งานซ่อม:</span>
                    <span className="text-gray-200 truncate max-w-[200px]">{currentJob.issueDescription}</span>
                  </div>
                  <div className="flex justify-between text-gray-300 pt-1 border-t border-blue-900/30">
                    <span className="text-gray-400">สถานะชำระปัจจุบัน:</span>
                    <span className={`font-bold font-mono ${currentJob.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {currentJob.paymentStatus === 'paid' ? '✓ ชำระแล้ว' : '⏳ รอชำระเงิน'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Amount Input & Quick Presets */}
            <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-3">
              <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>จำนวนเงินที่ต้องชำระ (บาท)</span>
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono text-base">
                  ฿
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00 (เว้นว่างเพื่อให้ลูกค้ากรอกเอง)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-[#16191D] border border-[#2D3135] rounded-xl text-lg font-bold font-mono text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Add Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">ปุ่มลัดบวกจำนวนเงินด่วน:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddPreset(100)}
                    className="px-2.5 py-1 bg-[#1A1E24] hover:bg-[#252B33] text-gray-300 hover:text-white border border-[#2D3135] rounded-lg text-xs font-mono transition-colors"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset(500)}
                    className="px-2.5 py-1 bg-[#1A1E24] hover:bg-[#252B33] text-gray-300 hover:text-white border border-[#2D3135] rounded-lg text-xs font-mono transition-colors"
                  >
                    +500
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset(1000)}
                    className="px-2.5 py-1 bg-[#1A1E24] hover:bg-[#252B33] text-gray-300 hover:text-white border border-[#2D3135] rounded-lg text-xs font-mono transition-colors"
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset(2000)}
                    className="px-2.5 py-1 bg-[#1A1E24] hover:bg-[#252B33] text-gray-300 hover:text-white border border-[#2D3135] rounded-lg text-xs font-mono transition-colors"
                  >
                    +2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomAmount('')}
                    className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-lg text-xs transition-colors"
                  >
                    ล้างยอด
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: PromptPay Account Info */}
            <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-3">
              <label className="block text-xs font-bold text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>บัญชีรับเงินพร้อมเพย์ของอู่</span>
                </span>
                <span className="text-[10px] text-gray-500 font-normal">แก้ไขใน 'ตั้งค่าระบบ'</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block mb-1">เบอร์ / เลขพร้อมเพย์:</span>
                  <input
                    type="text"
                    value={selectedPromptPayId}
                    onChange={(e) => setSelectedPromptPayId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block mb-1">ชื่อบัญชีผู้รับ:</span>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions for Selected Job */}
            {selectedJobId && (
              <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={isMarkingPaid}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                      paidSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {paidSuccess ? '✓ บันทึกชำระเงินเรียบร้อย!' : isMarkingPaid ? 'กำลังบันทึก...' : 'บันทึกว่าชำระแล้ว (Mark as Paid)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendLine}
                    disabled={lineStatus === 'sending'}
                    className="px-4 py-2.5 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#06C755]/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {lineStatus === 'sending'
                        ? 'กำลังส่ง LINE...'
                        : lineStatus === 'success'
                        ? '✓ ส่ง LINE สำเร็จ'
                        : lineStatus === 'no_job'
                        ? '⚠️ กรุณาเลือกงานซ่อมก่อน'
                        : 'ส่ง QR ให้ลูกค้าผ่าน LINE'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live PromptPay QR Card Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              <PromptPayQRCard
                promptPayId={selectedPromptPayId}
                accountName={accountName}
                bankName={garageProfile.bankName}
                bankAccountNumber={garageProfile.bankAccountNumber || garageProfile.bankAccount}
                amount={parsedAmount}
                shopName={garageProfile.name || garageProfile.garageName}
                referenceNo={customReference || (currentJob ? currentJob.licensePlate : undefined)}
                showActions={true}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#1C2025] border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>QR Code สร้างแบบออฟไลน์ ปลอดภัย 100% ตรงตามมาตรฐานธนาคารแห่งประเทศไทย</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2D3135] hover:bg-[#3D4248] text-gray-200 font-medium rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

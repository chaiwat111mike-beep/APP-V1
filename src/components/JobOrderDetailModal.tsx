import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Car,
  User,
  Phone,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  Fuel,
  Gauge,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Send,
  MessageSquare,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Edit3,
  History,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobStatus, PaymentMethod, PaymentStatus, SparePart } from '../types';
import { LineNotificationModal } from './LineNotificationModal';
import { PromptPayQRModal } from './PromptPayQRModal';
import {
  calculateJobBreakdown,
  getDurationDisplay,
  formatThaiDateTime,
  toDateTimeLocalString,
  getQuickDeliveryPreset
} from '../utils/jobCalculator';
import { SparePartSearchSelect } from './SparePartSearchSelect';

interface JobOrderDetailModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintJob: (job: JobOrder, docType: 'job_order' | 'quotation' | 'receipt') => void;
  onSwitchJob?: (newJobId: string) => void;
}

export const JobOrderDetailModal: React.FC<JobOrderDetailModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onPrintJob,
  onSwitchJob,
}) => {
  const {
    jobOrders,
    garageProfile,
    spareParts,
    mechanics,
    serviceBays,
    updateJobOrder,
    updateJobStatus,
    addPartToJob,
    removePartFromJob,
    updateJobPayment,
    deleteJobOrder,
  } = useGarage();

  const [activeJobId, setActiveJobId] = useState<string | null>(jobId);

  useEffect(() => {
    setActiveJobId(jobId);
  }, [jobId]);

  const job = jobOrders.find((j) => j.id === (activeJobId || jobId));

  // Past jobs for this vehicle
  const pastJobsForCar = useMemo(() => {
    if (!job) return [];
    return jobOrders
      .filter(
        (j) =>
          j.id !== job.id &&
          j.licensePlate.trim().toLowerCase() === job.licensePlate.trim().toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobOrders, job]);

  const [isVehicleHistoryOpen, setIsVehicleHistoryOpen] = useState<boolean>(false);

  // Local editable states
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  
  const [laborFeeInput, setLaborFeeInput] = useState<number>(0);
  const [otherFeeInput, setOtherFeeInput] = useState<number>(0);
  const [otherFeeDescInput, setOtherFeeDescInput] = useState<string>('');
  const [discountTypeInput, setDiscountTypeInput] = useState<'amount' | 'percent'>('amount');
  const [discountValueInput, setDiscountValueInput] = useState<number>(0);
  const [enableVatInput, setEnableVatInput] = useState<boolean>(true);
  const [vatPercentInput, setVatPercentInput] = useState<number>(7);
  const [depositAmountInput, setDepositAmountInput] = useState<number>(0);

  const [techNotes, setTechNotes] = useState<string>('');
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [isEditingDates, setIsEditingDates] = useState<boolean>(false);
  
  const [receivedDateInput, setReceivedDateInput] = useState<string>('');
  const [estimatedDeliveryInput, setEstimatedDeliveryInput] = useState<string>('');

  const [stockError, setStockError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const [isLineModalOpen, setIsLineModalOpen] = useState<boolean>(false);
  const [isPromptPayModalOpen, setIsPromptPayModalOpen] = useState<boolean>(false);

  // Sync state with active job on modal open or job change
  useEffect(() => {
    if (job) {
      setLaborFeeInput(job.laborFee || 0);
      setOtherFeeInput(job.otherFee || 0);
      setOtherFeeDescInput(job.otherFeeDescription || '');
      setDiscountTypeInput(job.discountType || 'amount');
      setDiscountValueInput(
        job.discountType === 'percent' ? (job.discountPercent || 0) : (job.discount || 0)
      );
      setEnableVatInput((job.vatPercent ?? 7) > 0);
      setVatPercentInput(job.vatPercent ?? 7);
      setDepositAmountInput(job.depositAmount || job.paidAmount || 0);
      setTechNotes(job.technicianNotes || '');
      
      const recDate = job.receivedDate || job.createdAt;
      setReceivedDateInput(recDate ? recDate.slice(0, 16) : toDateTimeLocalString());
      setEstimatedDeliveryInput(job.estimatedCompletionDate ? job.estimatedCompletionDate.slice(0, 16) : '');
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const statuses: { key: JobStatus; label: string; icon: string }[] = [
    { key: 'pending', label: '1. รอดำเนินการ', icon: '⏳' },
    { key: 'inspecting', label: '2. กำลังตรวจเช็ค', icon: '🔍' },
    { key: 'waiting_parts', label: '3. รออะไหล่', icon: '📦' },
    { key: 'in_progress', label: '4. กำลังซ่อม', icon: '🔧' },
    { key: 'qc', label: '5. ทดสอบ QC', icon: '🧪' },
    { key: 'completed', label: '6. ซ่อมเสร็จ', icon: '✅' },
    { key: 'delivered', label: '7. ส่งมอบแล้ว', icon: '🚗' },
  ];

  // Calculate live breakdown
  const financials = calculateJobBreakdown({
    parts: job.partsUsed || [],
    laborFee: laborFeeInput,
    otherFee: otherFeeInput,
    discount: discountTypeInput === 'amount' ? discountValueInput : 0,
    discountType: discountTypeInput,
    discountPercent: discountTypeInput === 'percent' ? discountValueInput : 0,
    enableVat: enableVatInput,
    vatPercent: enableVatInput ? vatPercentInput : 0,
    depositAmount: depositAmountInput,
  });

  const durationInfo = getDurationDisplay(
    job.receivedDate || job.createdAt,
    job.estimatedCompletionDate
  );

  const handleAddPart = () => {
    if (!selectedPartId) return;
    const part = spareParts.find((p) => p.id === selectedPartId);
    if (!part) return;

    if (part.stockQty < partQuantity) {
      setStockError(`สต็อกมีเพียง ${part.stockQty} ${part.unit} (ไม่พอสำหรับ ${partQuantity})`);
      setTimeout(() => setStockError(null), 4000);
      return;
    }

    setStockError(null);
    addPartToJob(job.id, part, partQuantity);
    setSelectedPartId('');
    setPartQuantity(1);
  };

  const handleSaveFinancials = () => {
    const isAlreadyPaid = job.paymentStatus === 'paid';
    updateJobOrder(job.id, {
      laborFee: financials.laborFee,
      otherFee: financials.otherFee,
      otherFeeDescription: otherFeeDescInput.trim(),
      discount: financials.discountAmount,
      discountType: financials.discountType,
      discountPercent: financials.discountPercent,
      vatPercent: financials.vatPercent,
      totalAmount: financials.grandTotal,
      depositAmount: financials.depositAmount,
      paidAmount: isAlreadyPaid ? financials.grandTotal : (financials.depositAmount || job.paidAmount || 0),
      paymentStatus: isAlreadyPaid ? 'paid' : (financials.suggestedPaymentStatus !== 'unpaid' ? financials.suggestedPaymentStatus : job.paymentStatus),
    });
  };

  const handleSaveDates = () => {
    updateJobOrder(job.id, {
      receivedDate: receivedDateInput ? new Date(receivedDateInput).toISOString() : job.receivedDate,
      estimatedCompletionDate: estimatedDeliveryInput ? new Date(estimatedDeliveryInput).toISOString() : undefined,
    });
    setIsEditingDates(false);
  };

  const handleSaveNotes = () => {
    updateJobOrder(job.id, { technicianNotes: techNotes });
    setIsEditingNotes(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
          
          {/* Top Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-[#1C2025] border-b border-[#2D3135] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xl shadow-inner">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-orange-400 tracking-tight font-mono">
                    {job.licensePlate}
                  </h2>
                  <span className="text-sm text-gray-200 font-semibold">
                    {job.carBrand} {job.carModel} {job.carYear ? `(${job.carYear})` : ''}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-[#0F1113] text-gray-300 border border-[#2D3135] font-mono font-bold">
                    {job.jobNo}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  ลูกค้า: <strong className="text-gray-200">{job.customerName}</strong> ({job.customerPhone}) • ช่องซ่อม #{job.bayNumber || '-'} • ช่าง: {job.mechanicName || 'ยังไม่ระบุ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* LINE Notify Button */}
              <button
                type="button"
                onClick={() => setIsLineModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#06C755]/20 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่ง LINE</span>
              </button>

              {/* 1-Click Print / PDF Export Main Button */}
              <button
                onClick={() => onPrintJob(job, 'job_order')}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
                title="พิมพ์หรือส่งออกไฟล์ PDF ทันที (มีตัวเลือก ใบสั่งซ่อม / ใบเสนอราคา / ใบเสร็จรับเงิน)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>🖨️ พิมพ์ / ส่งออก PDF (1 คลิก)</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white hover:bg-[#25292E] transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Modal Main Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Status Progression Stepper */}
          <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-2">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              ความคืบหน้าของงานซ่อม (คลิกเพื่อเปลี่ยนสถานะ)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
              {statuses.map((st) => {
                const isActive = job.status === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => updateJobStatus(job.id, st.key)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 border ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                        : 'bg-[#16191D] text-gray-300 border-[#2D3135] hover:bg-[#1C2025] hover:text-white'
                    }`}
                  >
                    <span className="text-base">{st.icon}</span>
                    <span className="text-[11px] truncate w-full">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Tracking Banner (Feature 2) */}
          <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2D3135]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                  กำหนดการรับรถ & ส่งมอบรถยนต์
                </h3>
              </div>

              {!isEditingDates ? (
                <button
                  onClick={() => setIsEditingDates(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขวันเวลารับ-ส่ง</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDates}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg"
                  >
                    บันทึกวันเวลา
                  </button>
                  <button
                    onClick={() => setIsEditingDates(false)}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>

            {!isEditingDates ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                <div className="bg-[#16191D] p-3 rounded-lg border border-[#2D3135]">
                  <span className="text-gray-400 block text-[11px]">📅 วันที่รับรถเข้าอู่</span>
                  <span className="font-bold text-gray-100 font-mono mt-0.5 block">
                    {formatThaiDateTime(job.receivedDate || job.createdAt)}
                  </span>
                </div>

                <div className="bg-[#16191D] p-3 rounded-lg border border-[#2D3135]">
                  <span className="text-gray-400 block text-[11px]">🏁 กำหนดส่งมอบรถ</span>
                  <span className="font-bold text-gray-100 font-mono mt-0.5 block">
                    {formatThaiDateTime(job.estimatedCompletionDate)}
                  </span>
                </div>

                <div className="bg-[#16191D] p-3 rounded-lg border border-[#2D3135] flex flex-col justify-between">
                  <span className="text-gray-400 block text-[11px]">⏱️ สถานะระยะเวลางาน</span>
                  <span className={`font-bold text-xs mt-0.5 ${durationInfo.isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                    {durationInfo.isOverdue ? '⚠️ ' : '⏳ '} {durationInfo.text}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">วันที่และเวลารับรถ</label>
                  <input
                    type="datetime-local"
                    value={receivedDateInput || ''}
                    onChange={(e) => setReceivedDateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">กำหนดส่งมอบรถ</label>
                  <input
                    type="datetime-local"
                    value={estimatedDeliveryInput || ''}
                    onChange={(e) => setEstimatedDeliveryInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Repair Details & Parts Management */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Vehicle History Archive Banner (ประวัติการซ่อมย้อนหลังของรถคันนี้) */}
              {pastJobsForCar.length > 0 && (
                <div className="bg-[#0F1113] p-4 rounded-xl border border-blue-500/30 space-y-3">
                  <div
                    onClick={() => setIsVehicleHistoryOpen(!isVehicleHistoryOpen)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                        ประวัติการซ่อมย้อนหลังของรถคันนี้ (พบ {pastJobsForCar.length} ใบสั่งซ่อมเดิม)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <span>{isVehicleHistoryOpen ? 'ย่อประวัติ' : 'ดูประวัติย้อนหลัง'}</span>
                      {isVehicleHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {isVehicleHistoryOpen && (
                    <div className="space-y-2.5 pt-2 border-t border-[#2D3135]">
                      <p className="text-[11px] text-gray-400">
                        รถทะเบียน <span className="font-mono font-bold text-amber-400">{job.licensePlate}</span> เคยมีประวัติการเข้าซ่อมบำรุงในอู่ตามรายการด้านล่างนี้:
                      </p>
                      {pastJobsForCar.map((pj) => (
                        <div
                          key={pj.id}
                          className="p-3 bg-[#16191D] border border-[#2D3135] hover:border-blue-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                                {pj.jobNo}
                              </span>
                              <span className="text-gray-400 text-[11px]">
                                {pj.receivedDate ? formatThaiDateTime(pj.receivedDate) : formatThaiDateTime(pj.createdAt)}
                              </span>
                              <span className="text-gray-400 text-[11px] font-mono">
                                • ไมล์ {(pj.mileage || 0).toLocaleString()} กม.
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0F1113] border border-[#2D3135] text-gray-300">
                                {pj.status === 'delivered' ? 'ส่งมอบแล้ว' : pj.status === 'completed' ? 'ซ่อมเสร็จ' : 'กำลังซ่อม'}
                              </span>
                            </div>
                            <p className="text-gray-200 font-medium">{pj.issueDescription}</p>
                            {pj.partsUsed.length > 0 && (
                              <p className="text-[11px] text-gray-400">
                                อะไหล่ที่เปลี่ยน: {pj.partsUsed.map((p) => `${p.partName} x${p.quantity}`).join(', ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2D3135]">
                            <div className="text-left sm:text-right">
                              <span className="font-mono font-bold text-emerald-400 block">
                                ฿{(pj.totalAmount || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {pj.paymentStatus === 'paid' ? '✅ ชำระแล้ว' : '⏳ ค้างชำระ'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onPrintJob(pj, 'receipt')}
                                className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-300 hover:text-white"
                                title="พิมพ์ใบเสร็จย้อนหลัง"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveJobId(pj.id);
                                  if (onSwitchJob) onSwitchJob(pj.id);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>เปิดดูใบนี้</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Symptoms & Vehicle Inspection */}
              <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-3">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span>อาการเสียที่แจ้ง & บันทึกการตรวจเช็ค</span>
                </h3>

                <div className="p-3 bg-[#16191D] rounded-lg border border-[#2D3135]">
                  <p className="text-xs font-medium text-gray-300">{job.issueDescription}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="bg-[#16191D] p-2.5 rounded-lg border border-[#2D3135]">
                    <span className="text-gray-400 block text-[10px]">เลขไมล์รถ</span>
                    <span className="font-bold text-gray-200 font-mono">{job.mileage.toLocaleString()} กม.</span>
                  </div>
                  <div className="bg-[#16191D] p-2.5 rounded-lg border border-[#2D3135]">
                    <span className="text-gray-400 block text-[10px]">ระดับน้ำมัน</span>
                    <span className="font-bold text-orange-400 font-mono">{job.inspection?.fuelLevel ?? 60}%</span>
                  </div>
                  <div className="bg-[#16191D] p-2.5 rounded-lg border border-[#2D3135]">
                    <span className="text-gray-400 block text-[10px]">ช่างผู้รับผิดชอบ</span>
                    <span className="font-bold text-gray-200">{job.mechanicName || 'ยังไม่ระบุ'}</span>
                  </div>
                  <div className="bg-[#16191D] p-2.5 rounded-lg border border-[#2D3135]">
                    <span className="text-gray-400 block text-[10px]">ช่องซ่อม (Hoist)</span>
                    <span className="font-bold text-green-400 font-mono">ช่อง #{job.bayNumber || '-'}</span>
                  </div>
                </div>

                {/* Technician Notes */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-300">บันทึกของช่างซ่อม:</span>
                    {!isEditingNotes ? (
                      <button
                        onClick={() => {
                          setTechNotes(job.technicianNotes || '');
                          setIsEditingNotes(true);
                        }}
                        className="text-[11px] text-orange-400 hover:underline"
                      >
                        แก้ไขบันทึก
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveNotes}
                        className="text-[11px] text-green-400 hover:underline font-bold"
                      >
                        บันทึกโน้ต
                      </button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <textarea
                      rows={2}
                      value={techNotes || ''}
                      onChange={(e) => setTechNotes(e.target.value)}
                      placeholder="บันทึกผลการตรวจสอบของช่าง..."
                      className="w-full p-2.5 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-xs text-gray-400 bg-[#16191D] p-2.5 rounded-lg border border-[#2D3135] italic">
                      {job.technicianNotes || 'ยังไม่มีบันทึกเพิ่มเติมจากช่าง'}
                    </p>
                  )}
                </div>
              </div>

              {/* Spare Parts Used (เบิกอะไหล่ & ตัดสต็อกอัตโนมัติ) */}
              <div className="bg-[#0F1113] p-4 rounded-xl border border-[#2D3135] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>รายการอะไหล่ที่ใช้ (เบิกตัดสต็อกอัตโนมัติ)</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      เมื่อเพิ่มอะไหล่เข้าระบบ จำนวนสต็อกในคลังจะถูกตัดออกทันทีแบบเรียลไทม์
                    </p>
                  </div>
                </div>

                {/* Add Part Bar with smart searchable select */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-[#16191D] rounded-xl border border-[#2D3135]">
                    <div className="flex-1 min-w-0">
                      <SparePartSearchSelect
                        spareParts={spareParts}
                        selectedPartId={selectedPartId}
                        onSelectPart={(part) => setSelectedPartId(part ? part.id : '')}
                        carBrandOrModel={`${job.carBrand} ${job.carModel}`.trim()}
                        placeholder="🔍 ค้นหาอะไหล่ในสต็อก (ชื่อ, รหัส, รุ่นรถ, ยี่ห้อ)..."
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <div className="flex items-center gap-1 bg-[#0F1113] border border-[#2D3135] rounded-xl px-2 py-1.5">
                        <span className="text-[11px] text-gray-400">จำนวน:</span>
                        <input
                          type="number"
                          min="1"
                          value={partQuantity}
                          onChange={(e) => setPartQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-12 bg-transparent text-xs text-center text-gray-100 font-mono focus:outline-none font-bold"
                        />
                      </div>

                      <button
                        onClick={handleAddPart}
                        disabled={!selectedPartId}
                        className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>เบิกอะไหล่</span>
                      </button>
                    </div>
                  </div>

                  {stockError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{stockError}</span>
                    </div>
                  )}
                </div>

                {/* Parts Table */}
                <div className="overflow-x-auto rounded-lg border border-[#2D3135] bg-[#16191D]">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#0F1113] text-gray-400 border-b border-[#2D3135]">
                      <tr>
                        <th className="px-3 py-2.5">รหัส / ชื่ออะไหล่</th>
                        <th className="px-3 py-2.5 text-center">จำนวน</th>
                        <th className="px-3 py-2.5 text-right">ราคา/หน่วย</th>
                        <th className="px-3 py-2.5 text-right">รวม (บาท)</th>
                        <th className="px-3 py-2.5 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3135]">
                      {(job.partsUsed || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                            ยังไม่มีการเบิกอะไหล่สำหรับใบสั่งซ่อมนี้
                          </td>
                        </tr>
                      ) : (
                        (job.partsUsed || []).map((p) => (
                          <tr key={p.partId} className="hover:bg-[#1C2025]">
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-gray-200 block">{p.partName}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{p.partCode}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-orange-400 font-mono">
                              {p.quantity}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              ฿{(p.unitPrice || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-white font-mono">
                              ฿{(p.totalPrice || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => removePartFromJob(job.id, p.partId)}
                                title="คืนอะไหล่เข้าสต็อก"
                                className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right 1 Col: Comprehensive Financial & Cost Calculator */}
            <div className="space-y-5">
              
              {/* Financial Box */}
              <div className="bg-[#0F1113] p-4 sm:p-5 rounded-xl border-2 border-orange-500/40 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-[#2D3135]">
                  <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>คำนวณค่าใช้จ่าย & การชำระ</span>
                  </h3>
                  <button
                    onClick={handleSaveFinancials}
                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg shadow-sm"
                  >
                    บันทึกยอดเงิน
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  
                  {/* Parts Subtotal */}
                  <div className="flex justify-between text-gray-300">
                    <span>รวมค่าอะไหล่ ({(job.partsUsed || []).length} รายการ):</span>
                    <span className="font-semibold text-white font-mono">฿{(financials.partsTotal || 0).toLocaleString()}</span>
                  </div>

                  {/* Labor Fee */}
                  <div className="flex items-center justify-between text-gray-300">
                    <span>ค่าแรงช่าง / บริการ:</span>
                    <input
                      type="number"
                      min="0"
                      value={laborFeeInput}
                      onChange={(e) => setLaborFeeInput(Number(e.target.value))}
                      onBlur={handleSaveFinancials}
                      className="w-24 px-2 py-1 bg-[#16191D] border border-[#2D3135] rounded-lg text-right text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Other Fees */}
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="truncate pr-1">ค่าอื่นๆ/ซับนอก:</span>
                    <input
                      type="number"
                      min="0"
                      value={otherFeeInput}
                      onChange={(e) => setOtherFeeInput(Number(e.target.value))}
                      onBlur={handleSaveFinancials}
                      placeholder="0"
                      className="w-24 px-2 py-1 bg-[#16191D] border border-[#2D3135] rounded-lg text-right text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Discount */}
                  <div className="space-y-1 pt-1 border-t border-[#2D3135]">
                    <div className="flex items-center justify-between text-gray-300">
                      <div className="flex items-center gap-1">
                        <span>ส่วนลด:</span>
                        <div className="flex items-center bg-[#16191D] p-0.5 rounded border border-[#2D3135] text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountTypeInput('amount');
                              setTimeout(handleSaveFinancials, 50);
                            }}
                            className={`px-1 py-0.5 rounded ${discountTypeInput === 'amount' ? 'bg-orange-500 text-white font-bold' : 'text-gray-400'}`}
                          >
                            ฿
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountTypeInput('percent');
                              setTimeout(handleSaveFinancials, 50);
                            }}
                            className={`px-1 py-0.5 rounded ${discountTypeInput === 'percent' ? 'bg-orange-500 text-white font-bold' : 'text-gray-400'}`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={discountValueInput}
                        onChange={(e) => setDiscountValueInput(Number(e.target.value))}
                        onBlur={handleSaveFinancials}
                        className="w-24 px-2 py-1 bg-[#16191D] border border-[#2D3135] rounded-lg text-right text-xs text-emerald-400 font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* VAT */}
                  <div className="flex items-center justify-between text-gray-400 pt-1 border-t border-[#2D3135]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableVatInput}
                        onChange={(e) => {
                          setEnableVatInput(e.target.checked);
                          setTimeout(handleSaveFinancials, 50);
                        }}
                        className="accent-orange-500 rounded"
                      />
                      <span>ภาษี VAT ({vatPercentInput}%):</span>
                    </label>
                    <span className="font-mono">฿{financials.vatAmount.toLocaleString()}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-2 border-t border-[#2D3135] flex justify-between items-baseline bg-[#16191D] p-2.5 rounded-lg">
                    <span className="font-bold text-xs text-gray-200">ยอดสุทธิทั้งสิ้น:</span>
                    <span className="font-black text-lg text-orange-400 font-mono">
                      ฿{financials.grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Deposit Amount & Remaining Balance */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-yellow-400">
                      <span>เงินมัดจำรับแล้ว:</span>
                      <input
                        type="number"
                        min="0"
                        value={depositAmountInput}
                        onChange={(e) => setDepositAmountInput(Number(e.target.value))}
                        onBlur={handleSaveFinancials}
                        className="w-24 px-2 py-1 bg-[#16191D] border border-yellow-500/30 rounded-lg text-right text-xs text-yellow-300 font-mono font-bold focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    
                    {financials.depositAmount > 0 && (
                      <div className="flex justify-between text-white font-bold bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                        <span>คงเหลือชำระ:</span>
                        <span className="font-mono text-sm text-orange-400 font-black">
                          ฿{financials.remainingBalance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Profit estimate badge */}
                  <div className="pt-2 border-t border-[#2D3135] flex items-center justify-between text-[11px] text-gray-400">
                    <span>กำไรขั้นต้นร้าน:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      ฿{financials.estimatedProfit.toLocaleString()} ({financials.profitMarginPercent}%)
                    </span>
                  </div>
                </div>

                {/* Payment Status Box */}
                <div className="pt-3 border-t border-[#2D3135] space-y-2.5">
                  <span className="text-xs font-semibold text-gray-300 block">สถานะการชำระเงิน:</span>
                  
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => updateJobPayment(job.id, 'unpaid')}
                      className={`p-2 rounded-lg font-bold border transition-colors ${
                        job.paymentStatus === 'unpaid'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-[#16191D] text-gray-400 border-[#2D3135] hover:text-white'
                      }`}
                    >
                      รอชำระ
                    </button>
                    <button
                      onClick={() => updateJobPayment(job.id, 'deposit', job.paymentMethod || 'transfer', financials.depositAmount || (financials.grandTotal * 0.5))}
                      className={`p-2 rounded-lg font-bold border transition-colors ${
                        job.paymentStatus === 'deposit'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-[#16191D] text-gray-400 border-[#2D3135] hover:text-white'
                      }`}
                    >
                      มัดจำ
                    </button>
                    <button
                      onClick={() => updateJobPayment(job.id, 'paid', job.paymentMethod || 'promptpay', financials.grandTotal)}
                      className={`p-2 rounded-lg font-bold border transition-colors ${
                        job.paymentStatus === 'paid'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-[#16191D] text-gray-400 border-[#2D3135] hover:text-white'
                      }`}
                    >
                      ชำระครบ
                    </button>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-1">
                    <label className="text-[11px] text-gray-400 block mb-1">ช่องทางชำระเงิน:</label>
                    <select
                      value={job.paymentMethod || 'promptpay'}
                      onChange={(e) => updateJobPayment(job.id, job.paymentStatus, e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="promptpay">📱 พร้อมเพย์ QR Code (PromptPay)</option>
                      <option value="transfer">🏦 โอนเงินผ่านบัญชีธนาคาร</option>
                      <option value="cash">💵 เงินสด (Cash)</option>
                      <option value="card">💳 บัตรเครดิต/เดบิต (Credit Card)</option>
                      <option value="insurance">🛡️ เคลมประกันภัย (Insurance)</option>
                    </select>
                  </div>

                  {/* Open PromptPay QR Button */}
                  <button
                    type="button"
                    onClick={() => setIsPromptPayModalOpen(true)}
                    className="w-full mt-2 py-2.5 px-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <QrCode className="w-4 h-4 text-blue-200" />
                    <span>สร้าง QR พร้อมเพย์ สแกนจ่าย (฿{financials.grandTotal.toLocaleString()})</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone: Delete */}
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-red-400">ลบใบสั่งซ่อมนี้</p>
                  <p className="text-[10px] text-gray-400">คืนช่องซ่อมและลบประวัติงาน</p>
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        deleteJobOrder(job.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      ยืนยันลบจริง
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 bg-[#252B32] hover:bg-[#2D3135] text-gray-300 rounded-lg text-xs transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    ลบรายการ
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>

    {/* Line Notification Modal */}
    <LineNotificationModal
      isOpen={isLineModalOpen}
      onClose={() => setIsLineModalOpen(false)}
      job={job}
    />

    {/* PromptPay QR Code Modal */}
    {job && (
      <PromptPayQRModal
        isOpen={isPromptPayModalOpen}
        onClose={() => setIsPromptPayModalOpen(false)}
        initialJobId={job.id}
        initialAmount={financials.grandTotal}
        initialReference={`ใบสั่งซ่อม #${job.jobNo || job.id.slice(-4)} (${job.licensePlate})`}
      />
    )}
  </>
  );
};

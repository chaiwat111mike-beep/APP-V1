import React, { useState } from 'react';
import {
  Receipt,
  TrendingUp,
  DollarSign,
  Printer,
  FileText,
  CreditCard,
  QrCode,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Car,
  Download,
  Filter,
  Maximize2
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, PaymentMethod, PaymentStatus } from '../types';
import { PromptPayQRCard } from './PromptPayQRCard';
import { PromptPayQRModal } from './PromptPayQRModal';

interface BillingReportViewProps {
  onSelectJob: (jobId: string) => void;
  onPrintJob: (job: JobOrder, docType: 'job_order' | 'quotation' | 'receipt') => void;
}

export const BillingReportView: React.FC<BillingReportViewProps> = ({
  onSelectJob,
  onPrintJob,
}) => {
  const { jobOrders, garageProfile, updateJobPayment } = useGarage();
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<JobOrder | null>(jobOrders[0] || null);
  const [isPromptPayModalOpen, setIsPromptPayModalOpen] = useState<boolean>(false);

  const filteredJobs = jobOrders.filter((job) => {
    if (filterPayment === 'all') return true;
    return job.paymentStatus === filterPayment;
  });

  const totalRevenue = jobOrders.reduce((sum, j) => sum + (j.paidAmount || (j.paymentStatus === 'paid' ? j.totalAmount : 0)), 0);
  const totalUnpaid = jobOrders.reduce((sum, j) => sum + (j.paymentStatus !== 'paid' ? (j.totalAmount - (j.paidAmount || 0)) : 0), 0);
  
  // Calculate total parts cost vs parts revenue for margin estimation
  let totalPartsCost = 0;
  let totalPartsRevenue = 0;
  let totalLaborRevenue = 0;

  jobOrders.forEach((j) => {
    (j.partsUsed || []).forEach((p) => {
      totalPartsCost += ((p.costPrice || 0) * (p.quantity || 0));
      totalPartsRevenue += (p.totalPrice ?? ((p.unitPrice || 0) * (p.quantity || 0)));
    });
    totalLaborRevenue += (j.laborFee || 0);
  });

  const partsProfitMargin = totalPartsRevenue > 0 ? ((totalPartsRevenue - totalPartsCost) / totalPartsRevenue) * 100 : 0;
  const estimatedGrossProfit = (totalPartsRevenue - totalPartsCost) + totalLaborRevenue;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16191D] border border-[#2D3135] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-orange-500" />
            <span>ระบบการเงิน & ใบแจ้งหนี้ & รายงานกำไร (Billing & Reports)</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            ออกใบเสร็จรับเงิน/ใบกำกับภาษี พิมพ์ใบเสนอราคา และสรุปรายรับอู่ซ่อมรถ
          </p>
        </div>
      </div>

      {/* 4 Financial Key Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-400">รายรับที่ชำระแล้ว (Paid)</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-green-400">฿{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">ยอดเงินเข้าบัญชีจริง</p>
        </div>

        <div className="p-5 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-400">ยอดค้างชำระ (Pending)</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-orange-400">฿{totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">รอรับชำระเมื่อส่งมอบรถ</p>
        </div>

        <div className="p-5 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-400">กำไรขั้นต้นประมาณการ</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white">฿{estimatedGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-green-400 mt-2">กำไรอะไหล่ + ค่าแรงช่าง</p>
        </div>

        <div className="p-5 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-400">อัตรากำไรอะไหล่ (Margin)</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-blue-400">{partsProfitMargin.toFixed(1)}%</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">ต้นทุน <span className="font-mono">฿{totalPartsCost.toLocaleString()}</span></p>
        </div>

      </div>

      {/* Invoices List & Instant Receipt Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Invoice List */}
        <div className="lg:col-span-7 bg-[#16191D] border border-[#2D3135] rounded-xl p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>รายการใบเสร็จ & ใบแจ้งหนี้ ({filteredJobs.length})</span>
            </h2>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="px-3 py-1.5 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-orange-500"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="paid">ชำระแล้ว (Paid)</option>
                <option value="unpaid">ค้างชำระ (Unpaid)</option>
                <option value="deposit">มัดจำ (Deposit)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredJobs.map((job) => {
              const isSelected = selectedInvoice?.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedInvoice(job)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#1C2025] border-orange-500/60 shadow-md shadow-orange-500/10'
                      : 'bg-[#0F1113] border-[#2D3135] hover:bg-[#16191D]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-400 font-mono text-sm">{job.licensePlate}</span>
                      <span className="text-xs text-gray-200 font-semibold">{job.customerName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191D] text-gray-400 border border-[#2D3135] font-mono">
                        {job.jobNo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {job.carBrand} {job.carModel} • {new Date(job.createdAt).toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2D3135]">
                    <span className="font-bold font-mono text-white text-sm sm:text-base">
                      ฿{job.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        job.paymentStatus === 'paid'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}
                    >
                      {job.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Active Invoice Card & PromptPay QR Code */}
        <div className="lg:col-span-5 bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-5">
          {selectedInvoice ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#2D3135]">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    ใบแจ้งหนี้ / ใบเสร็จรับเงิน
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">{selectedInvoice.jobNo}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPrintJob(selectedInvoice, 'receipt')}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5 active:scale-95"
                    title="พิมพ์ & ดาวน์โหลด PDF ใบเสร็จรับเงินใน 1 คลิก"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์/PDF (1 คลิก)</span>
                  </button>
                  <button
                    onClick={() => onSelectJob(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-200 font-semibold text-xs rounded-lg transition-colors"
                  >
                    ดูงาน
                  </button>
                </div>
              </div>

              {/* Bill Details */}
              <div className="p-4 bg-[#0F1113] rounded-lg border border-[#2D3135] space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">ลูกค้า:</span>
                  <span className="font-semibold text-white">{selectedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ทะเบียนรถ:</span>
                  <span className="font-bold text-orange-400 font-mono">{selectedInvoice.licensePlate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">รายการอะไหล่ ({(selectedInvoice.partsUsed || []).length} รายการ):</span>
                  <span className="text-gray-200 font-mono">
                    ฿{((selectedInvoice.partsUsed || []).reduce((s, p) => s + (p.totalPrice || 0), 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ค่าแรงช่าง:</span>
                  <span className="text-gray-200 font-mono">฿{(selectedInvoice.laborFee || 0).toLocaleString()}</span>
                </div>
                {(selectedInvoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>ส่วนลดพิเศษ:</span>
                    <span className="font-mono">-฿{(selectedInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#2D3135] flex justify-between items-baseline font-bold text-sm">
                  <span className="text-gray-200">ยอดรวมทั้งสิ้น:</span>
                  <span className="text-lg font-mono text-orange-400 font-bold">
                    ฿{(selectedInvoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* PromptPay QR Code Display Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>QR Code ชำระเงิน (PromptPay)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPromptPayModalOpen(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>ขยายเต็มจอ</span>
                  </button>
                </div>

                <PromptPayQRCard
                  promptPayId={garageProfile.promptPayId || '0610692036'}
                  accountName={garageProfile.bankAccountName}
                  bankName={garageProfile.bankName}
                  bankAccountNumber={garageProfile.bankAccountNumber || garageProfile.bankAccount}
                  amount={selectedInvoice.totalAmount}
                  shopName={garageProfile.name || garageProfile.garageName}
                  referenceNo={selectedInvoice.licensePlate}
                  showActions={true}
                />
              </div>

              {/* Quick Status Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => updateJobPayment(selectedInvoice.id, 'paid', 'promptpay')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-colors ${
                    selectedInvoice.paymentStatus === 'paid'
                      ? 'bg-green-500 text-slate-950'
                      : 'bg-[#0F1113] border border-[#2D3135] hover:bg-[#1C2025] text-gray-300'
                  }`}
                >
                  ✓ มาร์กว่าชำระแล้ว
                </button>
                <button
                  onClick={() => updateJobPayment(selectedInvoice.id, 'unpaid')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-colors ${
                    selectedInvoice.paymentStatus === 'unpaid'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-[#0F1113] border border-[#2D3135] hover:bg-[#1C2025] text-gray-300'
                  }`}
                >
                  มาร์กว่าค้างชำระ
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs">
              เลือกใบแจ้งหนี้ทางซ้ายเพื่อดูรายละเอียด
            </div>
          )}
        </div>

      </div>

      {/* Full PromptPay QR Modal */}
      {selectedInvoice && (
        <PromptPayQRModal
          isOpen={isPromptPayModalOpen}
          onClose={() => setIsPromptPayModalOpen(false)}
          initialJobId={selectedInvoice.id}
          initialAmount={selectedInvoice.totalAmount}
          initialReference={`ใบสั่งซ่อม #${selectedInvoice.jobNo} (${selectedInvoice.licensePlate})`}
        />
      )}

    </div>
  );
};

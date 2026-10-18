import React, { useState } from 'react';
import {
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  Wrench,
  Boxes,
  Users,
  Receipt,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  DollarSign,
  QrCode,
  History,
  FileSpreadsheet,
  ArrowDownCircle,
  ExternalLink
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobStatus } from '../types';
import { GarageLogo } from './GarageLogo';
import { PromptPayQRModal } from './PromptPayQRModal';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { MechanicManagerModal } from './MechanicManagerModal';

interface DashboardViewProps {
  onSelectJob: (jobId: string) => void;
  onOpenNewJobModal: () => void;
  setActiveTab?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectJob,
  onOpenNewJobModal,
  setActiveTab,
  onNavigateTab,
}) => {
  const [isPromptPayModalOpen, setIsPromptPayModalOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isMechanicModalOpen, setIsMechanicModalOpen] = useState<boolean>(false);
  const navigateTo = (tab: string) => {
    if (setActiveTab) setActiveTab(tab);
    if (onNavigateTab) onNavigateTab(tab);
  };
  const {
    jobOrders,
    spareParts,
    customers,
    serviceBays,
    mechanics,
    pullDataFromGoogleSheets,
    isPullingSheets,
    lastSheetPullAt,
    googleSheetsSyncStatus,
  } = useGarage();

  const activeJobs = jobOrders.filter((j) => j.status !== 'delivered' && j.status !== 'completed' && j.status !== 'closed');
  const completedJobs = jobOrders.filter((j) => j.status === 'completed');
  const deliveredJobs = jobOrders.filter((j) => j.status === 'delivered');
  const closedJobs = jobOrders.filter((j) => j.status === 'closed');
  const lowStockParts = spareParts.filter((p) => p.stockQty <= p.minStockQty);
  
  const totalRevenue = jobOrders.reduce((sum, j) => sum + (j.paidAmount || (j.paymentStatus === 'paid' ? (j.totalAmount || 0) : 0)), 0);
  const pendingRevenue = jobOrders.reduce((sum, j) => sum + (j.paymentStatus !== 'paid' ? (Math.max(0, (j.totalAmount || 0) - (j.paidAmount || 0))) : 0), 0);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">รอดำเนินการ</span>;
      case 'inspecting':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">กำลังตรวจเช็ค</span>;
      case 'waiting_parts':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">รออะไหล่</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">กำลังซ่อม</span>;
      case 'qc':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">ทดสอบ QC</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ซ่อมเสร็จ / รอลูกค้า</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">ส่งมอบแล้ว</span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🏁 ปิดใบซ่อมแล้ว</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Official Garage Logo Banner */}
      <GarageLogo variant="banner" />

      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16191D] p-6 rounded-xl border border-[#2D3135] shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold text-xs border border-orange-500/20 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>SONGKARN V1 GARAGE</span>
            </span>
            <span className="text-xs text-gray-400 font-medium">
              วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
            แผงควบคุมอู่ซ่อมรถยนต์ <span className="text-orange-500">Songkarn-v1</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-xl">
            บันทึกรับรถ ติดตามสถานะงานซ่อมแบบเรียลไทม์ เบิกตัดสต็อกอะไหล่ และออกใบแจ้งหนี้อัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('history')}
            className="px-4 py-2.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-300 font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            title="เปิดดูประวัติใบซ่อมย้อนหลังทั้งหมดและไทม์ไลน์การซ่อม"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>ประวัติใบซ่อมย้อนหลัง</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (setActiveTab) {
                setActiveTab('sheets');
              } else {
                setIsSheetsModalOpen(true);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 hover:text-white font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-500/10"
            title="เปิดดูและดึงข้อมูลสดจาก Google Sheets ทุกแผ่นงาน"
          >
            <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
            <span>ดูข้อมูล Google Sheets สด</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400 text-black font-black">
              LIVE
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsPromptPayModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-200 font-medium text-sm transition-all flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span>QR รับชำระเงิน</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className="px-4 py-2.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-200 font-medium text-sm transition-all flex items-center gap-2"
          >
            <Boxes className="w-4 h-4 text-orange-400" />
            <span>เช็คสต็อก ({spareParts.length})</span>
          </button>
          <button
            onClick={onOpenNewJobModal}
            className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ เปิดใบสั่งซ่อมใหม่</span>
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Active Jobs */}
        <div
          onClick={() => navigateTo('jobs')}
          className="bg-[#16191D] border border-[#2D3135] rounded-xl p-5 hover:border-orange-500/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400">Currently Service</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white">{activeJobs.length}</span>
            <span className="text-sm text-orange-500">Cars</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
            <span>ช่องซ่อมที่ใช้งาน</span>
            <span className="text-orange-400 font-mono font-bold">{serviceBays.filter(b => b.status === 'occupied').length} / {serviceBays.length} ลิฟต์</span>
          </div>
        </div>

        {/* Metric 2: Ready for Pickup */}
        <div
          onClick={() => navigateTo('jobs')}
          className="bg-[#16191D] border border-[#2D3135] rounded-xl p-5 hover:border-green-500/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400">Today Completed</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white">{completedJobs.length}</span>
            <span className="text-sm text-green-500">Done</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
            <span>ส่งมอบแล้ววันนี้</span>
            <span className="text-green-400 font-mono font-bold">{deliveredJobs.length} คัน</span>
          </div>
        </div>

        {/* Metric 3: Total Revenue */}
        <div
          onClick={() => navigateTo('billing')}
          className="bg-[#16191D] border border-[#2D3135] rounded-xl p-5 hover:border-orange-500/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400">Daily Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-mono font-bold text-white">฿{(totalRevenue / 1000).toFixed(1)}K</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
            <span>ยอดรอชำระ</span>
            <span className="text-orange-400 font-mono font-bold">฿{pendingRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 4: Low Stock Alerts */}
        <div
          onClick={() => navigateTo('inventory')}
          className={`bg-[#16191D] border rounded-xl p-5 transition-all cursor-pointer shadow-md group ${
            lowStockParts.length > 0 ? 'border-red-500/40 hover:border-red-500' : 'border-[#2D3135]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400">Low Stock Alert</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
              lowStockParts.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-[#0F1113] text-gray-400'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-mono font-bold ${lowStockParts.length > 0 ? 'text-red-400' : 'text-gray-200'}`}>
              {lowStockParts.length}
            </span>
            <span className="text-sm text-gray-400">Items</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
            <span>สินค้าทั้งหมด</span>
            <span className="text-gray-300 font-mono font-bold">{spareParts.length} ชนิด</span>
          </div>
        </div>

      </div>

      {/* Google Sheets Live Integration & Data Hub */}
      <div className="bg-[#14181D] border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>ข้อมูลที่ดึงมาจาก Google Sheets</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40 font-mono">
                    LIVE DATA
                  </span>
                </h2>
                <p className="text-sm font-semibold text-gray-200 mt-0.5">
                  เชื่อมโยงฐานข้อมูลจริงกับ Google Sheets ID:{' '}
                  <span className="font-mono text-orange-400 font-bold bg-[#0D1013] px-2 py-0.5 rounded border border-[#2D3135]">
                    {googleSheetsSyncStatus.spreadsheetId}
                  </span>
                </p>
              </div>
            </div>

            {/* Live Data Summary Pills */}
            <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
              <button
                type="button"
                onClick={() => navigateTo('sheets')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1013] hover:bg-[#1A2027] border border-emerald-500/40 text-gray-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📦 อะไหล่ในชีต:</span>
                <strong className="text-orange-400 font-mono font-bold text-sm">71 รายการ</strong>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('sheets')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1013] hover:bg-[#1A2027] border border-emerald-500/40 text-gray-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>👥 ลูกค้าในชีต:</span>
                <strong className="text-sky-400 font-mono font-bold text-sm">20 ราย</strong>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('sheets')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1013] hover:bg-[#1A2027] border border-emerald-500/40 text-gray-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📋 ใบสั่งซ่อมในชีต:</span>
                <strong className="text-emerald-400 font-mono font-bold text-sm">8 ใบงาน</strong>
              </button>

              {lastSheetPullAt && (
                <span className="px-3.5 py-1.5 rounded-xl bg-[#0D1013] border border-[#2D3135] text-gray-300 font-medium font-mono">
                  ดึงข้อมูลล่าสุด: <strong className="text-white font-bold">{lastSheetPullAt}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => navigateTo('sheets')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เปิดดูตารางข้อมูลสด (Live Sheets)</span>
            </button>

            <button
              type="button"
              disabled={isPullingSheets}
              onClick={() => pullDataFromGoogleSheets(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0D1013] hover:bg-[#1A2027] border border-emerald-500/50 text-emerald-300 hover:text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              title="ดึงข้อมูลล่าสุดจาก Google Sheets เข้าสู่ระบบอู่"
            >
              <ArrowDownCircle className={`w-4 h-4 ${isPullingSheets ? 'animate-spin' : ''}`} />
              <span>{isPullingSheets ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลสด (Pull)'}</span>
            </button>

            <a
              href={`https://docs.google.com/spreadsheets/d/${googleSheetsSyncStatus.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-[#0D1013] hover:bg-[#1A2027] border border-[#2D3135] text-gray-200 hover:text-white font-bold text-sm flex items-center gap-1.5 transition-all"
              title="เปิด Google Sheets ในแท็บใหม่"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>เปิดชีตจริง</span>
            </a>
          </div>
        </div>

        {/* Quick highlight of parts imported from Google Sheets */}
        <div className="mt-4 pt-4 border-t border-[#22272E] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0D1013]/70 border border-[#22272E] space-y-1">
            <span className="text-gray-400 font-medium">ตัวอย่างอะไหล่จากชีต</span>
            <p className="text-white font-bold truncate">
              {spareParts[0]?.name || 'แหวนรองหัวฉีด ISUZU (แท้) x 4 ตัว'}
            </p>
            <div className="flex items-center justify-between text-gray-300 font-mono">
              <span className="text-orange-400 font-bold">{spareParts[0]?.partCode || 'PART-001'}</span>
              <span className="text-emerald-400 font-bold">฿{spareParts[0]?.sellPrice?.toLocaleString() || '180'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0D1013]/70 border border-[#22272E] space-y-1">
            <span className="text-gray-400 font-medium">ตัวอย่างลูกค้าจากชีต</span>
            <p className="text-white font-bold truncate">
              {customers[0]?.name || 'คุณสมชาย ใจดี'}
            </p>
            <div className="flex items-center justify-between text-gray-300 font-mono">
              <span className="text-sky-400 font-bold">{customers[0]?.phone || '081-234-5678'}</span>
              <span className="text-gray-300">{customers[0]?.vehicles?.[0]?.licensePlate || '1กข-9999 กทม'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0D1013]/70 border border-[#22272E] space-y-1">
            <span className="text-gray-400 font-medium">ตัวอย่างใบสั่งซ่อมจากชีต</span>
            <p className="text-white font-bold truncate">
              {jobOrders[0]?.issueDescription || 'ตรวจเช็คระยะ 50,000 กม.'}
            </p>
            <div className="flex items-center justify-between text-gray-300 font-mono">
              <span className="text-orange-400 font-bold">{jobOrders[0]?.jobNo || 'JOB-001'}</span>
              <span className="text-emerald-400 font-bold">฿{jobOrders[0]?.totalAmount?.toLocaleString() || '2,450'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Service Bays / Hoists Floor Map (ช่องซ่อม 1 - 3) */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" />
                <span>สถานะช่องซ่อม & ลิฟต์ยกรถ (Live Service Bays)</span>
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              แสดงรถที่กำลังประจำการในแต่ละช่องซ่อม ช่างผู้รับผิดชอบ และความคืบหน้า (3 ช่องซ่อม)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> ว่าง
            </span>
            <span className="flex items-center gap-1 text-gray-300 ml-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> กำลังซ่อม
            </span>
            <span className="flex items-center gap-1 text-gray-300 ml-2">
              <span className="w-2 h-2 rounded-full bg-gray-600"></span> ซ่อมบำรุง
            </span>
          </div>
        </div>

        {/* 3 Bays Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {serviceBays.map((bay) => {
            const currentJob = jobOrders.find(
              (j) =>
                (bay.currentJobId && j.id === bay.currentJobId) ||
                (j.bayNumber === bay.bayNumber && j.status !== 'delivered' && j.status !== 'completed' && j.status !== 'closed')
            );
            const isOccupied = (bay.status === 'occupied' || !!currentJob) && bay.status !== 'maintenance' && !!currentJob;

            return (
              <div
                key={bay.id}
                onClick={() => {
                  if (currentJob) {
                    onSelectJob(currentJob.id);
                  }
                }}
                className={`p-4 rounded-xl border transition-all ${
                  isOccupied
                    ? 'bg-[#1C2025] border-orange-500/40 hover:border-orange-500 cursor-pointer'
                    : bay.status === 'maintenance'
                    ? 'bg-[#0F1113] border-[#2D3135] opacity-60'
                    : 'bg-[#0F1113] border-[#2D3135] hover:border-green-500/40'
                }`}
              >
                {/* Bay Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2D3135]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                        isOccupied
                          ? 'bg-orange-500 text-white font-black'
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}
                    >
                      #{bay.bayNumber}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-200">{bay.name}</h3>
                      <span className="text-[10px] text-gray-400 capitalize">{bay.type}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      isOccupied
                        ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        : bay.status === 'maintenance'
                        ? 'bg-[#1C2025] text-gray-400 border border-[#2D3135]'
                        : 'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}
                  >
                    {isOccupied ? 'กำลังทำงาน' : bay.status === 'maintenance' ? 'ปิดปรับปรุง' : 'ว่าง พร้อมรับ'}
                  </span>
                </div>

                {/* Bay Content */}
                {isOccupied && currentJob ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-orange-400 font-mono text-sm">{currentJob.licensePlate}</span>
                        </div>
                        <p className="text-xs text-gray-300 font-medium">
                          {currentJob.carBrand} {currentJob.carModel}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(currentJob.status)}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-1 bg-[#0F1113] p-1.5 rounded border border-[#2D3135]">
                      🔧 {currentJob.issueDescription}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-gray-400">
                      <span>ช่าง: <strong className="text-gray-200">{currentJob.mechanicName || 'ยังไม่ระบุ'}</strong></span>
                      <span className="text-orange-400 font-mono font-semibold">฿{currentJob.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 py-3 text-center">
                    <p className="text-xs text-gray-500">ช่องซ่อมว่าง พร้อมรับรถเข้าซ่อม</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewJobModal();
                      }}
                      className="mt-2 text-xs font-semibold text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                    >
                      + เปิดรับรถช่องนี้
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Urgent / Active Work Orders + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active & Urgent Job Orders List */}
        <div className="lg:col-span-2 bg-[#16191D] border border-[#2D3135] rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2D3135] bg-[#1C2025] flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-white tracking-tight flex items-center gap-2 text-sm sm:text-base">
                <Car className="w-4 h-4 text-orange-500" />
                <span>Active Repair Queue ({activeJobs.length} รายการ)</span>
              </h2>
              <div className="text-xs text-gray-400">Showing latest records from Songkarn-v1</div>
            </div>
            <button
              onClick={() => navigateTo('jobs')}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {activeJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-gray-300">ไม่มีงานซ่อมที่ค้างอยู่</p>
                <p className="text-xs text-gray-500 mt-1">กดปุ่ม "เปิดใบสั่งซ่อมใหม่" เพื่อรับรถคันแรก</p>
              </div>
            ) : (
              activeJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className="p-3.5 bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-orange-400 font-mono text-base">{job.licensePlate}</span>
                        <span className="text-sm text-gray-100 font-bold">{job.carBrand} {job.carModel}</span>
                        {job.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
                            ด่วนมาก 🔥
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-200 mt-0.5 line-clamp-1 font-medium">
                        อาการ: {job.issueDescription}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-300 font-medium">
                        <span>ลูกค้า: <strong className="text-white font-bold">{job.customerName}</strong></span>
                        <span>•</span>
                        <span>ช่องซ่อม #{job.bayNumber || '-'}</span>
                        <span>•</span>
                        <span>ช่าง: <strong className="text-gray-100">{job.mechanicName || 'ยังไม่มอบหมาย'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2D3135]">
                    {getStatusBadge(job.status)}
                    <span className="text-base font-mono font-bold text-emerald-400">
                      ฿{job.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Fast Stats */}
        <div className="space-y-6">
          
          {/* Low Stock Widget */}
          <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>เตือนอะไหล่ใกล้หมด ({lowStockParts.length})</span>
              </h2>
              <button
                onClick={() => navigateTo('inventory')}
                className="text-xs text-orange-400 hover:underline font-semibold"
              >
                ดูสต็อก
              </button>
            </div>

            {lowStockParts.length === 0 ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                <p className="text-xs text-green-400 font-semibold">สต็อกอะไหล่ทุกรายการเพียงพอ</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockParts.slice(0, 4).map((part) => (
                  <div
                    key={part.id}
                    className="p-3.5 bg-[#0F1113] border border-red-500/30 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-white line-clamp-1">{part.name}</p>
                      <p className="text-xs text-gray-300 font-mono font-semibold mt-0.5">{part.partCode} • {part.locationRack || 'โซนทั่วไป'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30">
                        เหลือ {part.stockQty} {part.unit}
                      </span>
                      <p className="text-xs text-gray-300 mt-1 font-medium">ขั้นต่ำ {part.minStockQty}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Staff Mechanic Status */}
          <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                <span>ทีมช่างประจำอู่ ({mechanics.length} ท่าน)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsMechanicModalOpen(true)}
                className="text-xs text-orange-400 hover:text-orange-300 font-bold hover:underline flex items-center gap-1"
              >
                <span>+ จัดการรายชื่อช่าง</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {mechanics.slice(0, 4).map((mech, index) => (
                <div
                  key={mech.id}
                  onClick={() => setIsMechanicModalOpen(true)}
                  className="p-3 bg-[#0F1113] border border-[#2D3135] rounded-xl flex items-center justify-between text-xs hover:border-orange-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-xs shrink-0 font-mono group-hover:scale-105 transition-transform">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-gray-200 group-hover:text-white">{mech.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                          {mech.positionTitle || `ตำแหน่งที่ ${index + 1}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(mech.specialties || []).slice(0, 2).join(' • ')}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      mech.status === 'available'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}
                  >
                    {mech.status === 'available' ? 'พร้อมรับงาน' : 'กำลังซ่อม'}
                  </span>
                </div>
              ))}
            </div>

            {mechanics.length > 4 && (
              <button
                type="button"
                onClick={() => setIsMechanicModalOpen(true)}
                className="w-full py-1 text-center text-xs text-gray-400 hover:text-orange-400 font-medium"
              >
                ดูช่างทั้งหมด {mechanics.length} ท่าน →
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Quick PromptPay QR Modal */}
      <PromptPayQRModal
        isOpen={isPromptPayModalOpen}
        onClose={() => setIsPromptPayModalOpen(false)}
      />

      {/* Google Sheets Live Pull & Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        targetTab="fetch"
      />

      {/* Mechanic Manager Modal */}
      <MechanicManagerModal
        isOpen={isMechanicModalOpen}
        onClose={() => setIsMechanicModalOpen(false)}
      />

    </div>
  );
};

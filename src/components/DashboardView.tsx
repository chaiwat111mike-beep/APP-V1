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
  QrCode
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobStatus } from '../types';
import { GarageLogo } from './GarageLogo';
import { PromptPayQRModal } from './PromptPayQRModal';

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
  const navigateTo = (tab: string) => {
    if (setActiveTab) setActiveTab(tab);
    if (onNavigateTab) onNavigateTab(tab);
  };
  const { jobOrders, spareParts, serviceBays, mechanics } = useGarage();

  const activeJobs = jobOrders.filter((j) => j.status !== 'delivered' && j.status !== 'completed');
  const completedJobs = jobOrders.filter((j) => j.status === 'completed');
  const deliveredJobs = jobOrders.filter((j) => j.status === 'delivered');
  const lowStockParts = spareParts.filter((p) => p.stockQty <= p.minStockQty);
  
  const totalRevenue = jobOrders.reduce((sum, j) => sum + (j.paidAmount || (j.paymentStatus === 'paid' ? j.totalAmount : 0)), 0);
  const pendingRevenue = jobOrders.reduce((sum, j) => sum + (j.paymentStatus !== 'paid' ? (j.totalAmount - (j.paidAmount || 0)) : 0), 0);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">รอดำเนินการ</span>;
      case 'inspecting':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">กำลังตรวจเช็ค</span>;
      case 'waiting_parts':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">รออะไหล่</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">กำลังซ่อม</span>;
      case 'qc':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">ทดสอบ QC</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">ซ่อมเสร็จ / รอลูกค้า</span>;
      case 'delivered':
        return <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-[#0F1113] text-gray-400 border border-[#2D3135]">ส่งมอบแล้ว</span>;
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
            onClick={() => setIsPromptPayModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-300 font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-sm"
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
            const currentJob = jobOrders.find((j) => j.id === bay.currentJobId);
            const isOccupied = bay.status === 'occupied' && currentJob;

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
                        <span className="font-bold text-orange-400 font-mono text-sm">{job.licensePlate}</span>
                        <span className="text-xs text-gray-300 font-medium">{job.carBrand} {job.carModel}</span>
                        {job.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
                            Urgent 🔥
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        อาการ: {job.issueDescription}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                        <span>ลูกค้า: <strong className="text-gray-300">{job.customerName}</strong></span>
                        <span>•</span>
                        <span>ช่องซ่อม #{job.bayNumber || '-'}</span>
                        <span>•</span>
                        <span>ช่าง: {job.mechanicName || 'ยังไม่มอบหมาย'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2D3135]">
                    {getStatusBadge(job.status)}
                    <span className="text-sm font-mono font-bold text-white">
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
                    className="p-3 bg-[#0F1113] border border-red-500/20 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-200 line-clamp-1">{part.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{part.partCode} • {part.locationRack || 'โซนทั่วไป'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        เหลือ {part.stockQty} {part.unit}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">ขั้นต่ำ {part.minStockQty}</p>
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
                onClick={() => navigateTo('bays')}
                className="text-xs text-orange-400 hover:underline font-semibold"
              >
                จัดการช่าง
              </button>
            </div>

            <div className="space-y-2">
              {mechanics.map((mech) => (
                <div
                  key={mech.id}
                  className="p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1C2025] border border-[#2D3135] flex items-center justify-center font-bold text-orange-400 text-xs">
                      {mech.name.slice(4, 5)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200">{mech.name}</p>
                      <p className="text-[10px] text-gray-400">{mech.specialties.join(', ')}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
          </div>

        </div>

      </div>

      {/* Quick PromptPay QR Modal */}
      <PromptPayQRModal
        isOpen={isPromptPayModalOpen}
        onClose={() => setIsPromptPayModalOpen(false)}
      />

    </div>
  );
};

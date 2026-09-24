import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Eye,
  Download,
  DollarSign,
  User,
  Phone,
  Wrench,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Check,
  Tag,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobStatus, PaymentStatus } from '../types';
import { formatThaiDateTime, formatThaiDate } from '../utils/jobCalculator';
import { downloadCsvFile } from '../services/googleSheetsService';

interface RepairHistoryViewProps {
  onSelectJob: (jobId: string) => void;
  onPrintJob: (job: JobOrder, docType: 'job_order' | 'quotation' | 'receipt') => void;
  onOpenNewJobModal?: () => void;
}

export const RepairHistoryView: React.FC<RepairHistoryViewProps> = ({
  onSelectJob,
  onPrintJob,
  onOpenNewJobModal,
}) => {
  const { jobOrders, mechanics } = useGarage();

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [mechanicFilter, setMechanicFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<
    'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // View Modes: 'all_orders' (flat list) or 'by_vehicle' (grouped by vehicle timeline)
  const [viewMode, setViewMode] = useState<'all_orders' | 'by_vehicle'>('all_orders');
  
  // Sorting
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'mileage_desc'>('date_desc');

  // Expanded vehicle plate in 'by_vehicle' view
  const [expandedVehiclePlate, setExpandedVehiclePlate] = useState<string | null>(null);

  // Quick filter to specific vehicle plate when clicking on a plate tag
  const [selectedPlateTag, setSelectedPlateTag] = useState<string | null>(null);

  // 1. Filter logic
  const filteredJobs = useMemo(() => {
    return jobOrders.filter((job) => {
      // Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (job.licensePlate || '').toLowerCase().includes(q) ||
        (job.customerName || '').toLowerCase().includes(q) ||
        (job.customerPhone || '').includes(q) ||
        (job.jobNo || '').toLowerCase().includes(q) ||
        (job.carBrand || '').toLowerCase().includes(q) ||
        (job.carModel || '').toLowerCase().includes(q) ||
        (job.issueDescription || '').toLowerCase().includes(q) ||
        (job.mechanicName && job.mechanicName.toLowerCase().includes(q)) ||
        (job.technicianNotes && job.technicianNotes.toLowerCase().includes(q)) ||
        (job.partsUsed || []).some((p) => (p.partName || '').toLowerCase().includes(q) || (p.partCode || '').toLowerCase().includes(q));

      // Specific Plate Tag Filter
      const matchesPlateTag = !selectedPlateTag || (job.licensePlate || '').trim().toLowerCase() === selectedPlateTag.trim().toLowerCase();

      // Status Filter
      let matchesStatus = true;
      if (statusFilter === 'delivered') {
        matchesStatus = job.status === 'delivered';
      } else if (statusFilter === 'completed') {
        matchesStatus = job.status === 'completed';
      } else if (statusFilter === 'finished_all') {
        matchesStatus = job.status === 'completed' || job.status === 'delivered';
      } else if (statusFilter === 'in_progress') {
        matchesStatus = job.status === 'in_progress' || job.status === 'inspecting' || job.status === 'qc';
      } else if (statusFilter !== 'all') {
        matchesStatus = job.status === statusFilter;
      }

      // Payment Filter
      const matchesPayment = paymentFilter === 'all' || job.paymentStatus === paymentFilter;

      // Mechanic Filter
      const matchesMechanic = mechanicFilter === 'all' || job.mechanicName === mechanicFilter;

      // Date Filter
      let matchesDate = true;
      const jobTime = new Date(job.createdAt).getTime();
      const now = new Date();

      if (dateRangePreset === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        matchesDate = jobTime >= startOfDay;
      } else if (dateRangePreset === 'this_week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
        matchesDate = jobTime >= startOfWeek;
      } else if (dateRangePreset === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        matchesDate = jobTime >= startOfMonth;
      } else if (dateRangePreset === 'this_year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
        matchesDate = jobTime >= startOfYear;
      } else if (dateRangePreset === 'custom') {
        if (startDate) {
          const s = new Date(startDate).getTime();
          if (jobTime < s) matchesDate = false;
        }
        if (endDate) {
          const e = new Date(endDate + 'T23:59:59').getTime();
          if (jobTime > e) matchesDate = false;
        }
      }

      return matchesSearch && matchesPlateTag && matchesStatus && matchesPayment && matchesMechanic && matchesDate;
    });
  }, [
    jobOrders,
    searchQuery,
    selectedPlateTag,
    statusFilter,
    paymentFilter,
    mechanicFilter,
    dateRangePreset,
    startDate,
    endDate,
  ]);

  // 2. Sorting
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'amount_desc') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      if (sortBy === 'mileage_desc') {
        return (b.mileage || 0) - (a.mileage || 0);
      }
      return 0;
    });
  }, [filteredJobs, sortBy]);

  // 3. Group by Vehicle (for 'by_vehicle' mode)
  const vehicleGroups = useMemo(() => {
    const map = new Map<string, {
      licensePlate: string;
      brand: string;
      model: string;
      customerName: string;
      customerPhone: string;
      latestMileage: number;
      totalSpent: number;
      jobs: JobOrder[];
    }>();

    sortedJobs.forEach((job) => {
      const plateKey = job.licensePlate.trim();
      if (!map.has(plateKey)) {
        map.set(plateKey, {
          licensePlate: plateKey,
          brand: job.carBrand,
          model: job.carModel,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          latestMileage: job.mileage || 0,
          totalSpent: 0,
          jobs: [],
        });
      }
      const entry = map.get(plateKey)!;
      entry.jobs.push(job);
      entry.totalSpent += job.totalAmount || 0;
      if (job.mileage > entry.latestMileage) {
        entry.latestMileage = job.mileage;
      }
    });

    // Sort jobs inside each vehicle from newest to oldest
    const result = Array.from(map.values()).map((v) => ({
      ...v,
      jobs: v.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));

    // Sort vehicles by total visits or total spent
    return result.sort((a, b) => b.jobs.length - a.jobs.length);
  }, [sortedJobs]);

  // 4. Key Metrics
  const stats = useMemo(() => {
    const totalCount = filteredJobs.length;
    const deliveredCount = filteredJobs.filter((j) => j.status === 'delivered').length;
    const completedCount = filteredJobs.filter((j) => j.status === 'completed').length;
    const totalRevenue = filteredJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0);
    const paidRevenue = filteredJobs.reduce(
      (sum, j) => sum + (j.paidAmount || (j.paymentStatus === 'paid' ? j.totalAmount : 0)),
      0
    );
    const uniqueVehicles = new Set(filteredJobs.map((j) => j.licensePlate.trim().toLowerCase())).size;

    return {
      totalCount,
      deliveredCount,
      completedCount,
      totalRevenue,
      paidRevenue,
      uniqueVehicles,
    };
  }, [filteredJobs]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'เลขที่ใบสั่งซ่อม',
      'วันที่รับรถ',
      'วันที่ปิดงาน/ส่งมอบ',
      'ทะเบียนรถ',
      'ยี่ห้อ/รุ่น',
      'ชื่อลูกค้า',
      'เบอร์โทร',
      'เลขไมล์ (กม.)',
      'อาการเสียที่แจ้ง',
      'รายการอะไหล่ที่เปลี่ยน',
      'ค่าแรงช่าง (บาท)',
      'ยอดเงินรวมทั้งสิ้น (บาท)',
      'สถานะงานซ่อม',
      'สถานะการชำระเงิน',
      'ช่างผู้รับผิดชอบ',
      'บันทึกของช่าง',
    ];

    const rows = sortedJobs.map((j) => [
      j.jobNo,
      j.receivedDate ? formatThaiDateTime(j.receivedDate) : formatThaiDateTime(j.createdAt),
      j.deliveredAt ? formatThaiDateTime(j.deliveredAt) : (j.completedAt ? formatThaiDateTime(j.completedAt) : '-'),
      j.licensePlate,
      `${j.carBrand} ${j.carModel}`,
      j.customerName,
      j.customerPhone,
      j.mileage || 0,
      j.issueDescription || '',
      (j.partsUsed || []).map((p) => `${p.partName} x${p.quantity}`).join('; '),
      j.laborFee || 0,
      j.totalAmount || 0,
      getStatusLabel(j.status),
      j.paymentStatus === 'paid' ? 'ชำระแล้ว' : (j.paymentStatus === 'deposit' ? 'มัดจำแล้ว' : 'ค้างชำระ'),
      j.mechanicName || '',
      j.technicianNotes || '',
    ]);

    const filename = `repair_history_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(filename, [headers, ...rows]);
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">รอดำเนินการ</span>;
      case 'inspecting':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">ตรวจเช็ค</span>;
      case 'waiting_parts':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">รออะไหล่</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">กำลังซ่อม</span>;
      case 'qc':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">ทดสอบ QC</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">ซ่อมเสร็จ</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#1C2025] text-gray-300 border border-[#2D3135]">ส่งมอบแล้ว</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  function getStatusLabel(status: JobStatus): string {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'inspecting': return 'กำลังตรวจเช็ค';
      case 'waiting_parts': return 'รออะไหล่';
      case 'in_progress': return 'กำลังซ่อม';
      case 'qc': return 'ทดสอบ QC';
      case 'completed': return 'ซ่อมเสร็จสมบูรณ์';
      case 'delivered': return 'ส่งมอบรถแล้ว';
      default: return status;
    }
  }

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedPlateTag(null);
    setStatusFilter('all');
    setPaymentFilter('all');
    setMechanicFilter('all');
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedPlateTag ||
    statusFilter !== 'all' ||
    paymentFilter !== 'all' ||
    mechanicFilter !== 'all' ||
    dateRangePreset !== 'all' ||
    sortBy !== 'date_desc';

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1.5 font-mono">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>REPAIR HISTORY ARCHIVE</span>
            </span>
            <span className="text-xs text-gray-400">คลังประวัติใบสั่งซ่อมย้อนหลัง</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2 flex items-center gap-2">
            <span>ประวัติใบสั่งซ่อม & งานซ่อมย้อนหลัง</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            ค้นหาและเปิดดูรายละเอียดใบซ่อมย้อนหลังทุกรายการ เช็คประวัติการซ่อมบำรุงตามทะเบียนรถ ดูอะไหล่ที่เคยเปลี่ยน ย้อนรอยเลขไมล์ พร้อมพิมพ์ใบเสร็จย้อนหลังได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="ดาวน์โหลดประวัติใบสั่งซ่อมทั้งหมดเป็นไฟล์ CSV (เปิดใน Excel ได้ทันที)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>ส่งออก CSV (Excel)</span>
          </button>

          {onOpenNewJobModal && (
            <button
              type="button"
              onClick={onOpenNewJobModal}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <span>+ เปิดใบสั่งซ่อมใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>ใบสั่งซ่อมในประวัติ</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white">{stats.totalCount}</span>
            <span className="text-xs text-gray-400">ใบ</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            จากทั้งหมด <span className="font-mono text-gray-200 font-bold">{jobOrders.length}</span> รายการ
          </div>
        </div>

        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>ส่งมอบรถสำเร็จแล้ว</span>
            <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-green-400">{stats.deliveredCount}</span>
            <span className="text-xs text-gray-400">คัน</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            พร้อมส่งมอบอีก <span className="font-mono text-yellow-400 font-bold">{stats.completedCount}</span> คัน
          </div>
        </div>

        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>รถยนต์ในประวัติ</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Car className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-400">{stats.uniqueVehicles}</span>
            <span className="text-xs text-gray-400">คัน (ไม่ซ้ำ)</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            ตามทะเบียนที่บันทึก
          </div>
        </div>

        <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>ยอดเงินรวมในประวัติ</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
              ฿{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            ชำระแล้ว ฿{stats.paidRevenue.toLocaleString()}
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        
        {/* Top Search Input & View Switcher */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาทะเบียนรถ, เลขที่ใบสั่งซ่อม (JOB-...), ชื่อลูกค้า, เบอร์โทร, อาการเสีย, อะไหล่..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#0F1113] border border-[#2D3135] rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('all_orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'all_orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ตารางใบซ่อมทั้งหมด ({filteredJobs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('by_vehicle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'by_vehicle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>ประวัติแยกตามทะเบียนรถ ({vehicleGroups.length})</span>
            </button>
          </div>
        </div>

        {/* Selected Plate Tag Filter indicator */}
        {selectedPlateTag && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
            <span className="text-gray-300">กำลังกรองดูเฉพาะรถทะเบียน:</span>
            <span className="font-mono font-black text-slate-900 bg-amber-400 px-2.5 py-0.5 rounded text-xs shadow-sm">
              {selectedPlateTag}
            </span>
            <button
              type="button"
              onClick={() => setSelectedPlateTag(null)}
              className="ml-auto text-amber-400 hover:text-amber-300 underline font-semibold text-xs"
            >
              ล้างการกรองทะเบียนนี้
            </button>
          </div>
        )}

        {/* Filter Pills & Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs pt-1 border-t border-[#2D3135]/60">
          
          {/* 1. Date Range Preset */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-medium">ช่วงเวลาเข้าซ่อม:</label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value as any)}
              className="w-full p-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">ทั้งหมด (All Time)</option>
              <option value="today">วันนี้</option>
              <option value="this_week">สัปดาห์นี้</option>
              <option value="this_month">เดือนนี้</option>
              <option value="this_year">ปีนี้</option>
              <option value="custom">กำหนดช่วงวันเอง...</option>
            </select>
          </div>

          {/* 2. Status Filter */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-medium">สถานะงานซ่อม:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="finished_all">ซ่อมเสร็จ & ส่งมอบแล้ว</option>
              <option value="delivered">ส่งมอบแล้ว (Delivered)</option>
              <option value="completed">ซ่อมเสร็จสมบูรณ์ (Completed)</option>
              <option value="in_progress">กำลังดำเนินการซ่อม</option>
              <option value="pending">รอดำเนินการ</option>
            </select>
          </div>

          {/* 3. Payment Filter */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-medium">การชำระเงิน:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full p-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">ทุกสถานะการเงิน</option>
              <option value="paid">ชำระเงินแล้ว (Paid)</option>
              <option value="deposit">วางมัดจำแล้ว (Deposit)</option>
              <option value="unpaid">ค้างชำระ (Unpaid)</option>
            </select>
          </div>

          {/* 4. Mechanic Filter */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-medium">ช่างผู้รับผิดชอบ:</label>
            <select
              value={mechanicFilter}
              onChange={(e) => setMechanicFilter(e.target.value)}
              className="w-full p-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">ช่างทุกคน</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-medium">เรียงลำดับตาม:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="date_desc">วันที่ล่าสุด → เก่าสุด</option>
              <option value="date_asc">วันที่เก่าสุด → ล่าสุด</option>
              <option value="amount_desc">ยอดเงินสูงสุด → ต่ำสุด</option>
              <option value="mileage_desc">เลขไมล์มากสุด → น้อยสุด</option>
            </select>
          </div>

        </div>

        {/* Custom Date Pickers if selected */}
        {dateRangePreset === 'custom' && (
          <div className="p-3 bg-[#0F1113] rounded-xl border border-[#2D3135] flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-300 font-medium">ระบุช่วงวันที่ย้อนหลัง:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">จาก:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 bg-[#16191D] border border-[#2D3135] rounded-lg text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">ถึง:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 bg-[#16191D] border border-[#2D3135] rounded-lg text-white"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-gray-400 hover:text-white underline text-[11px]"
              >
                ล้างวันที่
              </button>
            )}
          </div>
        )}

        {/* Reset filters button if any filter is active */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>
              พบ <strong className="text-white font-mono">{filteredJobs.length}</strong> รายการ จากการกรอง
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}

      </div>

      {/* 4. MAIN CONTENT AREA */}
      {viewMode === 'all_orders' ? (
        
        /* MODE A: All Orders List */
        <div className="space-y-3">
          {sortedJobs.length === 0 ? (
            <div className="p-12 text-center bg-[#16191D] border border-[#2D3135] rounded-2xl">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-300">ไม่พบประวัติใบสั่งซ่อมที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-gray-500 mt-1">ลองเปลี่ยนคำค้นหา ทะเบียนรถ หรือรีเซ็ตตัวกรอง</p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0F1113] border border-[#2D3135] hover:border-blue-500 text-blue-400 text-xs font-semibold"
              >
                รีเซ็ตตัวกรอง
              </button>
            </div>
          ) : (
            sortedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-[#16191D] border border-[#2D3135] hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 transition-all shadow-md group space-y-3"
              >
                {/* Header row: Job No, Date, Plate, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#2D3135]/60">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg text-xs border border-blue-500/20">
                      {job.jobNo}
                    </span>

                    {/* License Plate Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlateTag(job.licensePlate);
                        setViewMode('by_vehicle');
                        setExpandedVehiclePlate(job.licensePlate.trim());
                      }}
                      title="คลิกเพื่อดูประวัติการซ่อมทั้งหมดของรถทะเบียนนี้"
                      className="font-mono font-black text-slate-900 bg-amber-400 hover:bg-amber-300 px-2.5 py-0.5 rounded text-xs shadow-sm transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>{job.licensePlate}</span>
                    </button>

                    <span className="font-semibold text-gray-200 text-xs sm:text-sm">
                      {job.carBrand} {job.carModel} {job.carYear ? `(${job.carYear})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(job.status)}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        job.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : job.paymentStatus === 'deposit'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {job.paymentStatus === 'paid' ? 'ชำระแล้ว' : (job.paymentStatus === 'deposit' ? 'มัดจำแล้ว' : 'ค้างชำระ')}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Customer, Mileage, Symptoms, Parts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  
                  {/* Col 1: Customer & Date Info */}
                  <div className="space-y-1.5">
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <strong className="text-gray-200">{job.customerName}</strong>
                    </p>
                    <p className="text-gray-400 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <a href={`tel:${job.customerPhone}`} className="hover:text-blue-400 hover:underline">
                        {job.customerPhone}
                      </a>
                    </p>
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>
                        รับรถ: <strong className="text-gray-300 font-mono">{job.receivedDate ? formatThaiDateTime(job.receivedDate) : formatThaiDateTime(job.createdAt)}</strong>
                      </span>
                    </p>
                    {job.deliveredAt && (
                      <p className="text-gray-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span>
                          ส่งมอบ: <strong className="text-green-400 font-mono">{formatThaiDateTime(job.deliveredAt)}</strong>
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Col 2: Mileage & Repair Issue */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">เลขไมล์ตอนซ่อม:</span>
                      <span className="font-mono font-bold text-gray-200 bg-[#0F1113] px-2 py-0.5 rounded border border-[#2D3135]">
                        {(job.mileage || 0).toLocaleString()} กม.
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">อาการเสีย / งานที่ทำ:</span>
                      <p className="text-gray-200 font-medium line-clamp-2 mt-0.5 bg-[#0F1113] p-2 rounded-lg border border-[#2D3135]">
                        {job.issueDescription || '-'}
                      </p>
                    </div>

                    {job.mechanicName && (
                      <p className="text-gray-400 flex items-center gap-1 text-[11px]">
                        <Wrench className="w-3 h-3 text-orange-400" />
                        <span>ช่างผู้ดูแล: <strong className="text-gray-300">{job.mechanicName}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* Col 3: Parts Replaced & Total Financials */}
                  <div className="space-y-2 md:text-right flex flex-col justify-between">
                    <div>
                      <span className="text-gray-400 block text-[11px] mb-1">
                        อะไหล่ที่เปลี่ยน ({(job.partsUsed || []).length} รายการ):
                      </span>
                      {(job.partsUsed || []).length === 0 ? (
                        <span className="text-gray-500 italic">ไม่มีการเบิกอะไหล่ (เฉพาะค่าแรง)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 md:justify-end">
                          {(job.partsUsed || []).slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-[#0F1113] text-gray-300 border border-[#2D3135] px-2 py-0.5 rounded font-mono"
                            >
                              {p.partName} x{p.quantity}
                            </span>
                          ))}
                          {(job.partsUsed || []).length > 3 && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                              +{(job.partsUsed || []).length - 3} ชิ้น
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#2D3135]/40">
                      <div className="text-gray-400 text-[11px]">ยอดค่าใช้จ่ายทั้งสิ้น</div>
                      <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                        ฿{(job.totalAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        (ค่าแรง ฿{(job.laborFee || 0).toLocaleString()} • อะไหล่ ฿{((job.partsUsed || []).reduce((s, p) => s + (p.totalPrice || 0), 0)).toLocaleString()})
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-[#2D3135]/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPrintJob(job, 'receipt')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                      title="พิมพ์ใบเสร็จรับเงิน / ใบแจ้งหนี้ย้อนหลัง"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>พิมพ์ใบเสร็จย้อนหลัง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintJob(job, 'job_order')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                      title="พิมพ์ใบรับรถ / ใบสั่งซ่อมฉบับเต็ม"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>พิมพ์ใบสั่งซ่อม</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectJob(job.id)}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>เปิดดูรายละเอียดใบซ่อมนี้</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      ) : (

        /* MODE B: Grouped By Vehicle Timeline */
        <div className="space-y-4">
          {vehicleGroups.length === 0 ? (
            <div className="p-12 text-center bg-[#16191D] border border-[#2D3135] rounded-2xl">
              <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-300">ไม่พบข้อมูลรถยนต์ตามตัวกรอง</p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-blue-400 text-xs font-semibold"
              >
                รีเซ็ตตัวกรอง
              </button>
            </div>
          ) : (
            vehicleGroups.map((v) => {
              const isExpanded = expandedVehiclePlate === v.licensePlate;
              return (
                <div
                  key={v.licensePlate}
                  className="bg-[#16191D] border border-[#2D3135] rounded-2xl overflow-hidden shadow-lg transition-all"
                >
                  {/* Vehicle Card Header */}
                  <div
                    onClick={() => setExpandedVehiclePlate(isExpanded ? null : v.licensePlate)}
                    className="p-4 sm:p-5 cursor-pointer hover:bg-[#1C2025]/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <Car className="w-6 h-6 text-amber-400" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-slate-900 bg-amber-400 px-3 py-1 rounded text-sm shadow-sm">
                            {v.licensePlate}
                          </span>
                          <span className="font-bold text-white text-base">
                            {v.brand} {v.model}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                          <span>เจ้าของ: <strong className="text-gray-200">{v.customerName}</strong></span>
                          <span>•</span>
                          <span className="font-mono">{v.customerPhone}</span>
                          <span>•</span>
                          <span>ไมล์ล่าสุด: <strong className="text-amber-400 font-mono">{v.latestMileage.toLocaleString()} กม.</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#2D3135]">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-gray-400 block">เข้าซ่อมทั้งหมด</span>
                        <span className="text-base font-bold text-blue-400 font-mono">
                          {v.jobs.length} ครั้ง
                        </span>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-gray-400 block">ยอดซ่อมสะสม</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">
                          ฿{v.totalSpent.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-[#0F1113] border border-[#2D3135] flex items-center justify-center text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timeline of Repairs for this Vehicle */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-[#0F1113] border-t border-[#2D3135] space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-4 h-4 text-blue-400" />
                          <span>ไทม์ไลน์ประวัติการซ่อมบำรุง ({v.jobs.length} ครั้ง เรียงจากล่าสุด)</span>
                        </h4>
                        <span className="text-[11px] text-gray-500 font-mono">
                          ทะเบียน {v.licensePlate}
                        </span>
                      </div>

                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2D3135]">
                        {v.jobs.map((job, idx) => {
                          const prevJob = v.jobs[idx + 1];
                          const mileageDiff = prevJob && job.mileage && prevJob.mileage ? job.mileage - prevJob.mileage : null;

                          return (
                            <div key={job.id} className="relative group">
                              {/* Dot on timeline */}
                              <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[#0F1113] shadow-sm group-hover:scale-125 transition-transform" />

                              <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 space-y-2.5 hover:border-blue-500/40 transition-colors">
                                
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                      {job.jobNo}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium font-mono">
                                      {job.receivedDate ? formatThaiDateTime(job.receivedDate) : formatThaiDateTime(job.createdAt)}
                                    </span>
                                    {getStatusBadge(job.status)}
                                  </div>

                                  <div className="text-right">
                                    <span className="font-mono font-bold text-sm text-emerald-400">
                                      ฿{job.totalAmount.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Mileage info with difference */}
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-400">เลขไมล์:</span>
                                  <span className="font-mono font-bold text-gray-200">
                                    {(job.mileage || 0).toLocaleString()} กม.
                                  </span>
                                  {mileageDiff !== null && mileageDiff > 0 && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                                      (+{mileageDiff.toLocaleString()} กม. จากรอบก่อน)
                                    </span>
                                  )}
                                </div>

                                {/* Issue */}
                                <div className="text-xs">
                                  <span className="text-gray-400 font-medium">อาการที่แจ้ง: </span>
                                  <span className="text-gray-200">{job.issueDescription}</span>
                                </div>

                                {/* Parts Changed */}
                                {(job.partsUsed || []).length > 0 && (
                                  <div className="text-xs pt-1">
                                    <span className="text-gray-400 block text-[11px] mb-1">อะไหล่ที่เปลี่ยน:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {(job.partsUsed || []).map((p, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className="text-[11px] bg-[#0F1113] border border-[#2D3135] text-gray-300 px-2 py-0.5 rounded font-mono"
                                        >
                                          {p.partName} x{p.quantity} (฿{(p.totalPrice || 0).toLocaleString()})
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Technician Notes */}
                                {job.technicianNotes && (
                                  <div className="text-[11px] text-gray-400 italic bg-[#0F1113] p-2 rounded-lg border border-[#2D3135]/60">
                                    ช่างบันทึก: {job.technicianNotes}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="pt-2 border-t border-[#2D3135]/60 flex items-center justify-between">
                                  <span className="text-[11px] text-gray-400">
                                    ช่าง: <strong className="text-gray-300">{job.mechanicName || 'ช่างไมค์'}</strong>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onPrintJob(job, 'receipt')}
                                      className="px-2.5 py-1 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] text-gray-300 text-xs font-medium flex items-center gap-1"
                                    >
                                      <Printer className="w-3 h-3 text-emerald-400" />
                                      <span>พิมพ์ใบเสร็จ</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onSelectJob(job.id)}
                                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>เปิดดูใบซ่อมนี้</span>
                                    </button>
                                  </div>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      )}

    </div>
  );
};

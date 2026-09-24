import React, { useState } from 'react';
import {
  Car,
  Search,
  Filter,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Printer,
  ChevronRight,
  Kanban,
  List,
  Wrench,
  User,
  Phone,
  Flame,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Download,
  History
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobStatus, JobPriority } from '../types';
import { formatThaiDateTime, getDurationDisplay } from '../utils/jobCalculator';
import { downloadCsvFile } from '../services/googleSheetsService';

interface JobOrdersViewProps {
  onSelectJob: (jobId: string) => void;
  onOpenNewJobModal: () => void;
  onPrintJob: (job: JobOrder, docType: 'job_order' | 'quotation' | 'receipt') => void;
  onNavigateToHistory?: () => void;
}

export const JobOrdersView: React.FC<JobOrdersViewProps> = ({
  onSelectJob,
  onOpenNewJobModal,
  onPrintJob,
  onNavigateToHistory,
}) => {
  const { jobOrders, updateJobStatus, deleteJobOrder } = useGarage();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<{ id: string; jobNo: string } | null>(null);

  const filteredJobs = jobOrders.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (job.licensePlate || '').toLowerCase().includes(q) ||
      (job.customerName || '').toLowerCase().includes(q) ||
      (job.customerPhone || '').includes(q) ||
      (job.jobNo || '').toLowerCase().includes(q) ||
      (job.carBrand || '').toLowerCase().includes(q) ||
      (job.carModel || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const columns: { status: JobStatus; title: string; color: string; badgeBg: string }[] = [
    { status: 'pending', title: 'รอดำเนินการ / รับรถ', color: 'border-yellow-500/40', badgeBg: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' },
    { status: 'inspecting', title: 'กำลังตรวจเช็ค', color: 'border-blue-500/40', badgeBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { status: 'waiting_parts', title: 'รออะไหล่', color: 'border-red-500/40', badgeBg: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    { status: 'in_progress', title: 'กำลังซ่อม', color: 'border-orange-500/40', badgeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
    { status: 'qc', title: 'ทดสอบ QC', color: 'border-purple-500/40', badgeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
    { status: 'completed', title: 'ซ่อมเสร็จสมบูรณ์', color: 'border-green-500/40', badgeBg: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    { status: 'delivered', title: 'ส่งมอบรถแล้ว', color: 'border-[#2D3135]', badgeBg: 'bg-[#0F1113] text-gray-400 border border-[#2D3135]' },
  ];

  const getNextStatus = (current: JobStatus): JobStatus | null => {
    switch (current) {
      case 'pending': return 'inspecting';
      case 'inspecting': return 'in_progress';
      case 'waiting_parts': return 'in_progress';
      case 'in_progress': return 'qc';
      case 'qc': return 'completed';
      case 'completed': return 'delivered';
      case 'delivered': return null;
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, jobNo: string) => {
    e.stopPropagation();
    setDeleteConfirmJob({ id, jobNo });
  };

  const handleExportCsv = () => {
    const headers = [
      'เลขที่ใบสั่งซ่อม',
      'ทะเบียนรถ',
      'ยี่ห้อ/รุ่น',
      'ชื่อลูกค้า',
      'เบอร์โทร',
      'วันที่รับรถ',
      'กำหนดส่งมอบรถ',
      'สถานะงานซ่อม',
      'ช่องซ่อม',
      'ช่างผู้ดูแล',
      'อาการที่แจ้ง',
      'ค่าแรงช่าง',
      'ส่วนลด',
      'ยอดสุทธิ (บาท)',
      'เงินมัดจำ',
      'สถานะชำระเงิน',
      'วิธีชำระเงิน'
    ];

    const rows = filteredJobs.map(j => [
      j.jobNo,
      j.licensePlate,
      `${j.carBrand} ${j.carModel}`,
      j.customerName,
      j.customerPhone,
      j.receivedDate || j.createdAt,
      j.estimatedCompletionDate || '-',
      j.status,
      j.bayNumber || '-',
      j.mechanicName || '-',
      j.issueDescription,
      j.laborFee,
      j.discount,
      j.totalAmount,
      j.depositAmount || j.paidAmount || 0,
      j.paymentStatus,
      j.paymentMethod || '-'
    ]);

    downloadCsvFile(`[อู่สงกรานต์]_รายการใบสั่งซ่อม_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16191D] border border-[#2D3135] p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Car className="w-6 h-6 text-orange-500" />
            <span>ระบบจัดการใบสั่งซ่อม (Job Orders)</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            รายการรถเข้าซ่อมทั้งหมด {jobOrders.length} รายการ (กำลังซ่อม {jobOrders.filter(j => j.status !== 'delivered').length} คัน) • รันเลขออโต้ & คำนวณค่าใช้จ่ายเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* View Toggle */}
          <div className="flex items-center bg-[#0F1113] p-1 rounded-xl border border-[#2D3135] text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>คัมบัง (Kanban)</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>ตาราง (List)</span>
            </button>
          </div>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="px-3.5 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="เปิดดูคลังประวัติใบสั่งซ่อมและไทม์ไลน์การซ่อมบำรุงย้อนหลัง"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>ประวัติใบซ่อมย้อนหลัง</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-gray-300 border border-[#2D3135] font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={onOpenNewJobModal}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ เปิดใบสั่งซ่อม</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#16191D] p-4 rounded-xl border border-[#2D3135] text-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาทะเบียน, ชื่อลูกค้า, เบอร์โทร, เลขที่ใบสั่งซ่อม..."
            className="w-full pl-9 pr-3 py-2 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0F1113] border border-[#2D3135] text-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-orange-500 w-1/2 sm:w-auto"
          >
            <option value="all">ทุกสถานะงานซ่อม</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="inspecting">กำลังตรวจเช็ค</option>
            <option value="waiting_parts">รออะไหล่</option>
            <option value="in_progress">กำลังซ่อม</option>
            <option value="qc">ทดสอบ QC</option>
            <option value="completed">ซ่อมเสร็จ</option>
            <option value="delivered">ส่งมอบแล้ว</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0F1113] border border-[#2D3135] text-gray-200 py-2 px-3 rounded-lg focus:outline-none focus:border-orange-500 w-1/2 sm:w-auto"
          >
            <option value="all">ทุกความสำคัญ</option>
            <option value="normal">ปกติ (Normal)</option>
            <option value="urgent">ด่วนพิเศษ (Urgent)</option>
            <option value="appointment">นัดหมายล่วงหน้า</option>
          </select>
        </div>
      </div>

      {/* Main View Display: Kanban or List */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1300px]">
            {columns.map((col) => {
              const colJobs = filteredJobs.filter((j) => j.status === col.status);
              return (
                <div
                  key={col.status}
                  className="w-72 bg-[#16191D] border border-[#2D3135] rounded-2xl p-3 flex flex-col shrink-0 shadow-sm"
                >
                  {/* Column Header */}
                  <div className={`flex items-center justify-between pb-2.5 mb-3 border-b ${col.color}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-200">{col.title}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg font-mono ${col.badgeBg}`}>
                        {colJobs.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards container */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                    {colJobs.length === 0 ? (
                      <div className="py-8 text-center text-gray-600 text-xs italic">
                        ไม่มีงานในขั้นตอนนี้
                      </div>
                    ) : (
                      colJobs.map((job) => {
                        const next = getNextStatus(job.status);
                        const duration = getDurationDisplay(job.receivedDate || job.createdAt, job.estimatedCompletionDate);
                        const deposit = job.depositAmount || job.paidAmount || 0;

                        return (
                          <div
                            key={job.id}
                            onClick={() => onSelectJob(job.id)}
                            className="p-3.5 bg-[#0F1113] hover:bg-[#1C2025] border border-[#2D3135] hover:border-orange-500/50 rounded-xl cursor-pointer shadow transition-all group"
                          >
                            {/* Card Top */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-orange-400 font-mono tracking-tight">{job.licensePlate}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191D] text-gray-300 border border-[#2D3135] font-mono font-semibold">
                                {job.jobNo}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-gray-200 mt-1">
                              {job.carBrand} {job.carModel} {job.carYear ? `(${job.carYear})` : ''}
                            </p>

                            {/* Date Delivery & Timer Indicator */}
                            {job.estimatedCompletionDate && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                                <Clock className={`w-3 h-3 ${duration.isOverdue ? 'text-red-400' : 'text-emerald-400'}`} />
                                <span className={duration.isOverdue ? 'text-red-400 font-semibold' : 'text-emerald-400 font-medium'}>
                                  {duration.text}
                                </span>
                              </div>
                            )}

                            <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 bg-[#16191D] p-2 rounded-lg border border-[#2D3135]">
                              {job.issueDescription}
                            </p>

                            {/* Tags */}
                            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap text-[10px]">
                              {job.bayNumber && (
                                <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold font-mono">
                                  ช่อง #{job.bayNumber}
                                </span>
                              )}
                              {job.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">
                                  ด่วน 🔥
                                </span>
                              )}
                              <span className="text-gray-400 truncate max-w-[110px]">
                                👤 {job.customerName}
                              </span>
                            </div>

                            {/* Price & Action */}
                            <div className="mt-3 pt-2 border-t border-[#2D3135] flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold font-mono text-white block">
                                  ฿{job.totalAmount.toLocaleString()}
                                </span>
                                {deposit > 0 && job.paymentStatus !== 'paid' && (
                                  <span className="text-[10px] text-yellow-400 font-mono">
                                    มัดจำ ฿{deposit.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              {next && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateJobStatus(job.id, next);
                                  }}
                                  title="เลื่อนขั้นตอนถัดไป"
                                  className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white font-bold rounded-lg text-[11px] border border-orange-500/20 transition-colors flex items-center gap-0.5"
                                >
                                  <span>ถัดไป</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#1C2025] text-gray-400 uppercase font-bold text-[11px] border-b border-[#2D3135]">
                <tr>
                  <th className="px-4 py-3">เลขที่ / ทะเบียน</th>
                  <th className="px-4 py-3">รถยนต์ / ลูกค้า</th>
                  <th className="px-4 py-3">กำหนดการรับ-ส่ง</th>
                  <th className="px-4 py-3">ช่องซ่อม / ช่าง</th>
                  <th className="px-4 py-3">สถานะงาน</th>
                  <th className="px-4 py-3 text-right">ยอดรวมค่าใช้จ่าย</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3135]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      ไม่พบข้อมูลใบสั่งซ่อมที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const duration = getDurationDisplay(job.receivedDate || job.createdAt, job.estimatedCompletionDate);
                    return (
                      <tr
                        key={job.id}
                        onClick={() => onSelectJob(job.id)}
                        className="hover:bg-[#1C2025] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-orange-400 font-mono block text-sm">{job.licensePlate}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{job.jobNo}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-200">{job.carBrand} {job.carModel}</div>
                          <div className="text-[11px] text-gray-400">{job.customerName} ({job.customerPhone})</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-gray-300 font-mono text-[11px]">
                            {job.estimatedCompletionDate ? formatThaiDateTime(job.estimatedCompletionDate) : 'ไม่ได้ระบุ'}
                          </div>
                          <div className={`text-[10px] font-bold ${duration.isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                            {duration.text}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-gray-200">{job.bayNumber ? `ช่องซ่อม #${job.bayNumber}` : '-'}</div>
                          <div className="text-[11px] text-gray-400">{job.mechanicName || 'ยังไม่ระบุ'}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {columns.find(c => c.status === job.status) ? (
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${columns.find(c => c.status === job.status)?.badgeBg}`}>
                              {columns.find(c => c.status === job.status)?.title}
                            </span>
                          ) : job.status}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-bold font-mono text-white block text-sm">฿{job.totalAmount.toLocaleString()}</span>
                          <span className={`text-[10px] font-bold uppercase ${job.paymentStatus === 'paid' ? 'text-green-400' : job.paymentStatus === 'deposit' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {job.paymentStatus === 'paid' ? 'ชำระแล้ว' : job.paymentStatus === 'deposit' ? 'มัดจำแล้ว' : 'รอชำระ'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectJob(job.id)}
                              title="ดูรายละเอียด & อัปเดต"
                              className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-[#2D3135] border border-[#2D3135] text-gray-300 hover:text-white"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintJob(job, 'job_order')}
                              title="พิมพ์ & ส่งออก PDF (1 คลิก)"
                              className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-orange-500/20 border border-[#2D3135] text-orange-400"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, job.id, job.jobNo)}
                              title="ลบใบสั่งซ่อม"
                              className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-red-500/20 border border-[#2D3135] text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16191D] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบใบสั่งซ่อม</h3>
                <p className="text-xs text-red-400 font-mono">{deleteConfirmJob.jobNo}</p>
              </div>
            </div>
            <p className="text-xs text-gray-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบใบสั่งซ่อมนี้? ข้อมูลรายการอะไหล่และสถานะช่องซ่อมจะถูกคืนค่า
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D3135]">
              <button
                type="button"
                onClick={() => setDeleteConfirmJob(null)}
                className="px-4 py-2 bg-[#252B32] hover:bg-[#2D3135] text-gray-300 rounded-xl text-xs font-semibold transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteJobOrder(deleteConfirmJob.id);
                  setDeleteConfirmJob(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/30"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

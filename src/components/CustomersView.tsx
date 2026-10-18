import React, { useState } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Car,
  Phone,
  Mail,
  MapPin,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Send,
  ExternalLink,
  MessageSquare,
  ArrowDownCircle,
  CheckCircle2
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { Customer, CustomerVehicle } from '../types';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { downloadCsvFile, getStoredSpreadsheetId, isRealGoogleSpreadsheetId } from '../services/googleSheetsService';
import { getDirectLineUrl, DEFAULT_LINE_ID } from '../services/lineService';

interface CustomersViewProps {
  onSelectJob: (jobId: string) => void;
  onOpenNewJobForVehicle: (customer: Customer, vehicle: CustomerVehicle) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onSelectJob,
  onOpenNewJobForVehicle,
}) => {
  const {
    customers,
    jobOrders,
    addCustomer,
    garageProfile,
    pullDataFromGoogleSheets,
    isPullingSheets,
  } = useGarage();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(customers[0]?.id || null);
  const [pullFeedback, setPullFeedback] = useState<string | null>(null);

  // Modals
  const [isAddCustomerModal, setIsAddCustomerModal] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  
  // Add Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custLine, setCustLine] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vBrand, setVBrand] = useState('Toyota');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState('2022');
  const [vMileage, setVMileage] = useState<number>(30000);

  const customersSheetId = getStoredSpreadsheetId('customers') || (isRealGoogleSpreadsheetId(garageProfile.googleSheetsCustomersId) ? garageProfile.googleSheetsCustomersId : null);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesCust =
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.lineId && c.lineId.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));

    const matchesVehicle = c.vehicles.some((v) =>
      v.licensePlate.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );

    return matchesCust || matchesVehicle;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    const vehicles: CustomerVehicle[] = [];
    if (vPlate) {
      vehicles.push({
        licensePlate: vPlate.trim(),
        brand: vBrand,
        model: vModel.trim() || 'รุ่นมาตรฐาน',
        year: vYear,
        lastMileage: Number(vMileage) || 0,
        lastServiceDate: new Date().toISOString().slice(0, 10),
      });
    }

    await addCustomer({
      name: custName.trim(),
      phone: custPhone.trim(),
      email: custEmail.trim() || undefined,
      address: custAddress.trim() || undefined,
      lineId: custLine.trim() || undefined,
      vehicles,
    });

    setIsAddCustomerModal(false);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setCustLine('');
    setVPlate('');
    setVModel('');
  };

  const handleDownloadCsv = () => {
    const headers = [
      'รหัสลูกค้า',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'LINE ID',
      'อีเมล',
      'ที่อยู่',
      'ทะเบียนรถ',
      'ยี่ห้อ/รุ่น',
      'เลขไมล์ล่าสุด',
      'ยอดใช้จ่ายรวม (บาท)',
      'จำนวนครั้งที่เข้าใช้'
    ];
    const rows: any[][] = [];
    customers.forEach((c) => {
      const v = c.vehicles[0];
      rows.push([
        c.id,
        c.name,
        c.phone,
        c.lineId || '',
        c.email || '',
        c.address || '',
        v ? v.licensePlate : '-',
        v ? `${v.brand} ${v.model}` : '-',
        v ? v.lastMileage : 0,
        c.totalSpent,
        c.totalVisits
      ]);
    });
    downloadCsvFile(`Songkarn-Customers-${Date.now()}.csv`, [headers, ...rows]);
  };

  const handleDirectPull = async () => {
    setPullFeedback('กำลังดึงข้อมูลลูกค้าสดจาก Google Sheets...');
    const res = await pullDataFromGoogleSheets(true);
    if (res && res.customers.length > 0) {
      setPullFeedback(`✅ ดึงและอัปเดตข้อมูลลูกค้าสดสำเร็จ ${res.customers.length} รายจาก Google Sheets เรียบร้อยแล้ว!`);
      setTimeout(() => setPullFeedback(null), 5000);
    } else {
      setIsSheetsModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#16191D] border border-[#2D3135] p-5 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-orange-500" />
              <span>ประวัติลูกค้า & ข้อมูลรถยนต์ (CRM)</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold">
              REAL-TIME SYNC
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            บันทึกประวัติการซ่อม ข้อมูลรถยนต์ ทะเบียน และยอดใช้จ่ายสะสม • ลูกค้าในระบบ: <strong className="text-white font-bold">{customers.length} ราย</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Direct Pull / Fetch Live Sheet Button */}
          <button
            type="button"
            disabled={isPullingSheets}
            onClick={handleDirectPull}
            title="ดึงข้อมูลลูกค้าและประวัติรถสดจาก Google Sheets มาแสดงผลและอัปเดตทันที"
            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 hover:text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/10 disabled:opacity-50"
          >
            <ArrowDownCircle className={`w-4 h-4 text-emerald-400 ${isPullingSheets ? 'animate-spin' : ''}`} />
            <span>{isPullingSheets ? 'กำลังดึงข้อมูลชีต...' : 'ดึงข้อมูลจากชีต (Pull)'}</span>
          </button>

          {/* Google Sheets Trigger */}
          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#0F9D58]/15 hover:bg-[#0F9D58]/25 text-[#0F9D58] border border-[#0F9D58]/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>เชื่อมต่อ Google Sheets</span>
            {customersSheetId && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
          </button>

          {/* Download CSV */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] hover:bg-[#1C2025] text-gray-300 hover:text-white transition-all active:scale-95 text-xs flex items-center gap-1.5"
            title="ส่งออกไฟล์ CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={() => setIsAddCustomerModal(true)}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ เพิ่มข้อมูลลูกค้าใหม่</span>
          </button>
        </div>
      </div>

      {/* Pull Feedback Banner */}
      {pullFeedback && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{pullFeedback}</span>
          </div>
          <button onClick={() => setPullFeedback(null)} className="text-gray-300 hover:text-white text-xs underline font-bold px-2 py-1">
            ปิด
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, LINE ID หรือ ทะเบียนรถยนต์..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#16191D] border border-[#2D3135] rounded-xl text-xs sm:text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Customer Accordion List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center bg-[#16191D] border border-[#2D3135] rounded-2xl text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <p>ไม่พบข้อมูลลูกค้าที่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;
            const customerJobs = jobOrders.filter(
              (j) =>
                (j as any).customerId === customer.id ||
                j.customerPhone === customer.phone ||
                (customer.vehicles || []).some(
                  (v) => (v.licensePlate || '').trim().toLowerCase() === (j.licensePlate || '').trim().toLowerCase()
                )
            );
            const totalVisitsCount = customerJobs.length > 0 ? customerJobs.length : (customer.totalVisits || 0);
            const totalSpentAmount = customerJobs.length > 0 
              ? customerJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0)
              : (customer.totalSpent || 0);

            return (
              <div
                key={customer.id}
                className="bg-[#16191D] border border-[#2D3135] rounded-2xl overflow-hidden shadow-md transition-all"
              >
                {/* Header Summary */}
                <div
                  onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#1C2025]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-base shrink-0">
                      {customer.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">{customer.name}</span>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0F1113] text-gray-300 border border-[#2D3135]">
                          ID: {customer.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Phone className="w-3.5 h-3.5 text-orange-400" />
                          {customer.phone}
                        </span>
                        {customer.lineId && (
                          <a
                            href={getDirectLineUrl(customer.lineId)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[#06C755] hover:underline font-semibold"
                          >
                            <MessageSquare className="w-3 h-3" />
                            LINE: {customer.lineId}
                          </a>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#2D3135]">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">ประวัติเข้าบริการ / ยอดรวม</p>
                      <p className="text-xs font-semibold text-gray-200">
                        <strong className="text-orange-400 font-mono">{totalVisitsCount}</strong> ครั้ง • <strong className="text-emerald-400 font-mono">฿{totalSpentAmount.toLocaleString()}</strong>
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 bg-[#0F1113] border-t border-[#2D3135] space-y-5 text-xs">
                    
                    {/* Vehicles Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-200 flex items-center gap-2">
                          <Car className="w-4 h-4 text-orange-500" />
                          <span>รถยนต์ในครอบครอง ({customer.vehicles.length} คัน)</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {customer.vehicles.map((v, i) => (
                          <div
                            key={i}
                            className="p-3.5 bg-[#16191D] border border-[#2D3135] rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 bg-amber-400 px-2 py-0.5 rounded text-xs">
                                  {v.licensePlate}
                                </span>
                                <span className="font-bold text-gray-200">{v.brand} {v.model}</span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-1">
                                ปี {v.year || '-'} • สี {v.color || '-'} • ไมล์ล่าสุด: <strong className="text-gray-200 font-mono">{(v.lastMileage || 0).toLocaleString()} กม.</strong>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenNewJobForVehicle(customer, v)}
                              className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-white font-bold text-xs border border-orange-500/30 transition-all"
                            >
                              + เปิดใบสั่งซ่อม
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Job History */}
                    <div>
                      <h4 className="font-bold text-gray-200 flex items-center gap-2 mb-3">
                        <History className="w-4 h-4 text-orange-500" />
                        <span>ประวัติการซ่อมบำรุงในอู่สงกรานต์ ({customerJobs.length} รายการ)</span>
                      </h4>

                      {customerJobs.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[#16191D] border border-[#2D3135] text-center text-gray-400">
                          ยังไม่มีประวัติการสั่งซ่อม
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customerJobs.map((job) => (
                            <div
                              key={job.id}
                              onClick={() => onSelectJob(job.id)}
                              className="p-3 bg-[#16191D] border border-[#2D3135] hover:border-orange-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-orange-400 text-xs px-2 py-0.5 rounded bg-[#0F1113] border border-[#2D3135]">
                                  {job.jobNo}
                                </span>
                                <div>
                                  <p className="font-medium text-gray-200">{job.issueDescription}</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {new Date(job.createdAt).toLocaleDateString('th-TH')} • ช่าง: {job.mechanicName || 'ช่างไมค์'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-400 text-sm">
                                  ฿{job.totalAmount.toLocaleString()}
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  {job.paymentStatus === 'paid' ? '✅ ชำระแล้ว' : '⏳ รอชำระ'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-xl shadow-2xl p-6 my-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-orange-500" />
              <span>เพิ่มข้อมูลลูกค้าและรถยนต์ใหม่</span>
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ชื่อ-นามสกุล ลูกค้า *</label>
                  <input
                    type="text"
                    required
                    value={custName || ''}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="เช่น คุณสมศักดิ์ มั่นคง"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="tel"
                    required
                    value={custPhone || ''}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="081-234-5678"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={custLine || ''}
                    onChange={(e) => setCustLine(e.target.value)}
                    placeholder="เช่น somsak_car"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">อีเมล (ถ้ามี)</label>
                  <input
                    type="email"
                    value={custEmail || ''}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="somsak@example.com"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">ที่อยู่ลูกค้า</label>
                <input
                  type="text"
                  value={custAddress || ''}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="เช่น 123/45 แขวงบางแค กรุงเทพฯ"
                  className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-[#2D3135]">
                <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-1.5">
                  <Car className="w-4 h-4" />
                  <span>ข้อมูลรถยนต์คันแรก</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">ทะเบียนรถยนต์ *</label>
                    <input
                      type="text"
                      required
                      value={vPlate || ''}
                      onChange={(e) => setVPlate(e.target.value.toUpperCase())}
                      placeholder="เช่น 1กข-9999 กทม."
                      className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">ยี่ห้อรถยนต์</label>
                    <input
                      type="text"
                      value={vBrand || ''}
                      onChange={(e) => setVBrand(e.target.value)}
                      placeholder="Toyota / Honda / Isuzu"
                      className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">รุ่นรถยนต์</label>
                    <input
                      type="text"
                      value={vModel || ''}
                      onChange={(e) => setVModel(e.target.value)}
                      placeholder="Vios / D-Max / Civic"
                      className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">ปีผลิต</label>
                    <input
                      type="text"
                      value={vYear || ''}
                      onChange={(e) => setVYear(e.target.value)}
                      placeholder="2022"
                      className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">เลขไมล์ปัจจุบัน (กม.)</label>
                    <input
                      type="number"
                      value={vMileage ?? 0}
                      onChange={(e) => setVMileage(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#2D3135]">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0F1113] text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 active:scale-95"
                >
                  บันทึกข้อมูลลูกค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        targetTab="customers"
      />

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Car,
  User,
  Phone,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Fuel,
  Gauge,
  Shield,
  Sparkles,
  Calculator,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  DollarSign,
  Percent,
  TrendingUp,
  Package,
  Layers,
  ChevronDown,
  History
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder, JobPriority, JobStatus, JobPartItem, Customer, CustomerVehicle } from '../types';
import {
  calculateJobBreakdown,
  generateAutoJobNo,
  getDurationDisplay,
  getQuickDeliveryPreset,
  toDateTimeLocalString,
  formatThaiDateTime,
  formatThaiDate
} from '../utils/jobCalculator';
import { SparePartSearchSelect } from './SparePartSearchSelect';

interface JobOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (newJob: JobOrder) => void;
  initialCustomer?: Customer | null;
  initialVehicle?: CustomerVehicle | null;
}

export const JobOrderFormModal: React.FC<JobOrderFormModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  initialCustomer,
  initialVehicle,
}) => {
  const {
    jobOrders,
    garageProfile,
    spareParts,
    customers,
    mechanics,
    serviceBays,
    findCustomerByPhoneOrPlate,
    addJobOrder
  } = useGarage();

  // 1. Auto-incrementing Job Number Configuration
  const [jobPrefix, setJobPrefix] = useState<string>(garageProfile.jobNoPrefix || 'JOB');
  const [jobFormat, setJobFormat] = useState<'monthly' | 'daily'>(garageProfile.jobNoFormat || 'monthly');
  const [customJobNo, setCustomJobNo] = useState<string>('');
  const [isManualJobNo, setIsManualJobNo] = useState<boolean>(false);

  // Generate default job number on modal open or when prefix/format changes
  useEffect(() => {
    if (isOpen && !isManualJobNo) {
      const generated = generateAutoJobNo(jobOrders, jobPrefix, jobFormat);
      setCustomJobNo(generated);
    }
    if (isOpen && initialCustomer) {
      setCustomerName(initialCustomer.name || '');
      setCustomerPhone(initialCustomer.phone || '');
      setCustomerAddress(initialCustomer.address || '');
    }
    if (isOpen && initialVehicle) {
      setLicensePlate(initialVehicle.licensePlate || '');
      setCarBrand(initialVehicle.brand || 'Toyota');
      setCarModel(initialVehicle.model || '');
      setCarYear(initialVehicle.year || '2022');
      setCarColor(initialVehicle.color || '');
      setVinNumber(initialVehicle.vin || '');
      setMileage(initialVehicle.lastMileage || 35000);
    }
  }, [isOpen, jobPrefix, jobFormat, jobOrders, isManualJobNo, initialCustomer, initialVehicle]);

  // 2. Dates & Times
  const [receivedDate, setReceivedDate] = useState<string>(toDateTimeLocalString());
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>(
    getQuickDeliveryPreset('tomorrow_evening')
  );

  // 3. Customer & Vehicle State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const [licensePlate, setLicensePlate] = useState('');
  const [carBrand, setCarBrand] = useState('Toyota');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('2022');
  const [carColor, setCarColor] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  const [mileage, setMileage] = useState<number>(35000);

  // 4. Job Details & Assignment
  const [issueDescription, setIssueDescription] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [priority, setPriority] = useState<JobPriority>('normal');
  const [bayNumber, setBayNumber] = useState<number>(1);
  const [mechanicId, setMechanicId] = useState<string>('');

  // 5. Initial Inspection
  const [fuelLevel, setFuelLevel] = useState<number>(60);
  const [valuableItemsChecked, setValuableItemsChecked] = useState<boolean>(true);
  const [spareTirePresent, setSpareTirePresent] = useState<boolean>(true);
  const [matchedCustomerHint, setMatchedCustomerHint] = useState<string | null>(null);

  // Past repairs for this license plate lookup
  const [showPastRepairsPreview, setShowPastRepairsPreview] = useState<boolean>(false);
  const pastRepairsForThisPlate = useMemo(() => {
    if (!licensePlate || licensePlate.trim().length < 2) return [];
    return jobOrders
      .filter((j) => j.licensePlate.trim().toLowerCase() === licensePlate.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobOrders, licensePlate]);

  // 6. Expense & Financial Calculator State
  const [partsList, setPartsList] = useState<JobPartItem[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partQtyToAdd, setPartQtyToAdd] = useState<number>(1);
  
  // Custom manual part row input
  const [showCustomPartInput, setShowCustomPartInput] = useState<boolean>(false);
  const [customPartName, setCustomPartName] = useState<string>('');
  const [customPartPrice, setCustomPartPrice] = useState<number>(0);
  const [customPartCost, setCustomPartCost] = useState<number>(0);

  const [laborFee, setLaborFee] = useState<number>(500);
  const [otherFee, setOtherFee] = useState<number>(0);
  const [otherFeeDescription, setOtherFeeDescription] = useState<string>('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [enableVat, setEnableVat] = useState<boolean>(true);
  const [vatPercent, setVatPercent] = useState<number>(garageProfile.vatPercent || 7);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Live calculation breakdown
  const financials = useMemo(() => {
    return calculateJobBreakdown({
      parts: partsList,
      laborFee,
      otherFee,
      discount: discountType === 'amount' ? discountValue : 0,
      discountType,
      discountPercent: discountType === 'percent' ? discountValue : 0,
      enableVat,
      vatPercent: enableVat ? vatPercent : 0,
      depositAmount,
    });
  }, [partsList, laborFee, otherFee, discountType, discountValue, enableVat, vatPercent, depositAmount]);

  // Live duration estimation
  const durationInfo = useMemo(() => {
    return getDurationDisplay(receivedDate, estimatedCompletionDate);
  }, [receivedDate, estimatedCompletionDate]);

  if (!isOpen) return null;

  // Auto match when typing phone or license plate
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (val.length >= 4) {
      const match = findCustomerByPhoneOrPlate(val);
      if (match.customer) {
        setCustomerName(match.customer.name);
        setCustomerAddress(match.customer.address || '');
        if (match.vehicle) {
          setLicensePlate(match.vehicle.licensePlate);
          setCarBrand(match.vehicle.brand);
          setCarModel(match.vehicle.model);
          setCarYear(match.vehicle.year || '2022');
          setCarColor(match.vehicle.color || '');
          setMileage(match.vehicle.lastMileage || 30000);
        }
        setMatchedCustomerHint(`พบข้อมูลลูกค้าเก่า: ${match.customer.name} (ประวัติเข้าซ่อม ${match.customer.totalVisits || 1} ครั้ง)`);
      } else {
        setMatchedCustomerHint(null);
      }
    }
  };

  const handlePlateChange = (val: string) => {
    setLicensePlate(val);
    if (val.length >= 3) {
      const match = findCustomerByPhoneOrPlate(val);
      if (match.customer && match.vehicle) {
        setCustomerName(match.customer.name);
        setCustomerPhone(match.customer.phone);
        setCarBrand(match.vehicle.brand);
        setCarModel(match.vehicle.model);
        setMileage(match.vehicle.lastMileage || 30000);
        setMatchedCustomerHint(`พบประวัติรถยนต์: ${match.vehicle.brand} ${match.vehicle.model} (${match.customer.name})`);
      }
    }
  };

  // Add Part from Inventory
  const handleAddInventoryPart = () => {
    if (!selectedPartId) return;
    const inventoryItem = spareParts.find((p) => p.id === selectedPartId);
    if (!inventoryItem) return;

    const qty = Math.max(1, Number(partQtyToAdd) || 1);
    
    // Check if already in list
    const existingIndex = partsList.findIndex((p) => p.partId === inventoryItem.id);
    if (existingIndex >= 0) {
      const updated = [...partsList];
      const newQty = updated[existingIndex].quantity + qty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        totalPrice: newQty * updated[existingIndex].unitPrice,
      };
      setPartsList(updated);
    } else {
      const newItem: JobPartItem = {
        partId: inventoryItem.id,
        partCode: inventoryItem.partCode,
        partName: inventoryItem.name,
        quantity: qty,
        unitPrice: inventoryItem.sellPrice,
        costPrice: inventoryItem.costPrice,
        totalPrice: qty * inventoryItem.sellPrice,
      };
      setPartsList([...partsList, newItem]);
    }

    setSelectedPartId('');
    setPartQtyToAdd(1);
  };

  // Add Custom manual item
  const handleAddCustomPart = () => {
    if (!customPartName.trim() || customPartPrice <= 0) return;
    const newItem: JobPartItem = {
      partId: 'custom-' + Date.now(),
      partCode: 'CUSTOM',
      partName: customPartName.trim(),
      quantity: 1,
      unitPrice: Number(customPartPrice),
      costPrice: Number(customPartCost) || Number(customPartPrice) * 0.7,
      totalPrice: Number(customPartPrice),
    };
    setPartsList([...partsList, newItem]);
    setCustomPartName('');
    setCustomPartPrice(0);
    setCustomPartCost(0);
    setShowCustomPartInput(false);
  };

  const handleRemovePart = (index: number) => {
    setPartsList(partsList.filter((_, i) => i !== index));
  };

  const handleUpdatePartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemovePart(index);
      return;
    }
    const updated = [...partsList];
    updated[index] = {
      ...updated[index],
      quantity: newQty,
      totalPrice: newQty * updated[index].unitPrice,
    };
    setPartsList(updated);
  };

  // Quick Labor presets
  const applyLaborPreset = (amount: number) => {
    setLaborFee(amount);
  };

  // Quick Date presets
  const applyDatePreset = (preset: '2h' | '4h' | 'today_evening' | 'tomorrow_noon' | 'tomorrow_evening' | '2d' | '3d' | '7d') => {
    const base = receivedDate ? new Date(receivedDate) : new Date();
    const newEst = getQuickDeliveryPreset(preset, base);
    setEstimatedCompletionDate(newEst);
  };

  const handleRefreshJobNo = () => {
    setIsManualJobNo(false);
    const generated = generateAutoJobNo(jobOrders, jobPrefix, jobFormat);
    setCustomJobNo(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !licensePlate || !issueDescription) {
      setFormError('กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์, ทะเบียนรถ, และอาการเสียที่แจ้งให้ครบถ้วน');
      return;
    }
    setFormError(null);

    const selectedMech = mechanics.find((m) => m.id === mechanicId);

    const newJobData = {
      jobNo: customJobNo.trim() || generateAutoJobNo(jobOrders, jobPrefix, jobFormat),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      carBrand,
      carModel: carModel.trim() || 'รุ่นมาตรฐาน',
      carYear,
      carColor,
      vinNumber,
      mileage: Number(mileage) || 0,
      issueDescription: issueDescription.trim(),
      technicianNotes: technicianNotes.trim(),
      inspection: {
        fuelLevel,
        dashboardMileage: Number(mileage) || 0,
        exteriorScratches: [],
        valuableItemsChecked,
        spareTirePresent,
      },
      mechanicId: selectedMech?.id,
      mechanicName: selectedMech?.name,
      bayNumber: Number(bayNumber),
      status: 'inspecting' as JobStatus,
      priority,
      partsUsed: partsList,
      laborFee: financials.laborFee,
      otherFee: financials.otherFee,
      otherFeeDescription: otherFeeDescription.trim(),
      discount: financials.discountAmount,
      discountType: financials.discountType,
      discountPercent: financials.discountPercent,
      vatPercent: financials.vatPercent,
      totalAmount: financials.grandTotal,
      depositAmount: financials.depositAmount,
      paidAmount: financials.depositAmount,
      paymentStatus: financials.suggestedPaymentStatus,
      receivedDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
      estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate).toISOString() : undefined,
    };

    const created = await addJobOrder(newJobData);
    if (onJobCreated) {
      onJobCreated(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1C2025] border-b border-[#2D3135] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold shadow-inner">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  เปิดใบสั่งซ่อม / รับรถเข้าอู่ (Repair Work Order)
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  ระบบอู่สงกรานต์
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                ระบบรันเลขที่อัตโนมัติ บันทึกวันเวลารับ-ส่งมอบรถ และคำนวณค่าใช้จ่าย/มัดจำแบบเรียลไทม์
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white hover:bg-[#25292E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Top Banner: Auto-Running Job Number Configuration & Intake Date Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#0F1113] p-4 rounded-xl border border-orange-500/30 shadow-md">
            
            {/* Auto-Running Job Number System (Feature 1) */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. เลขที่ใบสั่งซ่อมอัตโนมัติ (Auto Job No.)</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleRefreshJobNo}
                    title="สุ่ม/รีเฟรชเลขที่ใหม่"
                    className="p-1 rounded bg-[#16191D] hover:bg-[#25292E] text-gray-300 hover:text-orange-400 border border-[#2D3135] transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>รันเลขใหม่</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Prefix Selector */}
                <select
                  value={jobPrefix || 'JOB'}
                  onChange={(e) => {
                    setJobPrefix(e.target.value);
                    setIsManualJobNo(false);
                  }}
                  className="px-2.5 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500"
                >
                  <option value="JOB">JOB (มาตรฐาน)</option>
                  <option value="SK">SK (สงกรานต์)</option>
                  <option value="REP">REP (งานซ่อม)</option>
                  <option value="ORD">ORD (ออเดอร์)</option>
                </select>

                {/* Format Format (Monthly vs Daily) */}
                <select
                  value={jobFormat || 'monthly'}
                  onChange={(e) => {
                    setJobFormat(e.target.value as 'monthly' | 'daily');
                    setIsManualJobNo(false);
                  }}
                  className="px-2.5 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-xs text-gray-300 focus:outline-none focus:border-orange-500"
                >
                  <option value="monthly">รายเดือน (YYYYMM-XXX)</option>
                  <option value="daily">รายวัน (YYYYMMDD-XXX)</option>
                </select>

                {/* Job Number Display / Custom Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={customJobNo || ''}
                    onChange={(e) => {
                      setCustomJobNo(e.target.value);
                      setIsManualJobNo(true);
                    }}
                    placeholder="JOB-202608-001"
                    className="w-full px-3 py-2 bg-[#16191D] border border-orange-500/50 rounded-lg text-white font-mono font-bold text-sm tracking-wide focus:outline-none focus:border-orange-500"
                  />
                  {isManualJobNo && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded font-mono">
                      แก้ไขเอง
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                💡 ระบบค้นหาเลขรันลำดับล่าสุดโดยอัตโนมัติ ไม่ซ้ำซ้อน
              </p>
            </div>

            {/* Received Date & Estimated Delivery Date (Feature 2) */}
            <div className="lg:col-span-6 space-y-2 border-t lg:border-t-0 lg:border-l border-[#2D3135] pt-3 lg:pt-0 lg:pl-4">
              <label className="text-xs font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5" />
                <span>2. วันที่รับรถ & กำหนดส่งมอบรถ</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Received Date */}
                <div>
                  <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                    <span>วันที่รับรถเข้าอู่</span>
                    <button
                      type="button"
                      onClick={() => setReceivedDate(toDateTimeLocalString())}
                      className="text-[10px] text-orange-400 hover:underline"
                    >
                      ตอนนี้
                    </button>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={receivedDate || ''}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono text-xs"
                  />
                </div>

                {/* Estimated Delivery Date */}
                <div>
                  <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                    <span>กำหนดส่งมอบรถ</span>
                    <span className={`text-[10px] font-bold ${durationInfo.isOverdue ? 'text-red-400' : 'text-green-400'}`}>
                      ⏱️ {durationInfo.text}
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={estimatedCompletionDate || ''}
                    onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Quick delivery presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-gray-400">ควิกเซ็ต:</span>
                <button
                  type="button"
                  onClick={() => applyDatePreset('2h')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  +2 ชม. (ด่วน)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('today_evening')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  เย็นนี้ 17:30
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('tomorrow_noon')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  พรุ่งนี้เที่ยง
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('tomorrow_evening')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  พรุ่งนี้ 17:00
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('2d')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  +2 วัน
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('7d')}
                  className="px-2 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded text-[10px]"
                >
                  +7 วัน
                </button>
              </div>
            </div>

          </div>

          {matchedCustomerHint && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span>{matchedCustomerHint}</span>
            </div>
          )}

          {/* Section 1: Customer & Vehicle Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Customer Box */}
            <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>3. ข้อมูลลูกค้า / เจ้าของรถ</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    เบอร์โทรศัพท์ลูกค้า <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 089-111-2233"
                    value={customerPhone || ''}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    ชื่อ-นามสกุล ลูกค้า <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณสมชาย เจริญสุข"
                    value={customerName || ''}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">ที่อยู่ / LINE ID ลูกค้า</label>
                  <input
                    type="text"
                    placeholder="ที่อยู่ลูกค้า หรือ LINE ID เพื่อแจ้งเตือน"
                    value={customerAddress || ''}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Box */}
            <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span>4. ข้อมูลรถยนต์</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    ทะเบียนรถ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 3ขก 8899 กทม."
                    value={licensePlate || ''}
                    onChange={(e) => handlePlateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-orange-400 font-bold placeholder-gray-500 focus:outline-none focus:border-orange-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">ยี่ห้อรถยนต์</label>
                  <select
                    value={carBrand || 'Toyota'}
                    onChange={(e) => setCarBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Toyota">Toyota (โตโยต้า)</option>
                    <option value="Honda">Honda (ฮอนด้า)</option>
                    <option value="Isuzu">Isuzu (อีซูซุ)</option>
                    <option value="Mitsubishi">Mitsubishi (มิตซูบิชิ)</option>
                    <option value="Nissan">Nissan (นิสสัน)</option>
                    <option value="Mazda">Mazda (มาสด้า)</option>
                    <option value="Ford">Ford (ฟอร์ด)</option>
                    <option value="MG">MG (เอ็มจี)</option>
                    <option value="BYD">BYD (บีวายดี)</option>
                    <option value="Benz">Mercedes-Benz</option>
                    <option value="BMW">BMW</option>
                    <option value="Other">ยี่ห้ออื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">รุ่นรถยนต์ (Model)</label>
                  <input
                    type="text"
                    placeholder="เช่น Revo, Civic, D-Max"
                    value={carModel || ''}
                    onChange={(e) => setCarModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">เลขไมล์ปัจจุบัน (กม.)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={mileage ?? 0}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">ปีรถ / สีรถ</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="ปี 2022"
                      value={carYear || ''}
                      onChange={(e) => setCarYear(e.target.value)}
                      className="w-1/2 px-2.5 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="สีบรอนซ์"
                      value={carColor || ''}
                      onChange={(e) => setCarColor(e.target.value)}
                      className="w-1/2 px-2.5 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">เลขตัวถัง (VIN)</label>
                  <input
                    type="text"
                    placeholder="MHFBG32G..."
                    value={vinNumber || ''}
                    onChange={(e) => setVinNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 uppercase font-mono text-xs"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Past Repairs Notice for this vehicle (เปิดดูประวัติย้อนหลังของรถคันนี้ได้ทันที) */}
          {pastRepairsForThisPlate.length > 0 && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <History className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    พบประวัติการซ่อมของรถทะเบียน {licensePlate} ทั้งหมด {pastRepairsForThisPlate.length} ครั้งในระบบ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPastRepairsPreview(!showPastRepairsPreview)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-xs border border-blue-500/30 transition-all"
                >
                  {showPastRepairsPreview ? 'ย่อประวัติ' : 'ดูประวัติการซ่อมย้อนหลัง'}
                </button>
              </div>

              {showPastRepairsPreview && (
                <div className="space-y-2 pt-2 border-t border-blue-500/20 max-h-56 overflow-y-auto">
                  <p className="text-[11px] text-gray-400">
                    รายการซ่อมเดิมที่เคยบันทึกไว้ในอู่ (ช่วยให้ช่างตรวจสอบอะไหล่และระยะไมล์เดิมได้ทันที):
                  </p>
                  {pastRepairsForThisPlate.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-[#16191D] rounded-lg border border-[#2D3135] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-400 font-bold bg-[#0F1113] px-1.5 py-0.5 rounded border border-[#2D3135]">
                            {p.jobNo}
                          </span>
                          <span className="text-gray-400 text-[11px]">
                            {p.receivedDate ? formatThaiDate(p.receivedDate) : formatThaiDate(p.createdAt)}
                          </span>
                          <span className="text-amber-400 text-[11px] font-mono">
                            ไมล์ {(p.mileage || 0).toLocaleString()} กม.
                          </span>
                        </div>
                        <p className="text-gray-200 font-medium">{p.issueDescription}</p>
                        {p.partsUsed.length > 0 && (
                          <p className="text-[11px] text-gray-400">
                            อะไหล่: {p.partsUsed.map((pt) => `${pt.partName} x${pt.quantity}`).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="font-mono font-bold text-emerald-400 block text-xs">
                          ฿{(p.totalAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {p.status === 'delivered' ? 'ส่งมอบแล้ว' : p.status === 'completed' ? 'ซ่อมเสร็จ' : 'กำลังซ่อม'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Symptoms & Workshop Bay Assignment */}
          <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>5. อาการเสียที่แจ้ง & มอบหมายงานซ่อม</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  อาการเสีย / งานที่ต้องการซ่อมหรือเช็คระยะ <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="ระบุอาการ เช่น เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์แท้, มีเสียงดังที่ล้อหน้าเวลาเบรก, แอร์ไม่เย็น..."
                  value={issueDescription || ''}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">ช่องซ่อมที่มอบหมาย</label>
                  <select
                    value={bayNumber ?? 1}
                    onChange={(e) => setBayNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
                  >
                    {serviceBays.map((bay) => (
                      <option key={bay.id} value={bay.bayNumber}>
                        ช่อง #{bay.bayNumber} - {bay.name} ({bay.status === 'occupied' ? 'มีรถอยู่' : 'ว่าง'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">ช่างผู้รับผิดชอบ</label>
                  <select
                    value={mechanicId || ''}
                    onChange={(e) => setMechanicId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">เลือกช่างผู้รับผิดชอบ</option>
                    {mechanics.map((mech) => (
                      <option key={mech.id} value={mech.id}>
                        {mech.name} ({mech.specialties[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">ความเร่งด่วน</label>
                  <select
                    value={priority || 'normal'}
                    onChange={(e) => setPriority(e.target.value as JobPriority)}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="normal">งานปกติ (Normal)</option>
                    <option value="urgent">งานด่วนพิเศษ (Urgent) 🔥</option>
                    <option value="appointment">นัดหมายล่วงหน้า (Appointment)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Comprehensive Expense & Cost Calculator (Feature 3) */}
          <div className="bg-[#0F1113] border-2 border-orange-500/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2D3135]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    6. ระบบคำนวณค่าใช้จ่าย & อะไหล่ & มัดจำ (Live Expense Calculator)
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    คำนวณค่าอะไหล่, ค่าแรง, ส่วนลด (บาท/%), ภาษี VAT 7%, และเงินมัดจำแบบแม่นยำ
                  </p>
                </div>
              </div>

              {/* Profit preview badge for owner */}
              <div className="flex items-center gap-2 bg-[#16191D] px-3 py-1.5 rounded-lg border border-[#2D3135] text-xs">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-400">กำไรประมาณการ:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ฿{financials.estimatedProfit.toLocaleString()} ({financials.profitMarginPercent}%)
                </span>
              </div>
            </div>

            {/* Sub-section A: Spare Parts Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-orange-400" />
                  <span>รายการอะไหล่และวัสดุที่ใช้</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomPartInput(!showCustomPartInput)}
                  className="text-orange-400 hover:text-orange-300 text-[11px] flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showCustomPartInput ? 'ปิดเพิ่มอะไหล่นอกระบบ' : '+ เพิ่มอะไหล่นอกระบบ / ค่าซับ'}</span>
                </button>
              </label>

              {/* Add from inventory with smart search select */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <SparePartSearchSelect
                    spareParts={spareParts}
                    selectedPartId={selectedPartId}
                    onSelectPart={(part) => setSelectedPartId(part ? part.id : '')}
                    onOpenCustomModal={() => setShowCustomPartInput(true)}
                    carBrandOrModel={`${carBrand} ${carModel}`.trim()}
                    placeholder="🔍 พิมพ์ค้นหาอะไหล่, รหัส, ยี่ห้อ, หรือเลือกรุ่นรถ..."
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex items-center gap-1 bg-[#16191D] border border-[#2D3135] rounded-xl px-2 py-1">
                    <span className="text-[11px] text-gray-400">จำนวน:</span>
                    <input
                      type="number"
                      min="1"
                      value={partQtyToAdd}
                      onChange={(e) => setPartQtyToAdd(Math.max(1, Number(e.target.value)))}
                      className="w-14 bg-transparent text-xs text-gray-100 font-mono text-center focus:outline-none font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInventoryPart}
                    disabled={!selectedPartId}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-orange-500/20 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>เพิ่มอะไหล่</span>
                  </button>
                </div>
              </div>

              {/* Custom manual part form */}
              {showCustomPartInput && (
                <div className="p-3 bg-[#16191D] border border-orange-500/30 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-orange-400 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการอะไหล่หรือค่าบริการพิเศษ (ไม่ได้อยู่ในสต็อก)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="ชื่ออะไหล่ / งานซับนอก"
                      value={customPartName || ''}
                      onChange={(e) => setCustomPartName(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100"
                    />
                    <input
                      type="number"
                      placeholder="ราคาขายลูกค้า (฿)"
                      value={customPartPrice || ''}
                      onChange={(e) => setCustomPartPrice(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 font-mono"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="ต้นทุน (฿)"
                        value={customPartCost || ''}
                        onChange={(e) => setCustomPartCost(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-[#0F1113] border border-[#2D3135] rounded-lg text-gray-100 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPart}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shrink-0"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Parts Table */}
              {partsList.length > 0 ? (
                <div className="border border-[#2D3135] rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#1C2025] text-gray-400 font-bold border-b border-[#2D3135]">
                      <tr>
                        <th className="px-3 py-2">รายการอะไหล่</th>
                        <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                        <th className="px-3 py-2 text-center w-24">จำนวน</th>
                        <th className="px-3 py-2 text-right">รวม (บาท)</th>
                        <th className="px-2 py-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3135]">
                      {partsList.map((item, idx) => (
                        <tr key={item.partId + idx} className="hover:bg-[#16191D]">
                          <td className="px-3 py-2 font-medium">
                            <span className="text-orange-400 font-mono text-[11px] mr-1.5">[{item.partCode}]</span>
                            <span>{item.partName}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">฿{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdatePartQty(idx, item.quantity - 1)}
                                className="w-5 h-5 rounded bg-[#0F1113] hover:bg-[#25292E] text-gray-300 font-bold flex items-center justify-center border border-[#2D3135]"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-mono font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdatePartQty(idx, item.quantity + 1)}
                                className="w-5 h-5 rounded bg-[#0F1113] hover:bg-[#25292E] text-gray-300 font-bold flex items-center justify-center border border-[#2D3135]"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-white">
                            ฿{item.totalPrice.toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePart(idx)}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-3 text-center text-gray-500 text-xs bg-[#16191D] rounded-lg border border-[#2D3135] border-dashed">
                  ยังไม่ได้เลือกอะไหล่ (สามารถเพิ่มภายหลังได้ระหว่างซ่อม)
                </div>
              )}
            </div>

            {/* Sub-section B: Labor, Other Fees, Discounts, VAT, Deposit */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-[#2D3135]">
              
              {/* Inputs Column */}
              <div className="lg:col-span-7 space-y-3 text-xs">
                
                {/* Labor Fees */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-200 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-orange-400" />
                      <span>ค่าแรงช่าง / ค่าบริการ (บาท)</span>
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => applyLaborPreset(200)}
                        className="px-1.5 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded"
                      >
                        ถ่ายน้ำมัน ฿200
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLaborPreset(500)}
                        className="px-1.5 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded"
                      >
                        เช็คระยะ ฿500
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLaborPreset(800)}
                        className="px-1.5 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded"
                      >
                        ช่วงล่าง ฿800
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLaborPreset(2500)}
                        className="px-1.5 py-0.5 bg-[#16191D] hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 border border-[#2D3135] rounded"
                      >
                        ยกเกียร์ ฿2,500
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={laborFee}
                    onChange={(e) => setLaborFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Other Fees (Towing, Machining, etc.) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">ค่าใช้จ่ายอื่นๆ / งานซับนอก (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={otherFee || ''}
                      onChange={(e) => setOtherFee(Number(e.target.value))}
                      placeholder="เช่น 300"
                      className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">รายละเอียดค่าใช้จ่ายอื่นๆ</label>
                    <input
                      type="text"
                      value={otherFeeDescription || ''}
                      onChange={(e) => setOtherFeeDescription(e.target.value)}
                      placeholder="เช่น ค่าโรงกลึง, ค่าลากรถ, อัดบูช..."
                      className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Discounts (Amount vs Percent) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                      <span>ส่วนลด (Discount)</span>
                      <div className="flex items-center bg-[#16191D] p-0.5 rounded border border-[#2D3135] text-[10px]">
                        <button
                          type="button"
                          onClick={() => setDiscountType('amount')}
                          className={`px-1.5 py-0.5 rounded ${discountType === 'amount' ? 'bg-orange-500 text-white font-bold' : 'text-gray-400'}`}
                        >
                          ฿ บาท
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('percent')}
                          className={`px-1.5 py-0.5 rounded ${discountType === 'percent' ? 'bg-orange-500 text-white font-bold' : 'text-gray-400'}`}
                        >
                          % เปอร์เซ็นต์
                        </button>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percent' ? 100 : undefined}
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        placeholder={discountType === 'percent' ? 'เช่น 10%' : 'เช่น 200'}
                        className="w-full px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-lg text-gray-100 font-mono focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        {discountType === 'amount' ? '฿' : '%'}
                      </span>
                    </div>
                  </div>

                  {/* VAT 7% Toggle */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">ภาษีมูลค่าเพิ่ม (VAT)</label>
                    <div className="flex items-center gap-2 h-10 px-3 bg-[#16191D] border border-[#2D3135] rounded-lg">
                      <input
                        type="checkbox"
                        id="form-enable-vat"
                        checked={enableVat}
                        onChange={(e) => setEnableVat(e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      <label htmlFor="form-enable-vat" className="text-gray-200 font-medium cursor-pointer text-xs flex-1">
                        คิดภาษี VAT 7%
                      </label>
                      {enableVat && (
                        <span className="text-[11px] font-mono text-orange-400 font-bold">
                          +฿{financials.vatAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deposit Amount */}
                <div>
                  <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>รับเงินมัดจำล่วงหน้า (บาท)</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (ลูกค้าชำระมัดจำไว้ตอนเปิดใบสั่งซ่อม)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-[#16191D] border border-yellow-500/40 rounded-lg text-yellow-300 font-mono font-bold text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>

              </div>

              {/* Live Financial Breakdown Summary Card */}
              <div className="lg:col-span-5 bg-[#16191D] border border-[#2D3135] rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider pb-2 border-b border-[#2D3135] flex items-center justify-between">
                    <span>สรุปการเงินประเมิน</span>
                    <span className="text-[10px] text-orange-400 font-normal">คำนวณสด</span>
                  </h4>

                  <div className="space-y-1.5 pt-2 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>รวมค่าอะไหล่ ({partsList.length} รายการ):</span>
                      <span className="font-mono text-gray-200">฿{financials.partsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>รวมค่าแรง & บริการ:</span>
                      <span className="font-mono text-gray-200">฿{financials.laborFee.toLocaleString()}</span>
                    </div>
                    {financials.otherFee > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>ค่าใช้จ่ายอื่นๆ:</span>
                        <span className="font-mono text-gray-200">฿{financials.otherFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-400 font-medium pt-1 border-t border-[#2D3135]">
                      <span>รวมก่อนส่วนลด (Subtotal):</span>
                      <span className="font-mono text-gray-200">฿{financials.grossSubtotal.toLocaleString()}</span>
                    </div>
                    {financials.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>ส่วนลด ({financials.discountType === 'percent' ? `${financials.discountPercent}%` : '฿'}):</span>
                        <span className="font-mono">-฿{financials.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {financials.vatPercent > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>ภาษีมูลค่าเพิ่ม VAT ({financials.vatPercent}%):</span>
                        <span className="font-mono text-gray-200">+฿{financials.vatAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2D3135] space-y-2">
                  {/* Grand Total */}
                  <div className="flex items-center justify-between bg-[#0F1113] p-2.5 rounded-lg border border-[#2D3135]">
                    <div>
                      <span className="text-xs text-gray-300 font-bold block">ยอดสุทธิทั้งสิ้น (Total)</span>
                      <span className="text-[10px] text-gray-500">รวมค่าใช้จ่ายทั้งหมด</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-orange-400">
                      ฿{financials.grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Deposit and Balance Due */}
                  {financials.depositAmount > 0 && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-yellow-400">
                        <span>หักเงินมัดจำรับแล้ว:</span>
                        <span className="font-mono font-bold">-฿{financials.depositAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold bg-orange-500/10 p-2 rounded border border-orange-500/20">
                        <span>ยอดคงเหลือชำระวันรับรถ:</span>
                        <span className="font-mono text-sm text-orange-400">
                          ฿{financials.remainingBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* Section 4: Initial Intake Inspection Checklist */}
          <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>7. ตรวจเช็คสภาพรับรถเบื้องต้น (Initial Intake Checklist)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                  <span>ระดับน้ำมันเชื้อเพลิง</span>
                  <span className="text-orange-400 font-bold font-mono">{fuelLevel}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="valuable-check"
                  checked={valuableItemsChecked}
                  onChange={(e) => setValuableItemsChecked(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <label htmlFor="valuable-check" className="text-gray-300 cursor-pointer">
                  ตรวจสอบของมีค่าในรถเรียบร้อยแล้ว
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="spare-tire-check"
                  checked={spareTirePresent}
                  onChange={(e) => setSpareTirePresent(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <label htmlFor="spare-tire-check" className="text-gray-300 cursor-pointer">
                  ยางอะไหล่ & เครื่องมือประจำรถครบ
                </label>
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2D3135]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-[#0F1113] hover:bg-[#1C2025] text-gray-300 border border-[#2D3135] font-semibold text-xs sm:text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>บันทึกและเปิดใบสั่งซ่อม</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

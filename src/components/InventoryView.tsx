import React, { useState } from 'react';
import {
  Boxes,
  Search,
  PlusCircle,
  AlertTriangle,
  PackagePlus,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  ArrowUpDown,
  Tag,
  MapPin,
  TrendingDown,
  FileSpreadsheet,
  Send,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowDownCircle
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { SparePart } from '../types';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { downloadCsvFile, getStoredSpreadsheetId, isRealGoogleSpreadsheetId } from '../services/googleSheetsService';
import { generateLowStockAlertMessage, getLineShareUrl, openLineShare, DEFAULT_LINE_ID } from '../services/lineService';

export const InventoryView: React.FC = () => {
  const {
    spareParts,
    addSparePart,
    updateSparePart,
    deleteSparePart,
    restockPart,
    garageProfile,
    syncWithGoogleSheets,
    pullDataFromGoogleSheets,
    isPullingSheets,
  } = useGarage();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [restockModalPart, setRestockModalPart] = useState<SparePart | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [editPart, setEditPart] = useState<SparePart | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [deleteConfirmPart, setDeleteConfirmPart] = useState<{ id: string; name: string } | null>(null);

  // New Part Form State
  const [partCode, setPartCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SparePart['category']>('oil_fluid');
  const [brand, setBrand] = useState('');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [unit, setUnit] = useState('ชิ้น');
  const [stockQty, setStockQty] = useState<number>(10);
  const [minStockQty, setMinStockQty] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(500);
  const [sellPrice, setSellPrice] = useState<number>(750);
  const [supplier, setSupplier] = useState('');
  const [locationRack, setLocationRack] = useState('โซน A-01');

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'oil_fluid', label: 'น้ำมัน & ของเหลว' },
    { id: 'filter', label: 'ไส้กรอง' },
    { id: 'brake', label: 'ระบบเบรก' },
    { id: 'suspension', label: 'ช่วงล่าง & โช้ค' },
    { id: 'electrical', label: 'ระบบไฟ' },
    { id: 'tire', label: 'วัสดุสิ้นเปลือง' },
    { id: 'other', label: 'อื่นๆ' },
  ];

  const filteredParts = spareParts.filter((part) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (part.name || '').toLowerCase().includes(q) ||
      (part.partCode || '').toLowerCase().includes(q) ||
      (part.brand || '').toLowerCase().includes(q) ||
      (part.compatibleModels || '').toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'low') {
      matchesStock = part.stockQty <= part.minStockQty;
    } else if (stockStatusFilter === 'out') {
      matchesStock = part.stockQty <= 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockParts = spareParts.filter((p) => p.stockQty <= p.minStockQty);
  const lowStockCount = lowStockParts.length;
  const totalInventoryValue = spareParts.reduce((sum, p) => sum + (p.stockQty * p.costPrice), 0);
  const totalSellValue = spareParts.reduce((sum, p) => sum + (p.stockQty * p.sellPrice), 0);

  const inventorySheetId = getStoredSpreadsheetId('inventory') || (isRealGoogleSpreadsheetId(garageProfile.googleSheetsInventoryId) ? garageProfile.googleSheetsInventoryId : null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !partCode) return;

    await addSparePart({
      partCode: partCode.trim().toUpperCase(),
      name: name.trim(),
      category,
      brand: brand.trim() || 'OEM',
      compatibleModels: compatibleModels.trim() || 'รถยนต์ทั่วไป',
      unit,
      stockQty: Number(stockQty) || 0,
      minStockQty: Number(minStockQty) || 1,
      costPrice: Number(costPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      supplier: supplier.trim(),
      locationRack: locationRack.trim(),
    });

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPart) return;

    await updateSparePart(editPart.id, {
      name: editPart.name,
      partCode: editPart.partCode,
      category: editPart.category,
      brand: editPart.brand,
      compatibleModels: editPart.compatibleModels,
      unit: editPart.unit,
      stockQty: Number(editPart.stockQty),
      minStockQty: Number(editPart.minStockQty),
      costPrice: Number(editPart.costPrice),
      sellPrice: Number(editPart.sellPrice),
      supplier: editPart.supplier,
      locationRack: editPart.locationRack,
    });

    setEditPart(null);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restockModalPart && restockQty > 0) {
      await restockPart(restockModalPart.id, Number(restockQty));
      setRestockModalPart(null);
      setRestockQty(10);
    }
  };

  const resetForm = () => {
    setPartCode('');
    setName('');
    setCategory('oil_fluid');
    setBrand('');
    setCompatibleModels('');
    setUnit('ชิ้น');
    setStockQty(10);
    setMinStockQty(5);
    setCostPrice(500);
    setSellPrice(750);
    setSupplier('');
    setLocationRack('โซน A-01');
  };

  // Quick sync to Google Sheets
  const handleQuickSheetsSync = async () => {
    setIsSyncingSheets(true);
    await syncWithGoogleSheets('inventory');
    setIsSyncingSheets(false);
    setSyncFeedback('ซิงค์สต็อกอะไหล่กับ Google Sheets เรียบร้อยแล้ว');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Quick notify low stock to LINE
  const handleSendLowStockLine = async () => {
    if (lowStockParts.length === 0) return;
    const msg = generateLowStockAlertMessage(lowStockParts, garageProfile);
    await openLineShare(msg);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const headers = [
      'รหัสอะไหล่',
      'ชื่ออะไหล่',
      'หมวดหมู่',
      'ยี่ห้อ',
      'รุ่นรถยนต์ที่รองรับ',
      'หน่วยนับ',
      'จำนวนคงเหลือ',
      'จุดสั่งซื้อขั้นต่ำ',
      'ราคาต้นทุน (บาท)',
      'ราคาขาย (บาท)',
      'มูลค่ารวม',
      'ตำแหน่งจัดเก็บ',
      'Supplier'
    ];
    const rows = spareParts.map((p) => [
      p.partCode,
      p.name,
      p.category,
      p.brand,
      p.compatibleModels,
      p.unit,
      p.stockQty,
      p.minStockQty,
      p.costPrice,
      p.sellPrice,
      p.stockQty * p.costPrice,
      p.locationRack || '',
      p.supplier || ''
    ]);
    downloadCsvFile(`Songkarn-Inventory-${Date.now()}.csv`, [headers, ...rows]);
  };

  const handleDirectPull = async () => {
    setSyncFeedback('กำลังดึงข้อมูลสดจาก Google Sheets...');
    const res = await pullDataFromGoogleSheets(true);
    if (res && res.parts.length > 0) {
      setSyncFeedback(`✅ ดึงและอัปเดตสต็อกอะไหล่สดสำเร็จ ${res.parts.length} รายการจาก Google Sheets เรียบร้อยแล้ว!`);
      setTimeout(() => setSyncFeedback(null), 5000);
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
              <Boxes className="w-6 h-6 text-orange-500" />
              <span>คลังสต็อกอะไหล่ & สินค้า (Inventory)</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold">
              REAL-TIME SYNC
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            มูลค่าทุนในคลัง: <strong className="text-white font-mono font-bold">฿{totalInventoryValue.toLocaleString()}</strong> (มูลค่าขาย ฿{totalSellValue.toLocaleString()}) • เชื่อมต่อ Google Sheets อัตโนมัติ
          </p>
        </div>

        {/* Action Toolbars */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Direct Pull / Fetch Live Sheet Button */}
          <button
            type="button"
            disabled={isPullingSheets}
            onClick={handleDirectPull}
            title="ดึงข้อมูลสต็อกอะไหล่สดจาก Google Sheets มาแสดงผลและอัปเดตทันที"
            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 hover:text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/10 disabled:opacity-50"
          >
            <ArrowDownCircle className={`w-4 h-4 text-emerald-400 ${isPullingSheets ? 'animate-spin' : ''}`} />
            <span>{isPullingSheets ? 'กำลังดึงข้อมูลชีต...' : 'ดึงข้อมูลจากชีต (Pull)'}</span>
          </button>

          {/* Google Sheets Sync Trigger */}
          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#0F9D58]/15 hover:bg-[#0F9D58]/25 text-[#0F9D58] border border-[#0F9D58]/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>เชื่อมต่อ Google Sheets</span>
            {inventorySheetId && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
          </button>

          {/* Quick Line Alert if Low Stock */}
          {lowStockCount > 0 && (
            <button
              type="button"
              onClick={handleSendLowStockLine}
              title="แจ้งเตือนรายการอะไหล่ใกล้หมดเข้า LINE"
              className="px-3.5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#06C755]/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>แจ้งเตือน LINE ({lowStockCount})</span>
            </button>
          )}

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

          {/* Add Part Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ เพิ่มอะไหล่ใหม่</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Stats Mini Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#16191D] border border-[#2D3135] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-gray-400">Total Items</p>
            <p className="text-2xl font-mono font-bold text-white mt-0.5">{spareParts.length} รายการ</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-300 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-orange-400" />
          </div>
        </div>

        <div className={`p-4 bg-[#16191D] border rounded-xl flex items-center justify-between ${
          lowStockCount > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-[#2D3135]'
        }`}>
          <div>
            <p className="text-xs uppercase font-bold text-gray-400">Low Stock Alert</p>
            <p className={`text-2xl font-mono font-bold mt-0.5 ${lowStockCount > 0 ? 'text-red-400' : 'text-gray-200'}`}>
              {lowStockCount} รายการ
            </p>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#0F1113] text-gray-400'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 bg-[#16191D] border border-[#2D3135] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-gray-400">Total Units in Stock</p>
            <p className="text-2xl font-mono font-bold text-orange-400 mt-0.5">
              {spareParts.reduce((s, p) => s + p.stockQty, 0).toLocaleString()} หน่วย
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-[#16191D] border border-[#2D3135] text-gray-400 hover:text-white hover:bg-[#1C2025]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่ออะไหล่, รหัส Part, ยี่ห้อ หรือรุ่นรถ..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#16191D] border border-[#2D3135] rounded-xl text-xs sm:text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          <div className="flex gap-2 text-xs">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#16191D] border border-[#2D3135] rounded-xl text-gray-200 focus:outline-none focus:border-orange-500"
            >
              <option value="all">สถานะสต็อก: ทั้งหมด</option>
              <option value="low">⚠️ สต็อกใกล้หมด / ต่ำกว่าเกณฑ์</option>
              <option value="out">🚨 สินค้าหมด (0 ชิ้น)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121417] text-gray-400 font-bold border-b border-[#2D3135]">
              <tr>
                <th className="px-4 py-3.5">รหัสอะไหล่ / สินค้า</th>
                <th className="px-4 py-3.5">แบรนด์ & รุ่นที่รองรับ</th>
                <th className="px-4 py-3.5 text-center">คงเหลือ / เกณฑ์</th>
                <th className="px-4 py-3.5 text-right">ราคาต้นทุน</th>
                <th className="px-4 py-3.5 text-right">ราคาขาย</th>
                <th className="px-4 py-3.5 text-center">ตำแหน่งจัดเก็บ</th>
                <th className="px-4 py-3.5 text-center">จัดการสต็อก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3135]/60 text-gray-200">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                    <p>ไม่พบรายการอะไหล่ที่ค้นหา</p>
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isLow = part.stockQty <= part.minStockQty;
                  const isOut = part.stockQty <= 0;

                  return (
                    <tr key={part.id} className="hover:bg-[#1C2025]/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-orange-400 text-xs px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                            {part.partCode}
                          </span>
                          <div>
                            <p className="font-bold text-gray-100 text-sm">{part.name}</p>
                            <p className="text-[11px] text-gray-400">{part.category}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-300">{part.brand}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{part.compatibleModels}</p>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-full ${
                            isOut
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {part.stockQty} {part.unit}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">/ {part.minStockQty}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-gray-400">
                        ฿{part.costPrice.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                        ฿{part.sellPrice.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-300 bg-[#0F1113] px-2 py-0.5 rounded border border-[#2D3135]">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          <span>{part.locationRack || '-'}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setRestockModalPart(part);
                              setRestockQty(10);
                            }}
                            title="เติมสต็อกสินค้า"
                            className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditPart(part)}
                            title="แก้ไขข้อมูลอะไหล่"
                            className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-[#252B32] text-gray-300 border border-[#2D3135] transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmPart({ id: part.id, name: part.name })}
                            title="ลบรายการ"
                            className="p-1.5 rounded-lg bg-[#0F1113] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#2D3135] transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Part Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-xl shadow-2xl p-6 my-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-orange-500" />
              <span>เพิ่มรายการอะไหล่ / สินค้าใหม่</span>
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">รหัสอะไหล่ (Part Code) *</label>
                  <input
                    type="text"
                    required
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value.toUpperCase())}
                    placeholder="เช่น FLT-TY-01"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">หมวดหมู่อะไหล่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="oil_fluid">น้ำมัน & ของเหลว</option>
                    <option value="filter">ไส้กรอง</option>
                    <option value="brake">ระบบเบรก</option>
                    <option value="suspension">ช่วงล่าง & โช้ค</option>
                    <option value="electrical">ระบบไฟ</option>
                    <option value="tire">วัสดุสิ้นเปลือง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">ชื่ออะไหล่ / รายการสินค้า *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น กรองน้ำมันเครื่องแท้ Toyota Vios/Yaris"
                  className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ยี่ห้อ / แบรนด์</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Toyota Genuine / Denso"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ชิ้น / ลูก / ลิตร / ชุด"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">รุ่นรถยนต์ที่รองรับ</label>
                <input
                  type="text"
                  value={compatibleModels}
                  onChange={(e) => setCompatibleModels(e.target.value)}
                  placeholder="เช่น Vios 2008-2020, Yaris 1.2"
                  className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">จำนวนเริ่มต้น</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">จุดสั่งซื้อขั้นต่ำ</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockQty}
                    onChange={(e) => setMinStockQty(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ต้นทุน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ราคาขาย (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono text-emerald-400 font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ตำแหน่งเก็บ (Rack)</label>
                  <input
                    type="text"
                    value={locationRack}
                    onChange={(e) => setLocationRack(e.target.value)}
                    placeholder="เช่น โซน A-02"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Supplier / ร้านค้าส่ง</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="เช่น บจก. รวมอะไหล่ยนต์"
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#2D3135]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0F1113] text-gray-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 active:scale-95"
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModalPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-orange-500" />
              <span>เติมสต็อกอะไหล่ (Restock)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              รายการ: <strong className="text-white">{restockModalPart.name}</strong> ({restockModalPart.partCode})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#0F1113] rounded-xl border border-[#2D3135] flex justify-between items-center">
                <span>คงเหลือปัจจุบัน:</span>
                <span className="font-mono font-bold text-orange-400 text-sm">
                  {restockModalPart.stockQty} {restockModalPart.unit}
                </span>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">จำนวนที่รับเข้าเพิ่ม (+)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono text-base font-bold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                ยอดรวมหลังรับเข้า: <strong>{restockModalPart.stockQty + Number(restockQty)} {restockModalPart.unit}</strong>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalPart(null)}
                  className="px-4 py-2 rounded-xl bg-[#0F1113] text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md active:scale-95"
                >
                  ยืนยันเติมสต็อก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-xl shadow-2xl p-6 my-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-500" />
              <span>แก้ไขข้อมูลอะไหล่</span>
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">รหัสอะไหล่</label>
                  <input
                    type="text"
                    required
                    value={editPart.partCode || ''}
                    onChange={(e) => setEditPart({ ...editPart, partCode: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">หมวดหมู่</label>
                  <select
                    value={editPart.category || 'other'}
                    onChange={(e) => setEditPart({ ...editPart, category: e.target.value as any })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="oil_fluid">น้ำมัน & ของเหลว</option>
                    <option value="filter">ไส้กรอง</option>
                    <option value="brake">ระบบเบรก</option>
                    <option value="suspension">ช่วงล่าง & โช้ค</option>
                    <option value="electrical">ระบบไฟ</option>
                    <option value="tire">วัสดุสิ้นเปลือง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">ชื่ออะไหล่</label>
                <input
                  type="text"
                  required
                  value={editPart.name || ''}
                  onChange={(e) => setEditPart({ ...editPart, name: e.target.value })}
                  className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ยี่ห้อ</label>
                  <input
                    type="text"
                    value={editPart.brand || ''}
                    onChange={(e) => setEditPart({ ...editPart, brand: e.target.value })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">รุ่นรถยนต์ที่รองรับ</label>
                  <input
                    type="text"
                    value={editPart.compatibleModels || ''}
                    onChange={(e) => setEditPart({ ...editPart, compatibleModels: e.target.value })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">คงเหลือ</label>
                  <input
                    type="number"
                    min="0"
                    value={editPart.stockQty ?? 0}
                    onChange={(e) => setEditPart({ ...editPart, stockQty: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">จุดสั่งซื้อต่ำสุด</label>
                  <input
                    type="number"
                    min="1"
                    value={editPart.minStockQty ?? 1}
                    onChange={(e) => setEditPart({ ...editPart, minStockQty: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ต้นทุน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPart.costPrice ?? 0}
                    onChange={(e) => setEditPart({ ...editPart, costPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">ราคาขาย (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPart.sellPrice ?? 0}
                    onChange={(e) => setEditPart({ ...editPart, sellPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0F1113] border border-[#2D3135] rounded-xl text-white font-mono text-emerald-400 font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#2D3135]">
                <button
                  type="button"
                  onClick={() => setEditPart(null)}
                  className="px-4 py-2 rounded-xl bg-[#0F1113] text-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md active:scale-95"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        targetTab="inventory"
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16191D] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบอะไหล่</h3>
                <p className="text-xs text-gray-300 font-medium truncate max-w-[260px]">{deleteConfirmPart.name}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการอะไหล่นี้ออกจากสต็อก? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D3135]">
              <button
                type="button"
                onClick={() => setDeleteConfirmPart(null)}
                className="px-4 py-2 bg-[#252B32] hover:bg-[#2D3135] text-gray-300 rounded-xl text-xs font-semibold transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSparePart(deleteConfirmPart.id);
                  setDeleteConfirmPart(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/30"
              >
                ยืนยันลบอะไหล่
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

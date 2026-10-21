import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Package, Check, AlertTriangle, Sparkles, ChevronDown, Layers, Tag } from 'lucide-react';
import { SparePart } from '../types';

interface SparePartSearchSelectProps {
  spareParts: SparePart[];
  selectedPartId: string;
  onSelectPart: (part: SparePart | null) => void;
  placeholder?: string;
  className?: string;
  onOpenCustomModal?: () => void;
  carBrandOrModel?: string; // Optional context to suggest relevant parts
}

export const SparePartSearchSelect: React.FC<SparePartSearchSelectProps> = ({
  spareParts,
  selectedPartId,
  onSelectPart,
  placeholder = '🔍 พิมพ์ค้นหารหัส, ชื่ออะไหล่, ยี่ห้อ หรือเลือกรุ่นรถ...',
  className = '',
  onOpenCustomModal,
  carBrandOrModel = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPart = spareParts.find((p) => p.id === selectedPartId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Categories list
  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'oil_fluid', label: 'น้ำมัน/ของเหลว' },
    { id: 'filter', label: 'ไส้กรอง' },
    { id: 'brake', label: 'ระบบเบรก' },
    { id: 'suspension', label: 'ช่วงล่าง' },
    { id: 'electrical', label: 'ระบบไฟ' },
    { id: 'tire', label: 'วัสดุสิ้นเปลือง' },
  ];

  // Filtered parts based on search term & category
  const filteredParts = spareParts.filter((part) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      part.name.toLowerCase().includes(term) ||
      part.partCode.toLowerCase().includes(term) ||
      part.brand.toLowerCase().includes(term) ||
      part.compatibleModels.toLowerCase().includes(term) ||
      part.locationRack.toLowerCase().includes(term);

    const matchesCat = activeCategory === 'all' || part.category === activeCategory;

    return matchesSearch && matchesCat;
  });

  // Recommended parts based on car brand or model
  const recommendedParts = carBrandOrModel
    ? spareParts.filter(
        (p) =>
          p.compatibleModels.toLowerCase().includes(carBrandOrModel.toLowerCase()) ||
          p.brand.toLowerCase().includes(carBrandOrModel.toLowerCase())
      )
    : [];

  const handleSelect = (part: SparePart) => {
    onSelectPart(part);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPart(null);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Selected Preview or Search Trigger Box */}
      {selectedPart && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-full flex items-center justify-between p-2.5 bg-[#16191D] hover:bg-[#1B1F24] border border-orange-500/60 rounded-xl cursor-pointer transition-all shadow-md group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-orange-400 text-xs bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                  {selectedPart.partCode}
                </span>
                <span className="text-xs font-semibold text-gray-100 truncate">{selectedPart.name}</span>
                <span className="text-[10px] text-gray-400">({selectedPart.brand})</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                <span className="text-emerald-400 font-mono font-bold">฿{selectedPart.sellPrice.toLocaleString()}</span>
                <span>•</span>
                <span className={selectedPart.stockQty <= selectedPart.minStockQty ? 'text-red-400' : 'text-gray-300'}>
                  คงเหลือ: <strong className="font-mono">{selectedPart.stockQty}</strong> {selectedPart.unit}
                </span>
                <span>•</span>
                <span className="text-gray-400 text-[10px]">รุ่น: {selectedPart.compatibleModels}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              title="ลบการเลือก"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs text-orange-400 group-hover:underline font-medium ml-1">เปลี่ยน</span>
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <div
            onClick={() => {
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            className={`w-full flex items-center bg-[#16191D] border rounded-xl px-3 py-2 transition-all cursor-text ${
              isOpen ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg' : 'border-[#2D3135] hover:border-gray-600'
            }`}
          >
            <Search className="w-4 h-4 text-orange-400 shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm || ''}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full bg-transparent text-xs text-gray-100 placeholder-gray-400 focus:outline-none"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }}
                className="p-1 text-gray-400 hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>
      )}

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-[380px] flex flex-col backdrop-blur-md">
          {/* Quick Category Chips */}
          <div className="p-2 border-b border-[#2D3135] bg-[#121417] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-orange-500 text-white font-bold'
                    : 'bg-[#1C2025] text-gray-400 hover:text-gray-200 hover:bg-[#25292E]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Recommended Section (if car model context is present) */}
          {recommendedParts.length > 0 && !searchTerm && activeCategory === 'all' && (
            <div className="px-3 py-1.5 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-1.5 text-orange-400 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แนะนำตรงรุ่นสำหรับ {carBrandOrModel}:</span>
            </div>
          )}

          {/* List of Spare Parts */}
          <div className="overflow-y-auto flex-1 divide-y divide-[#2D3135]/60 p-1">
            {filteredParts.length > 0 ? (
              filteredParts.map((part) => {
                const isSelected = part.id === selectedPartId;
                const isLowStock = part.stockQty <= part.minStockQty;
                const isOutOfStock = part.stockQty <= 0;

                return (
                  <div
                    key={part.id}
                    onClick={() => handleSelect(part)}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-500/20 text-orange-300'
                        : isOutOfStock
                        ? 'opacity-50 hover:bg-[#1C2025]'
                        : 'hover:bg-[#1F2328]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded text-[11px] border border-orange-500/20">
                          {part.partCode}
                        </span>
                        <span className="font-semibold text-gray-100 truncate">{part.name}</span>
                        {part.brand && (
                          <span className="text-[10px] bg-[#25292E] text-gray-300 px-1.5 py-0.5 rounded">
                            {part.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                        <span>รุ่น: {part.compatibleModels}</span>
                        <span>•</span>
                        <span>ชั้นวาง: {part.locationRack}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        ฿{part.sellPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          isOutOfStock
                            ? 'bg-red-500/20 text-red-400'
                            : isLowStock
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {isOutOfStock ? 'หมด' : `คงเหลือ ${part.stockQty} ${part.unit}`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-400 space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-400/80" />
                <p className="text-xs">ไม่พบอะไหล่ที่ตรงกับ "{searchTerm}" ในคลัง</p>
                {onOpenCustomModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCustomModal();
                    }}
                    className="mt-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>+ เพิ่มเป็นอะไหล่นอกระบบ / ค่าซับ</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer bar with quick action */}
          <div className="p-2 border-t border-[#2D3135] bg-[#121417] flex items-center justify-between text-[11px] text-gray-400">
            <span>แสดง {filteredParts.length} รายการจากคลังอู่</span>
            {onOpenCustomModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomModal();
                }}
                className="text-orange-400 hover:text-orange-300 font-semibold"
              >
                + เพิ่มอะไหล่นอกสต็อก
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

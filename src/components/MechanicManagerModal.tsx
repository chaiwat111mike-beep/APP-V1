import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Star,
  Award,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { MechanicStaff } from '../types';

interface MechanicManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SPECIALTIES = [
  'เครื่องยนต์เบนซิน/ดีเซล',
  'ระบบเบรกและคลัตช์',
  'ระบบช่วงล่างและลูกหมาก',
  'ระบบไฟฟ้ายานยนต์และไดนาโม',
  'ระบบปรับอากาศรถยนต์',
  'ระบบส่งกำลังและเกียร์ออโต้',
  'เปลี่ยนถ่ายของเหลวและไส้กรอง',
  'ตั้งศูนย์ถ่วงล้อและยาง',
  'ตรวจเช็คระยะตามมาตรฐาน'
];

export const MechanicManagerModal: React.FC<MechanicManagerModalProps> = ({ isOpen, onClose }) => {
  const { mechanics, addMechanic, updateMechanic, deleteMechanic, jobOrders } = useGarage();

  const [editingMechanic, setEditingMechanic] = useState<MechanicStaff | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'lead' | 'mechanic' | 'electrician' | 'apprentice'>('mechanic');
  const [positionTitle, setPositionTitle] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');
  const [status, setStatus] = useState<'available' | 'busy' | 'leave'>('available');
  const [rating, setRating] = useState<number>(5.0);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRole('mechanic');
    setPositionTitle('');
    setSpecialties(['งานซ่อมบำรุงทั่วไป']);
    setNewSpecialtyInput('');
    setStatus('available');
    setRating(5.0);
    setEditingMechanic(null);
    setIsAddingNew(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
    setEditingMechanic(null);
  };

  const handleStartEdit = (mech: MechanicStaff) => {
    setIsAddingNew(false);
    setEditingMechanic(mech);
    setName(mech.name);
    setPhone(mech.phone);
    setEmail(mech.email || '');
    setRole(mech.role);
    setPositionTitle(mech.positionTitle || '');
    setSpecialties(mech.specialties || []);
    setStatus(mech.status);
    setRating(mech.rating ?? 5.0);
  };

  const handleToggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      setSpecialties(specialties.filter((s) => s !== spec));
    } else {
      setSpecialties([...specialties, spec]);
    }
  };

  const handleAddCustomSpecialty = () => {
    const trimmed = newSpecialtyInput.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialtyInput('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMechanic) {
      // Update
      const mechUpdate: Partial<MechanicStaff> = {
        name: name.trim(),
        phone: phone.trim() || '061-069-2036',
        role,
        positionTitle: positionTitle.trim() || (role === 'lead' ? 'หัวหน้าช่าง' : 'ช่างซ่อมบำรุง'),
        specialties: specialties.length > 0 ? specialties : ['งานซ่อมบำรุงทั่วไป'],
        status,
        rating: Number(rating) || 5.0,
      };
      if (email.trim()) {
        mechUpdate.email = email.trim();
      }
      await updateMechanic(editingMechanic.id, mechUpdate);
      showNotification(`บันทึกข้อมูลของ "${name}" สำเร็จเรียบร้อย`);
      resetForm();
    } else {
      // Add
      const newMechPayload: Omit<MechanicStaff, 'id' | 'activeJobsCount' | 'completedJobsCount'> = {
        name: name.trim(),
        phone: phone.trim() || '061-069-2036',
        role,
        positionTitle: positionTitle.trim() || (role === 'lead' ? 'หัวหน้าช่าง' : 'ช่างเทคนิค'),
        specialties: specialties.length > 0 ? specialties : ['งานซ่อมบำรุงทั่วไป'],
        status,
        rating: Number(rating) || 5.0,
      };
      if (email.trim()) {
        newMechPayload.email = email.trim();
      }
      await addMechanic(newMechPayload);
      showNotification(`เพิ่มรายชื่อช่าง "${name}" เข้าสู่ระบบสำเร็จ`);
      resetForm();
    }
  };

  const handleDelete = async (id: string, mechName: string) => {
    await deleteMechanic(id);
    setDeleteConfirmId(null);
    showNotification(`ลบรายชื่อ "${mechName}" ออกจากระบบแล้ว`);
  };

  const filteredMechanics = mechanics.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.positionTitle && m.positionTitle.toLowerCase().includes(q)) ||
      (m.specialties && m.specialties.some((s) => s.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#14181D] border border-[#2D3135] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2D3135] flex items-center justify-between bg-[#16191D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>จัดการรายชื่อช่าง & ทีมงานซ่อม</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono font-bold border border-orange-500/30">
                  {mechanics.length} ท่าน
                </span>
              </h2>
              <p className="text-xs font-medium text-gray-300 mt-0.5">
                เจ้าของอู่สามารถ เพิ่ม ลบ และแก้ไขข้อมูลช่าง ตำแหน่ง เบอร์ติดต่อ และความชำนาญ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAddingNew && !editingMechanic && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ เพิ่มช่างใหม่</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white hover:bg-[#20252C] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Form Mode (Add or Edit) */}
          {(isAddingNew || editingMechanic) ? (
            <form onSubmit={handleSave} className="bg-[#0F1113] border-2 border-orange-500/40 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-[#2D3135]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {editingMechanic ? (
                    <>
                      <Edit2 className="w-4 h-4 text-orange-400" />
                      <span>แก้ไขข้อมูลช่าง: <span className="text-orange-400">{editingMechanic.name}</span></span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-orange-400" />
                      <span>เพิ่มรายชื่อช่างใหม่เข้าสู่อู่</span>
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    ชื่อ-นามสกุล / ชื่อเล่นเรียกในอู่ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น ช่างไมค์ ชัยวัฒน์, ช่างศักดิ์"
                    className="w-full px-3.5 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-sm font-semibold text-white focus:outline-none placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    เบอร์โทรศัพท์มือถือ <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="เช่น 061-069-2036"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-sm font-mono text-white focus:outline-none placeholder-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    ระดับตำแหน่ง (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-sm font-medium text-white focus:outline-none"
                  >
                    <option value="lead">หัวหน้าช่างประจำอู่ (Lead Mechanic)</option>
                    <option value="mechanic">ช่างเทคนิคอาวุโส / ช่างยนต์ (Mechanic)</option>
                    <option value="electrician">ช่างระบบไฟฟ้าและแอร์ (Electrician & A/C)</option>
                    <option value="apprentice">ผู้ช่วยช่าง / ช่างฝึกหัด (Apprentice)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    ชื่อตำแหน่งแสดงบนระบบ
                  </label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="เช่น หัวหน้าช่างประจำอู่, ช่างช่วงล่าง-เบรก"
                    className="w-full px-3.5 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-sm font-medium text-white focus:outline-none placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    อีเมล (ถ้ามี)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น mechanic@songkarn.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-sm text-white focus:outline-none placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      สถานะการทำงาน
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                    >
                      <option value="available">🟢 ว่าง (พร้อมรับงาน)</option>
                      <option value="busy">🟠 กำลังซ่อมงาน</option>
                      <option value="leave">⚪ ลาหยุด / ไม่อยู่</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      คะแนนประเมิน (ดาว)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={rating}
                      onChange={(e) => setRating(parseFloat(e.target.value) || 5.0)}
                      className="w-full px-3 py-2.5 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-xl text-xs font-mono font-bold text-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Specialties Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-2">
                  ความเชี่ยวชาญ & ทักษะงานช่าง:
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DEFAULT_SPECIALTIES.map((spec) => {
                    const isSelected = specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleToggleSpecialty(spec)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-[#16191D] text-gray-300 border-[#2D3135] hover:border-gray-500'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {spec}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSpecialtyInput}
                    onChange={(e) => setNewSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSpecialty();
                      }
                    }}
                    placeholder="พิมพ์ความเชี่ยวชาญอื่นเพิ่มเติมแล้วกดเพิ่ม..."
                    className="flex-1 px-3 py-2 bg-[#16191D] border border-[#2D3135] focus:border-orange-500 rounded-lg text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpecialty}
                    className="px-4 py-2 bg-[#20252C] hover:bg-[#282F38] text-gray-200 font-bold text-xs rounded-lg border border-[#2D3135]"
                  >
                    เพิ่มทักษะ
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2D3135]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-[#16191D] hover:bg-[#20252C] text-gray-300 font-bold text-xs transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingMechanic ? 'บันทึกการแก้ไข' : 'บันทึกรายชื่อช่างใหม่'}</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Search bar & list count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารายชื่อช่าง เบอร์โทร หรือความเชี่ยวชาญ..."
                className="w-full px-4 py-2 bg-[#0F1113] border border-[#2D3135] focus:border-orange-500 rounded-xl text-xs font-medium text-white focus:outline-none placeholder-gray-500"
              />
            </div>
            <div className="text-xs text-gray-400 font-medium">
              แสดง <strong className="text-white font-mono">{filteredMechanics.length}</strong> จากทั้งหมด {mechanics.length} ท่าน
            </div>
          </div>

          {/* Mechanics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMechanics.map((mech, index) => {
              const activeCount = jobOrders.filter(
                (j) => j.mechanicId === mech.id && j.status !== 'delivered' && j.status !== 'closed'
              ).length;
              const isDeleting = deleteConfirmId === mech.id;

              return (
                <div
                  key={mech.id}
                  className="bg-[#0F1113] border border-[#2D3135] hover:border-orange-500/40 rounded-2xl p-5 space-y-4 shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-black text-sm font-mono shadow-inner">
                          {mech.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 font-bold border border-orange-500/25">
                              {mech.positionTitle || (mech.role === 'lead' ? 'หัวหน้าช่าง' : 'ช่างประจำอู่')}
                            </span>
                            {mech.role === 'lead' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-extrabold">
                                LEAD
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-extrabold text-white mt-1">
                            {mech.name}
                          </h4>
                        </div>
                      </div>

                      {/* Status indicator badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          mech.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : mech.status === 'busy'
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                        }`}
                      >
                        {mech.status === 'available' ? 'พร้อมรับงาน' : mech.status === 'busy' ? 'กำลังซ่อม' : 'ลาหยุด'}
                      </span>
                    </div>

                    {/* Contact & Specs */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-gray-300 font-medium">
                        <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="font-mono font-bold text-gray-100">{mech.phone}</span>
                      </div>
                      {mech.email && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate">{mech.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Specialties tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(mech.specialties || []).map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-[#16191D] text-gray-300 rounded text-[10px] font-medium border border-[#2D3135]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="pt-3 border-t border-[#2D3135] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        งานที่กำลังซ่อม: <strong className="text-orange-400 font-mono font-bold">{activeCount} คัน</strong>
                      </span>
                      <span className="flex items-center gap-1 text-orange-400 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                        <span className="font-mono">{mech.rating || 5.0}</span>
                      </span>
                    </div>

                    {/* Buttons: Edit & Delete */}
                    {isDeleting ? (
                      <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 space-y-2">
                        <p className="text-[11px] font-bold text-red-300 text-center">
                          ยืนยันการลบ "{mech.name}" ออกจากระบบ?
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(mech.id, mech.name)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                          >
                            ลบจริง
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 bg-[#16191D] hover:bg-[#20252C] text-gray-300 rounded-lg text-xs"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(mech)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-[#16191D] hover:bg-[#22272E] text-orange-300 hover:text-orange-200 border border-orange-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>แก้ไขข้อมูล</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(mech.id)}
                          className="py-1.5 px-2.5 rounded-lg bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-500/30 transition-colors"
                          title="ลบรายชื่อช่างนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2D3135] bg-[#16191D] flex items-center justify-between text-xs text-gray-400">
          <span>💡 ข้อมูลช่างจะถูกนำไปใช้อัตโนมัติเมื่อเลือกช่างรับผิดชอบในใบสั่งซ่อมและมอบหมายช่องซ่อม</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0F1113] hover:bg-[#20252C] border border-[#2D3135] text-gray-200 font-bold"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};

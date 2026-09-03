import React, { useState } from 'react';
import {
  Wrench,
  Car,
  Users,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Phone,
  Star,
  Clock,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { ServiceBay, MechanicStaff } from '../types';

interface ServiceBaysViewProps {
  onSelectJob: (jobId: string) => void;
  onOpenNewJobModal: () => void;
}

export const ServiceBaysView: React.FC<ServiceBaysViewProps> = ({
  onSelectJob,
  onOpenNewJobModal,
}) => {
  const { serviceBays, mechanics, jobOrders, updateBayStatus, updateMechanicStatus } = useGarage();

  const occupiedCount = serviceBays.filter((b) => b.status === 'occupied').length;
  const availableCount = serviceBays.filter((b) => b.status === 'available').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16191D] border border-[#2D3135] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-orange-500" />
            <span>ช่องซ่อม & ลิฟต์ยกรถ & ทีมช่าง (Service Bays & Staff)</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            บริหารจัดการช่องซ่อม {serviceBays.length} ช่อง (ใช้งาน {occupiedCount} • ว่าง {availableCount}) และทีมช่างผู้เชี่ยวชาญ
          </p>
        </div>

        <button
          onClick={onOpenNewJobModal}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>+ เปิดรับรถเข้าช่องซ่อม</span>
        </button>
      </div>

      {/* 3 Service Bays Floor Plan */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
          <Car className="w-4 h-4 text-orange-500" />
          <span>ผังช่องซ่อมและลิฟต์ยกรถ 3 ช่อง (Garage Floor Plan)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {serviceBays.map((bay) => {
            const currentJob = jobOrders.find((j) => j.id === bay.currentJobId);
            const isOccupied = bay.status === 'occupied' && currentJob;

            return (
              <div
                key={bay.id}
                className={`p-5 rounded-xl border transition-all ${
                  isOccupied
                    ? 'bg-[#16191D] border-orange-500/40 shadow-lg shadow-orange-500/5'
                    : bay.status === 'maintenance'
                    ? 'bg-[#0F1113] border-[#2D3135] opacity-75'
                    : 'bg-[#16191D] border-[#2D3135] hover:border-green-500/40'
                }`}
              >
                {/* Bay Top */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2D3135]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                        isOccupied
                          ? 'bg-orange-500 text-white'
                          : bay.status === 'maintenance'
                          ? 'bg-[#0F1113] text-gray-400 border border-[#2D3135]'
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}
                    >
                      #{bay.bayNumber}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{bay.name}</h3>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{bay.type}</span>
                    </div>
                  </div>

                  <select
                    value={bay.status}
                    onChange={(e) => updateBayStatus(bay.id, e.target.value as any)}
                    className="text-xs bg-[#0F1113] border border-[#2D3135] rounded-lg px-2 py-1 text-gray-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="available">ว่าง (Available)</option>
                    <option value="occupied">กำลังซ่อม (Occupied)</option>
                    <option value="maintenance">ปิดบำรุง (Maintenance)</option>
                  </select>
                </div>

                {/* Bay Body */}
                {isOccupied && currentJob ? (
                  <div
                    onClick={() => onSelectJob(currentJob.id)}
                    className="mt-4 p-3.5 bg-[#0F1113] hover:bg-[#1C2025] rounded-lg border border-[#2D3135] cursor-pointer space-y-2.5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-orange-400 font-mono">{currentJob.licensePlate}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#16191D] text-gray-400 border border-[#2D3135] font-mono">
                        {currentJob.jobNo}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-200">
                      {currentJob.carBrand} {currentJob.carModel} ({currentJob.customerName})
                    </p>

                    <p className="text-[11px] text-gray-400 line-clamp-1 bg-[#16191D] p-1.5 rounded border border-[#2D3135]">
                      อาการ: {currentJob.issueDescription}
                    </p>

                    <div className="pt-2 border-t border-[#2D3135] flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        ช่าง: <strong className="text-gray-200">{currentJob.mechanicName || 'ยังไม่ระบุ'}</strong>
                      </span>
                      <span className="text-orange-400 font-bold group-hover:underline">
                        ดูใบสั่งซ่อม &rarr;
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 py-6 text-center text-gray-500 text-xs">
                    {bay.status === 'maintenance' ? (
                      <p>⚠️ ลิฟต์ยกรถอยู่ระหว่างตรวจเช็คสภาพ</p>
                    ) : (
                      <>
                        <p className="text-gray-400 font-medium">ช่องซ่อมว่าง พร้อมใช้งาน</p>
                        <button
                          onClick={onOpenNewJobModal}
                          className="mt-2 text-xs font-bold text-orange-400 hover:text-orange-300 inline-block"
                        >
                          + มอบหมายงานให้ช่องนี้
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mechanics / Staff Section */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              <span>ทีมช่างซ่อมและช่างเทคนิค ({mechanics.length} ท่าน)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              ความเชี่ยวชาญ ประสิทธิภาพงานซ่อม และสถานะการปฏิบัติงาน
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mechanics.map((mech) => {
            const currentMechJobs = jobOrders.filter(
              (j) => j.mechanicId === mech.id && j.status !== 'delivered' && j.status !== 'completed'
            );

            return (
              <div
                key={mech.id}
                className="p-4 bg-[#0F1113] border border-[#2D3135] rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                      {mech.name.slice(4, 5)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{mech.name}</h4>
                      <span className="text-[10px] text-orange-400 font-semibold uppercase">{mech.role}</span>
                    </div>
                  </div>

                  <select
                    value={mech.status}
                    onChange={(e) => updateMechanicStatus(mech.id, e.target.value as any)}
                    className="text-[10px] bg-[#16191D] border border-[#2D3135] rounded px-2 py-1 text-gray-200 focus:outline-none"
                  >
                    <option value="available">ว่าง</option>
                    <option value="busy">กำลังซ่อม</option>
                    <option value="leave">ลา</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-1">
                  {mech.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[#16191D] text-gray-300 rounded text-[10px] border border-[#2D3135]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#2D3135] flex items-center justify-between text-xs text-gray-400">
                  <span>งานที่กำลังทำ: <strong className="text-orange-400 font-mono">{currentMechJobs.length} คัน</strong></span>
                  <span className="flex items-center gap-1 text-orange-400 font-semibold text-[11px]">
                    <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                    <span className="font-mono">{mech.rating}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

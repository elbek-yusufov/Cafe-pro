import React, { useState } from 'react';
import { Users, UserPlus, Shield, Phone, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { Employee } from '../../types/pos';

interface EmployeesPageProps {
  employees: Employee[];
  onToggleStatus: (empId: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({
  employees,
  onToggleStatus,
}) => {
  const [empList, setEmpList] = useState<Employee[]>(employees);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Employee['role']>('CASHIER');
  const [phone, setPhone] = useState('+998 90 ');
  const [pin, setPin] = useState('1234');

  const handleAddEmployee = () => {
    if (!name.trim()) return;
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name,
      role,
      phone,
      pin,
      isActive: true,
      branch: 'Markaziy Filial',
    };
    setEmpList([...empList, newEmp]);
    setIsModalOpen(false);
    setName('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Xodimlar &amp; Ruxsatlar
          </h1>
          <p className="text-xs text-slate-500">Kassirlar, ofitsiantlar, oshpazlar va PIN kod boshqaruvi</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 touch-press"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yangi Xodim Qo&apos;shish</span>
        </button>
      </div>

      {/* 2. Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {empList.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 font-black text-sm flex items-center justify-center border border-teal-200">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{emp.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {emp.phone}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    emp.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : emp.role === 'CASHIER'
                      ? 'bg-teal-100 text-teal-800'
                      : emp.role === 'CHEF'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {emp.role === 'CASHIER'
                    ? 'Kassir'
                    : emp.role === 'CHEF'
                    ? 'Oshpaz'
                    : emp.role === 'WAITER'
                    ? 'Ofitsiant'
                    : emp.role}
                </span>
              </div>

              <div className="py-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Filial:</span>
                  <span className="font-bold text-slate-800">{emp.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIN Kod:</span>
                  <span className="font-mono font-bold text-teal-700 bg-slate-100 px-2 py-0.5 rounded">
                    {emp.pin}
                  </span>
                </div>
                {emp.currentShift && (
                  <div className="flex justify-between">
                    <span>Smena:</span>
                    <span className="text-slate-800 font-medium">{emp.currentShift}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  emp.isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {emp.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {emp.isActive ? 'Smenada faol' : 'Dam olishda'}
              </span>

              <button
                onClick={() => onToggleStatus(emp.id)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                {emp.isActive ? 'To\'xtatish' : 'Faollashtirish'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">Yangi Xodim Ro&apos;yxatdan O&apos;tkazish</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">To&apos;liq ismi</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Sardor Rustamov"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lavozimi</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                >
                  <option value="CASHIER">Kassir</option>
                  <option value="WAITER">Ofitsiant</option>
                  <option value="CHEF">Oshpaz</option>
                  <option value="MANAGER">Menejer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Telefon raqami</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kassa PIN kodi (4 xonali)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-base font-bold focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
              >
                Qo&apos;shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

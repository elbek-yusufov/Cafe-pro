import React, { useState } from 'react';
import { Settings, Printer, Store, Receipt, CreditCard, ShieldCheck, Check } from 'lucide-react';
import { RestaurantSettings } from '../../types/pos';

interface SettingsPageProps {
  settings: RestaurantSettings;
  onSaveSettings: (settings: RestaurantSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<RestaurantSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Restoran va Kassa Sozlamalari
          </h1>
          <p className="text-xs text-slate-500">Chek matni, printerlar, soliq va to&apos;lov tizimlari sozlamalari</p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" /> Saqlandi!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 2. Restaurant Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Store className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Restoran Rekvizitlari</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Restoran nomi</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Telefon raqami</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Manzil</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">STIR / Soliq raqami (INN)</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Printer & Receipt Settings */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Printer className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Termal Printer &amp; Chek Sozlamalari</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Printer Ulanish Turi</label>
              <select
                value={formData.printerType}
                onChange={(e) => setFormData({ ...formData, printerType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              >
                <option value="USB">USB Ulanish (Tavsiya etiladi)</option>
                <option value="LAN">LAN Tarmoq (Ethernet / IP)</option>
                <option value="BLUETOOTH">Bluetooth Simsiz</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Qog&apos;oz Kengligi</label>
              <select
                value={formData.paperWidth}
                onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              >
                <option value="80mm">80 mm (Standart katta chek)</option>
                <option value="58mm">58 mm (Kichik ixcham chek)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Xizmat haqi (%)</label>
              <input
                type="number"
                value={formData.serviceFeePercent}
                onChange={(e) => setFormData({ ...formData, serviceFeePercent: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chek Yuqori Matni (Header)</label>
              <input
                type="text"
                value={formData.receiptHeader}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Chek Yakuniy Matni (Footer)</label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Payment Methods */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Faol To&apos;lov Usullari</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { key: 'cash', label: 'Naqd Pul' },
              { key: 'card', label: 'Bank Kartasi' },
              { key: 'qris', label: 'Click & Payme QR' },
              { key: 'mixed', label: 'Aralash To\'lov' },
            ].map((p) => {
              const isChecked = formData.enabledPayments[p.key as keyof typeof formData.enabledPayments];
              return (
                <label
                  key={p.key}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    isChecked
                      ? 'bg-teal-50/60 border-teal-300 text-teal-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="font-bold">{p.label}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enabledPayments: {
                          ...formData.enabledPayments,
                          [p.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-sm transition flex items-center gap-2 touch-press"
          >
            <Check className="w-4 h-4" />
            <span>Sozlamalarni Saqlash</span>
          </button>
        </div>
      </form>
    </div>
  );
};

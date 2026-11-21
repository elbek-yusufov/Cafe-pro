'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Printer,
  Receipt,
  Percent,
  Phone,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  RefreshCw,
  Sliders,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

interface RestaurantConfig {
  name: string;
  phone: string;
  address: string;
  taxNumber: string;
  currency: string;
  serviceFeePercent: number;
  printerType: 'USB' | 'LAN' | 'BLUETOOTH';
  paperWidth: '80mm' | '58mm';
  receiptHeader: string;
  receiptFooter: string;
  isFiscalEnabled: boolean;
  isAutoPrintEnabled: boolean;
}

const defaultConfig: RestaurantConfig = {
  name: 'Rayhon Milliy Taomlar',
  phone: '+998 71 200 00 00',
  address: 'Toshkent sh., Chilonzor tumani, 9-mavze',
  taxNumber: '304928172',
  currency: "so'm",
  serviceFeePercent: 10,
  printerType: 'USB',
  paperWidth: '80mm',
  receiptHeader: 'Xush kelibsiz! Yoqimli ishtaha!',
  receiptFooter: 'Tashrifingiz uchun rahmat! Yana kutib qolamiz!',
  isFiscalEnabled: true,
  isAutoPrintEnabled: true,
};

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<RestaurantConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_settings');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return defaultConfig;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_settings', JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('pos_settings_updated', { detail: config }));
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Restoran va Tizim Sozlamalari
            </h1>
            <p className="text-sm text-slate-500">
              Restoran rekvizitlari, xizmat haqi, chek parametrlari va printer sozlamalari
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> O'zgarishlar saqlandi!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Restoran Rekvizitlari */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-base text-slate-900">Restoran Asosiy Ma'lumotlari</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restoran / Kafening Rasmiy Nomi *
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefon Raqami (Chekda ko'rinadi)
              </label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manzil (Joylashuv)
              </label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                STIR / INN (Fiskal soliq raqami)
              </label>
              <input
                type="text"
                value={config.taxNumber}
                onChange={(e) => setConfig({ ...config, taxNumber: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Xizmat Haq va Moliya */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Percent className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-base text-slate-900">Xizmat Haqi va Valyuta</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standart Xizmat Haqi Foizi (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={config.serviceFeePercent}
                  onChange={(e) => setConfig({ ...config, serviceFeePercent: Number(e.target.value) || 0 })}
                  className="w-full p-3 pr-10 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Har bir chek subtotal summasiga qo'shiladi (masalan: 10% yoki 15%)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asosiy Valyuta Belgisi
              </label>
              <input
                type="text"
                value={config.currency}
                onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Printer va Chek Sozlamalari */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Printer className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-base text-slate-900">Chek Chop Etish va Printer Parametrlari</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Printer Ulanish Turi
              </label>
              <select
                value={config.printerType}
                onChange={(e) => setConfig({ ...config, printerType: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-slate-300 font-semibold text-slate-900 text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="USB">USB Ulanish (Tavsiya etiladi - ESC/POS)</option>
                <option value="LAN">LAN Tarmoq (Ethernet / IP Manzil)</option>
                <option value="BLUETOOTH">Bluetooth Simsiz</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Termal Qog'oz Kengligi
              </label>
              <select
                value={config.paperWidth}
                onChange={(e) => setConfig({ ...config, paperWidth: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-slate-300 font-semibold text-slate-900 text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="80mm">80 mm (Standart katta chek formati)</option>
                <option value="58mm">58 mm (Kichik ixcham chek formati)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chek Boshidagi Matn (Header)
              </label>
              <input
                type="text"
                value={config.receiptHeader}
                onChange={(e) => setConfig({ ...config, receiptHeader: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chek Ostidagi Matn (Footer)
              </label>
              <input
                type="text"
                value={config.receiptFooter}
                onChange={(e) => setConfig({ ...config, receiptFooter: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5. Saqlash Tugmasi */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition"
          >
            <Save className="w-4 h-4" />
            <span>Sozlamalarni Saqlash & Sinxronlash</span>
          </button>
        </div>
      </form>
    </div>
  );
}

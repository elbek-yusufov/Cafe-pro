import { Download, Calendar, DollarSign, PieChart, Users, ArrowUpRight } from 'lucide-react';
import { ExportLink } from '../../components/export-link';

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Sarlavha va Eksport tugmalari */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Tahlil va Hisobotlar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Savdo ko'rsatkichlari, tushum, tannarx, sof foyda va kassa tahlili
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Oxirgi 30 kun</span>
          </div>

          <ExportLink
            path="/reports/sales/export?format=xlsx"
            filename="sales-report.xlsx"
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Excel / CSV Yuklab olish</span>
          </ExportLink>
        </div>
      </div>

      {/* Foyda va Tannarx Xulosasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oylik Jami Tushum</span>
          <div className="text-2xl font-black text-slate-900 mt-2">124 500 000 so'm</div>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +18.4% o'sish
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Xomashyo & Tannarx Sarfi</span>
          <div className="text-2xl font-black text-slate-900 mt-2">68 400 000 so'm</div>
          <span className="text-xs text-slate-500 font-medium mt-1 block">
            Tushumning 55% qismi
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sof Foyda (Tushum - Tannarx - Xarajat)</span>
          <div className="text-2xl font-black text-emerald-600 mt-2">44 100 000 so'm</div>
          <span className="text-xs text-slate-500 font-medium mt-1 block">
            Rentabellik (Marja): 35.4%
          </span>
        </div>
      </div>

      {/* Hisobot turlari kartalari */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              Savdo Dinamikasi (Kunlik / Haftalik)
            </h2>
            <ExportLink
              path="/reports/sales/export?format=xlsx"
              filename="sales-report.xlsx"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Eksport (.csv)
            </ExportLink>
          </div>
          <p className="text-xs text-slate-500">
            Kunlik sotuvlar va cheklar soni bo'yicha batafsil jadval va grafiklar
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between font-semibold text-slate-700 border-b pb-1">
              <span>Sana</span>
              <span>Cheklar soni</span>
              <span>Tushum</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>20.11.2026 (Bugun)</span>
              <span>54 ta</span>
              <span className="font-bold text-slate-900">4 850 000 so'm</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>19.11.2026</span>
              <span>48 ta</span>
              <span className="font-bold text-slate-900">4 210 000 so'm</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>18.11.2026</span>
              <span>52 ta</span>
              <span className="font-bold text-slate-900">4 670 000 so'm</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Nasiya (Qarzdorlar) Hisoboti
            </h2>
            <ExportLink
              path="/reports/debts/export?format=xlsx"
              filename="debts-report.xlsx"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Eksport (.csv)
            </ExportLink>
          </div>
          <p className="text-xs text-slate-500">
            Hozirda doimiy mijozlardagi mavjud nasiya balansi va to'lovlar
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between font-semibold text-slate-700 border-b pb-1">
              <span>Mijoz</span>
              <span>Telefon</span>
              <span>Qarz balansi</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-slate-900">Ali Valiyev</span>
              <span>+998 90 123 45 67</span>
              <span className="font-bold text-amber-700">184 000 so'm</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-slate-900">Rustam Aka</span>
              <span>+998 91 555 44 33</span>
              <span className="font-bold text-amber-700">92 400 so'm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O'zbekiston onlayn-KKM va fiskal modul integratsiyasi uchun adapter interfeysi
 */
export interface FiscalReceiptData {
  receiptNumber: string;
  dateTime: Date | string;
  cashierName: string;
  items: Array<{
    name: string;
    spicCode?: string; // MXIK (IKPU) kodi
    quantity: number;
    price: number;
    total: number;
    vatPercent?: number; // QQS foizi
  }>;
  totalAmount: number;
  paymentMethods: Array<{
    type: 'CASH' | 'CARD';
    amount: number;
  }>;
}

export interface FiscalResponse {
  success: boolean;
  fiscalSign?: string; // Fiskal belgi
  qrCodeUrl?: string;  // Soliq qo'mitasi chek QR kodi
  terminalId?: string;
  error?: string;
}

export interface FiscalModuleAdapter {
  registerSale(data: FiscalReceiptData): Promise<FiscalResponse>;
  registerRefund(data: FiscalReceiptData, originalFiscalSign: string): Promise<FiscalResponse>;
  printZReport(): Promise<FiscalResponse>;
}

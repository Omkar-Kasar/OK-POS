import { Business, Order } from '../types';

export type PrintMode = 'BROWSER' | 'LOCAL_AGENT';

export interface PrinterSettings {
  printerMode: PrintMode;
  paperWidth: '58mm' | '80mm';
}

/**
 * Printer Service
 * Handles abstraction for different printing methods.
 */
export const PrinterService = {
  
  /**
   * Main print entry point.
   */
  async printReceipt(order: Order, business: Business, settings: PrinterSettings): Promise<void> {
    console.log(`Printing via ${settings.printerMode} mode...`);

    if (settings.printerMode === 'LOCAL_AGENT') {
      // Future implementation for QZ Tray / Local Agent
      alert('Local Agent printing is not configured. Falling back to Browser print.');
      return this.browserPrint(order, business);
    }

    // Default to Browser Print
    return this.browserPrint(order, business);
  },

  /**
   * Browser-based printing (standard, cross-platform)
   */
  async browserPrint(order: Order, business: Business): Promise<void> {
    // This logic is currently in ReceiptPreview, we'll move it here eventually.
    // For now, we return a promise that resolves when the print dialog is opened.
    window.print();
  }
};

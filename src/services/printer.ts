import { Business, Order } from '../types';

export type PrintMode = 'BROWSER' | 'BLUETOOTH';

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
  async printReceipt(order: Order, business: Business, settings: PrinterSettings, onComplete: () => void): Promise<void> {
    console.log(`Printing via ${settings.printerMode} mode...`);

    try {
      if (settings.printerMode === 'BLUETOOTH') {
        await this.bluetoothPrint(order, business);
      } else {
        await this.browserPrint(order, business);
      }
      onComplete();
    } catch (error) {
      console.error('Printing failed:', error);
      // Fallback to browser print if bluetooth fails
      if (settings.printerMode === 'BLUETOOTH') {
        await this.browserPrint(order, business);
        onComplete();
      } else {
        alert('Printing failed. Please check your printer connection.');
      }
    }
  },

  /**
   * Browser-based printing (standard, cross-platform, iOS/Android friendly)
   */
  async browserPrint(order: Order, business: Business): Promise<void> {
    window.print();
    // Browser printing is synchronous in opening the dialog.
    // The actual print completion cannot be easily detected by JS, 
    // so we assume completion once the dialog opens.
  },

  /**
   * Web Bluetooth ESC/POS printing (Android/Desktop only)
   */
  async bluetoothPrint(order: Order, business: Business): Promise<void> {
    // 1. Request Bluetooth device
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] // Common ESC/POS UUID
    });

    // 2. Connect to GATT Server
    const server = await device.gatt?.connect();
    
    // 3. Get characteristic for writing data
    const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service?.getCharacteristic('00002ae1-0000-1000-8000-00805f9b34fb');

    // 4. Generate ESC/POS commands (Simplified example)
    const encoder = new TextEncoder();
    const commands = [
      0x1B, 0x40, // Initialize
      ...encoder.encode(`HOTEL SAI\n`),
      ...encoder.encode(`Bill: ${order.id}\n`),
      0x1D, 0x56, 0x42, 0x00 // Cut paper (if supported)
    ];

    await characteristic?.writeValue(new Uint8Array(commands));
  }
};

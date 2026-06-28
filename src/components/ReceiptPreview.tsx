/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle, 
  FileText, 
  QrCode 
} from 'lucide-react';
import { Business, Order } from '../types';

interface ReceiptPreviewProps {
  business: Business;
  order: Order;
  onClose: () => void;
  onPrintComplete?: () => void;
}

export default function ReceiptPreview({ 
  business, 
  order, 
  onClose, 
  onPrintComplete 
}: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    console.log('Printing receipt...');
    // Standard window print behavior
    const printContent = receiptRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Open print view styled specifically for thermal widths
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              @media print {
                body {
                  font-family: 'Courier New', Courier, monospace;
                  width: ${business.printerWidth === '58mm' ? '54mm' : '76mm'};
                  padding: 2mm;
                  margin: 0;
                  font-size: 10px;
                  color: #000;
                }
                .print-hidden { display: none !important; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .border-dashed { border-top: 1px dashed #000; margin: 4px 0; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .item-row { margin: 2px 0; }
                .bold { font-weight: bold; }
                .qr-container { text-align: center; margin: 8px 0; }
                /* Hide UI elements from print */
                .print-hidden, button { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        console.log('Print action initiated, triggering onPrintComplete');
        if (onPrintComplete) onPrintComplete();
      }, 1000);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*Invoice from ${business.name}*\nBill No: ${order.billNo}\nTable: ${order.tableName || 'N/A'}\nTotal Amount: ₹${order.grandTotal}\n\nThank you! Visit again.`;
    const encoded = encodeURIComponent(text);
    const phone = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone ? '91' + phone : ''}?text=${encoded}`, '_blank');
  };

  // Generate real merchant payment QR URL matching the guidelines
  const upiId = business.upiId || '7447404768@ybl';
  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(business.name)}&am=${order.grandTotal}&tn=BillNo${order.billNo}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiPayload)}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-bold text-sm">Receipt Preview</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-slate-200 p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Receipt container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 flex justify-center">
          <div 
            ref={receiptRef}
            className="bg-white p-5 shadow-inner border border-slate-300 font-mono text-xs text-slate-800 leading-tight w-full max-w-[280px]"
          >
            {/* Business Logo / Name */}
            <div className="text-center mb-2">
              <h3 className="font-bold text-base text-black uppercase">{business.name}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{business.address}</p>
              {business.gstNumber && <p className="text-[10px] text-slate-500">GST: {business.gstNumber}</p>}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Bill Details */}
            <div className="flex justify-between text-[11px] text-black">
              <div>
                <p>Bill No: <span className="font-bold">{order.billNo}</span></p>
                <p>Date: {new Date(order.date).toLocaleString()}</p>
                <p>Payment: <span className="font-bold uppercase">{order.paymentMode}</span></p>
              </div>
              <div className="text-right">
                <p className="font-bold uppercase">{order.tableName || 'TAKE AWAY'}</p>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Columns */}
            <div className="flex font-bold text-black text-[11px] pb-1">
              <span className="w-8">Sr.</span>
              <span className="flex-1">Item</span>
              <span className="w-10 text-right">Qty</span>
              <span className="w-12 text-right">Amt.</span>
            </div>

            <div className="border-t border-dashed border-slate-400 my-1"></div>

            {/* Items */}
            <div className="space-y-1.5 py-1 text-black text-[11px]">
              {order.items.map((item, index) => (
                <div key={item.id} className="flex items-start">
                  <span className="w-8">{index + 1}</span>
                  <div className="flex-1">
                    <p className="capitalize font-medium">{item.product.name}</p>
                    <p className="text-[10px] text-slate-500 font-normal">₹{item.product.price} / {item.product.unit}</p>
                  </div>
                  <span className="w-10 text-right">{item.quantity}</span>
                  <span className="w-12 text-right">₹{item.product.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Financial Details */}
            <div className="space-y-1 text-[11px] text-black">
              <div className="flex justify-between">
                <span>TOTAL ITEMS: {order.items.length}</span>
                <span>SUBTOTAL: ₹{order.subtotal}</span>
              </div>
              {order.discountValue > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>DISCOUNT:</span>
                  <span>-₹{order.discountValue}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>TAX (GST {business.taxPercent}%):</span>
                  <span>₹{order.taxAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Grand Total */}
            <div className="text-center py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Grand Total</p>
              <p className="text-xl font-extrabold text-black mt-0.5">₹{order.grandTotal.toFixed(2)}</p>
            </div>

            {/* QR Code Segment for Scan and Pay */}
            {order.paymentMode === 'UPI' && (
              <div className="mt-4 flex flex-col items-center qr-container bg-slate-50 p-2 rounded-xl border border-dashed border-slate-300">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scan to Pay via UPI QR</p>
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR" 
                  className="w-28 h-28 border border-slate-200 rounded p-1"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[8px] text-slate-400 mt-1 font-mono">{upiId}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="font-bold text-black">Thank you! Visit Again!</p>
              <p className="text-[9px] text-slate-400 mt-1">{business.invoiceFooter || 'OK POS - Easy Smart Billing'}</p>
            </div>
          </div>
        </div>

        {/* Buttons matching page 7 footer */}
        <div className="bg-white p-4 border-t border-slate-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-200 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            ← Back
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition cursor-pointer flex items-center justify-center"
            title="Share via WhatsApp"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

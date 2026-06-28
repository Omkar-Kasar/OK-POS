/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  UserX,
  Calendar,
  User,
  Smartphone,
  CheckCircle2,
  Printer,
  ChevronRight
} from 'lucide-react';
import { Business, Table, CartItem } from '../types';

interface BillingModalProps {
  business: Business;
  table: Table | null;
  items: CartItem[];
  totalAmount: number;
  onClose: () => void;
  onComplete: (paymentMode: 'CASH' | 'UPI' | 'DUE', customerName: string, customerPhone: string, discountValue: number) => void;
}

export default function BillingModal({
  business,
  table,
  items,
  totalAmount,
  onClose,
  onComplete
}: BillingModalProps) {
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'DUE'>('CASH');
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Discount
  const [discountType, setDiscountType] = useState<'pct' | 'fixed'>('pct');
  const [discountInput, setDiscountInput] = useState('0');
  
  const [shareWhatsApp, setShareWhatsApp] = useState(false);

  // Math
  const discountVal = parseFloat(discountInput) || 0;
  const calculatedDiscount = discountType === 'pct' 
    ? (totalAmount * discountVal) / 100 
    : discountVal;
    
  const taxVal = (totalAmount - calculatedDiscount) * (business.taxPercent / 100);
  const grandTotal = totalAmount - calculatedDiscount + taxVal;

  const handleSave = (printAfter: boolean) => {
    // Save order
    onComplete(paymentMode, customerName, customerPhone, calculatedDiscount);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold text-sm">SELECT PAYMENT MODE</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-slate-200 p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Payment Mode Segment Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMode('CASH')}
              className={`flex flex-col items-center justify-center py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                paymentMode === 'CASH'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-5 h-5 mb-1" />
              <span>CASH</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`flex flex-col items-center justify-center py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                paymentMode === 'UPI'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-5 h-5 mb-1" />
              <span>UPI</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('DUE')}
              className={`flex flex-col items-center justify-center py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                paymentMode === 'DUE'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserX className="w-5 h-5 mb-1" />
              <span>DUE</span>
            </button>
          </div>

          {/* Billing Date */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>Billing Date: {new Date(billingDate).toLocaleDateString()}</span>
              <button 
                type="button" 
                onClick={() => {
                  const val = prompt('Enter billing date (YYYY-MM-DD):', billingDate);
                  if (val) setBillingDate(val);
                }}
                className="text-blue-600 hover:underline"
              >
                Change Date
              </button>
            </div>
            <div className="relative">
              <input
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Form */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number (optional)</label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="7447404768"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Active Table items reference list */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Items in Active {table ? `Table ${table.number}` : 'Take Away'}
            </h4>
            <div className="max-h-24 overflow-y-auto space-y-1 text-slate-700 text-xs">
              {items.map(it => (
                <div key={it.id} className="flex justify-between">
                  <span className="capitalize">{it.product.name} x {it.quantity}</span>
                  <span>₹{it.product.price * it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Discount Segment */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Discount Segment</label>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 px-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="discount_type"
                    checked={discountType === 'pct'}
                    onChange={() => setDiscountType('pct')}
                    className="accent-blue-600"
                  />
                  <span>Pct (%)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="discount_type"
                    checked={discountType === 'fixed'}
                    onChange={() => setDiscountType('fixed')}
                    className="accent-blue-600"
                  />
                  <span>Fixed (₹)</span>
                </label>
              </div>

              <input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                className="ml-auto w-16 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-right font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* WhatsApp share checklist */}
          <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer mt-1 bg-slate-50/50 p-2 rounded-xl">
            <input
              type="checkbox"
              checked={shareWhatsApp}
              onChange={(e) => setShareWhatsApp(e.target.checked)}
              className="accent-green-500 w-4 h-4 rounded"
            />
            <span>Share Receipt on WhatsApp Mobile</span>
            <span className="text-emerald-500">🟢</span>
          </label>
        </div>

        {/* Action Bottom Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <button
            onClick={() => handleSave(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT & SAVE BILL</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>SAVE BILL ONLY</span>
          </button>
        </div>
      </div>
    </div>
  );
}

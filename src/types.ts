/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  address: string;
  logo?: string;
  gstNumber?: string;
  invoiceFooter?: string;
  terms?: string;
  upiId?: string;
  printerWidth: '58mm' | '80mm';
  currency: string;
  timezone: string;
  taxPercent: number; // e.g. 5 for 5% GST
  subscriptionStatus: 'active' | 'expired' | 'suspended';
  subscriptionStart?: string;
  subscriptionExpiry?: string;
  subscriptionPlan?: '1 Year' | '2 Year' | '3 Year';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  businessId: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  buyPrice: number;
  sku?: string;
  unit: string; // e.g. 'QUANTITY', 'PLATE', 'KG'
  trackStock: boolean;
  stockQuantity: number;
  isVeg: boolean; // true = Veg, false = Non-Veg
  image?: string;
  businessId: string;
  createdAt: string;
}

export interface Table {
  id: string;
  number: number;
  amount: number;
  status: 'available' | 'occupied' | 'reserved';
  runningTime?: string; // ISO string when occupied started
  activeOrderId?: string;
  cartItems?: CartItem[];
}

export interface CartItem {
  id: string; // unique item cart ID (can be product.id)
  product: Product;
  quantity: number;
  servedQuantity: number; // tracking for KOT kitchen state
  pendingQuantity: number; // remaining to serve
  notes?: string;
}

export interface Order {
  id: string;
  billNo: string;
  date: string;
  tableId?: string;
  tableName?: string;
  items: CartItem[];
  subtotal: number;
  discountType: 'pct' | 'fixed';
  discountValue: number;
  taxAmount: number;
  grandTotal: number;
  paymentMode: 'CASH' | 'UPI' | 'DUE';
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  customerName?: string;
  customerPhone?: string;
  status: 'preparing' | 'ready' | 'served' | 'completed'; // completed means paid and closed
  businessId: string;
  staffId?: string;
  staffName?: string;
}

export interface Expense {
  id: string;
  type: string; // e.g. Rent, Salary, Raw Materials, Utility
  amount: number;
  date: string;
  description?: string;
  businessId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  outstanding: number;
  loyaltyPoints: number;
  businessId: string;
  lastVisit?: string;
}

export interface Staff {
  id: string;
  name: string;
  pin: string; // 4-digit security PIN
  role: 'Admin' | 'Manager' | 'Cashier' | 'Waiter' | 'Kitchen';
  phone: string;
  businessId: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent';
  businessId: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  deviceInfo: string;
  businessId?: string;
}

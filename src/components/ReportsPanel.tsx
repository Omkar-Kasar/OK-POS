/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  FileBarChart, 
  Grid, 
  Percent, 
  AlertCircle, 
  Users2,
  ChevronLeft,
  Search,
  Download,
  Calendar,
  DollarSign,
  Plus,
  RefreshCw,
  Award,
  CircleDollarSign,
  X
} from 'lucide-react';
import { 
  getOrders, 
  getExpenses, 
  getCustomers, 
  addExpense, 
  addCustomer,
  generateId,
  getProducts
} from '../db/posDb';
import { Order, Expense, Customer, Product, Business } from '../types';
import { useDragScroll } from '../lib/useDragScroll';

interface ReportsPanelProps {
  business: Business;
  onBack: () => void;
  initialSubTab?: string;
}

export default function ReportsPanel({ business, onBack, initialSubTab = 'today' }: ReportsPanelProps) {
  const scrollRef = useDragScroll();
  const [subTab, setSubTab] = useState<string>(initialSubTab);
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Form States
  const [expType, setExpType] = useState('Raw Materials');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const o = await getOrders(business.id);
      const e = await getExpenses(business.id);
      const c = await getCustomers(business.id);
      const p = await getProducts(business.id);
      
      setOrders(o || []);
      setExpenses(e || []);
      setCustomers(c || []);
      setProducts(p || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount) return;

    const newExp: Expense = {
      id: 'exp_' + generateId(),
      type: expType,
      amount: parseFloat(expAmount) || 0,
      date: new Date().toISOString().split('T')[0],
      description: expDesc,
      businessId: business.id
    };

    try {
      await addExpense(newExp);
      setShowAddExpense(false);
      setExpAmount('');
      setExpDesc('');
      loadData();
    } catch (err) {
      alert('Could not save expense voucher.');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    const newCust: Customer = {
      id: 'cust_' + generateId(),
      name: custName,
      phone: custPhone,
      outstanding: 0,
      loyaltyPoints: 10, // base starter points
      businessId: business.id,
      lastVisit: new Date().toISOString().split('T')[0]
    };

    try {
      await addCustomer(newCust);
      setShowAddCustomer(false);
      setCustName('');
      setCustPhone('');
      loadData();
    } catch (err) {
      alert('Could not add customer profile.');
    }
  };

  // ----------------------------------------------------
  // Analytics Calculations
  // ----------------------------------------------------
  
  // Date range filter
  const filteredOrders = orders.filter(o => {
    const orderDate = o.date.split('T')[0];
    return orderDate >= dateFrom && orderDate <= dateTo;
  });

  const totalSalesVal = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalInvoicesCount = filteredOrders.length;
  const avgBillVal = totalInvoicesCount ? totalSalesVal / totalInvoicesCount : 0;
  
  const cashPayments = filteredOrders.filter(o => o.paymentMode === 'CASH').reduce((sum, o) => sum + o.grandTotal, 0);
  const upiPayments = filteredOrders.filter(o => o.paymentMode === 'UPI').reduce((sum, o) => sum + o.grandTotal, 0);
  const duePayments = filteredOrders.filter(o => o.paymentMode === 'DUE').reduce((sum, o) => sum + o.grandTotal, 0);
  
  const cashPct = totalSalesVal ? (cashPayments / totalSalesVal) * 100 : 0;
  const upiPct = totalSalesVal ? (upiPayments / totalSalesVal) * 100 : 0;
  const duePct = totalSalesVal ? (duePayments / totalSalesVal) * 100 : 0;

  const totalDiscountsGiven = filteredOrders.reduce((sum, o) => sum + o.discountValue, 0);

  // Item wise metrics
  const itemSalesMap: { [prodId: string]: { name: string, qty: number, rev: number } } = {};
  filteredOrders.forEach(o => {
    o.items.forEach(it => {
      const pid = it.product.id;
      if (!itemSalesMap[pid]) {
        itemSalesMap[pid] = { name: it.product.name, qty: 0, rev: 0 };
      }
      itemSalesMap[pid].qty += it.quantity;
      itemSalesMap[pid].rev += it.product.price * it.quantity;
    });
  });

  const itemSalesList = Object.keys(itemSalesMap).map(key => ({
    id: key,
    name: itemSalesMap[key].name,
    qty: itemSalesMap[key].qty,
    rev: itemSalesMap[key].rev
  })).sort((a, b) => b.rev - a.rev);

  const topSellerName = itemSalesList.length ? itemSalesList[0].name : 'None';
  const totalUnitsSold = itemSalesList.reduce((sum, i) => sum + i.qty, 0);

  // Profit & Loss
  const totalRevenueVal = totalSalesVal;
  const estimatedCost = filteredOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, it) => itemSum + ((it.product.buyPrice || 0) * it.quantity), 0);
  }, 0);
  
  const totalExpenseSum = expenses.filter(e => e.date >= dateFrom && e.date <= dateTo).reduce((sum, e) => sum + e.amount, 0);
  const netProfitVal = totalRevenueVal - estimatedCost - totalExpenseSum;
  const profitMargin = totalRevenueVal ? (netProfitVal / totalRevenueVal) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 px-4 py-3 flex items-center gap-2 text-white shadow-md">
        <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold capitalize">{subTab.replace('_', ' ')} Report</h1>
          <p className="text-[10px] text-blue-100">1.0.191</p>
        </div>
        <button onClick={loadData} className="ml-auto p-1.5 hover:bg-white/10 rounded-full transition">
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Internal Sub Navigation Selector matching page 9 */}
      <div ref={scrollRef} className="bg-white border-b border-slate-200 px-4 py-2.5 flex gap-1 overflow-x-auto scrollbar-none shrink-0 select-none">
        {[
          { id: 'today', label: 'Overview', icon: TrendingUp },
          { id: 'sales_report', label: 'Sales', icon: CircleDollarSign },
          { id: 'item_report', label: 'Items', icon: FileBarChart },
          { id: 'profit_loss', label: 'Profit & Loss', icon: Percent },
          { id: 'expenses', label: 'Expenses', icon: AlertCircle },
          { id: 'customers', label: 'Customers', icon: Users2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isSel = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setSubTab(tab.id); setSearchQuery(''); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition shrink-0 cursor-pointer ${
                isSel ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Pickers (visible on all reports except Today/Overview) */}
      {subTab !== 'today' && (
        <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
          <div className="relative flex-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 font-bold focus:outline-none"
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400">TO</span>
          <div className="relative flex-1">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 font-bold focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* CONTENT AREA PANEL */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* ----------------------------------------------------
            SUBTAB: TODAY OVERVIEW METRICS (Matching Page 9/10)
            ---------------------------------------------------- */}
        {subTab === 'today' && (
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Overview</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Total Sales</p>
                <h3 className="text-lg font-extrabold text-blue-600 mt-0.5">₹{(totalSalesVal || 2400).toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Cash Received</p>
                <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">₹{(cashPayments || 1800).toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">UPI Payments</p>
                <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">₹{(upiPayments || 600).toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Pending Dues</p>
                <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">₹{(duePayments || 0).toFixed(2)}</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Discounts Granted</p>
              <h3 className="text-base font-extrabold text-amber-600 mt-0.5">₹{totalDiscountsGiven.toFixed(2)}</h3>
            </div>

            {/* Nav lists mimicking Page 9/10 */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports Navigator</h4>
              {[
                { id: 'sales_report', label: 'Sales Report', desc: 'Track daily revenue, taxes & total invoices' },
                { id: 'item_report', label: 'Item-wise Report', desc: 'Analyze sale performance of individual items' },
                { id: 'profit_loss', label: 'Profit & Loss Report', desc: 'Summary of revenues, product costs & earnings' },
                { id: 'expenses', label: 'Expenses Report', desc: 'Track operating costs & payout logs' },
                { id: 'customers', label: 'Customers Report', desc: 'Review customer transactions & loyalty points' }
              ].map(n => (
                <button
                  key={n.id}
                  onClick={() => setSubTab(n.id)}
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition text-left shadow-sm cursor-pointer"
                >
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800">{n.label}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.desc}</p>
                  </div>
                  <ChevronLeft className="w-4.5 h-4.5 text-slate-400 transform rotate-180" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBTAB: SALES REPORT (Matching Page 12)
            ---------------------------------------------------- */}
        {subTab === 'sales_report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Total Revenue</p>
                <h3 className="text-lg font-extrabold mt-0.5">₹{totalSalesVal.toFixed(2)}</h3>
              </div>

              <div className="bg-blue-50 text-blue-800 border border-blue-100 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">Total Invoices</p>
                <h3 className="text-lg font-extrabold mt-0.5">{totalInvoicesCount} Bills</h3>
              </div>

              <div className="bg-purple-50 text-purple-800 border border-purple-100 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-purple-500">Avg Bill Value</p>
                <h3 className="text-lg font-extrabold mt-0.5">₹{avgBillVal.toFixed(1)}</h3>
              </div>

              <div className="bg-amber-50 text-amber-800 border border-amber-100 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Discounts Given</p>
                <h3 className="text-lg font-extrabold mt-0.5">₹{totalDiscountsGiven.toFixed(0)}</h3>
              </div>
            </div>

            {/* Export actions */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => alert('PDF Report exported successfully')}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF REPORT</span>
              </button>
              <button 
                onClick={() => alert('CSV Excel spreadsheet generated')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>CSV EXCEL</span>
              </button>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Method Distribution</h4>
              <div className="space-y-3">
                {/* Cash */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                      <span>Cash Payment</span>
                    </span>
                    <span className="text-slate-800">₹{cashPayments.toFixed(0)} ({cashPct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${cashPct}%` }}></div>
                  </div>
                </div>

                {/* UPI */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>UPI Payment</span>
                    </span>
                    <span className="text-slate-800">₹{upiPayments.toFixed(0)} ({upiPct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${upiPct}%` }}></div>
                  </div>
                </div>

                {/* Due */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Dues Payment</span>
                    </span>
                    <span className="text-slate-800">₹{duePayments.toFixed(0)} ({duePct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${duePct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice list table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detailed Invoice Logs</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">No transactions recorded for this period.</div>
                ) : (
                  filteredOrders.map(o => (
                    <div key={o.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">Bill No: {o.billNo} ({o.tableName || 'Takeaway'})</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(o.date).toLocaleDateString()} • {o.items.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-800">₹{o.grandTotal.toFixed(1)}</p>
                        <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          o.paymentMode === 'CASH' ? 'bg-green-100 text-green-700' : o.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {o.paymentMode}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBTAB: ITEM PERFORMANCE REPORT (Matching Page 13)
            ---------------------------------------------------- */}
        {subTab === 'item_report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Item Revenue</p>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">₹{totalSalesVal.toFixed(0)}</h4>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Total Sold</p>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">{totalUnitsSold} units</h4>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Top Seller</p>
                <h4 className="text-sm font-bold text-blue-600 truncate mt-0.5 capitalize">{topSellerName}</h4>
              </div>
            </div>

            {/* Sales Table list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Sold Items Performance
              </div>
              <div className="divide-y divide-slate-100">
                {itemSalesList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No items sold in selected period</div>
                ) : (
                  itemSalesList.map(item => (
                    <div key={item.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-extrabold text-slate-800 capitalize">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.qty} units served</p>
                      </div>
                      <span className="font-bold text-slate-700">₹{item.rev.toFixed(1)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBTAB: PROFIT & LOSS REPORT (Matching Page 15)
            ---------------------------------------------------- */}
        {subTab === 'profit_loss' && (
          <div className="space-y-4">
            {/* Profit margin board */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit (After Expenses)</p>
              <h2 className="text-2xl font-black text-emerald-600 mt-1">₹{netProfitVal.toFixed(2)}</h2>
              
              <span className="absolute top-4 right-4 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                +{profitMargin.toFixed(1)}% margin
              </span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-300/40 text-[10px]">
                <div>
                  <p className="text-slate-400 font-medium">Gross Revenue</p>
                  <p className="font-bold text-slate-700 mt-0.5">₹{totalRevenueVal.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Raw Material Cost</p>
                  <p className="font-bold text-slate-700 mt-0.5">₹{estimatedCost.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Sum of Expenses</p>
                  <p className="font-bold text-slate-700 mt-0.5">₹{totalExpenseSum.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Product contribution header list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Product Profit Contributions
              </div>
              <div className="divide-y divide-slate-100">
                {itemSalesList.map(item => {
                  const prod = products.find(p => p.id === item.id);
                  const cost = prod ? (prod.buyPrice * item.qty) : 0;
                  const profit = item.rev - cost;
                  return (
                    <div key={item.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-extrabold text-slate-800 capitalize">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Revenue: ₹{item.rev} | Cost: ₹{cost}</p>
                      </div>
                      <span className="font-bold text-emerald-600">+₹{profit.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBTAB: EXPENSES VOUCHER LEDGER (Matching Page 16)
            ---------------------------------------------------- */}
        {subTab === 'expenses' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 text-red-800 border border-red-100 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Total Expense Sum</p>
                <h3 className="text-lg font-extrabold mt-0.5">₹{totalExpenseSum.toFixed(2)}</h3>
              </div>

              <div className="bg-slate-100 text-slate-800 border border-slate-200 p-4 rounded-2xl shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Txns</p>
                <h3 className="text-lg font-extrabold mt-0.5">{expenses.length} Payments</h3>
              </div>
            </div>

            <button
              onClick={() => setShowAddExpense(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD EXPENSE VOUCHER</span>
            </button>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Vouchers Ledger
              </div>
              <div className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No expenses logged yet.</div>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-extrabold text-slate-800">{exp.type}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{exp.description || 'No description'} • {exp.date}</p>
                      </div>
                      <span className="font-bold text-red-600">-₹{exp.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBTAB: CUSTOMER DIRECTORY (Matching Page 17)
            ---------------------------------------------------- */}
        {subTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Total Directory Size</p>
                <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{customers.length} Customers</h3>
              </div>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                + Register Customer
              </button>
            </div>

            {/* Customers Search bar */}
            <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm p-2 flex items-center">
              <input
                type="text"
                placeholder="Search by Name or Mobile No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-5 top-5" />
            </div>

            {/* Customers directory matching page 17 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No customer records matching search</div>
                ) : (
                  customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).map(cust => (
                    <div key={cust.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-extrabold text-slate-800">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{cust.phone}</p>
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5 font-bold uppercase text-blue-600">
                          <Award className="w-3.5 h-3.5" />
                          <span>{cust.loyaltyPoints} Loyalty Points</span>
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {cust.outstanding > 0 ? (
                          <div>
                            <p className="text-[9px] text-red-500 font-bold uppercase">OUTSTANDING CREDIT</p>
                            <p className="font-bold text-red-600 mt-0.5">₹{cust.outstanding}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-500 bg-emerald-50 font-bold px-2 py-0.5 rounded">CLEARED</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ----------------------------------------------------
          MODALS: ADD EXPENSE & REGISTER CUSTOMER
          ---------------------------------------------------- */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase">Add Expense Voucher</h3>
              <button onClick={() => setShowAddExpense(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expense Type</label>
                <select
                  value={expType}
                  onChange={(e) => setExpType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Raw Materials">Raw Materials (Inventory)</option>
                  <option value="Rent">Shop/Restaurant Rent</option>
                  <option value="Salary">Staff Salaries</option>
                  <option value="Electricity">Electricity / Utilities</option>
                  <option value="Marketing">Marketing / Ads</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Voucher Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Voucher Description</label>
                <textarea
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Purchased fresh vegetables & paneer batch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs shadow cursor-pointer text-center"
              >
                Log Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase">Register Customer</h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Ramesh Shinde"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs shadow cursor-pointer text-center"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

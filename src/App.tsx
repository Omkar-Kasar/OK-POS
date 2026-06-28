/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import SidebarMenu from './components/SidebarMenu';
import POSDashboard from './components/POSDashboard';
import BillingModal from './components/BillingModal';
import ReceiptPreview from './components/ReceiptPreview';
import SuperAdminPanel from './components/SuperAdminPanel';
import InventoryPanel from './components/InventoryPanel';
import ReportsPanel from './components/ReportsPanel';
import SettingsPanel from './components/SettingsPanel';
import { Business, Staff, Table, CartItem, Order } from './types';
import { addOrder, generateId, updateOrder } from './db/posDb';

export default function App() {
  // Authentication & Roster Session States
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [activeStaff, setActiveStaff] = useState<Staff | null>(null);
  const [showSuperAdmin, setShowSuperAdmin] = useState<boolean>(false);

  // Layout Tab State
  const [currentTab, setCurrentTab] = useState<
    'pos' | 'sales_report' | 'item_report' | 'profit_loss' | 'expenses' | 'customers' | 'inventory' | 'settings'
  >('pos');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Modal checkout States
  const [billingState, setBillingState] = useState<{
    table: Table | null;
    items: CartItem[];
    total: number;
  } | null>(null);

  const [receiptState, setReceiptState] = useState<Order | null>(null);
  
  // Triggers table state clear in POSDashboard when a bill is saved
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const handleLoginSuccess = (business: Business, staff: Staff) => {
    setActiveBusiness(business);
    setActiveStaff(staff);
    setCurrentTab('pos');
  };

  const handleLogout = () => {
    setActiveBusiness(null);
    setActiveStaff(null);
    setCurrentTab('pos');
  };

  // Process and save final transaction
  const handleBillingComplete = async (
    paymentMode: 'CASH' | 'UPI' | 'DUE',
    customerName: string,
    customerPhone: string,
    discountValue: number
  ) => {
    if (!activeBusiness || !activeStaff || !billingState) return;

    const baseTotal = billingState.total;
    const taxPercent = activeBusiness.taxPercent || 0;
    const calculatedTax = (baseTotal - discountValue) * (taxPercent / 100);
    const grandTotal = baseTotal - discountValue + calculatedTax;

    // Generate compliant bill number
    const billNo = 'BILL-' + String(100 + Math.floor(Math.random() * 900));

    const finalOrder: Order = {
      id: 'order_' + generateId(),
      billNo,
      items: billingState.items,
      subtotal: baseTotal,
      discountType: 'fixed',
      discountValue,
      taxAmount: calculatedTax,
      grandTotal,
      paymentMode,
      paymentStatus: paymentMode === 'DUE' ? 'UNPAID' : 'PAID',
      status: 'completed',
      date: new Date().toISOString(),
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '7447404768',
      businessId: activeBusiness.id,
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      tableName: billingState.table ? `Table ${billingState.table.number}` : undefined,
      tableId: billingState.table?.id
    };

    try {
      // Save order to Firestore POS directory
      await addOrder(finalOrder);

      // Setup triggers
      
      // Close Checkout dialog, open Receipt preview modal
      setBillingState(null);
      setReceiptState(finalOrder);

    } catch (err) {
      alert('Failed to register bill order.');
    }
  };

  // Render Super Admin Panel
  if (showSuperAdmin) {
    return (
      <SuperAdminPanel 
        onBack={() => setShowSuperAdmin(false)} 
      />
    );
  }

  // Render Login & Registration (Pages 23, 24)
  if (!activeBusiness || !activeStaff) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onEnterSuperAdmin={() => setShowSuperAdmin(true)}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased overflow-x-hidden">
      
      {/* Sidebar navigation drawer */}
      <SidebarMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentTab={currentTab}
        setTab={(tab: any) => {
          setCurrentTab(tab);
          setSidebarOpen(false);
        }}
        business={activeBusiness}
        staff={activeStaff}
        onLogout={handleLogout}
      />

      {/* Main Panel Content Body */}
      <main className="flex-1 flex flex-col min-w-0">
        {currentTab === 'pos' && (
          <POSDashboard
            business={activeBusiness}
            staff={activeStaff}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenReceipt={(ord) => setReceiptState(ord)}
            onOpenBilling={(table, items, total) => setBillingState({ table, items, total })}
            completedOrder={completedOrder}
            setCompletedOrder={setCompletedOrder}
          />
        )}

        {['sales_report', 'item_report', 'profit_loss', 'expenses', 'customers'].includes(currentTab) && (
          <ReportsPanel
            business={activeBusiness}
            initialSubTab={currentTab}
            onBack={() => setCurrentTab('pos')}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryPanel
            business={activeBusiness}
            onBack={() => setCurrentTab('pos')}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPanel
            business={activeBusiness}
            onUpdateBusiness={(updated) => setActiveBusiness(updated)}
            onBack={() => setCurrentTab('pos')}
          />
        )}
      </main>

      {/* FLOATING DIALOGS & OVERLAYS */}

      {/* Checkout Payment Dialog (Page 6) */}
      {billingState && (
        <BillingModal
          business={activeBusiness}
          table={billingState.table}
          items={billingState.items}
          totalAmount={billingState.total}
          onClose={() => setBillingState(null)}
          onComplete={handleBillingComplete}
        />
      )}

      {/* Invoice Receipt Preview Dialog (Page 7) */}
      {receiptState && (
        <ReceiptPreview
          order={receiptState}
          business={activeBusiness}
          onClose={() => setReceiptState(null)}
          onPrintComplete={() => setCompletedOrder(receiptState ? { ...receiptState } : null)}
        />
      )}

    </div>
  );
}

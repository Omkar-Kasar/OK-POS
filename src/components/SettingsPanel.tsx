/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Printer, 
  Users, 
  ChevronLeft, 
  Save, 
  Trash2, 
  Edit2, 
  ToggleLeft,
  Plus,
  Shield,
  Phone,
  Lock,
  X,
  CreditCard
} from 'lucide-react';
import { updateBusiness, getStaffList, addStaff, deleteStaff, generateId } from '../db/posDb';
import { Business, Staff } from '../types';

interface SettingsPanelProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => void;
  onBack: () => void;
}

export default function SettingsPanel({ business, onUpdateBusiness, onBack }: SettingsPanelProps) {
  const [subTab, setSubTab] = useState<'profile' | 'print' | 'staff'>('profile');

  // Profile Form States
  const [name, setName] = useState(business.name);
  const [address, setAddress] = useState(business.address);
  const [mobile, setMobile] = useState(business.mobile);
  const [gstNumber, setGstNumber] = useState(business.gstNumber || '');
  const [invoiceFooter, setInvoiceFooter] = useState(business.invoiceFooter || '');
  const [terms, setTerms] = useState(business.terms || '');
  const [taxPercent, setTaxPercent] = useState(String(business.taxPercent));

  // Toggles & Preferences (Page 19)
  const [gstEnabled, setGstEnabled] = useState(!!business.gstNumber);
  const [showTables, setShowTables] = useState(true);
  const [showProductImages, setShowProductImages] = useState(true);
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const [searchCategoryOnly, setSearchCategoryOnly] = useState(false);
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4 | 5>(3);

  // Print Form States (Page 20)
  const [printLogo, setPrintLogo] = useState(false);
  const [printQR, setPrintQR] = useState(true);
  const [upiId, setUpiId] = useState(business.upiId || '7447404768@ybl');
  const [additionalQR, setAdditionalQR] = useState(false);
  const [additionalQRLink, setAdditionalQRLink] = useState('');
  const [printLayoutCustomize, setPrintLayoutCustomize] = useState(true);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>(business.printerWidth);

  // Staff State (Page 22)
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Admin' | 'Manager' | 'Cashier' | 'Waiter' | 'Kitchen'>('Waiter');
  const [newStaffPIN, setNewStaffPIN] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const list = await getStaffList(business.id);
      setStaffList(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Partial<Business> = {
      name,
      address,
      mobile,
      gstNumber: gstEnabled ? gstNumber : undefined,
      invoiceFooter,
      terms,
      taxPercent: parseFloat(taxPercent) || 0,
    };

    try {
      await updateBusiness(business.id, updated);
      onUpdateBusiness({ ...business, ...updated });
      alert('Business Profile Settings Saved Successfully!');
    } catch (err) {
      alert('Failed to update business profile settings');
    }
  };

  const handleSavePrintSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Partial<Business> = {
      upiId,
      printerWidth: printerPaperSize,
    };

    try {
      await updateBusiness(business.id, updated);
      onUpdateBusiness({ ...business, ...updated });
      alert('Printer Settings Saved Successfully!');
    } catch (err) {
      alert('Failed to update printer settings');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPIN || newStaffPIN.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    const s: Staff = {
      id: 'staff_' + generateId(),
      name: newStaffName,
      pin: newStaffPIN,
      role: newStaffRole,
      phone: newStaffPhone,
      businessId: business.id
    };

    try {
      await addStaff(s);
      setShowAddStaff(false);
      setNewStaffName('');
      setNewStaffPIN('');
      setNewStaffPhone('');
      loadStaff();
    } catch (err) {
      alert('Failed to save staff shift member.');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff profile?')) {
      try {
        await deleteStaff(id);
        loadStaff();
      } catch (err) {
        alert('Could not delete staff member.');
      }
    }
  };

  return (
    <div id="settings_view" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold">System Configuration</h1>
            <p className="text-[10px] text-blue-100">1.0.191</p>
          </div>
        </div>
      </header>

      {/* Sub tabs matching PDF */}
      <div className="bg-white border-b border-slate-200 flex justify-around text-xs font-bold shrink-0">
        <button
          onClick={() => setSubTab('profile')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            subTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          1. Profile Settings
        </button>
        <button
          onClick={() => setSubTab('print')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            subTab === 'print' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          2. Print settings
        </button>
        <button
          onClick={() => setSubTab('staff')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            subTab === 'staff' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          3. Staff Settings
        </button>
      </div>

      {/* SubTab Views */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* 1. PROFILE SETTINGS (Page 18, 19) */}
        {subTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Merchant Business Identity</h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business/Shop Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact/Mobile No</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">GST Invoice Settings</h4>
                  <p className="text-[9px] text-slate-400">Enable tax calculations on final bills</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGstEnabled(!gstEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    gstEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    gstEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}></span>
                </button>
              </div>

              {gstEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Registration No.</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Percent (%)</label>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Layout Toggles matching Page 19 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Terminal Layout Parameters</h3>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-slate-600">Show Tables on POS Grid</span>
                <button
                  type="button"
                  onClick={() => setShowTables(!showTables)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    showTables ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${showTables ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-slate-600">Show product images</span>
                <button
                  type="button"
                  onClick={() => setShowProductImages(!showProductImages)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    showProductImages ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${showProductImages ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-slate-600">Enable Barcode Scanning</span>
                <button
                  type="button"
                  onClick={() => setBarcodeEnabled(!barcodeEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    barcodeEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${barcodeEnabled ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              {/* Columns Selector (Page 19) */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Product Grid Columns (Desktop)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => setGridColumns(cols as any)}
                      className={`py-2 rounded-xl border text-xs font-bold transition ${
                        gridColumns === cols 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cols} Col
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-2xl text-xs font-extrabold shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>SAVE PROFILE DETAILS</span>
            </button>
          </form>
        )}

        {/* 2. PRINT SETTINGS (Page 20, 21) */}
        {subTab === 'print' && (
          <form onSubmit={handleSavePrintSettings} className="space-y-4 max-w-md mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Printer Preferences</h3>

              <div className="flex justify-between items-center py-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">1. Print Logo</h4>
                  <p className="text-[9px] text-slate-400">Include brand logo icon on receipt headers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintLogo(!printLogo)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    printLogo ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${printLogo ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">2. Print Payment QR Code</h4>
                  <p className="text-[9px] text-slate-400">Include dynamic UPI scan-and-pay receipt block</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintQR(!printQR)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    printQR ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${printQR ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              {printQR && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Enter UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. Suresh7447404768@ybl"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none font-bold"
                  />
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">3. Additional QR Code</h4>
                  <p className="text-[9px] text-slate-400">Print feedback or menu links on receipt footers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdditionalQR(!additionalQR)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    additionalQR ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${additionalQR ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              {additionalQR && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Enter QR Link/URL</label>
                  <input
                    type="text"
                    value={additionalQRLink}
                    onChange={(e) => setAdditionalQRLink(e.target.value)}
                    placeholder="e.g. www.hotelsaifeedback.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Printer Paper Width Selection (Page 21) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Printer Paper Size</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinterPaperSize('58mm')}
                  className={`py-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                    printerPaperSize === '58mm'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>2 Inches Printer</span>
                  <span className="text-[9px] font-normal opacity-90">58mm width paper</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrinterPaperSize('80mm')}
                  className={`py-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                    printerPaperSize === '80mm'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>3 Inches Printer</span>
                  <span className="text-[9px] font-normal opacity-90">80mm width paper</span>
                </button>
              </div>

              {/* Bluetooth Target setup box matching page 21 */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 mt-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bluetooth 58mm Thermal Setup</p>
                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">NO PRINTER TARGETED</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Tap SELECT to pick a 58mm printer</p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Scanning local Bluetooth devices for ESC/POS thermal printers...')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition cursor-pointer uppercase"
                >
                  SELECT
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-2xl text-xs font-extrabold shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>SAVE PRINTER SETUP</span>
            </button>
          </form>
        )}

        {/* 3. STAFF SETTINGS (Page 22) */}
        {subTab === 'staff' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Registered Staff</h3>
                  <p className="text-[10px] text-slate-400">{staffList.length} active profiles</p>
                </div>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ADD STAFF</span>
                </button>
              </div>

              {/* Staff roster cards */}
              <div className="space-y-3.5">
                {staffList.map(s => (
                  <div key={s.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-xl mt-0.5">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-extrabold text-slate-800">{s.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                            {s.role}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 font-mono">PIN: {s.pin}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Phone: {s.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ADD STAFF MODAL */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase">Add Staff Member</h3>
              <button onClick={() => setShowAddStaff(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Roster Role *</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Admin">Admin Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Waiter">Waiter / Captain</option>
                  <option value="Kitchen">Kitchen Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Security PIN (4 Digits) *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newStaffPIN}
                  onChange={(e) => setNewStaffPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none tracking-widest font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="7447404768"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs shadow cursor-pointer text-center"
              >
                Register Staff
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

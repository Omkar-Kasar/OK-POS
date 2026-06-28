/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X,
  TrendingUp,
  FileBarChart,
  Grid,
  Percent,
  Warehouse,
  Receipt,
  Users2,
  AlertCircle,
  LogOut,
  Sliders
} from 'lucide-react';
import { Business, Staff } from '../types';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  staff: Staff;
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
}

export default function SidebarMenu({ 
  isOpen, 
  onClose, 
  business, 
  staff, 
  currentTab, 
  setTab, 
  onLogout 
}: SidebarMenuProps) {
  if (!isOpen) return null;

  const handleTabSelect = (tab: string) => {
    setTab(tab);
    onClose();
  };

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: Receipt },
    { id: 'sales_report', label: 'Sales Report', icon: TrendingUp },
    { id: 'item_report', label: 'Item-wise Report', icon: FileBarChart },
    { id: 'category_report', label: 'Category-wise Report', icon: Grid },
    { id: 'profit_loss', label: 'Profit & Loss', icon: Percent },
    { id: 'inventory', label: 'Inventory Management', icon: Warehouse },
    { id: 'expenses', label: 'Expense Manage', icon: AlertCircle },
    { id: 'customers', label: 'Customers Manage', icon: Users2 },
    { id: 'settings', label: 'System Settings', icon: Sliders },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in bg-black/40">
      {/* Sidebar Content Card matching reference */}
      <div className="w-72 bg-white h-full flex flex-col shadow-2xl relative animate-slide-right">
        {/* Blue Header Profile Section */}
        <div className="bg-blue-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-blue-100 p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className="bg-white/15 p-2 rounded-xl text-white">
              <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">{business.name}</h2>
              <span className="inline-block mt-1 bg-white/20 text-white font-extrabold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded">
                STATUS : APPROVED
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-blue-100">
            <span>Support Connected</span>
            <span className="font-mono">V.1.0.191</span>
          </div>
          
          <div className="mt-2 text-[10px] text-blue-150 border-t border-blue-500/30 pt-1.5">
            Signed in as: <span className="font-bold text-white">{staff.name} ({staff.role})</span>
          </div>
        </div>

        {/* Navigation Options List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Business Management</p>
          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-slate-150 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Shift Logout</span>
          </button>
        </div>
      </div>

      {/* Outside Click Close */}
      <div className="flex-1" onClick={onClose}></div>
    </div>
  );
}

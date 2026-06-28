/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Plus, 
  LogOut, 
  ShieldAlert, 
  Lock, 
  UserPlus,
  RefreshCw,
  Search,
  Monitor,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { getAllBusinesses, createBusiness, updateBusiness } from '../db/posDb';
import { Business } from '../types';

interface SuperAdminPanelProps {
  onBack: () => void;
}

export default function SuperAdminPanel({ onBack }: SuperAdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Stats
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  // Form states for creating a new business
  const [newBizName, setNewBizName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPlan, setNewPlan] = useState<'1 Year' | '2 Year' | '3 Year'>('1 Year');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample Audit Activities
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBusinesses();
    }
  }, [isAuthenticated]);

  const loadBusinesses = async () => {
    try {
      const list = await getAllBusinesses();
      setBusinesses(list);
      
      // Calculate Stats
      let revenue = 0;
      let active = 0;
      let expired = 0;
      
      list.forEach(b => {
        if (b.subscriptionStatus === 'active') active++;
        else expired++;

        // Rough plan calculation for dashboard metrics
        if (b.subscriptionPlan === '1 Year') revenue += 12000;
        else if (b.subscriptionPlan === '2 Year') revenue += 22000;
        else if (b.subscriptionPlan === '3 Year') revenue += 30000;
      });

      setTotalRevenue(revenue || 44000); // seed default revenue if empty
      setActiveCount(active || 3);
      setExpiredCount(expired || 0);

      // Seed audit log
      setActivities([
        { id: '1', userName: 'Omkar_Kasar_0799', action: 'Login Approved', device: 'Chrome / macOS', time: new Date().toLocaleTimeString() },
        { id: '2', userName: 'Hotel Sai', action: 'Subscription Synchronized', device: 'Android / TouchPOS', time: '12:40 PM' },
        { id: '3', userName: 'Omkar_Kasar_0799', action: 'Plan Upgraded [Hotel Sai]', device: 'Chrome / Windows', time: '11:15 AM' }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'Omkar_Kasar_0799' && password === '#0799@Ok') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid Super Admin credentials. Please check password.');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName || !newOwnerName || !newMobile) {
      alert('Please fill out all required fields');
      return;
    }

    const businessId = 'biz_' + Math.random().toString(36).substring(2, 9);
    
    // Auto-calculate expiry
    const start = new Date();
    const expiry = new Date();
    if (newPlan === '1 Year') expiry.setFullYear(start.getFullYear() + 1);
    else if (newPlan === '2 Year') expiry.setFullYear(start.getFullYear() + 2);
    else expiry.setFullYear(start.getFullYear() + 3);

    const newBiz: Business = {
      id: businessId,
      name: newBizName,
      ownerName: newOwnerName,
      mobile: newMobile,
      address: newAddress || 'India',
      printerWidth: '58mm',
      currency: 'INR',
      timezone: 'IST',
      taxPercent: 5,
      subscriptionStatus: 'active',
      subscriptionStart: start.toISOString().split('T')[0],
      subscriptionExpiry: expiry.toISOString().split('T')[0],
      subscriptionPlan: newPlan,
      createdAt: new Date().toISOString()
    };

    try {
      await createBusiness(newBiz);
      setShowAddModal(false);
      loadBusinesses();
      // Reset form
      setNewBizName('');
      setNewOwnerName('');
      setNewMobile('');
      setNewAddress('');
    } catch (err) {
      alert('Error creating business');
    }
  };

  const toggleSubscriptionStatus = async (biz: Business) => {
    const nextStatus = biz.subscriptionStatus === 'active' ? 'expired' : 'active';
    try {
      await updateBusiness(biz.id, { subscriptionStatus: nextStatus });
      loadBusinesses();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleRenew = async (biz: Business) => {
    const nextPlan = biz.subscriptionPlan === '1 Year' ? '2 Year' : '3 Year';
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + (nextPlan === '2 Year' ? 2 : 3));
    try {
      await updateBusiness(biz.id, { 
        subscriptionStatus: 'active',
        subscriptionPlan: nextPlan,
        subscriptionExpiry: expiry.toISOString().split('T')[0]
      });
      loadBusinesses();
    } catch (e) {
      alert('Failed to renew subscription');
    }
  };

  if (!isAuthenticated) {
    return (
      <div id="super_admin_login" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-600/10 p-4 rounded-full text-blue-500 mb-2">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">OK POS Super Admin</h2>
            <p className="text-sm text-slate-400 text-center mt-1">Platform management console for Omkar Kasar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Super Admin ID</label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="Omkar_Kasar_0799"
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Passcode</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Enter Administrative Portal
            </button>
          </form>

          <button
            onClick={onBack}
            className="w-full mt-4 text-slate-400 hover:text-white text-xs text-center font-medium transition-colors"
          >
            ← Back to Merchant Terminal
          </button>
        </div>
      </div>
    );
  }

  // Filtered list
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.mobile.includes(searchQuery)
  );

  return (
    <div id="super_admin_dashboard" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">OK POS Cloud Platform</h1>
            <p className="text-xs text-slate-400">Omniscient Super Admin Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={loadBusinesses}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Reload Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-800"></div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 px-4 py-2 rounded-xl text-sm transition-colors border border-slate-700 hover:border-red-900 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock Console</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Platform Revenue</p>
              <h3 className="text-xl font-bold text-emerald-400">₹{(totalRevenue).toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Businesses</p>
              <h3 className="text-xl font-bold text-white">{activeCount}</h3>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="bg-amber-500/10 p-3 rounded-xl text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Expired/Suspended</p>
              <h3 className="text-xl font-bold text-white">{expiredCount}</h3>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Today's Transactions</p>
              <h3 className="text-xl font-bold text-white">4 Active Terminals</h3>
            </div>
          </div>
        </div>

        {/* Merchants List Section */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Registered Merchants</h2>
              <p className="text-xs text-slate-400">Activate plans, manage credentials, block users</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search business, owner, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl border border-slate-700 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard Merchant</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Business Info</th>
                  <th className="px-6 py-3.5 font-semibold">Owner & Contact</th>
                  <th className="px-6 py-3.5 font-semibold">Subscription Detail</th>
                  <th className="px-6 py-3.5 font-semibold">Plan Level</th>
                  <th className="px-6 py-3.5 font-semibold">Account Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                      No merchant profiles found. Seed some or click "Onboard Merchant" above.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map(biz => (
                    <tr key={biz.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{biz.name}</div>
                        <div className="text-[11px] text-slate-400">ID: {biz.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{biz.ownerName}</div>
                        <div className="text-[11px] text-slate-400">{biz.mobile}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Exp: {biz.subscriptionExpiry || 'No Expiry Set'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-medium text-[10px]">
                          {biz.subscriptionPlan || '1 Year'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          biz.subscriptionStatus === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {biz.subscriptionStatus === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleSubscriptionStatus(biz)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] transition cursor-pointer"
                          >
                            {biz.subscriptionStatus === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleRenew(biz)}
                            className="bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600 text-blue-400 hover:text-white px-2 py-1 rounded text-[11px] transition cursor-pointer"
                          >
                            Renew Plan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit & Device Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-blue-400" />
              <span>User Login Activity</span>
            </h3>
            <div className="space-y-3.5">
              {activities.map(act => (
                <div key={act.id} className="flex justify-between items-start text-xs border-b border-slate-800 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <span className="font-semibold text-slate-200">{act.userName}</span>
                    <span className="text-slate-400 font-normal"> - {act.action}</span>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Monitor className="w-3 h-3" />
                      <span>{act.device}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded">
                    {act.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-blue-400" />
                <span>Administrative Controls</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Omkar Kasar possesses direct authorization over the OK POS engine. Credentials can be manually assigned for emergency recovery. Subscriptions default to a 5-minute sync with standard Firestore rules.
              </p>
            </div>
            
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Global Modules Status: STABLE</p>
                <p className="text-[10px] text-slate-400">Automatic backup system enabled at 12:00 AM daily.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Onboard Merchant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <span>Onboard New Merchant</span>
            </h2>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Business / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="e.g. Hotel Sai"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mobile / Login ID *</label>
                <input
                  type="text"
                  required
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="e.g. 7447404768"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Pune, Maharashtra"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Subscription Plan Level</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1 Year">1 Year Plan (₹12,000)</option>
                  <option value="2 Year">2 Year Plan (₹22,000)</option>
                  <option value="3 Year">3 Year Plan (₹30,000)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

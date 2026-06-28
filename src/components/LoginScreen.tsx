/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Smartphone, 
  User, 
  ArrowRight, 
  Key, 
  Users,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { getBusiness, createBusiness, seedDefaultCatalogIfEmpty, getStaffList } from '../db/posDb';
import { Business, Staff } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (business: Business, activeStaff: Staff) => void;
  onEnterSuperAdmin: () => void;
}

export default function LoginScreen({ onLoginSuccess, onEnterSuperAdmin }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [mobile, setMobile] = useState('');
  
  // Registration form
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  
  // Login flow steps
  // Step 1: enter mobile. Step 2: Select staff & enter PIN
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [matchedBusiness, setMatchedBusiness] = useState<Business | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // For demo, we search businesses by mobile, but since we can have custom business IDs, 
      // let's look up if there is a business matching this mobile.
      // Since firestore lookup is async, we can search or fall back to 'biz_demo' for testing.
      let bizId = 'biz_' + mobile;
      let biz = await getBusiness(bizId);

      // If business doesn't exist, we can check if they want to register, or we can use a standard demo business
      if (!biz) {
        // Create demo business automatically if they use a special demo key or want a quick start
        if (mobile === '9900990099' || mobile === '7447404768') {
          // Create instant default demo business 'Hotel Sai'
          const start = new Date();
          const expiry = new Date();
          expiry.setFullYear(start.getFullYear() + 1);
          
          biz = {
            id: 'biz_demo',
            name: 'Hotel Sai',
            ownerName: 'Admin Owner',
            mobile: mobile,
            address: 'Opposite Railway Station, Pune',
            printerWidth: '58mm',
            currency: 'INR',
            timezone: 'IST',
            taxPercent: 5,
            subscriptionStatus: 'active',
            subscriptionStart: start.toISOString().split('T')[0],
            subscriptionExpiry: expiry.toISOString().split('T')[0],
            subscriptionPlan: '1 Year',
            createdAt: start.toISOString()
          };
          await createBusiness(biz);
          await seedDefaultCatalogIfEmpty(biz.id);
        } else {
          setError('Mobile number not found. Please register to create your profile.');
          setLoading(false);
          return;
        }
      }

      // Business found! Load staff list
      setMatchedBusiness(biz);
      await seedDefaultCatalogIfEmpty(biz.id);
      const staff = await getStaffList(biz.id);
      
      // Fallback staff if none exist
      if (!staff || staff.length === 0) {
        const defaultStaff: Staff[] = [
          { id: 'staff_owner', name: 'Admin Owner', pin: '0000', role: 'Admin', phone: mobile, businessId: biz.id },
          { id: 'staff_suresh', name: 'Suresh Kumar', pin: '1234', role: 'Waiter', phone: '7447404768', businessId: biz.id },
          { id: 'staff_ramesh', name: 'Ramesh Shinde', pin: '4321', role: 'Cashier', phone: '9876543210', businessId: biz.id }
        ];
        setStaffList(defaultStaff);
        setSelectedStaffId(defaultStaff[0].id);
      } else {
        setStaffList(staff);
        setSelectedStaffId(staff[0].id);
      }
      
      setLoginStep(2);
    } catch (err) {
      setError('Connection failure. Operating in local mode with demo catalog.');
      // Offline fallback
      const start = new Date();
      const expiry = new Date();
      expiry.setFullYear(start.getFullYear() + 1);
      const fallbackBiz: Business = {
        id: 'biz_demo',
        name: 'Hotel Sai',
        ownerName: 'Admin Owner',
        mobile: mobile,
        address: 'Pune, India',
        printerWidth: '58mm',
        currency: 'INR',
        timezone: 'IST',
        taxPercent: 5,
        subscriptionStatus: 'active',
        subscriptionStart: start.toISOString().split('T')[0],
        subscriptionExpiry: expiry.toISOString().split('T')[0],
        subscriptionPlan: '1 Year',
        createdAt: start.toISOString()
      };
      setMatchedBusiness(fallbackBiz);
      const defaultStaff: Staff[] = [
        { id: 'staff_owner', name: 'Admin Owner', pin: '0000', role: 'Admin', phone: mobile, businessId: fallbackBiz.id },
        { id: 'staff_suresh', name: 'Suresh Kumar', pin: '1234', role: 'Waiter', phone: '7447404768', businessId: fallbackBiz.id },
        { id: 'staff_ramesh', name: 'Ramesh Shinde', pin: '4321', role: 'Cashier', phone: '9876543210', businessId: fallbackBiz.id }
      ];
      setStaffList(defaultStaff);
      setSelectedStaffId(defaultStaff[0].id);
      setLoginStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handlePINLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    const currentStaff = staffList.find(s => s.id === selectedStaffId);
    if (!currentStaff) return;

    if (currentStaff.pin === pin) {
      setError('');
      // Check subscription
      if (matchedBusiness && matchedBusiness.subscriptionStatus !== 'active') {
        setError('Subscription Expired! Contact Administrator (Omkar Kasar @ +91 7447404768) to renew.');
        return;
      }

      if (matchedBusiness) {
        onLoginSuccess(matchedBusiness, currentStaff);
      }
    } else {
      setError('Incorrect security PIN. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !shopName || !mobile || mobile.length < 10) {
      setError('Please fill in all details correctly.');
      return;
    }
    setError('');
    setLoading(true);

    const businessId = 'biz_' + mobile;
    const start = new Date();
    const expiry = new Date();
    expiry.setFullYear(start.getFullYear() + 1);

    const newBiz: Business = {
      id: businessId,
      name: shopName,
      ownerName: ownerName,
      mobile: mobile,
      address: 'Pune, Maharashtra',
      printerWidth: '58mm',
      currency: 'INR',
      timezone: 'IST',
      taxPercent: 5,
      subscriptionStatus: 'active',
      subscriptionStart: start.toISOString().split('T')[0],
      subscriptionExpiry: expiry.toISOString().split('T')[0],
      subscriptionPlan: '1 Year',
      createdAt: start.toISOString()
    };

    try {
      await createBusiness(newBiz);
      await seedDefaultCatalogIfEmpty(newBiz.id);
      
      // Default Staff for registration
      const ownerStaff: Staff = {
        id: 'staff_owner',
        name: ownerName,
        pin: '0000', // Default PIN for new owners is 0000
        role: 'Admin',
        phone: mobile,
        businessId: newBiz.id
      };
      
      setMatchedBusiness(newBiz);
      onLoginSuccess(newBiz, ownerStaff);
    } catch (err) {
      setError('Network write error. Creating secure local merchant instance.');
      // Local fallback
      onLoginSuccess(newBiz, {
        id: 'staff_owner',
        name: ownerName,
        pin: '0000',
        role: 'Admin',
        phone: mobile,
        businessId: newBiz.id
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth_view" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Super Admin Key Gate */}
      <button 
        onClick={onEnterSuperAdmin}
        className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Omkar Console</span>
      </button>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 relative">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 text-white font-extrabold w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md tracking-tight mb-3">
            OK
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">OK Billing Software</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister ? 'Set up your business profile' : 'Access your billing dashboard'}
          </p>
        </div>

        {/* REGISTRATION FORM */}
        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Owner Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Restaurant/Shop Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Hotel Sai"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
              <div className="relative flex">
                <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-2xl px-3 flex items-center text-xs text-slate-600 font-bold">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="7447404768"
                  className="w-full bg-slate-50 border border-slate-200 rounded-r-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl text-xs shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Creating Profile...' : 'Register'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className="w-full text-[11px] font-bold text-blue-600 hover:underline text-center mt-2 cursor-pointer"
            >
              Already have an account? Login
            </button>
          </form>
        ) : (
          /* LOGIN STEP 1: MOBILE ENTRY */
          loginStep === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                <div className="relative flex">
                  <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-2xl px-3 flex items-center text-xs text-slate-600 font-bold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="7447404768"
                    className="w-full bg-slate-50 border border-slate-200 rounded-r-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Try registered numbers: <span className="font-bold">9900990099</span> or <span className="font-bold">7447404768</span></p>
              </div>

              {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl text-xs shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Verifying Account...' : 'Enter Code'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className="w-full text-[11px] font-bold text-blue-600 hover:underline text-center mt-2 cursor-pointer"
              >
                Don't have an account? Register
              </button>
            </form>
          ) : (
            /* LOGIN STEP 2: STAFF SELECT & PIN */
            <form onSubmit={handlePINLogin} className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-2">
                <p className="text-[11px] text-slate-400 font-medium">Business Shop</p>
                <p className="text-sm font-bold text-slate-800">{matchedBusiness?.name}</p>
                <p className="text-[10px] text-slate-500">{matchedBusiness?.address}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Profile</label>
                <div className="relative">
                  <select
                    value={selectedStaffId}
                    onChange={(e) => { setSelectedStaffId(e.target.value); setError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Enter 4-Digit PIN</label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 0000 or 4321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-xs text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Owner PIN: <span className="font-bold">0000</span> | Cashier: <span className="font-bold">4321</span> | Waiter: <span className="font-bold">1234</span>
                </p>
              </div>

              {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl text-xs shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Authorize Shift</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => { setLoginStep(1); setError(''); setPin(''); }}
                className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-800 text-center mt-2 cursor-pointer"
              >
                ← Back to Mobile Entry
              </button>
            </form>
          )
        )}

        {/* Footer info matching screenshot */}
        <p className="text-[10px] text-slate-400 text-center mt-6">
          Need help? Contact Support at <span className="font-semibold text-blue-600">+91 7447404768</span>
        </p>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Mic, 
  Printer, 
  Eye, 
  RotateCw, 
  Plus, 
  Minus, 
  MoreVertical, 
  PlusCircle, 
  FileText,
  Check,
  ChefHat,
  X,
  Volume2
} from 'lucide-react';
import { 
  getProducts, 
  getCategories, 
  getTables, 
  updateTable, 
  addOrder, 
  getOrders, 
  updateOrder,
  generateId,
  addCategory,
  addTable,
  deleteTable,
  addProduct
} from '../db/posDb';
import { Product, Category, Table, CartItem, Order, Business, Staff } from '../types';
import { useDragScroll } from '../lib/useDragScroll';

interface POSDashboardProps {
  business: Business;
  staff: Staff;
  onOpenSidebar: () => void;
  onOpenReceipt: (order: Order) => void;
  onOpenBilling: (table: Table | null, items: CartItem[], total: number) => void;
  completedOrder?: Order;
  setCompletedOrder: (order: Order | null) => void;
}

export default function POSDashboard({
  business,
  staff,
  onOpenSidebar,
  onOpenReceipt,
  onOpenBilling,
  completedOrder,
  setCompletedOrder
}: POSDashboardProps) {
  
  const categoryScrollRef = useDragScroll();
  const tableScrollRef = useDragScroll();
  const [tableError, setTableError] = useState<string | null>(null);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Filter / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);

  // Active Carts for tables
  // Key: tableId, Value: CartItem[]
  const [tableCarts, setTableCarts] = useState<{ [tableId: string]: CartItem[] }>({});
  
  // Modals inside POS
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdIsVeg, setNewProdIsVeg] = useState(true);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const [showCartPreview, setShowCartPreview] = useState(false);
  const [showPendingGlobal, setShowPendingGlobal] = useState(false);
  const [globalPendingTab, setGlobalPendingTab] = useState<'itemwise' | 'tablewise'>('itemwise');
  const [showKOTModal, setShowKOTModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // When a bill is saved successfully from App level, we close/clear that table cart
  useEffect(() => {
    console.log('POSDashboard useEffect triggered. completedOrder:', completedOrder);
    if (completedOrder && completedOrder.tableId) {
      // Find the order details
      const clearTableAndCart = async () => {
        console.log('Effect triggered, clearing table:', completedOrder.tableId);
        const tableId = completedOrder.tableId;
        if (tableId) {
          // Reset Table to Available locally for instant UI update
          setTables(prev => prev.map(t => 
            t.id === tableId 
              ? { ...t, amount: 0, status: 'available', cartItems: [], activeOrderId: undefined, runningTime: undefined } 
              : t
          ));

          // Reset Table to Available in Firestore
          await updateTable(business.id, tableId, {
            amount: 0,
            status: 'available',
            activeOrderId: undefined,
            runningTime: undefined,
            cartItems: []
          });

          // Clear table cart
          setTableCarts(prev => {
            const next = { ...prev };
            delete next[tableId];
            return next;
          });

          if (selectedTable?.id === tableId) {
            setSelectedTable(null);
          }
        }
        setCompletedOrder(null);
      };
      clearTableAndCart();
    }
  }, [completedOrder]);

  const loadData = async () => {
    try {
      const p = await getProducts(business.id);
      const c = await getCategories(business.id);
      const t = await getTables(business.id);
      
      setProducts(p);
      setCategories(c);
      setTables(t);

      // Initialize table carts from loaded tables
      const initialCarts: { [tableId: string]: CartItem[] } = {};
      t.forEach(table => {
          if (table.cartItems) {
              initialCarts[table.id] = table.cartItems;
          }
      });
      setTableCarts(initialCarts);

      // Default to Table 1 if available
      if (t.length > 0 && !selectedTable) {
        setSelectedTable(t[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeCart: CartItem[] = selectedTable ? (tableCarts[selectedTable.id] || []) : [];

  const handleUpdateCart = async (product: Product, change: number) => {
    if (!selectedTable) {
      alert('Please select or open a table first.');
      return;
    }

    const currentCart = tableCarts[selectedTable.id] || [];
    const existingIndex = currentCart.findIndex(item => item.product.id === product.id);

    let updatedCart: CartItem[] = [];

    if (existingIndex >= 0) {
      const item = currentCart[existingIndex];
      const nextQty = item.quantity + change;
      if (nextQty <= 0) {
        updatedCart = currentCart.filter(it => it.product.id !== product.id);
      } else {
        updatedCart = [...currentCart];
        const nextServed = Math.min(item.servedQuantity, nextQty);
        const nextPending = nextQty - nextServed;
        updatedCart[existingIndex] = {
          ...item,
          quantity: nextQty,
          servedQuantity: nextServed,
          pendingQuantity: nextPending
        };
      }
    } else if (change > 0) {
      // New item
      updatedCart = [...currentCart, {
        id: 'cart_' + product.id,
        product,
        quantity: 1,
        servedQuantity: 0,
        pendingQuantity: 1
      }];
    }

    // Save back to table carts
    setTableCarts(prev => ({
      ...prev,
      [selectedTable.id]: updatedCart
    }));

    // Update table details & Firestore status
    const cartSum = updatedCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const nextStatus = cartSum > 0 ? 'occupied' : 'available';
    const runningTime = nextStatus === 'occupied' ? (selectedTable.runningTime || new Date().toISOString()) : undefined;

    const nextTableState: Partial<Table> = {
      amount: cartSum,
      status: nextStatus as any,
      runningTime,
      cartItems: updatedCart
    };

    // Update local table representation
    setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, ...nextTableState } : t));
    setSelectedTable(prev => prev ? { ...prev, ...nextTableState } : null);

    // Sync to Firestore
    await updateTable(business.id, selectedTable.id, nextTableState);
  };

  const handleAddTable = async () => {
    setTableError(null);
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    const rawId = 'table_' + generateId();
    const tableId = `${business.id}_${rawId}`;
    const newTab: Table = {
      id: tableId,
      number: nextNum,
      amount: 0,
      status: 'available'
    };

    try {
      await addTable(business.id, newTab);
      setTables(prev => [...prev, newTab].sort((a, b) => a.number - b.number));
      setSelectedTable(newTab);
    } catch (err) {
      setTableError('Could not add table');
      setTimeout(() => setTableError(null), 3000);
    }
  };

  const handleRemoveTable = async () => {
    setTableError(null);
    if (tables.length === 0) {
      setTableError('No tables to remove!');
      setTimeout(() => setTableError(null), 3000);
      return;
    }

    // Always target the last table
    const targetTable = tables[tables.length - 1];

    if (targetTable.status === 'occupied' || targetTable.amount > 0) {
      setTableError(`Cannot remove Table ${targetTable.number} (active order!)`);
      setTimeout(() => setTableError(null), 4000);
      return;
    }

    try {
      await deleteTable(business.id, targetTable.id);
      
      setTableCarts(prev => {
        const next = { ...prev };
        delete next[targetTable.id];
        return next;
      });

      const updatedTables = tables.filter(t => t.id !== targetTable.id);
      setTables(updatedTables);

      if (selectedTable?.id === targetTable.id) {
        setSelectedTable(updatedTables.length > 0 ? updatedTables[0] : null);
      }
    } catch (err) {
      setTableError('Could not remove table');
      setTimeout(() => setTableError(null), 3000);
    }
  };

  // Add category handler
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    const trimmedName = newCatName.trim();
    const isDuplicate = categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      triggerToast(`Category "${trimmedName}" already exists!`, 'error');
      return;
    }

    const cat: Category = {
      id: 'cat_' + generateId(),
      name: trimmedName,
      businessId: business.id
    };

    try {
      await addCategory(cat);
      setShowCategoryModal(false);
      setNewCatName('');
      loadData();
      triggerToast(`Category "${trimmedName}" created successfully!`, 'success');
    } catch (err) {
      triggerToast('Could not save category', 'error');
    }
  };

  // Add product handler
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      triggerToast('Please fill out all required fields', 'error');
      return;
    }

    const catId = newProdCategoryId || (categories.length > 0 ? categories[0].id : '');
    if (!catId) {
      triggerToast('Please create a category first', 'error');
      return;
    }

    const trimmedName = newProdName.trim();
    const isDuplicate = products.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.categoryId === catId);
    if (isDuplicate) {
      triggerToast(`Product "${trimmedName}" already exists in this category!`, 'error');
      return;
    }

    const prodId = 'prod_' + generateId();
    const productPayload: Product = {
      id: prodId,
      name: trimmedName,
      categoryId: catId,
      price: parseFloat(newProdPrice) || 0,
      buyPrice: parseFloat(newProdPrice) || 0,
      unit: 'QUANTITY',
      trackStock: true,
      stockQuantity: 50,
      isVeg: newProdIsVeg,
      businessId: business.id,
      createdAt: new Date().toISOString()
    };

    try {
      await addProduct(productPayload);
      setShowProductModal(false);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdCategoryId('');
      setNewProdIsVeg(true);
      loadData();
      triggerToast(`Product "${productPayload.name}" created successfully!`, 'success');
    } catch (err) {
      triggerToast('Failed to save product catalog item.', 'error');
    }
  };

  // Voice search helper
  const triggerVoiceSearch = () => {
    setIsVoiceSearching(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Simulation fallback if Speech API is unavailable
      setTimeout(() => {
        setSearchQuery('pav');
        setIsVoiceSearching(false);
      }, 1200);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchQuery(text);
      setIsVoiceSearching(false);
    };
    rec.onerror = () => setIsVoiceSearching(false);
    rec.onend = () => setIsVoiceSearching(false);
    rec.start();
  };

  // Kitchen Order Ticket preparation helpers
  const triggerKOT = () => {
    if (activeCart.length === 0) {
      alert('Active Table cart is empty! Add products first.');
      return;
    }
    
    // Mark all pending quantities as preparing (represented locally)
    const updatedCart = activeCart.map(item => ({
      ...item,
      pendingQuantity: 0,
      servedQuantity: item.quantity // mock prepare
    }));

    setTableCarts(prev => ({
      ...prev,
      [selectedTable!.id]: updatedCart
    }));

    alert(`KOT Sent to Kitchen separately for Table ${selectedTable?.number}!`);
  };

  const handleServeItem = (tableId: string, productId: string, qtyToServe: number) => {
    setTableCarts(prev => {
      const cart = prev[tableId] || [];
      const updated = cart.map(it => {
        if (it.product.id === productId) {
          const s = it.servedQuantity + qtyToServe;
          return {
            ...it,
            servedQuantity: s > it.quantity ? it.quantity : s,
            pendingQuantity: it.quantity - s >= 0 ? it.quantity - s : 0
          };
        }
        return it;
      });
      return { ...prev, [tableId]: updated };
    });
  };

  const handleServeAll = (tableId: string) => {
    setTableCarts(prev => {
      const cart = prev[tableId] || [];
      const updated = cart.map(it => ({
        ...it,
        servedQuantity: it.quantity,
        pendingQuantity: 0
      }));
      return { ...prev, [tableId]: updated };
    });
  };

  // ----------------------------------------------------
  // Derived Global Counts (Page 1 yellow footer details)
  // ----------------------------------------------------
  
  // Calculate total active preparing items across all tables
  let totalGlobalPendingCount = 0;
  const globalPendingList: { tableNum: number, tableId: string, item: CartItem }[] = [];

  Object.keys(tableCarts).forEach(tableId => {
    const t = tables.find(tab => tab.id === tableId);
    const cart = tableCarts[tableId] || [];
    cart.forEach(it => {
      if (it.pendingQuantity > 0) {
        totalGlobalPendingCount += it.pendingQuantity;
        globalPendingList.push({
          tableNum: t?.number || 0,
          tableId,
          item: it
        });
      }
    });
  });

  // Group globalPendingList by product for high-fidelity modal view matching design
  const groupedPendingMap: {
    [productId: string]: {
      product: Product;
      totalPending: number;
      tables: {
        tableNum: number;
        tableId: string;
        pendingQuantity: number;
      }[];
    };
  } = {};

  globalPendingList.forEach(({ tableNum, tableId, item }) => {
    const pid = item.product.id;
    if (!groupedPendingMap[pid]) {
      groupedPendingMap[pid] = {
        product: item.product,
        totalPending: 0,
        tables: []
      };
    }
    groupedPendingMap[pid].totalPending += item.pendingQuantity;
    groupedPendingMap[pid].tables.push({
      tableNum,
      tableId,
      pendingQuantity: item.pendingQuantity
    });
  });

  const groupedPendingList = Object.values(groupedPendingMap).sort((a, b) => b.totalPending - a.totalPending);

  // Group globalPendingList by table for Tablewise tab
  const groupedTableMap: {
    [tableId: string]: {
      tableId: string;
      tableNum: number;
      items: {
        product: Product;
        pendingQuantity: number;
      }[];
    };
  } = {};

  globalPendingList.forEach(({ tableNum, tableId, item }) => {
    if (!groupedTableMap[tableId]) {
      groupedTableMap[tableId] = {
        tableId,
        tableNum,
        items: []
      };
    }
    groupedTableMap[tableId].items.push({
      product: item.product,
      pendingQuantity: item.pendingQuantity
    });
  });

  const groupedByTableList = Object.values(groupedTableMap).sort((a, b) => a.tableNum - b.tableNum);

  // Filters for Product catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      
      {/* Top Bar matching Screen 1 */}
      <header className="bg-blue-600 px-4 py-3 flex items-center gap-3 text-white shadow-md shrink-0">
        <button 
          onClick={onOpenSidebar}
          className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="flex-1 relative max-w-md">
          <input
            type="text"
            placeholder="Search product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/15 text-white placeholder-blue-100 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:bg-white focus:text-slate-800 focus:placeholder-slate-400"
          />
          <Search className="w-4 h-4 text-blue-200 absolute left-3 top-2.5" />
          <button
            onClick={triggerVoiceSearch}
            className={`absolute right-2 top-2 p-0.5 rounded-full hover:bg-white/10 transition ${
              isVoiceSearching ? 'text-red-300 animate-pulse' : 'text-blue-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top bar control actions */}
        <button
          onClick={() => setShowCartPreview(true)}
          className="flex items-center gap-1 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PREVIEW</span>
        </button>

        <button
          onClick={() => {
            if (activeCart.length === 0) {
              alert('Cart is empty. Cannot checkout.');
              return;
            }
            onOpenBilling(selectedTable, activeCart, selectedTable?.amount || 0);
          }}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl text-xs font-extrabold shadow shadow-green-900/30 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PRINT</span>
        </button>
      </header>



      {/* Main Content (Split screen for Desktop, single stack on Mobile) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Restaurant Tables Grid (Page 1) */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
          </div>

          {tableError && (
            <div className="mb-3 text-[10px] font-semibold text-rose-600 bg-rose-50/80 border border-rose-150 rounded-xl px-3 py-2 text-center animate-pulse">
              {tableError}
            </div>
          )}

          <div ref={tableScrollRef} className="flex gap-3 overflow-x-auto pt-3 pb-3 px-1 no-scrollbar select-none">
            {tables.map(t => {
              const isSelected = selectedTable?.id === t.id;
              const isOccupied = t.status === 'occupied';
              const tableCart = tableCarts[t.id] || [];
              const hasItems = tableCart.length > 0;
              const hasPending = tableCart.some(item => item.pendingQuantity > 0);

              const bgClass = (isOccupied || hasItems)
                ? hasPending
                  ? 'bg-amber-50 border-amber-200 text-black shadow-sm'
                  : 'bg-emerald-50 border-emerald-200 text-black shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

              const ringClass = isSelected
                ? 'border-slate-800 scale-[1.05] z-10'
                : '';

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTable(t)}
                  className={`flex-none w-[72px] h-[72px] rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col justify-center items-center ${bgClass} ${ringClass}`}
                >
                  <span className="text-[8px] font-bold uppercase opacity-80">Table</span>
                  <h2 className="text-base font-black mt-0.5 leading-none">{t.number}</h2>
                  <span className="text-[11px] font-bold mt-1.5 font-mono">₹{t.amount}</span>
                </button>
              );
            })}
            
            {/* Add/Remove Table Buttons */}
            <button
              onClick={handleAddTable}
              className="flex-none w-[72px] h-[72px] rounded-2xl border border-dashed border-emerald-300 flex flex-col items-center justify-center gap-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase text-center hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Table
            </button>
            <button
              onClick={handleRemoveTable}
              className="flex-none w-[72px] h-[72px] rounded-2xl border border-dashed border-rose-300 flex flex-col items-center justify-center gap-1 bg-rose-50 text-rose-700 text-[8px] font-black uppercase text-center hover:bg-rose-100 transition-all cursor-pointer"
            >
              <Minus className="w-5 h-5" /> Remove Table
            </button>
          </div>
        </div>

        {/* Categories horizontal scrolling cards (Page 1) */}
        <div>

          <div ref={categoryScrollRef} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-3 rounded-2xl text-[11px] font-extrabold capitalize transition shrink-0 cursor-pointer shadow-sm ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-blue-500/10'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              show all
            </button>

            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-3 rounded-2xl text-[11px] font-extrabold capitalize transition shrink-0 cursor-pointer shadow-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-blue-500/10'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>        {/* Product Grid of elements matching reference screenshots */}
        <div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-3">
            {filteredProducts.map(p => {
              const cartItem = activeCart.find(it => it.product.id === p.id);
              const count = cartItem ? cartItem.quantity : 0;
              
              return (
                <div 
                  key={p.id}
                  onClick={() => handleUpdateCart(p, 1)}
                  className={`bg-white rounded-xl border p-1.5 sm:p-2.5 flex flex-col items-center justify-between shadow-xs relative transition-all duration-300 cursor-pointer select-none aspect-square ${
                    count > 0 
                      ? 'border-blue-500 bg-blue-50/5 ring-1 ring-blue-500/10 shadow-sm' 
                      : 'border-slate-200/80 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {/* Price Box top left */}
                  <div className="absolute top-1 left-1 border border-slate-100 rounded px-1 py-0.5 text-[8px] sm:text-[9px] font-black text-slate-700 bg-white">
                    ₹{p.price}
                  </div>

                  {/* Veg/Non-veg small official indicator badge on top right */}
                  <div className="absolute top-1 right-1 flex items-center justify-center">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center p-[1px] ${
                      p.isVeg ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    </span>
                  </div>

                  {/* Central visual colored circle mimicking reference */}
                  <div className="mt-4 mb-0.5 flex justify-center">
                    <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center relative border transition-transform duration-300 ${
                      count > 0 ? 'scale-[1.03]' : ''
                    } ${
                      p.isVeg ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
                    }`}>
                      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${p.isVeg ? 'bg-emerald-500' : 'bg-rose-500'} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div>
                    </div>
                  </div>

                  {/* Product Name */}
                  <div className="text-center w-full px-0.5">
                    <h4 className="text-[10px] sm:text-[11px] font-black text-slate-800 capitalize truncate leading-tight">{p.name}</h4>
                    <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold tracking-wider mt-0.5">
                      Stock: {p.trackStock ? p.stockQuantity : '∞'}
                    </p>
                  </div>

                  {/* Plus/Minus increment controls at the bottom */}
                  <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (count > 0) handleUpdateCart(p, -1);
                      }}
                      disabled={count === 0}
                      className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        count > 0 
                          ? 'border-red-500 text-red-500 hover:bg-red-50' 
                          : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-30'
                      }`}
                    >
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                    </button>

                    <span className={`text-[10px] sm:text-[11px] font-black w-4 sm:w-5 text-center transition-all ${count > 0 ? 'text-blue-600 scale-105 font-black' : 'text-slate-500'}`}>
                      {count}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateCart(p, 1);
                      }}
                      className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs shadow-blue-500/25"
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* "Add Item" Card Button of identical size */}
            <div 
              onClick={() => setShowProductModal(true)}
              className="bg-white rounded-xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/5 p-1.5 sm:p-2.5 flex flex-col items-center justify-center shadow-sm relative transition cursor-pointer select-none aspect-square group"
            >
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1 group-hover:scale-105 transition-transform duration-300">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </div>
              <h4 className="text-[10px] sm:text-[11px] font-black text-slate-800 leading-tight">Add Item</h4>
              <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold mt-0.5">New item</p>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM ORANGE & BLUE NAVIGATION BAR matching Page 1 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between gap-2 z-40">
        <button
          onClick={() => setShowPendingGlobal(true)}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 px-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <ChefHat className="w-4 h-4" />
          <span>Pending: {totalGlobalPendingCount}</span>
        </button>

        <button
          onClick={triggerKOT}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>KOT</span>
        </button>

        <button
          onClick={() => setShowCategoryModal(true)}
          className="flex-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-500/20 py-3 px-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ CATEGORY</span>
        </button>
      </footer>

      {/* CREATE CATEGORY DIALOG (Page 4) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-extrabold text-blue-600 mb-4 uppercase tracking-wider text-center">Create New Category</h2>
            
            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. fast food"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT DIALOG */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-extrabold text-blue-600 mb-4 uppercase tracking-wider text-center">Create New Product</h2>
            
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. pav bhaji"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={newProdCategoryId}
                  onChange={(e) => setNewProdCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Food Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProdIsVeg(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      newProdIsVeg 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>Pure Veg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProdIsVeg(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      !newProdIsVeg 
                        ? 'bg-rose-50 border-rose-500 text-rose-700' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Non-Veg</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST POPUP NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce-in">
          <div className={`rounded-2xl px-5 py-3 shadow-xl border flex items-center gap-2.5 ${
            toast.type === 'success' 
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20 animate-fade-in' 
              : 'bg-rose-500 border-rose-600 text-white shadow-rose-500/20 animate-fade-in'
          }`}>
            <span className="text-sm font-bold">{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span className="text-xs font-black tracking-wide uppercase">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ACTIVE CART ITEMS PREVIEW (Page 5) */}
      {showCartPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Eye className="w-5 h-5 text-blue-500" />
              <span>Cart Items Preview</span>
            </h3>

            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-3">
              Items in Active {selectedTable ? `Table ${selectedTable.number}` : 'Take Away'}
            </p>

            {/* Warning or Success box */}
            {activeCart.length > 0 && (
              (() => {
                const pendingCount = activeCart.reduce((sum, item) => sum + item.pendingQuantity, 0);
                if (pendingCount > 0) {
                  return (
                    <div className="mb-4 bg-amber-50 border border-amber-200/60 rounded-2xl p-3 flex items-start gap-2.5">
                      <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                      <p className="text-[11px] font-bold text-amber-800 leading-normal">
                        Table {selectedTable?.number || ''} has {pendingCount} pending items.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl p-3 flex items-start gap-2.5">
                      <span className="text-emerald-500 text-sm mt-0.5">✓</span>
                      <p className="text-[11px] font-bold text-emerald-800 leading-normal">
                        All items in Table {selectedTable?.number || ''} have been served.
                      </p>
                    </div>
                  );
                }
              })()
            )}

            <div className="space-y-4 max-h-[320px] overflow-y-auto mb-5 pr-1">
              {activeCart.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No active products added to this cart.</p>
              ) : (
                activeCart.map(it => {
                  const itemPending = it.pendingQuantity;
                  const itemServed = it.servedQuantity;
                  const itemTotal = it.quantity;
                  const isFullyServed = itemPending === 0;

                  return (
                    <div key={it.id} className="border-b border-slate-150/60 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-extrabold text-slate-800 text-xs capitalize">{it.product.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Rate: ₹{it.product.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-800 text-xs">Qty: {itemTotal}</p>
                          <p className="text-[11px] font-black text-slate-900 mt-0.5">₹{it.product.price * itemTotal}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        {/* Status capsule */}
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                          isFullyServed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isFullyServed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          <span>Served: {itemServed}/{itemTotal} ({itemPending} pending)</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (selectedTable) {
                                handleServeItem(selectedTable.id, it.product.id, 1);
                              }
                            }}
                            disabled={isFullyServed}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border transition ${
                              isFullyServed
                                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-blue-600 hover:text-blue-700 cursor-pointer'
                            }`}
                          >
                            Serve +1
                          </button>
                          <button
                            onClick={() => {
                              if (selectedTable) {
                                handleServeItem(selectedTable.id, it.product.id, itemPending);
                              }
                            }}
                            disabled={isFullyServed}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition ${
                              isFullyServed
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10 cursor-pointer'
                            }`}
                          >
                            Serve All
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mark entire table as served button */}
            {activeCart.length > 0 && activeCart.some(it => it.pendingQuantity > 0) && (
              <button
                onClick={() => {
                  if (selectedTable) {
                    handleServeAll(selectedTable.id);
                  }
                }}
                className="w-full mb-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 font-extrabold py-2.5 rounded-2xl text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Mark Entire Table as Served</span>
              </button>
            )}

            <div className="flex justify-between font-extrabold text-xs uppercase tracking-wider border-t border-slate-200 pt-3.5 mb-5 text-slate-800">
              <span>TOTAL AMOUNT</span>
              <span>₹{selectedTable?.amount || 0}</span>
            </div>

            <button
              onClick={() => setShowCartPreview(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer text-center"
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL PENDING ORDERS PREPARATION DASHBOARD (Page 1) */}
      {showPendingGlobal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <h3 className="font-black text-slate-800 text-base tracking-tight">
                  Global Pending Orders
                </h3>
              </div>
              <button onClick={() => setShowPendingGlobal(false)} className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 gap-1 shrink-0">
              <button
                onClick={() => setGlobalPendingTab('itemwise')}
                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                  globalPendingTab === 'itemwise'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Itemwise
              </button>
              <button
                onClick={() => setGlobalPendingTab('tablewise')}
                className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                  globalPendingTab === 'tablewise'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tablewise
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {globalPendingTab === 'itemwise' ? (
                groupedPendingList.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-3xl block mb-2">🎉</span>
                    <p className="text-xs font-bold text-slate-500">All active tables served! Kitchen cleared.</p>
                  </div>
                ) : (
                  groupedPendingList.map(({ product, totalPending, tables: tableList }) => (
                    <div key={product.id} className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                      {/* Header: Product name and Total count */}
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-black text-slate-800 capitalize text-sm">{product.name}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          <span>Total:</span>
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg font-black text-xs">
                            {totalPending}
                          </span>
                        </div>
                      </div>

                      {/* Tables list */}
                      <div className="space-y-1">
                        {tableList.map(({ tableNum, tableId, pendingQuantity }) => (
                          <div key={tableId} className="flex justify-between items-center py-2.5 border-t border-slate-100/70 first:border-0">
                            <div className="flex items-center text-xs">
                              <span className="text-amber-500 mr-1.5 text-sm">🍴</span>
                              <span className="font-extrabold text-slate-700 mr-2">Table {tableNum}</span>
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                                {pendingQuantity} pending
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleServeItem(tableId, product.id, 1)}
                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 transition cursor-pointer"
                              >
                                Serve +1
                              </button>
                              <button
                                onClick={() => handleServeItem(tableId, product.id, pendingQuantity)}
                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                              >
                                Serve All
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )
              ) : (
                groupedByTableList.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-3xl block mb-2">🎉</span>
                    <p className="text-xs font-bold text-slate-500">All active tables served! Kitchen cleared.</p>
                  </div>
                ) : (
                  groupedByTableList.map(({ tableId, tableNum, items }) => (
                    <div key={tableId} className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                      {/* Header: Table Number and Total Items count */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🍴</span>
                          <h4 className="font-black text-slate-800 text-sm">Table {tableNum}</h4>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg font-black text-xs">
                          {items.reduce((sum, i) => sum + i.pendingQuantity, 0)} pending items
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1">
                        {items.map(({ product, pendingQuantity }) => (
                          <div key={product.id} className="flex justify-between items-center py-2.5 border-t border-slate-100/70 first:border-0">
                            <div>
                              <span className="text-xs font-extrabold text-slate-700 capitalize mr-2">{product.name}</span>
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                                {pendingQuantity} pending
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleServeItem(tableId, product.id, 1)}
                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 transition cursor-pointer"
                              >
                                Serve +1
                              </button>
                              <button
                                onClick={() => handleServeItem(tableId, product.id, pendingQuantity)}
                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                              >
                                Serve All
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Direct Mark Entire Table as Served inside Tablewise tab */}
                      <button
                        onClick={() => handleServeAll(tableId)}
                        className="w-full mt-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 font-extrabold py-2 rounded-2xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Table {tableNum} Served</span>
                      </button>
                    </div>
                  ))
                )
              )}
            </div>

            <div className="flex justify-center mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowPendingGlobal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-8 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

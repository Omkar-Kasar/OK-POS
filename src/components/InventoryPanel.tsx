/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  DollarSign, 
  Grid,
  TrendingDown,
  ChevronLeft,
  X,
  Upload,
  Layers
} from 'lucide-react';
import { getProducts, getCategories, addProduct, updateProduct, deleteProduct, generateId, addCategory } from '../db/posDb';
import { Product, Category, Business } from '../types';
import { useDragScroll } from '../lib/useDragScroll';

interface InventoryPanelProps {
  business: Business;
  onBack: () => void;
}

export default function InventoryPanel({ business, onBack }: InventoryPanelProps) {
  const categoryScrollRef = useDragScroll();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'low_stock'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('QUANTITY');
  const [trackStock, setTrackStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('50');
  const [isVeg, setIsVeg] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await getProducts(business.id);
      const c = await getCategories(business.id);
      setProducts(p);
      setCategories(c);
      if (c.length > 0 && !categoryId) {
        setCategoryId(c[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    const cat: Category = {
      id: 'cat_' + generateId(),
      name: newCatName.trim(),
      businessId: business.id
    };

    try {
      await addCategory(cat);
      setShowCategoryModal(false);
      setNewCatName('');
      const updatedCats = await getCategories(business.id);
      setCategories(updatedCats);
      setCategoryId(cat.id);
    } catch (err) {
      alert('Could not save category');
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !price) {
      alert('Please fill out all required fields');
      return;
    }

    const prodId = editingProduct ? editingProduct.id : 'prod_' + generateId();
    const productPayload: Product = {
      id: prodId,
      name,
      categoryId,
      price: parseFloat(price) || 0,
      buyPrice: parseFloat(buyPrice) || 0,
      sku: sku || undefined,
      unit,
      trackStock,
      stockQuantity: trackStock ? (parseInt(stockQuantity) || 0) : 0,
      isVeg,
      businessId: business.id,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
      } else {
        await addProduct(productPayload);
      }
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (err) {
      alert('Failed to save product catalog item.');
    }
  };

  const resetForm = () => {
    setName('');
    if (categories.length > 0) setCategoryId(categories[0].id);
    setPrice('');
    setBuyPrice('');
    setSku('');
    setUnit('QUANTITY');
    setTrackStock(true);
    setStockQuantity('50');
    setIsVeg(true);
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.categoryId);
    setPrice(String(p.price));
    setBuyPrice(String(p.buyPrice));
    setSku(p.sku || '');
    setUnit(p.unit);
    setTrackStock(p.trackStock);
    setStockQuantity(String(p.stockQuantity));
    setIsVeg(p.isVeg);
    setShowAddModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        loadData();
      } catch (err) {
        alert('Could not delete product');
      }
    }
  };

  // Math Metrics
  const totalStockValuation = products.reduce((acc, p) => {
    if (p.trackStock) {
      return acc + (p.stockQuantity * p.buyPrice);
    }
    return acc;
  }, 0);

  const lowStockProducts = products.filter(p => p.trackStock && p.stockQuantity <= 10);
  const monitoredRatio = `${products.filter(p => p.trackStock).length} of ${products.length} items`;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;
    const matchesFilterType = filterType === 'all' || (filterType === 'low_stock' && p.trackStock && p.stockQuantity <= 10);
    return matchesSearch && matchesCategory && matchesFilterType;
  });

  return (
    <div id="inventory_view" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar matching Screen 11 */}
      <header className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold">Inventory Setting</h1>
            <p className="text-[10px] text-blue-100">1.0.191</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingProduct(null); setShowAddModal(true); }}
          className="bg-white text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow hover:bg-blue-50 transition cursor-pointer"
        >
          + ADD NEW PRODUCT
        </button>
      </header>

      {/* Stats Board */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Stock valuation panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL STOCK VALUATION</p>
              <h2 className="text-xl font-bold text-slate-800">₹{totalStockValuation.toFixed(2)}</h2>
              <p className="text-[9px] text-slate-400 mt-0.5">MONITORED RATIO: {monitoredRatio}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-2">
            <div className="text-center bg-slate-50 p-2 rounded-xl">
              <h4 className="text-sm font-bold text-slate-800">{products.length}</h4>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Monitored</p>
            </div>
            <button 
              onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
              className={`text-center p-2 rounded-xl border transition ${
                filterType === 'low_stock' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-transparent text-slate-800'
              }`}
            >
              <h4 className="text-sm font-bold">{lowStockProducts.length}</h4>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Low Stock</p>
            </button>
            <div className="text-center bg-slate-50 p-2 rounded-xl">
              <h4 className="text-sm font-bold text-slate-800">0 items</h4>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Expiring (5d)</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tracked stock ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>

          {/* Categories header with + Category button */}
          <div className="flex justify-between items-center mt-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories Filter</h4>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="text-blue-600 hover:underline text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ CATEGORY</span>
            </button>
          </div>

          {/* Categories horizontal list */}
          <div ref={categoryScrollRef} className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize transition shrink-0 cursor-pointer ${
                selectedCategoryFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Show All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize transition shrink-0 cursor-pointer ${
                  selectedCategoryFilter === c.id 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Items table/grid matching page 11 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-500">Ingredient / Product Catalog</span>
            <span className="text-[10px] font-bold text-slate-400">{filteredProducts.length} items matched</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No products found in the catalog.
              </div>
            ) : (
              filteredProducts.map(p => {
                const cat = categories.find(c => c.id === p.categoryId);
                const isLow = p.trackStock && p.stockQuantity <= 10;
                return (
                  <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      {/* Veg circle */}
                      <span className={`w-3 h-3 rounded-full shrink-0 border flex items-center justify-center ${
                        p.isVeg ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                      </span>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 capitalize">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="capitalize">{cat?.name || 'Item'}</span>
                          <span>•</span>
                          <span>SKU: {p.sku || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Pricing & Stock Details */}
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-slate-800">₹{p.price}</p>
                        {p.trackStock ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider mt-0.5 ${
                            isLow ? 'bg-amber-100 text-amber-700 font-black animate-pulse' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {p.stockQuantity} {p.unit}s
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">No tracking</span>
                        )}
                      </div>

                      {/* Edit Buttons */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-500 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(p.id)}
                          className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL matching Page 2 and 3 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[95vh]">
            
            <header className="bg-blue-600 px-4 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Create Product</h2>
                <p className="text-[10px] text-blue-100">Fill in the details below to update your inventory</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-slate-200 p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <form onSubmit={handleCreateOrUpdate} className="p-4 overflow-y-auto space-y-4 flex-1">
              
              {/* Product Image section matching reference */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50">
                <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto text-blue-500 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">Upload Product Image</h4>
                <p className="text-[9px] text-slate-400 mt-1">Tap to choose a picture. Supports JPEG, PNG (Max 5MB)</p>
              </div>

              {/* Category Select */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Category *</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="text-blue-600 hover:underline text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Category</span>
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. pav bhaji"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              {/* SKU Code */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SKU Code (optional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. PVBJ01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {/* Unit selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Unit *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="QUANTITY">QUANTITY</option>
                  <option value="PLATE">PLATE</option>
                  <option value="KG">KG</option>
                  <option value="LITRE">LITRE</option>
                </select>
              </div>

              {/* Pricing section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buy Price *</label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sell Price *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Veg / Non veg toggle */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-slate-600">Veg / Vegetarian Item</span>
                <button
                  type="button"
                  onClick={() => setIsVeg(!isVeg)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isVeg ? 'bg-green-600' : 'bg-red-500'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isVeg ? 'translate-x-5' : 'translate-x-0'
                  }`}></span>
                </button>
              </div>

              {/* Stock controls toggle matching Page 3 */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">Track Stock Quantity</h5>
                    <p className="text-[9px] text-slate-400">Automatically calculate standard balances</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrackStock(!trackStock)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      trackStock ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      trackStock ? 'translate-x-5' : 'translate-x-0'
                    }`}></span>
                  </button>
                </div>

                {trackStock && (
                  <div className="mt-2.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Stock Quantity</label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow transition cursor-pointer text-center"
                >
                  {editingProduct ? 'Save Catalog Changes' : 'Add New Product'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY DIALOG */}
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
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  query, 
  where,
  orderBy,
  getDoc,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Business, 
  Category, 
  Product, 
  Table, 
  Order, 
  Expense, 
  Customer, 
  Staff, 
  Attendance, 
  ActivityLog 
} from '../types';

// Standard 4 tables as shown in reference
export const DEFAULT_TABLES: Table[] = [
  { id: 'table_1', number: 1, amount: 0, status: 'available' },
  { id: 'table_2', number: 2, amount: 0, status: 'available' },
  { id: 'table_3', number: 3, amount: 0, status: 'available' },
  { id: 'table_4', number: 4, amount: 0, status: 'available' },
];

// Helper to generate unique short IDs
export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// ----------------------------------------------------
// Business & Subscription APIs
// ----------------------------------------------------

export async function getBusiness(businessId: string): Promise<Business | null> {
  const path = `businesses/${businessId}`;
  try {
    const docRef = doc(db, 'businesses', businessId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Business;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createBusiness(business: Business): Promise<void> {
  const path = `businesses/${business.id}`;
  try {
    await setDoc(doc(db, 'businesses', business.id), business);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    await updateDoc(doc(db, 'businesses', businessId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllBusinesses(): Promise<Business[]> {
  const path = 'businesses';
  try {
    const snap = await getDocs(collection(db, 'businesses'));
    return snap.docs.map(doc => doc.data() as Business);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ----------------------------------------------------
// Category APIs
// ----------------------------------------------------

export async function getCategories(businessId: string): Promise<Category[]> {
  const path = 'categories';
  try {
    const q = query(collection(db, 'categories'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Category);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addCategory(category: Category): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), category);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Product APIs
// ----------------------------------------------------

export async function getProducts(businessId: string): Promise<Product[]> {
  const path = 'products';
  try {
    const q = query(collection(db, 'products'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Product);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addProduct(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Table APIs (We can maintain these in local storage or Firestore)
// ----------------------------------------------------

export async function getTables(businessId: string): Promise<Table[]> {
  const path = 'tables';
  try {
    const q = query(collection(db, 'tables'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Seed tables
      const seeded: Table[] = [];
      const tables: Table[] = DEFAULT_TABLES;
      for (const t of tables) {
        const fullId = `${businessId}_${t.id}`;
        const newTable = {
          ...t,
          id: fullId,
          businessId
        };
        await setDoc(doc(db, 'tables', fullId), newTable);
        seeded.push(newTable);
      }
      return seeded.sort((a, b) => a.number - b.number);
    }
    const tables = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        number: data.number,
        amount: data.amount,
        status: data.status,
        runningTime: data.runningTime,
        activeOrderId: data.activeOrderId,
        cartItems: data.cartItems || []
      } as Table;
    }).sort((a, b) => a.number - b.number);
    console.log('Tables loaded from Firestore:', tables);
    return tables;
  } catch (error) {
    // If offline or Firebase fails, return DEFAULT_TABLES as fallback with prefixed IDs
    console.warn('Failed to load tables from Firestore, using default:', error);
    return DEFAULT_TABLES.map(t => ({
      ...t,
      id: `${businessId}_${t.id}`
    })).sort((a, b) => a.number - b.number);
  }
}

export async function updateTable(businessId: string, tableId: string, updates: Partial<Table>): Promise<void> {
  const actualId = tableId.startsWith(businessId) ? tableId : `${businessId}_${tableId}`;
  
  const firestoreUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      firestoreUpdates[key] = deleteField();
    } else {
      firestoreUpdates[key] = value;
    }
  }

  console.log('Updating table in Firestore:', actualId, firestoreUpdates);
  try {
    await updateDoc(doc(db, 'tables', actualId), firestoreUpdates);
  } catch (error) {
    console.warn('Offline or error updating table in Firestore:', error);
  }
}

export async function addTable(businessId: string, table: Table): Promise<void> {
  const actualId = table.id.startsWith(businessId) ? table.id : `${businessId}_${table.id}`;
  try {
    await setDoc(doc(db, 'tables', actualId), {
      ...table,
      id: actualId,
      businessId
    });
  } catch (error) {
    console.warn('Offline or error adding table in Firestore:', error);
  }
}

export async function deleteTable(businessId: string, tableId: string): Promise<void> {
  const actualId = tableId.startsWith(businessId) ? tableId : `${businessId}_${tableId}`;
  try {
    await deleteDoc(doc(db, 'tables', actualId));
  } catch (error) {
    console.warn('Offline or error deleting table in Firestore:', error);
  }
}

// ----------------------------------------------------
// Order APIs
// ----------------------------------------------------

export async function getOrders(businessId: string): Promise<Order[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, 'orders'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addOrder(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Expense APIs
// ----------------------------------------------------

export async function getExpenses(businessId: string): Promise<Expense[]> {
  const path = 'expenses';
  try {
    const q = query(collection(db, 'expenses'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Expense);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addExpense(expense: Expense): Promise<void> {
  const path = `expenses/${expense.id}`;
  try {
    await setDoc(doc(db, 'expenses', expense.id), expense);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Customer APIs
// ----------------------------------------------------

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const path = 'customers';
  try {
    const q = query(collection(db, 'customers'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addCustomer(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    await updateDoc(doc(db, 'customers', customerId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Staff APIs
// ----------------------------------------------------

export async function getStaffList(businessId: string): Promise<Staff[]> {
  const path = 'staff';
  try {
    const q = query(collection(db, 'staff'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Staff);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addStaff(staff: Staff): Promise<void> {
  const path = `staff/${staff.id}`;
  try {
    await setDoc(doc(db, 'staff', staff.id), staff);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStaff(staffId: string, updates: Partial<Staff>): Promise<void> {
  const path = `staff/${staffId}`;
  try {
    await updateDoc(doc(db, 'staff', staffId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStaff(staffId: string): Promise<void> {
  const path = `staff/${staffId}`;
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Attendance APIs
// ----------------------------------------------------

export async function getAttendanceList(businessId: string): Promise<Attendance[]> {
  const path = 'attendance';
  try {
    const q = query(collection(db, 'attendance'), where('businessId', '==', businessId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Attendance);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addAttendance(attendance: Attendance): Promise<void> {
  const path = `attendance/${attendance.id}`;
  try {
    await setDoc(doc(db, 'attendance', attendance.id), attendance);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Audit & Activity Logs
// ----------------------------------------------------

export async function getActivityLogs(businessId?: string): Promise<ActivityLog[]> {
  const path = 'activity_logs';
  try {
    let q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100));
    if (businessId) {
      q = query(collection(db, 'activity_logs'), where('businessId', '==', businessId), orderBy('timestamp', 'desc'), limit(100));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as ActivityLog);
  } catch (error) {
    // If database rules block, return empty or try to list without orderBy
    try {
      const snap = await getDocs(collection(db, 'activity_logs'));
      return snap.docs.map(doc => doc.data() as ActivityLog);
    } catch {
      return [];
    }
  }
}

export async function logActivity(log: ActivityLog): Promise<void> {
  const path = `activity_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'activity_logs', log.id), log);
  } catch (error) {
    console.warn('Could not save audit log:', error);
  }
}

// ----------------------------------------------------
// Auto-Seeding helper
// ----------------------------------------------------
export async function seedDefaultCatalogIfEmpty(businessId: string): Promise<void> {
  try {
    const existingCats = await getCategories(businessId);
    if (existingCats && existingCats.length > 0) {
      return; // already seeded
    }

    // 1. Create categories
    const categoriesToSeed = [
      { id: 'cat_fast_food', name: 'fast food', businessId },
      { id: 'cat_chinese', name: 'Chinese', businessId },
      { id: 'cat_beverages', name: 'Beverages', businessId },
      { id: 'cat_desserts', name: 'Desserts', businessId },
      { id: 'cat_south_indian', name: 'South Indian', businessId },
      { id: 'cat_pizza', name: 'Pizza', businessId },
      { id: 'cat_burger', name: 'Burger', businessId }
    ];

    for (const cat of categoriesToSeed) {
      await addCategory(cat);
    }

    // 2. Create products (exactly matching the user screenshots)
    const productsToSeed: Product[] = [
      {
        id: 'prod_pav_bhaji',
        name: 'pav bhaji',
        categoryId: 'cat_fast_food',
        price: 120,
        buyPrice: 45,
        sku: 'PVBJ01',
        unit: 'PLATE',
        trackStock: true,
        stockQuantity: 85,
        isVeg: true,
        businessId,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_ice_cream',
        name: 'ice cream',
        categoryId: 'cat_desserts',
        price: 30,
        buyPrice: 12,
        sku: 'ICRM01',
        unit: 'QUANTITY',
        trackStock: true,
        stockQuantity: 120,
        isVeg: true,
        businessId,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_bisleri',
        name: 'Bisleri',
        categoryId: 'cat_beverages',
        price: 20,
        buyPrice: 8,
        sku: 'BSLR01',
        unit: 'QUANTITY',
        trackStock: true,
        stockQuantity: 200,
        isVeg: true,
        businessId,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_veg_burger',
        name: 'Veg Burger',
        categoryId: 'cat_burger',
        price: 90,
        buyPrice: 35,
        sku: 'VGBG01',
        unit: 'QUANTITY',
        trackStock: true,
        stockQuantity: 40,
        isVeg: true,
        businessId,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_chicken_manchurian',
        name: 'Chicken Manchurian',
        categoryId: 'cat_chinese',
        price: 180,
        buyPrice: 75,
        sku: 'CHMN01',
        unit: 'PLATE',
        trackStock: false,
        stockQuantity: 0,
        isVeg: false,
        businessId,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_masala_dosa',
        name: 'Masala Dosa',
        categoryId: 'cat_south_indian',
        price: 80,
        buyPrice: 25,
        sku: 'MSDS01',
        unit: 'PLATE',
        trackStock: false,
        stockQuantity: 0,
        isVeg: true,
        businessId,
        createdAt: new Date().toISOString()
      }
    ];

    for (const prod of productsToSeed) {
      await addProduct(prod);
    }

    // 3. Create default staff (Suresh Kumar, Ramesh Shinde, Admin Owner)
    const staffToSeed: Staff[] = [
      {
        id: 'staff_suresh',
        name: 'Suresh Kumar',
        pin: '1234',
        role: 'Waiter',
        phone: '7447404768',
        businessId
      },
      {
        id: 'staff_ramesh',
        name: 'Ramesh Shinde',
        pin: '4321',
        role: 'Cashier',
        phone: '9876543210',
        businessId
      },
      {
        id: 'staff_owner',
        name: 'Admin Owner',
        pin: '0000',
        role: 'Admin',
        phone: '9900990099',
        businessId
      }
    ];

    for (const s of staffToSeed) {
      await addStaff(s);
    }

    // 4. Create default customer
    const customerToSeed: Customer = {
      id: 'cust_walkin',
      name: 'Walk-in Customer',
      phone: '0000000000',
      outstanding: 0,
      loyaltyPoints: 10,
      businessId
    };
    await addCustomer(customerToSeed);

  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  doc, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Order, CartItem } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface OrderContextType {
  orders: Order[];
  userOrders: Order[];
  placeOrder: (items: CartItem[], total: number, customerDetails: { name: string; phone: string; address: string; coords?: { lat: number; lng: number } }, paymentMethod: Order['paymentMethod']) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateTrackingNumber: (orderId: string, trackingNumber: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteMultipleOrders: (orderIds: string[]) => Promise<void>;
  loading: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all orders for admin
  useEffect(() => {
    if (!user || !isAdmin) {
      if (user) console.log(`OrderContext: User ${user.email} is not admin, skipping broad fetch.`);
      setOrders([]);
      return;
    }

    console.log(`OrderContext: User ${user.email} is admin, starting broad fetch.`);
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
      })) as Order[];
      // Sort by date descending
      ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders_all');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Fetch user specific orders
  useEffect(() => {
    if (!user) {
      setUserOrders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
      })) as Order[];
      // Sort by date descending
      ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders_user');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const placeOrder = async (
    items: CartItem[], 
    total: number, 
    customerDetails: { name: string; phone: string; address: string; coords?: { lat: number; lng: number } },
    paymentMethod: Order['paymentMethod']
  ) => {
    if (!user) throw new Error('Must be logged in to place an order');
    if (isAdmin) throw new Error('Administrators cannot place orders');

    const orderData = {
      userId: user.uid,
      items,
      total,
      status: 'pending',
      createdAt: Timestamp.now(),
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      customerAddress: customerDetails.address,
      customerCoords: customerDetails.coords || null,
      paymentMethod
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updateTrackingNumber = async (orderId: string, trackingNumber: string) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { trackingNumber });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!isAdmin) throw new Error('Only admins can delete orders');
    const orderRef = doc(db, 'orders', orderId);
    try {
      await deleteDoc(orderRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const deleteMultipleOrders = async (orderIds: string[]) => {
    if (!isAdmin) throw new Error('Only admins can delete orders');
    const batch = writeBatch(db);
    
    orderIds.forEach(id => {
      batch.delete(doc(db, 'orders', id));
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders/batch-delete');
    }
  };

  return (
    <OrderContext.Provider value={{ orders, userOrders, placeOrder, updateOrderStatus, updateTrackingNumber, deleteOrder, deleteMultipleOrders, loading }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};

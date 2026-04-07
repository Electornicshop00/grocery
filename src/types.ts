export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  trackingNumber?: string;
  paymentMethod: 'upi' | 'cod' | 'whatsapp';
  upiTransactionId?: string;
}

export interface UpiOrder {
  id: string;
  orderId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

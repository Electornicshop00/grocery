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
  customerCoords?: { lat: number; lng: number };
  courierCoords?: { lat: number; lng: number };
  trackingNumber?: string;
  paymentMethod: 'cod' | 'whatsapp' | 'upi';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin' | 'courier';
  createdAt: string;
}

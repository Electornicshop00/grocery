import { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  ShoppingBag, 
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  ChevronDown,
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Order } from '../types';

export default function Orders() {
  const { userOrders, loading } = useOrders();
  const { user } = useAuth();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const getStatusStyles = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock };
      case 'processing':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Package };
      case 'shipped':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Truck };
      case 'delivered':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Clock };
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getTrackingLink = (trackingNumber: string) => {
    // Basic detection for common carriers
    const num = trackingNumber.trim().toUpperCase();
    
    // FedEx: 12 or 15 digits
    if (/^\d{12}$|^\d{15}$/.test(num)) {
      return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
    }
    // UPS: Starts with 1Z
    if (/^1Z[A-Z0-9]{16}$/.test(num)) {
      return `https://www.ups.com/track?tracknum=${num}`;
    }
    // USPS: 20-22 digits or starts with 2 letters and 9 digits
    if (/^\d{20,22}$|^[A-Z]{2}\d{9}[A-Z]{2}$/.test(num)) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`;
    }
    // DHL: 10 digits
    if (/^\d{10}$/.test(num)) {
      return `https://www.dhl.com/en/express/tracking.html?AWB=${num}&brand=DHL`;
    }
    
    // Default to a generic Google search if format not recognized
    return `https://www.google.com/search?q=track+package+${num}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (userOrders.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">No orders yet</h2>
        <p className="text-gray-500 max-w-md mx-auto">You haven't placed any orders yet. Start shopping to fill your pantry!</p>
        <Link to="/" className="inline-block bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
          <p className="text-gray-500">Track and manage your grocery orders.</p>
        </div>
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold text-sm border border-green-100">
          {userOrders.length} {userOrders.length === 1 ? 'Order' : 'Orders'}
        </div>
      </div>

      <div className="space-y-4">
        {userOrders.map(order => {
          const statusStyle = getStatusStyles(order.status);
          const isExpanded = expandedOrders.has(order.id);
          
          return (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md">
              <div 
                onClick={() => toggleOrderExpansion(order.id)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${statusStyle.bg} ${statusStyle.text}`}>
                    <statusStyle.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-gray-500 font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{format(new Date(order.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-green-700">₹{order.total.toFixed(2)}</p>
                  </div>
                  <div className={`p-2 rounded-full bg-gray-100 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t bg-gray-50/30"
                  >
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Items Ordered
                        </h4>
                        <div className="space-y-3 bg-white p-4 rounded-xl border">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">{item.name} <span className="text-gray-400 font-normal">x{item.quantity}</span></span>
                              <span className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-3 mt-3 flex justify-between items-center font-bold text-gray-800">
                            <span>Total</span>
                            <span className="text-green-700 text-lg">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Delivery Details
                          </h4>
                          <div className="bg-white p-4 rounded-xl border space-y-4">
                            <div className="flex items-start gap-3 text-sm">
                              <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                              <div>
                                <p className="font-bold text-gray-800">Shipping Address</p>
                                <p className="text-gray-600 leading-relaxed">{order.customerAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Phone className="w-5 h-5 text-green-600 shrink-0" />
                              <div>
                                <p className="font-bold text-gray-800">Contact Number</p>
                                <p className="text-gray-600">{order.customerPhone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <CreditCard className="w-5 h-5 text-green-600 shrink-0" />
                              <div>
                                <p className="font-bold text-gray-800">Payment Method</p>
                                <p className="text-gray-600 uppercase">{order.paymentMethod}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Calendar className="w-5 h-5 text-green-600 shrink-0" />
                              <div>
                                <p className="font-bold text-gray-800">Order Placed</p>
                                <p className="text-gray-600">{format(new Date(order.createdAt), 'MMMM d, yyyy HH:mm')}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {order.trackingNumber && (
                          <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Shipping Information
                            </h4>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Tracking Number</p>
                                <p className="font-mono font-bold text-indigo-900">{order.trackingNumber}</p>
                              </div>
                              <a 
                                href={getTrackingLink(order.trackingNumber)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-indigo-600 p-2 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
                              >
                                Track Package
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-green-800">Need help?</p>
                              <p className="text-xs text-green-600">Contact support for this order</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

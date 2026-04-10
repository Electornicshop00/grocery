import { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
const courierIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const customerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #dc2626; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

export default function Orders() {
  const { userOrders, loading } = useOrders();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showTrackingMap, setShowTrackingMap] = useState<string | null>(null);

  const getStatusStyles = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: Clock };
      case 'processing':
        return { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300', icon: Package };
      case 'shipped':
        return { bg: 'bg-gray-300', text: 'text-gray-800', border: 'border-gray-400', icon: Truck };
      case 'delivered':
        return { bg: 'bg-green-600', text: 'text-white', border: 'border-green-600', icon: CheckCircle };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-200', icon: XCircle };
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
    const num = trackingNumber.trim().toUpperCase();
    if (/^\d{12}$|^\d{15}$/.test(num)) {
      return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
    }
    if (/^1Z[A-Z0-9]{16}$/.test(num)) {
      return `https://www.ups.com/track?tracknum=${num}`;
    }
    if (/^\d{20,22}$|^[A-Z]{2}\d{9}[A-Z]{2}$/.test(num)) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`;
    }
    if (/^\d{10}$/.test(num)) {
      return `https://www.dhl.com/en/express/tracking.html?AWB=${num}&brand=DHL`;
    }
    return `https://www.google.com/search?q=track+package+${num}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (userOrders.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">{t('noOrders')}</h2>
        <p className="text-gray-500 max-w-md mx-auto">You haven't placed any orders yet. Start shopping to fill your pantry!</p>
        <Link to="/" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors">
          {t('startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('orders')}</h1>
          <p className="text-gray-500">Track and manage your grocery orders.</p>
        </div>
        <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm border border-gray-200">
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
                  <div 
                    className={`p-3 rounded-xl ${statusStyle.text}`}
                    style={order.status === 'delivered' ? { backgroundColor: 'rgb(39, 96, 27)' } : { backgroundColor: statusStyle.bg.replace('bg-', 'var(--') }}
                  >
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

                <div className="hidden md:flex items-center -space-x-3 overflow-hidden">
                  {order.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{t('total')}</p>
                    <p className="text-xl font-bold text-gray-900">₹{order.total.toFixed(2)}</p>
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
                            <div key={i} className="flex items-center gap-3 py-1 border-b last:border-0 pb-3 last:pb-0">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border shrink-0">
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} x {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                          <div className="pt-3 flex justify-between items-center font-bold text-gray-800">
                            <span>{t('total')}</span>
                            <span className="text-gray-900 text-lg">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {t('deliveryDetails')}
                          </h4>
                          <div className="bg-white p-4 rounded-xl border space-y-4">
                            <div className="flex items-start gap-3 text-sm">
                              <MapPin className="w-5 h-5 shrink-0" style={{ color: 'rgb(39, 96, 27)' }} />
                              <div>
                                <p className="font-bold text-gray-800">Shipping Address</p>
                                <p className="text-gray-600 leading-relaxed">{order.customerAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Phone className="w-5 h-5 shrink-0" style={{ color: 'rgb(39, 96, 27)' }} />
                              <div>
                                <p className="font-bold text-gray-800">Contact Number</p>
                                <p className="text-gray-600">{order.customerPhone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <CreditCard className="w-5 h-5 shrink-0" style={{ color: 'rgb(39, 96, 27)' }} />
                              <div>
                                <p className="font-bold text-gray-800">{t('paymentMethod')}</p>
                                <p className="text-gray-600 font-medium">
                                  {order.paymentMethod === 'cod' ? t('cod') : 
                                   order.paymentMethod === 'whatsapp' ? t('whatsapp') : 
                                   t('upi')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Calendar className="w-5 h-5 shrink-0" style={{ color: 'rgb(39, 96, 27)' }} />
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
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3">
                              <div className="flex items-center justify-between">
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
                              
                              {order.status === 'shipped' && order.courierCoords && (
                                <button
                                  onClick={() => setShowTrackingMap(showTrackingMap === order.id ? null : order.id)}
                                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                                >
                                  <MapPin className="w-4 h-4" />
                                  {showTrackingMap === order.id ? 'Hide Live Map' : 'View Live Delivery Map'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <AnimatePresence>
                          {showTrackingMap === order.id && order.courierCoords && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="h-[300px] w-full rounded-xl overflow-hidden border mt-4 z-0">
                                <MapContainer 
                                  center={[order.courierCoords.lat, order.courierCoords.lng]} 
                                  zoom={15} 
                                  style={{ height: '100%', width: '100%' }}
                                >
                                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                  <Marker position={[order.courierCoords.lat, order.courierCoords.lng]} icon={courierIcon}>
                                    <Popup>
                                      <div className="text-center">
                                        <p className="font-bold">Courier is here</p>
                                        <p className="text-xs text-gray-500">Out for delivery</p>
                                      </div>
                                    </Popup>
                                  </Marker>
                                  {order.customerCoords && (
                                    <Marker position={[order.customerCoords.lat, order.customerCoords.lng]} icon={customerIcon}>
                                      <Popup>
                                        <p className="font-bold">Your Delivery Location</p>
                                      </Popup>
                                    </Marker>
                                  )}
                                </MapContainer>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-2 italic text-center">
                                Live location updates every few seconds.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">Need help?</p>
                              <p className="text-xs text-gray-600">Contact support for this order</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-600" />
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

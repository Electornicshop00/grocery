import { useState, useEffect, useRef } from 'react';
import { Product, Order } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { useOrders } from '../context/OrderContext';
import { useSocket } from '../context/SocketContext';
import { Navigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Search,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  ChevronUp,
  Phone,
  CreditCard,
  Upload,
  Loader2,
  Info,
  Settings,
  Bell,
  Volume2,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, updateDoc } from 'firebase/firestore';

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

export default function Admin() {
  const { showToast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { orders, updateOrderStatus, updateTrackingNumber, deleteOrder, deleteMultipleOrders, loading: ordersLoading } = useOrders();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showCourierMap, setShowCourierMap] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    sound: true,
    vibration: true,
    newOrders: true
  });
  const [sessionStartTime] = useState(new Date());
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    category: '',
    stock: 0,
    description: '',
    image: ''
  });

  // Real-time notification logic for new orders via Socket.io
  useEffect(() => {
    if (!socket) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Notifications enabled!', 'success');
        }
      });
    }

    const handleNewOrder = (data: { customerName: string, total: number }) => {
      if (notificationSettings.newOrders) {
        showToast(`🛍️ New Order Received from ${data.customerName}! (₹${data.total.toFixed(2)})`, 'success');
        
        // System notification
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification('New Order Received', {
                body: `Order from ${data.customerName} for ₹${data.total.toFixed(2)}`,
                icon: 'https://picsum.photos/seed/grocery/192/192',
                tag: 'new-order' // Prevent duplicate notifications
              });
            } catch (err) {
              console.warn("System notification failed:", err);
            }
          } else if (Notification.permission === 'denied') {
            console.warn("Notifications are blocked by the user.");
          }
        }

        if (notificationSettings.sound) {
          // Using a clear, professional notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => {
            console.warn("Audio playback failed (browser policy):", e);
            // Don't show toast every time, just log it. 
            // The user needs to interact with the page once.
          });
        }

        if (notificationSettings.vibration && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };

    socket.on('new-order', handleNewOrder);

    return () => {
      socket.off('new-order', handleNewOrder);
    };
  }, [socket, notificationSettings, showToast]);

  if (authLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" />;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setProductForm(prev => ({ ...prev, image: downloadURL }));
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to upload image: ${errorMessage}`, 'error');
      
      if (errorMessage.includes('storage/unauthorized')) {
        showToast('Please check your Firebase Storage security rules.', 'info');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUploading) {
      showToast('Please wait for the image to finish uploading', 'error');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, productForm);
      showToast('Product updated successfully', 'success');
    } else {
      addProduct(productForm);
      showToast('Product added successfully', 'success');
    }

    setIsAddingProduct(false);
    setEditingProduct(null);
    setProductForm({ name: '', price: 0, category: '', stock: 0, description: '', image: '' });
  };

  const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteProduct(id);
          showToast('Product deleted successfully', 'success');
        } catch (error) {
          showToast('Failed to delete product', 'error');
        }
      }
    });
  };

  const handleOrderStatusChange = async (id: string, status: Order['status']) => {
    setUpdatingOrderId(id);
    try {
      await updateOrderStatus(id, status);
      showToast(`Order status updated to ${status}`, 'success');
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusStyles = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: Clock };
      case 'processing':
        return { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300', icon: Package };
      case 'shipped':
        return { bg: 'bg-gray-300', text: 'text-gray-800', border: 'border-gray-400', icon: Truck };
      case 'delivered':
        return { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-900', icon: CheckCircle };
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

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAllOrders = () => {
    if (orders.length === 0) return;
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const handleDeleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) return;
    const count = selectedOrders.size;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Multiple Orders',
      message: `Are you sure you want to delete ${count} selected orders? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteMultipleOrders(Array.from(selectedOrders));
          showToast(`${count} orders deleted successfully`, 'success');
          setSelectedOrders(new Set());
        } catch (error) {
          console.error("Error deleting orders:", error);
          showToast(`Failed to delete orders: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }
    });
  };

  const handleDeleteSingleOrder = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteOrder(orderId);
          showToast('Order deleted successfully', 'success');
          const newSelected = new Set(selectedOrders);
          newSelected.delete(orderId);
          setSelectedOrders(newSelected);
        } catch (error) {
          showToast('Failed to delete order', 'error');
        }
      }
    });
  };

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-white', bg: 'bg-green-600' },
    { label: 'Total Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}`, icon: TrendingUp, color: 'text-white', bg: 'bg-green-600' },
    { label: 'Active Products', value: products.length, icon: Package, color: 'text-white', bg: 'bg-green-600' },
    { label: 'Low Stock Items', value: products.filter(p => p.stock < 10).length, icon: Clock, color: 'text-white', bg: 'bg-green-600' },
  ];

  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  const lowStockProducts = products.filter(p => p.stock < 10);

  const toggleSetting = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
    showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} setting updated`, 'success');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesLowStock = !showLowStockOnly || p.stock < 10;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500">Manage your store inventory and customer orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50 shadow-sm'}`}
            title="Notification Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
          <div className="flex bg-white rounded-xl p-1 border shadow-sm">
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'products' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors relative flex items-center gap-2 ${activeTab === 'orders' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Orders
              {activeOrdersCount > 0 && (
                <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'orders' ? 'bg-white text-gray-900' : 'bg-gray-400 text-white'
                }`}>
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <Bell className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">Admin Notification Settings</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Sound Alerts</p>
                      <button 
                        onClick={() => {
                          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                          audio.play().catch(e => {
                            console.warn("Audio playback failed:", e);
                            showToast("Please click again to enable sound", "info");
                          });
                        }}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Test Sound
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('sound')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.sound ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.sound ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Vibration</p>
                      <p className="text-xs text-gray-500">Vibrate on new alerts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('vibration')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.vibration ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.vibration ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">New Orders</p>
                      {('Notification' in window && Notification.permission !== 'granted') ? (
                        <button 
                          onClick={() => {
                            Notification.requestPermission().then(p => {
                              if (p === 'granted') {
                                showToast('Notifications enabled for important order alerts!', 'success');
                              } else {
                                showToast(`Notification permission: ${p}`, 'info');
                              }
                            });
                          }}
                          className="text-[10px] text-orange-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          Enable Order Alerts
                        </button>
                      ) : (
                        <p className="text-xs text-gray-500">Alert for incoming orders</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('newOrders')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings.newOrders ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings.newOrders ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Troubleshooting Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Info className="w-5 h-5" />
                  <h3 className="font-bold">Notification Troubleshooting</h3>
                </div>
                <ul className="text-xs text-blue-700 space-y-2 list-disc pl-5">
                  <li><strong>Mobile Sound:</strong> Browsers block sound until you click something. Use the <strong>Test Sound</strong> button above to "unlock" audio.</li>
                  <li><strong>iOS Users:</strong> You <strong>must</strong> add this app to your Home Screen (Share &gt; Add to Home Screen) for pop-up notifications to work.</li>
                  <li><strong>Permissions:</strong> Ensure you haven't blocked notifications in your browser settings. Look for a lock icon in the address bar.</li>
                  <li><strong>Do Not Disturb:</strong> Check if your phone is in "Silent" or "Do Not Disturb" mode.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border flex items-center gap-3 md:gap-4 transition-colors">
            <div 
              className={`${stat.color} p-2 md:p-4 rounded-xl shrink-0`}
              style={{ backgroundColor: 'rgb(39, 96, 27)' }}
            >
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-sm text-gray-500 font-medium truncate">{stat.label}</p>
              <p className="text-base md:text-2xl font-bold text-gray-800 truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Courier Tracking Map Section */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowCourierMap(!showCourierMap)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Live Courier Tracking</h2>
              <p className="text-sm text-gray-500">Monitor active deliveries in real-time</p>
            </div>
          </div>
          <div className={`p-2 rounded-full bg-gray-100 text-gray-400 transition-transform duration-300 ${showCourierMap ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
        
        <AnimatePresence>
          {showCourierMap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t"
            >
              <div className="h-[500px] w-full z-0">
                <MapContainer 
                  center={[22.5726, 88.3639]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {orders.filter(o => o.status === 'shipped' && o.courierCoords).map(order => (
                    <Marker 
                      key={`courier-${order.id}`} 
                      position={[order.courierCoords!.lat, order.courierCoords!.lng]} 
                      icon={courierIcon}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-bold text-blue-600">Courier (Order #{order.id.slice(-6).toUpperCase()})</p>
                          <p className="text-xs">Delivering to: <span className="font-medium">{order.customerName}</span></p>
                          <p className="text-[10px] text-gray-500">{order.customerAddress}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {orders.filter(o => o.status === 'shipped' && o.customerCoords).map(order => (
                    <Marker 
                      key={`customer-${order.id}`} 
                      position={[order.customerCoords!.lat, order.customerCoords!.lng]} 
                      icon={customerIcon}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-bold text-red-600">Customer: {order.customerName}</p>
                          <p className="text-xs">Order #{order.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <div className="p-4 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                    <span>Active Courier</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm"></div>
                    <span>Delivery Location</span>
                  </div>
                </div>
                <p className="italic">Showing all active 'Shipped' orders with live tracking enabled.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg text-white"
              style={{ backgroundColor: 'rgb(39, 96, 27)' }}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-800">Low Stock Alert</p>
              <p className="text-sm text-gray-600">{lowStockProducts.length} items are running low on stock (less than 10 units remaining).</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setActiveTab('products');
              setShowLowStockOnly(true);
            }}
            className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors whitespace-nowrap"
          >
            View Items
          </button>
        </motion.div>
      )}

      {activeTab === 'products' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                  showLowStockOnly 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Low Stock Only
              </button>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                  if (isAddingProduct && !editingProduct) {
                    setIsAddingProduct(false);
                  } else {
                    setIsAddingProduct(true);
                    setEditingProduct(null);
                    setProductForm({ name: '', price: 0, category: '', stock: 0, description: '', image: '' });
                  }
                }}
                className="w-full sm:w-auto bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                {isAddingProduct && !editingProduct ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {isAddingProduct && !editingProduct ? 'Close Form' : 'Add New Product'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isAddingProduct && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                  <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-white/80 hover:text-white">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <form onSubmit={handleProductSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Product Name</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
                          value={productForm.name}
                          onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Category</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
                          value={productForm.category}
                          onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Price (₹)</label>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
                          value={isNaN(productForm.price) ? '' : productForm.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setProductForm({...productForm, price: isNaN(val) ? 0 : val});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Stock Quantity</label>
                        <input 
                          required
                          type="number" 
                          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none"
                          value={isNaN(productForm.stock) ? '' : productForm.stock}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setProductForm({...productForm, stock: isNaN(val) ? 0 : val});
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Product Image</label>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Option 1: Upload File</p>
                            <div className="flex flex-col gap-2">
                              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer h-[100px] ${
                                isUploading ? 'bg-gray-50 border-gray-200' : 'hover:bg-gray-50 hover:border-gray-300 border-gray-300'
                              }`}>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={isUploading}
                                />
                                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Firebase Upload</span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Option 2: Paste URL</p>
                            <div className="flex gap-3">
                              {productForm.image && (
                                <div className="relative w-[100px] h-[100px] rounded-xl overflow-hidden border bg-white shrink-0 group">
                                  <img 
                                    src={productForm.image} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&h=200';
                                    }}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => setProductForm(prev => ({ ...prev, image: '' }))}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                              <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="w-4 h-4 text-gray-400" />
                                </div>
                                <input 
                                  type="url" 
                                  placeholder="https://example.com/image.jpg"
                                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm h-[100px] align-top"
                                  value={productForm.image}
                                  onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">Recommended: Square image, max 5MB. Or use a direct image link.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Description</label>
                      <textarea 
                        rows={3}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                        value={productForm.description}
                        onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                        className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isUploading}
                        className="flex-[2] bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? 'Uploading...' : (editingProduct ? 'Save Changes' : 'Add Product')}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.image || `https://picsum.photos/seed/${product.id}/100/100`} 
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== `https://picsum.photos/seed/${product.id}/100/100`) {
                                target.src = `https://picsum.photos/seed/${product.id}/100/100`;
                              } else {
                                target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100&h=100';
                              }
                            }}
                          />
                          <span className="font-bold text-gray-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${product.stock < 10 ? 'text-gray-400' : 'text-gray-800'}`}>{product.stock}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingProduct(product);
                              setProductForm({
                                name: product.name,
                                price: product.price,
                                category: product.category,
                                stock: product.stock,
                                description: product.description,
                                image: product.image
                              });
                              setIsAddingProduct(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
            <div className="flex items-center gap-3">
              {selectedOrders.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleDeleteSelectedOrders}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedOrders.size})
                </motion.button>
              )}
              <button
                onClick={toggleSelectAllOrders}
                className="text-sm font-bold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {selectedOrders.size === orders.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {orders.map(order => {
              const statusStyle = getStatusStyles(order.status);
              const isExpanded = expandedOrders.has(order.id);
              const isSelected = selectedOrders.has(order.id);
              return (
                <div key={order.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md ${isSelected ? 'border-gray-900 ring-1 ring-gray-900' : ''}`}>
                  <div 
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderSelection(order.id);
                        }}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 hover:border-gray-900'
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div className={`p-3 rounded-xl ${statusStyle.bg} ${statusStyle.text}`}>
                        <statusStyle.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-gray-500 font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            {order.status}
                          </span>
                          {new Date(order.createdAt) > sessionStartTime && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-gray-800">{order.customerName}</p>
                      </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center -space-x-3 overflow-hidden">
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

                    <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeleteSingleOrder(e, order.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Order"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <select 
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) => handleOrderStatusChange(order.id, e.target.value as Order['status'])}
                          className={`bg-white border rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-colors appearance-none pr-10 ${statusStyle.text} ${statusStyle.border} ${updatingOrderId === order.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {updatingOrderId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <ChevronDown className={`w-4 h-4 ${statusStyle.text}`} />
                          )}
                        </div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm text-gray-500">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
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
                              Order Items
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
                                <span>Total Amount</span>
                                <span className="text-gray-900 text-lg">₹{order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Customer Information
                              </h4>
                              <div className="bg-white p-4 rounded-xl border space-y-4">
                                <div className="flex items-start gap-3 text-sm">
                                  <Truck className="w-5 h-5 text-gray-600 shrink-0" />
                                  <div>
                                    <p className="font-bold text-gray-800">Shipping Address</p>
                                    <p className="text-gray-600 leading-relaxed">{order.customerAddress}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800">Contact Number</p>
                                    <p className="text-gray-600">{order.customerPhone}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-gray-600 shrink-0" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800">Payment Method</p>
                                    <p className="text-gray-600 font-medium">
                                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                                       order.paymentMethod === 'whatsapp' ? 'WhatsApp Order' : 
                                       'Online UPI'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-gray-600 shrink-0" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800">Order Date</p>
                                    <p className="text-gray-600">{format(new Date(order.createdAt), 'MMMM d, yyyy HH:mm')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Shipping & Tracking
                              </h4>
                              <div className="bg-white p-4 rounded-xl border space-y-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase">Tracking Number</label>
                                  <input 
                                    type="text" 
                                    placeholder="Enter tracking number..."
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    defaultValue={order.trackingNumber || ''}
                                    onBlur={async (e) => {
                                      if (e.target.value !== (order.trackingNumber || '')) {
                                        try {
                                          await updateTrackingNumber(order.id, e.target.value);
                                          showToast('Tracking number updated', 'success');
                                        } catch (error) {
                                          showToast('Failed to update tracking number', 'error');
                                        }
                                      }
                                    }}
                                  />
                                  <p className="text-[10px] text-gray-400 italic">Tracking number is saved automatically when you click away.</p>
                                </div>
                              </div>
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
      )}

      {/* Product List */}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function ConfirmationModal({ isOpen, title, message, onConfirm, onClose }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border"
      >
        <div className="flex items-center gap-4 mb-6 text-red-600">
          <div className="p-3 bg-red-50 rounded-2xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-6 py-4 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Order } from '../types';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, User, Map as MapIcon, List, Navigation, Settings, Bell, Volume2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface OrderWithCoords extends Order {
  coords?: [number, number];
}

// Component to handle map center updates
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

// Routing Machine Component
function RoutingControl({ waypoints }: { waypoints: L.LatLng[] }) {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Remove existing control if it exists
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    // Create new routing control
    routingControlRef.current = (L as any).Routing.control({
      waypoints,
      lineOptions: {
        styles: [
          { color: '#166534', weight: 8, opacity: 0.9 }, // Darker green border
          { color: '#22c55e', weight: 4, opacity: 1 }    // Brighter green center
        ]
      },
      show: false, // Hide the instructions panel
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: () => null // Don't create extra markers
    }).addTo(map);

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, waypoints]);

  return null;
}

export default function CourierPanel() {
  const [orders, setOrders] = useState<OrderWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.5726, 88.3639]); // Default to Kolkata
  const [routeWaypoints, setRouteWaypoints] = useState<L.LatLng[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    sound: true,
    vibration: true,
    newOrders: true
  });
  const { showToast } = useToast();
  const { t } = useLanguage();

  const SHOP_LOCATION: [number, number] = [22.5726, 88.3639];

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderWithCoords));
      
      // Geocode addresses for active orders
      const ordersWithCoords = await Promise.all(ordersData.map(async (order) => {
        if (order.status === 'delivered' || order.status === 'cancelled') return order;
        
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.customerAddress)}&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
            return { ...order, coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number] };
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        }
        return order;
      }));

      setOrders(ordersWithCoords);
      
      const firstActive = ordersWithCoords.find(o => o.coords && o.status !== 'delivered');
      if (firstActive?.coords) {
        setMapCenter(firstActive.coords);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      showToast('Error fetching orders', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = { status: newStatus };
      
      // If there's a tracking number in the input, save it too
      if (trackingInputs[orderId]) {
        updateData.trackingNumber = trackingInputs[orderId];
      }
      
      await updateDoc(orderRef, updateData);
      showToast(`Order status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast('Failed to update order status', 'error');
    }
  };

  const saveTrackingNumber = async (orderId: string) => {
    const trackingNumber = trackingInputs[orderId];
    if (!trackingNumber) {
      showToast('Please enter a tracking number', 'error');
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { trackingNumber });
      showToast('Tracking number saved', 'success');
    } catch (error) {
      console.error("Error saving tracking number:", error);
      showToast('Failed to save tracking number', 'error');
    }
  };

  const optimizeRoute = () => {
    setIsOptimizing(true);
    const activeOrdersWithCoords = orders.filter(o => o.coords && (o.status === 'processing' || o.status === 'shipped'));
    
    if (activeOrdersWithCoords.length === 0) {
      showToast('No active orders with coordinates to optimize', 'info');
      setIsOptimizing(false);
      return;
    }

    // Simple Nearest Neighbor Algorithm for TSP
    let currentPos = SHOP_LOCATION;
    let unvisited = [...activeOrdersWithCoords];
    let optimizedPath: L.LatLng[] = [L.latLng(SHOP_LOCATION[0], SHOP_LOCATION[1])];

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const order = unvisited[i];
        const dist = Math.sqrt(
          Math.pow(order.coords![0] - currentPos[0], 2) + 
          Math.pow(order.coords![1] - currentPos[1], 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextOrder = unvisited.splice(nearestIdx, 1)[0];
      optimizedPath.push(L.latLng(nextOrder.coords![0], nextOrder.coords![1]));
      currentPos = nextOrder.coords!;
    }

    setRouteWaypoints(optimizedPath);
    setViewMode('map');
    showToast('Route optimized for efficiency!', 'success');
    setIsOptimizing(false);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

  const toggleSetting = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
    showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} setting updated`, 'success');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Truck className="w-8 h-8 text-gray-900" />
          Curries Panel (Delivery)
        </h1>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Notification Settings"
          >
            <Settings className="w-6 h-6" />
          </button>

          <button
            onClick={optimizeRoute}
            disabled={isOptimizing}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
          </button>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MapIcon className="w-4 h-4" />
              Map View
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
                <h2 className="text-xl font-bold text-gray-800">Notification Settings</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Sound Alerts</p>
                      <p className="text-xs text-gray-500">Play sound for new orders</p>
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
                      <p className="text-xs text-gray-500">Alert for incoming orders</p>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'map' ? (
        <div className="h-[600px] w-full rounded-3xl overflow-hidden border shadow-xl relative z-0">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routeWaypoints.length > 0 && <RoutingControl waypoints={routeWaypoints} />}
            
            {/* Shop Marker */}
            <Marker position={SHOP_LOCATION}>
              <Popup>
                <div className="p-1 font-bold">FreshCart Shop (Start)</div>
              </Popup>
            </Marker>

            {activeOrders.map((order) => {
              if (!order.coords) return null;
              
              // Find sequence index if route is active
              const sequenceIndex = routeWaypoints.findIndex(wp => 
                wp.lat === order.coords![0] && wp.lng === order.coords![1]
              );

              return (
                <Marker 
                  key={order.id} 
                  position={order.coords}
                  icon={sequenceIndex > 0 ? L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg text-xs">${sequenceIndex}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                  }) : DefaultIcon}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {sequenceIndex > 0 && (
                            <span className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {sequenceIndex}
                            </span>
                          )}
                          <span className="text-xs font-bold text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mb-1">{order.customerName}</p>
                      <p className="text-xs text-gray-600 mb-3 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        {order.customerAddress}
                      </p>
                      
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Tracking Number"
                          className="w-full px-2 py-1 text-xs border rounded mb-1"
                          value={trackingInputs[order.id] || order.trackingNumber || ''}
                          onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                        />
                        {(trackingInputs[order.id] && trackingInputs[order.id] !== order.trackingNumber) && (
                          <button
                            onClick={() => saveTrackingNumber(order.id)}
                            className="w-full bg-gray-800 text-white py-1 rounded text-[10px] font-bold"
                          >
                            Save Tracking
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'processing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'shipped')}
                            className="w-full bg-purple-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700"
                          >
                            Ship
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            className="w-full bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-green-700"
                          >
                            Deliver
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          
          {routeWaypoints.length > 0 && (
            <button 
              onClick={() => setRouteWaypoints([])}
              className="absolute bottom-6 right-6 z-[1000] bg-white text-red-600 px-4 py-2 rounded-xl font-bold shadow-lg border border-red-100 hover:bg-red-50 transition-colors"
            >
              Clear Route
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={order.id}
                className="bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order ID</span>
                        <span className="text-sm font-mono font-bold text-gray-800">#{order.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-bold">
                        ₹{order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-gray-100 p-2 rounded-xl">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                          <p className="font-bold text-gray-800">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-gray-100 p-2 rounded-xl">
                          <Phone className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</p>
                          <p className="font-bold text-gray-800">{order.customerPhone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-100 p-2 rounded-xl">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Address</p>
                        <p className="text-gray-700 leading-relaxed mb-4">{order.customerAddress}</p>
                        
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tracking Information</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter Tracking Number"
                              className="flex-1 px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                              value={trackingInputs[order.id] || order.trackingNumber || ''}
                              onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            />
                            {(trackingInputs[order.id] && trackingInputs[order.id] !== order.trackingNumber) && (
                              <button
                                onClick={() => saveTrackingNumber(order.id)}
                                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors"
                              >
                                Save
                              </button>
                            )}
                          </div>
                          {order.trackingNumber && !trackingInputs[order.id] && (
                            <p className="mt-2 text-[10px] text-green-600 font-bold">Current: {order.trackingNumber}</p>
                          )}
                        </div>

                        {order.coords && (
                          <button 
                            onClick={() => {
                              setMapCenter(order.coords!);
                              setViewMode('map');
                            }}
                            className="mt-2 text-xs font-bold text-gray-900 flex items-center gap-1 hover:underline"
                          >
                            <MapIcon className="w-3 h-3" />
                            View on Map
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 flex flex-wrap gap-3">
                    {order.status === 'processing' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                        className="flex-grow md:flex-grow-0 bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Truck className="w-5 h-5" />
                        Mark as Shipped
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        className="flex-grow md:flex-grow-0 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Mark as Delivered
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <div className="text-yellow-600 font-bold flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-100">
                        <Clock className="w-5 h-5" />
                        Waiting for Admin to Process
                      </div>
                    )}
                    {order.status === 'delivered' && (
                      <div className="text-green-600 font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                        <CheckCircle className="w-5 h-5" />
                        Order Delivered
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {orders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl font-medium">No orders found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

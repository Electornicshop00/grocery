import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import CourierPanel from './pages/CourierPanel';
import Auth from './pages/Auth';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import FooterBar from './components/FooterBar';

import { SocketProvider } from './context/SocketContext';

function ProtectedRoute({ children, adminOnly = false, courierOnly = false }: { children: React.ReactNode, adminOnly?: boolean, courierOnly?: boolean }) {
  const { user, isAdmin, isCourier, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/shop" replace />;
  if (courierOnly && !isCourier && !isAdmin) return <Navigate to="/shop" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <ToastProvider>
          <ProductProvider>
            <CartProvider>
              <OrderProvider>
                <Router>
                  <LanguageProvider>
                    <AppContent />
                  </LanguageProvider>
                </Router>
              </OrderProvider>
            </CartProvider>
          </ProductProvider>
          </ToastProvider>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isCourier } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';
  const hideNavAndFooter = isLandingPage || isAuthPage;

  return (
    <div 
      className={`min-h-screen flex flex-col transition-colors duration-300 ${!hideNavAndFooter ? 'pb-16' : ''}`}
      style={{ backgroundColor: 'rgb(255, 255, 255)' }}
    >
      {!hideNavAndFooter && <Navbar />}
      <main className={`flex-grow ${!isLandingPage ? 'container mx-auto px-4 py-8' : ''}`}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/shop" element={isCourier ? <Navigate to="/courier" replace /> : <Home />} />
          <Route path="/cart" element={isCourier ? <Navigate to="/courier" replace /> : <Cart />} />
          <Route path="/checkout" element={isCourier ? <Navigate to="/courier" replace /> : <ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={isCourier ? <Navigate to="/courier" replace /> : <ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route 
            path="/orders" 
            element={
              isCourier ? <Navigate to="/courier" replace /> : (
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              )
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/courier" 
            element={
              <ProtectedRoute courierOnly>
                <CourierPanel />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      {!hideNavAndFooter && (
        <>
          <footer 
            className="border-t py-8 text-center text-white transition-colors duration-300"
            style={{ backgroundColor: 'rgb(39, 96, 27)' }}
          >
            <p>&copy; 2026 FreshCart Grocery. All rights reserved.</p>
          </footer>
          <FooterBar />
        </>
      )}
    </div>
  );
}


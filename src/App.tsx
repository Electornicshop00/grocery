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
import Auth from './pages/Auth';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import FooterBar from './components/FooterBar';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div 
      className={`min-h-screen flex flex-col transition-colors duration-300 ${!isLandingPage ? 'pb-16' : ''}`}
      style={{ backgroundColor: 'rgb(255, 255, 255)' }}
    >
      {!isLandingPage && <Navbar />}
      <main className={`flex-grow ${!isLandingPage ? 'container mx-auto px-4 py-8' : ''}`}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/shop" element={<Home />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
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
        </Routes>
      </main>
      {!isLandingPage && (
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


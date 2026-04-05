import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const { cart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    showToast('Logged out successfully', 'info');
    navigate('/auth');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-green-600">
          <Store className="w-8 h-8" />
          <span>FreshCart</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-green-600 font-medium">Shop</Link>
          
          <button 
            onClick={() => {
              if (!user || !user.emailVerified) {
                showToast('Please login to access your cart', 'info');
                navigate('/auth', { state: { from: '/cart' } });
              } else {
                navigate('/cart');
              }
            }}
            className="relative text-gray-600 hover:text-green-600"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/orders" className="text-gray-600 hover:text-green-600 flex items-center gap-1">
                <ClipboardList className="w-5 h-5" />
                <span className="hidden md:inline">My Orders</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-gray-600 hover:text-green-600 flex items-center gap-1">
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}
              <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden md:inline font-medium">{profile?.displayName || user.email}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 p-1"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

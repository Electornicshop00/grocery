import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ClipboardList, Globe, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const { cart } = useCart();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    showToast(t('logout'), 'info');
    navigate('/auth');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="https://picsum.photos/seed/user-logo/100/100" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-green-600 shadow-sm"
            referrerPolicy="no-referrer"
          />
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 border-r pr-4 md:pr-6">
            <button 
              onClick={() => setLanguage('en')}
              className={`text-xs md:text-sm font-bold transition-colors ${language === 'en' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`text-xs md:text-sm font-bold transition-colors ${language === 'bn' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              BN
            </button>
          </div>

          <Link to="/" className="text-gray-600 hover:text-green-600 font-medium">{t('shop')}</Link>
          <Link to="/upi-payment" className="text-gray-600 hover:text-green-600 font-medium flex items-center gap-1">
            <CreditCard className="w-5 h-5" />
            <span className="hidden md:inline">UPI Pay</span>
          </Link>
          
          <button 
            onClick={() => {
              if (!user || !user.emailVerified) {
                showToast(t('loginToCart'), 'info');
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
                <span className="hidden md:inline">{t('myOrders')}</span>
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-gray-600 hover:text-green-600 flex items-center gap-1">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline">{t('admin')}</span>
                  </Link>
                  <Link to="/admin/upi" className="text-gray-600 hover:text-green-600 flex items-center gap-1">
                    <CreditCard className="w-5 h-5" />
                    <span className="hidden md:inline">UPI Admin</span>
                  </Link>
                </>
              )}
              <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden md:inline font-medium">{profile?.displayName || user.email}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 p-1"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {t('loginRegister')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

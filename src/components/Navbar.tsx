import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ShoppingBag, Globe, CreditCard } from 'lucide-react';
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
    <nav className="border-b sticky top-0 z-50 shadow-sm" style={{ backgroundColor: 'rgb(39, 96, 27)' }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="https://picsum.photos/seed/user-logo/100/100" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            referrerPolicy="no-referrer"
          />
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 border-r border-white/20 pr-4 md:pr-6">
            <button 
              onClick={() => setLanguage('en')}
              className={`text-xs md:text-sm font-bold transition-colors ${language === 'en' ? 'text-white' : 'text-white/50 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`text-xs md:text-sm font-bold transition-colors ${language === 'bn' ? 'text-white' : 'text-white/50 hover:text-white'}`}
            >
              BN
            </button>
          </div>

          <Link to="/" className="text-white/90 hover:text-white font-medium">{t('shop')}</Link>
          
          <button 
            onClick={() => {
              if (!user || !user.emailVerified) {
                showToast(t('loginToCart'), 'info');
                navigate('/auth', { state: { from: '/cart' } });
              } else {
                navigate('/cart');
              }
            }}
            className="relative text-white/90 hover:text-white"
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
              {!isAdmin && (
                <Link 
                  to="/orders" 
                  className="text-white hover:bg-white/10 flex items-center gap-2 border border-white rounded-xl px-4 py-2 transition-all group"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-tighter">{t('myOrders')}</span>
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-white/90 hover:text-white flex items-center gap-1">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline">{t('admin')}</span>
                  </Link>
                </>
              )}
              <Link to="/profile" className="flex items-center gap-2 text-white hover:text-white transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden md:inline font-medium">{profile?.displayName || user.email}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-white/80 hover:text-red-400 p-1"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-white text-green-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              {t('loginRegister')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

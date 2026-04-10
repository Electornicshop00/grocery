import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ShoppingBag, Globe, CreditCard, Sun, Moon, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, isAdmin, isCourier, profile } = useAuth();
  const { cart } = useCart();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    showToast(t('logout'), 'info');
    navigate('/');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="border-b sticky top-0 z-40 shadow-sm transition-colors duration-300" style={{ backgroundColor: 'rgb(39, 96, 27)' }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isCourier ? "/courier" : "/shop"} className="flex items-center gap-2">
          <img 
            src="https://picsum.photos/seed/user-logo/100/100" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100&h=100";
            }}
          />
        </Link>

        <div className="flex items-center gap-2 md:gap-6">
          {!isCourier && (
            <>
              <Link to="/cart" className="relative text-white/90 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] md:text-[10px] font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center border-2 border-green-900">
                    {cartCount}
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 py-0.5 md:px-2 md:py-1 rounded ${language === 'en' ? 'bg-white text-green-900' : 'text-white/50 hover:text-white'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('bn')}
                  className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 py-0.5 md:px-2 md:py-1 rounded ${language === 'bn' ? 'bg-white text-green-900' : 'text-white/50 hover:text-white'}`}
                >
                  BN
                </button>
              </div>

              <button 
                onClick={toggleTheme}
                className="text-white/90 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5 md:w-6 md:h-6" /> : <Sun className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              {isAdmin && (
                <Link to="/admin" className="text-white/90 hover:text-white flex items-center gap-1">
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="hidden md:inline font-bold">{t('admin')}</span>
                </Link>
              )}
              {isCourier && (
                <Link to="/courier" className="text-white/90 hover:text-white flex items-center gap-1">
                  <Truck className="w-5 h-5" />
                  <span className="hidden md:inline font-bold">Curries</span>
                </Link>
              )}
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
              className="bg-white text-green-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-gray-100 transition-colors font-bold text-xs md:text-sm"
            >
              {t('loginRegister').split('/')[0]}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

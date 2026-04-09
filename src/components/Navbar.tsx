import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ShoppingBag, Globe, CreditCard, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const { cart } = useCart();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    showToast(t('logout'), 'info');
    navigate('/auth');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="border-b sticky top-0 z-40 shadow-sm transition-colors duration-300" style={{ backgroundColor: 'rgb(39, 96, 27)' }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/shop" className="flex items-center gap-2">
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

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setLanguage('en')}
              className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 md:px-2 py-1 rounded ${language === 'en' ? 'bg-white text-green-900' : 'text-white/50 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 md:px-2 py-1 rounded ${language === 'bn' ? 'bg-white text-green-900' : 'text-white/50 hover:text-white'}`}
            >
              BN
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-white/90 hover:text-white flex items-center gap-1">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline font-bold">{t('admin')}</span>
                  </Link>
                </>
              )}
              <button 
                onClick={handleLogout}
                className="text-white/80 hover:text-red-400 p-1 ml-2"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-white text-green-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-bold"
            >
              {t('loginRegister')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

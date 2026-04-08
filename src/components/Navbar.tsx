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
    <nav className="border-b sticky top-0 z-40 shadow-sm bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="https://picsum.photos/seed/user-logo/100/100" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-green-600 shadow-sm"
            referrerPolicy="no-referrer"
          />
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setLanguage('en')}
              className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 md:px-2 py-1 rounded ${language === 'en' ? 'bg-green-600 text-white' : 'text-gray-400 dark:text-gray-500 hover:text-green-600'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`text-[10px] md:text-sm font-bold transition-colors px-1.5 md:px-2 py-1 rounded ${language === 'bn' ? 'bg-green-600 text-white' : 'text-gray-400 dark:text-gray-500 hover:text-green-600'}`}
            >
              BN
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="text-gray-500 dark:text-gray-400 hover:text-green-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <>
                  <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-green-600 flex items-center gap-1">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline font-bold">{t('admin')}</span>
                  </Link>
                </>
              )}
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-500 p-1 ml-2"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-bold"
            >
              {t('loginRegister')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

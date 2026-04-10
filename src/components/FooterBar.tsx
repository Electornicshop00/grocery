import { Link } from 'react-router-dom';
import { ShoppingBag, Home, ShoppingCart, User, LayoutDashboard, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function FooterBar() {
  const { user, isAdmin, isCourier } = useAuth();
  const { cart } = useCart();
  const { t } = useLanguage();
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div 
        className="flex items-center justify-around h-16 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.1)] px-4 transition-colors duration-300"
        style={{ backgroundColor: 'rgb(39, 96, 27)' }}
      >
        <div className="container mx-auto flex items-center justify-around max-w-4xl">
          {!isCourier ? (
            <>
              <Link to="/shop" className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{t('shop')}</span>
              </Link>

              <Link to="/cart" className="relative flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                    {cartCount}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-tighter">{t('cart')}</span>
              </Link>

              {!isAdmin && (
                <Link 
                  to="/orders" 
                  className="flex flex-col items-center gap-1 transition-transform hover:scale-110 text-white"
                >
                  <div 
                    className="p-2 rounded-xl border border-white/20 bg-white/10"
                  >
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">{t('myOrders')}</span>
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin" className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
                  <LayoutDashboard className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{t('admin')}</span>
                </Link>
              )}

              <Link to="/profile" className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
                <User className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{t('profile')}</span>
              </Link>
            </>
          ) : (
            <Link to="/courier" className="flex flex-col items-center gap-1 text-white transition-transform hover:scale-110">
              <div className="p-2 rounded-xl border border-white/20 bg-white/10">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">Curries</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

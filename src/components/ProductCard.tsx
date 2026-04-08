import { ShoppingCart, Plus, Minus, CreditCard } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart, updateQuantity } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItem = cart.find(item => item.id === product.id);

  const handleAddToCart = () => {
    if (!user || !user.emailVerified) {
      showToast(t('loginToCart'), 'info');
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    addToCart(product);
    showToast(`${product.name} ${t('addToCart')}`, 'success');
  };

  const handleBuyNow = () => {
    if (!user || !user.emailVerified) {
      if (!cartItem) {
        addToCart(product);
      }
      showToast(t('loginToCart'), 'info');
      navigate('/auth', { state: { from: '/cart', startStep: 'details' } });
      return;
    }
    if (!cartItem) {
      addToCart(product);
    }
    navigate('/cart', { state: { startStep: 'details' } });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/400/400`} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold uppercase">{t('outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="p-3 md:p-4">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] md:text-xs font-semibold text-green-600 uppercase tracking-wider">{product.category}</span>
          <span className="text-[10px] md:text-xs text-gray-500">Stock: {product.stock}</span>
        </div>
        <h3 className="font-bold text-gray-800 text-sm md:text-lg mb-1 md:mb-2 truncate">{product.name}</h3>
        <p className="text-gray-500 text-[10px] md:text-sm mb-3 md:mb-4 line-clamp-2 h-8 md:h-10">{product.description}</p>
        
        <div className="flex flex-col gap-2 mt-auto">
          <div className="flex items-center justify-between gap-1">
            <span className="text-base md:text-xl font-bold text-green-700">₹{product.price.toFixed(2)}</span>
            
            {cartItem ? (
              <div className="flex items-center gap-1 bg-green-50 rounded-lg p-0.5 md:p-1 border border-green-200">
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="p-0.5 md:p-1 hover:bg-green-100 rounded text-green-700"
                >
                  <Minus className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <span className="w-4 md:w-6 text-center text-xs md:text-base font-bold text-green-800">{cartItem.quantity}</span>
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="p-0.5 md:p-1 hover:bg-green-100 rounded text-green-700"
                  disabled={cartItem.quantity >= product.stock}
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={cn(
                  "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold transition-colors text-xs md:text-base",
                  product.stock > 0 
                    ? "bg-green-600 text-white hover:bg-green-700" 
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t('addToCart').split(' ')[0]}</span>
                <span className="sm:hidden">+</span>
              </button>
            )}
          </div>

          <button 
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            className={cn(
              "w-full flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2 rounded-lg font-bold transition-all text-xs md:text-base",
              product.stock > 0 
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
            {t('checkout')}
          </button>
        </div>
      </div>
    </div>
  );
}

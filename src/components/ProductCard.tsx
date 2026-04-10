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
    addToCart(product);
    showToast(`${product.name} ${t('addToCart')}`, 'success');
  };

  const handleCheckout = () => {
    if (!cartItem) {
      addToCart(product);
    }
    navigate('/cart');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/400/400`} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== `https://picsum.photos/seed/${product.id}/400/400`) {
              target.src = `https://picsum.photos/seed/${product.id}/400/400`;
            } else {
              target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=400';
            }
          }}
        />
        
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold uppercase">{t('outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="p-3 md:p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">{product.category}</span>
          <span className="text-[10px] md:text-xs text-gray-500">Stock: {product.stock}</span>
        </div>
        <h3 className="font-bold text-gray-800 text-sm md:text-lg mb-3 truncate">{product.name}</h3>
        
        {/* Price and Cart Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Rate</span>
            <span className="text-sm md:text-xl font-bold text-gray-900 leading-none">₹{product.price.toFixed(2)}</span>
          </div>

          <div className="flex items-center">
            {cartItem ? (
              <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-full px-2 py-1 border border-gray-200">
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  style={{ color: 'rgb(39, 96, 27)' }}
                >
                  <Minus className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <span className="text-[10px] md:text-xs font-bold text-gray-900 min-w-[12px] text-center">{cartItem.quantity}</span>
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  style={{ color: 'rgb(39, 96, 27)' }}
                  disabled={cartItem.quantity >= product.stock}
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={product.stock > 0 ? { backgroundColor: 'rgb(39, 96, 27)', color: 'white' } : { backgroundColor: '#e5e7eb', color: '#9ca3af' }}
              >
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Buy Button Row */}
        <button 
          onClick={handleCheckout}
          disabled={product.stock <= 0}
          className="w-full bg-gray-900 text-white py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm mb-3 flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {t('buyNow') || 'Buy Now'}
        </button>

        {/* Description Box (Bottom) */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 mt-auto">
          <p className="text-gray-500 text-[10px] md:text-xs line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  );
}

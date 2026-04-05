import { ShoppingCart, Plus, Minus, CreditCard } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart, updateQuantity } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItem = cart.find(item => item.id === product.id);

  const handleAddToCart = () => {
    if (!user || !user.emailVerified) {
      showToast('Please login to add items to cart', 'info');
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    addToCart(product);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleBuyNow = () => {
    if (!user || !user.emailVerified) {
      if (!cartItem) {
        addToCart(product);
      }
      showToast('Please login to checkout', 'info');
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
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold uppercase">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">{product.category}</span>
          <span className="text-xs text-gray-500">Stock: {product.stock}</span>
        </div>
        <h3 className="font-bold text-gray-800 text-lg mb-2 truncate">{product.name}</h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 h-10">{product.description}</p>
        
        <div className="flex flex-col gap-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-green-700">₹{product.price.toFixed(2)}</span>
            
            {cartItem ? (
              <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1 border border-green-200">
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="p-1 hover:bg-green-100 rounded text-green-700"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-green-800">{cartItem.quantity}</span>
                <button 
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="p-1 hover:bg-green-100 rounded text-green-700"
                  disabled={cartItem.quantity >= product.stock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors",
                  product.stock > 0 
                    ? "bg-green-600 text-white hover:bg-green-700" 
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="w-4 h-4" />
                Add
              </button>
            )}
          </div>

          <button 
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all",
              product.stock > 0 
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <CreditCard className="w-4 h-4" />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

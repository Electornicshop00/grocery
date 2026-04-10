import { useState, useRef } from 'react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { products, loading } = useProducts();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const productsRef = useRef<HTMLDivElement>(null);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div 
        className="relative rounded-2xl md:rounded-3xl overflow-hidden text-white p-6 md:p-16 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8"
        style={{ backgroundColor: 'rgb(39, 96, 27)' }}
      >
        <div className="space-y-3 md:space-y-6 max-w-xl text-center md:text-left">
          <h1 className="text-2xl md:text-6xl font-extrabold leading-tight">
            {t('shop')} <br className="hidden md:block" /> {t('thankYou').split('.')[0]}
          </h1>
          <p className="text-sm md:text-lg text-gray-300">
            {t('thankYou')}
          </p>
          <button 
            onClick={scrollToProducts}
            className="bg-white text-gray-900 px-5 md:px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-lg hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto md:mx-0"
          >
            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
            {t('startShopping')}
          </button>
        </div>
        <div className="hidden md:block w-1/3">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600&h=600" 
            alt="Hero" 
            className="rounded-2xl shadow-2xl rotate-3"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://picsum.photos/seed/grocery-hero/600/600";
            }}
          />
        </div>
      </div>

      {/* Filters & Search - Sticky */}
      <div ref={productsRef} className="sticky top-16 z-40 flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between bg-white p-3 md:p-4 rounded-xl shadow-md border transition-all duration-300">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-1.5 md:py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none bg-white text-gray-800 text-sm md:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <Filter className="text-gray-400 w-4 h-4 md:w-5 md:h-5 shrink-0" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category 
                  ? 'text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedCategory === category ? { backgroundColor: 'rgb(39, 96, 27)' } : {}}
            >
              {category === 'All' ? t('all') : category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import { Search, Filter, ShoppingBag } from 'lucide-react';

export default function Home() {
  const { products, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(products.map(p => p.category))];
// ... rest of the file

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-green-600 text-white p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-6 max-w-xl">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Fresh Groceries <br /> Delivered to Your Door
          </h1>
          <p className="text-lg text-green-100">
            Shop from a wide range of fresh fruits, vegetables, dairy, and more. 
            Quality guaranteed with every order.
          </p>
          <button className="bg-white text-green-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-green-50 transition-colors flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shop Now
          </button>
        </div>
        <div className="hidden md:block w-1/3">
          <img 
            src="https://picsum.photos/seed/grocery-hero/600/600" 
            alt="Hero" 
            className="rounded-2xl shadow-2xl rotate-3"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search for items..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Filter className="text-gray-400 w-5 h-5 shrink-0" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

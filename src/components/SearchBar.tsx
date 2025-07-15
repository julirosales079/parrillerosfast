import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Buscar productos..." }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-6">
      <div className="relative group">
        {/* Gradient border effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8C00] via-orange-400 to-[#FF8C00] rounded-3xl blur opacity-25 group-focus-within:opacity-75 transition duration-1000 group-focus-within:duration-200"></div>
        
        {/* Main search container */}
        <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100">
          {/* Search icon */}
          <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#FF8C00] transition-colors duration-300">
            <Search size={24} />
          </div>
          
          {/* Input field */}
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-16 pr-16 py-5 bg-transparent border-none rounded-3xl focus:ring-0 focus:outline-none text-gray-800 placeholder-gray-400 font-medium text-lg"
          />
          
          {/* Clear button */}
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all duration-300 hover:scale-110"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Animated search suggestions */}
        {!query && (
          <div className="absolute top-full left-0 right-0 mt-3 text-center opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
            <div className="inline-flex items-center space-x-4 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-gray-100">
              <span className="text-sm text-gray-500">💡 Prueba:</span>
              <div className="flex space-x-3">
                <span className="bg-[#FF8C00]/10 text-[#FF8C00] px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-[#FF8C00]/20 transition-colors" onClick={() => handleSearch('hamburguesa')}>
                  🍔 hamburguesa
                </span>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSearch('bebidas')}>
                  🥤 bebidas
                </span>
                <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-green-100 transition-colors" onClick={() => handleSearch('papas')}>
                  🍟 papas
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
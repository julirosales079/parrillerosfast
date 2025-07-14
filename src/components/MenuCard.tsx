import React from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '../types';
import { useOrder } from '../context/OrderContext';
import { useNavigate } from 'react-router-dom';

interface MenuCardProps {
  item: MenuItem;
}

const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  const { name, price, image, category } = item;
  const { addToCart } = useOrder();
  const navigate = useNavigate();

  const handleClick = () => {
    if (category === 'sides' || category === 'drinks') {
      addToCart(item, 1, [], false, '');
    } else {
      // Navigate to customization page with item data
      navigate('/customize', { 
        state: { 
          menuItem: item, 
          options: [] // You can pass customization options here
        } 
      });
    }
  };

  const isBurger = category.includes('burgers');
  const isAddition = name.startsWith('AD ');

  return (
    <div 
      className={`group relative bg-white rounded-3xl shadow-lg overflow-hidden transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${
        isAddition ? 'border-2 border-[#FF8C00]/30' : 'border border-gray-100'
      }`}
      onClick={handleClick}
    >
      {/* Image Container with Gradient Overlay */}
      <div className="relative h-64 overflow-hidden">
        {/* Background gradient for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
        
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        
        {/* Price Badge - Floating */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-[#FF8C00] text-white px-4 py-2 rounded-full font-bold text-lg shadow-xl backdrop-blur-sm">
            ${price.toLocaleString()}
          </div>
          {item.priceWithFries && (
            <div className="mt-2 bg-white/90 text-[#FF8C00] px-3 py-1 rounded-full text-sm font-semibold shadow-lg text-center backdrop-blur-sm">
              Con papas: ${item.priceWithFries.toLocaleString()}
            </div>
          )}
        </div>

        {/* Category Badge for Burgers */}
        {isBurger && (
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-full font-medium backdrop-blur-sm">
              {category === 'classic-burgers' ? '🍔 Clásica' : 
               category === 'deluxe-burgers' ? '👑 Deluxe' : 
               '🏆 Burger Master'}
            </div>
          </div>
        )}

        {/* Product Name Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
          <h3 className="text-2xl font-bold text-white group-hover:text-[#FF8C00] transition-colors duration-300 leading-tight drop-shadow-lg">
            {name}
          </h3>
        </div>
      </div>

      {/* Action Button - Minimalist */}
      <div className="p-4">
        <button className={`flex items-center justify-center w-full py-4 px-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-[1.02] ${
          isAddition 
            ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-[#FF8C00] hover:from-[#FF8C00] hover:to-orange-600 hover:text-white shadow-md hover:shadow-lg'
            : 'bg-gradient-to-r from-[#FF8C00] to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl'
        }`}>
          <Plus size={20} className="mr-2" />
          <span>{isAddition ? 'Agregar' : 'Personalizar'}</span>
        </button>
      </div>

      {/* Hover Effect - Subtle Glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-[#FF8C00]/0 to-[#FF8C00]/0 group-hover:from-[#FF8C00]/5 group-hover:to-[#FF8C00]/10 transition-all duration-500 pointer-events-none"></div>
    </div>
  );
};

export default MenuCard;
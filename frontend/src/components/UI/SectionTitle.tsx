import React from 'react';
import { Search } from 'lucide-react';

export const SectionTitle = ({
  title,
  subtitle,
  onSearch,
  searchPlaceholder = "Search Rivals..."
}:any) => {
  return <div className="flex justify-between mb-6">
<div className='flex flex-col'>
<h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}

</div>
      
        <div className="relative">
          <Search size={18} className="absolute left-3 top-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-sm min-w-[400px]"
          />
        </div>
      
    </div>;
};
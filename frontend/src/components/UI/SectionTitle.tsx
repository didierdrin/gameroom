import React from 'react';
import { Search } from 'lucide-react';

export const SectionTitle = ({
  title,
  subtitle,

}:any) => {
  return <div className="mb-6">

<h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}

    </div>;
};
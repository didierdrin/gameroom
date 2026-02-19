import { useTheme } from '../../context/ThemeContext';

export const SectionTitle = ({
  title,
  subtitle,

}:any) => {
  const { theme } = useTheme();
  
  return <div className="mb-6">
    <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{title}</h2>
    {subtitle && <p className={`mt-1 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>{subtitle}</p>}
  </div>;
};
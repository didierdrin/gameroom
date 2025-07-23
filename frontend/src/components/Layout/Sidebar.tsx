import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, DicesIcon, PlusCircleIcon, TrophyIcon, BarChart3Icon, UserIcon } from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: <HomeIcon size={24} />
    },
    {
      path: '/my-game-rooms',
      label: 'My Game Rooms',
      icon: <DicesIcon size={24} />
    },
    {
      path: '/create-game-room',
      label: 'Create Game Room',
      icon: <PlusCircleIcon size={24} />
    },
    {
      path: '/tournaments',
      label: 'Tournaments',
      icon: <TrophyIcon size={24} />
    },
    {
      path: '/leaderboard',
      label: 'Leaderboards',
      icon: <BarChart3Icon size={24} />
    },
    {
      path: '/profile',
      label: 'Game Profile',
      icon: <UserIcon size={24} />
    }
  ];

  return (
    <div className="h-full w-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
          ALU Globe
        </h1>
        <p className="text-center text-sm text-gray-400 mt-1">Game Room</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  w-full flex items-center p-3 rounded-lg transition-all duration-200 text-white
                  ${isActive 
                    ? 'bg-purple-900/40 text-purple-400 border-l-4 border-purple-400' 
                    : 'hover:bg-gray-700 hover:text-gray-200'
                  }
                `}
              >
                <span className={location.pathname === item.path ? 'text-purple-400' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="ml-3 font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

// // import React from 'react';
// import { NavLink, useLocation } from 'react-router-dom';
// import { HomeIcon, DicesIcon, PlusCircleIcon, TrophyIcon, BarChart3Icon, UserIcon } from 'lucide-react';

// export const Sidebar = () => {
//   const location = useLocation();
  
//   const navItems = [
//     {
//       path: '/',
//       label: 'Home',
//       icon: <HomeIcon size={24} />
//     },
//     {
//       path: '/my-game-rooms',
//       label: 'My Game Rooms',
//       icon: <DicesIcon size={24} />
//     },
//     {
//       path: '/create-game-room',
//       label: 'Create Game Room',
//       icon: <PlusCircleIcon size={24} />
//     },
//     {
//       path: '/tournaments',
//       label: 'Tournaments',
//       icon: <TrophyIcon size={24} />
//     },
//     {
//       path: '/leaderboard',
//       label: 'Leaderboards',
//       icon: <BarChart3Icon size={24} />
//     },
//     {
//       path: '/profile',
//       label: 'Game Profile',
//       icon: <UserIcon size={24} />
//     }
//   ];

//   return (
//     <div className="w-64 h-screen p-4 flex flex-col bg-gray-800">
//       <div className="mb-8 mt-4">
//         <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
//           ALU Globe
//         </h1>
//         <p className="text-center text-sm text-gray-400">Game Room</p>
//       </div>
//       <nav className="flex-1">
//         <ul className="space-y-2">
//           {navItems.map(item => (
//             <li key={item.path}>
//               <NavLink
//                 to={item.path}
//                 className={({ isActive }) => `
//                   w-full flex items-center p-3 rounded-lg transition-all duration-200
//                   ${isActive ? 'bg-purple-900/40 text-purple-400' : 'hover:bg-gray-700'}
//                 `}
//               >
//                 <span className={location.pathname === item.path ? 'text-purple-500' : ''}>
//                   {item.icon}
//                 </span>
//                 <span className="ml-3 font-medium">{item.label}</span>
//               </NavLink>
//             </li>
//           ))}
//         </ul>
//       </nav>
//     </div>
//   );
// };
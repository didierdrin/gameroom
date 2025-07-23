import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Mobile menu button */}
      {!isGameRoom && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      )}
      
      {/* Sidebar */}
      {!isGameRoom && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <Sidebar />
          </div>
          
          {/* Mobile sidebar */}
          <div
            className={`
              lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            <Sidebar />
          </div>
          
          {/* Mobile sidebar overlay */}
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}

      {/* Main content */}
      <div className={`flex-1 min-w-0 ${!isGameRoom ? 'lg:ml-0' : ''}`}>
        <main className="h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// import React, { useState } from 'react';
// import { Outlet, useLocation } from 'react-router-dom';
// import { MenuIcon, XIcon } from 'lucide-react';
// import { Sidebar } from './Sidebar';

// export function MainLayout() {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const location = useLocation();
//   const isGameRoom = location.pathname.startsWith('/game-room/');

//   return (
//     <>
//       {!isGameRoom && (
//         <button
//           onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//           className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg"
//         >
//           {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
//         </button>
//       )}
//       {!isGameRoom && (
//         <div
//           className={`
//             fixed inset-y-0 left-0 z-40 transform lg:transform-none lg:opacity-100
//             transition duration-200 ease-in-out
//             ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'}
//           `}
//         >
//           <Sidebar />
//         </div>
//       )}
//       <div className={`flex-1 ${!isGameRoom ? 'lg:ml-64' : ''}`}>
//         <Outlet />
//       </div>
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
//           onClick={() => setIsSidebarOpen(false)}
//         />
//       )}
//     </>
//   );
// } 
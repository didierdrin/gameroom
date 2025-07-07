import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useAuth } from '../context/AuthContext';

export const UsernameLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, login } = useAuth();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    try {
      const response = await axios.post('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
        username,
      });

      login({ id: response.data._id, username: response.data.username });

      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to login. Try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <>
      <Helmet>
        <title>Alu Globe Gameroom - Login</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white mx-auto">
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-96">
          <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Please enter your username to access the platform
          </p>
          <input
            className="w-full p-2 rounded-md text-black mb-4"
            placeholder="e.g. J.owen0"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded-md transition-colors"
            onClick={handleLogin}
            disabled={!username.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};


// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../hooks/useAuth';
// import { Helmet } from 'react-helmet';

// export const UsernameLoginPage: React.FC = () => {
//   const [username, setUsername] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
//   const { user } = useAuth();

//   if (user) {
//     navigate('/', { replace: true });
//     return null;
//   }

//   const handleLogin = async () => {
//     if (!username.trim()) {
//       setError('Username is required');
//       return;
//     }

//     try {
//       const response = await axios.post('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
//         username,
//       });

//       localStorage.setItem('userId', response.data._id);
//       localStorage.setItem('username', response.data.username);

//       navigate('/', { replace: true });
//     } catch (err) {
//       console.error(err);
//       setError('Failed to login. Try again.');
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       handleLogin();
//     }
//   };

//   return (
//     <>
//       <Helmet>
//         <title>Alu Globe Gameroom - Login</title>
//       </Helmet>
//       <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white mx-auto">
//         <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-96">
//           <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
//           <p className="text-gray-400 mb-4 text-sm">
//             Please enter your username to access the platform
//           </p>
//           <input
//             className="w-full p-2 rounded-md text-black mb-4"
//             placeholder="e.g. J.owen0"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             onKeyPress={handleKeyPress}
//             autoFocus
//           />
//           {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
//           <button
//             className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded-md transition-colors"
//             onClick={handleLogin}
//             disabled={!username.trim()}
//           >
//             Continue
//           </button>
//         </div>
//       </div>
//     </>
//   );
// };


// // src/pages/UsernameLoginPage.tsx (Updated)
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// export const UsernameLoginPage: React.FC = () => {
//   const [username, setUsername] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     // If user is already logged in, redirect to home
//     const existingUsername = localStorage.getItem('username');
//     const existingUserId = localStorage.getItem('userId');
    
//     if (existingUsername && existingUserId) {
//       navigate('/', { replace: true });
//     }
//   }, [navigate]);

//   const handleLogin = async () => {
//     if (!username.trim()) {
//       setError('Username is required');
//       return;
//     }

//     try {
//       const response = await axios.post('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
//         username,
//       });

//       localStorage.setItem('userId', response.data._id);
//       localStorage.setItem('username', response.data.username);

//       // Use replace: true to prevent going back to login page
//       navigate('/', { replace: true });
//     } catch (err) {
//       console.error(err);
//       setError('Failed to login. Try again.');
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       handleLogin();
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white mx-auto">
//       <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-96">
//         <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
//         <p className="text-gray-400 mb-4 text-sm">
//           Please enter your username to access the platform
//         </p>
//         <input
//           className="w-full p-2 rounded-md text-black mb-4"
//           placeholder="e.g. J.owen0"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           onKeyPress={handleKeyPress}
//           autoFocus
//         />
//         {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
//         <button
//           className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded-md transition-colors"
//           onClick={handleLogin}
//           disabled={!username.trim()}
//         >
//           Continue
//         </button>
//       </div>
//     </div>
//   );
// };

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// export const UsernameLoginPage: React.FC = () => {
//   const [username, setUsername] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   const handleLogin = async () => {
//     if (!username.trim()) {
//       setError('Username is required');
//       return;
//     }

//     try {
//       const response = await axios.post('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
//         username,
//       });

//       localStorage.setItem('userId', response.data._id);
//       localStorage.setItem('username', response.data.username);

//       navigate('/');
//     } catch (err) {
//       console.error(err);
//       setError('Failed to login. Try again.');
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
//       <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-96">
//         <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
//         <input
//           className="w-full p-2 rounded-md text-black mb-4"
//           placeholder="e.g. JohnDoe123"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//         />
//         {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
//         <button
//           className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded-md"
//           onClick={handleLogin}
//         >
//           Enter Platform
//         </button>
//       </div>
//     </div>
//   );
// };

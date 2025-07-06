import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const UsernameLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    try {
      const response = await axios.post('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
        username,
      });

      localStorage.setItem('userId', response.data._id);
      localStorage.setItem('username', response.data.username);

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to login. Try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-4">Enter Your Username</h2>
        <input
          className="w-full p-2 rounded-md text-black mb-4"
          placeholder="e.g. JohnDoe123"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded-md"
          onClick={handleLogin}
        >
          Enter Platform
        </button>
      </div>
    </div>
  );
};

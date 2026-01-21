import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useAuth } from '../context/AuthContext';

// Add this import to get the AuthUser type
interface AuthUser {
  id?: string | number; // Add id field
  username: string;
  email: string;
  avatar?: string;
}

export const UsernameLoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    usernameOrEmail: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, login } = useAuth();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user types
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignup = async () => {
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://alu-globe-gameroom.onrender.com/auth/signup', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const { user: userData, token } = response.data as { user: AuthUser; token: string };
      login(userData, token);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Failed to create account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.usernameOrEmail.trim() || !formData.password.trim()) {
      setError('Username/Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://alu-globe-gameroom.onrender.com/auth/login', {
        usernameOrEmail: formData.usernameOrEmail,
        password: formData.password,
      });

      const { user: userData, token } = response.data as { user: AuthUser; token: string };
      login(userData, token);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid credentials. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      activeTab === 'login' ? handleLogin() : handleSignup();
    }
  };

  return (
    <>
      <Helmet>
        <title>Arena Gameroom - Authentication</title>
      </Helmet>
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-1100 via-blue-900 to-indigo-1100">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-green-400 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex max-w-6xl w-full mx-4">
          

              {/* Left side - Auth form */}
              <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-300">Connect, Find, Play – Start Your Arena Game Room Journey Now!</p>
              </div>

              {/* Tab switcher */}
              <div className="flex mb-6 bg-white/10 rounded-lg p-1">
                <button
                  className={`flex-1 py-2 px-4 rounded-md transition-all ${
                    activeTab === 'login'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('login')}
                >
                  Log In
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-md transition-all ${
                    activeTab === 'signup'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('signup')}
                >
                  Sign Up
                </button>
              </div>

              {/* Login Form */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="usernameOrEmail"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Username or Email"
                    value={formData.usernameOrEmail}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    autoFocus
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className="w-full p-3 pr-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05m1.828 1.828l-.94-.94M9.878 9.878l4.242 4.242m0 0L16.15 16.15M14.12 14.12l1.828 1.828" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Signup Form */}
              {activeTab === 'signup' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="username"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Username (e.g. J.owen0)"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    autoFocus
                  />
                  <input
                    type="email"
                    name="email"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className="w-full p-3 pr-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Password (min 6 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05m1.828 1.828l-.94-.94M9.878 9.878l4.242 4.242m0 0L16.15 16.15M14.12 14.12l1.828 1.828" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm mt-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </p>
              )}

              <button
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg mt-6 transition-colors font-medium"
                onClick={activeTab === 'login' ? handleLogin : handleSignup}
                disabled={loading}
              >
                {loading ? 'Please wait...' : activeTab === 'login' ? 'Continue' : 'Create Account'}
              </button>

              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">
                  {activeTab === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                  >
                    {activeTab === 'login' ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
          
          
          {/* Right side - Welcome message */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12">
            <div className="text-white">
              <h1 className="text-4xl font-bold mb-6">Arena Game Room</h1>
              <p className="text-xl text-gray-300 mb-8">
                Your Digital campus awaits! Explore the community in an immersive digital environment.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Global Connection</h3>
                    <p className="text-gray-300">Connect with gamers across Africa</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Immersive Experience</h3>
                    <p className="text-gray-300">Link up. Level up. Lead!</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Find Your People.</h3>
                    <p className="text-gray-300">More than Friends - future co-founders!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

      
        </div>
      </div>
    </>
  );
};


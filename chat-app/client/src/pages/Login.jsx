import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Terminal, User, Lock, Image as ImageIcon } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { login, register } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        const data = new FormData();
        data.append('username', formData.username);
        data.append('password', formData.password);
        if (avatar) data.append('avatar', avatar);

        const res = await register(data);
        setMessage(`Registered successfully! Your Friend Code: ${res.friendCode}`);
        setTimeout(() => setIsLogin(true), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-8 rounded-2xl w-[90%] max-w-md z-10 relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-cyber-bg border-2 border-cyber-accent flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,240,255,0.5)]"
          >
            <Terminal size={32} className="text-cyber-accent" />
          </motion.div>
          <h1 className="text-3xl font-bold neon-text tracking-wider">NEXUS CHAT</h1>
          <p className="text-cyber-muted mt-2 text-sm uppercase tracking-widest">
            {isLogin ? 'Initiate connection' : 'Establish identity'}
          </p>
        </div>

        {error && <div className="bg-cyber-secondary/20 border border-cyber-secondary text-cyber-secondary p-3 rounded mb-4 text-sm text-center">{error}</div>}
        {message && <div className="bg-cyber-accent/20 border border-cyber-accent text-cyber-accent p-3 rounded mb-4 text-sm text-center font-bold">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
            <input 
              type="text" 
              placeholder="Username" 
              className="glass-input w-full py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyber-accent"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="relative">
            <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
            <input 
              type="password" 
              placeholder="Password" 
              className="glass-input w-full py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyber-accent"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-4 mt-2">
                  <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-cyber-muted flex items-center justify-center overflow-hidden bg-black/30">
                    {preview ? (
                      <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-cyber-muted" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-cyber-muted mb-1">Upload Avatar</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-xs text-cyber-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyber-accent/10 file:text-cyber-accent hover:file:bg-cyber-accent/20 cursor-pointer w-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            className="glass-button w-full py-3 rounded-lg font-bold tracking-wide mt-4 relative overflow-hidden group"
          >
            <span className="relative z-10">{isLogin ? 'CONNECT' : 'REGISTER'}</span>
            <div className="absolute inset-0 bg-cyber-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-cyber-muted text-sm">
            {isLogin ? "Don't have an identity?" : "Already registered?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-cyber-accent hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? 'Create one' : 'Login instead'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

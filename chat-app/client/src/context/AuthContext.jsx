import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = '/api';

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (error) {
          console.error("Auth error", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (username, password) => {
    const res = await axios.post(`${API_URL}/login`, { username, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (formData) => {
    const res = await axios.post(`${API_URL}/register`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, API_URL }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

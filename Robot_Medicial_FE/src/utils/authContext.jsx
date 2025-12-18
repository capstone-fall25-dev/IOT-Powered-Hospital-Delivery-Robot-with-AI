// src/utils/authContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { login, getUserByToken, logout } from "@/services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const rawToken = localStorage.getItem("token");
      if (!rawToken) {
        setLoading(false);
        return;
      }

      const cleanToken = rawToken.replace(/^Bearer\s+/i, "").trim();
      try {
        const userData = await getUserByToken(cleanToken);
        setUser(userData);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const loginUser = async (email, password) => {
    const result = await login(email, password);
    if (!result?.token) throw new Error("Không nhận được token");

    localStorage.setItem("token", result.token); // có Bearer cũng được

    const cleanToken = result.token.replace(/^Bearer\s+/i, "").trim();
    const userData = await getUserByToken(cleanToken);
    setUser(userData);
    return userData;
  };

  const logoutUser = () => {
    logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...userData
    }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: loginUser, logout: logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
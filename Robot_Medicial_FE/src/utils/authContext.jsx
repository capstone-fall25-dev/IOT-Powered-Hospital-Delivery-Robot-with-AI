import React, { createContext, useState, useEffect, useContext } from "react";
import { getUserByToken, login } from "@/services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*==============================
      LẤY USER TỪ TOKEN
  ==============================*/
  useEffect(() => {
    async function loadUser() {
      const token = sessionStorage.getItem("token");
      if (token) {
        try {
          const userData = await getUserByToken(token);
          setUser(userData);
        } catch {
          sessionStorage.removeItem("token");
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  /*==============================
      LOGIN USER
  ==============================*/
  const loginUser = async (email, password) => {
    const result = await login(email, password);

    // 💥 LƯU TOKEN NGUYÊN BẢN (KHÔNG "Bearer ")
    const token = result.token;

    sessionStorage.setItem("token", token);

    const userData = await getUserByToken(token);
    setUser(userData);

    return userData;
  };

  /*==============================
      LOGOUT
  ==============================*/
  const logoutUser = () => {
    sessionStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: loginUser,
        logout: logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

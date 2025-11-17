// src/utils/authContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { getUserBySessionToken, loginUser } from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUser() {
            // ĐỔI TỪ "sessionToken" THÀNH "token"
            const token = sessionStorage.getItem("token");
            if (token) {
                try {
                    const userData = await getUserBySessionToken(token);
                    setUser(userData);
                } catch (err) {
                    console.error("Không lấy được user từ token:", err);
                    sessionStorage.removeItem("token");
                }
            }
            setLoading(false);
        }
        fetchUser();
    }, []);

    const login = async (username, password) => {
        try {
            const { token, user: userData } = await loginUser(username, password);
            sessionStorage.setItem("token", token); // Dùng key "token"
            setUser(userData);
            return userData;
        } catch (err) {
            throw err;
        }
    };

    const logout = () => {
        sessionStorage.removeItem("token"); // Dùng key "token"
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { getUserBySessionToken, loginUser } from "../services/authService"; // import đúng đường dẫn .js

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // user hiện tại
    const [loading, setLoading] = useState(true);

    // Khi app load, nếu có sessionToken thì fetch user
    useEffect(() => {
        async function fetchUser() {
            const token = sessionStorage.getItem("sessionToken"); // lưu token trong sessionStorage
            if (token) {
                try {
                    const userData = await getUserBySessionToken(token);
                    setUser(userData);
                } catch (err) {
                    console.error("Không lấy được user từ sessionToken:", err);
                    sessionStorage.removeItem("sessionToken");
                }
            }
            setLoading(false);
        }
        fetchUser();
    }, []);

    // login
    const login = async (username, password) => {
        try {
            const { token, user: userData } = await loginUser(username, password);
            sessionStorage.setItem("sessionToken", token);
            setUser(userData);
            return userData;
        } catch (err) {
            throw err;
        }
    };

    // logout
    const logout = () => {
        sessionStorage.removeItem("sessionToken");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// hook tiện lợi để dùng context
export const useAuth = () => useContext(AuthContext);

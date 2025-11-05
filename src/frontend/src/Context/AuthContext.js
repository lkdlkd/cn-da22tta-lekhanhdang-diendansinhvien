import React, { createContext, useState, useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../Utils/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const token = localStorage.getItem("token");

  let decoded = {};
  if (token) {
    try {
      decoded = JSON.parse(atob(token.split(".")[1]));
    } catch (error) {
      // console.error("Token decode error:", error);
    }
  }

  const [auth, setAuth] = useState({
    token: token || '',
    role: decoded.role || '',
    user: decoded.id ? { id: decoded.id, username: decoded.username } : null,
  });

  // Connect socket when authenticated
  useEffect(() => {
    console.log("🔐 AuthContext: token changed, connecting socket...", { hasToken: !!auth.token });
    
    if (auth.token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      console.log("🧹 AuthContext cleanup: disconnecting socket");
      disconnectSocket();
    };
  }, [auth.token]);

  const updateAuth = (data) => {
    setAuth(data);
    
    // Connect/disconnect socket based on auth state
    if (data.token) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  };

  return (
    <AuthContext.Provider value={{ auth, updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

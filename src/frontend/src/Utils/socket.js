// src/Utils/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"],
});

// Helper function để emit user online status
export const setUserOnline = (userId) => {
  if (userId) {
    socket.emit("user:online", userId);
    console.log("🟢 User set to online:", userId);
  }
};

// Helper function để listen user status changes
export const onUserStatusChanged = (callback) => {
  socket.on("user:status:changed", callback);
};

// Helper function để remove listener
export const offUserStatusChanged = (callback) => {
  socket.off("user:status:changed", callback);
};
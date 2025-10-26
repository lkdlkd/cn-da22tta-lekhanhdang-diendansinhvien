// src/Utils/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"],
});

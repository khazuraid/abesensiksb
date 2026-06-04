"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
	socket: Socket | null;
	isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Asumsi backend jalan di port 8888 dan diakses di production via url yang sama
		const socketInstance = io(
			process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888",
			{
				transports: ["websocket"],
				reconnectionAttempts: 5,
				reconnectionDelay: 1000,
			},
		);

		socketInstance.on("connect", () => {
			console.log("Connected to WebSocket backend");
			setIsConnected(true);
		});

		socketInstance.on("disconnect", () => {
			console.log("Disconnected from WebSocket backend");
			setIsConnected(false);
		});

		setSocket(socketInstance);

		return () => {
			socketInstance.disconnect();
		};
	}, []);

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	);
}

"use client";

import { usePathname } from "next/navigation";
import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { io, type Socket } from "socket.io-client";

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
	const pathname = usePathname();
	const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
	const socket = useMemo(() => {
		if (!workerUrl) return null;
		return io(workerUrl, {
			transports: ["websocket"],
			withCredentials: true,
			autoConnect: false,
			auth: async (callback) => {
				try {
					const response = await fetch("/api/auth/token", {
						credentials: "include",
					});
					const data = (await response.json()) as { token?: string };
					callback({ token: data.token });
				} catch {
					callback({});
				}
			},
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
		});
	}, [workerUrl]);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (pathname === "/login" || !socket) return;
		const onConnect = () => {
			console.log("Connected to WebSocket backend");
			setIsConnected(true);
		};

		const onDisconnect = () => {
			console.log("Disconnected from WebSocket backend");
			setIsConnected(false);
		};
		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.connect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.disconnect();
		};
	}, [pathname, socket]);

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	);
}

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
	const socket = useMemo(
		() =>
			io(
				process.env.NEXT_PUBLIC_WORKER_URL ||
					(typeof window === "undefined"
						? "http://localhost:8888"
						: `${window.location.protocol}//${window.location.hostname}:8888`),
				{
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
				},
			),
		[],
	);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (pathname === "/login") return;
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

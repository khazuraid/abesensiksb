import { Logger } from "@nestjs/common";
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
	cors: {
		origin: "*", // Adjust in production
	},
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	private logger = new Logger(EventsGateway.name);

	handleConnection(client: Socket) {
		this.logger.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	broadcastNewLog(logData: any) {
		this.server.emit("onNewLog", logData);
	}

	broadcastDeviceStatus(deviceId: string, isOnline: boolean) {
		this.server.emit("onDeviceStatusChange", { deviceId, isOnline });
	}
}

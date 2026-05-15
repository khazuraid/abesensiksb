import {
	Body,
	Controller,
	Get,
	Header,
	HttpCode,
	Logger,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AdmsGuard } from "./adms.guard";
import { ADMSService } from "./adms.service";

@Controller("iclock")
@UseGuards(AdmsGuard)
export class ADMSController {
	private readonly logger = new Logger(ADMSController.name);
	constructor(private readonly admsService: ADMSService) {}

	/**
	 * Handshake & Inisialisasi Perangkat
	 * Auto-register jika device belum ada di DB.
	 * Response berisi konfigurasi untuk mesin (delay, timezone, dll).
	 */
	@Get("cdata")
	@Header("Content-Type", "text/plain")
	async handshake(@Query("SN") sn: string, @Req() req: Request) {
		if (!sn) return "OK";

		const device = await this.admsService.registerOrUpdateDevice(sn, req.ip || "");

		// Response format ADMS: key=value per line
		const delay = device?.delay ?? 30;
		const errorDelay = device?.errorDelay ?? 60;

		return [
			"GET OPTION FROM: " + sn,
			`Stamp=0`,
			`OpStamp=0`,
			`Delay=${delay}`,
			`ErrorDelay=${errorDelay}`,
			"TransTimes=00:00;14:05",
			"TransInterval=1",
			"TransFlag=1111000000",
			"TimeZone=7",
			"Realtime=1",
			"Encrypt=0",
		].join("\n");
	}

	/**
	 * Menerima Data Log Absensi atau Data User dari mesin.
	 * Mesin mengirim query param `table` untuk membedakan jenis data:
	 * - table=ATTLOG → log absensi
	 * - table=OPERLOG → operasi log
	 * - table=user → data user/pegawai dari mesin
	 */
	@Post("cdata")
	@HttpCode(200)
	@Header("Content-Type", "text/plain")
	async receiveData(
		@Query("SN") sn: string,
		@Query("table") table: string,
		@Req() req: Request,
	) {
		if (!sn) return "ERROR: Missing SN";

		const rawData = req.body
			? (Buffer.isBuffer(req.body) ? req.body.toString("utf-8").trim() : String(req.body).trim())
			: "";

		this.logger.log(`POST /iclock/cdata SN=${sn} table=${table} bodyLength=${rawData.length}`);
		this.logger.log(`Body: ${rawData.slice(0, 500)}`);

		await this.admsService.updateDeviceStatus(sn, req.ip || "");

		// Mesin kadang kirim POST tanpa body (heartbeat/ping)
		if (!rawData) return "OK";

		// Jika mesin push data user
		if (table === "user") {
			return await this.admsService.handleUserData(sn, rawData);
		}

		// Default: log absensi
		return await this.admsService.handleLogData(sn, rawData);
	}

	/**
	 * Menerima foto capture saat absen dari mesin.
	 * Mesin kirim foto sebagai binary/multipart ke /iclock/fdata atau /iclock/cdata?table=AttPhoto
	 */
	@Post("fdata")
	@HttpCode(200)
	@Header("Content-Type", "text/plain")
	async receivePhoto(
		@Query("SN") sn: string,
		@Query("PIN") pin: string,
		@Query("FileName") fileName: string,
		@Body() photoData: Buffer,
		@Req() req: Request,
	) {
		if (!sn || !pin) return "OK";
		await this.admsService.handlePhotoUpload(sn, pin, fileName, photoData);
		return "OK";
	}

	/**
	 * Polling Perintah (Command Queue)
	 */
	@Get("getrequest")
	async getRequest(@Query("SN") sn: string) {
		return this.admsService.getPendingCommands(sn);
	}

	/**
	 * Konfirmasi Perintah Selesai
	 */
	@Post("devicecmd")
	@HttpCode(200)
	async deviceCmd(@Query("SN") _sn: string, @Req() req: Request) {
		const body = req.body
			? (Buffer.isBuffer(req.body) ? req.body.toString("utf-8").trim() : String(req.body).trim())
			: "";
		if (!body) return "OK";
		// Format body: "ID:123&Return=0" (0=success)
		const idMatch = body.match(/ID[=:](\d+)/);
		const successMatch = body.match(/Return[=:](\d+)/);
		if (idMatch) {
			const commandId = Number.parseInt(idMatch[1], 10);
			const success = successMatch ? successMatch[1] === "0" : true;
			await this.admsService.ackCommand(commandId, success);
		}
		return `OK`;
	}
}

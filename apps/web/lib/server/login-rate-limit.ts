import { ApiError } from "./api";
import { getRedisClient } from "./container";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

export const loginRateLimiter = {
	async check(key: string) {
		const redis = await getRedisClient();
		if (!redis) {
			if (process.env.NODE_ENV === "production")
				throw new ApiError(503, "Layanan autentikasi belum siap");
			return;
		}
		const count = await redis.incr(`auth:login:${key}`);
		if (count === 1) await redis.expire(`auth:login:${key}`, WINDOW_SECONDS);
		if (count > MAX_ATTEMPTS)
			throw new ApiError(
				429,
				"Terlalu banyak percobaan login. Coba lagi nanti.",
			);
	},
	async reset(key: string) {
		const redis = await getRedisClient();
		if (redis) await redis.del(`auth:login:${key}`);
	},
};

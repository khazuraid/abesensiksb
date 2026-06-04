import {
	BadRequestException,
	Injectable,
	type PipeTransform,
} from "@nestjs/common";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	constructor(private schema: ZodSchema) {}

	transform(value: unknown) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const parsedValue = this.schema.parse(value);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return parsedValue;
		} catch (error: unknown) {
			const zodError = error as { errors: unknown[] };
			throw new BadRequestException({
				message: "Validation failed",
				errors: zodError.errors,
			});
		}
	}
}

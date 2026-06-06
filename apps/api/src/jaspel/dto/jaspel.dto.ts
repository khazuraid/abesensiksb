import { IsNotEmpty, IsNumber } from "class-validator";

export class UpdateVariableDto {
	@IsNumber()
	@IsNotEmpty()
	basicIndex: number;

	@IsNumber()
	@IsNotEmpty()
	positionIndex: number;

	@IsNumber()
	@IsNotEmpty()
	riskIndex: number;
}

export class CalculateJaspelDto {
	@IsNumber()
	@IsNotEmpty()
	month: number;

	@IsNumber()
	@IsNotEmpty()
	year: number;

	@IsNumber()
	@IsNotEmpty()
	totalFund: number;
}

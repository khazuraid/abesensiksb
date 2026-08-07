export function isRegisteredAdmsDevice(
	sn: string,
	registeredSerialNumber: string | undefined,
) {
	return Boolean(sn) && sn === registeredSerialNumber;
}

import type { Role } from "@adms/shared-types";

const roles: Role[] = ["ADMIN", "HRD", "USER"];

export function fallbackRole(value: unknown): Role | null {
	return roles.includes(value as Role) ? (value as Role) : null;
}

export function roleHome(role: Role) {
	return role === "USER" ? "/profile" : "/";
}

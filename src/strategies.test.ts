import { describe, it, expect } from "bun:test";
import {
	RoleEngine,
	RoleOperationEngine,
	ResourceRoleOperationEngine,
	ResourceRoleOperationAttributeEngine,
	type Rule,
	type Actor,
} from "@/index";

// ---- Shared setup ----
interface RoleActor extends Actor {
	role?: string;
	id?: string;
}

const actor = (role: string, id?: string): RoleActor => ({ role, id });

// ---- Role engine tests ----
describe("RoleEngine", () => {
	const rules: readonly Rule<{ role?: string }>[] = [
		{ meta: { role: "admin" } },
	];
	const engine = new RoleEngine<RoleActor>();

	it("allows matching role", () => {
		expect(engine.checkAccess(rules, actor("admin"), "any", {})).toBe(true);
	});

	it("rejects other role", () => {
		expect(engine.checkAccess(rules, actor("user"), "any", {})).toBe(false);
	});
});

// ---- RoleOperation engine tests ----
describe("RoleOperationEngine", () => {
	const rules: readonly Rule<{ role?: string; operation?: string }>[] = [
		{ meta: { role: "admin", operation: "delete" } },
	];
	const engine = new RoleOperationEngine<RoleActor, string>();

	it("matches role and operation", () => {
		expect(engine.checkAccess(rules, actor("admin"), "delete", {})).toBe(true);
	});

	it("fails wrong operation", () => {
		expect(engine.checkAccess(rules, actor("admin"), "edit", {})).toBe(false);
	});
});

// ---- ResourceRoleOperation engine tests ----
describe("ResourceRoleOperationEngine", () => {
	type Meta = { role?: string; operation?: string; resource?: string };
	const rules: readonly Rule<Meta>[] = [
		{ meta: { role: "admin", operation: "edit", resource: "invoice" } },
	];
	const engine = new ResourceRoleOperationEngine<
		RoleActor,
		string,
		{ resource: string }
	>();

	it("matches role, operation and resource", () => {
		expect(
			engine.checkAccess(rules, actor("admin"), "edit", {
				resource: "invoice",
			}),
		).toBe(true);
	});

	it("fails wrong resource", () => {
		expect(
			engine.checkAccess(rules, actor("admin"), "edit", { resource: "file" }),
		).toBe(false);
	});
});

// ---- ResourceRoleOperationAttribute engine tests ----
describe("ResourceRoleOperationAttributeEngine", () => {
	type Meta = {
		role?: string;
		operation?: string;
		resource?: string;
		attribute?: { key: string; reference?: keyof RoleActor; value?: unknown };
	};
	const rules: readonly Rule<Meta>[] = [
		{
			meta: {
				role: "user",
				operation: "view",
				resource: "invoice",
				attribute: { key: "userId", reference: "id" },
			},
		},
	];
	const engine = new ResourceRoleOperationAttributeEngine<
		RoleActor,
		string,
		{ resource: string; userId: string }
	>();

	it("matches attribute reference", () => {
		expect(
			engine.checkAccess(rules, actor("user", "42"), "view", {
				resource: "invoice",
				userId: "42",
			}),
		).toBe(true);
	});

	it("fails attribute mismatch", () => {
		expect(
			engine.checkAccess(rules, actor("user", "41"), "view", {
				resource: "invoice",
				userId: "42",
			}),
		).toBe(false);
	});
});

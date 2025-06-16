import { describe, it, expect } from "bun:test";

import { checkAccess, type MetaMatcher } from "../../src/index";
import { rules, Operation } from "./rules";

interface StdMeta {
	role?: string | readonly string[];
	operation?: string;
	resource?: string;
}

const matcher: MetaMatcher<StdMeta> = (meta, actor, action, context) => {
	if (!meta) return true;
	const { role, operation, resource } = meta;
	if (role) {
		const roles = Array.isArray(role) ? role : [role];
		if (!roles.includes((actor as { role?: string }).role ?? "")) return false;
	}
	if (operation && operation !== action) return false;
	if (resource && resource !== (context as { resource?: string }).resource)
		return false;
	return true;
};

const mock = {
	invoice: {
		base: {
			resource: "invoice",
			userId: "id123",
		},
		status: function (status: string) {
			return { ...this.base, status };
		},
	},
	actor: {
		base: {
			id: "id123",
		},
		role: function (role: string) {
			return { ...this.base, role };
		},
	},
};

describe("Invoice access control", () => {
	describe("Module role", () => {
		it("Can edit invoice in Generating status", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Edit,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Draft" },
				},
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot edit invoice in Draft status", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Edit,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Pending" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});

		it("Cannot view Generating invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.View,
				mock.invoice.status("Generating"),
				matcher,
			);
			expect(result).toBe(false);
		});
	});

	describe("Admin role", () => {
		it("Can edit invoice in Draft status", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Pending" },
				},
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Can edit invoice in Pending status", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Pending"),
					payload: { status: "Draft" },
				},
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot edit invoice in Generating status", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Draft" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});

		it("Can view Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.View,
				mock.invoice.status("Complete"),
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot edit Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Complete"),
					payload: { status: "Pending" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});
	});

	describe("Customer role", () => {
		it("Can view Pending invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Pending"),
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Can pay Pending invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Pay,
				mock.invoice.status("Pending"),
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot view Draft invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Draft"),
				matcher,
			);
			expect(result).toBe(false);
		});

		it("Cannot view Generating invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Generating"),
				matcher,
			);
			expect(result).toBe(false);
		});

		it("Can view Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Complete"),
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot pay Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Pay,
				mock.invoice.status("Complete"),
				matcher,
			);
			expect(result).toBe(false);
		});

		it("Cannot pay someone else's invoice", () => {
			const result = checkAccess(
				rules,
				{ ...mock.actor.role("user"), id: "someone-else" },
				Operation.Pay,
				{
					...mock.invoice.status("Pending"),
					userId: "different-user",
				},
				matcher,
			);
			expect(result).toBe(false);
		});
	});

	describe("Module create permission", () => {
		it("Can create invoice when payload.status is Generating", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Create,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Generating" },
				},
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot create invoice when payload.status is not Generating", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Create,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Draft" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});
	});

	describe("Admin create permission", () => {
		it("Can create invoice when payload.status is not Generating", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Create,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Draft" },
				},
				matcher,
			);
			expect(result).toBe(true);
		});

		it("Cannot create invoice when payload.status is Generating", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Create,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Generating" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});
	});

	describe("User create permission", () => {
		it("Users cannot create invoices", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Create,
				{
					...mock.invoice.status("Pending"),
					payload: { status: "Pending" },
				},
				matcher,
			);
			expect(result).toBe(false);
		});
	});
});

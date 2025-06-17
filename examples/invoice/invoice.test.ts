import { describe, it, expect } from "bun:test";

import { ResourceRoleOperationEngine } from "@soudasuwa/permissions";
import { rules, Operation } from "./rules";

const engine = new ResourceRoleOperationEngine();

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
			const result = engine.checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Edit,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Draft" },
				},
			);
			expect(result).toBe(true);
		});

		it("Cannot edit invoice in Draft status", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Edit,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Pending" },
				},
			);
			expect(result).toBe(false);
		});

		it("Cannot view Generating invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.View,
				mock.invoice.status("Generating"),
			);
			expect(result).toBe(false);
		});
	});

	describe("Admin role", () => {
		it("Can edit invoice in Draft status", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Pending" },
				},
			);
			expect(result).toBe(true);
		});

		it("Can edit invoice in Pending status", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Pending"),
					payload: { status: "Draft" },
				},
			);
			expect(result).toBe(true);
		});

		it("Cannot edit invoice in Generating status", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Draft" },
				},
			);
			expect(result).toBe(false);
		});

		it("Can view Complete invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.View,
				mock.invoice.status("Complete"),
			);
			expect(result).toBe(true);
		});

		it("Cannot edit Complete invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Edit,
				{
					...mock.invoice.status("Complete"),
					payload: { status: "Pending" },
				},
			);
			expect(result).toBe(false);
		});
	});

	describe("Customer role", () => {
		it("Can view Pending invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Pending"),
			);
			expect(result).toBe(true);
		});

		it("Can pay Pending invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Pay,
				mock.invoice.status("Pending"),
			);
			expect(result).toBe(true);
		});

		it("Cannot view Draft invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Draft"),
			);
			expect(result).toBe(false);
		});

		it("Cannot view Generating invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Generating"),
			);
			expect(result).toBe(false);
		});

		it("Can view Complete invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.View,
				mock.invoice.status("Complete"),
			);
			expect(result).toBe(true);
		});

		it("Cannot pay Complete invoice", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Pay,
				mock.invoice.status("Complete"),
			);
			expect(result).toBe(false);
		});

		it("Cannot pay someone else's invoice", () => {
			const result = engine.checkAccess(
				rules,
				{ ...mock.actor.role("user"), id: "someone-else" },
				Operation.Pay,
				{
					...mock.invoice.status("Pending"),
					userId: "different-user",
				},
			);
			expect(result).toBe(false);
		});
	});

	describe("Module create permission", () => {
		it("Can create invoice when payload.status is Generating", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Create,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Generating" },
				},
			);
			expect(result).toBe(true);
		});

		it("Cannot create invoice when payload.status is not Generating", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("module"),
				Operation.Create,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Draft" },
				},
			);
			expect(result).toBe(false);
		});
	});

	describe("Admin create permission", () => {
		it("Can create invoice when payload.status is not Generating", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Create,
				{
					...mock.invoice.status("Draft"),
					payload: { status: "Draft" },
				},
			);
			expect(result).toBe(true);
		});

		it("Cannot create invoice when payload.status is Generating", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("admin"),
				Operation.Create,
				{
					...mock.invoice.status("Generating"),
					payload: { status: "Generating" },
				},
			);
			expect(result).toBe(false);
		});
	});

	describe("User create permission", () => {
		it("Users cannot create invoices", () => {
			const result = engine.checkAccess(
				rules,
				mock.actor.role("user"),
				Operation.Create,
				{
					...mock.invoice.status("Pending"),
					payload: { status: "Pending" },
				},
			);
			expect(result).toBe(false);
		});
	});
});

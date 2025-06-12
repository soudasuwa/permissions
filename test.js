import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkAccess } from "./dist/index.js";
import { rules } from "./dist/rules.js";

const mock = {
	invoice: {
		base: {
			resource: "invoice",
			userId: "id123",
		},
		status: function (status) {
			return { ...this.base, status };
		},
	},
	actor: {
		base: {
			id: "id123",
		},
		role: function (role) {
			return { ...this.base, role };
		},
	},
};

describe("Invoice access control", () => {
	describe("Module role", () => {
		it("Can edit invoice in Generating status", () => {
			const result = checkAccess(rules, mock.actor.role("module"), "edit", {
				...mock.invoice.status("Generating"),
				payload: { status: "Draft" },
			});
			assert.equal(result, true);
		});

		it("Cannot edit invoice in Draft status", () => {
			const result = checkAccess(rules, mock.actor.role("module"), "edit", {
				...mock.invoice.status("Draft"),
				payload: { status: "Pending" },
			});
			assert.equal(result, false);
		});

		it("Cannot view Generating invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("module"),
				"view",
				mock.invoice.status("Generating"),
			);
			assert.equal(result, false);
		});
	});

	describe("Admin role", () => {
		it("Can edit invoice in Draft status", () => {
			const result = checkAccess(rules, mock.actor.role("admin"), "edit", {
				...mock.invoice.status("Draft"),
				payload: { status: "Pending" },
			});
			assert.equal(result, true);
		});

		it("Can edit invoice in Pending status", () => {
			const result = checkAccess(rules, mock.actor.role("admin"), "edit", {
				...mock.invoice.status("Pending"),
				payload: { status: "Draft" },
			});
			assert.equal(result, true);
		});

		it("Cannot edit invoice in Generating status", () => {
			const result = checkAccess(rules, mock.actor.role("admin"), "edit", {
				...mock.invoice.status("Generating"),
				payload: { status: "Draft" },
			});
			assert.equal(result, false);
		});

		it("Can view Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("admin"),
				"view",
				mock.invoice.status("Complete"),
			);
			assert.equal(result, true);
		});

		it("Cannot edit Complete invoice", () => {
			const result = checkAccess(rules, mock.actor.role("admin"), "edit", {
				...mock.invoice.status("Complete"),
				payload: { status: "Pending" },
			});
			assert.equal(result, false);
		});
	});

	describe("Customer role", () => {
		it("Can view Pending invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"view",
				mock.invoice.status("Pending"),
			);
			assert.equal(result, true);
		});

		it("Can pay Pending invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"pay",
				mock.invoice.status("Pending"),
			);
			assert.equal(result, true);
		});

		it("Cannot view Draft invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"view",
				mock.invoice.status("Draft"),
			);
			assert.equal(result, false);
		});

		it("Cannot view Generating invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"view",
				mock.invoice.status("Generating"),
			);
			assert.equal(result, false);
		});

		it("Can view Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"view",
				mock.invoice.status("Complete"),
			);
			assert.equal(result, true);
		});

		it("Cannot pay Complete invoice", () => {
			const result = checkAccess(
				rules,
				mock.actor.role("user"),
				"pay",
				mock.invoice.status("Complete"),
			);
			assert.equal(result, false);
		});

		it("Cannot pay someone else's invoice", () => {
			const result = checkAccess(
				rules,
				{ ...mock.actor.role("user"), id: "someone-else" },
				"pay",
				{
					...mock.invoice.status("Pending"),
					userId: "different-user",
				},
			);
			assert.equal(result, false);
		});
	});
});

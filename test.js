import test from "node:test"
import assert from "node:assert/strict"

import { checkAccess } from "./index.js"
import { rules } from "./rules.js"

// Actor factory
const actor = (role, id = "id123") => ({ role, id })

const base = {
	resource: "invoice",
	userId: "id123",
}

// TODO use centralized mocks
const mock = {
	invoice: {
		base: {
			resource: "invoice",
			userId: "id123",
		},
		status: function (status) {
			return { ...this.base, status }
		},
	},
	actor: {
		base: {
			id: "id123",
		},
		role: function (role) {
			return { ...this.base, role }
		},
	},
}

// TODO Better use describe and it
test("Invoice access control", async (t) => {
	// ====== Module Role ======
	await t.test("Module role", async (t) => {
		await t.test("Can edit invoice in Generating status", () => {
			const result = checkAccess(rules, actor("module"), "edit", {
				...base,
				status: "Generating",
				payload: { status: "Draft" },
			})
			assert.equal(result, true)
		})

		await t.test("Cannot edit invoice in Draft status", () => {
			const result = checkAccess(rules, actor("module"), "edit", {
				...base,
				status: "Draft",
				payload: { status: "Pending" },
			})
			assert.equal(result, false)
		})

		await t.test("Cannot view Generating invoice", () => {
			const result = checkAccess(rules, actor("module"), "view", {
				...base,
				status: "Generating",
			})
			assert.equal(result, false) // Not explicitly granted
		})
	})

	// ====== Admin Role ======
	await t.test("Admin role", async (t) => {
		await t.test("Can edit invoice in Draft status", () => {
			const result = checkAccess(rules, actor("admin"), "edit", {
				...base,
				status: "Draft",
				payload: { status: "Pending" },
			})
			assert.equal(result, true)
		})

		await t.test("Can edit invoice in Pending status", () => {
			const result = checkAccess(rules, actor("admin"), "edit", {
				...base,
				status: "Pending",
				payload: { status: "Draft" },
			})
			assert.equal(result, true)
		})

		await t.test("Cannot edit invoice in Generating status", () => {
			const result = checkAccess(rules, actor("admin"), "edit", {
				...base,
				status: "Generating",
				payload: { status: "Draft" },
			})
			assert.equal(result, false)
		})

		await t.test("Can view Complete invoice", () => {
			const result = checkAccess(rules, actor("admin"), "view", {
				...base,
				status: "Complete",
			})
			assert.equal(result, true)
		})

		await t.test("Cannot edit Complete invoice", () => {
			const result = checkAccess(rules, actor("admin"), "edit", {
				...base,
				status: "Complete",
				payload: { status: "Pending" },
			})
			assert.equal(result, false)
		})
	})

	// ====== Customer/User Role ======
	await t.test("Customer role", async (t) => {
		await t.test("Can view Pending invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "view", {
				...base,
				status: "Pending",
			})
			assert.equal(result, true)
		})

		await t.test("Can pay Pending invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "pay", {
				...base,
				status: "Pending",
			})
			assert.equal(result, true)
		})

		await t.test("Cannot view Draft invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "view", {
				...base,
				status: "Draft",
			})
			assert.equal(result, false)
		})

		await t.test("Cannot view Generating invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "view", {
				...base,
				status: "Generating",
			})
			assert.equal(result, false)
		})

		await t.test("Can view Complete invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "view", {
				...base,
				status: "Complete",
			})
			assert.equal(result, true)
		})

		await t.test("Cannot pay Complete invoice", () => {
			const result = checkAccess(rules, actor("user", "id123"), "pay", {
				...base,
				status: "Complete",
			})
			assert.equal(result, false)
		})

		await t.test("Cannot pay someone else's invoice", () => {
			const result = checkAccess(
				rules,
				actor("user", "someone-else"),
				"pay",
				{
					...base,
					status: "Pending",
					userId: "different-user",
				}
			)
			assert.equal(result, false)
		})
	})
})

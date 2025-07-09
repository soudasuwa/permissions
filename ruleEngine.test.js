const assert = require("node:assert");
const { test } = require("node:test");
const { evaluateRule, authorize } = require("./ruleEngine");

// ----------------------------------------
// Basic Equality
// ----------------------------------------

test("Equal match", () => {
	const rule = { "user.role": "admin" };
	const context = { user: { role: "admin" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("Equal mismatch", () => {
	const rule = { "user.role": "admin" };
	const context = { user: { role: "customer" } };
	assert.strictEqual(evaluateRule(rule, context), false);
});

// ----------------------------------------
// Operators: in, not, reference
// ----------------------------------------

test("In operator match", () => {
	const rule = { "resource.status": { in: ["draft", "pending"] } };
	const context = { resource: { status: "pending" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("In operator miss", () => {
	const rule = { "resource.status": { in: ["draft", "pending"] } };
	const context = { resource: { status: "complete" } };
	assert.strictEqual(evaluateRule(rule, context), false);
});

test("Not operator match", () => {
	const rule = { action: { not: "edit" } };
	const context = { action: "view" };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("Reference match", () => {
	const rule = { "resource.ownerId": { reference: "user.id" } };
	const context = { user: { id: "123" }, resource: { ownerId: "123" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Logical AND/OR
// ----------------------------------------

test("AND match", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { "resource.status": "draft" }],
	};
	const context = { user: { role: "admin" }, resource: { status: "draft" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("OR match (one true)", () => {
	const rule = {
		OR: [{ "user.role": "admin" }, { "user.role": "manager" }],
	};
	const context = { user: { role: "manager" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("Array is implicit AND", () => {
	const rule = [{ "user.role": "admin" }, { "resource.status": "draft" }];
	const context = { user: { role: "admin" }, resource: { status: "draft" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

test("nested object expands path", () => {
	const rule = {
		invoice: {
			ownerId: { reference: "user.id" },
			status: { not: "paid" },
		},
	};
	const ctx = {
		user: { id: "u1" },
		invoice: { ownerId: "u1", status: "pending" },
	};
	const badCtx = {
		user: { id: "u1" },
		invoice: { ownerId: "u2", status: "pending" },
	};
	assert.strictEqual(evaluateRule(rule, ctx), true);
	assert.strictEqual(evaluateRule(rule, badCtx), false);
});

// ----------------------------------------
// Nested and NOT logic
// ----------------------------------------

test("NOT inside AND (should fail)", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { NOT: { "resource.status": "complete" } }],
	};
	const context = { user: { role: "admin" }, resource: { status: "complete" } };
	assert.strictEqual(evaluateRule(rule, context), false);
});

test("NOT inside AND (should pass)", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { NOT: { "resource.status": "complete" } }],
	};
	const context = { user: { role: "admin" }, resource: { status: "pending" } };
	assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Authorize helper
// ----------------------------------------

test("authorize matches correct rule", () => {
	const rules = [
		{
			when: { resource: "todo", action: "read" },
			rule: { "item.ownerId": { reference: "user.id" } },
		},
		{
			when: { resource: "todo", action: "create" },
			rule: { "user.id": { exists: true } },
		},
	];
	const context = {
		resource: "todo",
		action: "read",
		user: { id: "a" },
		item: { ownerId: "a" },
	};
	assert.strictEqual(authorize(rules, context), true);
	const createCtx = { resource: "todo", action: "create", user: { id: "a" } };
	assert.strictEqual(authorize(rules, createCtx), true);
	const badCtx = {
		resource: "todo",
		action: "read",
		user: { id: "b" },
		item: { ownerId: "a" },
	};
	assert.strictEqual(authorize(rules, badCtx), false);
});

test("authorize handles nested rule groups", () => {
	const rules = [
		{
			when: { resource: "notebook" },
			rules: [
				{
					when: { action: "delete" },
					rule: {
						"notebook.ownerId": {
							reference: "user.id",
						},
					},
				},
				{
					when: { action: "modifySharing" },
					rule: {
						"notebook.ownerId": {
							reference: "user.id",
						},
					},
				},
			],
		},
	];
	const ctxDelete = {
		resource: "notebook",
		action: "delete",
		user: { id: "a" },
		notebook: { ownerId: "a" },
	};
	const ctxShare = {
		resource: "notebook",
		action: "modifySharing",
		user: { id: "a" },
		notebook: { ownerId: "a" },
	};
	const ctxBad = {
		resource: "notebook",
		action: "delete",
		user: { id: "b" },
		notebook: { ownerId: "a" },
	};
	assert.strictEqual(authorize(rules, ctxDelete), true);
	assert.strictEqual(authorize(rules, ctxShare), true);
	assert.strictEqual(authorize(rules, ctxBad), false);
});

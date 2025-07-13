const assert = require("node:assert");
const { test } = require("node:test");
const {
	evaluateRule,
	authorize,
	DefaultEvaluator,
	field,
	ref,
	and,
	not,
} = require("./ruleEngine");
const { AccessController } = require("./AccessController");

// ----------------------------------------
// Basic Equality
// ----------------------------------------

test("Equal match", () => {
	const rule = { "user.role": "admin" };
	const context = { user: { role: "admin" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

test("Equal mismatch", () => {
	const rule = { "user.role": "admin" };
	const context = { user: { role: "customer" } };
	assert.strictEqual(evaluateRule(rule, context).passed, false);
});

// ----------------------------------------
// Operators: in, not, reference
// ----------------------------------------

test("In operator match", () => {
	const rule = { "resource.status": { in: ["draft", "pending"] } };
	const context = { resource: { status: "pending" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

test("In operator miss", () => {
	const rule = { "resource.status": { in: ["draft", "pending"] } };
	const context = { resource: { status: "complete" } };
	assert.strictEqual(evaluateRule(rule, context).passed, false);
});

test("Not operator match", () => {
	const rule = { action: { not: "edit" } };
	const context = { action: "view" };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

test("Reference match", () => {
	const rule = { "resource.ownerId": { reference: "user.id" } };
	const context = { user: { id: "123" }, resource: { ownerId: "123" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

// ----------------------------------------
// Logical AND/OR
// ----------------------------------------

test("AND match", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { "resource.status": "draft" }],
	};
	const context = { user: { role: "admin" }, resource: { status: "draft" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

test("OR match (one true)", () => {
	const rule = {
		OR: [{ "user.role": "admin" }, { "user.role": "manager" }],
	};
	const context = { user: { role: "manager" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
});

test("OR object syntax works", () => {
	const rule = {
		OR: { "user.role": "admin", "resource.status": "draft" },
	};
	const adminCtx = { user: { role: "admin" }, resource: { status: "pending" } };
	const draftCtx = { user: { role: "user" }, resource: { status: "draft" } };
	const noneCtx = { user: { role: "user" }, resource: { status: "pending" } };
	assert.strictEqual(evaluateRule(rule, adminCtx).passed, true);
	assert.strictEqual(evaluateRule(rule, draftCtx).passed, true);
	assert.strictEqual(evaluateRule(rule, noneCtx).passed, false);
});

test("object with multiple keys is implicit AND", () => {
	const rule = { "user.role": "admin", "resource.status": "draft" };
	const context = {
		user: { role: "admin" },
		resource: { status: "draft" },
	};
	assert.strictEqual(evaluateRule(rule, context).passed, true);
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
	assert.strictEqual(evaluateRule(rule, ctx).passed, true);
	assert.strictEqual(evaluateRule(rule, badCtx).passed, false);
});

// ----------------------------------------
// Nested and NOT logic
// ----------------------------------------

test("NOT inside AND (should fail)", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { NOT: { "resource.status": "complete" } }],
	};
	const context = { user: { role: "admin" }, resource: { status: "complete" } };
	assert.strictEqual(evaluateRule(rule, context).passed, false);
});

test("NOT inside AND (should pass)", () => {
	const rule = {
		AND: [{ "user.role": "admin" }, { NOT: { "resource.status": "complete" } }],
	};
	const context = { user: { role: "admin" }, resource: { status: "pending" } };
	assert.strictEqual(evaluateRule(rule, context).passed, true);
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
	assert.strictEqual(authorize(rules, context).passed, true);
	const createCtx = { resource: "todo", action: "create", user: { id: "a" } };
	assert.strictEqual(authorize(rules, createCtx).passed, true);
	const badCtx = {
		resource: "todo",
		action: "read",
		user: { id: "b" },
		item: { ownerId: "a" },
	};
	assert.strictEqual(authorize(rules, badCtx).passed, false);
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
	assert.strictEqual(authorize(rules, ctxDelete).passed, true);
	assert.strictEqual(authorize(rules, ctxShare).passed, true);
	assert.strictEqual(authorize(rules, ctxBad).passed, false);
});

// XOR logic
test("XOR logic works via custom handler", () => {
	const xorLogic = {
		match: (n) => typeof n === "object" && n !== null && "XOR" in n,
		evaluate: (n, ctx, ev) => {
			const sub = n.XOR;
			const arr = Array.isArray(sub)
				? sub
				: Object.entries(sub).map(([k, v]) => ({ [k]: v }));
			return arr.filter((r) => ev.evaluate(r, ctx).passed).length === 1;
		},
	};
	const evaluator = new DefaultEvaluator({ logic: [xorLogic] });
	const rule = { XOR: [{ flagA: true }, { flagB: true }] };
	const ctxA = { flagA: true };
	const ctxB = { flagB: true };
	const ctxBoth = { flagA: true, flagB: true };
	const ctxNone = {};
	assert.strictEqual(evaluator.evaluate(rule, ctxA).passed, true);
	assert.strictEqual(evaluator.evaluate(rule, ctxB).passed, true);
	assert.strictEqual(evaluator.evaluate(rule, ctxBoth).passed, false);
	assert.strictEqual(evaluator.evaluate(rule, ctxNone).passed, false);
});

test("custom comparison handler works", () => {
	const startsWith = {
		match: (_, exp) =>
			typeof exp === "object" && exp !== null && "startsWith" in exp,
		evaluate: (attr, exp, ctx) => {
			const value = attr
				.split(".")
				.reduce((o, k) => (o ? o[k] : undefined), ctx);
			return typeof value === "string" && value.startsWith(exp.startsWith);
		},
	};
	const evaluator = new DefaultEvaluator({ compare: [startsWith] });
	const rule = { "user.name": { startsWith: "Jo" } };
	assert.strictEqual(
		evaluator.evaluate(rule, { user: { name: "John" } }).passed,
		true,
	);
	assert.strictEqual(
		evaluator.evaluate(rule, { user: { name: "Bob" } }).passed,
		false,
	);
});

test("custom context resolver works", () => {
	const colonResolver = {
		resolve: (p, ctx) =>
			p.split(":").reduce((o, k) => (o ? o[k] : undefined), ctx),
	};
	const evaluator = new DefaultEvaluator({ contextResolver: colonResolver });
	const rule = { "user:id": { reference: "resource:ownerId" } };
	const ctx = { user: { id: "a" }, resource: { ownerId: "a" } };
	assert.strictEqual(evaluator.evaluate(rule, ctx).passed, true);
});

test("custom rule node handler works", () => {
	const allowIf = {
		match: (node) =>
			typeof node === "object" && node !== null && "allowIf" in node,
		evaluate: (node, ctx, ev) => ev.evaluate(node.allowIf, ctx),
	};
	const evaluator = new DefaultEvaluator({ nodes: [allowIf] });
	const rules = [{ allowIf: { flag: true } }];
	assert.strictEqual(evaluator.authorize(rules, { flag: true }).passed, true);
	assert.strictEqual(evaluator.authorize(rules, { flag: false }).passed, false);
});

test("functional rule builders compose rules", () => {
	const rule = and(
		field("user.id", ref("item.ownerId")),
		not(field("item.status", "archived")),
	);
	const controller = new AccessController([{ rule }]);
	const ctx = {
		user: { id: "u1" },
		item: { ownerId: "u1", status: "active" },
	};
	const result = controller.pemit(ctx);
	assert.strictEqual(result.passed, true);
});

test("evaluate returns detailed tree", () => {
	const evaluator = new DefaultEvaluator();
	const rule = {
		AND: [{ flag: true }, { NOT: { disabled: true } }],
	};
	const ctx = { flag: true, disabled: false };
	const res = evaluator.evaluate(rule, ctx);
	assert.strictEqual(res.type, "AND");
	assert.strictEqual(res.passed, true);
	assert.strictEqual(res.children.length, 2);
	assert.strictEqual(res.children[0].path, "flag");
	assert.strictEqual(res.children[1].type, "NOT");
});

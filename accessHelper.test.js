const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("./AccessController");

const rules = [
	{
		when: { resource: "todo", action: "read" },
		rule: { "item.ownerId": { reference: "user.id" } },
	},
];

test("AccessController builds context incrementally", () => {
	const controller = new AccessController(rules)
		.context({ resource: "todo" })
		.context({ action: "read" })
		.context({ user: { id: "a" } })
		.context({ item: { ownerId: "a" } });

	assert.strictEqual(controller.check(), true);
});

test("check merges extra context", () => {
	const controller = new AccessController(rules).context({
		resource: "todo",
		action: "read",
	});

	assert.strictEqual(
		controller.check({ user: { id: "a" }, item: { ownerId: "a" } }),
		true,
	);
	assert.strictEqual(
		controller.check({ user: { id: "b" }, item: { ownerId: "a" } }),
		false,
	);
});

test("context returns new controller without mutating original", () => {
	const base = new AccessController(rules).context({ resource: "todo" });
	const withAction = base.context({ action: "read" });

	assert.notStrictEqual(base, withAction);
	assert.strictEqual(base._context.action, undefined);

	// `withAction` already has action from context call
	assert.strictEqual(
		withAction.check({ user: { id: "a" }, item: { ownerId: "a" } }),
		true,
	);
	// `base` requires action provided at check time
	assert.strictEqual(
		base.check({
			action: "read",
			user: { id: "a" },
			item: { ownerId: "a" },
		}),
		true,
	);
	// `base` without action should fail
	assert.strictEqual(
		base.check({ user: { id: "a" }, item: { ownerId: "a" } }),
		false,
	);
});

test("context performs shallow merge", () => {
	const base = new AccessController(rules, {
		context: {
			resource: "todo",
			action: "read",
			user: { id: "a" },
			item: { ownerId: "a", extra: true },
		},
	});
	const replaced = base.context({ item: { ownerId: "a" } });

	assert.deepStrictEqual(replaced._context.item, { ownerId: "a" });
	assert.deepStrictEqual(base._context.item, { ownerId: "a", extra: true });
	assert.strictEqual(replaced.check(), true);
});

test("custom evaluator can be provided", () => {
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
	const evaluator = new (require("./ruleEngine").DefaultEvaluator)({
		logic: [xorLogic],
	});
	const controller = new AccessController(
		[{ rule: { XOR: [{ a: true }, { b: true }] } }],
		{ evaluator },
	);
	assert.strictEqual(controller.check({ a: true }), true);
	assert.strictEqual(controller.check({ b: true }), true);
	assert.strictEqual(controller.check({ a: true, b: true }), false);
});

test("custom context resolver via evaluator", () => {
	const colonResolver = {
		resolve: (p, ctx) =>
			p.split(":").reduce((o, k) => (o ? o[k] : undefined), ctx),
	};
	const evaluator = new (require("./ruleEngine").DefaultEvaluator)({
		contextResolver: colonResolver,
	});
	const controller = new AccessController(
		[{ rule: { "user:id": { reference: "item:ownerId" } } }],
		{ evaluator, context: { user: { id: "u" }, item: { ownerId: "u" } } },
	);
	assert.strictEqual(controller.check(), true);
});

test("custom rule node handler via evaluator", () => {
	const allowIf = {
		match: (n) => typeof n === "object" && n !== null && "allowIf" in n,
		evaluate: (n, ctx, ev) => ev.evaluate(n.allowIf, ctx),
	};
	const evaluator = new (require("./ruleEngine").DefaultEvaluator)({
		nodes: [allowIf],
	});
	const controller = new AccessController([{ allowIf: { ok: true } }], {
		evaluator,
		context: { ok: true },
	});
	assert.strictEqual(controller.check(), true);
	const failController = controller.context({ ok: false });
	assert.strictEqual(failController.check(), false);
});

test("pemit returns evaluation tree", () => {
	const controller = new AccessController([{ rule: { flag: true } }], {
		context: { flag: true },
	});
	const result = controller.pemit();
	assert.strictEqual(result.passed, true);
	assert.strictEqual(Array.isArray(result.children), true);
});

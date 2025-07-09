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
		resource: "todo",
		action: "read",
		user: { id: "a" },
		item: { ownerId: "a", extra: true },
	});
	const replaced = base.context({ item: { ownerId: "a" } });

	assert.deepStrictEqual(replaced._context.item, { ownerId: "a" });
	assert.deepStrictEqual(base._context.item, { ownerId: "a", extra: true });
	assert.strictEqual(replaced.check(), true);
});

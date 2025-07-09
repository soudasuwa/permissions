/* Scenario 1: Simple ToDo App
   Roles: user
   Resources: todo items

   Access Controls:
   - Create: any authenticated user can create a todo item for themselves.
   - Read: a user may read only the todo items they created.
   - Update: a user may update only their own items.
   - Delete: a user may delete only their own items.
   - There is no access to other users' todo lists or individual items.
*/

const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

const rules = [
	{
		when: { resource: "todo" },
		rules: [
			{
				when: { action: "create" },
				rule: {
					"user.id": { exists: true },
					"item.ownerId": { reference: "user.id" },
				},
			},
			{
				when: { action: "read" },
				rule: { "item.ownerId": { reference: "user.id" } },
			},
			{
				when: { action: "update" },
				rule: { "item.ownerId": { reference: "user.id" } },
			},
			{
				when: { action: "delete" },
				rule: { "item.ownerId": { reference: "user.id" } },
			},
		],
	},
];

module.exports = { rules };

const base = new AccessController(rules).context({ resource: "todo" });

// Tests

test("scenario1: user can create own todo", () => {
	const controller = base.context({
		action: "create",
		user: { id: "u1" },
		item: { ownerId: "u1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario1: user cannot create todo for another user", () => {
	const controller = base.context({
		action: "create",
		user: { id: "u1" },
		item: { ownerId: "u2" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario1: missing user id cannot create", () => {
	const controller = base.context({
		action: "create",
		user: {},
		item: { ownerId: "u1" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario1: user can read own todo", () => {
	const controller = base.context({
		action: "read",
		user: { id: "u1" },
		item: { ownerId: "u1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario1: user cannot read others todo", () => {
	const controller = base.context({
		action: "read",
		user: { id: "u1" },
		item: { ownerId: "u2" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario1: user can update own todo", () => {
	const controller = base.context({
		action: "update",
		user: { id: "u1" },
		item: { ownerId: "u1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario1: user cannot update others todo", () => {
	const controller = base.context({
		action: "update",
		user: { id: "u1" },
		item: { ownerId: "u2" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario1: user can delete own todo", () => {
	const controller = base.context({
		action: "delete",
		user: { id: "u1" },
		item: { ownerId: "u1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario1: user cannot delete others todo", () => {
	const controller = base.context({
		action: "delete",
		user: { id: "u1" },
		item: { ownerId: "u2" },
	});
	assert.strictEqual(controller.check(), false);
});

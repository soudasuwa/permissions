/* Scenario 2: Friends Tasks App
   Roles: user
   Resources: tasks

   Access Controls:
   - Each user manages their own list of tasks.
   - A task may be shared with individual friends by username.
   - Create: a user may add new tasks to their list.
   - Read: the owner and any shared friend may view a task.
   - Update: the owner and shared friends may change the status or text of a shared task.
   - Delete: only the owner can delete a task from their list.
   - Unshared tasks remain completely private to their creator.
*/

const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

const rules = [
	{
		when: { resource: "task" },
		rules: [
			{
				when: { action: "create" },
				rule: {
					user: { id: { exists: true } },
					item: { ownerId: { reference: "user.id" } },
				},
			},
			{
				when: { action: "read" },
				rule: {
					OR: {
						"item.ownerId": { reference: "user.id" },
						"user.id": {
							in: { reference: "item.sharedWith" },
						},
					},
				},
			},
			{
				when: { action: "update" },
				rule: {
					OR: {
						"item.ownerId": { reference: "user.id" },
						"user.id": {
							in: { reference: "item.sharedWith" },
						},
					},
				},
			},
			{
				when: { action: "delete" },
				rule: { "item.ownerId": { reference: "user.id" } },
			},
		],
	},
];

module.exports = { rules };

const base = new AccessController(rules).context({ resource: "task" });

// Tests

test("scenario2: shared friend can update task", () => {
	const controller = base.context({
		action: "update",
		user: { id: "bob" },
		item: { ownerId: "alice", sharedWith: ["bob"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: owner can create task", () => {
	const controller = base.context({
		action: "create",
		user: { id: "alice" },
		item: { ownerId: "alice" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: cannot create task for another user", () => {
	const controller = base.context({
		action: "create",
		user: { id: "alice" },
		item: { ownerId: "bob" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario2: owner can read task", () => {
	const controller = base.context({
		action: "read",
		user: { id: "alice" },
		item: { ownerId: "alice" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: shared friend can read task", () => {
	const controller = base.context({
		action: "read",
		user: { id: "bob" },
		item: { ownerId: "alice", sharedWith: ["bob"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: unshared user cannot read task", () => {
	const controller = base.context({
		action: "read",
		user: { id: "charlie" },
		item: { ownerId: "alice", sharedWith: ["bob"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario2: owner can update task", () => {
	const controller = base.context({
		action: "update",
		user: { id: "alice" },
		item: { ownerId: "alice" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: unshared user cannot update task", () => {
	const controller = base.context({
		action: "update",
		user: { id: "charlie" },
		item: { ownerId: "alice", sharedWith: ["bob"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario2: owner can delete task", () => {
	const controller = base.context({
		action: "delete",
		user: { id: "alice" },
		item: { ownerId: "alice" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario2: shared friend cannot delete task", () => {
	const controller = base.context({
		action: "delete",
		user: { id: "bob" },
		item: { ownerId: "alice", sharedWith: ["bob"] },
	});
	assert.strictEqual(controller.check(), false);
});

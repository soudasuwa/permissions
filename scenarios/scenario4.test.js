/* Scenario 4: Collaborative Note Taking App
   Roles: owner, editor, viewer
   Resources: notebooks, notes

   Access Controls:
   - The owner of a notebook controls its sharing settings.
   - Create: owners and editors may create notes in a shared notebook.
   - Read: owners, editors, and viewers may read notes in notebooks shared with them.
   - Update: owners and editors may update any note in the notebook they have access to.
   - Delete: owners and editors may delete notes; only the owner may delete the entire notebook.
   - The owner is the only role allowed to modify sharing permissions or revoke access.
*/

const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

const rules = [
	{
		when: { resource: "note" },
		rules: [
			{
				when: { action: "create" },
				rule: {
					OR: [
						{ "notebook.ownerId": { reference: "user.id" } },
						{
							"user.id": {
								in: { reference: "notebook.editors" },
							},
						},
					],
				},
			},
			{
				when: { action: "read" },
				rule: {
					OR: [
						{ "notebook.ownerId": { reference: "user.id" } },
						{
							"user.id": {
								in: { reference: "notebook.editors" },
							},
						},
						{
							"user.id": {
								in: { reference: "notebook.viewers" },
							},
						},
					],
				},
			},
			{
				when: { action: "update" },
				rule: {
					OR: [
						{ "notebook.ownerId": { reference: "user.id" } },
						{
							"user.id": {
								in: { reference: "notebook.editors" },
							},
						},
					],
				},
			},
			{
				when: { action: "delete" },
				rule: {
					OR: [
						{ "notebook.ownerId": { reference: "user.id" } },
						{
							"user.id": {
								in: { reference: "notebook.editors" },
							},
						},
					],
				},
			},
		],
	},
	{
		when: { resource: "notebook" },
		rules: [
			{
				when: { action: "delete" },
				rule: { "notebook.ownerId": { reference: "user.id" } },
			},
			{
				when: { action: "modifySharing" },
				rule: { "notebook.ownerId": { reference: "user.id" } },
			},
		],
	},
];

module.exports = { rules };

const baseNote = new AccessController(rules).context({ resource: "note" });
const baseBook = new AccessController(rules).context({ resource: "notebook" });

// Tests

test("scenario4: editor can create note", () => {
	const controller = baseNote.context({
		action: "create",
		user: { id: "e1" },
		notebook: { ownerId: "o1", editors: ["e1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: viewer cannot create note", () => {
	const controller = baseNote.context({
		action: "create",
		user: { id: "v1" },
		notebook: { ownerId: "o1", viewers: ["v1"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario4: viewer cannot update note", () => {
	const controller = baseNote.context({
		action: "update",
		user: { id: "v1" },
		notebook: { ownerId: "o1", viewers: ["v1"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario4: owner can update note", () => {
	const controller = baseNote.context({
		action: "update",
		user: { id: "o1" },
		notebook: { ownerId: "o1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: editor can update note", () => {
	const controller = baseNote.context({
		action: "update",
		user: { id: "e1" },
		notebook: { ownerId: "o1", editors: ["e1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: viewer can read note", () => {
	const controller = baseNote.context({
		action: "read",
		user: { id: "v1" },
		notebook: { ownerId: "o1", viewers: ["v1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: owner can delete note", () => {
	const controller = baseNote.context({
		action: "delete",
		user: { id: "o1" },
		notebook: { ownerId: "o1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: editor can delete note", () => {
	const controller = baseNote.context({
		action: "delete",
		user: { id: "e1" },
		notebook: { ownerId: "o1", editors: ["e1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: viewer cannot delete note", () => {
	const controller = baseNote.context({
		action: "delete",
		user: { id: "v1" },
		notebook: { ownerId: "o1", viewers: ["v1"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario4: owner can delete notebook", () => {
	const controller = baseBook.context({
		action: "delete",
		user: { id: "o1" },
		notebook: { ownerId: "o1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: non owner cannot delete notebook", () => {
	const controller = baseBook.context({
		action: "delete",
		user: { id: "e1" },
		notebook: { ownerId: "o1", editors: ["e1"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario4: owner can modify sharing", () => {
	const controller = baseBook.context({
		action: "modifySharing",
		user: { id: "o1" },
		notebook: { ownerId: "o1" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario4: editor cannot modify sharing", () => {
	const controller = baseBook.context({
		action: "modifySharing",
		user: { id: "e1" },
		notebook: { ownerId: "o1", editors: ["e1"] },
	});
	assert.strictEqual(controller.check(), false);
});

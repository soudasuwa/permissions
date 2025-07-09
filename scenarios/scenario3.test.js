/* Scenario 3: Tic-Tac-Toe Game with Leaderboard
   Roles: player, moderator
   Resources: games, leaderboard entries

   Access Controls:
   - Players may create a new game and invite one opponent.
   - During an active game only the two participants may make moves.
   - Completed games are read-only for all players.
   - Leaderboard entries are generated automatically from game results.
   - Players may read the leaderboard but cannot modify entries.
   - Moderators may update or reset leaderboard entries and review detailed game history for dispute resolution.
*/

const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

const rules = [
	{
		when: { resource: "game" },
		rules: [
			{
				when: { action: "create" },
				rule: {
					user: {
						role: "player",
						id: {
							in: { reference: "item.participants" },
						},
					},
				},
			},
			{
				when: { action: "move" },
				rule: {
					"user.id": {
						in: { reference: "item.participants" },
					},
					item: { status: { not: "complete" } },
				},
			},
			{
				when: { action: "read" },
				rule: {
					OR: [
						{ item: { status: "complete" } },
						{
							user: {
								id: {
									in: { reference: "item.participants" },
								},
							},
							item: { status: { not: "complete" } },
						},
					],
				},
			},
		],
	},
	{
		when: { resource: "leaderboard" },
		rules: [
			{
				when: { action: "read" },
				rule: { "user.role": { in: ["player", "moderator"] } },
			},
			{
				when: { action: "update" },
				rule: { "user.role": "moderator" },
			},
		],
	},
];

module.exports = { rules };

const baseGame = new AccessController(rules).context({ resource: "game" });
const baseBoard = new AccessController(rules).context({
	resource: "leaderboard",
});

// Tests

test("scenario3: participant can move in active game", () => {
	const controller = baseGame.context({
		action: "move",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario3: player can create game when included", () => {
	const controller = baseGame.context({
		action: "create",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario3: creation fails when not a participant", () => {
	const controller = baseGame.context({
		action: "create",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: creation fails for non player role", () => {
	const controller = baseGame.context({
		action: "create",
		user: { id: "p1", role: "moderator" },
		item: { participants: ["p1", "p2"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: non participant cannot move", () => {
	const controller = baseGame.context({
		action: "move",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: participant cannot move when game complete", () => {
	const controller = baseGame.context({
		action: "move",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "complete" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: only moderator updates leaderboard", () => {
	const controller = baseBoard.context({
		action: "update",
		user: { role: "player" },
	});
	assert.strictEqual(controller.check(), false);
	const mod = baseBoard.context({
		action: "update",
		user: { role: "moderator" },
	});
	assert.strictEqual(mod.check(), true);
});

test("scenario3: player can read completed game", () => {
	const controller = baseGame.context({
		action: "read",
		user: { id: "x", role: "player" },
		item: { status: "complete" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario3: participant can read active game", () => {
	const controller = baseGame.context({
		action: "read",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario3: non participant cannot read active game", () => {
	const controller = baseGame.context({
		action: "read",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: player can read leaderboard", () => {
	const controller = baseBoard.context({
		action: "read",
		user: { role: "player" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario3: guest cannot read leaderboard", () => {
	const controller = baseBoard.context({
		action: "read",
		user: { role: "guest" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario3: player cannot update leaderboard", () => {
	const controller = baseBoard.context({
		action: "update",
		user: { role: "player" },
	});
	assert.strictEqual(controller.check(), false);
});

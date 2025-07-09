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
const { authorize } = require("../ruleEngine");

const rules = [
	{
		when: { resource: "game" },
		rules: [
			{
				when: { action: "create" },
				rule: [
					{ "user.role": "player" },
					{
						"user.id": {
							in: { reference: "item.participants" },
						},
					},
				],
			},
			{
				when: { action: "move" },
				rule: [
					{
						"user.id": {
							in: { reference: "item.participants" },
						},
					},
					{ "item.status": { not: "complete" } },
				],
			},
			{
				when: { action: "read" },
				rule: {
					OR: [
						{ "item.status": "complete" },
						[
							{
								"user.id": {
									in: { reference: "item.participants" },
								},
							},
							{ "item.status": { not: "complete" } },
						],
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

// Tests

test("scenario3: participant can move in active game", () => {
	const context = {
		resource: "game",
		action: "move",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	};
	assert.strictEqual(authorize(rules, context), true);
});

test("scenario3: player can create game when included", () => {
	const context = {
		resource: "game",
		action: "create",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"] },
	};
	assert.strictEqual(authorize(rules, context), true);
});

test("scenario3: creation fails when not a participant", () => {
	const context = {
		resource: "game",
		action: "create",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"] },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: creation fails for non player role", () => {
	const context = {
		resource: "game",
		action: "create",
		user: { id: "p1", role: "moderator" },
		item: { participants: ["p1", "p2"] },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: non participant cannot move", () => {
	const context = {
		resource: "game",
		action: "move",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: participant cannot move when game complete", () => {
	const context = {
		resource: "game",
		action: "move",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "complete" },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: only moderator updates leaderboard", () => {
	const context = {
		resource: "leaderboard",
		action: "update",
		user: { role: "player" },
	};
	assert.strictEqual(authorize(rules, context), false);
	const modCtx = {
		resource: "leaderboard",
		action: "update",
		user: { role: "moderator" },
	};
	assert.strictEqual(authorize(rules, modCtx), true);
});

test("scenario3: player can read completed game", () => {
	const context = {
		resource: "game",
		action: "read",
		user: { id: "x", role: "player" },
		item: { status: "complete" },
	};
	assert.strictEqual(authorize(rules, context), true);
});

test("scenario3: participant can read active game", () => {
	const context = {
		resource: "game",
		action: "read",
		user: { id: "p1", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	};
	assert.strictEqual(authorize(rules, context), true);
});

test("scenario3: non participant cannot read active game", () => {
	const context = {
		resource: "game",
		action: "read",
		user: { id: "x", role: "player" },
		item: { participants: ["p1", "p2"], status: "active" },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: player can read leaderboard", () => {
	const context = {
		resource: "leaderboard",
		action: "read",
		user: { role: "player" },
	};
	assert.strictEqual(authorize(rules, context), true);
});

test("scenario3: guest cannot read leaderboard", () => {
	const context = {
		resource: "leaderboard",
		action: "read",
		user: { role: "guest" },
	};
	assert.strictEqual(authorize(rules, context), false);
});

test("scenario3: player cannot update leaderboard", () => {
	const context = {
		resource: "leaderboard",
		action: "update",
		user: { role: "player" },
	};
	assert.strictEqual(authorize(rules, context), false);
});

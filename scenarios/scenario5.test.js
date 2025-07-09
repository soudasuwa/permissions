/* Scenario 5: Discussion Forum
   Roles: guest, member, moderator, admin
   Resources: categories, topics, posts, attachments, user accounts

   Access Controls:
   - Guests
     - May browse public categories, topics, and posts.
     - May not create, vote, edit, or delete any content.
     - Cannot access private categories.

   - Members
     - May create topics and posts in categories they can access.
     - May edit or delete their own posts for 30 minutes after posting.
     - May upload attachments where allowed.
     - May send private messages to other members.
     - May report posts or topics for moderator review.
     - May vote on posts or topics if the feature exists.
     - Cannot modify other users' accounts or content.

   - Moderators
     - Assigned to specific categories.
     - May edit, lock, move, or delete any topic or post within their categories.
     - May manage user reports and remove inappropriate attachments.
     - May temporarily suspend or warn members in their categories.
     - Cannot change global site settings.

   - Admins
     - Full access to all categories, posts, and user accounts.
     - Manage categories, site configuration, and global permissions.
     - Assign or revoke moderator roles.
     - View, disable, or delete user accounts when necessary.
*/

const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

const rules = [
	{
		when: { resource: "category" },
		rules: [
			{
				when: { action: "view" },
				rule: {
					OR: {
						"category.isPrivate": { not: true },
						"user.id": {
							in: { reference: "category.allowedUsers" },
						},
						"user.role": "admin",
					},
				},
			},
		],
	},
	{
		when: { resource: "topic" },
		rules: [
			{
				when: { action: "create" },
				rule: {
					OR: [
						{
							user: { role: "member" },
							category: { isPrivate: { not: true } },
						},
						{
							user: {
								role: "member",
								id: {
									in: { reference: "category.allowedUsers" },
								},
							},
						},
					],
				},
			},
		],
	},
	{
		when: { resource: "post" },
		rules: [
			{
				when: { action: "editOwn" },
				rule: {
					user: { role: "member" },
					post: {
						authorId: { reference: "user.id" },
						ageMinutes: { lessThan: 30 },
					},
				},
			},
			{
				when: { action: "editAnyModerator" },
				rule: {
					user: {
						role: "moderator",
						id: {
							in: { reference: "category.moderators" },
						},
					},
				},
			},
		],
	},
	{
		when: { resource: "user", action: "adminDelete" },
		rule: { "user.role": "admin" },
	},
];

module.exports = { rules };

const baseCategory = new AccessController(rules).context({
	resource: "category",
});
const baseTopic = new AccessController(rules).context({ resource: "topic" });
const basePost = new AccessController(rules).context({ resource: "post" });
const baseUser = new AccessController(rules).context({ resource: "user" });

// Tests

test("scenario5: guest cannot create topic", () => {
	const controller = baseTopic.context({
		action: "create",
		user: { role: "guest", id: "g1" },
		category: { isPrivate: false },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: guest can view public category", () => {
	const controller = baseCategory.context({
		action: "view",
		user: { role: "guest", id: "g1" },
		category: { isPrivate: false },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: member edits own recent post", () => {
	const controller = basePost.context({
		action: "editOwn",
		user: { role: "member", id: "m1" },
		post: { authorId: "m1", ageMinutes: 10 },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: moderator edits any post in category", () => {
	const controller = basePost.context({
		action: "editAnyModerator",
		user: { role: "moderator", id: "mod1" },
		category: { moderators: ["mod1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: moderator cannot edit post outside category", () => {
	const controller = basePost.context({
		action: "editAnyModerator",
		user: { role: "moderator", id: "mod1" },
		category: { moderators: ["other"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: guest cannot view private category", () => {
	const controller = baseCategory.context({
		action: "view",
		user: { role: "guest", id: "g1" },
		category: { isPrivate: true, allowedUsers: [] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: member can create topic in public category", () => {
	const controller = baseTopic.context({
		action: "create",
		user: { role: "member", id: "m1" },
		category: { isPrivate: false },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: member can create topic in allowed private category", () => {
	const controller = baseTopic.context({
		action: "create",
		user: { role: "member", id: "m1" },
		category: { isPrivate: true, allowedUsers: ["m1"] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: member cannot create topic in private category without access", () => {
	const controller = baseTopic.context({
		action: "create",
		user: { role: "member", id: "m1" },
		category: { isPrivate: true, allowedUsers: ["other"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: member cannot edit old post", () => {
	const controller = basePost.context({
		action: "editOwn",
		user: { role: "member", id: "m1" },
		post: { authorId: "m1", ageMinutes: 40 },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: member cannot edit others post even if recent", () => {
	const controller = basePost.context({
		action: "editOwn",
		user: { role: "member", id: "m1" },
		post: { authorId: "m2", ageMinutes: 10 },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: admin can view private category", () => {
	const controller = baseCategory.context({
		action: "view",
		user: { role: "admin", id: "a1" },
		category: { isPrivate: true, allowedUsers: [] },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario5: non moderator cannot edit any post", () => {
	const controller = basePost.context({
		action: "editAnyModerator",
		user: { role: "member", id: "m1" },
		category: { moderators: ["mod1"] },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario5: admin can delete user account", () => {
	const controller = baseUser.context({
		action: "adminDelete",
		user: { role: "admin" },
	});
	assert.strictEqual(controller.check(), true);
});

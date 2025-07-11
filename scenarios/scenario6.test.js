const assert = require("node:assert");
const { test } = require("node:test");
const { AccessController } = require("../AccessController");

/* Scenario 6: Invoice Lifecycle Rules
   Roles: admin, customer
   Resources: invoices
   
   A single status field drives invoice visibility and permissions. The uptime
   module creates invoices in the `generating` status. During generation the
   invoice is hidden from customers and read only for administration. Once the
   module marks it `draft` (generation complete) administration may edit it but
   it remains invisible to customers. Setting the status to `pending` exposes the
   invoice so the customer can view and pay it. When paid, the status becomes
   `complete` and the invoice is read only for everyone.
*/

const rules = [
	{
		when: { resource: "invoice" },
		rules: [
			{
				// Administration may view invoices at any time
				when: { action: "view" },
				rule: { "user.role": "admin" },
			},
			{
				// Customers may view only their own invoices once pending or complete
				when: { action: "view" },
				rule: {
					"user.role": "customer",
					invoice: {
						ownerId: { reference: "user.id" },
						status: { in: ["pending", "complete"] },
					},
				},
			},
			{
				// Admins may edit after generation finished while not complete
				when: { action: "edit" },
				rule: {
					"user.role": "admin",
					invoice: { status: { in: ["draft", "pending"] } },
				},
			},
			{
				// Customers may pay their own invoice when pending
				when: { action: "pay" },
				rule: {
					"user.role": "customer",
					invoice: {
						ownerId: { reference: "user.id" },
						status: "pending",
					},
				},
			},
		],
	},
];

module.exports = { rules };

const base = new AccessController(rules).context({ resource: "invoice" });

// Tests

test("scenario6: admin can edit draft invoice", () => {
	const controller = base.context({
		action: "edit",
		user: { role: "admin" },
		invoice: { status: "draft" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario6: admin cannot edit while generating", () => {
	const controller = base.context({
		action: "edit",
		user: { role: "admin" },
		invoice: { status: "generating" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: admin cannot edit completed invoice", () => {
	const controller = base.context({
		action: "edit",
		user: { role: "admin" },
		invoice: { status: "complete" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: customer can pay own pending invoice", () => {
	const controller = base.context({
		action: "pay",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "pending" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario6: customer cannot pay completed invoice", () => {
	const controller = base.context({
		action: "pay",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "complete" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: customer cannot pay someone else's invoice", () => {
	const controller = base.context({
		action: "pay",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c2", status: "pending" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: customer cannot view invoice while generating", () => {
	const controller = base.context({
		action: "view",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "generating" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: customer cannot view invoice in draft", () => {
	const controller = base.context({
		action: "view",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "draft" },
	});
	assert.strictEqual(controller.check(), false);
});

test("scenario6: customer can view invoice when pending", () => {
	const controller = base.context({
		action: "view",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "pending" },
	});
	assert.strictEqual(controller.check(), true);
});

test("scenario6: customer can view completed invoice", () => {
	const controller = base.context({
		action: "view",
		user: { role: "customer", id: "c1" },
		invoice: { ownerId: "c1", status: "complete" },
	});
	assert.strictEqual(controller.check(), true);
});

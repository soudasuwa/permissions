import { describe, it, expect } from "bun:test";
import {
	matchCondition,
	matchesMeta,
	matchesRule,
	checkAccess,
	type Actor,
	type Context,
	type Rule,
} from "./engine";

// Shared enums for the invoice scenarios
enum Role {
	Admin = "admin",
	Module = "module",
	User = "user",
}

enum Operation {
	Create = "create",
	Edit = "edit",
	View = "view",
	Pay = "pay",
}

enum Status {
	Generating = "Generating",
	Draft = "Draft",
	Pending = "Pending",
	Complete = "Complete",
}

type Resource = "invoice";

const dummyActor: Actor<Role> = { id: "1", role: Role.Admin };

const complexRules: readonly Rule<Role, Operation, Resource>[] = [
	{
		meta: { resource: "invoice" },
		rules: [
			{
				meta: { role: [Role.Admin, Role.Module], operation: Operation.Edit },
				match: { status: { not: Status.Complete } },
			},
			{
				meta: { role: Role.Module, operation: Operation.Create },
				match: { payload: { status: Status.Generating } },
			},
			{
				meta: { role: Role.User },
				match: {
					userId: { reference: { actor: "id" } },
					status: { in: [Status.Pending, Status.Complete] },
				},
				rules: [
					{ meta: { operation: Operation.View } },
					{
						meta: { operation: Operation.Pay },
						match: { status: Status.Pending },
					},
				],
			},
		],
	},
];

// ---------------- Basic unit tests ----------------

describe("matchCondition basic", () => {
	it("handles primitives", () => {
		expect(matchCondition("a", "a", dummyActor)).toBe(true);
	});

	it("handles not", () => {
		expect(matchCondition("a", { not: "b" }, dummyActor)).toBe(true);
		expect(matchCondition("a", { not: "a" }, dummyActor)).toBe(false);
	});

	it("handles in", () => {
		expect(matchCondition("a", { in: ["a", "b"] }, dummyActor)).toBe(true);
	});

	it("handles references", () => {
		const actor = { id: "42", role: Role.User };
		expect(matchCondition("42", { reference: { actor: "id" } }, actor)).toBe(
			true,
		);
	});

	it("handles nested objects", () => {
		const value = { foo: { bar: "baz" } };
		const cond = { foo: { bar: { not: "qux" } } };
		expect(matchCondition(value, cond, dummyActor)).toBe(true);
	});

	it("handles numbers", () => {
		expect(matchCondition(5, 5, dummyActor)).toBe(true);
	});

	it("handles booleans", () => {
		expect(matchCondition(true, true, dummyActor)).toBe(true);
	});

	it("supports numbers in 'in' lists", () => {
		expect(matchCondition(2, { in: [1, 2, 3] }, dummyActor)).toBe(true);
	});

	it("handles mixed nested conditions", () => {
		const value = { foo: 10, bar: false };
		const cond = { foo: { not: 0 }, bar: { in: [false] } };
		expect(matchCondition(value, cond, dummyActor)).toBe(true);
	});
});

describe("matchesMeta", () => {
	const ctx: Context<Resource> = { resource: "invoice" };
	const actor: Actor<Role> = { id: "1", role: Role.Admin };

	it("accepts undefined", () => {
		expect(matchesMeta(undefined, actor, Operation.View, ctx)).toBe(true);
	});

	it("matches role arrays", () => {
		const meta = {
			role: [Role.User, Role.Admin],
			operation: Operation.View,
			resource: "invoice",
		} as const;
		expect(matchesMeta(meta, actor, Operation.View, ctx)).toBe(true);
	});

	it("rejects wrong role", () => {
		const meta = { role: Role.User } as const;
		expect(matchesMeta(meta, actor, Operation.View, ctx)).toBe(false);
	});

	it("rejects wrong resource", () => {
		const meta = { resource: "other" as Resource };
		expect(matchesMeta(meta, actor, Operation.View, ctx)).toBe(false);
	});

	it("rejects wrong operation", () => {
		const meta = { operation: Operation.Edit };
		expect(matchesMeta(meta, actor, Operation.View, ctx)).toBe(false);
	});
});

describe("matchesRule", () => {
	const actor: Actor<Role> = { id: "1", role: Role.Admin };
	const ctx = { resource: "invoice", status: Status.Pending } as const;
	const rule: Rule<Role, Operation, Resource> = {
		meta: { role: Role.Admin, operation: Operation.View, resource: "invoice" },
		match: { status: Status.Pending },
	};

	it("returns true when meta and match pass", () => {
		expect(matchesRule(rule, actor, Operation.View, ctx)).toBe(true);
	});

	it("returns false when match fails", () => {
		expect(
			matchesRule(rule, actor, Operation.View, {
				...ctx,
				status: Status.Complete,
			}),
		).toBe(false);
	});

	it("returns false when meta fails", () => {
		expect(matchesRule(rule, actor, Operation.Edit, ctx)).toBe(false);
	});
});

describe("checkAccess simple", () => {
	const rules: readonly Rule<Role, Operation, Resource>[] = [
		{
			meta: {
				role: Role.Admin,
				operation: Operation.View,
				resource: "invoice",
			},
		},
	];
	const actor = { id: "1", role: Role.Admin } as const;
	const ctx = { resource: "invoice" } as const;

	it("allows matching meta", () => {
		expect(checkAccess(rules, actor, Operation.View, ctx)).toBe(true);
	});

	it("rejects mismatched meta", () => {
		expect(checkAccess(rules, actor, Operation.Edit, ctx)).toBe(false);
	});
});

// ---------------- Integration tests ----------------

describe("invoice rules scenario", () => {
	const admin: Actor<Role> = { id: "a", role: Role.Admin };
	const moduleActor: Actor<Role> = { id: "m", role: Role.Module };
	const user: Actor<Role> = { id: "u1", role: Role.User };
	const otherUser: Actor<Role> = { id: "u2", role: Role.User };

	it("admin can edit draft invoice", () => {
		const ctx = { resource: "invoice", status: Status.Draft } as const;
		expect(checkAccess(complexRules, admin, Operation.Edit, ctx)).toBe(true);
	});

	it("admin cannot edit complete invoice", () => {
		const ctx = { resource: "invoice", status: Status.Complete } as const;
		expect(checkAccess(complexRules, admin, Operation.Edit, ctx)).toBe(false);
	});

	it("module can create generating invoice", () => {
		const ctx = {
			resource: "invoice",
			status: Status.Generating,
			payload: { status: Status.Generating },
		} as const;
		expect(checkAccess(complexRules, moduleActor, Operation.Create, ctx)).toBe(
			true,
		);
	});

	it("module cannot create draft invoice", () => {
		const ctx = {
			resource: "invoice",
			status: Status.Draft,
			payload: { status: Status.Draft },
		} as const;
		expect(checkAccess(complexRules, moduleActor, Operation.Create, ctx)).toBe(
			false,
		);
	});

	it("user can view own pending invoice", () => {
		const ctx = {
			resource: "invoice",
			status: Status.Pending,
			userId: "u1",
		} as const;
		expect(checkAccess(complexRules, user, Operation.View, ctx)).toBe(true);
	});

	it("user cannot pay someone else's invoice", () => {
		const ctx = {
			resource: "invoice",
			status: Status.Pending,
			userId: "u1",
		} as const;
		expect(checkAccess(complexRules, otherUser, Operation.Pay, ctx)).toBe(
			false,
		);
	});
});

describe("advanced nested rules", () => {
	const advancedRules: readonly Rule<Role, Operation, Resource>[] = [
		{
			meta: { role: Role.Admin },
			rules: [
				{
					meta: { resource: "invoice" },
					rules: [
						{ meta: { operation: Operation.View } },
						{
							meta: { operation: Operation.Edit },
							match: { status: Status.Draft },
						},
					],
				},
			],
		},
	];
	it("admin can view invoice", () => {
		const ctx = { resource: "invoice" } as const;
		expect(checkAccess(advancedRules, dummyActor, Operation.View, ctx)).toBe(
			true,
		);
	});

	it("admin can edit draft invoice", () => {
		const ctx = { resource: "invoice", status: Status.Draft } as const;
		expect(checkAccess(advancedRules, dummyActor, Operation.Edit, ctx)).toBe(
			true,
		);
	});

	it("admin cannot edit pending invoice", () => {
		const ctx = { resource: "invoice", status: Status.Pending } as const;
		expect(checkAccess(advancedRules, dummyActor, Operation.Edit, ctx)).toBe(
			false,
		);
	});

	it("fails when role mismatch", () => {
		const user: Actor<Role> = { id: "2", role: Role.User };
		const ctx = { resource: "invoice" } as const;
		expect(checkAccess(advancedRules, user, Operation.View, ctx)).toBe(false);
	});
});

describe("file system permissions", () => {
	enum FSRole {
		Owner = "owner",
		Editor = "editor",
		Viewer = "viewer",
	}
	enum FSOp {
		Read = "read",
		Write = "write",
		Delete = "delete",
	}
	enum Visibility {
		Public = "public",
		Private = "private",
	}
	type FSResource = "file";

	const fsRules: readonly Rule<FSRole, FSOp, FSResource>[] = [
		{ meta: { role: FSRole.Owner, resource: "file" } },
		{ meta: { role: FSRole.Editor, operation: FSOp.Read, resource: "file" } },
		{
			meta: { role: FSRole.Editor, operation: FSOp.Write, resource: "file" },
			match: { ownerId: { reference: { actor: "id" } } },
		},
		{
			meta: { role: FSRole.Viewer, operation: FSOp.Read, resource: "file" },
			match: { visibility: Visibility.Public },
		},
		{
			meta: { role: FSRole.Viewer, operation: FSOp.Read, resource: "file" },
			match: { ownerId: { reference: { actor: "id" } } },
		},
	];

	const owner: Actor<FSRole> = { id: "o1", role: FSRole.Owner };
	const editor: Actor<FSRole> = { id: "e1", role: FSRole.Editor };
	const viewer: Actor<FSRole> = { id: "v1", role: FSRole.Viewer };

	it("owner can delete private file", () => {
		const ctx = {
			resource: "file",
			visibility: Visibility.Private,
			ownerId: "o1",
		} as const;
		expect(checkAccess(fsRules, owner, FSOp.Delete, ctx)).toBe(true);
	});

	it("editor can write own file", () => {
		const ctx = {
			resource: "file",
			visibility: Visibility.Private,
			ownerId: "e1",
		} as const;
		expect(checkAccess(fsRules, editor, FSOp.Write, ctx)).toBe(true);
	});

	it("editor cannot write other's file", () => {
		const ctx = {
			resource: "file",
			visibility: Visibility.Private,
			ownerId: "o1",
		} as const;
		expect(checkAccess(fsRules, editor, FSOp.Write, ctx)).toBe(false);
	});

	it("viewer can read public file", () => {
		const ctx = {
			resource: "file",
			visibility: Visibility.Public,
			ownerId: "o1",
		} as const;
		expect(checkAccess(fsRules, viewer, FSOp.Read, ctx)).toBe(true);
	});

	it("viewer cannot read private file of others", () => {
		const ctx = {
			resource: "file",
			visibility: Visibility.Private,
			ownerId: "o1",
		} as const;
		expect(checkAccess(fsRules, viewer, FSOp.Read, ctx)).toBe(false);
	});
});

describe("payment permissions", () => {
	enum PayRole {
		Customer = "customer",
		Merchant = "merchant",
		Processor = "processor",
	}
	enum PayOp {
		Pay = "pay",
		Refund = "refund",
		Cancel = "cancel",
	}
	enum PayStatus {
		Pending = "Pending",
		Completed = "Completed",
	}
	type PayRes = "payment";

	const payRules: readonly Rule<PayRole, PayOp, PayRes>[] = [
		{
			meta: {
				role: PayRole.Customer,
				operation: PayOp.Pay,
				resource: "payment",
			},
			match: {
				status: PayStatus.Pending,
				userId: { reference: { actor: "id" } },
			},
		},
		{
			meta: {
				role: PayRole.Merchant,
				operation: PayOp.Refund,
				resource: "payment",
			},
			match: { status: PayStatus.Completed },
		},
		{
			meta: {
				role: PayRole.Processor,
				operation: PayOp.Cancel,
				resource: "payment",
			},
		},
	];

	const customer: Actor<PayRole> = { id: "c1", role: PayRole.Customer };
	const merchant: Actor<PayRole> = { id: "m1", role: PayRole.Merchant };
	const processor: Actor<PayRole> = { id: "p1", role: PayRole.Processor };

	it("customer can pay own pending payment", () => {
		const ctx = {
			resource: "payment",
			status: PayStatus.Pending,
			userId: "c1",
		} as const;
		expect(checkAccess(payRules, customer, PayOp.Pay, ctx)).toBe(true);
	});

	it("customer cannot pay completed payment", () => {
		const ctx = {
			resource: "payment",
			status: PayStatus.Completed,
			userId: "c1",
		} as const;
		expect(checkAccess(payRules, customer, PayOp.Pay, ctx)).toBe(false);
	});

	it("merchant can refund completed payment", () => {
		const ctx = { resource: "payment", status: PayStatus.Completed } as const;
		expect(checkAccess(payRules, merchant, PayOp.Refund, ctx)).toBe(true);
	});

	it("merchant cannot refund pending payment", () => {
		const ctx = { resource: "payment", status: PayStatus.Pending } as const;
		expect(checkAccess(payRules, merchant, PayOp.Refund, ctx)).toBe(false);
	});

	it("processor can cancel any payment", () => {
		const ctx = { resource: "payment", status: PayStatus.Pending } as const;
		expect(checkAccess(payRules, processor, PayOp.Cancel, ctx)).toBe(true);
	});
});

describe("additional helpers", () => {
	it("matchesRule returns true without match block", () => {
		const rule: Rule<Role, Operation, Resource> = {
			meta: { role: Role.Admin },
		};
		const ctx = { resource: "invoice" } as const;
		expect(matchesRule(rule, dummyActor, Operation.View, ctx)).toBe(true);
	});

	it("checkAccess returns false when no rules provided", () => {
		const ctx = { resource: "invoice" } as const;
		expect(checkAccess([], dummyActor, Operation.View, ctx)).toBe(false);
	});
});

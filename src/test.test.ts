import { describe, it, expect } from "bun:test";
import {
	matchCondition,
	matchesMeta,
	matchesRule,
	RuleEngine,
	checkAccess,
	type Actor,
	type Context,
	type Rule,
} from "./engine";

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

describe("matchCondition", () => {
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
});

describe("RuleEngine integration", () => {
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

	it("RuleEngine instance matches checkAccess", () => {
		const engine = new RuleEngine(complexRules);
		const ctx = {
			resource: "invoice",
			status: Status.Pending,
			userId: "u1",
		} as const;
		expect(engine.checkAccess(user, Operation.View, ctx)).toBe(
			checkAccess(complexRules, user, Operation.View, ctx),
		);
	});
});

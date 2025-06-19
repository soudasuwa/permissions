import { describe, it, expect } from "bun:test";
import {
	getAllowedFields,
	getWhereClause,
	toPrismaSelect,
	toPrismaWhere,
	findMany,
	findFirst,
	updateMany,
	createAccessRequest,
	withPermit,
	type PrismaPermit,
	type SelectMeta,
} from "./index";
import type { Actor, Context, MetaMatcher, Rule } from "@soudasuwa/permissions";

interface Meta extends SelectMeta {
	role?: string;
	operation?: string;
}

const matchMeta: MetaMatcher<Meta, Actor, string, Context> = (
	meta,
	actor,
	action,
) => {
	if (!meta) return true;
	if (meta.role && meta.role !== actor.role) return false;
	if (meta.operation && meta.operation !== action) return false;
	return true;
};

describe("toPrismaSelect", () => {
	it("creates a simple select object", () => {
		const select = toPrismaSelect(["id", "status"]);
		expect(select).toEqual({ id: true, status: true });
	});
});

describe("getAllowedFields", () => {
	const rules: readonly Rule<Meta>[] = [
		{
			meta: {
				role: "admin",
				operation: "view",
				select: ["id", "status", "amount"],
			},
		},
		{
			meta: { role: "user" },
			rules: [{ meta: { operation: "view", select: ["id", "status"] } }],
		},
	];

	const admin: Actor = { id: "1", role: "admin" };
	const user: Actor = { id: "2", role: "user" };
	const ctx: Context = {};

	it("returns fields for direct rule", () => {
		expect(getAllowedFields(rules, matchMeta, admin, "view", ctx)).toEqual([
			"id",
			"status",
			"amount",
		]);
	});

	it("resolves nested rules", () => {
		expect(getAllowedFields(rules, matchMeta, user, "view", ctx)).toEqual([
			"id",
			"status",
		]);
	});

	it("returns empty when no rule matches", () => {
		expect(getAllowedFields(rules, matchMeta, user, "edit", ctx)).toEqual([]);
	});

	it("combines with toPrismaSelect", () => {
		const fields = getAllowedFields(rules, matchMeta, admin, "view", ctx);
		const select = toPrismaSelect(fields);
		expect(select).toEqual({ id: true, status: true, amount: true });
	});
});

describe("where helpers", () => {
	const rules: readonly Rule<Meta>[] = [
		{
			meta: { role: "admin" },
			match: { status: { in: ["draft", "pending"] } },
		},
		{
			meta: { role: "user" },
			match: { userId: { reference: { actor: "id" } } },
			rules: [
				{
					meta: { operation: "view" },
					match: { status: "pending" },
				},
			],
		},
	];

	const admin: Actor = { id: "1", role: "admin" };
	const user: Actor = { id: "2", role: "user" };

	it("converts conditions to prisma where", () => {
		const where = toPrismaWhere({ status: { in: ["a", "b"] } }, admin);
		expect(where).toEqual({ status: { in: ["a", "b"] } });
	});

	it("resolves reference conditions", () => {
		const where = toPrismaWhere(
			{ userId: { reference: { actor: "id" } } },
			user,
		);
		expect(where).toEqual({ userId: "2" });
	});

	it("builds where clause from matching rules", () => {
		const where = getWhereClause(rules, matchMeta, admin, "any", {});
		expect(where).toEqual({ status: { in: ["draft", "pending"] } });
	});

	it("merges parent and child matches", () => {
		const where = getWhereClause(rules, matchMeta, user, "view", {});
		expect(where).toEqual({ userId: "2", status: "pending" });
	});
});

describe("query wrappers", () => {
	const rules: readonly Rule<Meta>[] = [
		{
			meta: { role: "user", operation: "view", select: ["id"] },
			match: { userId: { reference: { actor: "id" } } },
		},
	];

	const actor: Actor = { id: "42", role: "user" };

	const delegate = {
		findMany: (args: unknown) => args,
		findFirst: (args: unknown) => args,
		updateMany: (args: unknown) => args,
	};

	it("applies rules to findMany", async () => {
		const result = await findMany(
			delegate,
			rules,
			matchMeta,
			actor,
			"view",
			{},
		);
		expect(result).toEqual({ select: { id: true }, where: { userId: "42" } });
	});

	it("merges where in findFirst", async () => {
		const result = await findFirst(
			delegate,
			rules,
			matchMeta,
			actor,
			"view",
			{},
			{ where: { status: "pending" } },
		);
		expect(result).toEqual({
			select: { id: true },
			where: { AND: [{ status: "pending" }, { userId: "42" }] },
		});
	});

	it("adds rule where to updateMany", async () => {
		const result = await updateMany(
			delegate,
			rules,
			matchMeta,
			actor,
			"view",
			{},
			{ data: { status: "ok" } },
		);
		expect(result).toEqual({ data: { status: "ok" }, where: { userId: "42" } });
	});
});

describe("access request", () => {
	const rules: readonly Rule<Meta>[] = [
		{
			meta: { role: "admin", select: ["id"] },
			match: { status: "pending" },
		},
	];

	const actor: Actor = { id: "99", role: "admin" };

	it("creates a permit from partial context", () => {
		const req = createAccessRequest(rules, matchMeta, actor, "view");
		req.withContext({ status: "pending" });
		const permit = req.permit();
		expect(permit).toEqual({
			allowed: true,
			select: { id: true },
			where: { status: "pending" },
		});
	});

	it("wraps a delegate with permit", async () => {
		const permit: PrismaPermit = {
			allowed: true,
			select: { id: true },
			where: { status: "pending" },
		};
		const delegate = { findFirst: (args: unknown) => args };
		const guarded = withPermit(delegate, permit);
		const result = await guarded.findFirst({ where: { userId: "99" } });
		expect(result).toEqual({
			select: { id: true },
			where: { AND: [{ userId: "99" }, { status: "pending" }] },
		});
	});
});

import type {
	Actor,
	Condition,
	Context,
	MetaMatcher,
	Rule,
	AccessRequest,
} from "@soudasuwa/permissions";
import { createAccessRequest as baseCreateAccessRequest } from "@soudasuwa/permissions";

export type { AccessRequest };
import {
	isConditionObject,
	isInCondition,
	isNotCondition,
	isReferenceCondition,
} from "@soudasuwa/permissions/guards";

/** Information returned when an access request is permitted. */
export interface PrismaPermit {
	readonly allowed: boolean;
	readonly select?: Record<string, true>;
	readonly where?: Record<string, unknown>;
}

/** Additional meta describing which fields can be selected. */
export interface SelectMeta {
	readonly select?: readonly string[];
}

/** Convert an array of fields to a Prisma select object. */
export const toPrismaSelect = (
	fields: readonly string[],
): Record<string, true> => Object.fromEntries(fields.map((key) => [key, true]));

/**
 * Retrieve allowed fields if any `select` metadata exists. Returns `undefined`
 * when no field rules are declared or none match.
 */
export function getSelectedFields<
	M extends SelectMeta,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
): readonly string[] | undefined {
	if (!hasFieldRules(rules)) return undefined;
	const fields = getAllowedFields(rules, matchMeta, actor, action, context);
	return fields.length ? fields : undefined;
}

/** Recursively determine if any rule specifies field selections. */
const hasFieldRules = <M extends SelectMeta>(
	rules: readonly Rule<M>[],
): boolean =>
	rules.some(
		(r) =>
			r.meta?.select !== undefined ||
			(r.rules ? hasFieldRules(r.rules) : false),
	);

/**
 * Determine which fields are accessible for an actor performing an action.
 * The rules must include `select` metadata to describe the allowed fields.
 */
export function getAllowedFields<
	M extends SelectMeta,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
): readonly string[] {
	const recurse = (set: readonly Rule<M>[]): readonly string[] => {
		for (const rule of set) {
			if (!matchMeta(rule.meta, actor, action, context)) continue;
			const fields = rule.meta?.select;
			if (fields !== undefined) return fields;
			if (rule.rules) {
				const found = recurse(rule.rules);
				if (found.length) return found;
			}
		}
		return [];
	};

	return recurse(rules);
}

/** Convert a condition object to a Prisma where expression. */
const convertCondition = (cond: Condition, actor: Actor): unknown => {
	if (isNotCondition(cond)) return { not: convertCondition(cond.not, actor) };
	if (isInCondition(cond)) return { in: cond.in };
	if (isReferenceCondition(cond))
		return (actor as Record<string, unknown>)[cond.reference.actor as string];
	if (isConditionObject(cond)) {
		const obj: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(cond)) {
			obj[k] = convertCondition(v, actor);
		}
		return obj;
	}
	return cond;
};

/** Convert a set of context matches into a Prisma where clause. */
export const toPrismaWhere = (
	match: Readonly<Record<string, Condition>>,
	actor: Actor,
): Record<string, unknown> => {
	const where: Record<string, unknown> = {};
	for (const [k, cond] of Object.entries(match)) {
		where[k] = convertCondition(cond, actor);
	}
	return where;
};

const mergeMatches = (
	base: Record<string, Condition>,
	add: Readonly<Record<string, Condition>> | undefined,
): Record<string, Condition> => {
	if (!add) return base;
	for (const [key, val] of Object.entries(add)) {
		const existing = base[key];
		if (isConditionObject(existing) && isConditionObject(val)) {
			base[key] = mergeMatches({ ...existing }, val);
		} else {
			base[key] = val;
		}
	}
	return base;
};

/**
 * Determine the Prisma where clause for the first rule that matches the actor
 * and action using meta information only. The rule's match conditions are
 * converted to a Prisma where object.
 */
export function getWhereClause<
	M extends Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
): Record<string, unknown> {
	const recurse = (
		set: readonly Rule<M>[],
		acc: Record<string, Condition>,
	): Record<string, Condition> | undefined => {
		for (const rule of set) {
			if (!matchMeta(rule.meta, actor, action, context)) continue;
			const merged = mergeMatches({ ...acc }, rule.match);
			if (rule.rules) {
				const found = recurse(rule.rules, merged);
				if (found) return found;
			} else {
				return merged;
			}
		}
		return undefined;
	};

	const result = recurse(rules, {});
	return result ? toPrismaWhere(result, actor) : {};
}

const mergeWhere = (
	base: Record<string, unknown> | undefined,
	add: Record<string, unknown>,
): Record<string, unknown> => (base ? { AND: [base, add] } : add);

const buildArgs = <
	M extends SelectMeta,
	A extends Actor,
	Act,
	C extends Context,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
	args: Record<string, unknown> = {},
	withSelect = true,
): Record<string, unknown> => {
	const fields = withSelect
		? getAllowedFields(rules, matchMeta, actor, action, context)
		: [];
	const ruleWhere = getWhereClause(rules, matchMeta, actor, action, context);

	const merged: Record<string, unknown> = { ...args };

	if (fields.length) merged.select = toPrismaSelect(fields);
	if (Object.keys(ruleWhere).length)
		merged.where = mergeWhere(args.where as Record<string, unknown>, ruleWhere);

	return merged;
};

export const findMany = async <
	M extends SelectMeta,
	A extends Actor,
	Act,
	C extends Context,
	R,
>(
	delegate: { findMany(args: Record<string, unknown>): Promise<R> },
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
	args: Record<string, unknown> = {},
): Promise<R> =>
	delegate.findMany(buildArgs(rules, matchMeta, actor, action, context, args));

export const findFirst = async <
	M extends SelectMeta,
	A extends Actor,
	Act,
	C extends Context,
	R,
>(
	delegate: { findFirst(args: Record<string, unknown>): Promise<R> },
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
	args: Record<string, unknown> = {},
): Promise<R | null> =>
	delegate.findFirst(buildArgs(rules, matchMeta, actor, action, context, args));

export const updateMany = async <
	M extends SelectMeta,
	A extends Actor,
	Act,
	C extends Context,
	R,
>(
	delegate: { updateMany(args: Record<string, unknown>): Promise<R> },
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
	args: Record<string, unknown> = {},
): Promise<R> =>
	delegate.updateMany(
		buildArgs(rules, matchMeta, actor, action, context, args, false),
	);

/** Apply the permit data to Prisma arguments. */
const applyPermitArgs = (
	args: Record<string, unknown>,
	permit: PrismaPermit,
): Record<string, unknown> => {
	const merged: Record<string, unknown> = { ...args };
	if (permit.select) merged.select = permit.select;
	if (permit.where)
		merged.where = mergeWhere(
			args.where as Record<string, unknown>,
			permit.where,
		);
	return merged;
};

export function createAccessRequest<
	M extends SelectMeta,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
): AccessRequest<M, A, Act, C, PrismaPermit> {
	return baseCreateAccessRequest(
		rules,
		matchMeta,
		actor,
		action,
		(rs, mm, a, actn, ctx) => {
			const where = getWhereClause(rs, mm, a, actn, ctx);
			const fields = getSelectedFields(rs, mm, a, actn, ctx);
			return {
				where: Object.keys(where).length ? where : undefined,
				select: fields ? toPrismaSelect(fields) : undefined,
			};
		},
	);
}

/** Wrap a Prisma delegate so that all calls merge in the permit constraints. */
export const withPermit = <R, T extends Record<string, unknown>>(
	delegate: {
		findMany?: (args: Record<string, unknown>) => Promise<R>;
		findFirst?: (args: Record<string, unknown>) => Promise<R>;
		updateMany?: (args: Record<string, unknown>) => Promise<R>;
	},
	permit: PrismaPermit,
) => ({
	findMany: async (args: Record<string, unknown> = {}) =>
		delegate.findMany?.(applyPermitArgs(args, permit)),
	findFirst: async (args: Record<string, unknown> = {}) =>
		delegate.findFirst?.(applyPermitArgs(args, permit)) ?? null,
	updateMany: async (args: Record<string, unknown> = {}) =>
		delegate.updateMany?.(applyPermitArgs(args, permit)),
});

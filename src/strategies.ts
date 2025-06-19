import type { Actor, Context, MetaMatcher, Rule } from "@/types";
import { RuleEngine } from "@/engine";
import { matchCondition } from "@/conditions";

/** Meta information for role based strategies. */
export interface RoleMeta extends Record<string, unknown> {
	readonly role?: string | readonly string[];
}

/** Meta information for role and operation strategies. */
export interface RoleOperationMeta extends RoleMeta {
	readonly operation?: string;
}

/** Meta information for resource, role and operation strategies. */
export interface ResourceRoleOperationMeta extends RoleOperationMeta {
	readonly resource?: string;
}

/**
 * Additional attribute matching information. The `key` property refers
 * to a field on the context that should match either a specific value
 * or a property on the actor when `reference` is defined.
 */
export interface AttributeMatcher<A extends Actor = Actor> {
	readonly key: string;
	readonly value?: unknown;
	readonly reference?: keyof A;
}

export interface ResourceRoleOperationAttributeMeta<A extends Actor = Actor>
	extends ResourceRoleOperationMeta {
	readonly attribute?: AttributeMatcher<A>;
}

/** Utility to check if an actor possesses a role. */
const hasRole = (actor: Actor, role?: string | readonly string[]): boolean => {
	if (role === undefined) return true;
	const roles = Array.isArray(role) ? role : [role];
	return roles.includes((actor as { role?: string }).role ?? "");
};

/**
 * Meta matcher utilities implementing progressively more advanced
 * strategies. Each matcher builds on the previous one in line with the
 * open-closed principle.
 */

/** Matcher for role based meta information. */
function matchRole<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(meta: RoleMeta | undefined, actor: A, _action: Act, _context: C): boolean {
	if (!meta || meta.role === undefined) return true;
	const roles = Array.isArray(meta.role) ? meta.role : [meta.role];
	return roles.includes((actor as { role?: string }).role ?? "");
}

/** Matcher for role & operation meta. */
function matchRoleOperation<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	meta: RoleOperationMeta | undefined,
	actor: A,
	action: Act,
	context: C,
): boolean {
	if (matchRole(meta, actor, action, context) === false) return false;
	return meta?.operation === undefined || meta.operation === action;
}

/** Matcher for resource, role & operation meta. */
function matchResourceRoleOperation<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	meta: ResourceRoleOperationMeta | undefined,
	actor: A,
	action: Act,
	context: C,
): boolean {
	if (matchRoleOperation(meta, actor, action, context) === false) return false;
	const resource = (context as { resource?: string }).resource;
	return meta?.resource === undefined || meta.resource === resource;
}

/** Matcher for resource, role, operation & attribute meta. */
function matchResourceRoleOperationAttribute<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	meta: ResourceRoleOperationAttributeMeta<A> | undefined,
	actor: A,
	action: Act,
	context: C,
): boolean {
	if (matchResourceRoleOperation(meta, actor, action, context) === false) {
		return false;
	}
	const attribute = meta?.attribute;
	if (!attribute) return true;
	const value = (context as Record<string, unknown>)[attribute.key];
	if (attribute.reference !== undefined) {
		return (
			value ===
			(actor as Record<string, unknown>)[attribute.reference as string]
		);
	}
	if (attribute.value !== undefined) {
		return value === attribute.value;
	}
	return true;
}

/** Role based engine implementation. */
export class RoleEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<RoleMeta, A, Act, C> {
	constructor(rules?: readonly Rule<RoleMeta>[]) {
		super(matchRole as MetaMatcher<RoleMeta, A, Act, C>, matchCondition, rules);
	}
}

/** Role & operation based engine. */
export class RoleOperationEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<RoleOperationMeta, A, Act, C> {
	constructor(rules?: readonly Rule<RoleOperationMeta>[]) {
		super(
			matchRoleOperation as MetaMatcher<RoleOperationMeta, A, Act, C>,
			matchCondition,
			rules,
		);
	}
}

/** Resource, role & operation engine. */
export class ResourceRoleOperationEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<ResourceRoleOperationMeta, A, Act, C> {
	constructor(rules?: readonly Rule<ResourceRoleOperationMeta>[]) {
		super(
			matchResourceRoleOperation as MetaMatcher<
				ResourceRoleOperationMeta,
				A,
				Act,
				C
			>,
			matchCondition,
			rules,
		);
	}
}

/** Resource, role, operation & attribute engine. */
export class ResourceRoleOperationAttributeEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<ResourceRoleOperationAttributeMeta<A>, A, Act, C> {
	constructor(rules?: readonly Rule<ResourceRoleOperationAttributeMeta<A>>[]) {
		super(
			matchResourceRoleOperationAttribute as MetaMatcher<
				ResourceRoleOperationAttributeMeta<A>,
				A,
				Act,
				C
			>,
			matchCondition,
			rules,
		);
	}
}

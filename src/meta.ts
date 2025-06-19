import type { Actor, Context } from "@/types";

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

/** Additional attribute matching data. */
export interface AttributeMatcher<A extends Actor = Actor> {
	readonly key: string;
	readonly value?: unknown;
	readonly reference?: keyof A;
}

export interface ResourceRoleOperationAttributeMeta<A extends Actor = Actor>
	extends ResourceRoleOperationMeta {
	readonly attribute?: AttributeMatcher<A>;
}

/**
 * Match meta information by comparing every meta property to the combined actor,
 * action and context object. Array values are treated as inclusion lists.
 */
export const matchMeta = <
	M extends Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	meta: M | undefined,
	actor: A,
	action: Act,
	context: C,
): boolean => {
	if (!meta) return true;
	const target: Record<string, unknown> = {
		...(context as Record<string, unknown>),
		...(actor as Record<string, unknown>),
		action,
		operation: action,
	};
	const matches = (expected: unknown, actual: unknown): boolean =>
		Array.isArray(expected) ? expected.includes(actual) : expected === actual;
	return Object.entries(meta).every(([key, val]) => matches(val, target[key]));
};

/**
 * Specialized matcher supporting attribute references against the actor.
 */
export const matchAttributeMeta = <
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
>(
	meta: ResourceRoleOperationAttributeMeta<A> | undefined,
	actor: A,
	action: Act,
	context: C,
): boolean => {
	const { attribute, ...rest } = (meta ??
		{}) as ResourceRoleOperationAttributeMeta<A> & Record<string, unknown>;
	if (
		matchMeta(rest as Record<string, unknown>, actor, action, context) === false
	) {
		return false;
	}
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
};

import type { Actor, Context, MetaMatcher } from "@/types";
import { RuleEngine } from "@/engine";

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
 * Create a matcher that understands RoleMeta. Operations, resources and
 * attributes are optional depending on the strategy used.
 */
const createMatcher = <
	M extends RoleMeta,
	A extends Actor,
	Act = string,
	C extends Context = Context,
>(options: {
	operation?: boolean;
	resource?: boolean;
	attribute?: boolean;
}): MetaMatcher<M, A, Act, C> => {
	return (meta, actor, action, context) => {
		if (!meta) return true;
		if (hasRole(actor, meta.role) === false) return false;
		if (
			options.operation &&
			"operation" in meta &&
			meta.operation !== undefined &&
			meta.operation !== action
		) {
			return false;
		}
		if (
			options.resource &&
			"resource" in meta &&
			meta.resource !== undefined &&
			meta.resource !== (context as { resource?: string }).resource
		) {
			return false;
		}
                if (options.attribute && (meta as Record<string, unknown>).attribute) {
                        const { key, value, reference } = (meta as unknown as {
                                attribute: AttributeMatcher<A>;
                        }).attribute;
			const ctxVal = (context as Record<string, unknown>)[key];
			if (reference !== undefined) {
				if (ctxVal !== (actor as Record<string, unknown>)[reference as string])
					return false;
			} else if (value !== undefined) {
				if (ctxVal !== value) return false;
			}
		}
		return true;
	};
};

/** Role based engine implementation. */
export class RoleEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<RoleMeta, A, Act, C> {
	constructor() {
		super(createMatcher<RoleMeta, A, Act, C>({}));
	}
}

/** Role & operation based engine. */
export class RoleOperationEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<RoleOperationMeta, A, Act, C> {
	constructor() {
		super(createMatcher<RoleOperationMeta, A, Act, C>({ operation: true }));
	}
}

/** Resource, role & operation engine. */
export class ResourceRoleOperationEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<ResourceRoleOperationMeta, A, Act, C> {
	constructor() {
		super(
			createMatcher<ResourceRoleOperationMeta, A, Act, C>({
				operation: true,
				resource: true,
			}),
		);
	}
}

/** Resource, role, operation & attribute engine. */
export class ResourceRoleOperationAttributeEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<ResourceRoleOperationAttributeMeta<A>, A, Act, C> {
	constructor() {
		super(
			createMatcher<ResourceRoleOperationAttributeMeta<A>, A, Act, C>({
				operation: true,
				resource: true,
				attribute: true,
			}),
		);
	}
}

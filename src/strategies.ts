import type { Actor, Context, MetaMatcher, Rule } from "@/types";
import { RuleEngine } from "@/engine";
import { matchCondition } from "@/conditions";
import { matchMeta, matchAttributeMeta } from "@/meta";

import type {
	RoleMeta,
	RoleOperationMeta,
	ResourceRoleOperationMeta,
	AttributeMatcher,
	ResourceRoleOperationAttributeMeta,
} from "@/meta";

/** Role based engine implementation. */
export class RoleEngine<
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
> extends RuleEngine<RoleMeta, A, Act, C> {
	constructor(rules?: readonly Rule<RoleMeta>[]) {
		super(matchMeta as MetaMatcher<RoleMeta, A, Act, C>, matchCondition, rules);
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
			matchMeta as MetaMatcher<RoleOperationMeta, A, Act, C>,
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
			matchMeta as MetaMatcher<ResourceRoleOperationMeta, A, Act, C>,
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
			matchAttributeMeta as MetaMatcher<
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

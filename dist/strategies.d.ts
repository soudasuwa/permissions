import type { Actor, Context, Rule } from "@/types";
import { RuleEngine } from "@/engine";
import type { RoleMeta, RoleOperationMeta, ResourceRoleOperationMeta, ResourceRoleOperationAttributeMeta } from "@/meta";
/** Role based engine implementation. */
export declare class RoleEngine<A extends Actor = Actor, Act = string, C extends Context = Context> extends RuleEngine<RoleMeta, A, Act, C> {
    constructor(rules?: readonly Rule<RoleMeta>[]);
}
/** Role & operation based engine. */
export declare class RoleOperationEngine<A extends Actor = Actor, Act = string, C extends Context = Context> extends RuleEngine<RoleOperationMeta, A, Act, C> {
    constructor(rules?: readonly Rule<RoleOperationMeta>[]);
}
/** Resource, role & operation engine. */
export declare class ResourceRoleOperationEngine<A extends Actor = Actor, Act = string, C extends Context = Context> extends RuleEngine<ResourceRoleOperationMeta, A, Act, C> {
    constructor(rules?: readonly Rule<ResourceRoleOperationMeta>[]);
}
/** Resource, role, operation & attribute engine. */
export declare class ResourceRoleOperationAttributeEngine<A extends Actor = Actor, Act = string, C extends Context = Context> extends RuleEngine<ResourceRoleOperationAttributeMeta<A>, A, Act, C> {
    constructor(rules?: readonly Rule<ResourceRoleOperationAttributeMeta<A>>[]);
}

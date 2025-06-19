import type { Actor, Context, Rule } from "@/types";
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
export interface ResourceRoleOperationAttributeMeta<A extends Actor = Actor> extends ResourceRoleOperationMeta {
    readonly attribute?: AttributeMatcher<A>;
}
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

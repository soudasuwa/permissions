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
export interface ResourceRoleOperationAttributeMeta<A extends Actor = Actor> extends ResourceRoleOperationMeta {
    readonly attribute?: AttributeMatcher<A>;
}
/**
 * Match meta information by comparing every meta property to the combined actor,
 * action and context object. Array values are treated as inclusion lists.
 */
export declare const matchMeta: <M extends Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context>(meta: M | undefined, actor: A, action: Act, context: C) => boolean;
/**
 * Specialized matcher supporting attribute references against the actor.
 */
export declare const matchAttributeMeta: <A extends Actor = Actor, Act = string, C extends Context = Context>(meta: ResourceRoleOperationAttributeMeta<A> | undefined, actor: A, action: Act, context: C) => boolean;

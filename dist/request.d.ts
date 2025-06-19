import type { Actor, Context, Rule, MetaMatcher, Permit, AccessRequest } from "@/types";
export type PermitBuilder<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context, P extends Record<string, unknown> = Record<string, never>> = (rules: readonly Rule<M>[], matchMeta: MetaMatcher<M, A, Act, C>, actor: A, action: Act, context: C) => P;
export declare class AccessRequestBuilder<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context, P extends Record<string, unknown> = Record<string, never>> implements AccessRequest<M, A, Act, C, Permit & P> {
    private readonly rules;
    private readonly matchMeta;
    private readonly actor;
    private readonly action;
    private readonly buildPermit?;
    private context;
    private readonly engine;
    constructor(rules: readonly Rule<M>[], matchMeta: MetaMatcher<M, A, Act, C>, actor: A, action: Act, buildPermit?: PermitBuilder<M, A, Act, C, P> | undefined);
    withContext(ctx: Partial<C>): this;
    with<K extends keyof C>(key: K, value: C[K]): this;
    permit(): Permit & P;
}
export declare function createAccessRequest<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context, P extends Record<string, unknown> = Record<string, never>>(rules: readonly Rule<M>[], matchMeta: MetaMatcher<M, A, Act, C>, actor: A, action: Act, buildPermit?: PermitBuilder<M, A, Act, C, P>): AccessRequestBuilder<M, A, Act, C, P>;

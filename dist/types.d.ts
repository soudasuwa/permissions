export interface Actor {
    readonly [key: string]: unknown;
}
export interface Context {
    readonly [key: string]: unknown;
}
export interface ReferenceCondition {
    readonly reference: {
        readonly actor: keyof Actor;
    };
}
export interface NotCondition {
    readonly not: Condition;
}
export interface InCondition {
    readonly in: readonly (string | number | boolean)[];
}
export type ConditionObject = {
    readonly [key: string]: Condition;
};
export type Condition = string | number | boolean | NotCondition | InCondition | ReferenceCondition | ConditionObject;
export interface Rule<M extends Record<string, unknown> = Record<string, unknown>> {
    readonly meta?: M;
    readonly match?: Readonly<Record<string, Condition>>;
    readonly rules?: readonly Rule<M>[];
}
export type MetaMatcher<M extends Record<string, unknown> = Record<string, unknown>, A extends Actor = Actor, Act = string, C extends Context = Context> = (meta: M | undefined, actor: A, action: Act, context: C) => boolean;

export type StringLiteral = string;
export interface Actor<R extends StringLiteral = StringLiteral> {
    readonly role: R;
    readonly id: string;
    readonly [key: string]: unknown;
}
export interface Context<Res extends StringLiteral = StringLiteral> {
    readonly resource: Res;
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
    readonly in: readonly string[];
}
export type ConditionObject = {
    readonly [key: string]: Condition;
};
export type Condition = string | number | boolean | NotCondition | InCondition | ReferenceCondition | ConditionObject;
export interface RuleMeta<R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral> {
    readonly role?: R | readonly R[];
    readonly resource?: Res;
    readonly operation?: O;
}
export interface Rule<R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral> {
    readonly meta?: RuleMeta<R, O, Res>;
    readonly match?: Readonly<Record<string, Condition>>;
    readonly rules?: readonly Rule<R, O, Res>[];
}
export declare const matchCondition: <R extends StringLiteral>(value: unknown, condition: Condition, actor: Actor<R>) => boolean;
export declare const matchesMeta: <R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral>(meta: RuleMeta<R, O, Res> | undefined, actor: Actor<R>, action: O, context: Context<Res>) => boolean;
export declare const matchesRule: <R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral>(rule: Rule<R, O, Res>, actor: Actor<R>, action: O, context: Context<Res>) => boolean;
/**
 * Evaluates rules in an object-oriented manner to keep logic
 * encapsulated and reusable.
 */
export declare class RuleEngine<R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral> {
    private readonly rules;
    constructor(rules: readonly Rule<R, O, Res>[]);
    /**
     * Determine if the given actor can perform an action on the context.
     */
    checkAccess(actor: Actor<R>, action: O, context: Context<Res>): boolean;
    private evaluateRules;
}
export declare const checkAccess: <R extends StringLiteral = StringLiteral, O extends StringLiteral = StringLiteral, Res extends StringLiteral = StringLiteral>(rules: readonly Rule<R, O, Res>[], actor: Actor<R>, action: O, context: Context<Res>) => boolean;

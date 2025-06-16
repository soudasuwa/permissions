export declare const isObject: (val: unknown) => val is Record<string, unknown>;
export declare const isNotCondition: (val: unknown) => val is import("@/types").NotCondition;
export declare const isInCondition: (val: unknown) => val is import("@/types").InCondition;
export declare const isReferenceCondition: (val: unknown) => val is import("@/types").ReferenceCondition;
export declare const isConditionObject: (val: unknown) => val is import("@/types").ConditionObject;

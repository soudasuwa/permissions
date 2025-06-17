export const isObject = (val: unknown): val is Record<string, unknown> =>
	typeof val === "object" && val !== null && Array.isArray(val) === false;

export const isNotCondition = (
	val: unknown,
): val is import("@/types").NotCondition => isObject(val) && "not" in val;

export const isInCondition = (
	val: unknown,
): val is import("@/types").InCondition =>
	isObject(val) && "in" in val && Array.isArray((val as { in: unknown }).in);

export const isReferenceCondition = (
	val: unknown,
): val is import("@/types").ReferenceCondition =>
	isObject(val) && "reference" in val;

export const isConditionObject = (
	val: unknown,
): val is import("@/types").ConditionObject =>
	isObject(val) &&
	!isNotCondition(val) &&
	!isInCondition(val) &&
	!isReferenceCondition(val);

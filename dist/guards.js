export const isObject = (val) => typeof val === "object" && val !== null && !Array.isArray(val);
export const isNotCondition = (val) => isObject(val) && "not" in val;
export const isInCondition = (val) => isObject(val) && "in" in val && Array.isArray(val.in);
export const isReferenceCondition = (val) => isObject(val) && "reference" in val;
export const isConditionObject = (val) => isObject(val) &&
    !isNotCondition(val) &&
    !isInCondition(val) &&
    !isReferenceCondition(val);

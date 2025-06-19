/**
 * Match meta information by comparing every meta property to the combined actor,
 * action and context object. Array values are treated as inclusion lists.
 */
export const matchMeta = (meta, actor, action, context) => {
    if (!meta)
        return true;
    const target = {
        ...context,
        ...actor,
        action,
        operation: action,
    };
    const matches = (expected, actual) => Array.isArray(expected) ? expected.includes(actual) : expected === actual;
    return Object.entries(meta).every(([key, val]) => matches(val, target[key]));
};
/**
 * Specialized matcher supporting attribute references against the actor.
 */
export const matchAttributeMeta = (meta, actor, action, context) => {
    const { attribute, ...rest } = (meta ??
        {});
    if (matchMeta(rest, actor, action, context) === false) {
        return false;
    }
    if (!attribute)
        return true;
    const value = context[attribute.key];
    if (attribute.reference !== undefined) {
        return (value ===
            actor[attribute.reference]);
    }
    if (attribute.value !== undefined) {
        return value === attribute.value;
    }
    return true;
};

import { RuleEngine } from "@/engine";
/** Utility to check if an actor possesses a role. */
const hasRole = (actor, role) => {
    if (role === undefined)
        return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(actor.role ?? "");
};
/**
 * Create a matcher that understands RoleMeta. Operations, resources and
 * attributes are optional depending on the strategy used.
 */
const createMatcher = (options) => {
    return (meta, actor, action, context) => {
        if (!meta)
            return true;
        if (hasRole(actor, meta.role) === false)
            return false;
        if (options.operation &&
            "operation" in meta &&
            meta.operation !== undefined &&
            meta.operation !== action) {
            return false;
        }
        if (options.resource &&
            "resource" in meta &&
            meta.resource !== undefined &&
            meta.resource !== context.resource) {
            return false;
        }
        if (options.attribute && meta.attribute) {
            const { key, value, reference } = meta.attribute;
            const ctxVal = context[key];
            if (reference !== undefined) {
                if (ctxVal !== actor[reference])
                    return false;
            }
            else if (value !== undefined) {
                if (ctxVal !== value)
                    return false;
            }
        }
        return true;
    };
};
/** Role based engine implementation. */
export class RoleEngine extends RuleEngine {
    constructor() {
        super(createMatcher({}));
    }
}
/** Role & operation based engine. */
export class RoleOperationEngine extends RuleEngine {
    constructor() {
        super(createMatcher({ operation: true }));
    }
}
/** Resource, role & operation engine. */
export class ResourceRoleOperationEngine extends RuleEngine {
    constructor() {
        super(createMatcher({
            operation: true,
            resource: true,
        }));
    }
}
/** Resource, role, operation & attribute engine. */
export class ResourceRoleOperationAttributeEngine extends RuleEngine {
    constructor() {
        super(createMatcher({
            operation: true,
            resource: true,
            attribute: true,
        }));
    }
}

const matchCondition = (value, condition, actor) => {
        if (typeof condition === "object" && !Array.isArray(condition)) {
                if ("not" in condition) return value !== condition.not
                if ("in" in condition) return condition.in.includes(value)
                if ("reference" in condition)
                        return value === actor?.[condition.reference.actor]
                return Object.keys(condition).every((key) =>
                        matchCondition(value?.[key], condition[key], actor)
                )
        }
        return value === condition
}

const evaluateRules = (ruleList, actor, action, context = {}, depth = 0) => {
        for (const rule of ruleList) {
                if (
                        rule.role &&
                        typeof rule.role === "string" &&
                        rule.role !== actor.role
                )
                        continue
                if (rule.roles && !rule.roles.includes(actor.role)) continue

                if (rule.resource && typeof rule.resource === "object") {
                        if (rule.resource.name !== context.resource) continue
                        if (rule.resource.rules) {
                                if (
                                        !evaluateRules(
                                                rule.resource.rules,
                                                actor,
                                                action,
                                                context,
                                                depth + 1
                                        )
                                )
                                        return false
                        }
                }

                if (rule.operation && rule.operation !== action) continue
                if (rule.status && !matchCondition(context.status, rule.status, actor))
                        continue
                if (rule.payload && !matchCondition(context.payload, rule.payload, actor))
                        continue
                if (rule.userId && !matchCondition(context.userId, rule.userId, actor))
                        continue

                if (rule.rules) {
                        if (!evaluateRules(rule.rules, actor, action, context, depth + 1))
                                continue
                }

                if (rule.operation === action || !rule.operation) {
                        return true
                }
        }

        return false
}

export const checkAccess = (rules, actor, action, context) => {
        const topLevelResourceRules = rules.filter(
                (r) => r.resource?.name === context.resource
        )

        for (const resourceRule of topLevelResourceRules) {
                if (
                        !evaluateRules(resourceRule.resource.rules, actor, action, context)
                ) {
                        return false
                }
        }

        const roleRules = rules
                .filter((r) => r.role?.name === actor.role)
                .flatMap((r) => r.role.rules ?? [])

        return evaluateRules(roleRules, actor, action, context)
}


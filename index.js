// TODO remove comments
// TODO improve coding style and standards for modern js

// Utility to deeply match a rule condition (simple matcher, can be extended)
function matchCondition(value, condition) {
	if (typeof condition === "object" && !Array.isArray(condition)) {
		if ("not" in condition) return value !== condition.not
		if ("in" in condition) return condition.in.includes(value)
		if ("reference" in condition) return value === condition.reference.actor // only handles actor.id now
		return Object.keys(condition).every((key) =>
			matchCondition(value?.[key], condition[key])
		)
	}
	return value === condition
}

// Core rule evaluator
function evaluateRules(ruleList, actor, action, context = {}, depth = 0) {
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
		if (rule.status && !matchCondition(context.status, rule.status))
			continue
		if (rule.payload && !matchCondition(context.payload, rule.payload))
			continue
		if (rule.userId && !matchCondition(context.userId, rule.userId))
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

// Apply global top-level rules first
export function checkAccess(rules, actor, action, context) {
	// Extract global rules for the resource
	const topLevelResourceRules = rules.filter(
		(r) => r.resource?.name === context.resource
	)

	for (const resourceRule of topLevelResourceRules) {
		if (
			!evaluateRules(resourceRule.resource.rules, actor, action, context)
		) {
			return false // short-circuit if top-level denies
		}
	}

	// If top-level rules passed, check role-specific rules
	const roleRules = rules.filter((r) => r.role?.name === actor.role)

	return evaluateRules(roleRules, actor, action, context)
}

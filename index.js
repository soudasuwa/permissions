const matchCondition = (value, condition, actor) => {
	if (typeof condition === "object" && !Array.isArray(condition)) {
		if ("not" in condition) return value !== condition.not;
		if ("in" in condition) return condition.in.includes(value);
		if ("reference" in condition) {
			return value === actor?.[condition.reference.actor];
		}
		return Object.keys(condition).every((key) =>
			matchCondition(value?.[key], condition[key], actor),
		);
	}
	return value === condition;
};

const matchesRule = (rule, context, actor) => {
	if (!rule.match) return true;
	return Object.entries(rule.match).every(([key, cond]) =>
		matchCondition(context?.[key], cond, actor),
	);
};

const evaluateRules = (ruleList, actor, action, context = {}) => {
	for (const rule of ruleList) {
		if (rule.role && typeof rule.role === "string" && rule.role !== actor.role)
			continue;
		if (rule.roles && !rule.roles.includes(actor.role)) continue;

		if (rule.resource && typeof rule.resource === "object") {
			if (rule.resource.name !== context.resource) continue;
			if (rule.resource.rules) {
				if (!evaluateRules(rule.resource.rules, actor, action, context)) {
					return false;
				}
			}
		}

		if (rule.operation && rule.operation !== action) continue;

		if (!matchesRule(rule, context, actor)) continue;

		if (rule.rules) {
			if (!evaluateRules(rule.rules, actor, action, context)) continue;
		}

		if (!rule.operation || rule.operation === action) {
			return true;
		}
	}

	return false;
};

export const checkAccess = (rules, actor, action, context) => {
	const resourceRules = rules.filter(
		(r) => r.resource?.name === context.resource,
	);

	if (
		resourceRules.some(
			(rr) => !evaluateRules(rr.resource.rules ?? [], actor, action, context),
		)
	) {
		return false;
	}

	const roleRules = rules
		.filter((r) => r.role?.name === actor.role)
		.flatMap((r) => r.role.rules ?? []);

	return evaluateRules(roleRules, actor, action, context);
};

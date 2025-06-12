export var Role;
((Role) => {
	Role["Module"] = "module";
	Role["Admin"] = "admin";
	Role["User"] = "user";
})(Role || (Role = {}));
export var Operation;
((Operation) => {
	Operation["Create"] = "create";
	Operation["Edit"] = "edit";
	Operation["View"] = "view";
	Operation["Pay"] = "pay";
})(Operation || (Operation = {}));
export var InvoiceStatus;
((InvoiceStatus) => {
	InvoiceStatus["Generating"] = "Generating";
	InvoiceStatus["Draft"] = "Draft";
	InvoiceStatus["Pending"] = "Pending";
	InvoiceStatus["Complete"] = "Complete";
})(InvoiceStatus || (InvoiceStatus = {}));
export const matchCondition = (value, condition, actor) => {
	if (condition && typeof condition === "object" && !Array.isArray(condition)) {
		if ("not" in condition) return !matchCondition(value, condition.not, actor);
		if ("in" in condition) return condition.in.includes(value);
		if ("reference" in condition) {
			return value === actor?.[condition.reference.actor];
		}
		return Object.entries(condition).every(([k, c]) =>
			matchCondition(value?.[k], c, actor),
		);
	}
	return value === condition;
};
export const matchesRule = (rule, actor, action, context) => {
	if (rule.role) {
		const roles = Array.isArray(rule.role) ? rule.role : [rule.role];
		if (!roles.includes(actor.role)) return false;
	}
	if (rule.resource && rule.resource !== context.resource) return false;
	if (rule.operation && rule.operation !== action) return false;
	if (rule.match) {
		for (const [field, cond] of Object.entries(rule.match)) {
			if (!matchCondition(context?.[field], cond, actor)) return false;
		}
	}
	return true;
};
export const evaluateRules = (rules, actor, action, context) => {
	return rules.some((r) => {
		if (!matchesRule(r, actor, action, context)) return false;
		return r.rules ? evaluateRules(r.rules, actor, action, context) : true;
	});
};
export const checkAccess = (rules, actor, action, context) =>
	evaluateRules(rules, actor, action, context);

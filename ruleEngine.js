// ----------------------------------------
// Access Control Rule Evaluator
// ----------------------------------------

function getValue(path, context) {
	const parts = path.split(".");
	return parts.reduce((obj, key) => (obj ? obj[key] : undefined), context);
}

function compare(attr, expected, context) {
	const actual = getValue(attr, context);

	if (typeof expected === "object" && expected !== null) {
		if ("in" in expected) {
			const arr =
				typeof expected.in === "object" &&
				expected.in !== null &&
				"reference" in expected.in
					? getValue(expected.in.reference, context)
					: expected.in;
			return Array.isArray(arr) && arr.includes(actual);
		}
		if ("not" in expected) {
			return actual !== expected.not;
		}
		if ("reference" in expected) {
			const ref = getValue(expected.reference, context);
			return actual === ref;
		}
		if ("greaterThan" in expected) {
			return actual > expected.greaterThan;
		}
		if ("lessThan" in expected) {
			return actual < expected.lessThan;
		}
		if ("exists" in expected) {
			return expected.exists ? actual !== undefined : actual === undefined;
		}
		return false;
	}

	return actual === expected;
}

function isComparison(obj) {
	return (
		obj &&
		typeof obj === "object" &&
		("in" in obj ||
			"not" in obj ||
			"reference" in obj ||
			"greaterThan" in obj ||
			"lessThan" in obj ||
			"exists" in obj)
	);
}

function evaluateRule(rule, context) {
	if (Array.isArray(rule)) {
		for (const r of rule) {
			if (!evaluateRule(r, context)) return false;
		}
		return true;
	}

	if (typeof rule !== "object" || rule === null) {
		return false;
	}

	if ("AND" in rule) {
		for (const subRule of rule.AND) {
			if (!evaluateRule(subRule, context)) return false;
		}
		return true;
	}

	if ("OR" in rule) {
		const sub = rule.OR;
		const subRules = Array.isArray(sub)
			? sub
			: Object.entries(sub).map(([k, v]) => ({ [k]: v }));
		for (const subRule of subRules) {
			if (evaluateRule(subRule, context)) return true;
		}
		return false;
	}

	if ("NOT" in rule) {
		return !evaluateRule(rule.NOT, context);
	}

	const entries = Object.entries(rule);
	if (entries.length > 1) {
		// Treat multiple key/value pairs as an implicit AND
		for (const [k, v] of entries) {
			if (!evaluateRule({ [k]: v }, context)) return false;
		}
		return true;
	}

	const [key, expected] = entries[0];

	if (
		typeof expected === "object" &&
		expected !== null &&
		!isComparison(expected)
	) {
		// Nested path object: expand keys with prefix
		for (const [subKey, subVal] of Object.entries(expected)) {
			const nested = { [`${key}.${subKey}`]: subVal };
			if (!evaluateRule(nested, context)) return false;
		}
		return true;
	}

	return compare(key, expected, context);
}
// Determine whether a context is allowed under a rule set.
// The rule engine does not know or care which attributes are present in the
// context. Each rule is simply evaluated and if any rule returns true, access
// is granted.
// Evaluate a list of rules against a context. Each rule may contain an optional
// `when` property that itself is a rule evaluated first. If the `when` rule
// matches, the engine then evaluates the rule's `rule` property. Access is
// granted if any rule passes. The engine does not expect any specific attribute
// names in either the rules or the context.
function authorize(rules, context) {
	if (!Array.isArray(rules)) return false;
	return rules.some((r) => {
		if (typeof r !== "object" || r === null) return false;
		const when = "when" in r ? r.when : undefined;

		if (when && !evaluateRule(when, context)) return false;

		if (Array.isArray(r.rules)) {
			return authorize(r.rules, context);
		}

		const rule = "rule" in r ? r.rule : undefined;
		if (rule) return evaluateRule(rule, context);
		return evaluateRule(when, context);
	});
}

module.exports = { evaluateRule, authorize };

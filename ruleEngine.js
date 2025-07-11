// ----------------------------------------
// Access Control Rule Evaluator
// ----------------------------------------

const defaultResolver = {
	resolve(path, ctx) {
		return path
			.split(".")
			.reduce((obj, key) => (obj ? obj[key] : undefined), ctx);
	},
};

const defaultLogic = [
	{
		type: "AND",
		match: Array.isArray,
		evaluate: (node, ctx, ev) =>
			node.every((r) => ev.evaluateRule(r, ctx).passed),
	},
	{
		type: "AND",
		match: (n) => typeof n === "object" && n !== null && "AND" in n,
		evaluate: (n, ctx, ev) => {
			const arr = Array.isArray(n.AND)
				? n.AND
				: Object.entries(n.AND).map(([k, v]) => ({ [k]: v }));
			return arr.every((r) => ev.evaluateRule(r, ctx).passed);
		},
	},
	{
		type: "OR",
		match: (n) => typeof n === "object" && n !== null && "OR" in n,
		evaluate: (n, ctx, ev) => {
			const sub = n.OR;
			const arr = Array.isArray(sub)
				? sub
				: Object.entries(sub).map(([k, v]) => ({ [k]: v }));
			return arr.some((r) => ev.evaluateRule(r, ctx).passed);
		},
	},
	{
		type: "NOT",
		match: (n) => typeof n === "object" && n !== null && "NOT" in n,
		evaluate: (n, ctx, ev) => !ev.evaluateRule(n.NOT, ctx).passed,
	},
];

const inCompare = {
	type: "in",
	match: (_, exp) => typeof exp === "object" && exp !== null && "in" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		const arr =
			typeof exp.in === "object" && exp.in !== null && "reference" in exp.in
				? ev.contextResolver.resolve(exp.in.reference, ctx)
				: exp.in;
		return Array.isArray(arr) && arr.includes(actual);
	},
};

const notCompare = {
	type: "not",
	match: (_, exp) => typeof exp === "object" && exp !== null && "not" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		return actual !== exp.not;
	},
};

const referenceCompare = {
	type: "reference",
	match: (_, exp) =>
		typeof exp === "object" && exp !== null && "reference" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		const ref = ev.contextResolver.resolve(exp.reference, ctx);
		return actual === ref;
	},
};

const greaterThanCompare = {
	type: "greaterThan",
	match: (_, exp) =>
		typeof exp === "object" && exp !== null && "greaterThan" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		return actual > exp.greaterThan;
	},
};

const lessThanCompare = {
	type: "lessThan",
	match: (_, exp) =>
		typeof exp === "object" && exp !== null && "lessThan" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		return actual < exp.lessThan;
	},
};

const existsCompare = {
	type: "exists",
	match: (_, exp) => typeof exp === "object" && exp !== null && "exists" in exp,
	evaluate(attr, exp, ctx, ev) {
		const actual = ev.contextResolver.resolve(attr, ctx);
		return exp.exists ? actual !== undefined : actual === undefined;
	},
};

const defaultCompare = [
	inCompare,
	notCompare,
	referenceCompare,
	greaterThanCompare,
	lessThanCompare,
	existsCompare,
];

const defaultNodes = [
	{
		type: "rule-group",
		match: (n) =>
			typeof n === "object" &&
			n !== null &&
			"when" in n &&
			Array.isArray(n.rules),
		evaluate: (n, ctx, ev) => {
			const whenRes = ev.evaluateRule(n.when, ctx);
			const ruleRes = ev.authorizeRules(n.rules, ctx);
			return {
				type: "rule-group",
				passed: whenRes.passed && ruleRes.passed,
				children: [whenRes, ruleRes],
			};
		},
	},
	{
		type: "when-rule",
		match: (n) =>
			typeof n === "object" && n !== null && "when" in n && "rule" in n,
		evaluate: (n, ctx, ev) => {
			const whenRes = ev.evaluateRule(n.when, ctx);
			const ruleRes = ev.evaluateRule(n.rule, ctx);
			return {
				type: "when-rule",
				passed: whenRes.passed && ruleRes.passed,
				children: [whenRes, ruleRes],
			};
		},
	},
	{
		type: "rule-wrapper",
		match: (n) => typeof n === "object" && n !== null && "rule" in n,
		evaluate: (n, ctx, ev) => ev.evaluateRule(n.rule, ctx),
	},
	{
		type: "when-wrapper",
		match: (n) => typeof n === "object" && n !== null && "when" in n,
		evaluate: (n, ctx, ev) => ev.evaluateRule(n.when, ctx),
	},
	{
		type: "object",
		match: (n) => typeof n === "object" && n !== null,
		evaluate: (n, ctx, ev) => ev.evaluateRule(n, ctx),
	},
];

class DefaultEvaluator {
	constructor(options = {}) {
		const {
			logic = [],
			compare = [],
			nodes = [],
			contextResolver = defaultResolver,
		} = options;
		this.logicHandlers = [...defaultLogic, ...logic];
		this.compareHandlers = [...defaultCompare, ...compare];
		this.nodeHandlers = [...nodes, ...defaultNodes];
		this.contextResolver = contextResolver;
	}
	isComparison(attr, obj) {
		return this.compareHandlers.some((c) => c.match(attr, obj));
	}

	compare(attr, expected, ctx) {
		for (const cmp of this.compareHandlers) {
			if (cmp.match(attr, expected)) {
				const actual = this.contextResolver.resolve(attr, ctx);
				const res = cmp.evaluate(attr, expected, ctx, this);
				const node =
					res && typeof res === "object" && "passed" in res
						? { type: cmp.type || res.type || "compare", ...res }
						: {
								type: cmp.type || "compare",
								passed: !!res,
							};
				return {
					...node,
					path: attr,
					value: actual,
					expected:
						typeof expected === "object" &&
						expected !== null &&
						"in" in expected
							? expected.in
							: expected,
				};
			}
		}
		const actual = this.contextResolver.resolve(attr, ctx);
		const passed = actual === expected;
		return { type: "compare", passed, path: attr, value: actual, expected };
	}

	computeChildren(rule, ctx) {
		if (Array.isArray(rule)) {
			return rule.map((r) => this.evaluateRule(r, ctx));
		}
		if (typeof rule === "object" && rule !== null) {
			if ("AND" in rule) {
				const arr = Array.isArray(rule.AND)
					? rule.AND
					: Object.entries(rule.AND).map(([k, v]) => ({ [k]: v }));
				return arr.map((r) => this.evaluateRule(r, ctx));
			}
			if ("OR" in rule) {
				const sub = rule.OR;
				const arr = Array.isArray(sub)
					? sub
					: Object.entries(sub).map(([k, v]) => ({ [k]: v }));
				return arr.map((r) => this.evaluateRule(r, ctx));
			}
			if ("NOT" in rule) {
				return [this.evaluateRule(rule.NOT, ctx)];
			}
		}
		return [];
	}

	evaluateNode(node, ctx) {
		if (typeof node !== "object" || node === null) {
			return { type: "node", passed: false };
		}
		for (const h of this.nodeHandlers) {
			if (h.match(node)) {
				const res = h.evaluate(node, ctx, this);
				return res && typeof res === "object" && "passed" in res
					? { type: h.type || res.type || "node", ...res }
					: { type: h.type || "node", passed: !!res };
			}
		}
		return { type: "node", passed: false };
	}

	evaluateRule(rule, ctx) {
		for (const h of this.logicHandlers) {
			if (h.match(rule)) {
				const res = h.evaluate(rule, ctx, this);
				if (res && typeof res === "object" && "passed" in res) {
					return { type: h.type || res.type || "logic", ...res };
				}
				const children = this.computeChildren(rule, ctx);
				return { type: h.type || "logic", passed: !!res, children };
			}
		}

		if (typeof rule !== "object" || rule === null) {
			return { type: "invalid", passed: false };
		}

		const entries = Object.entries(rule);
		if (entries.length > 1) {
			const children = entries.map(([k, v]) =>
				this.evaluateRule({ [k]: v }, ctx),
			);
			return {
				type: "AND",
				passed: children.every((c) => c.passed),
				children,
			};
		}

		const [key, expected] = entries[0];

		if (
			typeof expected === "object" &&
			expected !== null &&
			!this.isComparison(key, expected)
		) {
			const children = Object.entries(expected).map(([subKey, subVal]) =>
				this.evaluateRule({ [`${key}.${subKey}`]: subVal }, ctx),
			);
			return {
				type: "AND",
				passed: children.every((c) => c.passed),
				children,
			};
		}

		return this.compare(key, expected, ctx);
	}

	evaluate(rule, ctx) {
		return this.evaluateRule(rule, ctx);
	}

	authorizeRules(rules, ctx) {
		if (!Array.isArray(rules)) {
			return { type: "rules", passed: false, children: [] };
		}
		const children = rules.map((r) => this.evaluateNode(r, ctx));
		return { type: "rules", passed: children.some((c) => c.passed), children };
	}

	authorize(rules, ctx) {
		return this.authorizeRules(rules, ctx);
	}
}

const defaultEvaluator = new DefaultEvaluator();

function unwrap(value) {
	return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function wrap(obj) {
	const raw = Object.fromEntries(
		Object.entries(obj).map(([k, v]) => [k, unwrap(v)]),
	);
	return { ...raw, toJSON: () => raw };
}

function field(path, expected) {
	return wrap({ [path]: unwrap(expected) });
}

function ref(path) {
	return wrap({ reference: path });
}

function and(...rules) {
	return wrap({ AND: rules.map(unwrap) });
}

function or(...rules) {
	return wrap({ OR: rules.map(unwrap) });
}

function not(rule) {
	return wrap({ NOT: unwrap(rule) });
}

function fromJSON(obj) {
	return wrap(obj);
}

module.exports = {
	DefaultEvaluator,
	evaluateRule: defaultEvaluator.evaluate.bind(defaultEvaluator),
	authorize: defaultEvaluator.authorize.bind(defaultEvaluator),
	field,
	ref,
	and,
	or,
	not,
	fromJSON,
};

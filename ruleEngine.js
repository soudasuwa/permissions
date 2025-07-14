// ----------------------------------------
// Access Control Rule Evaluator (pattern-based)
// ----------------------------------------

const defaultResolver = {
	resolve(path, ctx) {
		return path.split(".").reduce((o, k) => (o ? o[k] : undefined), ctx);
	},
};

function createBinaryComparePattern(type, key, operator, resolveExpected) {
	return {
		type,
		match: (_, exp) => typeof exp === "object" && exp !== null && key in exp,
		resolve(attr, exp, ctx, ev) {
			const expected = resolveExpected
				? resolveExpected(exp[key], ctx, ev)
				: exp[key];
			return {
				path: attr,
				value: ev.contextResolver.resolve(attr, ctx),
				expected,
			};
		},
		evaluate({ value, expected }) {
			return operator(value, expected);
		},
	};
}

const inCompare = {
	type: "in",
	match: (_, exp) => typeof exp === "object" && exp !== null && "in" in exp,
	resolve(attr, exp, ctx, ev) {
		let list = exp.in;
		if (typeof list === "object" && list !== null && "reference" in list) {
			list = ev.contextResolver.resolve(list.reference, ctx);
		}
		return {
			path: attr,
			value: ev.contextResolver.resolve(attr, ctx),
			expected: list,
		};
	},
	evaluate({ value, expected }) {
		return Array.isArray(expected) && expected.includes(value);
	},
};

const notCompare = createBinaryComparePattern("not", "not", (a, b) => a !== b);
const referenceCompare = createBinaryComparePattern(
	"reference",
	"reference",
	(a, b) => a === b,
	(p, ctx, ev) => ev.contextResolver.resolve(p, ctx),
);
const greaterThanCompare = createBinaryComparePattern(
	"greaterThan",
	"greaterThan",
	(a, b) => a > b,
);
const lessThanCompare = createBinaryComparePattern(
	"lessThan",
	"lessThan",
	(a, b) => a < b,
);
const existsCompare = createBinaryComparePattern(
	"exists",
	"exists",
	(val, flag) => (flag ? val !== undefined : val === undefined),
);

const defaultCompare = [
	inCompare,
	notCompare,
	referenceCompare,
	greaterThanCompare,
	lessThanCompare,
	existsCompare,
];

const arrayAndLogic = {
	type: "AND",
	match: Array.isArray,
	evaluate(arr, ctx, ev) {
		const children = arr.map((r) => ev.evaluateRule(r, ctx));
		return { passed: children.every((c) => c.passed), children };
	},
};

const andLogic = {
	type: "AND",
	match: (n) => typeof n === "object" && n !== null && "AND" in n,
	resolve(node) {
		return Array.isArray(node.AND)
			? node.AND
			: Object.entries(node.AND).map(([k, v]) => ({ [k]: v }));
	},
	evaluate(rules, ctx, ev) {
		const children = rules.map((r) => ev.evaluateRule(r, ctx));
		return { passed: children.every((c) => c.passed), children };
	},
};

const orLogic = {
	type: "OR",
	match: (n) => typeof n === "object" && n !== null && "OR" in n,
	resolve(node) {
		return Array.isArray(node.OR)
			? node.OR
			: Object.entries(node.OR).map(([k, v]) => ({ [k]: v }));
	},
	evaluate(rules, ctx, ev) {
		const children = rules.map((r) => ev.evaluateRule(r, ctx));
		return { passed: children.some((c) => c.passed), children };
	},
};

const notLogic = {
	type: "NOT",
	match: (n) => typeof n === "object" && n !== null && "NOT" in n,
	resolve: (node) => node.NOT,
	evaluate(rule, ctx, ev) {
		const child = ev.evaluateRule(rule, ctx);
		return { passed: !child.passed, children: [child] };
	},
};

const defaultLogic = [arrayAndLogic, andLogic, orLogic, notLogic];

const whenRuleNode = {
	type: "when-rule",
	match: (n) =>
		typeof n === "object" && n !== null && "when" in n && "rule" in n,
	evaluate(node, ctx, ev) {
		const whenRes = ev.evaluateRule(node.when, ctx);
		const ruleRes = whenRes.passed
			? ev.evaluateRule(node.rule, ctx)
			: { type: "rule", passed: false };
		return {
			passed: whenRes.passed && ruleRes.passed,
			children: [whenRes, ruleRes],
		};
	},
};

const ruleGroupNode = {
	type: "rule-group",
	match: (n) =>
		typeof n === "object" &&
		n !== null &&
		"when" in n &&
		Array.isArray(n.rules),
	evaluate(node, ctx, ev) {
		const whenRes = ev.evaluateRule(node.when, ctx);
		const rulesRes = whenRes.passed
			? ev.authorize(node.rules, ctx)
			: { type: "rules", passed: false, children: [] };
		return {
			passed: whenRes.passed && rulesRes.passed,
			children: [whenRes, rulesRes],
		};
	},
};

const defaultNodes = [whenRuleNode, ruleGroupNode];

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
		this.nodeHandlers = [...defaultNodes, ...nodes];
		this.contextResolver = contextResolver;
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

	findCompare(attr, expected) {
		return this.compareHandlers.find((c) => c.match(attr, expected));
	}

	compareValue(attr, expected, ctx) {
		const handler = this.findCompare(attr, expected);
		if (handler) {
			if (handler.validate) handler.validate(expected);
			if (handler.resolve) {
				const resolved = handler.resolve(attr, expected, ctx, this);
				const outcome = handler.evaluate(resolved, ctx, this);
				if (outcome && typeof outcome === "object" && "passed" in outcome) {
					return { type: handler.type, ...resolved, ...outcome };
				}
				return { type: handler.type, ...resolved, passed: !!outcome };
			}
			const outcome = handler.evaluate(attr, expected, ctx, this);
			if (outcome && typeof outcome === "object" && "passed" in outcome) {
				return { type: handler.type, ...outcome };
			}
			const value = this.contextResolver.resolve(attr, ctx);
			return {
				type: handler.type,
				path: attr,
				value,
				expected,
				passed: !!outcome,
			};
		}
		const value = this.contextResolver.resolve(attr, ctx);
		return {
			type: "compare",
			path: attr,
			value,
			expected,
			passed: value === expected,
		};
	}

	evaluateNode(node, ctx) {
		for (const h of this.nodeHandlers) {
			if (h.match(node)) {
				const res = h.evaluate(node, ctx, this);
				return { type: h.type, ...res };
			}
		}
		return this.evaluateRule(node, ctx);
	}

	evaluateRule(rule, ctx) {
		for (const logic of this.logicHandlers) {
			if (logic.match(rule)) {
				if (logic.validate) logic.validate(rule);
				const resolved = logic.resolve ? logic.resolve(rule, ctx, this) : rule;
				const outcome = logic.evaluate(resolved, ctx, this);
				if (outcome && typeof outcome === "object" && "passed" in outcome) {
					return { type: logic.type, ...outcome };
				}
				const children = this.computeChildren(rule, ctx);
				return { type: logic.type, passed: !!outcome, children };
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
			return { type: "AND", passed: children.every((c) => c.passed), children };
		}

		const [attr, val] = entries[0];
		if (
			typeof val === "object" &&
			val !== null &&
			!this.findCompare(attr, val)
		) {
			const children = Object.entries(val).map(([sub, subVal]) =>
				this.evaluateRule({ [`${attr}.${sub}`]: subVal }, ctx),
			);
			return { type: "AND", passed: children.every((c) => c.passed), children };
		}

		return this.compareValue(attr, val, ctx);
	}

	evaluate(rule, ctx) {
		return this.evaluateRule(rule, ctx);
	}

	authorize(rules, ctx) {
		if (!Array.isArray(rules)) {
			return { type: "rules", passed: false, children: [] };
		}
		const children = rules.map((r) => this.evaluateNode(r, ctx));
		return { type: "rules", passed: children.some((c) => c.passed), children };
	}
}

function unwrap(v) {
	return v && typeof v.toJSON === "function" ? v.toJSON() : v;
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
	evaluateRule: (rule, ctx) => new DefaultEvaluator().evaluate(rule, ctx),
	authorize: (rules, ctx) => new DefaultEvaluator().authorize(rules, ctx),
	field,
	ref,
	and,
	or,
	not,
	fromJSON,
};

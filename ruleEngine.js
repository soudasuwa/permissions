// ----------------------------------------
// Access Control Rule Evaluator (pattern-based)
// ----------------------------------------

const defaultResolver = {
	resolve(path, ctx) {
		return path.split(".").reduce((o, k) => (o ? o[k] : undefined), ctx);
	},
};

function createBinaryComparePattern(key, operator, resolveExpected) {
	return {
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

const notCompare = createBinaryComparePattern("not", (a, b) => a !== b);
const referenceCompare = createBinaryComparePattern(
	"reference",
	(a, b) => a === b,
	(p, ctx, ev) => ev.contextResolver.resolve(p, ctx),
);
const greaterThanCompare = createBinaryComparePattern(
	"greaterThan",
	(a, b) => a > b,
);
const lessThanCompare = createBinaryComparePattern("lessThan", (a, b) => a < b);
const existsCompare = createBinaryComparePattern("exists", (val, flag) =>
	flag ? val !== undefined : val === undefined,
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
		const children = [];
		for (const r of arr) {
			const res = ev.evaluateRule(r, ctx);
			children.push(res);
			if (!res.passed) return { passed: false, children };
		}
		return { passed: true, children };
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
		const children = [];
		for (const r of rules) {
			const res = ev.evaluateRule(r, ctx);
			children.push(res);
			if (!res.passed) return { passed: false, children };
		}
		return { passed: true, children };
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
		const children = [];
		for (const r of rules) {
			const res = ev.evaluateRule(r, ctx);
			children.push(res);
			if (res.passed) return { passed: true, children };
		}
		return { passed: false, children };
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

const ruleNode = {
	type: "rule-node",
	match: (n) =>
		typeof n === "object" &&
		n !== null &&
		"rule" in n &&
		Object.keys(n).length === 1,
	evaluate: (node, ctx, ev) => ev.evaluateRule(node.rule, ctx),
};
const defaultNodes = [whenRuleNode, ruleGroupNode, ruleNode];

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

	computeChildren(rule, ctx, trace) {
		if (Array.isArray(rule)) {
			return rule.map((r) => this.evaluateRule(r, ctx, trace));
		}
		if (typeof rule === "object" && rule !== null) {
			if ("AND" in rule) {
				const arr = Array.isArray(rule.AND)
					? rule.AND
					: Object.entries(rule.AND).map(([k, v]) => ({ [k]: v }));
				return arr.map((r) => this.evaluateRule(r, ctx, trace));
			}
			if ("OR" in rule) {
				const sub = rule.OR;
				const arr = Array.isArray(sub)
					? sub
					: Object.entries(sub).map(([k, v]) => ({ [k]: v }));
				return arr.map((r) => this.evaluateRule(r, ctx, trace));
			}
			if ("NOT" in rule) {
				return [this.evaluateRule(rule.NOT, ctx, trace)];
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
			const res = {
				type: handler.type,
				path: attr,
				value,
				expected,
				passed: !!outcome,
			};
			return res;
		}
		const value = this.contextResolver.resolve(attr, ctx);
		const res = {
			type: "compare",
			path: attr,
			value,
			expected,
			passed: value === expected,
		};
		return res;
	}

	evaluateNode(node, ctx, trace) {
		for (const h of this.nodeHandlers) {
			if (h.match(node)) {
				const res = h.evaluate(node, ctx, this);
				const out = { type: h.type, ...res };
				return out;
			}
		}
		return this.evaluateRule(node, ctx, trace);
	}

	_evaluate(rule, ctx, trace) {
		for (const logic of this.logicHandlers) {
			if (logic.match(rule)) {
				if (logic.validate) logic.validate(rule);
				const resolved = logic.resolve ? logic.resolve(rule, ctx, this) : rule;
				const outcome = logic.evaluate(resolved, ctx, this);
				if (outcome && typeof outcome === "object" && "passed" in outcome) {
					return { type: logic.type, ...outcome };
				}
				const children = this.computeChildren(rule, ctx, trace);
				return { type: logic.type, passed: !!outcome, children };
			}
		}

		if (typeof rule !== "object" || rule === null) {
			return { type: "invalid", passed: false };
		}

		const entries = Object.entries(rule);
		if (entries.length > 1) {
			const children = entries.map(([k, v]) =>
				this.evaluateRule({ [k]: v }, ctx, trace),
			);
			return {
				type: "AND",
				passed: children.every((c) => c.passed),
				children,
			};
		}

		const [attr, val] = entries[0];
		if (
			typeof val === "object" &&
			val !== null &&
			!this.findCompare(attr, val)
		) {
			const children = Object.entries(val).map(([sub, subVal]) =>
				this.evaluateRule({ [`${attr}.${sub}`]: subVal }, ctx, trace),
			);
			return {
				type: "AND",
				passed: children.every((c) => c.passed),
				children,
			};
		}

		return this.compareValue(attr, val, ctx);
	}

	evaluateRule(rule, ctx, trace = []) {
		const res = this._evaluate(rule, ctx, trace);
		if (trace && res.passed) trace.unshift(rule);
		return res;
	}

	evaluate(rule, ctx, trace = []) {
		const res = this.evaluateRule(rule, ctx, trace);
		return res;
	}

	authorize(rules, ctx, trace = []) {
		if (!Array.isArray(rules)) {
			return { type: "rules", passed: false, children: [] };
		}
		const children = rules.map((r) => this.evaluateNode(r, ctx, trace));
		const res = {
			type: "rules",
			passed: children.some((c) => c.passed),
			children,
		};
		return res;
	}
}

function field(path, expected) {
	return { [path]: expected };
}

function ref(path) {
	return { reference: path };
}

function and(...rules) {
	return { AND: rules };
}

function or(...rules) {
	return { OR: rules };
}

function not(rule) {
	return { NOT: rule };
}

module.exports = {
	DefaultEvaluator,
	evaluateRule: (rule, ctx, trace = []) =>
		new DefaultEvaluator().evaluate(rule, ctx, trace),
	authorize: (rules, ctx, trace = []) =>
		new DefaultEvaluator().authorize(rules, ctx, trace),
	field,
	ref,
	and,
	or,
	not,
};

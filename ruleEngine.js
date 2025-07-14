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
		evaluate(resolved) {
			return {
				...resolved,
				passed: operator(resolved.value, resolved.expected),
			};
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
	evaluate(resolved) {
		return {
			...resolved,
			passed:
				Array.isArray(resolved.expected) &&
				resolved.expected.includes(resolved.value),
		};
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
	match: (n) => typeof n === "object" && n !== null && "NOT" in n,
	resolve: (node) => node.NOT,
	evaluate(rule, ctx, ev) {
		const child = ev.evaluateRule(rule, ctx);
		return { passed: !child.passed, children: [child] };
	},
};

const defaultLogic = [arrayAndLogic, andLogic, orLogic, notLogic];

const whenRuleNode = {
	match: (n) =>
		typeof n === "object" && n !== null && "when" in n && "rule" in n,
	evaluate(node, ctx, ev) {
		const whenRes = ev.evaluateRule(node.when, ctx);
		const ruleRes = whenRes.passed
			? ev.evaluateRule(node.rule, ctx)
			: { passed: false };
		return {
			passed: whenRes.passed && ruleRes.passed,
			children: [whenRes, ruleRes],
		};
	},
};

const ruleGroupNode = {
	match: (n) =>
		typeof n === "object" &&
		n !== null &&
		"when" in n &&
		Array.isArray(n.rules),
	evaluate(node, ctx, ev) {
		const whenRes = ev.evaluateRule(node.when, ctx);
		const rulesRes = whenRes.passed
			? ev.authorize(node.rules, ctx)
			: { passed: false, children: [] };
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

	compareValue(attr, expected, ctx) {
		const handler = this.compareHandlers.find((c) => c.match(attr, expected));
		if (handler) {
			if (handler.validate) handler.validate(expected);
			if (handler.resolve) {
				const resolved = handler.resolve(attr, expected, ctx, this);
				return handler.evaluate(resolved, ctx, this);
			}
			const outcome = handler.evaluate(attr, expected, ctx, this);
			if (outcome && typeof outcome === "object" && "passed" in outcome) {
				return outcome;
			}
			const value = this.contextResolver.resolve(attr, ctx);
			return { path: attr, value, expected, passed: !!outcome };
		}
		const value = this.contextResolver.resolve(attr, ctx);
		return { path: attr, value, expected, passed: value === expected };
	}

	evaluateNode(node, ctx) {
		for (const h of this.nodeHandlers) {
			if (h.match(node)) {
				const res = h.evaluate(node, ctx, this);
				if (this._trace && res.passed) {
					this._trace.unshift(node);
				}
				return res;
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
				const result =
					outcome && typeof outcome === "object" && "passed" in outcome
						? outcome
						: { passed: !!outcome };
				if (this._trace && result.passed) this._trace.unshift(rule);
				return result;
			}
		}

		if (typeof rule !== "object" || rule === null) {
			throw new Error("Invalid rule");
		}

		const entries = Object.entries(rule);

		if (entries.length > 1) {
			const children = entries.map(([k, v]) =>
				this.evaluateRule({ [k]: v }, ctx),
			);
			const passed = children.every((c) => c.passed);
			if (this._trace && passed) this._trace.unshift(rule);
			return { passed, children };
		}

		const [attr, val] = entries[0];

		if (
			typeof val === "object" &&
			val !== null &&
			!this.compareHandlers.find((c) => c.match(attr, val))
		) {
			const children = Object.entries(val).map(([sub, subVal]) =>
				this.evaluateRule({ [`${attr}.${sub}`]: subVal }, ctx),
			);
			const passed = children.every((c) => c.passed);
			if (this._trace && passed) this._trace.unshift(rule);
			return { passed, children };
		}

		const res = this.compareValue(attr, val, ctx);
		if (this._trace && res.passed) this._trace.unshift(rule);
		return res;
	}

	evaluate(rule, ctx, trace = []) {
		const prev = this._trace;
		this._trace = trace;
		const res = this.evaluateRule(rule, ctx);
		this._trace = prev;
		return res;
	}

	authorize(rules, ctx, trace = []) {
		const prev = this._trace;
		this._trace = trace;
		let result;
		if (Array.isArray(rules)) {
			const children = rules.map((r) => this.evaluateNode(r, ctx));
			result = { passed: children.some((c) => c.passed), children };
		} else {
			const child = this.evaluateNode(rules, ctx);
			result = { passed: child.passed, children: [child] };
		}
		this._trace = prev;
		return result;
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

const { DefaultEvaluator } = require("./ruleEngine");

class AccessController {
	constructor(rules, options = {}) {
		if ("evaluator" in options || "context" in options) {
			const { context = {}, evaluator = new DefaultEvaluator() } = options;
			this._context = { ...context };
			this.evaluator = evaluator;
		} else {
			// Backwards compatibility: second argument was context object
			this._context = { ...options };
			this.evaluator = new DefaultEvaluator();
		}
		this.rules = rules;
	}

	context(data = {}) {
		return new AccessController(this.rules, {
			context: { ...this._context, ...data },
			evaluator: this.evaluator,
		});
	}

	pemit(extra = {}) {
		const ctx = { ...this._context, ...extra };
		return this.evaluator.authorize(this.rules, ctx);
	}

	check(extra = {}) {
		return this.pemit(extra).passed;
	}
}

module.exports = { AccessController };

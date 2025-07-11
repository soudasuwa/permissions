const { DefaultEvaluator } = require("./ruleEngine");

class AccessController {
	constructor(
		rules,
		{ context = {}, evaluator = new DefaultEvaluator() } = {},
	) {
		this.rules = rules;
		this._context = { ...context };
		this.evaluator = evaluator;
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

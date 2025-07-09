const { authorize } = require("./ruleEngine");

class AccessController {
	constructor(rules, context = {}) {
		this.rules = rules;
		this._context = { ...context };
	}

	/**
	 * Return a new controller with merged context.
	 * Shallow merge is used so nested values are simply replaced.
	 */
	context(data = {}) {
		return new AccessController(this.rules, {
			...this._context,
			...data,
		});
	}

	/**
	 * Check access using the stored context plus any extra data.
	 * Returns a boolean result from the rule engine.
	 */
	check(extra = {}) {
		const ctx = { ...this._context, ...extra };
		return authorize(this.rules, ctx);
	}
}

module.exports = { AccessController };

import { RuleEngine } from "@/engine";
import { matchCondition } from "@/conditions";
import type {
	Actor,
	Context,
	Rule,
	MetaMatcher,
	Permit,
	AccessRequest,
} from "@/types";

export type PermitBuilder<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
	P extends Record<string, unknown> = Record<string, never>,
> = (
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	context: C,
) => P;

export class AccessRequestBuilder<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
	P extends Record<string, unknown> = Record<string, never>,
> implements AccessRequest<M, A, Act, C, Permit & P>
{
	private context: C = {} as C;
	private readonly engine: RuleEngine<M, A, Act, C>;

	constructor(
		private readonly rules: readonly Rule<M>[],
		private readonly matchMeta: MetaMatcher<M, A, Act, C>,
		private readonly actor: A,
		private readonly action: Act,
		private readonly buildPermit?: PermitBuilder<M, A, Act, C, P>,
	) {
		this.engine = new RuleEngine(matchMeta, matchCondition, rules);
	}

	public withContext(ctx: Partial<C>): this {
		this.context = { ...this.context, ...ctx };
		return this;
	}

	public with<K extends keyof C>(key: K, value: C[K]): this {
		return this.withContext({ [key]: value } as unknown as Partial<C>);
	}

	public permit(): Permit & P {
		const allowed = this.engine.permit(this.actor, this.action, this.context);
		if (!allowed) return { allowed } as Permit & P;
		const extras = this.buildPermit
			? this.buildPermit(
					this.rules,
					this.matchMeta,
					this.actor,
					this.action,
					this.context,
				)
			: ({} as P);
		return { allowed: true, ...extras };
	}
}

export function createAccessRequest<
	M extends Record<string, unknown> = Record<string, unknown>,
	A extends Actor = Actor,
	Act = string,
	C extends Context = Context,
	P extends Record<string, unknown> = Record<string, never>,
>(
	rules: readonly Rule<M>[],
	matchMeta: MetaMatcher<M, A, Act, C>,
	actor: A,
	action: Act,
	buildPermit?: PermitBuilder<M, A, Act, C, P>,
): AccessRequestBuilder<M, A, Act, C, P> {
	return new AccessRequestBuilder(rules, matchMeta, actor, action, buildPermit);
}

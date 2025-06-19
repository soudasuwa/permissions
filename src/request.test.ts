import { describe, it, expect } from "bun:test";
import {
	createAccessRequest,
	RuleEngine,
	type Actor,
	type Context,
	type MetaMatcher,
	type Rule,
} from "@/index";

interface Meta {
	role?: string;
}

const matcher: MetaMatcher<Meta, Actor, string, Context> = (meta, actor) => {
	return !meta?.role || meta.role === (actor as { role?: string }).role;
};

const rules: readonly Rule<Meta>[] = [{ meta: { role: "admin" } }];

const actor: Actor = { id: "1", role: "admin" };

describe("createAccessRequest", () => {
	it("permits when context added", () => {
		const req = createAccessRequest(rules, matcher, actor, "do");
		req.withContext({});
		expect(req.permit().allowed).toBe(true);
	});

	it("supports DSL method 'with'", () => {
		const req = createAccessRequest(rules, matcher, actor, "do");
		expect(req.with("dummy" as never, undefined).permit().allowed).toBe(true);
	});
});

describe("RuleEngine.createRequest", () => {
	it("creates a request from engine", () => {
		const engine = new RuleEngine(matcher, undefined, rules);
		const req = engine.createRequest(actor, "do");
		expect(req.withContext({}).permit().allowed).toBe(true);
	});

	it("chains with() calls", () => {
		const engine = new RuleEngine(matcher, undefined, rules);
		const req = engine.createRequest(actor, "do");
		req.with("dummy" as never, 1).with("dummy2" as never, 2);
		expect(req.permit().allowed).toBe(true);
	});
});

# Rule Engine Demo

This project demonstrates a small access control rule engine written in Node.js. It uses simple JSON rules to describe who may perform an action given a context object.

## Features

- **Generic attribute matching** – rules reference arbitrary paths within the provided context. The engine does not expect any fixed property names.
- **Comparison operators** – equality, `in`, `not`, value `reference`, numeric comparison (`greaterThan`, `lessThan`) and `exists` checks. Custom comparison handlers can be injected for domain specific operators.
- **Logical composition** – combine rules with `AND`, `OR` and `NOT` blocks. Arrays or multiple key/value pairs automatically behave as an `AND` group. `OR` blocks may be an array of rules or a single object whose properties are treated as alternatives. Custom logic handlers can be injected for new operators like `XOR`.
- **Authorize helper** – evaluate an array of rule objects. Each rule can include an optional `when` clause that must match before its main rule is evaluated.
- **Nested rule groups** – rule objects may contain a `rules` array to share a `when` condition with multiple child rules.
- **Nested attribute paths** – objects can be nested within a rule to group common path prefixes.
- **Realistic scenarios** – see the `scenarios/` folder for example rule sets (todo apps, collaborative notes, forums and more).
- **AccessController** – helper class for incrementally building a context and checking access using the rule engine.
- **Pluggable evaluator** – provide custom logic or comparison handlers when creating an `AccessController`.
- **Custom context resolver** – override how attribute paths resolve to support different path syntaxes or lookups.
- **Custom rule node handlers** – define alternative rule shapes by providing node interpreters.
- **Functional rule builder** – compose rules with helpers like `field`, `ref`, `and`, `or` and `not`.
- **Evaluation trace** – `evaluate` and `authorize` return a tree of results so you can inspect how a rule was processed. `AccessController.pemit()` exposes this tree.

### Custom evaluator example

```javascript
const xorLogic = {
  match: (node) => typeof node === "object" && node !== null && "XOR" in node,
  evaluate: (node, ctx, ev) => {
    const items = Array.isArray(node.XOR)
      ? node.XOR
      : Object.entries(node.XOR).map(([k, v]) => ({ [k]: v }));
    return items.filter((r) => ev.evaluate(r, ctx).passed).length === 1;
  },
};

const controller = new AccessController(rules, {
  evaluator: new DefaultEvaluator({ logic: [xorLogic] }),
});
```

### Custom comparison handler example

```javascript
const startsWith = {
  match: (_, exp) => typeof exp === "object" && exp !== null && "startsWith" in exp,
  evaluate: (attr, exp, ctx) => {
    const value = attr.split('.').reduce((o, k) => (o ? o[k] : undefined), ctx);
    return typeof value === 'string' && value.startsWith(exp.startsWith);
  },
};

const controller = new AccessController(rules, {
  evaluator: new DefaultEvaluator({ compare: [startsWith] }),
});
```

### Custom context resolver example

```javascript
const colonResolver = {
  resolve: (path, ctx) =>
    path.split(":").reduce((o, k) => (o ? o[k] : undefined), ctx),
};

const controller = new AccessController(rules, {
  evaluator: new DefaultEvaluator({ contextResolver: colonResolver }),
});
```

### Custom rule node handler example

```javascript
const allowIf = {
  match: (node) => typeof node === "object" && node !== null && "allowIf" in node,
  evaluate: (node, ctx, ev) => ev.evaluate(node.allowIf, ctx),
};

const controller = new AccessController(rules, {
  evaluator: new DefaultEvaluator({ nodes: [allowIf] }),
});
```

### Functional rule builder example

```javascript
const { field, ref, and, not } = require("./ruleEngine");

const rule = and(
  field("user.id", ref("item.ownerId")),
  not(field("item.status", "archived"))
);

const controller = new AccessController([{ rule }]);
const okCtx = {
  user: { id: "u1" },
  item: { ownerId: "u1", status: "active" },
};
const result = controller.pemit(okCtx);
console.log(result.passed); // true

// Inspect evaluation trace
console.dir(result, { depth: null });
```

## Testing

Run all unit tests with:

```bash
npm test
```

## Possible Future Enhancements

- Support additional operators (e.g. array `contains`, pattern matching).
- Allow custom operator plugins for domain specific logic.
- Cache compiled rules for faster repeated authorization checks.
- Provide tooling to validate or visualize rule configurations.

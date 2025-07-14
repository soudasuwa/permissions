# Rule Engine

A small, generic rule engine for Node.js used to evaluate access control decisions. Rules are expressed as plain objects and checked against a context object. The engine does not assume any specific property names so it can be adapted to a variety of domains.

## Overview

The library processes a set of rules to determine whether a user may perform an action. Each rule describes the expected values for attributes in the context and can be combined with logical operators. Comparison and logic handlers are pluggable so you can extend the engine with domain specific behaviour.

## Use Cases

- Enforcing who may read, update or delete items in a todo application.
- Authorising collaborative note editing or forum posts.
- Controlling invoice workflows or other business processes.

Example rule sets for these scenarios are provided in the `scenarios/` folder.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Define your rules:

```javascript
const rules = [
  {
    when: { resource: "todo", action: "read" },
    rule: { "item.ownerId": { reference: "user.id" } },
  },
];
```

3. Evaluate a context:

```javascript
// After installing from npm
const { AccessController } = require("@soudasuwa/permissions");

const controller = new AccessController(rules).context({
  resource: "todo",
  action: "read",
});

const result = controller.pemit({
  user: { id: "u1" },
  item: { ownerId: "u1" },
});

console.log(result.passed); // true
```

## Working with Context

`AccessController.context()` creates a new controller instance with extra values
merged into the existing context. `pemit()` evaluates the final context
against the rules. This makes it easy to build up a base context and re-use it
across checks.

```javascript
const base = new AccessController(rules).context({ resource: "note" });

// Add the action and per-request data before evaluating
const res = base.context({ action: "read" }).pemit({
  user: { id: "alice", role: "viewer" },
  note: { ownerId: "alice" },
});
console.log(res.passed); // true
```

## Rule Examples

The engine can represent many styles of access control. Here are a few common
patterns:

### Role based

```javascript
const rbacRules = [
  { when: { action: "delete" }, rule: { "user.role": "admin" } },
  {
    when: { action: "read" },
    rule: { "user.role": { in: ["admin", "viewer"] } },
  },
];
```

### Attribute based

```javascript
const abacRules = [
  {
    when: { action: "update" },
    rule: { "item.ownerId": { reference: "user.id" } },
  },
];
```

### Value checks

```javascript
const invoiceRules = [
  {
    when: { resource: "invoice", action: "pay" },
    rule: { "invoice.amount": { lessThan: 1000 } },
  },
];
```

### Existence checks

```javascript
const existenceRules = [
  { rule: { "user.id": { exists: true } } },
  { rule: { "session.token": { exists: false } } },
];
```

### Nested rule groups

```javascript
const docRules = [
  {
    when: { resource: "doc" },
    rules: [
      { when: { action: "edit" }, rule: { "doc.ownerId": { reference: "user.id" } } },
      { when: { action: "view" }, rule: { "doc.shared": true } },
    ],
  },
];
```

## Features

- **Generic attribute matching** – rules reference arbitrary paths within the context.
- **Comparison operators** – equality, `in`, `not`, value `reference`, numeric comparisons (`greaterThan`, `lessThan`) and `exists` checks.
- **Logical composition** – combine rules with `AND`, `OR` and `NOT` blocks.
- **Authorize helper** – evaluate arrays of rules with optional `when` conditions.
- **Nested rule groups** – share `when` conditions with child rules using a `rules` array.
- **AccessController** – helper class for incrementally building a context.
- **Pluggable evaluator** – provide custom logic or comparison handlers.
- **Functional rule builder** – compose rules with helpers like `field`, `ref`, `and` and `not`.
 - **Evaluation trace** – inspect which rules triggered via the returned trace array.

## Extending

Advanced scenarios may require custom logic, comparison operators or context resolution. These can be plugged into the `DefaultEvaluator`:

```javascript
const xorLogic = {
  match: node => typeof node === "object" && node !== null && "XOR" in node,
  evaluate: (node, ctx, ev) => {
    const items = Array.isArray(node.XOR)
      ? node.XOR
      : Object.entries(node.XOR).map(([k, v]) => ({ [k]: v }));
    return items.filter(r => ev.evaluate(r, ctx).passed).length === 1;
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
  match: node => typeof node === "object" && node !== null && "allowIf" in node,
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

### Inspecting evaluation results

`AccessController.pemit()` returns a trace array describing which rules were
checked. This can be helpful for debugging permissions.

```javascript
const out = controller.pemit(okCtx);
console.dir(out, { depth: null });
/* Example output:
{
  passed: true,
  trace: [
    {
      AND: [
        { "user.id": { reference: "item.ownerId" } },
        { NOT: { "item.status": "archived" } }
      ]
    },
    { NOT: { "item.status": "archived" } },
    { "user.id": { reference: "item.ownerId" } }
  ]
}
*/
```

## Testing

Run the unit tests with:

```bash
npm test
```

Formatting and linting can be checked with:

```bash
npm run check
```


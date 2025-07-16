# Rule Engine

A small, generic rule engine for Node.js used to evaluate access control decisions. Rules are expressed as plain objects and checked against a context object. The engine does not assume any specific property names so it can be adapted to a variety of domains.

## Overview

The library processes a set of rules to determine whether a user may perform an action. Each rule describes the expected values for attributes in the context and can be combined with logical operators. Comparison and logic handlers are pluggable so you can extend the engine with domain specific behaviour.

## Use Cases

- Enforcing who may read, update or delete items in a todo application.
- Authorising collaborative note editing or forum posts.
- Controlling invoice workflows or other business processes.
- Demo task management API using Express (see `packages/task-api`).

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

You can also call `check()` to get a boolean result without the evaluation trace.

```javascript
const allowed = controller.check({
  user: { id: "u1" },
  item: { ownerId: "u1" },
});
console.log(allowed); // true
```

`AccessController` also accepts a single rule object instead of an array.

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

### Implicit AND and nested objects

Multiple properties in a rule object are treated as an `AND` block. Nested
objects expand into dotted paths.

```javascript
const simpleRule = { resource: "todo", action: "read" };
// Equivalent to: { AND: [{ resource: "todo" }, { action: "read" }] }

const nestedRule = {
  user: { id: { exists: true } },
  item: { ownerId: { reference: "user.id" } },
};
// Equivalent to:
// {
//   "user.id": { exists: true },
//   "item.ownerId": { reference: "user.id" }
// }
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

## Scenario Examples

The following rule sets expand on the basic patterns above. They are presented
from simplest to most complex and mirror the sample tests in the `scenarios/`
folder.

### Simple ToDo App

```javascript
const todoRules = [
  {
    when: { resource: "todo" },
    rules: [
      {
        when: { action: "create" },
        rule: { "user.id": { exists: true }, "item.ownerId": { reference: "user.id" } },
      },
      { when: { action: "read" }, rule: { "item.ownerId": { reference: "user.id" } } },
      { when: { action: "update" }, rule: { "item.ownerId": { reference: "user.id" } } },
      { when: { action: "delete" }, rule: { "item.ownerId": { reference: "user.id" } } },
    ],
  },
];
```

### Friends Tasks

```javascript
const taskRules = [
  {
    when: { resource: "task" },
    rules: [
      {
        when: { action: "create" },
        rule: { "user.id": { exists: true }, "item.ownerId": { reference: "user.id" } },
      },
      {
        when: { action: "read" },
        rule: {
          OR: {
            "item.ownerId": { reference: "user.id" },
            "user.id": { in: { reference: "item.sharedWith" } },
          },
        },
      },
      {
        when: { action: "update" },
        rule: {
          OR: {
            "item.ownerId": { reference: "user.id" },
            "user.id": { in: { reference: "item.sharedWith" } },
          },
        },
      },
      { when: { action: "delete" }, rule: { "item.ownerId": { reference: "user.id" } } },
    ],
  },
];
```

### Tic-Tac-Toe with Leaderboard

```javascript
const gameRules = [
  {
    when: { resource: "game" },
    rules: [
      {
        when: { action: "create" },
        rule: { user: { role: "player", id: { in: { reference: "item.participants" } } } },
      },
      {
        when: { action: "move" },
        rule: {
          "user.id": { in: { reference: "item.participants" } },
          item: { status: { not: "complete" } },
        },
      },
      {
        when: { action: "read" },
        rule: {
          OR: [
            { "item.status": "complete" },
            {
              user: { id: { in: { reference: "item.participants" } } },
              item: { status: { not: "complete" } },
            },
          ],
        },
      },
    ],
  },
  {
    when: { resource: "leaderboard" },
    rules: [
      { when: { action: "read" }, rule: { "user.role": { in: ["player", "moderator"] } } },
      { when: { action: "update" }, rule: { "user.role": "moderator" } },
    ],
  },
];
```

### Collaborative Notes

```javascript
const noteRules = [
  {
    when: { resource: "note" },
    rules: [
      {
        when: { action: "create" },
        rule: {
          OR: {
            "notebook.ownerId": { reference: "user.id" },
            "user.id": { in: { reference: "notebook.editors" } },
          },
        },
      },
      {
        when: { action: "read" },
        rule: {
          OR: [
            { "notebook.ownerId": { reference: "user.id" } },
            { "user.id": { in: { reference: "notebook.editors" } } },
            { "user.id": { in: { reference: "notebook.viewers" } } },
          ],
        },
      },
      {
        when: { action: "update" },
        rule: {
          OR: {
            "notebook.ownerId": { reference: "user.id" },
            "user.id": { in: { reference: "notebook.editors" } },
          },
        },
      },
      {
        when: { action: "delete" },
        rule: {
          OR: {
            "notebook.ownerId": { reference: "user.id" },
            "user.id": { in: { reference: "notebook.editors" } },
          },
        },
      },
    ],
  },
  {
    when: { resource: "notebook" },
    rules: [
      { when: { action: "delete" }, rule: { "notebook.ownerId": { reference: "user.id" } } },
      { when: { action: "modifySharing" }, rule: { "notebook.ownerId": { reference: "user.id" } } },
    ],
  },
];
```

### Discussion Forum

```javascript
const forumRules = [
  {
    when: { resource: "category" },
    rules: [
      {
        when: { action: "view" },
        rule: {
          OR: {
            "category.isPrivate": { not: true },
            "user.id": { in: { reference: "category.allowedUsers" } },
            "user.role": "admin",
          },
        },
      },
    ],
  },
  {
    when: { resource: "topic" },
    rules: [
      {
        when: { action: "create" },
        rule: {
          OR: [
            { user: { role: "member" }, category: { isPrivate: { not: true } } },
            { user: { role: "member", id: { in: { reference: "category.allowedUsers" } } } },
          ],
        },
      },
    ],
  },
  {
    when: { resource: "post" },
    rules: [
      {
        when: { action: "editOwn" },
        rule: {
          user: { role: "member" },
          post: { authorId: { reference: "user.id" }, ageMinutes: { lessThan: 30 } },
        },
      },
      {
        when: { action: "editAnyModerator" },
        rule: {
          user: { role: "moderator", id: { in: { reference: "category.moderators" } } },
        },
      },
    ],
  },
  { when: { resource: "user", action: "adminDelete" }, rule: { "user.role": "admin" } },
];
```

### Invoice Lifecycle

```javascript
const invoiceRules = [
  {
    when: { resource: "invoice" },
    rules: [
      { when: { action: "view" }, rule: { "user.role": "admin" } },
      {
        when: { action: "view" },
        rule: {
          "user.role": "customer",
          invoice: {
            ownerId: { reference: "user.id" },
            status: { in: ["pending", "complete"] },
          },
        },
      },
      {
        when: { action: "edit" },
        rule: {
          "user.role": "admin",
          invoice: { status: { in: ["draft", "pending"] } },
        },
      },
      {
        when: { action: "pay" },
        rule: {
          "user.role": "customer",
          invoice: { ownerId: { reference: "user.id" }, status: "pending" },
        },
      },
    ],
  },
];
```


## Features

- **Generic attribute matching** – rules reference arbitrary paths within the context.
- **Comparison operators** – equality, `in`, `not`, value `reference`, numeric comparisons (`greaterThan`, `lessThan`) and `exists` checks.
- **Logical composition** – combine rules with `AND`, `OR`, `XOR` and `NOT` blocks.
- **Authorize helper** – evaluate arrays of rules with optional `when` conditions.
- **Nested rule groups** – share `when` conditions with child rules using a `rules` array.
- **AccessController** – helper class for incrementally building a context.
- **Pluggable evaluator** – provide custom logic or comparison handlers.
- **Functional rule builder** – compose rules with helpers like `field`, `ref`, `and` and `not`.
 - **Evaluation trace** – inspect which rules triggered via the returned trace array.

## Extending

Advanced scenarios may require custom logic, comparison operators or context resolution. The engine already includes `AND`, `OR`, `XOR` and `NOT` logic. Additional behaviors can be plugged into the `DefaultEvaluator`:

```javascript
const nandLogic = {
  match: node => typeof node === "object" && node !== null && "NAND" in node,
  evaluate: (node, ctx, ev) => {
    const items = Array.isArray(node.NAND)
      ? node.NAND
      : Object.entries(node.NAND).map(([k, v]) => ({ [k]: v }));
    return !items.every(r => ev.evaluate(r, ctx).passed);
  },
};

const controller = new AccessController(rules, {
  evaluator: new DefaultEvaluator({ logic: [nandLogic] }),
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
const { field, ref, and, xor, not } = require("./ruleEngine");

const rule = and(
  xor(field("user.role", "admin"), field("user.role", "editor")),
  not(field("item.status", "archived")),
  field("user.id", ref("item.ownerId"))
);

const controller = new AccessController([rule]);
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

## API Summary

- **AccessController** – manages rule sets and context
  - `context(obj)` – return a new controller with `obj` merged in
  - `pemit(ctx)` – evaluate and return `{ passed, trace }`
  - `check(ctx)` – evaluate and return a boolean
- **DefaultEvaluator** – pluggable engine used by `AccessController`
- **Rule helpers** – `field`, `ref`, `and`, `or`, `xor`, `not`

## License

Released under the [MIT](./LICENSE) license.


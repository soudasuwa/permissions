# Invoice Permissions Engine

This library provides a robust rules engine for controlling access to invoice actions. It defines roles and policies so that only the proper actor can create, view, edit or pay an invoice depending on its current status.

See `examples/invoice` for a complete example of these rules in action.

## Development

Format and lint the code using [Biome](https://biomejs.dev):

```bash
bun run lint
bun run format
```

Build the TypeScript files and run the tests (uses Bun):

```bash
bun run build
bun test
```

## Examples

### 1. Minimal check with `ResourceRoleOperationEngine`

Below is a minimal example of using the built-in strategy engine to see if a user can pay their invoice:

```ts
import { ResourceRoleOperationEngine, type Rule } from "@soudasuwa/permissions";

enum Role {
  Admin = "admin",
  User = "user",
}

enum Operation {
  View = "view",
  Pay = "pay",
}

enum InvoiceStatus {
  Pending = "Pending",
  Complete = "Complete",
}

type Resource = "invoice";

interface Meta {
  role?: Role | readonly Role[];
  operation?: Operation;
  resource?: Resource;
}

const engine = new ResourceRoleOperationEngine(rules);

const rules: readonly Rule<Meta>[] = [
  {
    meta: { role: Role.User, operation: Operation.Pay, resource: "invoice" },
    match: { status: InvoiceStatus.Pending },
  },
];

const actor = { id: "id123", role: Role.User };
const context = {
  resource: "invoice",
  status: InvoiceStatus.Pending,
};
const allowed = engine.permit(actor, Operation.Pay, context);
console.log(allowed); // true
```

### 2. Reference conditions

Use the `reference` helper to compare context values to properties on the actor.

```ts
import { ResourceRoleOperationEngine, type Rule } from "@soudasuwa/permissions";

enum Role {
  User = "user",
}

enum Operation {
  View = "view",
}

type Resource = "invoice";

interface Meta {
  role?: Role;
  operation?: Operation;
  resource?: Resource;
}

const rules: readonly Rule<Meta>[] = [
  {
    meta: { role: Role.User, operation: Operation.View, resource: "invoice" },
    match: { userId: { reference: { actor: "id" } } },
  },
];

const engine = new ResourceRoleOperationEngine(rules);
const actor = { id: "abc", role: Role.User };
const context = { resource: "invoice", userId: "abc" };

engine.permit(actor, Operation.View, context); // true
```

### 3. `in` and `not` conditions

The engine understands both inclusion lists and negated matches.

```ts
import { ResourceRoleOperationEngine, type Rule } from "@soudasuwa/permissions";

enum Role {
  Admin = "admin",
}

enum Operation {
  Edit = "edit",
}

enum InvoiceStatus {
  Draft = "Draft",
  Pending = "Pending",
  Complete = "Complete",
}

type Resource = "invoice";

interface Meta {
  role?: Role;
  operation?: Operation;
  resource?: Resource;
}

const rules: readonly Rule<Meta>[] = [
  {
    meta: { role: Role.Admin, operation: Operation.Edit, resource: "invoice" },
    match: { status: { in: [InvoiceStatus.Draft, InvoiceStatus.Pending] } },
  },
  {
    meta: { role: Role.Admin, operation: Operation.Edit, resource: "invoice" },
    match: { status: { not: InvoiceStatus.Complete } },
  },
];

const engine = new ResourceRoleOperationEngine(rules);
const actor = { id: "1", role: Role.Admin };
engine.permit(actor, Operation.Edit, { resource: "invoice", status: InvoiceStatus.Draft }); // true
engine.permit(actor, Operation.Edit, { resource: "invoice", status: InvoiceStatus.Complete }); // false
```

### 4. Nested rules

Rules can be nested to express complex permission trees. The engine traverses these `rules` arrays recursively.

```ts
import { Rule } from "@soudasuwa/permissions";

interface Meta {
  role?: Role;
  operation?: Operation;
  resource?: Resource;
}

export const nestedRules: readonly Rule<Meta>[] = [
  {
    meta: { role: Role.Admin },
    rules: [
      {
        meta: { resource: "invoice" },
        rules: [
          { meta: { operation: Operation.View } },
        ],
      },
    ],
  },
];
```

### 5. Building access requests

The engine can build a request object that gradually collects context before producing a permit.

```ts
import { createAccessRequest } from "@soudasuwa/permissions";

const req = createAccessRequest(rules, matcher, actor, Operation.View);
req.withContext({ resource: "invoice" });
const permit = req.permit(); // { allowed: true }
```

## Integrations

Optional framework integrations live in the `packages` directory. These packages extend the core engine without introducing additional dependencies.

### Prisma

The `packages/prisma` package exposes utilities to apply rule-based permissions to Prisma queries. It can convert
rules into `select` objects and `where` clauses and makes use of the core `createAccessRequest` helper. The request is filled with
context over time and finally yields a permit. That permit can then wrap a Prisma delegate so that calls like
`findFirst` automatically merge the required `select` and `where` options.

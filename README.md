# Invoice Permissions Demo

This repository provides a small rules engine for controlling access to invoice actions. It defines roles and policies so that only the proper actor can create, view, edit or pay an invoice depending on its current status.

## Roles and Capabilities

### Module (`role: module`)
- **create** – only when the payload sets `status: Generating`.
- **edit** – only invoices in the `Generating` state and the payload status remains `Generating` or `Draft`.
- **view** – not allowed.
- **pay** – not allowed.

### Administration (`role: admin`)
- **create** – may create invoices so long as the payload status is not `Generating`.
- **edit** – allowed while the invoice status is `Draft` or `Pending`.
- **view** – always allowed.
- **pay** – allowed when the invoice is `Pending` to record manual payments.

### Customer (`role: user`)
- **view** – allowed when `status` is `Pending` or `Complete` and the invoice `userId` matches the actor.
- **pay** – allowed for invoices in `Pending` that belong to the user.

Complete invoices are read-only for every role; no one can edit them once paid.

The engine checks the parent rule first and then evaluates each nested rule in turn.
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

### 1. Minimal check with `checkAccess`

Below is a minimal example of using `checkAccess` to see if a user can pay their invoice:

```ts
import { checkAccess, type Rule } from "@soudasuwa/permissions";

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

const rules: readonly Rule<Role, Operation, Resource>[] = [
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

const allowed = checkAccess(rules, actor, Operation.Pay, context);
console.log(allowed); // true
```

### 2. Reference conditions

Use the `reference` helper to compare context values to properties on the actor.

```ts
import { checkAccess, type Rule } from "@soudasuwa/permissions";

enum Role {
  User = "user",
}

enum Operation {
  View = "view",
}

type Resource = "invoice";

const rules: readonly Rule<Role, Operation, Resource>[] = [
  {
    meta: { role: Role.User, operation: Operation.View, resource: "invoice" },
    match: { userId: { reference: { actor: "id" } } },
  },
];

const actor = { id: "abc", role: Role.User };
const context = { resource: "invoice", userId: "abc" };

checkAccess(rules, actor, Operation.View, context); // true
```

### 3. `in` and `not` conditions

The engine understands both inclusion lists and negated matches.

```ts
import { checkAccess, type Rule } from "@soudasuwa/permissions";

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

const rules: readonly Rule<Role, Operation, Resource>[] = [
  {
    meta: { role: Role.Admin, operation: Operation.Edit, resource: "invoice" },
    match: { status: { in: [InvoiceStatus.Draft, InvoiceStatus.Pending] } },
  },
  {
    meta: { role: Role.Admin, operation: Operation.Edit, resource: "invoice" },
    match: { status: { not: InvoiceStatus.Complete } },
  },
];

const actor = { id: "1", role: Role.Admin };
checkAccess(rules, actor, Operation.Edit, { resource: "invoice", status: InvoiceStatus.Draft }); // true
checkAccess(rules, actor, Operation.Edit, { resource: "invoice", status: InvoiceStatus.Complete }); // false
```

### 4. Nested rules

Rules can be nested to express complex permission trees. `RuleEngine` traverses these `rules` arrays recursively.

```ts
import { Rule } from "@soudasuwa/permissions";

export const nestedRules: readonly Rule<Role, Operation, Resource>[] = [
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

### 5. Reusing a `RuleEngine` instance

For repeated checks you can create a `RuleEngine` once and reuse it.

```ts
import { RuleEngine, type Rule } from "@soudasuwa/permissions";

enum Role {
  Admin = "admin",
}

enum Operation {
  View = "view",
}

type Resource = "invoice";

const rules: readonly Rule<Role, Operation, Resource>[] = [
  { meta: { role: Role.Admin, operation: Operation.View, resource: "invoice" } },
];

const engine = new RuleEngine(rules);

const actor = { id: "42", role: Role.Admin };
const ctx = { resource: "invoice" };

engine.checkAccess(actor, Operation.View, ctx); // true
```

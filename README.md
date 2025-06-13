# Invoice Permission Engine

This project demonstrates a simple rules based access control system for invoices.

## Nested rules

Rules can be nested to express complex permission trees. `RuleEngine` traverses these `rules` arrays recursively.

```ts
import { Rule, Role, Operation } from "./index";

export const nestedRules: readonly Rule[] = [
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

The engine checks the parent rule first and then evaluates each nested rule in turn.

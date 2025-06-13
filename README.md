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
- **pay** – always allowed (for recording manual payments).

### Customer (`role: user`)
- **view** – allowed when `status` is `Pending` or `Complete` and the invoice `userId` matches the actor.
- **pay** – allowed for invoices in `Pending` that belong to the user.

## Development

Format and lint the code using [Biome](https://biomejs.dev):

```bash
npm run lint
npm run format
```

Build the TypeScript files and run the tests (uses Bun):

```bash
npm run build
npm test
```

## Usage Example

Below is a minimal example of using `checkAccess` to see if a user can pay their invoice:

```ts
import { checkAccess, Operation, Role, InvoiceStatus } from "./index";
import { rules } from "./rules";

const actor = { id: "id123", role: Role.User };
const context = {
        resource: "invoice",
        status: InvoiceStatus.Pending,
        userId: "id123",
};

const allowed = checkAccess(rules, actor, Operation.Pay, context);
console.log(allowed); // true
```


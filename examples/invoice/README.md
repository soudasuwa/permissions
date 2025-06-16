# Invoice Permissions Example

This directory demonstrates a real world permissions setup. See `rules.ts` for the policy definitions and `invoice.test.ts` for usage examples.

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

# Agents & Access Model

This document defines the **agents (roles)** involved in the invoice lifecycle and the permissions each role has over invoice operations, as enforced by the rules engine.

## Task requirements

	Uptime generation module status:

	Generating, default status, invoice in being actively generated, read only and is in a hidden tab for the administration, can be marked as Done if sure no further changes will made, completely unavailable for the customer.
	Draft, ie Done, generation is complete and will not be changed by the module. Burden of responsibility is passed onto administration, which is not visible and awaiting approval.
	Admin status:

	Draft, uptime generation is complete, invoice can be edited and new items added, invoice is still unavailable for the customer.
	Pending, available for the customer invoice, can be paid. Any change will update invoice version number, updating its invoice code ie from ABC-01 to ABC-02. Administration can record manual payment.
	Complete, paid by the customer. Can be viewed in history. Completely read only, no one can edit it.
	Customer status:

	Pending, ie Unpaid, notification, can view and pay. if due: notification. if overdue, notification + administration.
	Complete, ie Paid, read only as history

Requirement that customers can only access in any way only invoice that are referenced as invoice.userId === user.id.

---

## 🧠 Uptime Generation Module (`role: module`)

### Description
Automated system responsible for generating invoice data. It operates behind the scenes and initializes invoices in the `Generating` state.

### Capabilities

| Action     | Allowed When                   | Notes                                            |
|------------|--------------------------------|--------------------------------------------------|
| `create`   | Payload includes `status: Generating` | Starts invoice generation                         |
| `edit`     | `status: Generating`, `payload.status in [Generating, Draft]` | Used to mark invoice as "done" (Draft) |
| `view`     | ❌ Not permitted               | Hidden; no viewing rules                         |
| `pay`      | ❌ Not permitted               | System is not involved in payment                |

### Access Scope

- **Only** has access to invoices in `Generating` status.
- **Cannot** access invoices once they transition to `Draft` or beyond.

---

## 🛠️ Administration (`role: admin`)

### Description
Human administrators who review and finalize invoices after generation. They approve, publish, and manage customer-facing invoices.

### Capabilities

| Action     | Allowed When                         | Notes                                                                 |
|------------|--------------------------------------|-----------------------------------------------------------------------|
| `edit`     | `status !== Generating`              | Can modify invoice in `Draft` or `Pending`; not after payment         |
| `create`   | `status !== Generating` (payload)    | Can manually create invoices                                          |
| `view`     | Always                                | Can view any invoice at any status                                   |
| `pay`      | Always                                | Can record manual payments                                           |

### Access Scope

- Has **full visibility**.
- **Cannot edit** invoices in `Generating` or `Complete` state.
- Responsible for transitioning invoices from `Draft` → `Pending`.

---

## 👤 Customer (`role: user`)

### Description
End-user who receives and pays invoices. Sees only finalized invoices.

### Capabilities

| Action     | Allowed When                             | Notes                                                  |
|------------|------------------------------------------|--------------------------------------------------------|
| `view`     | `status !== Draft`, `userId === actor.id` | Cannot view Draft or Generating invoices               |
| `pay`      | `status !== Generating && !== Complete`, `userId === actor.id` | Can pay if invoice is in `Pending`                    |

### Access Scope

- **Only sees own invoices**.
- **Cannot see or interact** with invoices in `Draft` or `Generating` states.
- **Can view Complete invoices** as read-only history.

---

## 🧾 Invoice Status Flow

```txt
[Generating] --(module → Draft)--> [Draft] --(admin → Pending)--> [Pending] --(payment)--> [Complete]
```

---

## Development Notes

This project uses [Biome](https://biomejs.dev) for formatting and linting.
Run the commands below to lint and format the code:

```
npm run lint
npm run format
```

After formatting and linting, compile the TypeScript sources and run the tests
using [Bun](https://bun.sh):

```
npm run build
npm test   # runs "bun test" to execute tests written in TypeScript
```

import { InvoiceStatus, Operation, Role, type Rule } from "./engine";

export const rules: readonly Rule[] = [
	{
		role: Role.Module,
		resource: "invoice",
		operation: Operation.Create,
		match: { payload: { status: InvoiceStatus.Generating } },
	},
	{
		role: Role.Module,
		resource: "invoice",
		operation: Operation.Edit,
		match: {
			status: InvoiceStatus.Generating,
			payload: {
				status: { in: [InvoiceStatus.Generating, InvoiceStatus.Draft] },
			},
		},
	},
	{
		role: Role.Admin,
		resource: "invoice",
		operation: Operation.Create,
		match: { payload: { status: { not: InvoiceStatus.Generating } } },
	},
	{
		role: Role.Admin,
		resource: "invoice",
		operation: Operation.Edit,
		match: { status: { in: [InvoiceStatus.Draft, InvoiceStatus.Pending] } },
	},
	{ role: Role.Admin, resource: "invoice", operation: Operation.View },
	{ role: Role.Admin, resource: "invoice", operation: Operation.Pay },
	{
		role: Role.User,
		resource: "invoice",
		operation: Operation.View,
		match: {
			userId: { reference: { actor: "id" } },
			status: { in: [InvoiceStatus.Pending, InvoiceStatus.Complete] },
		},
	},
	{
		role: Role.User,
		resource: "invoice",
		operation: Operation.Pay,
		match: {
			userId: { reference: { actor: "id" } },
			status: InvoiceStatus.Pending,
		},
	},
];

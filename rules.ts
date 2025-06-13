import { InvoiceStatus, Operation, Role, type Rule } from "./engine";

export const rules: readonly Rule[] = [
	{
		meta: {
			role: Role.Module,
			resource: "invoice",
			operation: Operation.Create,
		},
		match: { payload: { status: InvoiceStatus.Generating } },
	},
	{
		meta: {
			role: Role.Module,
			resource: "invoice",
			operation: Operation.Edit,
		},
		match: {
			status: InvoiceStatus.Generating,
			payload: {
				status: { in: [InvoiceStatus.Generating, InvoiceStatus.Draft] },
			},
		},
	},
	{
		meta: {
			role: Role.Admin,
			resource: "invoice",
			operation: Operation.Create,
		},
		match: { payload: { status: { not: InvoiceStatus.Generating } } },
	},
	{
		meta: {
			role: Role.Admin,
			resource: "invoice",
			operation: Operation.Edit,
		},
		match: { status: { in: [InvoiceStatus.Draft, InvoiceStatus.Pending] } },
	},
	{
		meta: { role: Role.Admin, resource: "invoice", operation: Operation.View },
	},
	{
		meta: { role: Role.Admin, resource: "invoice", operation: Operation.Pay },
	},
	{
		meta: {
			role: Role.User,
			resource: "invoice",
			operation: Operation.View,
		},
		match: {
			userId: { reference: { actor: "id" } },
			status: { in: [InvoiceStatus.Pending, InvoiceStatus.Complete] },
		},
	},
	{
		meta: {
			role: Role.User,
			resource: "invoice",
			operation: Operation.Pay,
		},
		match: {
			userId: { reference: { actor: "id" } },
			status: InvoiceStatus.Pending,
		},
	},
];

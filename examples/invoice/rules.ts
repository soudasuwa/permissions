export enum Role {
	Module = "module",
	Admin = "admin",
	User = "user",
}

export enum Operation {
	Create = "create",
	Edit = "edit",
	View = "view",
	Pay = "pay",
}

export enum InvoiceStatus {
	Generating = "Generating",
	Draft = "Draft",
	Pending = "Pending",
	Complete = "Complete",
}

export type Resource = "invoice";

import type { Rule } from "../../src/index";

interface StdMeta {
	role?: Role | readonly Role[];
	operation?: Operation;
	resource?: Resource;
}

export const rules: readonly Rule<StdMeta>[] = [
	{
		meta: { resource: "invoice" },
		rules: [
			{
				meta: { operation: Operation.Edit },
				match: { status: { not: InvoiceStatus.Complete } },
				rules: [
					{
						meta: { role: Role.Module },
						match: {
							status: InvoiceStatus.Generating,
							payload: {
								status: {
									in: [InvoiceStatus.Generating, InvoiceStatus.Draft],
								},
							},
						},
					},
					{
						meta: { role: Role.Admin },
						match: {
							status: {
								in: [InvoiceStatus.Draft, InvoiceStatus.Pending],
							},
						},
					},
				],
			},
			{
				meta: { operation: Operation.Create },
				rules: [
					{
						meta: { role: Role.Module },
						match: { payload: { status: InvoiceStatus.Generating } },
					},
					{
						meta: { role: Role.Admin },
						match: { payload: { status: { not: InvoiceStatus.Generating } } },
					},
				],
			},
			{
				meta: { role: Role.Admin },
				rules: [
					{ meta: { operation: Operation.View } },
					{
						meta: { operation: Operation.Pay },
						match: { status: InvoiceStatus.Pending },
					},
				],
			},
			{
				meta: { role: Role.User },
				match: {
					userId: { reference: { actor: "id" } },
					status: {
						in: [InvoiceStatus.Pending, InvoiceStatus.Complete],
					},
				},
				rules: [
					{
						meta: { operation: Operation.View },
					},
					{
						meta: { operation: Operation.Pay },
						match: { status: InvoiceStatus.Pending },
					},
				],
			},
		],
	},
];

/*

TODO make sure the following task requirements are met:
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
 */
export const rules = [
	{
		resource: {
			name: "invoice",
			rules: [
				{
					status: { not: "Complete" },
					rules: [{ operation: "edit" }, { operation: "pay" }],
				},
				{
					status: "Generating",
					role: "module",
				},
				{
					status: { not: "Generating" },
					roles: ["admin", "user"],
				},
			],
		},
	},
	{
		role: {
			name: "module",
			rules: [
				{
					resource: {
						name: "invoice",
						rules: [
							{
								operation: "create",
								rules: [
									{
										payload: { status: "Generating" },
									},
								],
							},
							{
								operation: "edit",
								rules: [
									{
										payload: {
											status: {
												in: ["Generating", "Draft"],
											},
										},
									},
								],
							},
						],
					},
				},
			],
		},
	},
	{
		role: {
			name: "admin",
			rules: [
				{
					resource: {
						name: "invoice",
						rules: [
							{
								payload: {
									status: { not: "Generating" },
								},
								rules: [
									{ operation: "create" },
									{ operation: "edit" },
								],
							},
							{ operation: "view" },
							{ operation: "pay" },
						],
					},
				},
			],
		},
	},
	{
		role: {
			name: "user",
			rules: [
				{
					resource: {
						name: "invoice",
						rules: [
							{ userId: { reference: { actor: "id" } } },
							{ operation: "pay" },
							{
								operation: "view",
								rules: [{ status: { not: "Draft" } }],
							},
						],
					},
				},
			],
		},
	},
]

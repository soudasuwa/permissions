export const rules = [
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
								rules: [{ payload: { status: "Generating" } }],
							},
							{
								operation: "edit",
								rules: [
									{
										status: "Generating",
										payload: { status: { in: ["Generating", "Draft"] } },
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
								operation: "create",
								rules: [{ payload: { status: { not: "Generating" } } }],
							},
							{
								operation: "edit",
								rules: [{ status: { in: ["Draft", "Pending"] } }],
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
							{
								operation: "view",
								userId: { reference: { actor: "id" } },
								rules: [{ status: { in: ["Pending", "Complete"] } }],
							},
							{
								operation: "pay",
								userId: { reference: { actor: "id" } },
								rules: [{ status: "Pending" }],
							},
						],
					},
				},
			],
		},
	},
];

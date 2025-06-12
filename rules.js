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
								match: { payload: { status: "Generating" } },
							},
							{
								operation: "edit",
								match: {
									status: "Generating",
									payload: { status: { in: ["Generating", "Draft"] } },
								},
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
								match: { payload: { status: { not: "Generating" } } },
							},
							{
								operation: "edit",
								match: { status: { in: ["Draft", "Pending"] } },
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
								match: {
									userId: { reference: { actor: "id" } },
									status: { in: ["Pending", "Complete"] },
								},
							},
							{
								operation: "pay",
								match: {
									userId: { reference: { actor: "id" } },
									status: "Pending",
								},
							},
						],
					},
				},
			],
		},
	},
];

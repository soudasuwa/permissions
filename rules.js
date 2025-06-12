// TODO make sure the task requirements are met described in AGENTS.md
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

const express = require("express");
const { AccessController } = require("../../AccessController");

// Demo tasks store
const tasks = {};
let nextId = 1;

// Hardcoded sessions object (token -> user)
const SESSIONS = {
	"token-u1": { id: "u1" },
	"token-u2": { id: "u2" },
	"token-u3": { id: "u3" },
};

// Authorization rules
const rules = [
	{
		when: { resource: "task" },
		rules: [
			{
				when: { action: "create" },
				rule: { "task.ownerId": { reference: "user.id" } },
			},
			{
				when: { action: "read" },
				rule: {
					OR: [
						{ "task.ownerId": { reference: "user.id" } },
						{ "user.id": { in: { reference: "task.collaborators" } } },
					],
				},
			},
			{
				when: { action: "update" },
				rule: {
					OR: [
						{ "task.ownerId": { reference: "user.id" } },
						{ "user.id": { in: { reference: "task.collaborators" } } },
					],
				},
			},
			{
				when: { action: "delete" },
				rule: { "task.ownerId": { reference: "user.id" } },
			},
		],
	},
];

const baseController = new AccessController(rules).context({
	resource: "task",
});

const app = express();
app.use(express.json());

// Authentication middleware setting user context
app.use((req, res, next) => {
	const token = req.headers["x-session"];
	const user = token && SESSIONS[token];
	if (!user) {
		return res.status(401).json({ error: "unauthenticated" });
	}
	req.user = user;
	req.ac = baseController.context({ user });
	next();
});

function check(action, task, userController) {
	const ctrl = userController.context({ action, task });
	return ctrl.check();
}

app.get("/tasks", (req, res) => {
	const result = Object.values(tasks).filter((t) => check("read", t, req.ac));
	res.json(result);
});

app.post("/tasks", (req, res) => {
	const task = {
		id: String(nextId++),
		title: req.body.title,
		ownerId: req.user.id,
		collaborators: req.body.collaborators || [],
	};
	if (!check("create", task, req.ac)) {
		return res.status(403).json({ error: "forbidden" });
	}
	tasks[task.id] = task;
	res.json(task);
});

app.get("/tasks/:id", (req, res) => {
	const task = tasks[req.params.id];
	if (!task) return res.status(404).json({ error: "not found" });
	if (!check("read", task, req.ac)) {
		return res.status(403).json({ error: "forbidden" });
	}
	res.json(task);
});

app.put("/tasks/:id", (req, res) => {
	const task = tasks[req.params.id];
	if (!task) return res.status(404).json({ error: "not found" });
	const updated = {
		...task,
		title: req.body.title ?? task.title,
		collaborators: req.body.collaborators ?? task.collaborators,
	};
	if (!check("update", updated, req.ac)) {
		return res.status(403).json({ error: "forbidden" });
	}
	tasks[req.params.id] = updated;
	res.json(updated);
});

app.delete("/tasks/:id", (req, res) => {
	const task = tasks[req.params.id];
	if (!task) return res.status(404).json({ error: "not found" });
	if (!check("delete", task, req.ac)) {
		return res.status(403).json({ error: "forbidden" });
	}
	delete tasks[req.params.id];
	res.json({ ok: true });
});

module.exports = { app, tasks, SESSIONS };
if (require.main === module) {
	const port = process.env.PORT || 3000;
	app.listen(port, () => console.log(`Task API listening on ${port}`));
}

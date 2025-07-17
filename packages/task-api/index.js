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

function requires(action) {
	return (req, res, next) => {
		const ctrl = req.ac.context({ action, task: req.task });
		if (!ctrl.check()) {
			return res.status(403).json({ error: "forbidden" });
		}
		next();
	};
}

function loadTask(req, res, next) {
	const task = tasks[req.params.id];
	if (!task) return res.status(404).json({ error: "not found" });
	req.task = task;
	next();
}

function createTask(req, _res, next) {
	req.task = {
		id: String(nextId++),
		title: req.body.title,
		ownerId: req.user.id,
		collaborators: req.body.collaborators || [],
	};
	next();
}

function prepareUpdate(req, res, next) {
	const task = tasks[req.params.id];
	if (!task) return res.status(404).json({ error: "not found" });
	req.originalTask = task;
	req.task = {
		...task,
		title: req.body.title ?? task.title,
		ownerId: req.body.ownerId ?? task.ownerId,
		collaborators: req.body.collaborators ?? task.collaborators,
	};
	next();
}

app.get("/tasks", (req, res) => {
	const result = Object.values(tasks).filter((t) => {
		const ctrl = req.ac.context({ action: "read", task: t });
		return ctrl.check();
	});
	res.json(result);
});

app.post("/tasks", createTask, requires("create"), (req, res) => {
	tasks[req.task.id] = req.task;
	res.json(req.task);
});

app.get("/tasks/:id", loadTask, requires("read"), (req, res) => {
	res.json(req.task);
});

app.put("/tasks/:id", prepareUpdate, requires("update"), (req, res) => {
	if (req.body.ownerId && req.originalTask.ownerId !== req.user.id) {
		return res.status(403).json({ error: "forbidden" });
	}
	tasks[req.params.id] = req.task;
	res.json(req.task);
});

app.delete("/tasks/:id", loadTask, requires("delete"), (req, res) => {
	delete tasks[req.params.id];
	res.json({ ok: true });
});

module.exports = { app, tasks, SESSIONS };
if (require.main === module) {
	const port = process.env.PORT || 3000;
	app.listen(port, () => console.log(`Task API listening on ${port}`));
}

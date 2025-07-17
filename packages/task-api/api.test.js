const assert = require("node:assert");
const { test, beforeEach, afterEach } = require("node:test");
const { app, tasks } = require("./index");

let server;
let baseUrl;

beforeEach(() => {
	// reset in-memory data and start server
	for (const k of Object.keys(tasks)) delete tasks[k];
	server = app.listen(0);
	const { port } = server.address();
	baseUrl = `http://localhost:${port}`;
});

afterEach(() => {
	server.close();
});

async function request(method, path, body, token) {
	const res = await fetch(new URL(path, baseUrl), {
		method,
		headers: {
			"Content-Type": "application/json",
			"x-session": token,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	return { status: res.status, body: text ? JSON.parse(text) : {} };
}

test("user can create and read task", async () => {
	const create = await request("POST", "/tasks", { title: "Test" }, "token-u1");
	assert.strictEqual(create.status, 200);
	const id = create.body.id;
	const read = await request("GET", `/tasks/${id}`, null, "token-u1");
	assert.strictEqual(read.status, 200);
	assert.strictEqual(read.body.title, "Test");
});

test("collaborator can update but not delete", async () => {
	const create = await request(
		"POST",
		"/tasks",
		{ title: "A", collaborators: ["u2"] },
		"token-u1",
	);
	const id = create.body.id;
	const upd = await request("PUT", `/tasks/${id}`, { title: "B" }, "token-u2");
	assert.strictEqual(upd.status, 200);
	assert.strictEqual(upd.body.title, "B");
	const del = await request("DELETE", `/tasks/${id}`, null, "token-u2");
	assert.strictEqual(del.status, 403);
});

test("collaborator cannot change owner", async () => {
	const create = await request(
		"POST",
		"/tasks",
		{ title: "O", collaborators: ["u2"] },
		"token-u1",
	);
	const id = create.body.id;
	const upd = await request(
		"PUT",
		`/tasks/${id}`,
		{ ownerId: "u2" },
		"token-u2",
	);
	assert.strictEqual(upd.status, 403);
});

test("owner can delete", async () => {
	const create = await request("POST", "/tasks", { title: "X" }, "token-u1");
	const id = create.body.id;
	const del = await request("DELETE", `/tasks/${id}`, null, "token-u1");
	assert.strictEqual(del.status, 200);
});

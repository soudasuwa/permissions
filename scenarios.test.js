const assert = require('node:assert');
const { test } = require('node:test');
const { evaluateRule } = require('./ruleEngine');
const { scenario1, scenario2, scenario3, scenario4, scenario5 } = require('./scenarioRules');

// Scenario 1: Simple ToDo App

test('scenario1: user can create own todo', () => {
  const context = { user: { id: 'u1' }, resource: { ownerId: 'u1' } };
  assert.strictEqual(evaluateRule(scenario1.todo.create, context), true);
});

test('scenario1: user cannot read others todo', () => {
  const context = { user: { id: 'u1' }, resource: { ownerId: 'u2' } };
  assert.strictEqual(evaluateRule(scenario1.todo.read, context), false);
});

// Scenario 2: Friends Tasks App

test('scenario2: shared friend can update task', () => {
  const context = { user: { id: 'bob' }, resource: { ownerId: 'alice', sharedWith: ['bob'] } };
  assert.strictEqual(evaluateRule(scenario2.task.update, context), true);
});

test('scenario2: unshared user cannot read task', () => {
  const context = { user: { id: 'charlie' }, resource: { ownerId: 'alice', sharedWith: ['bob'] } };
  assert.strictEqual(evaluateRule(scenario2.task.read, context), false);
});

// Scenario 3: Tic-Tac-Toe Game with Leaderboard

test('scenario3: participant can move in active game', () => {
  const context = { user: { id: 'p1', role: 'player' }, resource: { participants: ['p1','p2'], status: 'active' } };
  assert.strictEqual(evaluateRule(scenario3.game.move, context), true);
});

test('scenario3: non participant cannot move', () => {
  const context = { user: { id: 'x', role: 'player' }, resource: { participants: ['p1','p2'], status: 'active' } };
  assert.strictEqual(evaluateRule(scenario3.game.move, context), false);
});

test('scenario3: only moderator updates leaderboard', () => {
  const context = { user: { role: 'player' } };
  assert.strictEqual(evaluateRule(scenario3.leaderboard.update, context), false);
  const modCtx = { user: { role: 'moderator' } };
  assert.strictEqual(evaluateRule(scenario3.leaderboard.update, modCtx), true);
});

// Scenario 4: Collaborative Note Taking App

test('scenario4: editor can create note', () => {
  const context = { user: { id: 'e1' }, notebook: { ownerId: 'o1', editors: ['e1'] } };
  assert.strictEqual(evaluateRule(scenario4.note.create, context), true);
});

test('scenario4: viewer cannot update note', () => {
  const context = { user: { id: 'v1' }, notebook: { ownerId: 'o1', viewers: ['v1'] } };
  assert.strictEqual(evaluateRule(scenario4.note.update, context), false);
});

test('scenario4: owner can delete notebook', () => {
  const context = { user: { id: 'o1' }, notebook: { ownerId: 'o1' } };
  assert.strictEqual(evaluateRule(scenario4.notebook.delete, context), true);
});

// Scenario 5: Discussion Forum

test('scenario5: guest cannot create topic', () => {
  const context = { user: { role: 'guest', id: 'g1' }, category: { isPrivate: false } };
  assert.strictEqual(evaluateRule(scenario5.topic.create, context), false);
});

test('scenario5: member edits own recent post', () => {
  const context = { user: { role: 'member', id: 'm1' }, post: { authorId: 'm1', ageMinutes: 10 } };
  assert.strictEqual(evaluateRule(scenario5.post.editOwn, context), true);
});

test('scenario5: moderator edits any post in category', () => {
  const context = { user: { role: 'moderator', id: 'mod1' }, category: { moderators: ['mod1'] } };
  assert.strictEqual(evaluateRule(scenario5.post.editAnyModerator, context), true);
});

test('scenario5: guest cannot view private category', () => {
  const context = { user: { role: 'guest', id: 'g1' }, category: { isPrivate: true, allowedUsers: [] } };
  assert.strictEqual(evaluateRule(scenario5.category.view, context), false);
});

test('scenario5: admin can delete user account', () => {
  const context = { user: { role: 'admin' } };
  assert.strictEqual(evaluateRule(scenario5.user.adminDelete, context), true);
});

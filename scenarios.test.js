const assert = require('node:assert');
const { test } = require('node:test');
const { authorize } = require('./ruleEngine');
const { scenario1, scenario2, scenario3, scenario4, scenario5 } = require('./scenarioRules');

// Scenario 1: Simple ToDo App

test('scenario1: user can create own todo', () => {
  const context = { resource: 'todo', action: 'create', user: { id: 'u1' }, item: { ownerId: 'u1' } };
  assert.strictEqual(authorize(scenario1, context), true);
});

test('scenario1: user cannot read others todo', () => {
  const context = { resource: 'todo', action: 'read', user: { id: 'u1' }, item: { ownerId: 'u2' } };
  assert.strictEqual(authorize(scenario1, context), false);
});

// Scenario 2: Friends Tasks App

test('scenario2: shared friend can update task', () => {
  const context = {
    resource: 'task',
    action: 'update',
    user: { id: 'bob' },
    item: { ownerId: 'alice', sharedWith: ['bob'] }
  };
  assert.strictEqual(authorize(scenario2, context), true);
});

test('scenario2: unshared user cannot read task', () => {
  const context = {
    resource: 'task',
    action: 'read',
    user: { id: 'charlie' },
    item: { ownerId: 'alice', sharedWith: ['bob'] }
  };
  assert.strictEqual(authorize(scenario2, context), false);
});

// Scenario 3: Tic-Tac-Toe Game with Leaderboard

test('scenario3: participant can move in active game', () => {
  const context = {
    resource: 'game',
    action: 'move',
    user: { id: 'p1', role: 'player' },
    item: { participants: ['p1', 'p2'], status: 'active' }
  };
  assert.strictEqual(authorize(scenario3, context), true);
});

test('scenario3: non participant cannot move', () => {
  const context = {
    resource: 'game',
    action: 'move',
    user: { id: 'x', role: 'player' },
    item: { participants: ['p1', 'p2'], status: 'active' }
  };
  assert.strictEqual(authorize(scenario3, context), false);
});

test('scenario3: only moderator updates leaderboard', () => {
  const context = { resource: 'leaderboard', action: 'update', user: { role: 'player' } };
  assert.strictEqual(authorize(scenario3, context), false);
  const modCtx = { resource: 'leaderboard', action: 'update', user: { role: 'moderator' } };
  assert.strictEqual(authorize(scenario3, modCtx), true);
});

// Scenario 4: Collaborative Note Taking App

test('scenario4: editor can create note', () => {
  const context = {
    resource: 'note',
    action: 'create',
    user: { id: 'e1' },
    notebook: { ownerId: 'o1', editors: ['e1'] }
  };
  assert.strictEqual(authorize(scenario4, context), true);
});

test('scenario4: viewer cannot update note', () => {
  const context = {
    resource: 'note',
    action: 'update',
    user: { id: 'v1' },
    notebook: { ownerId: 'o1', viewers: ['v1'] }
  };
  assert.strictEqual(authorize(scenario4, context), false);
});

test('scenario4: owner can delete notebook', () => {
  const context = {
    resource: 'notebook',
    action: 'delete',
    user: { id: 'o1' },
    notebook: { ownerId: 'o1' }
  };
  assert.strictEqual(authorize(scenario4, context), true);
});

// Scenario 5: Discussion Forum

test('scenario5: guest cannot create topic', () => {
  const context = {
    resource: 'topic',
    action: 'create',
    user: { role: 'guest', id: 'g1' },
    category: { isPrivate: false }
  };
  assert.strictEqual(authorize(scenario5, context), false);
});

test('scenario5: member edits own recent post', () => {
  const context = {
    resource: 'post',
    action: 'editOwn',
    user: { role: 'member', id: 'm1' },
    post: { authorId: 'm1', ageMinutes: 10 }
  };
  assert.strictEqual(authorize(scenario5, context), true);
});

test('scenario5: moderator edits any post in category', () => {
  const context = {
    resource: 'post',
    action: 'editAnyModerator',
    user: { role: 'moderator', id: 'mod1' },
    category: { moderators: ['mod1'] }
  };
  assert.strictEqual(authorize(scenario5, context), true);
});

test('scenario5: guest cannot view private category', () => {
  const context = {
    resource: 'category',
    action: 'view',
    user: { role: 'guest', id: 'g1' },
    category: { isPrivate: true, allowedUsers: [] }
  };
  assert.strictEqual(authorize(scenario5, context), false);
});

test('scenario5: admin can delete user account', () => {
  const context = { resource: 'user', action: 'adminDelete', user: { role: 'admin' } };
  assert.strictEqual(authorize(scenario5, context), true);
});

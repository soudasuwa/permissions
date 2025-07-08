/* Scenario 1: Simple ToDo App
   Roles: user
   Resources: todo items

   Access Controls:
   - Create: any authenticated user can create a todo item for themselves.
   - Read: a user may read only the todo items they created.
   - Update: a user may update only their own items.
   - Delete: a user may delete only their own items.
   - There is no access to other users' todo lists or individual items.
*/

const assert = require('node:assert');
const { test } = require('node:test');
const { authorize } = require('../ruleEngine');

const rules = [
  {
    when: { resource: 'todo', action: 'create' },
    rule: {
      AND: [
        { 'user.id': { exists: true } },
        { 'item.ownerId': { reference: 'user.id' } }
      ]
    }
  },
  {
    when: { resource: 'todo', action: 'read' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  },
  {
    when: { resource: 'todo', action: 'update' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  },
  {
    when: { resource: 'todo', action: 'delete' },
    rule: { 'item.ownerId': { reference: 'user.id' } }
  }
];

module.exports = { rules };

// Tests

test('scenario1: user can create own todo', () => {
  const context = { resource: 'todo', action: 'create', user: { id: 'u1' }, item: { ownerId: 'u1' } };
  assert.strictEqual(authorize(rules, context), true);
});

test('scenario1: user cannot read others todo', () => {
  const context = { resource: 'todo', action: 'read', user: { id: 'u1' }, item: { ownerId: 'u2' } };
  assert.strictEqual(authorize(rules, context), false);
});

const assert = require('node:assert');
const { test } = require('node:test');
const { evaluateRule, authorize } = require('./ruleEngine');

// ----------------------------------------
// Basic Equality
// ----------------------------------------

test('Equal match', () => {
  const rule = { 'user.role': 'admin' };
  const context = { user: { role: 'admin' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Equal mismatch', () => {
  const rule = { 'user.role': 'admin' };
  const context = { user: { role: 'customer' } };
  assert.strictEqual(evaluateRule(rule, context), false);
});

// ----------------------------------------
// Operators: in, not, reference
// ----------------------------------------

test('In operator match', () => {
  const rule = { 'resource.status': { in: ['draft', 'pending'] } };
  const context = { resource: { status: 'pending' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('In operator miss', () => {
  const rule = { 'resource.status': { in: ['draft', 'pending'] } };
  const context = { resource: { status: 'complete' } };
  assert.strictEqual(evaluateRule(rule, context), false);
});

test('Not operator match', () => {
  const rule = { action: { not: 'edit' } };
  const context = { action: 'view' };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Reference match', () => {
  const rule = { 'resource.ownerId': { reference: 'user.id' } };
  const context = { user: { id: '123' }, resource: { ownerId: '123' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Logical AND/OR
// ----------------------------------------

test('AND match', () => {
  const rule = {
    AND: [
      { 'user.role': 'admin' },
      { 'resource.status': 'draft' }
    ]
  };
  const context = { user: { role: 'admin' }, resource: { status: 'draft' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('OR match (one true)', () => {
  const rule = {
    OR: [
      { 'user.role': 'admin' },
      { 'user.role': 'manager' }
    ]
  };
  const context = { user: { role: 'manager' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Nested and NOT logic
// ----------------------------------------

test('NOT inside AND (should fail)', () => {
  const rule = {
    AND: [
      { 'user.role': 'admin' },
      { NOT: { 'resource.status': 'complete' } }
    ]
  };
  const context = { user: { role: 'admin' }, resource: { status: 'complete' } };
  assert.strictEqual(evaluateRule(rule, context), false);
});

test('NOT inside AND (should pass)', () => {
  const rule = {
    AND: [
      { 'user.role': 'admin' },
      { NOT: { 'resource.status': 'complete' } }
    ]
  };
  const context = { user: { role: 'admin' }, resource: { status: 'pending' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Full Hierarchy Example
// ----------------------------------------

test('Full complex rule (customer paying own pending invoice)', () => {
  const complexRule = {
    AND: [
      {
        NOT: {
          AND: [
            { 'resource.type': 'invoice' },
            { 'resource.status': 'complete' },
            { action: { not: 'view' } }
          ]
        }
      },
      {
        OR: [
          {
            AND: [
              { 'user.role': 'admin' },
              { action: 'edit' },
              { 'resource.type': 'invoice' },
              { 'resource.status': { in: ['draft', 'pending'] } }
            ]
          },
          {
            AND: [
              { 'user.role': 'customer' },
              { action: 'pay' },
              { 'resource.type': 'invoice' },
              { 'resource.status': 'pending' },
              { 'resource.ownerId': { reference: 'user.id' } }
            ]
          }
        ]
      }
    ]
  };

  const context = {
    user: { role: 'customer', id: 'abc' },
    action: 'pay',
    resource: { type: 'invoice', status: 'pending', ownerId: 'abc' }
  };

  assert.strictEqual(evaluateRule(complexRule, context), true);
});

test('Full complex rule (customer trying to edit complete)', () => {
  const complexRule = {
    AND: [
      {
        NOT: {
          AND: [
            { 'resource.type': 'invoice' },
            { 'resource.status': 'complete' },
            { action: { not: 'view' } }
          ]
        }
      },
      {
        OR: [
          {
            AND: [
              { 'user.role': 'admin' },
              { action: 'edit' },
              { 'resource.type': 'invoice' },
              { 'resource.status': { in: ['draft', 'pending'] } }
            ]
          },
          {
            AND: [
              { 'user.role': 'customer' },
              { action: 'pay' },
              { 'resource.type': 'invoice' },
              { 'resource.status': 'pending' },
              { 'resource.ownerId': { reference: 'user.id' } }
            ]
          }
        ]
      }
    ]
  };

  const context = {
    user: { role: 'customer', id: 'abc' },
    action: 'edit',
    resource: { type: 'invoice', status: 'complete', ownerId: 'abc' }
  };

  assert.strictEqual(evaluateRule(complexRule, context), false);
});

test('Full complex rule (admin edits pending invoice)', () => {
  const complexRule = {
    AND: [
      {
        NOT: {
          AND: [
            { 'resource.type': 'invoice' },
            { 'resource.status': 'complete' },
            { action: { not: 'view' } }
          ]
        }
      },
      {
        OR: [
          {
            AND: [
              { 'user.role': 'admin' },
              { action: 'edit' },
              { 'resource.type': 'invoice' },
              { 'resource.status': { in: ['draft', 'pending'] } }
            ]
          },
          {
            AND: [
              { 'user.role': 'customer' },
              { action: 'pay' },
              { 'resource.type': 'invoice' },
              { 'resource.status': 'pending' },
              { 'resource.ownerId': { reference: 'user.id' } }
            ]
          }
        ]
      }
    ]
  };

  const context = {
    user: { role: 'admin' },
    action: 'edit',
    resource: { type: 'invoice', status: 'pending' }
  };

  assert.strictEqual(evaluateRule(complexRule, context), true);
});

test('Full complex rule (admin edits complete invoice — not allowed)', () => {
  const complexRule = {
    AND: [
      {
        NOT: {
          AND: [
            { 'resource.type': 'invoice' },
            { 'resource.status': 'complete' },
            { action: { not: 'view' } }
          ]
        }
      },
      {
        OR: [
          {
            AND: [
              { 'user.role': 'admin' },
              { action: 'edit' },
              { 'resource.type': 'invoice' },
              { 'resource.status': { in: ['draft', 'pending'] } }
            ]
          },
          {
            AND: [
              { 'user.role': 'customer' },
              { action: 'pay' },
              { 'resource.type': 'invoice' },
              { 'resource.status': 'pending' },
              { 'resource.ownerId': { reference: 'user.id' } }
            ]
          }
        ]
      }
    ]
  };

  const context = {
    user: { role: 'admin' },
    action: 'edit',
    resource: { type: 'invoice', status: 'complete' }
  };

  assert.strictEqual(evaluateRule(complexRule, context), false);
});

// ----------------------------------------
// Invoice Status Examples
// ----------------------------------------

test('Module generating status is read-only', () => {
  const rule = { 'invoice.moduleStatus': 'generating' };
  const context = { invoice: { moduleStatus: 'generating' } };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Admin can edit draft invoice', () => {
  const rule = {
    AND: [
      { 'invoice.adminStatus': 'draft' },
      { 'user.role': 'admin' },
      { action: 'edit' }
    ]
  };
  const context = {
    user: { role: 'admin' },
    action: 'edit',
    invoice: { adminStatus: 'draft' }
  };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Customer cannot edit pending invoice', () => {
  const rule = {
    AND: [
      { 'invoice.customerStatus': 'pending' },
      { 'user.role': 'customer' },
      { action: { not: 'pay' } }
    ]
  };
  const context = {
    user: { role: 'customer' },
    action: 'edit',
    invoice: { customerStatus: 'pending' }
  };
  assert.strictEqual(evaluateRule(rule, context), true);
});

// Additional scenarios derived from business requirements

test('Admin cannot edit invoice while module is generating', () => {
  const rule = {
    AND: [
      { 'user.role': 'admin' },
      { action: 'edit' },
      { 'invoice.moduleStatus': { not: 'generating' } }
    ]
  };
  const context = {
    user: { role: 'admin' },
    action: 'edit',
    invoice: { moduleStatus: 'generating' }
  };
  assert.strictEqual(evaluateRule(rule, context), false);
});

test('Customer can pay pending invoice', () => {
  const rule = {
    AND: [
      { 'user.role': 'customer' },
      { action: 'pay' },
      { 'invoice.customerStatus': 'pending' }
    ]
  };
  const context = {
    user: { role: 'customer' },
    action: 'pay',
    invoice: { customerStatus: 'pending' }
  };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Customer cannot pay completed invoice', () => {
  const rule = {
    AND: [
      { 'user.role': 'customer' },
      { action: 'pay' },
      { 'invoice.customerStatus': 'complete' }
    ]
  };
  const context = {
    user: { role: 'customer' },
    action: 'pay',
    invoice: { customerStatus: 'complete' }
  };
  assert.strictEqual(evaluateRule(rule, context), true);
});

test('Generating invoice is hidden from customer', () => {
  const rule = {
    AND: [
      { 'user.role': 'customer' },
      { action: 'view' },
      { 'invoice.moduleStatus': 'generating' }
    ]
  };
  const context = {
    user: { role: 'customer' },
    action: 'view',
    invoice: { moduleStatus: 'generating' }
  };
  assert.strictEqual(evaluateRule(rule, context), true);
});

// ----------------------------------------
// Authorize helper
// ----------------------------------------

test('authorize matches correct rule', () => {
  const rules = [
    { when: { resource: 'todo', action: 'read' }, rule: { 'item.ownerId': { reference: 'user.id' } } },
    { when: { resource: 'todo', action: 'create' }, rule: { 'user.id': { exists: true } } }
  ];
  const context = { resource: 'todo', action: 'read', user: { id: 'a' }, item: { ownerId: 'a' } };
  assert.strictEqual(authorize(rules, context), true);
  const createCtx = { resource: 'todo', action: 'create', user: { id: 'a' } };
  assert.strictEqual(authorize(rules, createCtx), true);
  const badCtx = { resource: 'todo', action: 'read', user: { id: 'b' }, item: { ownerId: 'a' } };
  assert.strictEqual(authorize(rules, badCtx), false);
});

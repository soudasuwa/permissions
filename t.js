// ----------------------------------------
// Access Control Rule Evaluator
// ----------------------------------------

function getValue(path, context) {
  const parts = path.split('.');
  return parts.reduce((obj, key) => (obj ? obj[key] : undefined), context);
}

function compare(attr, expected, context) {
  const actual = getValue(attr, context);

  if (typeof expected === 'object' && expected !== null) {
    if ('in' in expected) {
      return Array.isArray(expected.in) && expected.in.includes(actual);
    }
    if ('not' in expected) {
      return actual !== expected.not;
    }
    if ('reference' in expected) {
      const ref = getValue(expected.reference, context);
      return actual === ref;
    }
    if ('greaterThan' in expected) {
      return actual > expected.greaterThan;
    }
    if ('lessThan' in expected) {
      return actual < expected.lessThan;
    }
    if ('exists' in expected) {
      return expected.exists ? actual !== undefined : actual === undefined;
    }
    return false;
  }

  return actual === expected;
}

function evaluateRule(rule, context) {
  if (Array.isArray(rule)) {
    return rule.every(r => evaluateRule(r, context));
  }

  if (typeof rule !== 'object' || rule === null) {
    return false;
  }

  if ('AND' in rule) {
    return rule.AND.every(subRule => evaluateRule(subRule, context));
  }

  if ('OR' in rule) {
    return rule.OR.some(subRule => evaluateRule(subRule, context));
  }

  if ('NOT' in rule) {
    return !evaluateRule(rule.NOT, context);
  }

  const [key, expected] = Object.entries(rule)[0];
  return compare(key, expected, context);
}

// ----------------------------------------
// Test Suite
// ----------------------------------------

function runTests() {
  let testNumber = 1;

  function test(name, rule, context, expected) {
    const result = evaluateRule(rule, context);
    const pass = result === expected;
    console.assert(pass, `[${testNumber++}] ${name} → ${result} (expected ${expected})`);
    if (pass) console.log(`✅ ${name}`);
    else console.log(`❌ ${name} — got ${result}, expected ${expected}`);
  }

  console.log("\n== Basic Equality ==");
  test("Equal match", { "user.role": "admin" }, { user: { role: "admin" } }, true);
  test("Equal mismatch", { "user.role": "admin" }, { user: { role: "customer" } }, false);

  console.log("\n== Operators: in, not, reference ==");
  test("In operator match", { "resource.status": { "in": ["draft", "pending"] } }, { resource: { status: "pending" } }, true);
  test("In operator miss", { "resource.status": { "in": ["draft", "pending"] } }, { resource: { status: "complete" } }, false);
  test("Not operator match", { "action": { "not": "edit" } }, { action: "view" }, true);
  test("Reference match", { "resource.ownerId": { "reference": "user.id" } }, { user: { id: "123" }, resource: { ownerId: "123" } }, true);

  console.log("\n== Logical AND/OR ==");
  test(
    "AND match",
    {
      "AND": [
        { "user.role": "admin" },
        { "resource.status": "draft" }
      ]
    },
    { user: { role: "admin" }, resource: { status: "draft" } },
    true
  );

  test(
    "OR match (one true)",
    {
      "OR": [
        { "user.role": "admin" },
        { "user.role": "manager" }
      ]
    },
    { user: { role: "manager" } },
    true
  );

  console.log("\n== Nested and NOT logic ==");
  test(
    "NOT inside AND (should fail)",
    {
      "AND": [
        { "user.role": "admin" },
        { "NOT": { "resource.status": "complete" } }
      ]
    },
    { user: { role: "admin" }, resource: { status: "complete" } },
    false
  );

  test(
    "NOT inside AND (should pass)",
    {
      "AND": [
        { "user.role": "admin" },
        { "NOT": { "resource.status": "complete" } }
      ]
    },
    { user: { role: "admin" }, resource: { status: "pending" } },
    true
  );

  console.log("\n== Full Hierarchy Example ==");
  const complexRule = {
    "AND": [
      {
        "NOT": {
          "AND": [
            { "resource.type": "invoice" },
            { "resource.status": "complete" },
            { "action": { "not": "view" } }
          ]
        }
      },
      {
        "OR": [
          {
            "AND": [
              { "user.role": "admin" },
              { "action": "edit" },
              { "resource.type": "invoice" },
              { "resource.status": { "in": ["draft", "pending"] } }
            ]
          },
          {
            "AND": [
              { "user.role": "customer" },
              { "action": "pay" },
              { "resource.type": "invoice" },
              { "resource.status": "pending" },
              { "resource.ownerId": { "reference": "user.id" } }
            ]
          }
        ]
      }
    ]
  };

  test(
    "Full complex rule (customer paying own pending invoice)",
    complexRule,
    {
      user: { role: "customer", id: "abc" },
      action: "pay",
      resource: {
        type: "invoice",
        status: "pending",
        ownerId: "abc"
      }
    },
    true
  );

  test(
    "Full complex rule (customer trying to edit complete)",
    complexRule,
    {
      user: { role: "customer", id: "abc" },
      action: "edit",
      resource: {
        type: "invoice",
        status: "complete",
        ownerId: "abc"
      }
    },
    false
  );

  test(
    "Full complex rule (admin edits pending invoice)",
    complexRule,
    {
      user: { role: "admin" },
      action: "edit",
      resource: {
        type: "invoice",
        status: "pending"
      }
    },
    true
  );

  test(
    "Full complex rule (admin edits complete invoice — not allowed)",
    complexRule,
    {
      user: { role: "admin" },
      action: "edit",
      resource: {
        type: "invoice",
        status: "complete"
      }
    },
    false
  );
}

runTests();

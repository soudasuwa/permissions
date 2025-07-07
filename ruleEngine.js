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
      const arr =
        typeof expected.in === 'object' && expected.in !== null && 'reference' in expected.in
          ? getValue(expected.in.reference, context)
          : expected.in;
      return Array.isArray(arr) && arr.includes(actual);
    }
    if ('contains' in expected) {
      return Array.isArray(actual) && actual.includes(expected.contains);
    }
    if ('containsRef' in expected) {
      const refVal = getValue(expected.containsRef, context);
      return Array.isArray(actual) && actual.includes(refVal);
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
    for (const r of rule) {
      if (!evaluateRule(r, context)) return false;
    }
    return true;
  }

  if (typeof rule !== 'object' || rule === null) {
    return false;
  }

  if ('AND' in rule) {
    for (const subRule of rule.AND) {
      if (!evaluateRule(subRule, context)) return false;
    }
    return true;
  }

  if ('OR' in rule) {
    for (const subRule of rule.OR) {
      if (evaluateRule(subRule, context)) return true;
    }
    return false;
  }

  if ('NOT' in rule) {
    return !evaluateRule(rule.NOT, context);
  }

  const [key, expected] = Object.entries(rule)[0];
  return compare(key, expected, context);
}

module.exports = { evaluateRule };

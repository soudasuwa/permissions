# Rule Engine Demo

This project demonstrates a small access control rule engine written in Node.js. It uses simple JSON rules to describe who may perform an action given a context object.

## Features

- **Generic attribute matching** – rules reference arbitrary paths within the provided context. The engine does not expect any fixed property names.
- **Comparison operators** – equality, `in`, `not`, value `reference`, numeric comparison (`greaterThan`, `lessThan`) and `exists` checks.
- **Logical composition** – combine rules with `AND`, `OR` and `NOT` blocks or use arrays/multiple keys for implicit `AND` behaviour.
- **Authorize helper** – evaluate an array of rule objects. Each rule can include an optional `when` clause that must match before its main rule is evaluated.
- **Realistic scenarios** – `scenarioRules.js` contains example rule sets for common applications (todo apps, collaborative notes, forums and more).

## Testing

Run all unit tests with:

```bash
npm test
```

## Possible Future Enhancements

- Support additional operators (e.g. array `contains`, pattern matching).
- Allow custom operator plugins for domain specific logic.
- Cache compiled rules for faster repeated authorization checks.
- Provide tooling to validate or visualize rule configurations.

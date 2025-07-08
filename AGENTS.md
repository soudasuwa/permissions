# Guidelines for AI Contributors

This repository contains a Node.js rule engine used in several access control scenarios.

- Keep changes compatible with CommonJS (`require`) modules.
- Ensure all modifications pass `npm test` before committing.
- The engine should remain generic: avoid hardcoding context attributes or assuming specific resource/action names.
- Scenario rules in `scenarioRules.js` are examples; modify them only when instructed.
- Document new capabilities in `README.md` if features are added.

To run the tests:

```bash
npm test
```

---
name: add-api-endpoint
description: Adds an HTTP endpoint to the API, including the route, request validation, error format, and a contract test. Use when asked to add, expose, or create an endpoint or route, even if the request only describes behavior, such as letting clients cancel an order.
---
1. Add the route under `api/routes/`. Validate the body against a schema in `api/schemas/`.
2. Return errors in the format in [references/error-format.md](references/error-format.md).
3. Add a contract test in `tests/contract/`. Run it and confirm it fails before the route exists.

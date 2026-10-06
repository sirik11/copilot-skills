# Error format

Every error response is JSON: `{"error": {"code": "ORDER_NOT_FOUND", "message": "..."}}`.
`code` is UPPER_SNAKE_CASE and stable; clients match on it. `message` is for humans and may change.

# Internal Application Code (`internal`)

This directory holds the private application code for the backend API. Code in this directory cannot be imported by external packages.

It follows Clean Architecture principles, separated into:
- `domain`: Business logic and data models.
- `usecase`: Application logic and orchestrators.
- `handler`: HTTP transport, routing, and middlewares.
- `store` & `adapter`: External integrations and persistence.

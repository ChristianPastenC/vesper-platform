# Entrypoint (`cmd`)

This directory contains the main application entry points. The `server/main.go` file is responsible for wiring up the dependencies and starting the HTTP server.

## Files & Directories

- **`server/`**: Contains the `main.go` file, which is the executable that starts the API server, loads environment variables, initializes the database, and injects dependencies.
- **`tools/`**: Contains CLI tools, scripts, or database migration utilities used for administrative tasks.

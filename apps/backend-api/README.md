# Sovereign Core Platform - Backend API

This is the backend API for the Sovereign Core Platform. It provides a highly secure, Zero-Trust Architecture based implementation using Go and BoltDB.

## Environment Variables

The following environment variables are required to run the service:

- `PORT` (optional): Port for the HTTP server to listen on (default `8080`).
- `DB_PATH` (optional): Path to the BoltDB file (default `./data/sovereign.db`).
- `PAYLOAD_SECRET_KEY` (required): Secret key used for `X-Sovereign-Hash` payload integrity validation. Must be at least 32 characters.
- `ECDSA_PRIVATE_KEY_PEM` (optional): Base64url-encoded DER-format ECDSA P-256 private key.
  If not provided, the server generates an ephemeral key on each startup and logs it.
  Copy the logged key value to this variable to keep JWT sessions valid across restarts.

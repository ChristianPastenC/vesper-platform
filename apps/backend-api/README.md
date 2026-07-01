# Sovereign Core Platform - Backend API

This is the backend API for the Sovereign Core Platform. It provides a highly secure, Zero-Trust Architecture based implementation using Go and BoltDB.

## Environment Variables

The following environment variables are required to run the service:

- `PORT`: The port on which the server runs. Defaults to `8080`.
- `DB_PATH`: The path to the embedded BoltDB database file. Defaults to `./data/sovereign.db`.
- `PAYLOAD_SECRET_KEY`: A 32-character minimum secret key used for HMAC request payload validation. Required for all POST requests.
- `ECDSA_PRIVATE_KEY_PEM`: (Optional) Base64URL-encoded PEM format of the ECDSA private key used for JWT signing. If not provided, an ephemeral key will be generated and printed to the logs at startup.

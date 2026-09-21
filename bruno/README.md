# Sovereign Core Platform - Bruno API Collections

This directory contains [Bruno](https://www.usebruno.com/) collections to interact with the different services of the Sovereign Core Platform.

Bruno is an open-source IDE for exploring and testing APIs. We use it instead of Postman or Insomnia.

## Collections Included

There are two primary collections available:
1. **demo-backend**: API endpoints for the demo-backend application (Auth, Catalog, Checkout, Orders, Profile, Stores, etc.).
2. **vesper-ingestion**: API endpoints for the Vesper telemetry and analytics ingestion service.

## Setup & Local Usage

To use these collections in local development:

1. Open Bruno and click on **Open Collection**.
2. Select the `demo-backend` or `vesper-ingestion` folder.
3. In the top right corner of Bruno, select the **Local** environment from the environment dropdown.
4. If you have not created your local environment files, they are provided by default in `<collection>/environments/Local.bru`.

### demo-backend

- Ensure your local backend is running (typically on `http://localhost:8080`).
- Select the `Local` environment.
- Use the **Auth > Login User** or **Auth > Register User** endpoints to authenticate.
- A script automatically runs upon successful login/register to save the `jwt` and `refreshToken` variables to your collection session, which will automatically be injected as Bearer tokens in subsequent requests.

### vesper-ingestion

- Ensure the ingestion service is running (typically on `http://127.0.0.1:8081`).
- Select the `Local` environment.
- Note that the `vesper-ingestion` collection expects the variables `api_key` and `bundle_id` to be defined in your environment for telemetry to work.
- Use **Auth > Login** to receive an authentication token. A post-response script automatically saves this token to your `Local` environment variables as `token`.

## Using for Real / Production Calls

To run these requests against a live or production instance, you must configure a separate environment.

1. Create a new environment in Bruno (e.g., `Production` or `Staging`).
2. Define the base URL and authentication variables:
   - For `demo-backend`: Define `baseUrl` (e.g., `https://api.demo.com`).
   - For `vesper-ingestion`: Define `base_url` (e.g., `https://vesper-ingestion.onrender.com`), along with your `api_key`.
3. Switch to your new environment in the top right corner.
4. Run your requests exactly as you would locally. The environment variables will automatically route your calls and handle authentication.

*(Note: We have provided placeholder `Production` environment configurations as examples.)*

## Notes on Secrets
We utilize Bruno's secret variables feature (`vars:secret`) for sensitive information like `api_key` and `token` in `vesper-ingestion`. This ensures that they are not stored in plain text and are not committed to version control.

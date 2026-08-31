# Demo Mobile App (`demo-mobile`)

Welcome to the React Native (Expo/Bare) mobile application demonstrating the integration of `@vesper-core/ghost-ledger`.

## Purpose
This mobile application serves as a real-world integration example for the Vesper Zero-Trust cryptographic library. It simulates an e-commerce platform where users can browse a catalog, authenticate, and process payments.

## Architecture

The app is built using React Native and leverages the native JSI bindings provided by `ghost-ledger`.

<details>
<summary><strong>View Directory Structure</strong></summary>

| Directory | Description |
| :--- | :--- |
| **`src/features/`** | Contains domain-specific modules such as `auth`, `catalog`, and `payment`. Each module houses its own React components and custom hooks (e.g., `useSovereignCheckout.ts`). |
| **`src/providers/`** | Global context providers. This includes the `SovereignClientContext.tsx` which initializes and exposes the `SovereignClientCore` singleton globally to the app. |
| **`android/` & `ios/`** | The native projects configured to link the C++ static ledger engine seamlessly during the build process. |
| **`scripts/`** | Contains the `frida_dast_test.py` script used by the CI/CD pipeline to simulate memory tampering attacks. |

</details>

## Getting Started

### Prerequisites
- Node.js (v22+)
- Android Studio (for Android emulation) or Xcode (for iOS emulation on macOS).

### Installation

1. Navigate to the `demo-mobile` directory:
   ```bash
   cd examples/demo-mobile
   ```
2. Install dependencies (ensure `@vesper-core/ghost-ledger` is built first in `packages/ghost-ledger`):
   ```bash
   yarn install
   ```

### Running the App

<details>
<summary><strong>View Commands</strong></summary>

- **Start Metro Bundler:**
  ```bash
  yarn start
  ```
- **Run on Android:**
  ```bash
  yarn android
  ```
- **Run on iOS:**
  ```bash
  yarn ios
  ```

</details>

## Security Testing (Frida)

This application includes a Python script (`scripts/frida_dast_test.py`) that uses **Frida** to dynamically hook into the running Android application's process and overwrite the C++ Volatile RAM Ledger. This triggers the `IntegrityBreachError` locally to test the app's tampering resistance. 

> [!NOTE]
> This DAST test is fully automated via GitHub Actions in `.github/workflows/demo-mobile-ci.yml`.

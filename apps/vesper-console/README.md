# Vesper Console (B2B Frontend)

[![Console Deployment](https://img.shields.io/badge/Live_Deployment-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://vesper-console.netlify.app/)

Welcome to the frontend portal for the Vesper Developer Platform. Built with **Astro** and **Tailwind CSS**, it serves as the lightweight management console for tenant organizations.

## 🚀 Live Environment

The production build of this portal is continuously deployed on Netlify. You can access the live dashboard here:
**[https://vesper-console.netlify.app/](https://vesper-console.netlify.app/)**

---

## Features

- **Zero-JavaScript Hydration**: Astro builds the site statically, shipping vanilla JavaScript only for the dynamic `Chart.js` components, making it incredibly fast.
- **Tenant Management**: Secure B2B registration and login flows.
- **API Key Generation**: Issue `X-Sovereign-API-Key` headers securely bound to your organization for the mobile SDK.
- **Real-time Telemetry Dashboard**: Visualizes incoming SDK integrity failures, timeouts, and latency metrics in real-time.

## Local Development

### Prerequisites
- Node.js (v22+)

### Installation & Run

1. Navigate to the console directory:
   ```bash
   cd apps/vesper-console
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Astro development server:
   ```bash
   npm run dev
   ```

> [!NOTE]
> The development server forces port `4000` via `package.json` to avoid colliding with Astro's default `4321`. Navigate to `http://localhost:4000` to view the portal.

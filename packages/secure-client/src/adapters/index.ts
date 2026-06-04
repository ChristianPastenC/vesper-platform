/**
 * @sovereign/secure-client/adapters
 *
 * This subpath export exposes the concrete network adapters and their functional
 * equivalents, allowing consumers to choose the transport mechanism that best
 * fits their application architecture.
 */

// Export standard fetch adapter
export * from './fetch/index.js';

// Export Axios adapter
export * from './axios/index.js';

// Export GraphQL adapter
export * from './graphql/index.js';

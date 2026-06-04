/**
 * @sovereign/secure-client — abstract interface contracts
 *
 * This module is the single source of truth for every abstract interface in
 * the SovereignCore framework. It has ZERO imports — all types are either
 * primitives or sourced from the TypeScript standard library (lib.es2022,
 * lib.dom) with no NPM package dependencies whatsoever.
 */

export * from './crypto.js';
export * from './network.js';

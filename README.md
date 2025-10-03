# zama - Private Football 1X2 (FHEVM demo)

This project demonstrates a privacy-preserving Football 1X2 betting flow on EVM-compatible chains using the FHEVM approach. The smart contract is under `contracts/`, and the frontend follows the structure of `fhe-rock-paper-scissors`.

Note: The cryptographic logic here is a simplified demo and not production secure. It exists to show end-to-end workflow and frontend/contract integration.

## Contracts

- Location: `zama/contracts`
- Main contract: `PrivacyFootball1X2.sol`

### Quick start

1. Install deps: pnpm i (or npm i / yarn)
2. Compile: pnpm hardhat compile
3. Local deploy: node scripts/deploy.js

## Frontend

The frontend mirrors `fhe-rock-paper-scissors/frontend` with pages for listing matches, betting, settlement, and claiming rewards. Demo mode is enabled by default and calls `placeBetMock(uint8)`. To enable the production FHEVM encrypted path, set `IS_DEMO` to `false` in `src/config/app.js`, integrate `@fhevm/sdk`, then call `placeBet(externalEuint32, attestation)`.

## Warning

Do not use this demo directly in production.

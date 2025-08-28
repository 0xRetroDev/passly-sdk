# Passly SDK

Official JavaScript SDK for the Passly identity protocol - a social identity layer that helps verify user identities and works as an anti-sybil tool.

## Installation

```bash
npm install @passly/passly-sdk
```

## Quick Start

```javascript
import PasslySDK from '@passly/passly-sdk';

// Initialize the SDK
const passly = new PasslySDK();

// Connect to the contract
await passly.connect();

// Check if a user has a passport
const hasPassport = await passly.hasPassport('0x1234...');

// Get complete passport data
const passport = await passly.getPassport('0x1234...');
console.log(passport);
```

## Core Features

- ✅ **Identity Verification**: Check if users have verified social accounts
- ✅ **Anti-Sybil Protection**: Verify unique identity across platforms
- ✅ **Multiple Platforms**: Twitter, Discord, GitHub, Telegram support
- ✅ **Verification Strength**: Calculate identity confidence scores
- ✅ **Account Age**: Track how long identities have been verified

## Links

- [Documentation](https://passly.xyz/docs)
- [Website](https://passly.xyz)
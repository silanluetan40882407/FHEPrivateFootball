export const CONTRACT_ADDRESS = "0x74113F03E6E6615dFdFfA27e5417cB66cf4138B2" // replace after deployment

// Update with compiler artifact if needed:
// artifacts/contracts/PrivacyFootball1X2.sol/PrivacyFootball1X2.json
// Minimal ABI subset used by this frontend
export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "metadata", "type": "string" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "createMatch",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "matchId", "type": "uint256" }, { "internalType": "uint8", "name": "plainChoice", "type": "uint8" } ],
    "name": "placeBetMock",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "matchId", "type": "uint256" } ],
    "name": "closeMatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "matchId", "type": "uint256" },
      { "internalType": "uint32", "name": "resultPlain", "type": "uint32" }
    ],
    "name": "settleMatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "matchId", "type": "uint256" } ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "matchCounter",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  }
]

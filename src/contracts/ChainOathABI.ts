// ChainOath 智能合约 ABI
export const ChainOathABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createOath",
    "inputs": [
      {
        "name": "_oath",
        "type": "tuple",
        "components": [
          { "name": "title", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "committer", "type": "address" },
          { "name": "supervisors", "type": "address[]" },
          { "name": "totalReward", "type": "uint256" },
          { "name": "committerStake", "type": "uint256" },
          { "name": "supervisorStake", "type": "uint256" },
          { "name": "supervisorRewardRatio", "type": "uint16" },
          { "name": "checkInterval", "type": "uint32" },
          { "name": "checkWindow", "type": "uint32" },
          { "name": "checkThresholdPercent", "type": "uint16" },
          { "name": "maxSupervisorMisses", "type": "uint16" },
          { "name": "maxCommitterFailures", "type": "uint16" },
          { "name": "checkRoundsCount", "type": "uint16" },
          { "name": "startTime", "type": "uint32" },
          { "name": "endTime", "type": "uint32" },
          { "name": "createTime", "type": "uint32" },
          { "name": "creator", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "status", "type": "uint8" }
        ]
      },
      { "name": "_token", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "committerStake",
    "inputs": [
      { "name": "_oathId", "type": "uint256" },
      { "name": "_token", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supervisorStake",
    "inputs": [
      { "name": "_oathId", "type": "uint256" },
      { "name": "_token", "type": "address" },
      { "name": "_amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nextOathId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "oaths",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "title", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "committer", "type": "address" },
      { "name": "supervisors", "type": "address[]" },
      { "name": "totalReward", "type": "uint256" },
      { "name": "committerStake", "type": "uint256" },
      { "name": "supervisorStake", "type": "uint256" },
      { "name": "supervisorRewardRatio", "type": "uint16" },
      { "name": "checkInterval", "type": "uint32" },
      { "name": "checkWindow", "type": "uint32" },
      { "name": "checkThresholdPercent", "type": "uint16" },
      { "name": "maxSupervisorMisses", "type": "uint16" },
      { "name": "maxCommitterFailures", "type": "uint16" },
      { "name": "checkRoundsCount", "type": "uint16" },
      { "name": "startTime", "type": "uint32" },
      { "name": "endTime", "type": "uint32" },
      { "name": "createTime", "type": "uint32" },
      { "name": "creator", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "OathCreated",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "title", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "StakeDeposited",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true },
      { "name": "staker", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "token", "type": "address", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "OathAccepted",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "OathAborted",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true }
    ]
  }
] as const;

// ERC20 代币 ABI（简化版）
export const ERC20ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  }
] as const;
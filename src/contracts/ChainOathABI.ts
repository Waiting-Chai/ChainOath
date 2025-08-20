// ChainOathSecure 智能合约 ABI（安全版本）
export const ChainOathSecureABI = [
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
      { "name": "_amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitSupervision",
    "inputs": [
      { "name": "_oathId", "type": "uint256" },
      { "name": "_approval", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimReward",
    "inputs": [
      { "name": "_oathId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateTokenWhitelist",
    "inputs": [
      { "name": "_token", "type": "address" },
      { "name": "_isWhitelisted", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emergencyPause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "emergencyUnpause",
    "inputs": [],
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
    "name": "tokenWhitelist",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
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
    "type": "function",
    "name": "getOath",
    "inputs": [{ "name": "_oathId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
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
      }
    ],
    "stateMutability": "view"
   },
   {
     "type": "function",
     "name": "hasStaked",
     "inputs": [
       { "name": "_oathId", "type": "uint256" },
       { "name": "_addr", "type": "address" }
     ],
     "outputs": [{ "name": "", "type": "bool" }],
     "stateMutability": "view"
   },
   {
     "type": "function",
     "name": "checkOathStatus",
     "inputs": [{ "name": "_oathId", "type": "uint256" }],
     "outputs": [],
     "stateMutability": "nonpayable"
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
  },
  {
    "type": "event",
    "name": "OathFulfilled",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "OathBroken",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "SupervisionSubmitted",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true },
      { "name": "round", "type": "uint16", "indexed": false },
      { "name": "supervisor", "type": "address", "indexed": true },
      { "name": "approval", "type": "bool", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "RewardClaimed",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true },
      { "name": "claimer", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "token", "type": "address", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TokenWhitelistUpdated",
    "inputs": [
      { "name": "token", "type": "address", "indexed": true },
      { "name": "isWhitelisted", "type": "bool", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "EmergencyWithdraw",
    "inputs": [
      { "name": "oathId", "type": "uint256", "indexed": true },
      { "name": "token", "type": "address", "indexed": false },
      { "name": "amount", "type": "uint256", "indexed": false }
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

// WETH (Wrapped Ether) ABI
export const WETHABI = [
  {
    "type": "function",
    "name": "deposit",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawAll",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getETHBalance",
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
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
  },
  {
    "type": "event",
    "name": "Deposit",
    "inputs": [
      { "name": "account", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Withdrawal",
    "inputs": [
      { "name": "account", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  }
] as const;
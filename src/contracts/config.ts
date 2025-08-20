// 智能合约配置
export const CONTRACT_CONFIG = {
  // 主网配置
  mainnet: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    chainOathAddress: import.meta.env.VITE_MAINNET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', // 需要部署后更新
    chainOathNFTAddress: import.meta.env.VITE_MAINNET_NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', // NFT 合约地址
    blockExplorer: 'https://etherscan.io'
  },
  // Sepolia 测试网配置
  sepolia: {
    chainId: 11155111,
    chainName: 'Sepolia Testnet',
    chainOathAddress: import.meta.env.VITE_SEPOLIA_CONTRACT_ADDRESS || '0x217390d10edc2c82c7ff2bcdb0d20f257a8f5485', // ChainOath 主合约地址 (已部署)
    chainOathNFTAddress: import.meta.env.VITE_SEPOLIA_NFT_CONTRACT_ADDRESS || '0x3f24af74f777c61055940e72f2bc181c373b3cb0', // ChainOathNFT 合约地址 (已部署)
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  // 本地开发网络
  localhost: {
    chainId: 31337,
    chainName: 'Localhost',
    chainOathAddress: import.meta.env.VITE_LOCALHOST_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', // 需要部署后更新
    chainOathNFTAddress: import.meta.env.VITE_LOCALHOST_NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', // NFT 合约地址
    blockExplorer: ''
  }
};

// 网络配置选项
export type NetworkType = 'mainnet' | 'sepolia' | 'localhost';

// 当前使用的网络配置（可通过环境变量或手动设置）
export const CURRENT_NETWORK: NetworkType = (
  import.meta.env.VITE_NETWORK as NetworkType
) || (
  import.meta.env.DEV ? 'localhost' : 'sepolia'
);

// 获取当前网络配置
export const getCurrentNetworkConfig = () => {
  const config = CONTRACT_CONFIG[CURRENT_NETWORK];
  if (!config) {
    throw new Error(`Unsupported network: ${CURRENT_NETWORK}`);
  }
  return config;
};

// 获取指定网络配置
export const getNetworkConfig = (network: NetworkType) => {
  const config = CONTRACT_CONFIG[network];
  if (!config) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return config;
};

// 检查当前网络是否为测试网
export const isTestNetwork = () => {
  return CURRENT_NETWORK === 'sepolia' || CURRENT_NETWORK === 'localhost';
};

// 获取网络显示名称
export const getNetworkDisplayName = (network?: NetworkType) => {
  const targetNetwork = network || CURRENT_NETWORK;
  return CONTRACT_CONFIG[targetNetwork]?.chainName || 'Unknown Network';
};

// 常用的 ERC20 代币地址（Sepolia 测试网）
export const TEST_TOKENS = {
  sepolia: {
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH9
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
    DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6'   // Sepolia DAI
  },
  mainnet: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // 主网 WETH
    USDC: '0xA0b86a33E6441b8C4505B6B8C0C4C8C4C4C4C4C4', // 主网 USDC
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // 主网 USDT
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'   // 主网 DAI
  },
  localhost: {
    WETH: '0x0000000000000000000000000000000000000000', // 本地环境需要部署WETH合约
    USDC: '0x0000000000000000000000000000000000000000',
    USDT: '0x0000000000000000000000000000000000000000',
    DAI: '0x0000000000000000000000000000000000000000'
  }
};

// 获取当前网络的测试代币
export const getCurrentTestTokens = () => {
  return TEST_TOKENS[CURRENT_NETWORK as keyof typeof TEST_TOKENS] || TEST_TOKENS.sepolia;
};

// ========== 合约使用场景和调用参数配置 ==========

/**
 * ChainOath 主合约功能配置
 * 包含所有核心业务功能的使用场景和参数说明
 */
export const CHAINOATH_CONTRACT_CONFIG = {
  // 合约基本信息
  contractInfo: {
    name: 'ChainOathSecure',
    description: 'ChainOath 去中心化誓约平台主合约',
    version: '1.0.0',
    features: [
      '誓约创建与管理',
      '质押与奖励机制',
      '监督者验证系统',
      '检查点进度跟踪',
      '社交互动功能'
    ]
  },
  
  // 核心功能配置
  functions: {
    // 誓约管理
    oathManagement: {
      createOath: {
        description: '创建新的誓约',
        gasLimit: 500000,
        requiredParams: [
          'title: string - 誓约标题',
          'description: string - 誓约描述',
          'committers: string[] - 守约人地址列表',
          'supervisors: string[] - 监督者地址列表',
          'totalReward: string - 总奖励金额',
          'committerStakeAmount: string - 守约人质押金额',
          'supervisorStakeAmount: string - 监督者质押金额',
          'tokenAddress: string - ERC20代币地址'
        ],
        validationRules: {
          minStakeAmount: '0.001', // 最小质押金额 (ETH)
          maxSupervisors: 10,
          maxCommitters: 5,
          titleMaxLength: 100,
          descriptionMaxLength: 1000
        }
      },
      getOath: {
        description: '获取誓约详细信息',
        gasLimit: 0, // view function
        requiredParams: ['oathId: string - 誓约ID'],
        returnType: 'OathData - 完整的誓约信息对象'
      }
    },
    
    // 质押系统
    stakingSystem: {
      committerStake: {
        description: '守约人进行质押',
        gasLimit: 200000,
        requiredParams: [
          'oathId: string - 誓约ID',
          'amount: string - 质押金额'
        ],
        prerequisites: ['代币授权', '誓约状态为Pending']
      },
      supervisorStake: {
        description: '监督者进行质押',
        gasLimit: 200000,
        requiredParams: [
          'oathId: string - 誓约ID',
          'amount: string - 质押金额'
        ],
        prerequisites: ['代币授权', '誓约状态为Pending', '用户为指定监督者']
      },
      claimReward: {
        description: '领取奖励',
        gasLimit: 150000,
        requiredParams: ['oathId: string - 誓约ID'],
        prerequisites: ['誓约已完成', '用户有可领取奖励']
      }
    },
    
    // 监督验证
    supervisionSystem: {
      submitSupervision: {
        description: '提交监督验证',
        gasLimit: 300000,
        requiredParams: [
          'oathId: string - 誓约ID',
          'approved: boolean - 是否批准'
        ],
        prerequisites: ['用户为监督者', '在验证窗口期内']
      },
      completeCheckpoint: {
        description: '完成检查点',
        gasLimit: 250000,
        requiredParams: [
          'oathId: string - 誓约ID',
          'checkpointIndex: number - 检查点索引'
        ],
        prerequisites: ['用户为守约人', '检查点未完成']
      }
    },
    
    // 社交功能
    socialFeatures: {
      likeOath: {
        description: '点赞誓约',
        gasLimit: 100000,
        requiredParams: ['oathId: string - 誓约ID']
      },
      addComment: {
        description: '添加评论',
        gasLimit: 150000,
        requiredParams: [
          'oathId: string - 誓约ID',
          'content: string - 评论内容'
        ],
        validationRules: {
          maxLength: 500
        }
      }
    }
  },
  
  // 事件监听配置
  events: {
    OathCreated: {
      description: '誓约创建事件',
      parameters: ['oathId', 'creator', 'title']
    },
    StakeDeposited: {
      description: '质押存入事件',
      parameters: ['oathId', 'staker', 'amount', 'token']
    },
    OathAccepted: {
      description: '誓约接受事件',
      parameters: ['oathId']
    },
    CheckpointCompleted: {
      description: '检查点完成事件',
      parameters: ['oathId', 'checkpointIndex', 'completedBy']
    }
  }
};

/**
 * ChainOathNFT 合约功能配置
 * 成就NFT系统的使用场景和参数说明
 */
export const CHAINOATH_NFT_CONFIG = {
  // 合约基本信息
  contractInfo: {
    name: 'ChainOathNFT',
    description: 'ChainOath 成就NFT合约',
    version: '1.0.0',
    features: [
      '成就NFT铸造',
      '成就条件验证',
      '元数据管理',
      '成就展示'
    ]
  },
  
  // 成就类型配置
  achievementTypes: {
    OATH_CREATOR: {
      name: '誓约创建者',
      description: '成功创建誓约的用户',
      requirement: '创建1个或更多誓约',
      rarity: 'common',
      mintPrice: '0.001' // ETH
    },
    OATH_KEEPER: {
      name: '守约达人',
      description: '成功完成誓约的守约人',
      requirement: '完成1个或更多誓约',
      rarity: 'uncommon',
      mintPrice: '0.001'
    },
    SUPERVISOR: {
      name: '监督专家',
      description: '积极参与监督的用户',
      requirement: '完成1次或更多监督',
      rarity: 'uncommon',
      mintPrice: '0.001'
    },
    COMMUNITY_STAR: {
      name: '社区之星',
      description: '活跃的社区参与者',
      requirement: '获得10个或更多点赞',
      rarity: 'rare',
      mintPrice: '0.001'
    },
    CHECKPOINT_MASTER: {
      name: '检查点大师',
      description: '检查点完成专家',
      requirement: '完成5个或更多检查点',
      rarity: 'rare',
      mintPrice: '0.001'
    },
    ENGAGEMENT_KING: {
      name: '互动之王',
      description: '社交互动达人',
      requirement: '发表20条或更多评论',
      rarity: 'epic',
      mintPrice: '0.001'
    }
  },
  
  // 核心功能配置
  functions: {
    mintAchievement: {
      description: '铸造成就NFT',
      gasLimit: 300000,
      requiredParams: [
        'achievementType: AchievementType - 成就类型',
        'oathId: number - 相关誓约ID',
        'metadataURI: string - 元数据URI'
      ],
      payableAmount: '0.001', // ETH
      prerequisites: ['满足成就条件', '支付铸造费用']
    },
    hasAchievement: {
      description: '检查用户是否拥有特定成就',
      gasLimit: 0, // view function
      requiredParams: [
        'user: string - 用户地址',
        'achievementType: AchievementType - 成就类型'
      ],
      returnType: 'boolean'
    },
    checkEligibility: {
      description: '检查用户成就资格',
      gasLimit: 0, // view function
      requiredParams: [
        'user: string - 用户地址',
        'achievementType: AchievementType - 成就类型'
      ],
      returnType: 'boolean'
    }
  },
  
  // 事件监听配置
  events: {
    AchievementMinted: {
      description: '成就NFT铸造事件',
      parameters: ['tokenId', 'recipient', 'achievementType', 'oathId']
    },
    AchievementRequirementUpdated: {
      description: '成就要求更新事件',
      parameters: ['achievementType', 'newRequirement']
    }
  }
};

/**
 * 合约交互最佳实践配置
 */
export const CONTRACT_BEST_PRACTICES = {
  // Gas 优化建议
  gasOptimization: {
    batchOperations: '批量操作以节省Gas费用',
    estimateGas: '交易前预估Gas费用',
    useMulticall: '使用Multicall进行批量查询'
  },
  
  // 错误处理
  errorHandling: {
    networkValidation: '验证网络连接和配置',
    balanceCheck: '检查用户余额和授权',
    statusValidation: '验证合约和誓约状态',
    retryMechanism: '实现交易重试机制'
  },
  
  // 安全建议
  security: {
    inputValidation: '严格验证所有输入参数',
    amountChecks: '验证金额范围和精度',
    addressValidation: '验证地址格式和有效性',
    slippageProtection: '实现滑点保护机制'
  }
};
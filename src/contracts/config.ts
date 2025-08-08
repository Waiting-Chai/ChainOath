// 智能合约配置
export const CONTRACT_CONFIG = {
  // 主网配置
  mainnet: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    chainOathAddress: '0x1234567890123456789012345678901234567890', // 示例地址，需要部署后替换
    blockExplorer: 'https://etherscan.io'
  },
  // Sepolia 测试网配置
  sepolia: {
    chainId: 11155111,
    chainName: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    chainOathAddress: '0x0000000000000000000000000000000000000000', // 待部署
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  // 本地开发网络
  localhost: {
    chainId: 31337,
    chainName: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    chainOathAddress: '0x0000000000000000000000000000000000000000', // 待部署
    blockExplorer: ''
  }
};

// 当前使用的网络（开发时使用 sepolia，生产时使用 mainnet）
export const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'sepolia';

// 获取当前网络配置
export const getCurrentNetworkConfig = () => {
  return CONTRACT_CONFIG[CURRENT_NETWORK as keyof typeof CONTRACT_CONFIG];
};

// 常用的 ERC20 代币地址（Sepolia 测试网）
export const TEST_TOKENS = {
  sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
    DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6'   // Sepolia DAI
  },
  mainnet: {
    USDC: '0xA0b86a33E6441b8C4505B6B8C0C4C8C4C4C4C4C4', // 主网 USDC
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // 主网 USDT
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'   // 主网 DAI
  }
};

// 获取当前网络的测试代币
export const getCurrentTestTokens = () => {
  return TEST_TOKENS[CURRENT_NETWORK as keyof typeof TEST_TOKENS] || TEST_TOKENS.sepolia;
};
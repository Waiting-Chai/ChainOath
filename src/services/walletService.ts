import { ethers } from 'ethers';
import { getCurrentNetworkConfig, getNetworkDisplayName } from '../contracts/config';

/**
 * 钱包连接状态
 */
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
}

/**
 * 钱包连接服务
 */
export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private listeners: ((state: WalletState) => void)[] = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      // 监听账户变化
      window.ethereum.on('accountsChanged', (...args: unknown[]) => {
        const accounts = args[0] as string[];
        console.log('账户变化:', accounts);
        if (accounts.length > 0) {
          this.handleAccountChange(accounts[0]);
        } else {
          this.disconnect();
        }
      });

      // 监听网络变化
      window.ethereum.on('chainChanged', (...args: unknown[]) => {
        const chainId = args[0] as string;
        console.log('网络变化:', chainId);
        const parsedChainId = parseInt(chainId, 16);
        this.handleChainChange(parsedChainId);
      });
    }
  }

  /**
   * 处理账户变化
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleAccountChange(_newAddress: string): Promise<void> {
    try {
      if (this.provider) {
        this.signer = await this.provider.getSigner();
        await this.notifyStateChange();
      }
    } catch (error) {
      console.error('处理账户变化失败:', error);
    }
  }

  /**
   * 处理网络变化
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleChainChange(_newChainId: number): Promise<void> {
    try {
      await this.notifyStateChange();
    } catch (error) {
      console.error('处理网络变化失败:', error);
    }
  }

  /**
   * 连接钱包
   */
  async connect(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包');
      }

      // 请求连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 创建 provider 和 signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // 验证网络
      await this.validateNetwork();
      
      // 获取用户地址
      const address = await this.signer.getAddress();
      console.log('钱包连接成功:', address);
      
      // 通知状态变化
      await this.notifyStateChange();
      
      return address;
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    }
  }

  /**
   * 断开钱包连接
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.notifyStateChange();
    console.log('钱包已断开连接');
  }

  /**
   * 验证当前网络是否正确
   */
  private async validateNetwork(): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('Provider 未初始化');
      }

      const network = await this.provider.getNetwork();
      const networkConfig = getCurrentNetworkConfig();
      
      if (Number(network.chainId) !== networkConfig.chainId) {
        throw new Error(
          `网络不匹配！请切换到 ${getNetworkDisplayName()} (Chain ID: ${networkConfig.chainId})`
        );
      }

      console.log(`网络验证成功: ${getNetworkDisplayName()} (Chain ID: ${network.chainId})`);
    } catch (error) {
      console.error('网络验证失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前钱包状态
   */
  async getWalletState(): Promise<WalletState> {
    try {
      if (!this.provider || !this.signer) {
        return {
          isConnected: false,
          address: null,
          chainId: null,
          balance: null
        };
      }

      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(address);

      return {
        isConnected: true,
        address,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance)
      };
    } catch (error) {
      console.error('获取钱包状态失败:', error);
      return {
        isConnected: false,
        address: null,
        chainId: null,
        balance: null
      };
    }
  }

  /**
   * 获取当前地址
   */
  async getCurrentAddress(): Promise<string | null> {
    try {
      if (!this.signer) {
        return null;
      }
      return await this.signer.getAddress();
    } catch (error) {
      console.error('获取当前地址失败:', error);
      return null;
    }
  }

  /**
   * 获取 Provider
   */
  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  /**
   * 获取 Signer
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }

  /**
   * 添加状态变化监听器
   */
  addStateListener(listener: (state: WalletState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除状态变化监听器
   */
  removeStateListener(listener: (state: WalletState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知状态变化
   */
  private async notifyStateChange(): Promise<void> {
    const state = await this.getWalletState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 切换到指定网络
   */
  async switchNetwork(chainId: number): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask 未安装');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
    } catch (error: unknown) {
      // 如果网络不存在，尝试添加网络
      const err = error as { code?: number };
      if (err.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  /**
   * 添加网络到 MetaMask
   */
  private async addNetwork(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask 未安装');
    }

    // 这里可以根据 chainId 添加对应的网络配置
    // 目前只支持 Sepolia 测试网
    if (chainId === 11155111) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Test Network',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io/']
        }]
      });
    } else {
      throw new Error(`不支持的网络 ID: ${chainId}`);
    }
  }
}

// 创建全局钱包服务实例
export const walletService = new WalletService();
import { Client } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';

/**
 * 钱包类型常量
 */
const WalletType = {
  COINBASE: 'coinbase',
  METAMASK: 'metamask',
  UNKNOWN: 'unknown'
} as const;

type WalletType = typeof WalletType[keyof typeof WalletType];

/**
 * 钱包检测接口
 */
interface WalletProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * 增强的XMTP通知服务
 * 支持Coinbase Wallet和MetaMask的兼容性
 */
export class EnhancedXmtpService {
  private xmtpClient: Client | null = null;
  private isInitialized: boolean = false;
  private signer: ethers.Signer | null = null;
  private currentWalletType: WalletType = WalletType.UNKNOWN;
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    // 客户端将在需要时初始化
  }

  /**
   * 检测可用的钱包类型
   */
  private detectWalletType(): WalletType {
    if (typeof window === 'undefined') {
      return WalletType.UNKNOWN;
    }

    // 检查Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      return WalletType.COINBASE;
    }

    // 检查是否有多个钱包提供者
    if (window.ethereum?.providers) {
      const coinbaseProvider = window.ethereum.providers.find(
        (provider: WalletProvider) => provider.isCoinbaseWallet
      );
      if (coinbaseProvider) {
        return WalletType.COINBASE;
      }
    }

    // 检查MetaMask
    if (window.ethereum?.isMetaMask) {
      return WalletType.METAMASK;
    }

    // 检查是否有ethereum对象（可能是其他钱包）
    if (window.ethereum) {
      return WalletType.METAMASK; // 默认作为MetaMask处理
    }

    return WalletType.UNKNOWN;
  }

  /**
   * 获取指定类型的钱包提供者
   */
  private getWalletProvider(walletType: WalletType): WalletProvider | null {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }

    if (walletType === WalletType.COINBASE) {
      // 优先查找Coinbase Wallet
      if (window.ethereum.isCoinbaseWallet) {
        return window.ethereum;
      }

      // 在多个提供者中查找Coinbase Wallet
      if (window.ethereum.providers) {
        const coinbaseProvider = window.ethereum.providers.find(
          (provider: WalletProvider) => provider.isCoinbaseWallet
        );
        return coinbaseProvider || null;
      }
    }

    if (walletType === WalletType.METAMASK) {
      // 查找MetaMask
      if (window.ethereum.isMetaMask && !window.ethereum.isCoinbaseWallet) {
        return window.ethereum;
      }

      // 在多个提供者中查找MetaMask
      if (window.ethereum.providers) {
        const metamaskProvider = window.ethereum.providers.find(
          (provider: WalletProvider) => provider.isMetaMask && !provider.isCoinbaseWallet
        );
        return metamaskProvider || null;
      }

      // 如果没有明确标识，使用默认的ethereum对象
      return window.ethereum;
    }

    return null;
  }

  /**
   * 初始化XMTP客户端，强制优先使用Coinbase Wallet
   */
  async initializeXMTP(): Promise<{
    success: boolean;
    walletType: WalletType;
    message: string;
  }> {
    try {
      // 检测可用的钱包
      const detectedWallet = this.detectWalletType();
      
      if (detectedWallet === WalletType.UNKNOWN) {
        return {
          success: false,
          walletType: WalletType.UNKNOWN,
          message: '未检测到支持的钱包'
        };
      }

      // 强制优先使用Coinbase Wallet
      let targetWallet: WalletType = WalletType.COINBASE;
      
      // 首先尝试Coinbase Wallet
      const coinbaseProvider = this.getWalletProvider(WalletType.COINBASE);
      if (!coinbaseProvider) {
        console.log('Coinbase Wallet不可用，回退到MetaMask');
        targetWallet = WalletType.METAMASK;
      } else {
        console.log('检测到Coinbase Wallet，优先使用');
      }

      // 获取钱包提供者
      const walletProvider = this.getWalletProvider(targetWallet);
      if (!walletProvider) {
        return {
          success: false,
          walletType: targetWallet,
          message: `${targetWallet} 钱包不可用`
        };
      }

      // 创建ethers提供者
      this.provider = new ethers.BrowserProvider(walletProvider as ethers.Eip1193Provider);
      
      // 请求账户访问
      await walletProvider.request({ method: 'eth_requestAccounts' });
      
      // 获取签名者
      this.signer = await this.provider.getSigner();
      
      // 创建XMTP客户端
      this.xmtpClient = await Client.create(this.signer, {
        env: 'production' // 可以改为 'dev' 用于测试
      });
      
      this.isInitialized = true;
      this.currentWalletType = targetWallet;
      
      const walletName = targetWallet === WalletType.COINBASE ? 'Coinbase Wallet' : 'MetaMask';
      
      return {
        success: true,
        walletType: targetWallet,
        message: `XMTP客户端已使用 ${walletName} 初始化成功`
      };
    } catch (error) {
      console.error('XMTP客户端初始化失败:', error);
      return {
        success: false,
        walletType: WalletType.UNKNOWN,
        message: `XMTP客户端初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 检查地址是否可以接收XMTP消息
   */
  async canMessage(address: string): Promise<boolean> {
    if (!this.xmtpClient) {
      console.warn('XMTP客户端未初始化');
      return false;
    }

    try {
      return await this.xmtpClient.canMessage(address);
    } catch (error) {
      console.error(`检查地址 ${address} 是否可发送消息失败:`, error);
      return false;
    }
  }

  /**
   * 发送XMTP消息
   */
  async sendMessage(recipientAddress: string, message: string): Promise<boolean> {
    if (!this.xmtpClient) {
      console.warn('XMTP客户端未初始化');
      return false;
    }

    try {
      // 检查是否可以发送消息
      const canMessage = await this.canMessage(recipientAddress);
      if (!canMessage) {
        console.warn(`地址 ${recipientAddress} 无法接收XMTP消息`);
        return false;
      }

      // 创建或获取对话
      const conversation = await this.xmtpClient.conversations.newConversation(recipientAddress);
      
      // 发送消息
      await conversation.send(message);
      console.log(`消息已发送给 ${recipientAddress}`);
      return true;
    } catch (error) {
      console.error(`发送消息给 ${recipientAddress} 失败:`, error);
      return false;
    }
  }

  /**
   * 批量发送XMTP消息
   */
  async sendBatchMessages(recipients: string[], message: string): Promise<{
    success: string[];
    failed: string[];
  }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const recipient of recipients) {
      const sent = await this.sendMessage(recipient, message);
      if (sent) {
        results.success.push(recipient);
      } else {
        results.failed.push(recipient);
      }
    }

    return results;
  }

  /**
   * 发送誓约创建通知
   */
  async sendOathCreatedNotification(
    oathId: string,
    oathTitle: string,
    recipientAddresses: string[]
  ): Promise<{
    success: string[];
    failed: string[];
  }> {
    const message = `🔗 ChainOath 通知\n\n` +
      `您好！有人创建了一个需要您参与的誓约：\n\n` +
      `📋 誓约标题: ${oathTitle}\n` +
      `🆔 誓约ID: ${oathId}\n\n` +
      `请访问 ChainOath 平台查看详情并完成质押。\n\n` +
      `🌐 访问链接: ${window.location.origin}/oath/${oathId}\n\n` +
      `⚠️ 请及时完成质押，以确保誓约能够正常启动。`;

    return await this.sendBatchMessages(recipientAddresses, message);
  }

  /**
   * 发送质押提醒通知
   */
  async sendStakeReminderNotification(
    oathId: string,
    oathTitle: string,
    recipientAddresses: string[],
    role: 'committer' | 'supervisor'
  ): Promise<{
    success: string[];
    failed: string[];
  }> {
    const roleText = role === 'committer' ? '受约人' : '监督者';
    
    const message = `⏰ ChainOath 质押提醒\n\n` +
      `您好！您作为${roleText}参与的誓约即将开始，请尽快完成质押：\n\n` +
      `📋 誓约标题: ${oathTitle}\n` +
      `🆔 誓约ID: ${oathId}\n` +
      `👤 您的角色: ${roleText}\n\n` +
      `请访问 ChainOath 平台完成质押操作。\n\n` +
      `🌐 访问链接: ${window.location.origin}/oath/${oathId}\n\n` +
      `⚠️ 如果不及时质押，誓约可能无法正常启动。`;

    return await this.sendBatchMessages(recipientAddresses, message);
  }

  /**
   * 获取客户端状态
   */
  async getClientStatus(): Promise<{
    isInitialized: boolean;
    walletType: WalletType;
    address: string | null;
  }> {
    return {
      isInitialized: this.isInitialized,
      walletType: this.currentWalletType,
      address: this.signer ? await this.signer.getAddress() : null
    };
  }

  /**
   * 重置客户端
   */
  reset(): void {
    this.xmtpClient = null;
    this.isInitialized = false;
    this.signer = null;
    this.currentWalletType = WalletType.UNKNOWN;
    this.provider = null;
  }
}

// 导出单例实例
export const enhancedXmtpService = new EnhancedXmtpService();
export { WalletType };
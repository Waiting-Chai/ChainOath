import { ethers } from 'ethers';
import { ChainOathABI, ERC20ABI } from '../contracts/ChainOathABI';
import { getCurrentNetworkConfig } from '../contracts/config';

/**
 * 智能合约交互服务
 */
export class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private chainOathContract: ethers.Contract | null = null;

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      // 检查是否有 MetaMask
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包');
      }

      // 创建 provider 和 signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // 获取网络配置
      const networkConfig = getCurrentNetworkConfig();
      
      // 创建合约实例
      if (networkConfig.chainOathAddress !== '0x0000000000000000000000000000000000000000') {
        this.chainOathContract = new ethers.Contract(
          networkConfig.chainOathAddress,
          ChainOathABI,
          this.signer
        );
      }

      console.log('合约服务初始化成功');
    } catch (error) {
      console.error('合约服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 连接钱包
   */
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包');
      }

      // 请求连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 初始化服务
      await this.initialize();
      
      // 获取用户地址
      const address = await this.signer!.getAddress();
      console.log('钱包连接成功:', address);
      
      return address;
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前连接的地址
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
   * 检查代币余额
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider 未初始化');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('获取代币余额失败:', error);
      throw error;
    }
  }

  /**
   * 检查代币授权额度
   */
  async getTokenAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider 未初始化');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(allowance, decimals);
    } catch (error) {
      console.error('获取代币授权额度失败:', error);
      throw error;
    }
  }

  /**
   * 授权代币
   */
  async approveToken(tokenAddress: string, spenderAddress: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.signer) {
        throw new Error('Signer 未初始化');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.signer);
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`授权代币: ${amount} tokens 给 ${spenderAddress}`);
      const tx = await tokenContract.approve(spenderAddress, amountWei);
      
      console.log('授权交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('授权代币失败:', error);
      throw error;
    }
  }

  /**
   * 创建誓约
   */
  async createOath(oathData: {
    title: string;
    description: string;
    committers: string[];
    supervisors: string[];
    committerStakeAmount: string;
    supervisorStakeAmount: string;
    duration: number;
    penaltyRate: number;
  }, tokenAddress: string): Promise<{ tx: ethers.TransactionResponse, oathId: string }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      console.log('创建誓约:', oathData);
      
      // 调用合约的 createOath 函数
      const tx = await this.chainOathContract.createOath(oathData, tokenAddress);
      
      console.log('创建誓约交易已提交:', tx.hash);
      
      // 等待交易确认并获取事件
      const receipt = await tx.wait();
      
      // 解析 OathCreated 事件获取 oathId
      let oathId = '';
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.chainOathContract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (parsedLog && parsedLog.name === 'OathCreated') {
              oathId = parsedLog.args.oathId.toString();
              console.log('誓约创建成功，ID:', oathId);
              break;
            }
          } catch {
            // 忽略解析失败的日志
          }
        }
      }
      
      return { tx, oathId };
    } catch (error) {
      console.error('创建誓约失败:', error);
      throw error;
    }
  }

  /**
   * 守约人质押
   */
  async committerStake(oathId: string, tokenAddress: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 先获取代币精度
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider!);
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`守约人质押: 誓约ID ${oathId}, 金额 ${amount}`);
      
      const tx = await this.chainOathContract.committerStake(oathId, tokenAddress, amountWei);
      
      console.log('守约人质押交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('守约人质押失败:', error);
      throw error;
    }
  }

  /**
   * 监督者质押
   */
  async supervisorStake(oathId: string, tokenAddress: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 先获取代币精度
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider!);
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`监督者质押: 誓约ID ${oathId}, 金额 ${amount}`);
      
      const tx = await this.chainOathContract.supervisorStake(oathId, tokenAddress, amountWei);
      
      console.log('监督者质押交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('监督者质押失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约信息
   */
  async getOathInfo(oathId: string): Promise<{
    id: string;
    title: string;
    description: string;
    creator: string;
    committers: string[];
    supervisors: string[];
    committerStakeAmount: bigint;
    supervisorStakeAmount: bigint;
    duration: bigint;
    penaltyRate: bigint;
    status: number;
    createdAt: bigint;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oathInfo = await this.chainOathContract.oaths(oathId);
      console.log('誓约信息:', oathInfo);
      
      return oathInfo;
    } catch (error) {
      console.error('获取誓约信息失败:', error);
      throw error;
    }
  }

  /**
   * 监听合约事件
   */
  setupEventListeners(callbacks: {
    onOathCreated?: (oathId: string, creator: string, title: string) => void;
    onStakeDeposited?: (oathId: string, staker: string, amount: string, token: string) => void;
    onOathAccepted?: (oathId: string) => void;
  }): void {
    if (!this.chainOathContract) {
      console.warn('合约未初始化，无法设置事件监听');
      return;
    }

    // 监听 OathCreated 事件
    if (callbacks.onOathCreated) {
      this.chainOathContract.on('OathCreated', callbacks.onOathCreated);
    }

    // 监听 StakeDeposited 事件
    if (callbacks.onStakeDeposited) {
      this.chainOathContract.on('StakeDeposited', callbacks.onStakeDeposited);
    }

    // 监听 OathAccepted 事件
    if (callbacks.onOathAccepted) {
      this.chainOathContract.on('OathAccepted', callbacks.onOathAccepted);
    }

    console.log('合约事件监听已设置');
  }

  /**
   * 移除事件监听
   */
  removeEventListeners(): void {
    if (this.chainOathContract) {
      this.chainOathContract.removeAllListeners();
      console.log('合约事件监听已移除');
    }
  }
}

// 导出单例实例
export const contractService = new ContractService();
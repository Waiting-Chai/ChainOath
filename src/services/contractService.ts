import { ethers } from 'ethers';
import { ChainOathSecureABI, ERC20ABI, WETHABI } from '../contracts/ChainOathABI';
import { getCurrentNetworkConfig, getNetworkDisplayName, getCurrentTestTokens } from '../contracts/config';

/**
 * 誓约数据接口
 */
export interface OathData {
  id: string;
  title: string;
  description: string;
  creator: string;
  committers: string[];
  supervisors: string[];
  committerStakeAmount: string;
  supervisorStakeAmount: string;
  tokenAddress: string;
  status: number;
  startTime: number;
  endTime: number;
}

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

      // 验证网络
      await this.validateNetwork();

      // 获取网络配置
      const networkConfig = getCurrentNetworkConfig();
      
      // 验证合约地址
      if (networkConfig.chainOathAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`ChainOath 合约尚未在 ${getNetworkDisplayName()} 网络上部署`);
      }
      
      // 创建合约实例
      this.chainOathContract = new ethers.Contract(
        networkConfig.chainOathAddress,
        ChainOathSecureABI,
        this.signer
      );

      console.log(`合约服务初始化成功 - 网络: ${getNetworkDisplayName()}, 合约地址: ${networkConfig.chainOathAddress}`);
    } catch (error) {
      console.error('合约服务初始化失败:', error);
      throw error;
    }
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
      if (!this.signer) {
        throw new Error('Signer 未初始化');
      }

      console.log('创建誓约:', oathData);
      
      // 获取代币精度用于金额转换
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.signer);
      const decimals = await tokenContract.decimals();
      
      // 将用户输入的金额转换为wei单位
      const committerStakeWei = ethers.parseUnits(oathData.committerStakeAmount, decimals);
      const supervisorStakeWei = ethers.parseUnits(oathData.supervisorStakeAmount, decimals);
      const totalRewardWei = committerStakeWei + supervisorStakeWei; // 简化：总奖励 = 质押金额总和
      
      // 获取创建者地址（非空）
      const creator = await this.signer.getAddress();
      
      // 构造符合合约ABI的参数结构
      const contractOathData = {
        title: oathData.title,
        description: oathData.description,
        committer: oathData.committers[0], // 只支持单个守约人
        supervisors: oathData.supervisors,
        totalReward: totalRewardWei,
        committerStake: committerStakeWei,
        supervisorStake: supervisorStakeWei,
        supervisorRewardRatio: Math.floor(oathData.penaltyRate), // 直接使用百分比数值
        checkInterval: 86400, // 固定：1天检查间隔
        checkWindow: 3600,    // 固定：1小时检查窗口
        checkThresholdPercent: 50, // 固定：50%阈值
        maxSupervisorMisses: 3,     // 固定：最多错过3次
        maxCommitterFailures: 2,    // 固定：最多失败2次
        checkRoundsCount: oathData.duration, // 检查轮数等于天数
        startTime: Math.floor(Date.now() / 1000), // 当前时间
        endTime: Math.floor(Date.now() / 1000) + (oathData.duration * 86400), // 结束时间
        createTime: Math.floor(Date.now() / 1000), // 创建时间
        creator,
        token: tokenAddress,
        status: 0 // 初始状态
      };
      
      // 调用合约的 createOath 函数
      const tx = await this.chainOathContract.createOath(contractOathData, tokenAddress);
      
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
  async committerStake(oathId: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 获取誓约信息以确定代币类型
      const oathInfo = await this.chainOathContract.oaths(oathId);
      const tokenAddress = oathInfo.token;
      
      // 先获取代币精度
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider!);
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`守约人质押: 誓约ID ${oathId}, 金额 ${amount}`);
      
      const tx = await this.chainOathContract.committerStake(oathId, amountWei);
      
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
  async supervisorStake(oathId: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 获取誓约信息以确定代币类型
      const oathInfo = await this.chainOathContract.oaths(oathId);
      const tokenAddress = oathInfo.token;
      
      // 先获取代币精度
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider!);
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`监督者质押: 誓约ID ${oathId}, 金额 ${amount}`);
      
      const tx = await this.chainOathContract.supervisorStake(oathId, amountWei);
      
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
   * 获取誓约信息（别名方法）
   */
  async getOath(oathId: string): Promise<{
    id: string;
    title: string;
    description: string;
    committers: string[];
    supervisors: string[];
    committerStakeAmount: string;
    supervisorStakeAmount: string;
    tokenAddress: string;
    status: number;
    creator: string;
    startTime: number;
    endTime: number;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oathInfo = await this.chainOathContract.getOath(oathId);
      console.log('誓约信息:', oathInfo);
      
      return {
        id: oathId,
        title: oathInfo.title,
        description: oathInfo.description,
        committers: oathInfo.committers,
        supervisors: oathInfo.supervisors,
        committerStakeAmount: oathInfo.committerStakeAmount.toString(),
        supervisorStakeAmount: oathInfo.supervisorStakeAmount.toString(),
        tokenAddress: oathInfo.tokenAddress,
        status: oathInfo.status,
        creator: oathInfo.creator,
        startTime: Number(oathInfo.startTime),
        endTime: Number(oathInfo.endTime)
      };
    } catch (error) {
      console.error('获取誓约信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已质押
   */
  async hasStaked(oathId: string, userAddress: string): Promise<boolean> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const hasStaked = await this.chainOathContract.hasStaked(oathId, userAddress);
      console.log(`用户 ${userAddress} 在誓约 ${oathId} 中的质押状态:`, hasStaked);
      
      return hasStaked;
    } catch (error) {
      console.error('检查质押状态失败:', error);
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

  /**
   * 获取用户创建的誓约列表
   */
  async getUserCreatedOaths(userAddress: string): Promise<OathData[]> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oaths = await this.chainOathContract.getUserCreatedOaths(userAddress);
      console.log('用户创建的誓约:', oaths);
      
      return oaths;
    } catch (error) {
      console.error('获取用户创建的誓约失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户作为守约人的誓约列表
   */
  async getUserCommitterOaths(userAddress: string): Promise<OathData[]> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oaths = await this.chainOathContract.getUserCommitterOaths(userAddress);
      console.log('用户作为守约人的誓约:', oaths);
      
      return oaths;
    } catch (error) {
      console.error('获取用户守约人誓约失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户作为监督者的誓约列表
   */
  async getUserSupervisorOaths(userAddress: string): Promise<OathData[]> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oaths = await this.chainOathContract.getUserSupervisorOaths(userAddress);
      console.log('用户作为监督者的誓约:', oaths);
      
      return oaths;
    } catch (error) {
      console.error('获取用户监督者誓约失败:', error);
      throw error;
    }
  }

  /**
   * 监督者确认守约完成
   */
  async confirmOathCompletion(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      console.log(`监督者确认誓约完成: 誓约ID ${oathId}`);
      
      const tx = await this.chainOathContract.confirmOathCompletion(oathId);
      
      console.log('确认完成交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('确认誓约完成失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约的详细状态信息
   */
  async getOathStatus(oathId: string): Promise<{
    status: number;
    isActive: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    remainingTime: number;
    participantsStaked: boolean;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const statusInfo = await this.chainOathContract.getOathStatus(oathId);
      console.log('誓约状态信息:', statusInfo);
      
      return statusInfo;
    } catch (error) {
      console.error('获取誓约状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取代币的符号和小数位
   */
  async getTokenInfo(tokenAddress: string): Promise<{ symbol: string; decimals: number }> {
    try {
      if (!this.provider) {
        throw new Error('Provider 未初始化');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      const [symbol, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);
      
      return { symbol, decimals: Number(decimals) };
    } catch (error) {
      console.error('获取代币信息失败:', error);
      // 返回默认值
      return { symbol: 'Unknown', decimals: 18 };
    }
  }

  /**
   * 检查是否为WETH代币
   */
  isWETH(tokenAddress: string): boolean {
    const tokens = getCurrentTestTokens();
    return tokens.WETH?.toLowerCase() === tokenAddress.toLowerCase();
  }

  /**
   * 获取ETH余额
   */
  async getETHBalance(userAddress: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider 未初始化');
      }

      const balance = await this.provider.getBalance(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('获取ETH余额失败:', error);
      throw error;
    }
  }

  /**
   * 包装ETH为WETH
   */
  async wrapETH(amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.signer) {
        throw new Error('Signer 未初始化');
      }

      const tokens = getCurrentTestTokens();
      const wethAddress = tokens.WETH;
      
      if (!wethAddress || wethAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('WETH合约地址未配置');
      }

      const wethContract = new ethers.Contract(wethAddress, WETHABI, this.signer);
      const amountWei = ethers.parseEther(amount);
      
      console.log(`包装 ${amount} ETH 为 WETH`);
      const tx = await wethContract.deposit({ value: amountWei });
      
      console.log('包装交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('包装ETH失败:', error);
      throw error;
    }
  }

  /**
   * 解包WETH为ETH
   */
  async unwrapWETH(amount: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.signer) {
        throw new Error('Signer 未初始化');
      }

      const tokens = getCurrentTestTokens();
      const wethAddress = tokens.WETH;
      
      if (!wethAddress || wethAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('WETH合约地址未配置');
      }

      const wethContract = new ethers.Contract(wethAddress, WETHABI, this.signer);
      const amountWei = ethers.parseEther(amount);
      
      console.log(`解包 ${amount} WETH 为 ETH`);
      const tx = await wethContract.withdraw(amountWei);
      
      console.log('解包交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('解包WETH失败:', error);
      throw error;
    }
  }

  /**
   * 解包所有WETH为ETH
   */
  async unwrapAllWETH(): Promise<ethers.TransactionResponse> {
    try {
      if (!this.signer) {
        throw new Error('Signer 未初始化');
      }

      const tokens = getCurrentTestTokens();
      const wethAddress = tokens.WETH;
      
      if (!wethAddress || wethAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('WETH合约地址未配置');
      }

      const wethContract = new ethers.Contract(wethAddress, WETHABI, this.signer);
      
      console.log('解包所有WETH为ETH');
      const tx = await wethContract.withdrawAll();
      
      console.log('解包交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('解包所有WETH失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const contractService = new ContractService();
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
 * 评论数据接口
 */
export interface CommentData {
  author: string;
  content: string;
  timestamp: number;
}

/**
 * 检查点数据接口
 */
export interface CheckpointData {
  description: string;
  isCompleted: boolean;
  completedAt: number;
}

/**
 * 测试信息接口
 */
export interface TestInfo {
  [key: string]: unknown;
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
    totalReward: string;
    committerStakeAmount: string;
    supervisorStakeAmount: string;
    duration: number;
    penaltyRate: number;
    startTime: number;
    endTime: number;
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
      const totalRewardWei = ethers.parseUnits(oathData.totalReward, decimals); // 奖励池金额，由创建者支付
      
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
        startTime: oathData.startTime, // 使用前端传入的开始时间
        endTime: oathData.endTime, // 使用前端传入的结束时间
        createTime: Math.floor(Date.now() / 1000), // 创建时间
        creator,
        token: tokenAddress,
        status: 0 // 初始状态
      };
      
      // 详细的参数验证日志
      console.log('=== 创建誓约参数验证 ===');
      console.log('创建者地址:', creator);
      console.log('守约人地址:', contractOathData.committer);
      console.log('监督者地址:', contractOathData.supervisors);
      console.log('代币地址:', tokenAddress);
      console.log('总奖励金额 (wei):', contractOathData.totalReward.toString());
      console.log('守约人质押 (wei):', contractOathData.committerStake.toString());
      console.log('监督者质押 (wei):', contractOathData.supervisorStake.toString());
      console.log('开始时间:', contractOathData.startTime, '(当前时间:', Math.floor(Date.now() / 1000), ')');
      console.log('结束时间:', contractOathData.endTime);
      console.log('检查轮数:', contractOathData.checkRoundsCount);
      console.log('监督者奖励比例:', contractOathData.supervisorRewardRatio);
      console.log('检查阈值百分比:', contractOathData.checkThresholdPercent);
      console.log('检查间隔:', contractOathData.checkInterval);
      console.log('检查窗口:', contractOathData.checkWindow);
      
      // 检查角色重复
      console.log('=== 角色重复检查 ===');
      console.log('创建者 == 守约人?', creator === contractOathData.committer);
      console.log('创建者 == 监督者?', contractOathData.supervisors.includes(creator));
      console.log('守约人 == 监督者?', contractOathData.supervisors.includes(contractOathData.committer));
      
      // 检查代币余额和授权
      const balance = await tokenContract.balanceOf(creator);
      const allowance = await tokenContract.allowance(creator, this.chainOathContract.target);
      console.log('=== 代币检查 ===');
      console.log('创建者代币余额 (wei):', balance.toString());
      console.log('合约授权额度 (wei):', allowance.toString());
      console.log('需要的金额 (wei):', contractOathData.totalReward.toString());
      console.log('余额足够?', balance >= contractOathData.totalReward);
      console.log('授权足够?', allowance >= contractOathData.totalReward);
      console.log('========================');
      
      // 检查余额是否足够
      if (balance < contractOathData.totalReward) {
        throw new Error(`代币余额不足！需要 ${ethers.formatUnits(contractOathData.totalReward, decimals)} ${await tokenContract.symbol()}，当前余额 ${ethers.formatUnits(balance, decimals)} ${await tokenContract.symbol()}`);
      }
      
      if (allowance < contractOathData.totalReward) {
        throw new Error(`代币授权额度不足！需要 ${ethers.formatUnits(contractOathData.totalReward, decimals)} ${await tokenContract.symbol()}，当前授权 ${ethers.formatUnits(allowance, decimals)} ${await tokenContract.symbol()}`);
      }
      
      // 调用合约的 createOath 函数
      console.log('🚀 开始调用合约 createOath 函数...');
      const tx = await this.chainOathContract.createOath(contractOathData, tokenAddress);
      console.log('✅ createOath 交易已提交，交易哈希:', tx.hash);
      
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
      
      // 添加详细的状态检查
      console.log('=== 守约人质押前状态检查 ===');
      console.log('誓约状态:', oathInfo.status.toString());
      console.log('开始时间:', oathInfo.startTime.toString());
      console.log('当前区块时间戳:', Math.floor(Date.now() / 1000));
      console.log('时间差:', Math.floor(Date.now() / 1000) - Number(oathInfo.startTime), '秒');
      
      const userAddress = await this.getCurrentAddress();
      console.log('当前用户地址:', userAddress);
      console.log('守约人地址:', oathInfo.committer);
      console.log('地址匹配:', userAddress?.toLowerCase() === oathInfo.committer.toLowerCase());
      
      // 检查是否已经质押
      const hasStaked = await this.chainOathContract.committerStakes(oathId, userAddress);
      console.log('是否已质押:', hasStaked.hasStaked);
      
      // 检查代币余额和授权
      const balance = await tokenContract.balanceOf(userAddress);
      const allowance = await tokenContract.allowance(userAddress, await this.chainOathContract.getAddress());
      console.log('代币余额 (wei):', balance.toString());
      console.log('授权额度 (wei):', allowance.toString());
      console.log('需要金额 (wei):', amountWei.toString());
      console.log('余额足够:', balance >= amountWei);
      console.log('授权足够:', allowance >= amountWei);
      console.log('========================');
      
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

      // 使用合约的getOath方法获取完整信息
      const oathInfo = await this.chainOathContract.getOath(oathId);
      console.log('誓约完整信息:', oathInfo);
      
      // 构造完整的誓约数据
      return {
        id: oathId,
        title: oathInfo.title || '',
        description: oathInfo.description || '',
        committers: oathInfo.committer ? [oathInfo.committer] : [], // 合约中committer是单个地址，转换为数组
        supervisors: oathInfo.supervisors || [],
        committerStakeAmount: oathInfo.committerStake ? oathInfo.committerStake.toString() : '0',
        supervisorStakeAmount: oathInfo.supervisorStake ? oathInfo.supervisorStake.toString() : '0',
        tokenAddress: oathInfo.token || '',
        status: oathInfo.status || 0,
        creator: oathInfo.creator || '',
        startTime: oathInfo.startTime ? Number(oathInfo.startTime) : 0,
        endTime: oathInfo.endTime ? Number(oathInfo.endTime) : 0
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
   * 检查用户作为守约人是否已质押
   */
  async hasCommitterStaked(oathId: string, userAddress: string): Promise<boolean> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 获取誓约信息
      const oathInfo = await this.chainOathContract.getOath(oathId);
      
      // 检查用户是否是守约人
      if (oathInfo.committer.toLowerCase() !== userAddress.toLowerCase()) {
        return false;
      }

      // 检查守约人是否已质押
      const hasStaked = await this.chainOathContract.hasStaked(oathId, userAddress);
      console.log(`守约人 ${userAddress} 在誓约 ${oathId} 中的质押状态:`, hasStaked);
      
      return hasStaked;
    } catch (error) {
      console.error('检查守约人质押状态失败:', error);
      return false;
    }
  }

  /**
   * 检查用户作为监督者是否已质押
   */
  async hasSupervisorStaked(oathId: string, userAddress: string): Promise<boolean> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 获取誓约信息
      const oathInfo = await this.chainOathContract.getOath(oathId);
      
      // 检查用户是否是监督者
      const isSupervisor = oathInfo.supervisors.some(
        (supervisor: string) => supervisor.toLowerCase() === userAddress.toLowerCase()
      );
      
      if (!isSupervisor) {
        return false;
      }

      // 检查监督者是否已质押
      const hasStaked = await this.chainOathContract.hasStaked(oathId, userAddress);
      console.log(`监督者 ${userAddress} 在誓约 ${oathId} 中的质押状态:`, hasStaked);
      
      return hasStaked;
    } catch (error) {
      console.error('检查监督者质押状态失败:', error);
      return false;
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

      // 获取下一个誓约ID，用于确定遍历范围
      const nextOathId = await this.chainOathContract.nextOathId();
      const userOaths: OathData[] = [];
      
      console.log(`开始查找用户 ${userAddress} 创建的誓约，总誓约数: ${nextOathId}`);
      
      // 遍历所有誓约ID，查找用户创建的誓约
      for (let i = 0; i < nextOathId; i++) {
        try {
          const oathInfo = await this.getOath(i.toString());
          if (oathInfo.creator.toLowerCase() === userAddress.toLowerCase()) {
            userOaths.push(oathInfo);
            console.log(`找到用户创建的誓约 ID: ${i}`);
          }
        } catch (error) {
          console.warn(`获取誓约 ${i} 信息失败:`, error);
          // 继续遍历其他誓约
        }
      }
      
      console.log('用户创建的誓约:', userOaths);
      return userOaths;
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

      // 获取下一个誓约ID，用于确定遍历范围
      const nextOathId = await this.chainOathContract.nextOathId();
      const userOaths: OathData[] = [];
      
      console.log(`开始查找用户 ${userAddress} 作为守约人的誓约，总誓约数: ${nextOathId}`);
      
      // 遍历所有誓约ID，查找用户作为守约人的誓约
      for (let i = 0; i < nextOathId; i++) {
        try {
          const oathInfo = await this.getOath(i.toString());
          if (oathInfo.committers.includes(userAddress.toLowerCase())) {
            userOaths.push(oathInfo);
            console.log(`找到用户作为守约人的誓约 ID: ${i}`);
          }
        } catch (error) {
          console.warn(`获取誓约 ${i} 信息失败:`, error);
          // 继续遍历其他誓约
        }
      }
      
      console.log('用户作为守约人的誓约:', userOaths);
      return userOaths;
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

      // 获取下一个誓约ID，用于确定遍历范围
      const nextOathId = await this.chainOathContract.nextOathId();
      const userOaths: OathData[] = [];
      
      console.log(`开始查找用户 ${userAddress} 作为监督者的誓约，总誓约数: ${nextOathId}`);
      
      // 遍历所有誓约ID，查找用户作为监督者的誓约
      for (let i = 0; i < nextOathId; i ++) {
        try {
          const oathInfo = await this.getOath(i.toString());
          if (oathInfo.supervisors.some(supervisor => supervisor.toLowerCase() === userAddress.toLowerCase())) {
            userOaths.push(oathInfo);
            console.log(`找到用户作为监督者的誓约 ID: ${i}`);
          }
        } catch (error) {
          console.warn(`获取誓约 ${i} 信息失败:`, error);
          // 继续遍历其他誓约
        }
      }
      
      console.log('用户作为监督者的誓约:', userOaths);
      return userOaths;
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
    currentRound: number;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      // 通过getOath方法获取誓约信息
      const oathInfo = await this.chainOathContract.getOath(oathId);
      console.log('誓约状态信息:', oathInfo);
      
      // 计算剩余时间
      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = Number(oathInfo.endTime);
      const remainingTime = Math.max(0, endTime - currentTime);
      
      // 根据状态判断各种状态
      const status = Number(oathInfo.status);
      const isActive = status === 1; // 假设1为活跃状态
      const isCompleted = status === 2; // 假设2为完成状态
      const isFailed = status === 3; // 假设3为失败状态
      
      // 检查参与者是否已质押（简化实现，可以后续优化）
      const participantsStaked = true; // 暂时设为true，后续可以通过hasStaked方法检查
      
      return {
        status,
        isActive,
        isCompleted,
        isFailed,
        remainingTime,
        participantsStaked,
        currentRound: 0
      };
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

  /**
   * 获取监督者状态
   */
  async getSupervisorStatus(oathId: string, supervisorAddress: string): Promise<{
    missCount: number;
    successfulChecks: number;
    isDisqualified: boolean;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const status = await this.chainOathContract.getSupervisorStatus(oathId, supervisorAddress);
      console.log(`监督者 ${supervisorAddress} 在誓约 ${oathId} 中的状态:`, status);
      
      return {
        missCount: Number(status.missCount),
        successfulChecks: Number(status.successfulChecks),
        isDisqualified: status.isDisqualified
      };
    } catch (error) {
      console.error('获取监督者状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前检查轮次
   */
  async getCurrentCheckRound(oathId: string): Promise<number> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oathInfo = await this.chainOathContract.getOath(oathId);
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(oathInfo.startTime);
      const checkInterval = Number(oathInfo.checkInterval);
      
      if (currentTime < startTime) {
        return 0; // 还未开始
      }
      
      const elapsedTime = currentTime - startTime;
      const currentRound = Math.floor(elapsedTime / checkInterval);
      
      return Math.max(0, currentRound);
    } catch (error) {
      console.error('获取当前检查轮次失败:', error);
      throw error;
    }
  }

  /**
   * 获取下次检查时间和剩余时间
   */
  async getNextCheckTime(oathId: string): Promise<{
    nextCheckTime: number;
    timeUntilNextCheck: number;
    timeUntilCheckWindowEnd: number;
    isInCheckWindow: boolean;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oathInfo = await this.chainOathContract.getOath(oathId);
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(oathInfo.startTime);
      const checkInterval = Number(oathInfo.checkInterval);
      const checkWindow = Number(oathInfo.checkWindow);
      
      if (currentTime < startTime) {
        return {
          nextCheckTime: startTime,
          timeUntilNextCheck: startTime - currentTime,
          timeUntilCheckWindowEnd: 0,
          isInCheckWindow: false
        };
      }
      
      const elapsedTime = currentTime - startTime;
      const currentRound = Math.floor(elapsedTime / checkInterval);
      const nextCheckTime = startTime + (currentRound + 1) * checkInterval;
      const checkWindowEndTime = nextCheckTime + checkWindow;
      
      const isInCheckWindow = currentTime >= nextCheckTime && currentTime <= checkWindowEndTime;
      
      return {
        nextCheckTime,
        timeUntilNextCheck: Math.max(0, nextCheckTime - currentTime),
        timeUntilCheckWindowEnd: Math.max(0, checkWindowEndTime - currentTime),
        isInCheckWindow
      };
    } catch (error) {
      console.error('获取下次检查时间失败:', error);
      throw error;
    }
  }

  /**
   * 计算监督者预期收益
   */
  async calculateSupervisorReward(oathId: string): Promise<string> {
    try {
      if (!this.chainOathContract) {
        throw new Error('ChainOath 合约未初始化');
      }

      const oathInfo = await this.chainOathContract.getOath(oathId);
      const totalReward = oathInfo.totalReward;
      const supervisorRewardRatio = Number(oathInfo.supervisorRewardRatio);
      const supervisorsCount = oathInfo.supervisors.length;
      
      if (supervisorsCount === 0) {
        return '0';
      }
      
      // 监督者总奖励 = 总奖励 * 监督者奖励比例 / 100
      const supervisorTotalReward = totalReward * BigInt(supervisorRewardRatio) / BigInt(100);
      // 单个监督者奖励 = 监督者总奖励 / 监督者数量
      const singleSupervisorReward = supervisorTotalReward / BigInt(supervisorsCount);
      
      return singleSupervisorReward.toString();
    } catch (error) {
      console.error('计算监督者收益失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台统计数据
   */
  async getPlatformStats(): Promise<{
    totalOaths: number;
    activeOaths: number;
    completedOaths: number;
    successRate: string;
    totalUsers: number;
  }> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      // 获取总誓约数
      const nextOathId = await this.chainOathContract.nextOathId();
      const totalOaths = Number(nextOathId);
      
      let activeOaths = 0;
      let completedOaths = 0;
      const uniqueUsers = new Set<string>();
      
      // 遍历所有誓约获取统计信息
      for (let i = 0; i < totalOaths; i++) {
        try {
          const oathInfo = await this.getOath(i.toString());
          
          // 统计用户
          uniqueUsers.add(oathInfo.creator.toLowerCase());
          oathInfo.committers.forEach(addr => uniqueUsers.add(addr.toLowerCase()));
          oathInfo.supervisors.forEach(addr => uniqueUsers.add(addr.toLowerCase()));
          
          // 统计誓约状态
          const status = oathInfo.status;
          if (status === 1) { // 活跃状态
            activeOaths++;
          } else if (status === 2) { // 完成状态
            completedOaths++;
          }
        } catch {
           // 跳过无效的誓约
           continue;
         }
      }
      
      // 计算成功率
      const totalFinishedOaths = completedOaths + (totalOaths - activeOaths - completedOaths);
      const successRate = totalFinishedOaths > 0 
        ? ((completedOaths / totalFinishedOaths) * 100).toFixed(1)
        : '0.0';
      
      return {
        totalOaths,
        activeOaths,
        completedOaths,
        successRate,
        totalUsers: uniqueUsers.size
      };
    } catch (error) {
      console.error('获取平台统计数据失败:', error);
      // 返回默认值
      return {
        totalOaths: 0,
        activeOaths: 0,
        completedOaths: 0,
        successRate: '0.0',
        totalUsers: 0
      };
    }
  }

  /**
   * 检查代币是否在白名单中
   */
  async isTokenWhitelisted(tokenAddress: string): Promise<boolean> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log('🔍 检查代币白名单状态:');
      console.log('- 合约地址:', this.chainOathContract.target);
      console.log('- 代币地址:', tokenAddress);
      
      // 尝试多种方式获取白名单状态
      try {
        // 方式1: 直接调用合约方法
        const result1 = await this.chainOathContract.tokenWhitelist(tokenAddress);
        console.log('- 方式1结果:', result1);
        
        // 方式2: 使用staticCall
        const result2 = await this.chainOathContract.tokenWhitelist.staticCall(tokenAddress);
        console.log('- 方式2结果:', result2);
        
        // 方式3: 重新创建合约实例
         const freshContract = new ethers.Contract(
           this.chainOathContract.target as string,
           ChainOathSecureABI,
           this.provider!
         );
        const result3 = await freshContract.tokenWhitelist(tokenAddress);
        console.log('- 方式3结果:', result3);
        
        // 方式4: 使用自定义RPC端点
        try {
          const customProvider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
          const customContract = new ethers.Contract(
            this.chainOathContract.target as string,
            ChainOathSecureABI,
            customProvider
          );
          const result4 = await customContract.tokenWhitelist(tokenAddress);
          console.log('- 方式4结果(自定义RPC):', result4);
          
          // 如果自定义RPC返回true，说明链上数据是正确的，问题在于MetaMask的RPC
          if (result4 && !result1) {
            console.warn('⚠️ MetaMask RPC数据可能未同步，建议切换RPC端点或等待同步');
            return result4; // 使用自定义RPC的结果
          }
        } catch (rpcError) {
          console.warn('自定义RPC检查失败:', rpcError);
        }
        
        return result3;
      } catch (callError) {
        console.error('合约调用失败:', callError);
        return false;
      }
    } catch (error) {
      console.error('检查代币白名单状态失败:', error);
      throw error;
    }
  }

  /**
   * 更新代币白名单（仅合约所有者可调用）
   */
  async updateTokenWhitelist(tokenAddress: string, isWhitelisted: boolean): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`更新代币白名单: ${tokenAddress} -> ${isWhitelisted}`);
      const tx = await this.chainOathContract.updateTokenWhitelist(tokenAddress, isWhitelisted);
      
      console.log('白名单更新交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('更新代币白名单失败:', error);
      throw error;
    }
  }

  /**
   * 申请退款（仅在誓约被废止时）
   */
  async refundStake(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      // 获取当前用户地址
      const currentAddress = await this.getCurrentAddress();
      if (!currentAddress) {
        throw new Error('请先连接钱包');
      }

      // 检查是否可以退款
      const canRefund = await this.canRefund(oathId, currentAddress);
      if (!canRefund) {
        throw new Error('当前状态不允许退款');
      }

      // 检查用户是否有质押
      const hasStaked = await this.hasStaked(oathId, currentAddress);
      if (!hasStaked) {
        throw new Error('您没有在此誓约中质押');
      }

      console.log(`申请退款: 誓约ID ${oathId}, 用户地址 ${currentAddress}`);
      const tx = await this.chainOathContract.refundStake(oathId);
      
      console.log('退款交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('申请退款失败:', error);
      throw error;
    }
  }

  /**
   * 领取奖励
   */
  async claimReward(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`领取奖励: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract.claimReward(oathId);
      
      console.log('领取奖励交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('领取奖励失败:', error);
      throw error;
    }
  }

  /**
   * 撤回合约（仅创建者在特定条件下可用）
   */
  async withdrawOath(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      // 获取当前用户地址
      const currentAddress = await this.getCurrentAddress();
      if (!currentAddress) {
        throw new Error('请先连接钱包');
      }

      // 检查誓约信息
      const oathInfo = await this.getOath(oathId);
      
      // 验证是否为创建者
      if (oathInfo.creator.toLowerCase() !== currentAddress.toLowerCase()) {
        throw new Error('只有创建者可以撤回誓约');
      }

      // 检查誓约状态，只有在Pending状态下才能撤回
      if (oathInfo.status !== 0) { // 0 = Pending
        throw new Error('只有在待接受状态下才能撤回誓约');
      }

      console.log(`撤回誓约: 誓约ID ${oathId}`);
      // 调用合约的撤回方法（如果合约有专门的撤回方法）
      // 这里假设合约有withdrawOath方法，如果没有则使用checkOathStatus
      const tx = await this.chainOathContract.withdrawOath ? 
        await this.chainOathContract.withdrawOath(oathId) :
        await this.chainOathContract.checkOathStatus(oathId);
      
      console.log('撤回誓约交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('撤回誓约失败:', error);
      throw error;
    }
  }

  /**
   * 更新进度（守约人）
   */
  async updateProgress(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`更新进度: 誓约ID ${oathId}`);
      // 这里可以扩展为实际的进度更新逻辑
      // 目前先返回一个占位符交易
      throw new Error('进度更新功能待实现');
    } catch (error) {
      console.error('更新进度失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否可以申请退款
   */
  async canRefund(oathId: string, userAddress: string): Promise<boolean> {
    try {
      const oathInfo = await this.getOath(oathId);
      
      // 只有在誓约被废止(Aborted)状态下才能退款
      if (oathInfo.status !== 3) { // 3 = Aborted
        return false;
      }

      // 检查用户是否有质押
      const hasStaked = await this.hasStaked(oathId, userAddress);
      return hasStaked;
    } catch (error) {
      console.error('检查退款权限失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否可以领取奖励
   */
  async canClaimReward(oathId: string, userAddress: string): Promise<boolean> {
    try {
      const oathInfo = await this.getOath(oathId);
      
      // 只有在誓约完成(Fulfilled)或失败(Broken)状态下才能领取奖励
      if (oathInfo.status !== 2 && oathInfo.status !== 4) { // 2 = Fulfilled, 4 = Broken
        return false;
      }

      // 检查用户是否有质押或是创建者
      const hasStaked = await this.hasStaked(oathId, userAddress);
      const isCreator = oathInfo.creator.toLowerCase() === userAddress.toLowerCase();
      
      return hasStaked || isCreator;
    } catch (error) {
      console.error('检查奖励领取权限失败:', error);
      return false;
    }
  }

  /**
   * 点赞誓约
   */
  async likeOath(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`点赞誓约: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract.likeOath(oathId);
      
      console.log('点赞交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('点赞誓约失败:', error);
      throw error;
    }
  }

  /**
   * 取消点赞誓约
   */
  async unlikeOath(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`取消点赞誓约: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract.unlikeOath(oathId);
      
      console.log('取消点赞交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('取消点赞誓约失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约点赞数
   */
  async getOathLikes(oathId: string): Promise<number> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const likesCount = await this.chainOathContract.getOathLikes(oathId);
      console.log(`誓约 ${oathId} 的点赞数:`, likesCount.toString());
      
      return Number(likesCount);
    } catch (error) {
      console.error('获取誓约点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已点赞誓约
   */
  async hasUserLiked(oathId: string, userAddress: string): Promise<boolean> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const hasLiked = await this.chainOathContract.hasLiked(oathId, userAddress);
      console.log(`用户 ${userAddress} 是否已点赞誓约 ${oathId}:`, hasLiked);
      
      return hasLiked;
    } catch (error) {
      console.error('检查用户点赞状态失败:', error);
      throw error;
    }
  }

  /**
   * 添加评论
   */
  async addComment(oathId: string, content: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`添加评论: 誓约ID ${oathId}, 内容: ${content}`);
      const tx = await this.chainOathContract.addComment(oathId, content);
      
      console.log('添加评论交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约评论
   */
  async getOathComments(oathId: string): Promise<Array<{
    author: string;
    content: string;
    timestamp: number;
  }>> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const comments = await this.chainOathContract.getOathComments(oathId);
      console.log(`誓约 ${oathId} 的评论:`, comments);
      
      return comments.map((comment: CommentData) => ({
        author: comment.author,
        content: comment.content,
        timestamp: Number(comment.timestamp)
      }));
    } catch (error) {
      console.error('获取誓约评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约评论数量
   */
  async getOathCommentsCount(oathId: string): Promise<number> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const count = await this.chainOathContract.getOathCommentsCount(oathId);
      console.log(`誓约 ${oathId} 的评论数量:`, count.toString());
      
      return Number(count);
    } catch (error) {
      console.error('获取誓约评论数量失败:', error);
      throw error;
    }
  }

  /**
   * 完成检查点
   */
  async completeCheckpoint(oathId: string, checkpointIndex: number): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`完成检查点: 誓约ID ${oathId}, 检查点索引 ${checkpointIndex}`);
      const tx = await this.chainOathContract.completeCheckpoint(oathId, checkpointIndex);
      
      console.log('完成检查点交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('完成检查点失败:', error);
      throw error;
    }
  }

  /**
   * 获取誓约检查点
   */
  async getOathCheckpoints(oathId: string): Promise<Array<{
    description: string;
    isCompleted: boolean;
    completedAt: number;
  }>> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const checkpoints = await this.chainOathContract.getOathCheckpoints(oathId);
      console.log(`誓约 ${oathId} 的检查点:`, checkpoints);
      
      return checkpoints.map((checkpoint: CheckpointData) => ({
        description: checkpoint.description,
        isCompleted: checkpoint.isCompleted,
        completedAt: Number(checkpoint.completedAt)
      }));
    } catch (error) {
      console.error('获取誓约检查点失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前检查点索引
   */
  async getCurrentCheckpointIndex(oathId: string): Promise<number> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const index = await this.chainOathContract.getCurrentCheckpointIndex(oathId);
      console.log(`誓约 ${oathId} 的当前检查点索引:`, index.toString());
      
      return Number(index);
    } catch (error) {
      console.error('获取当前检查点索引失败:', error);
      throw error;
    }
  }

  // ========== 管理员测试功能 (仅限合约所有者) ==========
  
  /**
   * 管理员强制完成检查点
   */
  async adminForceCompleteCheckpoint(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 强制完成检查点: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract._adminForceCompleteCheckpoint(oathId);
      
      console.log('管理员强制完成检查点交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员强制完成检查点失败:', error);
      throw error;
    }
  }

  /**
   * 管理员设置誓约状态
   */
  async adminSetOathStatus(oathId: string, status: number): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 设置誓约状态: 誓约ID ${oathId}, 状态 ${status}`);
      const tx = await this.chainOathContract._adminSetOathStatus(oathId, status);
      
      console.log('管理员设置誓约状态交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员设置誓约状态失败:', error);
      throw error;
    }
  }

  /**
   * 管理员跳过到下一阶段
   */
  async adminSkipToNextPhase(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 跳过到下一阶段: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract._adminSkipToNextPhase(oathId);
      
      console.log('管理员跳过到下一阶段交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员跳过到下一阶段失败:', error);
      throw error;
    }
  }

  /**
   * 管理员重置誓约
   */
  async adminResetOath(oathId: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 重置誓约: 誓约ID ${oathId}`);
      const tx = await this.chainOathContract._adminResetOath(oathId);
      
      console.log('管理员重置誓约交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员重置誓约失败:', error);
      throw error;
    }
  }

  /**
   * 管理员设置检查点索引
   */
  async adminSetCheckpointIndex(oathId: string, index: number): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 设置检查点索引: 誓约ID ${oathId}, 索引 ${index}`);
      const tx = await this.chainOathContract._adminSetCheckpointIndex(oathId, index);
      
      console.log('管理员设置检查点索引交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员设置检查点索引失败:', error);
      throw error;
    }
  }

  /**
   * 管理员添加监督者
   */
  async adminAddSupervisor(oathId: string, supervisor: string): Promise<ethers.TransactionResponse> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      console.log(`[管理员] 添加监督者: 誓约ID ${oathId}, 监督者 ${supervisor}`);
      const tx = await this.chainOathContract._adminAddSupervisor(oathId, supervisor);
      
      console.log('管理员添加监督者交易已提交:', tx.hash);
      return tx;
    } catch (error) {
      console.error('管理员添加监督者失败:', error);
      throw error;
    }
  }

  /**
   * 管理员获取测试信息
   */
  async adminGetTestInfo(oathId: string): Promise<TestInfo> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const testInfo = await this.chainOathContract._adminGetTestInfo(oathId);
      console.log(`[管理员] 誓约 ${oathId} 的测试信息:`, testInfo);
      
      return testInfo;
    } catch (error) {
      console.error('管理员获取测试信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取合约所有者地址
   */
  async getContractOwner(): Promise<string> {
    try {
      if (!this.chainOathContract) {
        throw new Error('合约未初始化');
      }

      const owner = await this.chainOathContract.owner();
      console.log('合约所有者地址:', owner);
      return owner;
    } catch (error) {
      console.error('获取合约所有者失败:', error);
      throw error;
    }
  }

  /**
   * 检查当前用户是否为合约所有者
   */
  async isContractOwner(userAddress?: string): Promise<boolean> {
    try {
      const currentAddress = userAddress || await this.getCurrentAddress();
      if (!currentAddress) {
        return false;
      }

      const owner = await this.getContractOwner();
      const isOwner = currentAddress.toLowerCase() === owner.toLowerCase();
      console.log(`用户 ${currentAddress} 是否为合约所有者:`, isOwner);
      return isOwner;
    } catch (error) {
      console.error('检查合约所有者权限失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const contractService = new ContractService();
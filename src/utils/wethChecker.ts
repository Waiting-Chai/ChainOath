import { ethers } from 'ethers';
import { WETHABI } from '../contracts/ChainOathABI';
import { TOKEN_OPTIONS } from '../contracts/config';

/**
 * WETH代币检查工具
 * 帮助用户验证WETH代币余额和交易记录
 */
export class WETHChecker {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * 检查用户WETH余额
   */
  async checkWETHBalance(userAddress: string): Promise<{
    balance: string;
    balanceFormatted: string;
    wethAddress: string;
  }> {
    const wethToken = TOKEN_OPTIONS.find(token => token.symbol === 'WETH');
    if (!wethToken) {
      throw new Error('WETH代币配置未找到');
    }

    const wethContract = new ethers.Contract(wethToken.address, WETHABI, this.provider);
    const balance = await wethContract.balanceOf(userAddress);
    const balanceFormatted = ethers.formatEther(balance);

    return {
      balance: balance.toString(),
      balanceFormatted,
      wethAddress: wethToken.address
    };
  }

  /**
   * 检查特定交易的WETH转移事件
   */
  async checkTransferEvents(txHash: string): Promise<{
    found: boolean;
    transfers: Array<{
      from: string;
      to: string;
      amount: string;
      amountFormatted: string;
    }>;
  }> {
    const wethToken = TOKEN_OPTIONS.find(token => token.symbol === 'WETH');
    if (!wethToken) {
      throw new Error('WETH代币配置未找到');
    }

    try {
      const receipt = await this.provider!.getTransactionReceipt(txHash);
      if (!receipt) {
        return { found: false, transfers: [] };
      }

      const wethContract = new ethers.Contract(wethToken.address, WETHABI, this.provider);
      const transferEvents = receipt.logs
        .filter(log => log.address.toLowerCase() === wethToken.address.toLowerCase())
        .map(log => {
          try {
            const parsed = wethContract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            if (parsed && parsed.name === 'Transfer') {
              return {
                from: parsed.args.from,
                to: parsed.args.to,
                amount: parsed.args.value.toString(),
                amountFormatted: ethers.formatEther(parsed.args.value)
              };
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter(event => event !== null);

      return {
        found: transferEvents.length > 0,
        transfers: transferEvents
      };
    } catch (error) {
      console.error('检查转移事件失败:', error);
      return { found: false, transfers: [] };
    }
  }

  /**
   * 获取用户最近的WETH交易记录
   */
  async getRecentWETHTransactions(userAddress: string, blockRange: number = 1000): Promise<Array<{
    txHash: string;
    blockNumber: number;
    from: string;
    to: string;
    amount: string;
    amountFormatted: string;
    timestamp: number;
  }>> {
    const wethToken = TOKEN_OPTIONS.find(token => token.symbol === 'WETH');
    if (!wethToken) {
      throw new Error('WETH代币配置未找到');
    }

    try {
      const currentBlock = await this.provider!.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blockRange);

      const wethContract = new ethers.Contract(wethToken.address, WETHABI, this.provider);
      
      // 查询Transfer事件
      const filter = wethContract.filters.Transfer(null, userAddress);
      const events = await wethContract.queryFilter(filter, fromBlock, currentBlock);

      const transactions = [];
      for (const event of events) {
        // 类型守卫：确保是EventLog类型
        if ('args' in event && event.args) {
          const block = await this.provider!.getBlock(event.blockNumber);
          transactions.push({
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            from: event.args.from,
            to: event.args.to,
            amount: event.args.value.toString(),
            amountFormatted: ethers.formatEther(event.args.value),
            timestamp: block!.timestamp
          });
        }
      }

      return transactions.sort((a, b) => b.blockNumber - a.blockNumber);
    } catch (error) {
      console.error('获取WETH交易记录失败:', error);
      return [];
    }
  }

  /**
   * 生成MetaMask添加WETH代币的参数
   */
  getAddTokenParams(): {
    type: string;
    options: {
      address: string;
      symbol: string;
      decimals: number;
      image?: string;
    };
  } {
    const wethToken = TOKEN_OPTIONS.find(token => token.symbol === 'WETH');
    if (!wethToken) {
      throw new Error('WETH代币配置未找到');
    }

    return {
      type: 'ERC20',
      options: {
        address: wethToken.address,
        symbol: 'WETH',
        decimals: 18,
        image: 'https://assets.coingecko.com/coins/images/2518/small/weth.png'
      }
    };
  }

  /**
   * 检查用户是否已在MetaMask中添加WETH代币
   */
  async checkTokenInWallet(): Promise<boolean> {
    try {
      const wethToken = TOKEN_OPTIONS.find(token => token.symbol === 'WETH');
      if (!wethToken) return false;

      // 尝试获取代币余额，如果成功说明代币已添加
      const userAddress = await this.signer!.getAddress();
      await this.checkWETHBalance(userAddress);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 自动添加WETH代币到MetaMask
   */
  async addTokenToWallet(): Promise<boolean> {
    try {
      const params = this.getAddTokenParams();
      
      // 请求MetaMask添加代币
      const wasAdded = await (window as any).ethereum.request({
        method: 'wallet_watchAsset',
        params
      });

      return wasAdded;
    } catch (error) {
      console.error('添加WETH代币到钱包失败:', error);
      return false;
    }
  }
}

/**
 * 创建WETH检查器实例
 */
export function createWETHChecker(provider: ethers.BrowserProvider, signer: ethers.Signer): WETHChecker {
  return new WETHChecker(provider, signer);
}
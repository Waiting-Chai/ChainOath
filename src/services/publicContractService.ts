import { ethers } from 'ethers';
import { ChainOathSecureABI } from '../contracts/ChainOathABI';
import { getCurrentNetworkConfig } from '../contracts/config';

// 公共合约服务类
class PublicContractService {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  public getContractAddress(): string | null {
    return this.contractAddress;
  }

  // 重置服务状态，强制重新初始化
  public reset(): void {
    this.provider = null;
    this.contract = null;
    this.contractAddress = null;
  }

  private rpcMap: Record<string, string> = {
    sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
    mainnet: 'https://ethereum-rpc.publicnode.com',
  };

  // 当前网络
  private currentNetwork: string = import.meta.env.VITE_NETWORK || 'sepolia';

  public async initialize(contractAddress?: string): Promise<void> {
    try {
      const networkConfig = getCurrentNetworkConfig();
      this.contractAddress = contractAddress || networkConfig.chainOathAddress;
      
      if (!this.contractAddress) {
        throw new Error('合约地址未配置');
      }

      const rpcUrl = this.rpcMap[this.currentNetwork];
      if (!rpcUrl) {
        throw new Error(`不支持的网络: ${this.currentNetwork}`);
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = new ethers.Contract(
        this.contractAddress,
        ChainOathSecureABI,
        this.provider
      );

      if (!this.contract) {
        throw new Error('合约初始化失败');
      }
    } catch (error) {
      console.error('初始化公共合约服务失败:', error);
      throw error;
    }
  }

  // 转换为数字
  private toNumber(v: unknown): number {
    if (typeof v === 'bigint') {
      return Number(v);
    }
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseInt(v, 10) || 0;
    return 0;
  }

  private toString(v: unknown): string {
    if (typeof v === 'string') return v;
    return String(v || '');
  }

  // 获取所有誓约
  public async getAllOaths(limit: number = 10): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      creator: string;
      status: number;
      startTime: number;
      endTime: number;
      committerStakeAmount: string;
      supervisorStakeAmount: string;
    }>
  > {
    if (!this.provider) {
      await this.initialize();
    }
    if (!this.contract) {
      return [];
    }

    try {
      // 获取总誓约数
      interface ChainOathRead {
        nextOathId: () => Promise<unknown>;
        getOath: (id: string) => Promise<unknown>;
      }
      const ro = this.contract as unknown as ChainOathRead;
      const nextOathIdRes = await ro.nextOathId();
      const totalOaths = this.toNumber(nextOathIdRes);
      
      const allOaths: Array<{
        id: string;
        title: string;
        description: string;
        creator: string;
        status: number;
        startTime: number;
        endTime: number;
        committerStakeAmount: string;
        supervisorStakeAmount: string;
      }> = [];

      // 遍历所有誓约，获取最近的一些
      const startIndex = Math.max(0, totalOaths - limit);
      for (let i = startIndex; i < totalOaths; i++) {
        try {
          const oathRes = await ro.getOath(i.toString());
          if (!oathRes) continue;
          
          const isObj = typeof oathRes === 'object' && oathRes !== null && !Array.isArray(oathRes);
          const obj = isObj ? (oathRes as Record<string, unknown>) : null;
          const arr = Array.isArray(oathRes) ? (oathRes as unknown[]) : null;
          
          // 添加调试信息
          console.log(`誓约 ${i} 原始数据:`, oathRes);
          console.log(`是否为对象:`, isObj, `是否为数组:`, Array.isArray(oathRes));
          
          // 根据实际数据结构修正字段映射
          // 从日志看：arr[0]=title, arr[1]=description, arr[2]=creator, arr[14]=startTime, arr[15]=endTime
          allOaths.push({
            id: i.toString(),
            title: this.toString(obj?.title ?? (arr ? arr[0] : '')), // 修正：title是第0个字段
            description: this.toString(obj?.description ?? (arr ? arr[1] : '')), // 修正：description是第1个字段
            creator: this.toString(obj?.creator ?? (arr ? arr[2] : '')), // 修正：creator是第2个字段
            status: this.toNumber(obj?.status ?? (arr ? arr[19] : 0)), // 修正：status可能是第19个字段
            startTime: this.toNumber(obj?.startTime ?? (arr ? arr[14] : 0)), // 修正：startTime是第14个字段
            endTime: this.toNumber(obj?.endTime ?? (arr ? arr[15] : 0)), // 修正：endTime是第15个字段
            committerStakeAmount: this.toString(obj?.committerStakeAmount ?? obj?.committerStake ?? (arr ? arr[4] : '0')), // 可能是第4个字段
            supervisorStakeAmount: this.toString(obj?.supervisorStakeAmount ?? obj?.supervisorStake ?? (arr ? arr[5] : '0')), // 可能是第5个字段
          });
        } catch (err) {
          console.warn(`获取誓约 ${i} 失败:`, err);
          continue;
        }
      }
      
      // 按ID倒序返回（最新的在前面）
      return allOaths.reverse();
    } catch (err) {
      console.error('获取所有誓约失败:', err);
      return [];
    }
  }

  // 获取最近的誓约
  public async getRecentOaths(limit: number = 10): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      creator: string;
      status: number;
      startTime: number;
      endTime: number;
      committerStakeAmount: string;
      supervisorStakeAmount: string;
    }>
  > {
    if (!this.provider) {
      await this.initialize();
    }
    if (!this.contract) {
      return [];
    }

    try {
      // 尝试使用 getLatestOaths 方法
      interface ChainOathReadLatest {
        getLatestOaths?: (limit: number) => Promise<unknown>;
      }
      const ro = this.contract as unknown as ChainOathReadLatest;
      
      if (ro.getLatestOaths) {
        const resUnknown = await ro.getLatestOaths(limit);
        const list = Array.isArray(resUnknown) ? (resUnknown as unknown[]) : [];
        const mapped = list.map((o: unknown, index: number) => {
          const isObj = typeof o === 'object' && o !== null && !Array.isArray(o);
          const obj = isObj ? (o as Record<string, unknown>) : null;
          const arr = Array.isArray(o) ? (o as unknown[]) : null;
          
          console.log(`getLatestOaths 誓约 ${index} 原始数据:`, o);
          
          return {
            id: this.toString(obj?.id ?? (arr ? index.toString() : '')), // 使用索引作为ID
            title: this.toString(obj?.title ?? (arr ? arr[0] : '')), // 修正：title是第0个字段
            description: this.toString(obj?.description ?? (arr ? arr[1] : '')), // 修正：description是第1个字段
            creator: this.toString(obj?.creator ?? (arr ? arr[2] : '')), // 修正：creator是第2个字段
            status: this.toNumber(obj?.status ?? (arr ? arr[19] : 0)), // 修正：status是第19个字段
            startTime: this.toNumber(obj?.startTime ?? (arr ? arr[14] : 0)), // 修正：startTime是第14个字段
            endTime: this.toNumber(obj?.endTime ?? (arr ? arr[15] : 0)), // 修正：endTime是第15个字段
            committerStakeAmount: this.toString(obj?.committerStakeAmount ?? (arr ? arr[4] : '0')), // 修正：第4个字段
            supervisorStakeAmount: this.toString(obj?.supervisorStakeAmount ?? (arr ? arr[5] : '0')), // 修正：第5个字段
          };
        });
        return mapped;
      } else {
        // 如果没有 getLatestOaths 方法，回退到 getAllOaths
        return await this.getAllOaths(limit);
      }
    } catch (err) {
      console.error('获取最近誓约失败:', err);
      // 回退到 getAllOaths
      return await this.getAllOaths(limit);
    }
  }

  // 获取平台统计信息
  public async getPlatformStats(): Promise<{ active: number; failed: number; notStarted: number; completed: number } | null> {
    if (!this.provider) {
      await this.initialize();
    }
    if (!this.contract) return null;

    try {
      // 获取所有誓约数据来计算统计信息
      const allOaths = await this.getAllOaths(1000); // 获取足够多的数据
      
      let active = 0;      // 正在进行中的数目 (status = 1)
      let failed = 0;      // 失败数目 (status = 3)
      let notStarted = 0;  // 未开始数目 (status = 0)
      let completed = 0;   // 完成数目 (status = 2)
      
      for (const oath of allOaths) {
        switch (oath.status) {
          case 0:
            notStarted++;
            break;
          case 1:
            active++;
            break;
          case 2:
            completed++;
            break;
          case 3:
            failed++;
            break;
        }
      }
      
      return {
        active,
        failed,
        notStarted,
        completed
      };
    } catch (err) {
      console.error('获取平台统计失败:', err);
      return { active: 0, failed: 0, notStarted: 0, completed: 0 };
    }
  }

  // 获取誓约详情
  public async getOathDetail(id: string): Promise<{
    id: string;
    title: string;
    description: string;
    creator: string;
    status: number;
    startTime: number;
    endTime: number;
    committerStakeAmount: string;
    supervisorStakeAmount: string;
  } | null> {
    if (!this.provider) {
      await this.initialize();
    }
    if (!this.contract) return null;

    try {
      interface ChainOathReadDetail {
        getOath?: (id: string) => Promise<Record<string, unknown> | unknown[] | null>;
      }
      const ro = this.contract as unknown as ChainOathReadDetail;
      const o = await ro.getOath?.(id);
      if (!o) return null;
      const obj = (o && typeof o === 'object' && !Array.isArray(o)) ? (o as Record<string, unknown>) : null;
      const arr = Array.isArray(o) ? (o as unknown[]) : null;
      
      console.log(`getOathDetail 誓约 ${id} 原始数据:`, o);
      
      return {
        id: this.toString(obj?.id ?? (arr ? id : id)), // 使用传入的ID
        title: this.toString(obj?.title ?? (arr ? arr[0] : '')), // 修正：title是第0个字段
        description: this.toString(obj?.description ?? (arr ? arr[1] : '')), // 修正：description是第1个字段
        creator: this.toString(obj?.creator ?? (arr ? arr[2] : '')), // 修正：creator是第2个字段
        status: this.toNumber(obj?.status ?? (arr ? arr[19] : 0)), // 修正：status是第19个字段
        startTime: this.toNumber(obj?.startTime ?? (arr ? arr[14] : 0)), // 修正：startTime是第14个字段
        endTime: this.toNumber(obj?.endTime ?? (arr ? arr[15] : 0)), // 修正：endTime是第15个字段
        committerStakeAmount: this.toString(obj?.committerStakeAmount ?? (arr ? arr[4] : '0')), // 修正：第4个字段
        supervisorStakeAmount: this.toString(obj?.supervisorStakeAmount ?? (arr ? arr[5] : '0')), // 修正：第5个字段
      };
    } catch (err) {
      console.error('获取誓约详情失败:', err);
      return null;
    }
  }

  // 获取点赞排行榜
  public async getLikeRanking(limit: number = 10): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      creator: string;
      status: number;
      startTime: number;
      endTime: number;
      committerStakeAmount: string;
      supervisorStakeAmount: string;
      likesCount: number;
    }>
  > {
    if (!this.provider) {
      await this.initialize();
    }
    if (!this.contract) {
      return [];
    }

    try {
      // 获取所有誓约
      const allOaths = await this.getAllOaths(100); // 获取更多誓约用于排序
      
      // 为每个誓约获取点赞数
      const oathsWithLikes = await Promise.all(
        allOaths.map(async (oath) => {
          try {
            interface ChainOathReadLikes {
              getOathLikes?: (id: string) => Promise<unknown>;
            }
            const ro = this.contract as unknown as ChainOathReadLikes;
            const likesRes = await ro.getOathLikes?.(oath.id);
            const likesCount = this.toNumber(likesRes);
            
            return {
              ...oath,
              likesCount
            };
          } catch (error) {
            console.warn(`获取誓约 ${oath.id} 点赞数失败:`, error);
            return {
              ...oath,
              likesCount: 0
            };
          }
        })
      );
      
      // 按点赞数排序并返回前N个
      return oathsWithLikes
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, limit);
    } catch (err) {
      console.error('获取点赞排行榜失败:', err);
      return [];
    }
  }
}

export const publicContractService = new PublicContractService();
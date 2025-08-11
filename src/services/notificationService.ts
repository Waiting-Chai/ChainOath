import { Client } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';

/**
 * XMTP消息通知服务
 * 使用XMTP协议进行去中心化消息传递
 */
export class NotificationService {
  private xmtpClient: Client | null = null;
  private isInitialized: boolean = false;
  private signer: ethers.Signer | null = null;

  constructor() {
    // XMTP客户端将在需要时初始化
  }

  /**
   * 初始化XMTP客户端
   */
  async initializeXMTP(signer?: ethers.Signer): Promise<boolean> {
    try {
      if (!signer) {
        // 尝试从window.ethereum获取signer
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await provider.getSigner();
        } else {
          console.error('未找到以太坊钱包');
          return false;
        }
      } else {
        this.signer = signer;
      }

      // 创建XMTP客户端
      this.xmtpClient = await Client.create(this.signer, {
        env: 'production' // 可以改为 'dev' 用于测试
      });
      
      this.isInitialized = true;
      console.log('XMTP客户端初始化成功');
      return true;
    } catch (error) {
      console.error('XMTP客户端初始化失败:', error);
      return false;
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
  private async sendXMTPMessage(recipientAddress: string, message: string): Promise<boolean> {
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
  private async sendBatchXMTPMessages(recipients: string[], message: string): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    for (const recipient of recipients) {
      const success = await this.sendXMTPMessage(recipient, message);
      if (success) {
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
  async sendOathCreatedNotification(oathId: string, title: string, recipients: string[]): Promise<void> {
    console.log(`发送誓约创建通知: ${title} (ID: ${oathId}) 给 ${recipients.length} 个接收者`);
    
    if (!this.isInitialized) {
      console.warn('XMTP客户端未初始化，尝试初始化...');
      const initialized = await this.initializeXMTP();
      if (!initialized) {
        console.error('无法初始化XMTP客户端，跳过消息发送');
        return;
      }
    }

    const message = `🔗 ChainOath 通知\n\n新誓约已创建！\n\n📋 誓约标题: ${title}\n🆔 誓约ID: ${oathId}\n\n请及时访问 ChainOath 应用进行质押确认。\n\n⏰ 时间: ${new Date().toLocaleString()}`;

    // 使用XMTP发送消息给所有接收者
    const results = await this.sendBatchXMTPMessages(recipients, message);
    
    console.log(`誓约创建通知发送完成: 成功 ${results.success.length} 个，失败 ${results.failed.length} 个`);
    if (results.failed.length > 0) {
      console.warn('发送失败的地址:', results.failed);
    }

    // 存储通知记录
    this.saveNotificationRecord({
      type: 'oath_created',
      oathId,
      title,
      recipients,
      successCount: results.success.length,
      failedCount: results.failed.length,
      timestamp: Date.now()
    });
  }

  /**
   * 发送质押提醒通知
   */
  async sendStakeReminderNotification(oathId: string, title: string, recipients: string[], stakeType: 'committer' | 'supervisor'): Promise<void> {
    const roleText = stakeType === 'committer' ? '守约者' : '监督者';
    console.log(`发送${roleText}质押提醒: ${title} (ID: ${oathId}) 给 ${recipients.length} 个接收者`);
    
    if (!this.isInitialized) {
      console.warn('XMTP客户端未初始化，尝试初始化...');
      const initialized = await this.initializeXMTP();
      if (!initialized) {
        console.error('无法初始化XMTP客户端，跳过消息发送');
        return;
      }
    }

    const message = `💰 ChainOath 质押提醒\n\n您需要进行质押！\n\n📋 誓约标题: ${title}\n🆔 誓约ID: ${oathId}\n👤 您的角色: ${roleText}\n\n请及时访问 ChainOath 应用完成质押操作。\n\n⏰ 时间: ${new Date().toLocaleString()}`;

    // 使用XMTP发送消息
    const results = await this.sendBatchXMTPMessages(recipients, message);
    
    console.log(`${roleText}质押提醒发送完成: 成功 ${results.success.length} 个，失败 ${results.failed.length} 个`);
    if (results.failed.length > 0) {
      console.warn('发送失败的地址:', results.failed);
    }

    // 存储通知记录
    this.saveNotificationRecord({
      type: 'stake_reminder',
      oathId,
      title,
      recipients,
      stakeType,
      successCount: results.success.length,
      failedCount: results.failed.length,
      timestamp: Date.now()
    });
  }

  /**
   * 发送誓约激活通知
   */
  async sendOathActivatedNotification(oathId: string, title: string, recipients: string[]): Promise<void> {
    console.log(`发送誓约激活通知: ${title} (ID: ${oathId}) 给 ${recipients.length} 个接收者`);
    
    if (!this.isInitialized) {
      console.warn('XMTP客户端未初始化，尝试初始化...');
      const initialized = await this.initializeXMTP();
      if (!initialized) {
        console.error('无法初始化XMTP客户端，跳过消息发送');
        return;
      }
    }

    const message = `✅ ChainOath 誓约激活\n\n誓约已成功激活！\n\n📋 誓约标题: ${title}\n🆔 誓约ID: ${oathId}\n\n誓约现在正式生效，请按照约定履行承诺。\n\n⏰ 激活时间: ${new Date().toLocaleString()}`;

    // 使用XMTP发送消息
    const results = await this.sendBatchXMTPMessages(recipients, message);
    
    console.log(`誓约激活通知发送完成: 成功 ${results.success.length} 个，失败 ${results.failed.length} 个`);
    if (results.failed.length > 0) {
      console.warn('发送失败的地址:', results.failed);
    }

    // 存储通知记录
    this.saveNotificationRecord({
      type: 'oath_activated',
      oathId,
      title,
      recipients,
      successCount: results.success.length,
      failedCount: results.failed.length,
      timestamp: Date.now()
    });
  }

  /**
   * 发送质押成功通知
   */
  async sendStakeSuccessNotification(oathId: string, title: string, recipients: string[], stakeType: 'committer' | 'supervisor'): Promise<void> {
    const roleText = stakeType === 'committer' ? '守约者' : '监督者';
    console.log(`发送${roleText}质押成功通知: ${title} (ID: ${oathId}) 给 ${recipients.length} 个接收者`);
    
    if (!this.isInitialized) {
      console.warn('XMTP客户端未初始化，尝试初始化...');
      const initialized = await this.initializeXMTP();
      if (!initialized) {
        console.error('无法初始化XMTP客户端，跳过消息发送');
        return;
      }
    }

    const message = `🎉 ChainOath 质押成功\n\n恭喜！您已成功完成质押！\n\n📋 誓约标题: ${title}\n🆔 誓约ID: ${oathId}\n👤 您的角色: ${roleText}\n\n质押已确认，誓约即将生效。\n\n⏰ 质押时间: ${new Date().toLocaleString()}`;

    // 使用XMTP发送消息
    const results = await this.sendBatchXMTPMessages(recipients, message);
    
    console.log(`${roleText}质押成功通知发送完成: 成功 ${results.success.length} 个，失败 ${results.failed.length} 个`);
    if (results.failed.length > 0) {
      console.warn('发送失败的地址:', results.failed);
    }

    // 存储通知记录
    this.saveNotificationRecord({
      type: 'stake_success',
      oathId,
      title,
      recipients,
      stakeType,
      successCount: results.success.length,
      failedCount: results.failed.length,
      timestamp: Date.now()
    });
  }

  /**
   * 获取XMTP客户端状态
   */
  getClientStatus(): { isInitialized: boolean; address: string | null } {
    return {
      isInitialized: this.isInitialized,
      address: this.signer ? 'connected' : null
    };
  }

  /**
   * 保存通知记录到本地存储
   */
  private saveNotificationRecord(record: {
    type: string;
    oathId: string;
    title: string;
    recipients: string[];
    stakeType?: string;
    successCount?: number;
    failedCount?: number;
    timestamp: number;
  }): void {
    try {
      const key = 'chainoath_notifications';
      const existingRecords = JSON.parse(localStorage.getItem(key) || '[]');
      existingRecords.push(record);
      
      // 只保留最近100条记录
      if (existingRecords.length > 100) {
        existingRecords.splice(0, existingRecords.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existingRecords));
    } catch (error) {
      console.error('保存通知记录失败:', error);
    }
  }

  /**
   * 获取通知记录
   */
  getNotificationRecords(): Array<{
    type: string;
    oathId: string;
    title: string;
    recipients: string[];
    stakeType?: string;
    successCount?: number;
    failedCount?: number;
    timestamp: number;
  }> {
    try {
      const key = 'chainoath_notifications';
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('获取通知记录失败:', error);
      return [];
    }
  }

  /**
   * 清除通知记录
   */
  clearNotificationRecords(): void {
    try {
      localStorage.removeItem('chainoath_notifications');
      console.log('通知记录已清除');
    } catch (error) {
      console.error('清除通知记录失败:', error);
    }
  }

  /**
   * 发送带链接的质押提醒通知
   */
  async sendStakeReminderWithLink(
    oathId: string,
    oathTitle: string,
    recipientAddresses: string[],
    role: 'committer' | 'supervisor'
  ): Promise<void> {
    try {
      const roleText = role === 'committer' ? '守约者' : '监督者';
      const stakeUrl = `${window.location.origin}/stake/${oathId}`;
      const message = `📋 誓约质押提醒\n\n您被邀请作为${roleText}参与誓约：${oathTitle}\n誓约ID：${oathId}\n\n请点击以下链接进行质押：\n${stakeUrl}\n\n请及时完成质押以激活誓约。`;
      
      const results = await this.sendBatchXMTPMessages(recipientAddresses, message);
      
      console.log(`${roleText}质押提醒发送完成: 成功 ${results.success.length} 个，失败 ${results.failed.length} 个`);
      if (results.failed.length > 0) {
        console.warn('发送失败的地址:', results.failed);
      }
      
      // 保存通知记录
      this.saveNotificationRecord({
        type: 'stake_reminder_with_link',
        oathId,
        title: oathTitle,
        recipients: recipientAddresses,
        stakeType: role,
        successCount: results.success.length,
        failedCount: results.failed.length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('发送质押提醒通知失败:', error);
    }
  }
}

// 导出单例实例
export const notificationService = new NotificationService();
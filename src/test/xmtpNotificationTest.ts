import { notificationService } from '../services/notificationService';

/**
 * XMTP 通知测试函数
 * 用于向指定钱包地址发送测试通知，验证被通知者的接收效果
 */
export class XMTPNotificationTest {
  
  /**
   * 向指定地址发送测试通知
   * @param recipientAddress 接收者钱包地址
   * @param testType 测试类型：'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success'
   */
  static async sendTestNotification(
    recipientAddress: string,
    testType: 'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success' = 'oath_created'
  ) {
    console.log(`🧪 开始向 ${recipientAddress} 发送 ${testType} 类型的测试通知...`);
    
    try {
      // 1. 初始化 XMTP 客户端
      console.log('📡 初始化 XMTP 客户端...');
      const initialized = await notificationService.initializeXMTP();
      
      if (!initialized) {
        console.error('❌ XMTP 客户端初始化失败');
        return false;
      }
      
      console.log('✅ XMTP 客户端初始化成功');
      
      // 2. 检查目标地址是否可以接收消息
      console.log(`🔍 检查地址 ${recipientAddress} 是否可以接收 XMTP 消息...`);
      const canMessage = await notificationService.canMessage(recipientAddress);
      
      if (!canMessage) {
        console.warn(`⚠️ 地址 ${recipientAddress} 无法接收 XMTP 消息`);
        console.log('💡 提示：目标地址需要先在支持 XMTP 的应用中激活消息功能');
        return false;
      }
      
      console.log('✅ 目标地址可以接收 XMTP 消息');
      
      // 3. 根据测试类型发送相应的通知
      const testOathId = `test-oath-${Date.now()}`;
      const testTitle = `测试誓约 - ${new Date().toLocaleString()}`;
      
      switch (testType) {
        case 'oath_created':
          await notificationService.sendOathCreatedNotification(
            testOathId,
            testTitle,
            [recipientAddress]
          );
          break;
          
        case 'stake_reminder':
          await notificationService.sendStakeReminderNotification(
            testOathId,
            testTitle,
            [recipientAddress],
            'committer'
          );
          break;
          
        case 'oath_activated':
          await notificationService.sendOathActivatedNotification(
            testOathId,
            testTitle,
            [recipientAddress]
          );
          break;
          
        case 'stake_success':
          await notificationService.sendStakeSuccessNotification(
            testOathId,
            testTitle,
            [recipientAddress],
            'committer'
          );
          break;
      }
      
      console.log(`🎉 ${testType} 类型的测试通知发送成功！`);
      console.log('📱 请在支持 XMTP 的应用中查看接收到的消息');
      console.log('💡 推荐使用以下应用查看 XMTP 消息：');
      console.log('   - Converse (https://getconverse.app/)');
      console.log('   - Coinbase Wallet');
      console.log('   - Lens Protocol 应用');
      
      return true;
      
    } catch (error) {
      console.error('❌ 发送测试通知失败:', error);
      return false;
    }
  }
  
  /**
   * 批量测试所有通知类型
   * @param recipientAddress 接收者钱包地址
   */
  static async testAllNotificationTypes(recipientAddress: string) {
    console.log(`🚀 开始向 ${recipientAddress} 发送所有类型的测试通知...`);
    
    const testTypes: Array<'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success'> = [
      'oath_created',
      'stake_reminder', 
      'oath_activated',
      'stake_success'
    ];
    
    for (const testType of testTypes) {
      console.log(`\n--- 测试 ${testType} ---`);
      await this.sendTestNotification(recipientAddress, testType);
      
      // 每个通知之间间隔 2 秒，避免发送过快
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎊 所有测试通知发送完成！');
  }
  
  /**
   * 获取当前连接的钱包地址
   */
  static async getCurrentWalletAddress(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        return accounts[0] || null;
      }
      return null;
    } catch (error) {
      console.error('获取钱包地址失败:', error);
      return null;
    }
  }
  
  /**
   * 向当前连接的钱包发送测试通知
   */
  static async sendTestToCurrentWallet(
    testType: 'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success' = 'oath_created'
  ) {
    const currentAddress = await this.getCurrentWalletAddress();
    
    if (!currentAddress) {
      console.error('❌ 未检测到连接的钱包地址');
      console.log('💡 请先连接 MetaMask 或其他以太坊钱包');
      return false;
    }
    
    console.log(`📍 检测到当前钱包地址: ${currentAddress}`);
    return await this.sendTestNotification(currentAddress, testType);
  }
}

// 在浏览器控制台中注册测试函数
if (typeof window !== 'undefined') {
  (window as typeof window & {
    XMTPTest: typeof XMTPNotificationTest;
    testXMTPNotification: (address: string, type?: string) => Promise<boolean>;
    testXMTPToMyWallet: (type?: string) => Promise<boolean>;
    testAllXMTPTypes: (address: string) => Promise<void>;
  }).XMTPTest = XMTPNotificationTest;
  
  // 便捷函数
  (window as typeof window & {
    testXMTPNotification: (address: string, type?: string) => Promise<boolean>;
  }).testXMTPNotification = (address: string, type?: string) => {
    return XMTPNotificationTest.sendTestNotification(address, type as 'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success');
  };
  
  (window as typeof window & {
    testXMTPToMyWallet: (type?: string) => Promise<boolean>;
  }).testXMTPToMyWallet = (type?: string) => {
    return XMTPNotificationTest.sendTestToCurrentWallet(type as 'oath_created' | 'stake_reminder' | 'oath_activated' | 'stake_success');
  };
  
  (window as typeof window & {
     testAllXMTPTypes: (address: string) => Promise<void>;
   }).testAllXMTPTypes = (address: string) => {
     return XMTPNotificationTest.testAllNotificationTypes(address);
   };
  
  console.log('🔧 XMTP 通知测试工具已加载！');
  console.log('📖 使用方法：');
  console.log('   testXMTPToMyWallet() - 向当前钱包发送测试通知');
  console.log('   testXMTPNotification("0x...") - 向指定地址发送测试通知');
  console.log('   testAllXMTPTypes("0x...") - 发送所有类型的测试通知');
  console.log('   XMTPTest.sendTestNotification(address, type) - 完整 API');
}
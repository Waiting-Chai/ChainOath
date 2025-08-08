import { notificationService } from '../services/notificationService';

/**
 * XMTP服务测试函数
 * 用于验证XMTP集成是否正常工作
 */
export async function testXMTPService() {
  console.log('开始测试XMTP服务...');
  
  try {
    // 1. 检查客户端状态
    const status = notificationService.getClientStatus();
    console.log('XMTP客户端状态:', status);
    
    // 2. 尝试初始化XMTP客户端
    console.log('尝试初始化XMTP客户端...');
    const initialized = await notificationService.initializeXMTP();
    
    if (initialized) {
      console.log('✅ XMTP客户端初始化成功');
      
      // 3. 测试地址检查功能
      const testAddress = '0x1234567890123456789012345678901234567890';
      console.log(`检查地址 ${testAddress} 是否可以接收消息...`);
      const canMessage = await notificationService.canMessage(testAddress);
      console.log(`地址 ${testAddress} 可以接收消息:`, canMessage);
      
      // 4. 测试发送通知（模拟）
      console.log('测试发送誓约创建通知...');
      await notificationService.sendOathCreatedNotification(
        'test-oath-001',
        '测试誓约',
        [testAddress]
      );
      
      console.log('✅ XMTP服务测试完成');
    } else {
      console.log('❌ XMTP客户端初始化失败');
    }
    
  } catch (error) {
    console.error('❌ XMTP服务测试失败:', error);
  }
}

/**
 * 在浏览器控制台中运行测试
 * 使用方法：在浏览器控制台中输入 window.testXMTP()
 */
if (typeof window !== 'undefined') {
  (window as typeof window & { testXMTP: typeof testXMTPService }).testXMTP = testXMTPService;
  console.log('XMTP测试函数已注册到 window.testXMTP，可在控制台中调用');
}
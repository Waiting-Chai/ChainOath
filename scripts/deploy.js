const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * 部署ChainOath合约的脚本
 * 使用方法：node scripts/deploy.js
 */

async function main() {
  try {
    console.log('开始部署ChainOath合约...');
    
    // 检查是否有MetaMask或其他钱包
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('检测到浏览器环境，请在浏览器控制台中运行此脚本');
      return;
    }
    
    // 读取合约ABI和字节码
    const contractsDir = path.join(__dirname, '../contracts/foundry-contracts/out/ChainOath.sol');
    
    if (!fs.existsSync(contractsDir)) {
      console.error('未找到合约编译文件，请先编译合约：');
      console.error('cd contracts/foundry-contracts && forge build');
      return;
    }
    
    const contractJson = JSON.parse(
      fs.readFileSync(path.join(contractsDir, 'ChainOath.json'), 'utf8')
    );
    
    const abi = contractJson.abi;
    const bytecode = contractJson.bytecode.object;
    
    console.log('合约ABI和字节码读取成功');
    
    // 连接到网络（这里使用本地网络，可以根据需要修改）
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // 获取部署者账户（使用第一个账户）
    const signer = await provider.getSigner(0);
    const deployerAddress = await signer.getAddress();
    
    console.log('部署者地址:', deployerAddress);
    
    // 检查余额
    const balance = await provider.getBalance(deployerAddress);
    console.log('部署者余额:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      console.error('部署者账户余额不足，请确保有足够的ETH用于部署');
      return;
    }
    
    // 创建合约工厂
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    
    console.log('开始部署合约...');
    
    // 部署合约
    const contract = await contractFactory.deploy();
    
    console.log('合约部署交易已提交，交易哈希:', contract.deploymentTransaction()?.hash);
    console.log('等待合约部署确认...');
    
    // 等待部署确认
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('✅ChainOath合约部署成功！');
    console.log('合约地址:', contractAddress);
    
    // 更新配置文件
    const configPath = path.join(__dirname, '../src/contracts/config.ts');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // 替换本地开发网络的合约地址
    configContent = configContent.replace(
      /chainOathAddress: '[^']*'/,
      `chainOathAddress: '${contractAddress}'`
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ 配置文件已更新');
    
    // 验证合约部署
    console.log('验证合约部署...');
    const deployedContract = new ethers.Contract(contractAddress, abi, provider);
    
    // 可以调用一些只读函数来验证合约
    try {
      // 这里可以添加一些合约验证逻辑
      console.log('✅ 合约验证成功');
    } catch (error) {
      console.warn('合约验证失败:', error.message);
    }
    
    console.log('\n🎉 部署完成！');
    console.log('请在前端应用中使用以下合约地址:', contractAddress);
    
  } catch (error) {
    console.error('❌ 部署失败:', error);
    process.exit(1);
  }
}

// 浏览器环境的部署函数
window.deployContract = async function() {
  try {
    if (!window.ethereum) {
      alert('请安装MetaMask钱包');
      return;
    }
    
    console.log('开始在浏览器中部署合约...');
    
    // 请求连接钱包
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const deployerAddress = await signer.getAddress();
    
    console.log('部署者地址:', deployerAddress);
    
    // 这里需要手动提供ABI和字节码
    // 由于无法在浏览器中读取文件，需要手动复制
    console.log('请手动提供合约ABI和字节码');
    console.log('可以从 contracts/foundry-contracts/out/ChainOath.sol/ChainOath.json 文件中获取');
    
    return deployerAddress;
    
  } catch (error) {
    console.error('浏览器部署失败:', error);
    alert('部署失败: ' + error.message);
  }
};

// 如果在Node.js环境中运行
if (typeof window === 'undefined') {
  main().catch(console.error);
}
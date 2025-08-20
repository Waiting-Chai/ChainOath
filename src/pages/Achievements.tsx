import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { ethers } from 'ethers';
import AchievementGallery from '../components/AchievementGallery';
import type { Achievement } from '../types/achievement';
import { contractService } from '../services/contractService';
import { getCurrentNetworkConfig } from '../contracts/config';

// ChainOathNFT合约ABI（简化版）
const CHAIN_OATH_NFT_ABI = [
  {
    name: 'mintAchievement',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'achievementType', type: 'uint8' },
      { name: 'oathId', type: 'uint256' },
      { name: 'tokenURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'checkAchievementEligibility',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'achievementType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const AchievementsPage: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // 检查钱包连接状态
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();
            setAddress(userAddress);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('检查钱包连接失败:', error);
      }
    };

    checkWalletConnection();

    // 监听账户变化
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // 处理铸造成就NFT
  const handleMintAchievement = async (achievement: Achievement) => {
    if (!isConnected || !address) {
      setNotification({
        open: true,
        message: '请先连接钱包',
        severity: 'warning',
      });
      return;
    }

    if (achievement.isObtained) {
      setNotification({
        open: true,
        message: '您已经拥有此成就NFT',
        severity: 'info',
      });
      return;
    }

    try {
      setLoading(true);
      
      // 初始化合约服务
      await contractService.initialize();
      
      // 获取网络配置
      const networkConfig = getCurrentNetworkConfig();
      
      // 创建NFT合约实例（假设NFT合约地址与主合约相同或有单独配置）
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(
        networkConfig.chainOathNFTAddress, // 使用专门的NFT合约地址
        CHAIN_OATH_NFT_ABI,
        signer
      );

      // 检查用户是否有资格获得此成就
      try {
        const isEligible = await nftContract.checkAchievementEligibility(address, achievement.achievementType);
        if (!isEligible) {
          setNotification({
            open: true,
            message: '您暂时不符合此成就的获得条件',
            severity: 'warning',
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn('无法检查成就资格，继续铸造流程:', error);
      }

      // 生成成就NFT的元数据URI
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify({
        name: achievement.name,
        description: achievement.description,
        image: '', // 成就图标暂时为空
        attributes: [
          {
            trait_type: 'Achievement Type',
            value: achievement.achievementType.toString()
          },
          {
            trait_type: 'Earned Date',
            value: new Date().toISOString()
          }
        ]
      }))}`;

      setNotification({
        open: true,
        message: '正在铸造成就NFT，请等待交易确认...',
        severity: 'info',
      });

      // 调用合约铸造NFT
      const tx = await nftContract.mintAchievement(
        address,
        achievement.achievementType,
        1, // oathId，这里使用默认值1
        tokenURI
      );

      console.log('铸造交易已提交:', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('铸造交易已确认:', receipt.hash);

      setNotification({
        open: true,
        message: '成就NFT铸造成功！',
        severity: 'success',
      });
      
    } catch (error) {
      console.error('铸造失败:', error);
      let errorMessage = '铸造失败，请重试';
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = '用户取消了交易';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = '余额不足，无法支付交易费用';
        }
      }
      
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 加载遮罩 */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} />
          <Box sx={{ mt: 2, fontSize: '1.1rem' }}>
            正在铸造NFT...
          </Box>
        </Box>
      </Backdrop>

      {/* 主要内容 */}
      <AchievementGallery
        userAddress={address || undefined}
        onMintAchievement={handleMintAchievement}
        loading={loading}
      />

      {/* 通知消息 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* 未连接钱包提示 */}
      {!isConnected && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
        >
          <Alert severity="info" sx={{ minWidth: 300 }}>
            请连接钱包以查看和铸造您的成就NFT
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default AchievementsPage;
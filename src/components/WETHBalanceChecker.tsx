import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { contractService } from '../services/contractService';
import { createWETHChecker, WETHChecker } from '../utils/wethChecker';

interface WETHBalanceCheckerProps {
  open: boolean;
  onClose: () => void;
  userAddress?: string;
  oathId?: number;
}

interface WETHBalance {
  balance: string;
  balanceFormatted: string;
  wethAddress: string;
}

interface TransactionInfo {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  amount: string;
  amountFormatted: string;
  timestamp: number;
}

export const WETHBalanceChecker: React.FC<WETHBalanceCheckerProps> = ({
  open,
  onClose,
  userAddress,
  oathId: _oathId // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [loading, setLoading] = useState(false);
  const [wethBalance, setWethBalance] = useState<WETHBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionInfo[]>([]);
  const [tokenInWallet, setTokenInWallet] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checker, setChecker] = useState<WETHChecker | null>(null);

  useEffect(() => {
    if (open && userAddress) {
      initializeChecker();
    }
  }, [open, userAddress]);

  const initializeChecker = async () => {
    try {
      await contractService.initialize();
      const provider = (contractService as any).provider;
      const signer = (contractService as any).signer;
      
      if (provider && signer) {
        const wethChecker = createWETHChecker(provider, signer);
        setChecker(wethChecker);
        await checkAllInfo(wethChecker);
      }
    } catch (error) {
      console.error('初始化WETH检查器失败:', error);
      setError('初始化失败，请确保已连接钱包');
    }
  };

  const checkAllInfo = async (wethChecker: WETHChecker) => {
    if (!userAddress) return;
    
    setLoading(true);
    setError(null);

    try {
      // 检查WETH余额
      const balance = await wethChecker.checkWETHBalance(userAddress);
      setWethBalance(balance);

      // 检查最近的WETH交易
      const transactions = await wethChecker.getRecentWETHTransactions(userAddress, 2000);
      setRecentTransactions(transactions);

      // 检查代币是否在钱包中
      const inWallet = await wethChecker.checkTokenInWallet();
      setTokenInWallet(inWallet);

    } catch (error) {
      console.error('检查WETH信息失败:', error);
      setError('检查失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (checker) {
      checkAllInfo(checker);
    }
  };

  const handleAddTokenToWallet = async () => {
    if (!checker) return;

    try {
      const success = await checker.addTokenToWallet();
      if (success) {
        setTokenInWallet(true);
        alert('WETH代币已成功添加到MetaMask！');
      } else {
        alert('添加代币被取消或失败');
      }
    } catch (error) {
      console.error('添加代币失败:', error);
      alert('添加代币失败: ' + (error as Error).message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WalletIcon />
          WETH余额检查器
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box>
            {/* WETH余额信息 */}
            {wethBalance && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  WETH余额
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body1">
                    <strong>{wethBalance.balanceFormatted} WETH</strong>
                  </Typography>
                  {parseFloat(wethBalance.balanceFormatted) > 0 ? (
                    <CheckIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="textSecondary">
                    合约地址: {formatAddress(wethBalance.wethAddress)}
                  </Typography>
                  <Tooltip title="复制地址">
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(wethBalance.wethAddress)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* MetaMask代币状态 */}
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                MetaMask代币状态
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                {tokenInWallet === true ? (
                  <Chip 
                    icon={<CheckIcon />} 
                    label="WETH已添加到钱包" 
                    color="success" 
                  />
                ) : tokenInWallet === false ? (
                  <>
                    <Chip 
                      icon={<ErrorIcon />} 
                      label="WETH未添加到钱包" 
                      color="error" 
                    />
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleAddTokenToWallet}
                    >
                      添加到MetaMask
                    </Button>
                  </>
                ) : (
                  <Chip label="检查中..." />
                )}
              </Box>
              
              {tokenInWallet === false && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    如果您没有在MetaMask中看到WETH代币，可能是因为：
                  </Typography>
                  <ul>
                    <li>WETH代币未添加到您的钱包中</li>
                    <li>您需要手动添加WETH代币才能看到余额</li>
                    <li>点击上方"添加到MetaMask"按钮自动添加</li>
                  </ul>
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 最近交易记录 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                最近的WETH接收记录 (最近2000个区块)
              </Typography>
              
              {recentTransactions.length > 0 ? (
                <List>
                  {recentTransactions.slice(0, 5).map((tx, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              +{tx.amountFormatted} WETH
                            </Typography>
                            <Chip size="small" label={`区块 ${tx.blockNumber}`} />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              从: {formatAddress(tx.from)}
                            </Typography>
                            <Typography variant="caption" display="block">
                              时间: {formatTimestamp(tx.timestamp)}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="caption">
                                交易: {formatAddress(tx.txHash)}
                              </Typography>
                              <Tooltip title="复制交易哈希">
                                <IconButton 
                                  size="small" 
                                  onClick={() => copyToClipboard(tx.txHash)}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="warning">
                  未找到最近的WETH接收记录。这可能意味着：
                  <ul>
                    <li>誓约评估可能尚未完成</li>
                    <li>资金可能被退还给创建者（任务失败）</li>
                    <li>交易可能在更早的区块中</li>
                  </ul>
                </Alert>
              )}
            </Box>

            {/* 诊断建议 */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                诊断建议
              </Typography>
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  <strong>如果您没有收到应得的WETH，请检查：</strong>
                </Typography>
                <ol>
                  <li>确认誓约已被创建者评估为"完成"</li>
                  <li>检查WETH代币是否已添加到MetaMask</li>
                  <li>确认您使用的是正确的钱包地址</li>
                  <li>查看上方的交易记录确认是否有WETH转入</li>
                  <li>如果问题持续，请联系誓约创建者确认评估状态</li>
                </ol>
              </Alert>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WETHBalanceChecker;
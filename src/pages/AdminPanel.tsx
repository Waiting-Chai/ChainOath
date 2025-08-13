import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import { ContractService } from '../services/contractService';
import { getCurrentTestTokens } from '../contracts/config';

const AdminPanel: React.FC = () => {
  const [contractService] = useState(new ContractService());
  const [userAddress, setUserAddress] = useState<string>('');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // 白名单管理状态
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);
  const [tokenStatuses, setTokenStatuses] = useState<{ [address: string]: boolean }>({});

  useEffect(() => {
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    try {
      setLoading(true);
      
      // 初始化并连接钱包
      await contractService.initialize();
      const address = await contractService.connectWallet();
      setUserAddress(address);
      
      // 检查是否为合约所有者（这里简化处理，实际应该调用合约的owner()方法）
      // 暂时假设连接的用户是所有者
      setIsOwner(true);
      
      // 检查常用代币的白名单状态
      await checkCommonTokensStatus();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `初始化失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const checkCommonTokensStatus = async () => {
    try {
      const tokens = getCurrentTestTokens();
      const statuses: { [address: string]: boolean } = {};
      
      for (const [, address] of Object.entries(tokens)) {
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          const status = await contractService.isTokenWhitelisted(address);
          statuses[address] = status;
        }
      }
      
      setTokenStatuses(statuses);
    } catch (error) {
      console.error('检查代币状态失败:', error);
    }
  };

  const checkTokenStatus = async () => {
    if (!tokenAddress) {
      setMessage({ type: 'error', text: '请输入代币地址' });
      return;
    }
    
    try {
      setLoading(true);
      const status = await contractService.isTokenWhitelisted(tokenAddress);
      setIsWhitelisted(status);
      setMessage({ type: 'info', text: `代币 ${tokenAddress} 白名单状态: ${status ? '已添加' : '未添加'}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `检查失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const updateTokenWhitelist = async () => {
    if (!tokenAddress) {
      setMessage({ type: 'error', text: '请输入代币地址' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.updateTokenWhitelist(tokenAddress, isWhitelisted);
      
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      
      await tx.wait();
      
      setMessage({ 
        type: 'success', 
        text: `代币白名单更新成功！${tokenAddress} ${isWhitelisted ? '已添加到' : '已从'}白名单${isWhitelisted ? '' : '中移除'}` 
      });
      
      // 刷新常用代币状态
      await checkCommonTokensStatus();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `更新失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const addCommonTokenToWhitelist = async (address: string, symbol: string) => {
    try {
      setLoading(true);
      const tx = await contractService.updateTokenWhitelist(address, true);
      
      setMessage({ type: 'info', text: `正在添加 ${symbol} 到白名单...` });
      
      await tx.wait();
      
      setMessage({ type: 'success', text: `${symbol} 已成功添加到白名单` });
      
      // 刷新状态
      await checkCommonTokensStatus();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `添加 ${symbol} 失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          此页面仅限合约管理员访问
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          ChainOath 管理面板
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          当前管理员: {userAddress}
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {/* 消息显示 */}
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        
        {/* 常用代币白名单状态 */}
        <Typography variant="h6" gutterBottom>
          常用代币白名单状态
        </Typography>
        
        <List>
          {Object.entries(getCurrentTestTokens()).map(([symbol, address]) => {
            if (!address || address === '0x0000000000000000000000000000000000000000') return null;
            
            const isInWhitelist = tokenStatuses[address];
            
            return (
              <ListItem key={symbol}>
                <ListItemText
                  primary={symbol}
                  secondary={address}
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={isInWhitelist ? '已添加' : '未添加'} 
                      color={isInWhitelist ? 'success' : 'default'}
                      size="small"
                    />
                    {!isInWhitelist && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => addCommonTokenToWhitelist(address, symbol)}
                        disabled={loading}
                      >
                        添加
                      </Button>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
        
        <Divider sx={{ my: 3 }} />
        
        {/* 手动管理代币白名单 */}
        <Typography variant="h6" gutterBottom>
          手动管理代币白名单
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="代币合约地址"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            fullWidth
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={checkTokenStatus}
              disabled={loading || !tokenAddress}
            >
              检查状态
            </Button>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isWhitelisted}
                  onChange={(e) => setIsWhitelisted(e.target.checked)}
                />
              }
              label={isWhitelisted ? '添加到白名单' : '从白名单移除'}
            />
            
            <Button
              variant="contained"
              onClick={updateTokenWhitelist}
              disabled={loading || !tokenAddress}
            >
              {loading ? <CircularProgress size={20} /> : '更新白名单'}
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            💡 提示：只有合约所有者才能管理代币白名单。添加代币到白名单后，用户才能使用该代币创建誓约。
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminPanel;
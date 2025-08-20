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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  
  // 测试功能相关状态
  const [testOathId, setTestOathId] = useState<string>('');
  const [testStatus, setTestStatus] = useState<number>(0);
  const [testCheckpointIndex, setTestCheckpointIndex] = useState<number>(0);
  const [showTestPanel, setShowTestPanel] = useState(false);

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
      
      // 检查是否为合约所有者
      const ownerStatus = await contractService.isContractOwner(address);
      setIsOwner(ownerStatus);
      
      if (ownerStatus) {
        // 只有所有者才检查代币白名单状态
        await checkCommonTokensStatus();
        setMessage({ type: 'success', text: '管理员权限验证成功' });
      } else {
        const owner = await contractService.getContractOwner();
        setMessage({ 
          type: 'error', 
          text: `权限不足：当前地址 ${address} 不是合约所有者。合约所有者: ${owner}` 
        });
      }
      
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

  // 测试功能处理函数
  const handleAdminForceCompleteCheckpoint = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.adminForceCompleteCheckpoint(testOathId);
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      await tx.wait();
      setMessage({ type: 'success', text: '强制完成检查点成功！' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `操作失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetOathStatus = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.adminSetOathStatus(testOathId, testStatus);
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      await tx.wait();
      setMessage({ type: 'success', text: `设置誓约状态为 ${testStatus} 成功！` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `操作失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSkipToNextPhase = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.adminSkipToNextPhase(testOathId);
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      await tx.wait();
      setMessage({ type: 'success', text: '跳过到下一阶段成功！' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `操作失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResetOath = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.adminResetOath(testOathId);
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      await tx.wait();
      setMessage({ type: 'success', text: '重置誓约成功！' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `操作失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetCheckpointIndex = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const tx = await contractService.adminSetCheckpointIndex(testOathId, testCheckpointIndex);
      setMessage({ type: 'info', text: `交易已提交: ${tx.hash}，等待确认...` });
      await tx.wait();
      setMessage({ type: 'success', text: `设置检查点索引为 ${testCheckpointIndex} 成功！` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `操作失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGetTestInfo = async () => {
    if (!testOathId) {
      setMessage({ type: 'error', text: '请输入誓约ID' });
      return;
    }
    
    try {
      setLoading(true);
      const testInfo = await contractService.adminGetTestInfo(testOathId);
      console.log('测试信息:', testInfo);
      setMessage({ type: 'success', text: '测试信息已输出到控制台，请按F12查看' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessage({ type: 'error', text: `获取测试信息失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  // 检查是否显示测试面板（隐秘条件）
  const shouldShowTestPanel = () => {
    // 只有在特定条件下才显示测试面板
    // 例如：URL包含特定参数，或者用户地址符合特定条件
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || showTestPanel;
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
        
        {/* 隐秘的测试面板 */}
        {shouldShowTestPanel() && (
          <>
            <Divider sx={{ my: 3 }} />
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="error">
                  🔧 高级测试功能 (仅限开发)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ 警告：这些功能仅用于测试目的，可能会影响合约的正常运行。请谨慎使用！
                </Alert>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="誓约ID"
                    value={testOathId}
                    onChange={(e) => setTestOathId(e.target.value)}
                    placeholder="输入要测试的誓约ID"
                    fullWidth
                    size="small"
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleAdminForceCompleteCheckpoint}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      强制完成检查点
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleAdminSkipToNextPhase}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      跳过到下一阶段
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleAdminResetOath}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      重置誓约
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={handleGetTestInfo}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      获取测试信息
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>誓约状态</InputLabel>
                      <Select
                        value={testStatus}
                        label="誓约状态"
                        onChange={(e) => setTestStatus(Number(e.target.value))}
                      >
                        <MenuItem value={0}>待开始</MenuItem>
                        <MenuItem value={1}>进行中</MenuItem>
                        <MenuItem value={2}>已完成</MenuItem>
                        <MenuItem value={3}>已失败</MenuItem>
                        <MenuItem value={4}>已取消</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleAdminSetOathStatus}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      设置状态
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="检查点索引"
                      type="number"
                      value={testCheckpointIndex}
                      onChange={(e) => setTestCheckpointIndex(Number(e.target.value))}
                      size="small"
                      sx={{ width: 150 }}
                    />
                    
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleAdminSetCheckpointIndex}
                      disabled={loading || !testOathId}
                      size="small"
                    >
                      设置检查点索引
                    </Button>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    💡 提示：访问 ?debug=true 参数可显示此面板
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </>
        )}
        
        {/* 隐秘激活按钮 */}
        {!shouldShowTestPanel() && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowTestPanel(true)}
              sx={{ 
                opacity: 0.1, 
                '&:hover': { opacity: 0.3 },
                fontSize: '10px'
              }}
            >
              .
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AdminPanel;
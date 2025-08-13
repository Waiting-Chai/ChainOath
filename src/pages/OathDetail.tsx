import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarTodayIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { contractService } from '../services/contractService';
import { ethers } from 'ethers';
import { getCurrentNetworkConfig } from '../contracts/config';
import {
  Star as StarIcon,
  Gavel as GavelIcon,
  AccountBalance as AccountBalanceIcon,
  MonetizationOn as MonetizationOnIcon,
  Share as ShareIcon,
  Twitter as TwitterIcon,
  Chat as WechatIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';

interface OathDetailData {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
  startDate: string;
  deadline: string;
  stake: string;
  creator: {
    name: string;
    avatar: string;
    address: string;
  };
  witnesses: Array<{
    name: string;
    status: 'staked' | 'not_staked';
    address: string;
    role: 'creator' | 'supervisor';
  }>;
  committers: string[];
  supervisors: string[];
  checkpoints: Array<{
    date: string;
    title: string;
    description: string;
    status: string;
    timestamp: number;
  }>;
  updates: Array<{
    date: string;
    user: string;
    avatar: string;
    content: string;
    attachments: string[];
  }>;
  contractAddress?: string;
  checkInterval: number;
  checkWindow: number;
  startTime: number;
  endTime: number;
}

const OathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [oath, setOath] = useState<OathDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null);
  const [supervisorStatus, setSupervisorStatus] = useState<{
    missCount: number;
    successfulChecks: number;
    isDisqualified: boolean;
    expectedReward: string;
  } | null>(null);
  const [checkTimeInfo, setCheckTimeInfo] = useState<{
    nextCheckTime: number;
    timeUntilNextCheck: number;
    timeUntilCheckWindowEnd: number;
    isInCheckWindow: boolean;
  } | null>(null);

  // 计算检查点
  const calculateCheckpoints = (oathData: {
    startTime: number;
    endTime: number;
    checkInterval: number;
    checkWindow: number;
  }) => {
    const checkpoints = [];
    const startTime = oathData.startTime;
    const endTime = oathData.endTime;
    const checkInterval = oathData.checkInterval;
    
    let currentTime = startTime;
    let index = 0;
    
    while (currentTime <= endTime) {
      const date = new Date(currentTime * 1000);
      const now = Date.now();
      const checkpointTime = currentTime * 1000;
      
      let status: 'completed' | 'active' | 'pending';
      if (checkpointTime < now - (oathData.checkWindow * 1000)) {
        status = 'completed';
      } else if (checkpointTime <= now && now <= checkpointTime + (oathData.checkWindow * 1000)) {
        status = 'active';
      } else {
        status = 'pending';
      }
      
      checkpoints.push({
        title: `检查点 ${index + 1}`,
        date: date.toLocaleDateString('zh-CN'),
        description: `第 ${index + 1} 次进度检查`,
        status,
        timestamp: currentTime
      });
      
      currentTime += checkInterval;
      index++;
    }
    
    return checkpoints;
  };

  useEffect(() => {
    const loadOathData = async () => {
      if (!id) {
        setError('誓约ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 初始化合约服务
        await contractService.initialize();
        
        // 获取誓约基本信息
          const oathData = await contractService.getOath(id);
         
         if (!oathData) {
           setError('誓约不存在');
           setLoading(false);
           return;
         }

         // 计算进度
         const now = Date.now();
         const startTime = Number(oathData.startTime) * 1000;
         const endTime = Number(oathData.endTime) * 1000;
         const totalDuration = endTime - startTime;
         const elapsed = now - startTime;
         const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

         // 根据状态判断誓约状态
         let status: 'active' | 'completed' | 'failed' = 'active';
         if (oathData.status === 2) {
           status = 'completed';
         } else if (oathData.status === 3) {
           status = 'failed';
         }

         // 获取用户地址
          const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
          const currentUser = accounts?.[0] || '';
          setUserAddress(currentUser.toLowerCase());

          // 检查见证人质押状态
          const witnessesData = [
            {
              address: oathData.creator,
              role: 'creator' as const,
              name: oathData.creator.slice(0, 6) + '...' + oathData.creator.slice(-4)
            },
            ...(oathData.supervisors || []).map((supervisor: string) => ({
              address: supervisor,
              role: 'supervisor' as const,
              name: supervisor.slice(0, 6) + '...' + supervisor.slice(-4)
            }))
          ];

          const witnessesWithStakeStatus = await Promise.all(
            witnessesData.map(async (witness) => {
              try {
                const hasStaked = await contractService.hasStaked(id, witness.address);
                return {
                  ...witness,
                  status: hasStaked ? 'staked' : 'not_staked' as 'staked' | 'not_staked'
                };
              } catch (err) {
                console.error('检查质押状态失败:', err);
                return {
                  ...witness,
                  status: 'not_staked' as 'staked' | 'not_staked'
                };
              }
            })
          );

         // 动态计算检查点
          const checkpoints = calculateCheckpoints({
            startTime: oathData.startTime,
            endTime: oathData.endTime,
            checkInterval: 86400, // 24小时，从合约常量获取
            checkWindow: 3600 // 1小时，从合约常量获取
          });

         // 格式化数据
         const formattedOath: OathDetailData = {
           id: id,
           title: oathData.title,
           description: oathData.description,
           status,
           progress: Math.round(progress),
           startDate: new Date(startTime).toLocaleDateString('zh-CN'),
           deadline: new Date(endTime).toLocaleDateString('zh-CN'),
           stake: `${ethers.formatEther(oathData.committerStakeAmount)} ETH`,
           creator: {
             name: oathData.creator.slice(0, 6) + '...' + oathData.creator.slice(-4),
             avatar: 'https://mui.com/static/images/avatar/1.jpg',
             address: oathData.creator
           },
           witnesses: witnessesWithStakeStatus,
           checkpoints,
           updates: [],
           contractAddress: getCurrentNetworkConfig().chainOathAddress,
            committers: oathData.committers || [],
            supervisors: oathData.supervisors || [],
            checkInterval: 86400, // 24小时
             checkWindow: 3600, // 1小时
            startTime: oathData.startTime,
            endTime: oathData.endTime
         };

        setOath(formattedOath);

        // 如果当前用户是监督者，获取监督者状态
         if (oathData.supervisors && oathData.supervisors.includes(currentUser.toLowerCase())) {
           try {
             const status = await contractService.getSupervisorStatus(id, currentUser);
              const reward = await contractService.calculateSupervisorReward(id);
             setSupervisorStatus({
               ...status,
               expectedReward: reward
             });

             const timeInfo = await contractService.getNextCheckTime(id);
             setCheckTimeInfo(timeInfo);
           } catch (err) {
             console.error('获取监督者状态失败:', err);
           }
         }
      } catch (err: unknown) {
         console.error('加载誓约数据失败:', err);
         const errorMessage = err instanceof Error ? err.message : '加载誓约数据失败';
         setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadOathData();
  }, [id]);

  // 分享到推特
  const handleShareToTwitter = () => {
    const shareText = `我在ChainOath上创建了一个誓约：${oath?.title}。一起来见证我的承诺吧！`;
    const shareUrl = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
    setShareMenuAnchor(null);
  };

  // 分享到微信（生成二维码或复制链接）
  const handleShareToWechat = () => {
    const shareText = `${oath?.title} - ChainOath誓约\n${window.location.href}`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert('链接已复制到剪贴板，请在微信中粘贴分享');
    }).catch(() => {
      alert('复制失败，请手动复制链接分享');
    });
    setShareMenuAnchor(null);
  };

  // 查看区块链记录
  const handleViewOnBlockchain = () => {
    const networkConfig = getCurrentNetworkConfig();
    const explorerUrl = `${networkConfig.blockExplorer}/address/${networkConfig.chainOathAddress}`;
    window.open(explorerUrl, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!oath) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">誓约不存在</Alert>
      </Container>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip icon={<AccessTimeIcon />} label="进行中" color="primary" size="small" />;
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="已完成" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<CancelIcon />} label="已失败" color="error" size="small" />;
      case 'pending':
        return <Chip icon={<AccessTimeIcon />} label="待处理" color="default" size="small" />;
      case 'staked':
        return <Chip label="已质押" color="success" size="small" />;
      case 'not_staked':
        return <Chip label="未质押" color="warning" size="small" />;
      default:
        return null;
    }
  };

  // 获取用户角色
  const getUserRole = () => {
    if (!userAddress || !oath) return null;
    if (oath.creator.address.toLowerCase() === userAddress) return 'creator';
    if (oath.committers.some(c => c.toLowerCase() === userAddress)) return 'committer';
    if (oath.supervisors.some(s => s.toLowerCase() === userAddress)) return 'supervisor';
    return null;
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="fixed" color="default" elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: 2, 
              bgcolor: 'primary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mr: 1.5
            }}>
              <LinkIcon sx={{ color: 'white' }} />
            </Box>
            <Typography variant="h6" component="div" sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ChainOath
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            <Button color="inherit" component={RouterLink} to="/" sx={{ mx: 1 }}>首页</Button>
            <Button color="inherit" sx={{ mx: 1 }}>探索</Button>
            <Button color="inherit" sx={{ mx: 1 }}>文档</Button>
            <Button color="inherit" sx={{ mx: 1 }}>关于</Button>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary"
            component={RouterLink}
            to="/create"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: 2,
              '&:hover': { boxShadow: 4 }
            }}
          >
            创建誓约
          </Button>
        </Toolbar>
      </AppBar>
      
      <Toolbar /> {/* Spacer for fixed AppBar */}
      
      {/* Main Content */}
      <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Button
          component={RouterLink}
          to="/my-oaths"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          返回我的誓约
        </Button>
        
        <Grid container spacing={4}>
          {/* Left Column - Oath Details */}
            <Grid size={{xs:12, md:8}}>
            <Paper sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                  {oath.title}
                </Typography>
                {getStatusChip(oath.status)}
              </Box>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                {oath.description}
              </Typography>
              
              {oath.status === 'active' && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      进度
                    </Typography>
                    <Typography variant="body2" color="primary">
                      {oath.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={oath.progress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              )}
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{xs:12, sm:6}}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      开始日期: {oath.startDate}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{xs:12, sm:6}}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      截止日期: {oath.deadline}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{xs:12, sm:6}}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountBalanceWalletIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      质押金额: {oath.stake}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{xs:12, sm:6}}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      创建者: {oath.creator.name}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* 角色相关操作按钮 */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                {/* 创建者操作 */}
                {userAddress && oath.creator.address.toLowerCase() === userAddress && (
                  <>
                    {oath.status === 'active' && (
                      <Button 
                        variant="contained" 
                        color="error" 
                        startIcon={<AccountBalanceIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        撤回合约
                      </Button>
                    )}
                    {(oath.status === 'completed' || oath.status === 'failed') && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<MonetizationOnIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        结算收益
                      </Button>
                    )}
                  </>
                )}
                
                {/* 受约人操作 */}
                {userAddress && oath.committers.some(c => c.toLowerCase() === userAddress) && (
                  <>
                    {oath.status === 'active' && (
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        sx={{ borderRadius: 2 }}
                      >
                        更新进度
                      </Button>
                    )}
                    {oath.status === 'completed' && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<MonetizationOnIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        领取奖励
                      </Button>
                    )}
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      startIcon={<AccountBalanceIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      申请退款
                    </Button>
                  </>
                )}
                
                {/* 监督者操作 */}
                {userAddress && oath.supervisors.some(s => s.toLowerCase() === userAddress) && (
                  <>
                    {oath.status === 'completed' && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<MonetizationOnIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        领取奖励
                      </Button>
                    )}
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      startIcon={<AccountBalanceIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      申请退款
                    </Button>
                  </>
                )}
                
                {/* 通用操作 */}
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<ShareIcon />}
                  endIcon={<ExpandMoreIcon />}
                  sx={{ borderRadius: 2 }}
                  onClick={(e) => setShareMenuAnchor(e.currentTarget)}
                >
                  分享誓约
                </Button>
                
                {/* 分享菜单 */}
                <Menu
                  anchorEl={shareMenuAnchor}
                  open={Boolean(shareMenuAnchor)}
                  onClose={() => setShareMenuAnchor(null)}
                >
                  <MenuItem onClick={() => handleShareToTwitter()}>
                    <TwitterIcon sx={{ mr: 1, color: '#1DA1F2' }} />
                    分享到推特
                  </MenuItem>
                  <MenuItem onClick={() => handleShareToWechat()}>
                    <WechatIcon sx={{ mr: 1, color: '#07C160' }} />
                    分享到微信
                  </MenuItem>
                </Menu>
              </Box>
              
              {/* 监督者状态信息 */}
              {getUserRole() === 'supervisor' && supervisorStatus && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    监督者状态
                  </Typography>
                  <Typography variant="body2">
                    失职次数: {supervisorStatus.missCount}
                  </Typography>
                  <Typography variant="body2">
                    成功检查次数: {supervisorStatus.successfulChecks}
                  </Typography>
                  <Typography variant="body2">
                    预期收益: {supervisorStatus.expectedReward} ETH
                  </Typography>
                  {supervisorStatus.isDisqualified && (
                    <Typography variant="body2" color="error">
                      已被取消资格
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
            
            {/* Checkpoints */}
            <Paper sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
                检查点
              </Typography>
              
              <Box sx={{ 
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 16,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: 'divider',
                  zIndex: 0
                }
              }}>
                {oath.checkpoints.map((checkpoint, index) => (
                  <Box key={index} sx={{ 
                    position: 'relative', 
                    pl: 5, 
                    pb: index < oath.checkpoints.length - 1 ? 4 : 0,
                    zIndex: 1
                  }}>
                    <Box sx={{ 
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      bgcolor: checkpoint.status === 'completed' ? 'success.main' : 
                              checkpoint.status === 'active' ? 'primary.main' : 'grey.300',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {checkpoint.status === 'completed' ? (
                        <CheckCircleIcon sx={{ color: 'white' }} />
                      ) : checkpoint.status === 'active' ? (
                        <AccessTimeIcon sx={{ color: 'white' }} />
                      ) : (
                        <AccessTimeIcon sx={{ color: 'grey.500' }} />
                      )}
                    </Box>
                    
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {checkpoint.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {checkpoint.date}
                    </Typography>
                    
                    <Typography variant="body2">
                      {checkpoint.description}
                    </Typography>
                    
                    {getStatusChip(checkpoint.status)}
                    
                    {/* 监督者检查窗口信息 */}
                    {getUserRole() === 'supervisor' && checkpoint.status === 'active' && checkTimeInfo && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="caption" color="warning.dark">
                          检查窗口剩余时间: {Math.max(0, Math.floor(checkTimeInfo.timeUntilCheckWindowEnd / 60))} 分钟
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>
            
            {/* Updates */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
                进度更新
              </Typography>
              
              {oath.updates.map((update, index) => (
                <Box key={index} sx={{ mb: index < oath.updates.length - 1 ? 4 : 0 }}>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <Avatar src={update.avatar} sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {update.user}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {update.date}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {update.content}
                  </Typography>
                  
                  {update.attachments.length > 0 && (
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      mb: 2
                    }}>
                      {update.attachments.map((attachment, i) => (
                        <Box 
                          key={i}
                          component="img"
                          src={attachment}
                          alt={`Attachment ${i}`}
                          sx={{ 
                            width: 200,
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  {index < oath.updates.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
              
              <Button 
                variant="outlined" 
                startIcon={<CommentIcon />}
                fullWidth
                sx={{ mt: 3, borderRadius: 2 }}
              >
                添加更新
              </Button>
            </Paper>
          </Grid>
          
          {/* Right Column - Sidebar */}
            <Grid size={{xs:12, md:4}}>
            {/* Witnesses */}
            <Paper sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
                见证人
              </Typography>
              
              <List sx={{ p: 0 }}>
                {oath.witnesses.map((witness, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1 }}>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{witness.name}</Typography>
                          {witness.role === 'creator' && (
                            <Chip 
                              icon={<StarIcon />} 
                              label="创建者" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                          {witness.role === 'supervisor' && (
                            <Chip 
                              icon={<GavelIcon />} 
                              label="监督者" 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={witness.status === 'staked' ? '已质押' : '未质押'}
                    />
                    {getStatusChip(witness.status)}
                  </ListItem>
                ))}
              </List>
            </Paper>
            
            {/* Contract Info */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
                合约信息
              </Typography>
              
              <Box sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 14,
                mb: 2,
                wordBreak: 'break-all'
              }}>
                {oath.contractAddress || '合约地址加载中...'}
              </Box>
              
              <Button 
                variant="outlined" 
                startIcon={<OpenInNewIcon />}
                fullWidth
                sx={{ borderRadius: 2 }}
                onClick={() => handleViewOnBlockchain()}
              >
                查看区块链记录
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default OathDetail;
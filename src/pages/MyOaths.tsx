import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Divider,

  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Link as LinkIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Create as CreateIcon,
  Gavel as GavelIcon,
  AccountBalance as AccountBalanceIcon,
  Schedule as ScheduleIcon,
  Done as DoneIcon
} from '@mui/icons-material';
import { contractService } from '../services/contractService';
import { getCurrentTestTokens } from '../contracts/config';

// 定义誓约数据类型
interface OathData {
  id: string;
  title: string;
  description: string;
  creator: string;
  committers: string[];
  supervisors: string[];
  committerStakeAmount: string;
  supervisorStakeAmount: string;
  tokenAddress: string;
  status: number;
  startTime: number;
  endTime: number;
  createdAt: number;
  userRole?: 'creator' | 'committer' | 'supervisor';
  isStaked?: boolean;
  remainingTime?: number;
}

// 誓约状态常量
const OathStatus = {
  CREATED: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  FAILED: 3,
  CANCELLED: 4
} as const;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`oath-tabpanel-${index}`}
      aria-labelledby={`oath-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `oath-tab-${index}`,
    'aria-controls': `oath-tabpanel-${index}`,
  };
}

const MyOaths: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [oaths, setOaths] = useState<OathData[]>([]);
  const [tokens, setTokens] = useState<Array<{symbol: string; address: string; name: string}>>([]);
  
  const open = Boolean(anchorEl);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 初始化合约服务
      await contractService.initialize();
      
      // 获取用户地址
      const address = await contractService.getCurrentAddress();
      if (!address) {
        // 如果没有连接钱包，尝试连接
        const connectedAddress = await contractService.connectWallet();
        setUserAddress(connectedAddress);
      } else {
        setUserAddress(address);
      }

      // 获取代币信息
      const tokenList = getCurrentTestTokens();
      const tokenArray = Object.entries(tokenList).map(([symbol, address]) => ({
        symbol,
        address,
        name: symbol
      }));
      setTokens(tokenArray);

      // 获取用户相关的所有誓约
      await loadUserOaths(address || userAddress!);
    } catch (err) {
      console.error('初始化数据失败:', err);
      setError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserOaths = async (address: string) => {
    try {
      const [createdOaths, committerOaths, supervisorOaths] = await Promise.all([
        contractService.getUserCreatedOaths(address),
        contractService.getUserCommitterOaths(address),
        contractService.getUserSupervisorOaths(address)
      ]);

      // 合并所有誓约并标记用户角色
      const allOaths: OathData[] = [];
      
      // 添加创建的誓约
      createdOaths.forEach(oath => {
        allOaths.push({ ...oath, userRole: 'creator', createdAt: oath.startTime });
      });

      // 添加守约人誓约
      committerOaths.forEach(oath => {
        const existingIndex = allOaths.findIndex(o => o.id === oath.id);
        if (existingIndex >= 0) {
          allOaths[existingIndex].userRole = 'creator'; // 如果既是创建者又是守约人，优先显示创建者
        } else {
          allOaths.push({ ...oath, userRole: 'committer', createdAt: oath.startTime });
        }
      });

      // 添加监督者誓约
      supervisorOaths.forEach(oath => {
        const existingIndex = allOaths.findIndex(o => o.id === oath.id);
        if (existingIndex >= 0) {
          // 如果已存在，不改变角色
        } else {
          allOaths.push({ ...oath, userRole: 'supervisor', createdAt: oath.startTime });
        }
      });

      // 获取每个誓约的详细状态
      for (const oath of allOaths) {
        try {
          const [statusInfo, isStaked] = await Promise.all([
            contractService.getOathStatus(oath.id),
            contractService.hasStaked(oath.id, address)
          ]);
          oath.isStaked = isStaked;
          oath.remainingTime = statusInfo.remainingTime;
        } catch (err) {
          console.warn(`获取誓约 ${oath.id} 状态失败:`, err);
        }
      }

      setOaths(allOaths);
    } catch (err) {
      console.error('加载用户誓约失败:', err);
      throw err;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleConfirmCompletion = async (oathId: string) => {
    try {
      setLoading(true);
      await contractService.confirmOathCompletion(oathId);
      // 重新加载数据
      await loadUserOaths(userAddress!);
      setLoading(false);
    } catch (err) {
      console.error('确认完成失败:', err);
      setError(err instanceof Error ? err.message : '确认完成失败');
      setLoading(false);
    }
  };

  const getStatusChip = (status: number) => {
    switch (status) {
      case OathStatus.CREATED:
        return <Chip icon={<ScheduleIcon />} label="待激活" color="warning" size="small" />;
      case OathStatus.ACTIVE:
        return <Chip icon={<AccessTimeIcon />} label="进行中" color="primary" size="small" />;
      case OathStatus.COMPLETED:
        return <Chip icon={<CheckCircleIcon />} label="已完成" color="success" size="small" />;
      case OathStatus.FAILED:
        return <Chip icon={<CancelIcon />} label="已失败" color="error" size="small" />;
      case OathStatus.CANCELLED:
        return <Chip icon={<CancelIcon />} label="已取消" color="default" size="small" />;
      default:
        return null;
    }
  };

  const getRoleChip = (role?: string) => {
    switch (role) {
      case 'creator':
        return <Chip icon={<CreateIcon />} label="创建者" color="secondary" size="small" variant="outlined" />;
      case 'committer':
        return <Chip icon={<PersonIcon />} label="守约者" color="info" size="small" variant="outlined" />;
      case 'supervisor':
        return <Chip icon={<VisibilityIcon />} label="监督者" color="warning" size="small" variant="outlined" />;
      default:
        return null;
    }
  };

  const getTokenSymbol = (tokenAddress: string) => {
    const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    return token ? token.symbol : 'Unknown';
  };

  const formatTimeRemaining = (remainingTime?: number) => {
    if (!remainingTime || remainingTime <= 0) return '已结束';
    
    const days = Math.floor(remainingTime / (24 * 60 * 60));
    const hours = Math.floor((remainingTime % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) {
      return `${days}天${hours}小时`;
    }
    return `${hours}小时`;
  };

  const filterOathsByTab = (oaths: OathData[], tabIndex: number) => {
    switch (tabIndex) {
      case 0: // 全部
        return oaths;
      case 1: // 进行中
        return oaths.filter(oath => oath.status === OathStatus.ACTIVE);
      case 2: // 已完成
        return oaths.filter(oath => oath.status === OathStatus.COMPLETED);
      case 3: // 已失败
        return oaths.filter(oath => oath.status === OathStatus.FAILED);
      case 4: // 待激活
        return oaths.filter(oath => oath.status === OathStatus.CREATED);
      default:
        return oaths;
    }
  };

  const renderOathCard = (oath: OathData) => (
     <Box key={oath.id} sx={{ width: { xs: '100%', md: '50%', lg: '33.333%' }, p: 1.5 }}>
      <Card sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        '&:hover': { 
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          transform: 'translateY(-4px)'
        }
      }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flex: 1 }}>
              {oath.title}
            </Typography>
            <IconButton
              aria-label="more"
              onClick={handleMenuClick}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
          
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
             {getStatusChip(oath.status)}
             {getRoleChip(oath.userRole)}
            {!oath.isStaked && oath.userRole !== 'creator' && (
              <Chip label="未质押" color="error" size="small" variant="outlined" />
            )}
          </Stack>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {oath.description}
          </Typography>
          
          {oath.status === OathStatus.ACTIVE && oath.remainingTime && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  剩余时间
                </Typography>
                <Typography variant="body2" color="primary">
                  {formatTimeRemaining(oath.remainingTime)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.max(0, Math.min(100, (oath.remainingTime / (oath.endTime - oath.startTime)) * 100))} 
                sx={{ height: 6, borderRadius: 3 }} 
              />
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              质押金额: {oath.userRole === 'committer' ? oath.committerStakeAmount : oath.supervisorStakeAmount} {getTokenSymbol(oath.tokenAddress)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              参与者: {oath.committers.length + oath.supervisors.length} 人
            </Typography>
          </Box>
        </CardContent>
        
        <Divider />
        
        <CardActions sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button 
              size="small" 
              endIcon={<ArrowForwardIcon />}
              component={RouterLink}
              to={`/oath/${oath.id}`}
              variant="outlined"
            >
              查看详情
            </Button>
            
            {oath.userRole === 'supervisor' && oath.status === OathStatus.ACTIVE && (
              <Button 
                size="small" 
                endIcon={<DoneIcon />}
                onClick={() => handleConfirmCompletion(oath.id)}
                variant="contained"
                color="success"
              >
                确认完成
              </Button>
            )}
            
            {!oath.isStaked && oath.userRole !== 'creator' && oath.status === OathStatus.CREATED && (
              <Button 
                size="small" 
                endIcon={<AccountBalanceIcon />}
                component={RouterLink}
                to={`/stake/${oath.id}`}
                variant="contained"
                color="warning"
              >
                去质押
              </Button>
            )}
          </Stack>
        </CardActions>
      </Card>
     </Box>
   );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mr: 2 }}>
            我的誓约
          </Typography>
          {userAddress && (
            <Tooltip title={userAddress}>
              <Chip 
                avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>}
                label={`${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`}
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="oath tabs">
              <Tab label={`全部 (${oaths.length})`} {...a11yProps(0)} />
              <Tab label={`进行中 (${oaths.filter(o => o.status === OathStatus.ACTIVE).length})`} {...a11yProps(1)} />
              <Tab label={`已完成 (${oaths.filter(o => o.status === OathStatus.COMPLETED).length})`} {...a11yProps(2)} />
              <Tab label={`已失败 (${oaths.filter(o => o.status === OathStatus.FAILED).length})`} {...a11yProps(3)} />
              <Tab label={`待激活 (${oaths.filter(o => o.status === OathStatus.CREATED).length})`} {...a11yProps(4)} />
            </Tabs>
          </Box>
          
          {[0, 1, 2, 3, 4].map(tabIndex => (
            <TabPanel key={tabIndex} value={tabValue} index={tabIndex}>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
                 {filterOathsByTab(oaths, tabIndex).length > 0 ? (
                   filterOathsByTab(oaths, tabIndex).map(renderOathCard)
                 ) : (
                   <Box sx={{ width: '100%', textAlign: 'center', py: 8 }}>
                     <GavelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                     <Typography variant="h6" color="text.secondary">
                       暂无相关誓约
                     </Typography>
                     <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                       {tabIndex === 0 ? '您还没有参与任何誓约' : '该分类下暂无誓约'}
                     </Typography>
                     {tabIndex === 0 && (
                       <Button 
                         variant="contained" 
                         component={RouterLink} 
                         to="/create" 
                         sx={{ mt: 2 }}
                       >
                         创建第一个誓约
                       </Button>
                     )}
                   </Box>
                 )}
               </Box>
             </TabPanel>
          ))}
        </Box>
      </Container>
      
      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>分享</MenuItem>
        <MenuItem onClick={handleMenuClose}>导出</MenuItem>
      </Menu>
    </Box>
  );
};

export default MyOaths;
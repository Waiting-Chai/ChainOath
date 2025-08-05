import React from 'react';
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
  Grid,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';
import {
  Link as LinkIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

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
  const [tabValue, setTabValue] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 模拟誓约数据
  const oaths = [
    {
      id: '1',
      title: '每天跑步5公里',
      description: '坚持每天早上跑步5公里，持续30天',
      status: 'active',
      progress: 60,
      deadline: '2023-12-31',
      stake: '0.1 ETH'
    },
    {
      id: '2',
      title: '完成项目开发',
      description: '在截止日期前完成区块链项目的开发和部署',
      status: 'completed',
      progress: 100,
      deadline: '2023-11-15',
      stake: '0.5 ETH'
    },
    {
      id: '3',
      title: '学习新技能',
      description: '每周学习5小时Solidity编程',
      status: 'failed',
      progress: 30,
      deadline: '2023-10-30',
      stake: '0.2 ETH'
    }
  ];

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip icon={<AccessTimeIcon />} label="进行中" color="primary" size="small" />;
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="已完成" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<CancelIcon />} label="已失败" color="error" size="small" />;
      default:
        return null;
    }
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
        <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
          我的誓约
        </Typography>
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="oath tabs">
              <Tab label="全部" {...a11yProps(0)} />
              <Tab label="进行中" {...a11yProps(1)} />
              <Tab label="已完成" {...a11yProps(2)} />
              <Tab label="已失败" {...a11yProps(3)} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {oaths.map((oath) => (
                <Grid size={{xs:12, md:6, lg:4}} key={oath.id}>
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
                        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                          {oath.title}
                        </Typography>
                        <IconButton
                          aria-label="more"
                          id={`oath-menu-button-${oath.id}`}
                          aria-controls={open ? `oath-menu-${oath.id}` : undefined}
                          aria-expanded={open ? 'true' : undefined}
                          aria-haspopup="true"
                          onClick={handleMenuClick}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          id={`oath-menu-${oath.id}`}
                          anchorEl={anchorEl}
                          open={open && anchorEl?.id === `oath-menu-button-${oath.id}`}
                          onClose={handleMenuClose}
                          MenuListProps={{
                            'aria-labelledby': `oath-menu-button-${oath.id}`,
                          }}
                        >
                          <MenuItem onClick={handleMenuClose}>编辑</MenuItem>
                          <MenuItem onClick={handleMenuClose}>分享</MenuItem>
                          <MenuItem onClick={handleMenuClose}>删除</MenuItem>
                        </Menu>
                      </Box>
                      
                      {getStatusChip(oath.status)}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        {oath.description}
                      </Typography>
                      
                      {oath.status === 'active' && (
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              进度
                            </Typography>
                            <Typography variant="body2" color="primary">
                              {oath.progress}%
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={oath.progress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          截止日期: {oath.deadline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          质押金额: {oath.stake}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon />}
                        component={RouterLink}
                        to={`/oath/${oath.id}`}
                        sx={{ ml: 'auto' }}
                      >
                        查看详情
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {oaths.filter(oath => oath.status === 'active').map((oath) => (
                <Grid size={{xs:12, md:6, lg:4}} key={oath.id}>
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
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {oath.title}
                      </Typography>
                      
                      {getStatusChip(oath.status)}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        {oath.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            进度
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {oath.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={oath.progress} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          截止日期: {oath.deadline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          质押金额: {oath.stake}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon />}
                        component={RouterLink}
                        to={`/oath/${oath.id}`}
                        sx={{ ml: 'auto' }}
                      >
                        查看详情
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {oaths.filter(oath => oath.status === 'completed').map((oath) => (
                <Grid size={{xs:12, md:6, lg:4}} key={oath.id}>
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
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {oath.title}
                      </Typography>
                      
                      {getStatusChip(oath.status)}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        {oath.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          截止日期: {oath.deadline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          质押金额: {oath.stake}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon />}
                        component={RouterLink}
                        to={`/oath/${oath.id}`}
                        sx={{ ml: 'auto' }}
                      >
                        查看详情
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {oaths.filter(oath => oath.status === 'failed').map((oath) => (
                <Grid size={{xs:12, md:6, lg:4}} key={oath.id}>
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
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {oath.title}
                      </Typography>
                      
                      {getStatusChip(oath.status)}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        {oath.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          截止日期: {oath.deadline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          质押金额: {oath.stake}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon />}
                        component={RouterLink}
                        to={`/oath/${oath.id}`}
                        sx={{ ml: 'auto' }}
                      >
                        查看详情
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </Box>
      </Container>
    </Box>
  );
};

export default MyOaths;
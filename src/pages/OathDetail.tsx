import React from 'react';
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
  ListItemAvatar,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  Grid
} from '@mui/material';
import {
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarTodayIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const OathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // 模拟誓约数据
  const oath = {
    id: id || '1',
    title: '每天跑步5公里',
    description: '坚持每天早上跑步5公里，持续30天。这是一个健康挑战，旨在培养良好的运动习惯，提高身体素质。每天需要记录跑步轨迹和时间，作为完成证明。',
    status: 'active',
    progress: 60,
    startDate: '2023-11-01',
    deadline: '2023-12-31',
    stake: '0.1 ETH',
    creator: {
      name: '张三',
      avatar: 'https://mui.com/static/images/avatar/1.jpg'
    },
    witnesses: [
      {
        name: '李四',
        avatar: 'https://mui.com/static/images/avatar/2.jpg',
        status: 'confirmed'
      },
      {
        name: '王五',
        avatar: 'https://mui.com/static/images/avatar/3.jpg',
        status: 'pending'
      }
    ],
    checkpoints: [
      {
        date: '2023-11-10',
        title: '第一周检查点',
        description: '完成第一周的跑步任务',
        status: 'completed'
      },
      {
        date: '2023-11-20',
        title: '第二周检查点',
        description: '完成第二周的跑步任务',
        status: 'completed'
      },
      {
        date: '2023-11-30',
        title: '第三周检查点',
        description: '完成第三周的跑步任务',
        status: 'active'
      },
      {
        date: '2023-12-10',
        title: '第四周检查点',
        description: '完成第四周的跑步任务',
        status: 'pending'
      }
    ],
    updates: [
      {
        date: '2023-11-15',
        user: '张三',
        avatar: 'https://mui.com/static/images/avatar/1.jpg',
        content: '第二周任务已完成，每天都坚持跑步5公里，感觉很好！',
        attachments: ['https://source.unsplash.com/random/300x200?running']
      },
      {
        date: '2023-11-08',
        user: '张三',
        avatar: 'https://mui.com/static/images/avatar/1.jpg',
        content: '第一周任务完成，虽然有些困难但还是坚持下来了。',
        attachments: []
      }
    ]
  };

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
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button variant="contained" color="primary" sx={{ borderRadius: 2 }}>
                  更新进度
                </Button>
                <Button variant="outlined" color="primary" sx={{ borderRadius: 2 }}>
                  分享誓约
                </Button>
              </Box>
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
                    <ListItemAvatar>
                      <Avatar src={witness.avatar} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={witness.name} 
                      secondary={witness.status === 'confirmed' ? '已确认' : '待确认'}
                    />
                    {getStatusChip(witness.status)}
                  </ListItem>
                ))}
              </List>
              
              <Button 
                variant="outlined" 
                fullWidth
                sx={{ mt: 2, borderRadius: 2 }}
              >
                添加见证人
              </Button>
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
                0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s
              </Box>
              
              <Button 
                variant="outlined" 
                startIcon={<DescriptionIcon />}
                fullWidth
                sx={{ borderRadius: 2 }}
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
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Schedule,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { contractService } from '../services/contractService';
import { CompletionStatus } from '../services/contractService';
import { TOKEN_OPTIONS } from '../contracts/config';

interface NotificationItem {
  id: string;
  type: 'assignment';
  oathId: number;
  title: string;
  description: string;
  creatorAddress: string;
  creatorName: string;
  tokenSymbol: string;
  amount: string;
  deadline: number;
  status: CompletionStatus;
  createdAt: number;
  isRead: boolean;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [, setCurrentUserAddress] = useState<string>('');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // 初始化合约服务
      await contractService.initialize();
      const userAddress = await contractService.getCurrentUserAddress();
      setCurrentUserAddress(userAddress);
      
      // 获取用户作为守约人的所有誓约
      const committedOathIds = await contractService.getUserCommittedOaths(userAddress);
      
      // 获取每个誓约的详细信息
      const oathPromises = committedOathIds.map(id => contractService.getOath(id));
      const oaths = await Promise.all(oathPromises);
      
      // 转换为通知格式
      const notificationItems: NotificationItem[] = oaths.map(oath => {
        const tokenInfo = TOKEN_OPTIONS.find(token => 
          token.address.toLowerCase() === oath.tokenAddress.toLowerCase()
        );
        
        return {
          id: `assignment-${oath.id}`,
          type: 'assignment',
          oathId: oath.id,
          title: oath.title,
          description: oath.description,
          creatorAddress: oath.creater,
          creatorName: formatAddress(oath.creater),
          tokenSymbol: tokenInfo?.symbol || 'Unknown',
          amount: oath.amount,
          deadline: oath.deadline,
          status: oath.completionStatus,
          createdAt: oath.createdAt,
          isRead: oath.completionStatus !== CompletionStatus.PENDING, // 未完成的任务标记为未读
        };
      });
      
      // 按创建时间倒序排列
      notificationItems.sort((a, b) => b.createdAt - a.createdAt);
      
      setNotifications(notificationItems);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('加载通知失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态文本
  const getStatusText = (status: CompletionStatus) => {
    switch (status) {
      case CompletionStatus.PENDING: return "待完成";
      case CompletionStatus.COMPLETED: return "已完成";
      case CompletionStatus.FAILED: return "已失败";
      case CompletionStatus.EXPIRED: return "已过期";
      default: return "未知";
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: CompletionStatus) => {
    switch (status) {
      case CompletionStatus.PENDING: return "warning";
      case CompletionStatus.COMPLETED: return "success";
      case CompletionStatus.FAILED: return "error";
      case CompletionStatus.EXPIRED: return "default";
      default: return "default";
    }
  };

  // 获取未读通知数量
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 处理点击通知
  const handleNotificationClick = (notification: NotificationItem) => {
    navigate(`/oath/${notification.oathId}`);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              通知中心
            </Typography>
            {unreadCount > 0 && (
              <Badge 
                badgeContent={unreadCount} 
                color="error" 
                sx={{ ml: 2 }}
              >
                <Box />
              </Badge>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="md" sx={{ pt: 10, pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无通知
            </Typography>
            <Typography variant="body2" color="text.secondary">
              当有人指派您完成任务时，通知会显示在这里
            </Typography>
          </Paper>
        ) : (
          <>
            {/* 统计信息 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" gutterBottom>
                      {notifications.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      总通知数
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" gutterBottom>
                      {unreadCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      待完成任务
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" gutterBottom>
                      {notifications.filter(n => n.status === CompletionStatus.COMPLETED).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      已完成任务
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 通知列表 */}
            <Paper>
              <List>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        py: 2,
                        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}>
                              {notification.creatorName} 指派您完成任务
                            </Typography>
                            <Chip
                              label={getStatusText(notification.status)}
                              color={getStatusColor(notification.status) as any}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                              <strong>{notification.title}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {notification.description.length > 100 
                                ? `${notification.description.substring(0, 100)}...` 
                                : notification.description
                              }
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  创建人: {notification.creatorName}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  截止: {formatDate(notification.deadline)}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                奖励: {notification.amount} {notification.tokenSymbol}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(notification.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Notifications;
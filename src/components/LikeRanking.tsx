import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  EmojiEvents as TrophyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
// TODO: 实现公共合约服务
// import { publicContractService } from '../services/publicContractService';

interface RankingOath {
  id: string;
  title: string;
  description: string;
  creator: string;
  status: number;
  startTime: number;
  endTime: number;
  committerStakeAmount: string;
  supervisorStakeAmount: string;
  likesCount: number;
}

interface LikeRankingProps {
  limit?: number;
}

const LikeRanking: React.FC<LikeRankingProps> = ({ limit = 10 }) => {
  const navigate = useNavigate();
  const [rankingOaths, setRankingOaths] = React.useState<RankingOath[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    
    const loadRanking = async () => {
      try {
        setLoading(true);
        // TODO: 实现publicContractService.getLikeRanking方法
        // const data = await publicContractService.getLikeRanking(limit);
        const data: RankingOath[] = []; // 临时空数据
        if (mounted) {
          setRankingOaths(data);
        }
      } catch (error) {
        console.error('加载点赞排行榜失败:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRanking();

    return () => {
      mounted = false;
    };
  }, [limit]);

  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return '准备中';
      case 1: return '进行中';
      case 2: return '已完成';
      case 3: return '已失败';
      default: return '未知';
    }
  };

  const getStatusColor = (status: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 0: return 'info';
      case 1: return 'primary';
      case 2: return 'success';
      case 3: return 'error';
      default: return 'default';
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <TrophyIcon sx={{ color: '#FFD700' }} />; // 金色
    if (index === 1) return <TrophyIcon sx={{ color: '#C0C0C0' }} />; // 银色
    if (index === 2) return <TrophyIcon sx={{ color: '#CD7F32' }} />; // 铜色
    return (
      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
        {index + 1}
      </Avatar>
    );
  };

  const handleViewOath = (oathId: string) => {
    navigate(`/oath/${oathId}`);
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FavoriteIcon color="primary" />
            点赞排行榜
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FavoriteIcon color="primary" />
          点赞排行榜
        </Typography>
        
        {rankingOaths.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              暂无数据
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {rankingOaths.map((oath, index) => (
              <ListItem
                key={oath.id}
                sx={{
                  px: 0,
                  py: 1,
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    cursor: 'pointer',
                  },
                }}
                onClick={() => handleViewOath(oath.id)}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  {getRankIcon(index)}
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: index < 3 ? 'bold' : 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {oath.title || '无标题'}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        创建者: {oath.creator.slice(0, 6)}...{oath.creator.slice(-4)}
                      </Typography>
                      <Chip
                        label={getStatusText(oath.status)}
                        size="small"
                        color={getStatusColor(oath.status)}
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    </Stack>
                  }
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FavoriteIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    <Typography variant="body2" fontWeight="bold">
                      {oath.likesCount}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewOath(oath.id);
                    }}
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default LikeRanking;
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Skeleton,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Star,
  FilterList,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import AchievementBadge from './AchievementBadge';
import { AchievementType } from '../types/achievement';
import type { Achievement } from '../types/achievement';

// 过滤选项
type FilterType = 'all' | 'earned' | 'unearned' | 'common' | 'rare' | 'epic' | 'legendary';

// 统计数据接口
interface AchievementStats {
  total: number;
  earned: number;
  percentage: number;
  byRarity: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

// 样式化组件
const StatsCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
  border: `1px solid ${theme.palette.primary.main}30`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

const ProgressLabel = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
}));

interface AchievementGalleryProps {
  userAddress?: string;
  onMintAchievement?: (achievement: Achievement) => Promise<void>;
  loading?: boolean;
}

const AchievementGallery: React.FC<AchievementGalleryProps> = ({
  userAddress,
  onMintAchievement,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState<FilterType>('all');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 模拟成就数据
  const mockAchievements: Achievement[] = [
    {
      id: 1,
      achievementType: AchievementType.OATH_CREATOR,
      name: '初次誓言',
      description: '完成您的第一个誓言',
      isObtained: true,
      obtainedAt: Math.floor(new Date('2024-01-15').getTime() / 1000),
      tokenId: 1001,
      rarity: 'common',
    },
    {
      id: 2,
      achievementType: AchievementType.OATH_KEEPER,
      name: '誓言守护者',
      description: '连续完成10个誓言',
      isObtained: false,
      obtainedAt: undefined,
      tokenId: undefined,
      rarity: 'rare',
    },
    {
      id: 3,
      achievementType: AchievementType.COMMUNITY_STAR,
      name: '社区建设者',
      description: '邀请5位朋友加入平台',
      isObtained: true,
      obtainedAt: Math.floor(new Date('2024-02-01').getTime() / 1000),
      tokenId: 1002,
      rarity: 'epic',
    },
  ];

  useEffect(() => {
    // 模拟加载成就数据
    const loadAchievements = async () => {
      if (userAddress) {
        // 这里应该调用实际的API获取用户成就
        setAchievements(mockAchievements);
      } else {
        setAchievements(mockAchievements);
      }
    };

    loadAchievements();
  }, [userAddress]);

  useEffect(() => {
    // 计算统计数据
    const calculateStats = () => {
      const total = achievements.length;
      const earned = achievements.filter(a => a.isObtained).length;
      const percentage = total > 0 ? (earned / total) * 100 : 0;

      const byRarity = achievements.reduce(
        (acc, achievement) => {
          if (achievement.isObtained && achievement.rarity) {
            acc[achievement.rarity]++;
          }
          return acc;
        },
        { common: 0, rare: 0, epic: 0, legendary: 0 }
      );

      setStats({ total, earned, percentage, byRarity });
    };

    if (achievements.length > 0) {
      calculateStats();
    }
  }, [achievements]);

  const getFilteredAchievements = () => {
    switch (activeTab) {
      case 'earned':
        return achievements.filter(a => a.isObtained);
      case 'unearned':
        return achievements.filter(a => !a.isObtained);
      case 'common':
      case 'rare':
      case 'epic':
      case 'legendary':
        return achievements.filter(a => a.rarity === activeTab);
      default:
        return achievements;
    }
  };

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setDetailDialogOpen(true);
  };

  const handleMint = async (achievement: Achievement) => {
    if (onMintAchievement) {
      try {
        await onMintAchievement(achievement);
        // 更新本地状态
        setAchievements(prev =>
          prev.map(a =>
            a.id === achievement.id
              ? { ...a, isObtained: true, obtainedAt: Math.floor(Date.now() / 1000), tokenId: Date.now() }
              : a
          )
        );
      } catch (error) {
        console.error('铸造失败:', error);
      }
    }
  };

  const filteredAchievements = getFilteredAchievements();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          <EmojiEvents sx={{ fontSize: 'inherit', mr: 2, color: 'primary.main' }} />
          成就殿堂
        </Typography>
        <Typography variant="h6" color="text.secondary">
          展示您在ChainOath平台上获得的所有成就NFT
        </Typography>
      </Box>

      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatsCard>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                  {stats.earned}/{stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  已获得成就
                </Typography>
                <ProgressContainer>
                  <LinearProgress
                    variant="determinate"
                    value={stats.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <ProgressLabel>{Math.round(stats.percentage)}%</ProgressLabel>
                </ProgressContainer>
              </CardContent>
            </StatsCard>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <StatsCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Star sx={{ mr: 1, color: 'secondary.main' }} />
                  稀有度分布
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(stats.byRarity).map(([rarity, count]) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={rarity}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                          {count}
                        </Typography>
                        <Chip
                          label={rarity.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor:
                              rarity === 'common'
                                ? '#9E9E9E'
                                : rarity === 'rare'
                                ? '#2196F3'
                                : rarity === 'epic'
                                ? '#9C27B0'
                                : '#FF9800',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </StatsCard>
          </Grid>
        </Grid>
      )}

      {/* 过滤标签 */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minWidth: isMobile ? 'auto' : 120,
              fontWeight: 'bold',
            },
          }}
        >
          <Tab label="全部" value="all" icon={<FilterList />} iconPosition="start" />
          <Tab label="已获得" value="earned" />
          <Tab label="未获得" value="unearned" />
          <Tab label="普通" value="common" />
          <Tab label="稀有" value="rare" />
          <Tab label="史诗" value="epic" />
          <Tab label="传说" value="legendary" />
        </Tabs>
      </Box>

      {/* 成就网格 */}
      {filteredAchievements.length > 0 ? (
        <Fade in timeout={500}>
          <Grid container spacing={3}>
            {filteredAchievements.map((achievement) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={achievement.id}>
                <Box onClick={() => handleAchievementClick(achievement)}>
                  <AchievementBadge
                    achievement={achievement}
                    onMint={handleMint}
                    showMintButton={true}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Fade>
      ) : (
        <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            暂无符合条件的成就
          </Typography>
          <Typography variant="body2">
            尝试切换不同的过滤条件查看更多成就
          </Typography>
        </Alert>
      )}

      {/* 成就详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          },
        }}
      >
        {selectedAchievement && (
          <>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                成就详情
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center' }}>
              <AchievementBadge
                achievement={selectedAchievement}
                onMint={handleMint}
                showMintButton={true}
                size="large"
              />
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                <Typography variant="body1" paragraph>
                  {selectedAchievement.description}
                </Typography>
                {selectedAchievement.isObtained && selectedAchievement.obtainedAt && (
                  <Typography variant="body2" color="text.secondary">
                    获得时间: {new Date(selectedAchievement.obtainedAt * 1000).toLocaleDateString('zh-CN')}
                  </Typography>
                )}
                {selectedAchievement.tokenId && (
                  <Typography variant="body2" color="text.secondary">
                    Token ID: #{selectedAchievement.tokenId}
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button onClick={() => setDetailDialogOpen(false)} variant="outlined">
                关闭
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AchievementGallery;
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  Button,
  Alert,
  Skeleton,
  Fade,
  Zoom
} from '@mui/material';
import {
  EmojiEvents,
  Star,
  TrendingUp,
  Collections,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import AchievementBadge from '../components/AchievementBadge';
import type { Achievement } from '../types/achievement';
import { AchievementType } from '../types/achievement';
// import { contractService } from '../services/contractService';

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
      id={`achievement-tabpanel-${index}`}
      aria-labelledby={`achievement-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserAchievements: React.FC = () => {
  // const theme = useTheme();
  const { address, isConnected } = useAccount();
  const [tabValue, setTabValue] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingAchievement, setMintingAchievement] = useState<AchievementType | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    obtained: 0,
    progress: 0
  });

  // 成就要求配置
  const achievementRequirements = useMemo(() => ({
    [AchievementType.OATH_CREATOR]: 1,
    [AchievementType.OATH_KEEPER]: 5,
    [AchievementType.SUPERVISOR]: 10,
    [AchievementType.COMMUNITY_STAR]: 100,
    [AchievementType.CHECKPOINT_MASTER]: 50,
    [AchievementType.ENGAGEMENT_KING]: 200
  }), []);

  // 初始化成就数据
  const initializeAchievements = useCallback((): Achievement[] => {
    return Object.values(AchievementType)
      .filter(type => typeof type === 'number')
      .map((type) => ({
        id: type as number,
        achievementType: type as AchievementType,
        name: getAchievementName(type as AchievementType),
        description: getAchievementDescription(type as AchievementType),
        requirement: achievementRequirements[type as AchievementType],
        isObtained: false
      }));
  }, [achievementRequirements]);

  const getAchievementName = (type: AchievementType): string => {
    const names = {
      [AchievementType.OATH_CREATOR]: '誓约创造者',
      [AchievementType.OATH_KEEPER]: '誓约守护者',
      [AchievementType.SUPERVISOR]: '监督专家',
      [AchievementType.COMMUNITY_STAR]: '社区之星',
      [AchievementType.CHECKPOINT_MASTER]: '检查点大师',
      [AchievementType.ENGAGEMENT_KING]: '积极参与社区互动，成为活跃的贡献者'
    };
    return names[type];
  };

  const getAchievementDescription = (type: AchievementType): string => {
    const descriptions = {
      [AchievementType.OATH_CREATOR]: '创建第一个誓约，开启你的承诺之旅',
      [AchievementType.OATH_KEEPER]: '完成多个誓约，展现坚定的意志力',
      [AchievementType.SUPERVISOR]: '成功监督多个誓约，维护社区秩序',
      [AchievementType.COMMUNITY_STAR]: '获得社区成员的广泛认可和点赞',
      [AchievementType.CHECKPOINT_MASTER]: '完成大量检查点，展现卓越的执行力',
      [AchievementType.ENGAGEMENT_KING]: '积极参与社区互动，成为活跃的贡献者'
    };
    return descriptions[type];
  };

  // 加载用户成就数据
  const loadUserAchievements = useCallback(async () => {
    if (!address || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 初始化成就列表
      const initialAchievements = initializeAchievements();
      
      // TODO: 从合约获取用户已获得的成就
      // const userTokenIds = await publicContractService.getUserAchievements(address);
      // const achievementDetails = await Promise.all(
      //   userTokenIds.map(tokenId => publicContractService.getAchievement(tokenId))
      // );

      // 模拟数据 - 实际应用中应从合约获取
      const mockObtainedAchievements = [0]; // AchievementType.OATH_CREATOR 对应数值 0
      
      const updatedAchievements = initialAchievements.map(achievement => {
        const isObtained = mockObtainedAchievements.includes(achievement.achievementType);
        return {
          ...achievement,
          isObtained,
          obtainedAt: isObtained ? Math.floor(Date.now() / 1000) - 86400 : undefined,
          tokenId: isObtained ? Math.floor(Math.random() * 1000) + 1 : undefined
        };
      });

      setAchievements(updatedAchievements);
      
      // 更新统计数据
      const obtainedCount = updatedAchievements.filter(a => a.isObtained).length;
      const total = updatedAchievements.length;
      setStats({
        total,
        obtained: obtainedCount,
        progress: Math.round((obtainedCount / total) * 100)
      });

    } catch (err) {
      console.error('加载成就数据失败:', err);
      setError('加载成就数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, initializeAchievements]);

  // 铸造成就NFT
  const handleMintAchievement = async (achievement: Achievement) => {
    if (!address || !isConnected) {
      setError('请先连接钱包');
      return;
    }

    try {
      setMintingAchievement(achievement.achievementType);
      setError(null);

      // TODO: 调用合约铸造NFT
      // await publicContractService.mintAchievement(achievementType, oathId, tokenURI);
      
      // 模拟铸造过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 更新成就状态
      setAchievements(prev => prev.map(ach => 
        ach.achievementType === achievement.achievementType
          ? {
              ...ach,
              isObtained: true,
              obtainedAt: Math.floor(Date.now() / 1000),
              tokenId: Math.floor(Math.random() * 1000) + 1
            }
          : ach
      ));

      // 更新统计数据
      setStats(prev => ({
        ...prev,
        obtained: prev.obtained + 1,
        progress: Math.round(((prev.obtained + 1) / prev.total) * 100)
      }));

    } catch (error) {
      console.error('铸造成就失败:', error);
      setError('铸造成就失败，请重试');
    } finally {
      setMintingAchievement(null);
    }
  };

  useEffect(() => {
    loadUserAchievements();
  }, [address, isConnected, loadUserAchievements]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const obtainedAchievements = achievements.filter(a => a.isObtained);
  const availableAchievements = achievements.filter(a => !a.isObtained);

  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <AccountBalanceWallet sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            请连接钱包
          </Typography>
          <Typography variant="body1" color="text.secondary">
            连接钱包后即可查看和管理您的成就NFT
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            我的成就
          </Typography>
          <Typography variant="h6" color="text.secondary">
            收集和展示您在ChainOath平台上的成就NFT
          </Typography>
        </Box>
      </Fade>

      {/* 统计卡片 */}
      <Zoom in timeout={1000}>
        <Paper
          sx={{
            p: 3,
            mb: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.obtained}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  已获得成就
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Collections sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  总成就数量
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.progress}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  完成进度
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Star sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats.obtained > 0 ? '活跃' : '新手'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  用户等级
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Zoom>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 标签页 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents />
                  已获得
                  <Chip
                    label={obtainedAchievements.length}
                    size="small"
                    color="primary"
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Star />
                  可获得
                  <Chip
                    label={availableAchievements.length}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Collections />
                  全部成就
                  <Chip
                    label={achievements.length}
                    size="small"
                    color="secondary"
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* 已获得成就 */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                  <Skeleton
                    variant="rectangular"
                    width={160}
                    height={200}
                    sx={{ borderRadius: 3 }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : obtainedAchievements.length > 0 ? (
            <Grid container spacing={3}>
              {obtainedAchievements.map((achievement, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={achievement.id}>
                  <Zoom in timeout={600 + index * 100}>
                    <div>
                      <AchievementBadge
                        achievement={achievement}
                        size="medium"
                      />
                    </div>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EmojiEvents sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                暂无已获得的成就
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                开始参与平台活动，获得您的第一个成就NFT吧！
              </Typography>
              <Button
                variant="contained"
                onClick={() => setTabValue(1)}
                sx={{ borderRadius: 2 }}
              >
                查看可获得成就
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* 可获得成就 */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                  <Skeleton
                    variant="rectangular"
                    width={160}
                    height={200}
                    sx={{ borderRadius: 3 }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {availableAchievements.map((achievement, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={achievement.id}>
                  <Zoom in timeout={600 + index * 100}>
                    <div>
                      <AchievementBadge
                        achievement={achievement}
                        onMint={handleMintAchievement}
                        isMinting={mintingAchievement === achievement.achievementType}
                        size="medium"
                      />
                    </div>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* 全部成就 */}
        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                  <Skeleton
                    variant="rectangular"
                    width={160}
                    height={200}
                    sx={{ borderRadius: 3 }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {achievements.map((achievement, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={achievement.id}>
                  <Zoom in timeout={600 + index * 100}>
                    <div>
                      <AchievementBadge
                        achievement={achievement}
                        onMint={!achievement.isObtained ? handleMintAchievement : undefined}
                        isMinting={mintingAchievement === achievement.achievementType}
                        size="medium"
                      />
                    </div>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default UserAchievements;
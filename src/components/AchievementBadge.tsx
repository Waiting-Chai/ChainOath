import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
} from '@mui/material';
import {
  EmojiEvents,
  Shield,
  Star,
  Favorite,
  CheckCircle,
  Group,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { AchievementType } from '../types/achievement';
import type { Achievement } from '../types/achievement';

// 成就配置
const ACHIEVEMENT_CONFIG = {
  [AchievementType.OATH_CREATOR]: {
    name: '誓约创造者',
    description: '创建第一个誓约，开启守约之路',
    icon: EmojiEvents,
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    },
    rarity: 'common' as const,
  },
  [AchievementType.OATH_KEEPER]: {
    name: '守约之星',
    description: '成功完成多个誓约，展现坚定意志',
    icon: Shield,
    colors: {
      primary: '#4CAF50',
      secondary: '#2E7D32',
      gradient: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
    },
    rarity: 'rare' as const,
  },
  [AchievementType.SUPERVISOR]: {
    name: '监督大师',
    description: '作为监督者，维护社区诚信',
    icon: CheckCircle,
    colors: {
      primary: '#2196F3',
      secondary: '#1565C0',
      gradient: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    },
    rarity: 'epic' as const,
  },
  [AchievementType.CHECKPOINT_MASTER]: {
    name: '检查点大师',
    description: '完美完成所有检查点任务',
    icon: Star,
    colors: {
      primary: '#9C27B0',
      secondary: '#6A1B9A',
      gradient: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)',
    },
    rarity: 'epic' as const,
  },
  [AchievementType.COMMUNITY_STAR]: {
    name: '社区之星',
    description: '获得社区成员的广泛认可和喜爱',
    icon: Favorite,
    colors: {
      primary: '#E91E63',
      secondary: '#C2185B',
      gradient: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
    },
    rarity: 'rare' as const,
  },
  [AchievementType.ENGAGEMENT_KING]: {
    name: '互动之王',
    description: '积极参与社区互动，贡献卓越',
    icon: Group,
    colors: {
      primary: '#FF5722',
      secondary: '#D84315',
      gradient: 'linear-gradient(135deg, #FF5722 0%, #D84315 100%)',
    },
    rarity: 'legendary' as const,
  },
};

// 稀有度颜色配置
const RARITY_COLORS = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

// 样式化组件
const StyledCard = styled(Card)<{ earned: boolean; rarity: string }>(({ theme, earned, rarity }) => ({
  position: 'relative',
  overflow: 'visible',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  border: `2px solid ${earned ? RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] : 'transparent'}`,
  opacity: earned ? 1 : 0.6,
  transform: 'scale(1)',
  '&:hover': {
    transform: earned ? 'scale(1.05) translateY(-4px)' : 'scale(1.02)',
    boxShadow: earned
      ? `0 12px 24px rgba(${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]}, 0.3)`
      : theme.shadows[4],
  },
  '&::before': earned
    ? {
        content: '""',
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        background: `linear-gradient(45deg, ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]}, transparent, ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]})`,
        borderRadius: theme.shape.borderRadius,
        zIndex: -1,
        opacity: 0.3,
      }
    : {},
}));

const IconContainer = styled(Box)<{ earned: boolean; gradient: string }>(({ earned, gradient }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: earned ? gradient : '#f5f5f5',
  margin: '0 auto 16px',
  position: 'relative',
  '&::after': earned
    ? {
        content: '""',
        position: 'absolute',
        inset: -4,
        borderRadius: '50%',
        background: gradient,
        opacity: 0.3,
        filter: 'blur(8px)',
        zIndex: -1,
      }
    : {},
}));

const GlowEffect = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '120%',
  height: '120%',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      opacity: 0.4,
      transform: 'translate(-50%, -50%) scale(0.8)',
    },
    '50%': {
      opacity: 0.8,
      transform: 'translate(-50%, -50%) scale(1.1)',
    },
    '100%': {
      opacity: 0.4,
      transform: 'translate(-50%, -50%) scale(0.8)',
    },
  },
});

interface AchievementBadgeProps {
  achievement: Achievement;
  onMint?: (achievement: Achievement) => void;
  isMinting?: boolean;
  showMintButton?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  onMint,
  isMinting = false,
  showMintButton = true,
  size = 'medium',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isHovered, setIsHovered] = useState(false);
  // isMinting now comes from props

  const config = ACHIEVEMENT_CONFIG[achievement.achievementType];
  const IconComponent = config.icon;

  const handleMint = async () => {
    if (!onMint || achievement.isObtained || isMinting) return;

    try {
      await onMint(achievement);
    } catch (error) {
      console.error('铸造NFT失败:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 60, cardMinHeight: 200 };
      case 'large':
        return { iconSize: 100, cardMinHeight: 300 };
      default:
        return { iconSize: 80, cardMinHeight: 250 };
    }
  };

  const { iconSize, cardMinHeight } = getSizeConfig();

  return (
    <Fade in timeout={500}>
      <StyledCard
        earned={achievement.isObtained}
        rarity={achievement.rarity || config.rarity}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          minHeight: cardMinHeight,
          width: '100%',
          maxWidth: isMobile ? '100%' : 280,
        }}
      >
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          {/* 稀有度标签 */}
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <Chip
              label={config.rarity.toUpperCase()}
              size="small"
              sx={
                {
                  backgroundColor: RARITY_COLORS[config.rarity],
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                }
              }
            />
          </Box>

          {/* 图标容器 */}
          <IconContainer
            earned={achievement.isObtained}
            gradient={config.colors.gradient}
            sx={{ width: iconSize, height: iconSize }}
          >
            {achievement.isObtained && <GlowEffect />}
            <IconComponent
              sx={{
                fontSize: iconSize * 0.6,
                color: achievement.isObtained ? 'white' : '#bdbdbd',
                zIndex: 1,
              }}
            />
          </IconContainer>

          {/* 成就名称 */}
          <Typography
            variant={size === 'large' ? 'h5' : 'h6'}
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: achievement.isObtained ? config.colors.primary : 'text.secondary',
              mb: 1,
            }}
          >
            {achievement.name || config.name}
          </Typography>

          {/* 成就描述 */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              minHeight: size === 'small' ? 32 : 40,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {achievement.description || config.description}
          </Typography>

          {/* 获得时间 */}
          {achievement.isObtained && achievement.obtainedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              获得时间: {formatDate(achievement.obtainedAt)}
            </Typography>
          )}

          {/* Token ID */}
          {achievement.isObtained && achievement.tokenId && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Token ID: #{achievement.tokenId}
            </Typography>
          )}

          {/* 铸造按钮 */}
          {showMintButton && (
            <Zoom in={isHovered || isMobile} timeout={200}>
              <Box>
                {achievement.isObtained ? (
                  <Tooltip title="已获得此成就">
                    <Button
                      variant="contained"
                      disabled
                      sx={{
                        background: config.colors.gradient,
                        color: 'white',
                        '&.Mui-disabled': {
                          background: config.colors.gradient,
                          color: 'white',
                          opacity: 0.8,
                        },
                      }}
                    >
                      已获得
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip title="铸造成就NFT">
                    <Button
                      variant="outlined"
                      onClick={handleMint}
                      disabled={isMinting}
                      sx={{
                        borderColor: config.colors.primary,
                        color: config.colors.primary,
                        '&:hover': {
                          borderColor: config.colors.secondary,
                          backgroundColor: `${config.colors.primary}10`,
                        },
                      }}
                    >
                      {isMinting ? '铸造中...' : '铸造NFT'}
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Zoom>
          )}
        </CardContent>
      </StyledCard>
    </Fade>
  );
};

export default AchievementBadge;
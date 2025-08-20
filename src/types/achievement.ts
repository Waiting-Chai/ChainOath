// 成就类型枚举
export const AchievementType = {
  OATH_CREATOR: 0,
  OATH_KEEPER: 1,
  SUPERVISOR: 2,
  CHECKPOINT_MASTER: 3,
  COMMUNITY_STAR: 4,
  ENGAGEMENT_KING: 5,
} as const;

export type AchievementType = typeof AchievementType[keyof typeof AchievementType];

// 成就数据接口
export interface Achievement {
  id: number;
  achievementType: AchievementType;
  name: string;
  description: string;
  isObtained: boolean;
  obtainedAt?: number;
  tokenId?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  requirement?: number;
}
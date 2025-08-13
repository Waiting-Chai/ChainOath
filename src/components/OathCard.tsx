import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
} from "@mui/icons-material";

export interface Oath {
  id: string;
  title: string;
  description: string;
  creator: string;
  status: number;
  startTime: number;
  endTime: number;
  committerStakeAmount: string;
  supervisorStakeAmount: string;
}

// 格式化日期为 yyyy-mm-dd HH:MM:SS 格式
const formatDate = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return "-";
  
  try {
    const date = new Date(timestamp * 1000); // 转换为毫秒
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) return "-";
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("日期格式化失败:", error);
    return "-";
  }
};

const getStatusChipColor = (status: number) => {
  switch (status) {
    case 1:
      return { label: "进行中", color: "primary" as const };
    case 2:
      return { label: "已完成", color: "success" as const };
    case 3:
      return { label: "失败", color: "error" as const };
    case 4:
      return { label: "已取消", color: "default" as const };
    default:
      return { label: "已创建", color: "default" as const };
  }
};

const maskAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

interface OathCardProps {
  oath: Oath;
}

const OathCard: React.FC<OathCardProps> = ({ oath }) => {
  const navigator = useNavigate();
  const statusConf = getStatusChipColor(oath.status);

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          transform: "translateY(-4px)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* 标题和状态 */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontWeight: 600, 
              flex: 1, 
              mr: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {oath.title || `誓约 #${oath.id}`}
          </Typography>
          <Chip 
            size="small" 
            label={statusConf.label} 
            color={statusConf.color} 
            variant="filled"
            icon={<FlagIcon />}
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* 详细信息 */}
        <Stack spacing={1.5}>
          {/* 创建人 */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              创建人：
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {maskAddress(oath.creator)}
            </Typography>
          </Stack>

          {/* 开始时间 */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              开始时间：
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(oath.startTime)}
            </Typography>
          </Stack>

          {/* 结束时间 */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              结束时间：
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(oath.endTime)}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          startIcon={<VisibilityIcon />}
          onClick={() => navigator(`/oath/${oath.id}`)}
          sx={{ 
            borderRadius: 2, 
            textTransform: "none",
            width: "100%"
          }}
        >
          查看详情
        </Button>
      </CardActions>
    </Card>
  );
};

export default OathCard;
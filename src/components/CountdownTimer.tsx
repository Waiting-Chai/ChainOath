import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';

interface CountdownTimerProps {
  targetTime: number; // 目标时间戳（秒）
  title: string; // 倒计时标题
  onExpired?: () => void; // 倒计时结束回调
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  title,
  onExpired,
  color = 'primary',
  size = 'medium'
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  const calculateTimeRemaining = (targetTimestamp: number): TimeRemaining => {
    const now = Math.floor(Date.now() / 1000);
    const difference = targetTimestamp - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0
      };
    }

    const days = Math.floor(difference / (24 * 60 * 60));
    const hours = Math.floor((difference % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((difference % (60 * 60)) / 60);
    const seconds = difference % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      total: difference
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining(targetTime);
      setTimeRemaining(remaining);

      if (remaining.total <= 0 && onExpired) {
        onExpired();
      }
    };

    // 立即更新一次
    updateTimer();

    // 每秒更新
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onExpired]);

  const formatTimeUnit = (value: number, unit: string) => {
    if (size === 'small') {
      return `${value}${unit}`;
    }
    return (
      <Box sx={{ textAlign: 'center', minWidth: '40px' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
          {value.toString().padStart(2, '0')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {unit}
        </Typography>
      </Box>
    );
  };

  if (timeRemaining.total <= 0) {
    return (
      <Chip
        icon={<AccessTimeIcon />}
        label="已过期"
        color="error"
        size={size}
        variant="outlined"
      />
    );
  }

  if (size === 'small') {
    const timeString = timeRemaining.days > 0 
      ? `${timeRemaining.days}天${timeRemaining.hours}时${timeRemaining.minutes}分`
      : timeRemaining.hours > 0
      ? `${timeRemaining.hours}时${timeRemaining.minutes}分${timeRemaining.seconds}秒`
      : `${timeRemaining.minutes}分${timeRemaining.seconds}秒`;
    
    return (
      <Chip
        icon={<AccessTimeIcon />}
        label={`${title}: ${timeString}`}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {timeRemaining.days > 0 && (
          <>
            {formatTimeUnit(timeRemaining.days, '天')}
            <Typography variant="h6" color="text.secondary">:</Typography>
          </>
        )}
        {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
          <>
            {formatTimeUnit(timeRemaining.hours, '时')}
            <Typography variant="h6" color="text.secondary">:</Typography>
          </>
        )}
        {formatTimeUnit(timeRemaining.minutes, '分')}
        <Typography variant="h6" color="text.secondary">:</Typography>
        {formatTimeUnit(timeRemaining.seconds, '秒')}
      </Box>
    </Box>
  );
};

export default CountdownTimer;
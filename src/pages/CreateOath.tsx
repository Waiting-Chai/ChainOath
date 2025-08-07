import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Toolbar,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Stack,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';

interface OathFormData {
  title: string;
  description: string;
  committer: string;
  supervisors: string[];
  totalReward: number;
  committerStake: number;
  supervisorStake: number;
  supervisorRewardRatio: number;
  checkInterval: number;
  checkIntervalUnit: string;
  checkWindow: number;
  checkWindowUnit: string;
  checkThresholdPercent: number;
  maxSupervisorMisses: number;
  maxCommitterFailures: number;
  startTime: string;
  endTime: string;
  tokenAddress: string;
}

const CreateOath: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = ['基本信息', '参与者设置', '监督配置', '确认提交'];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // 创建Oath表单数据
  // 获取当前时间和30天后的时间
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };
  
  const getDateTimeAfter30Days = () => {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = React.useState<OathFormData>({
    title: '',
    description: '',
    committer: '',
    supervisors: [''],
    totalReward: 0,
    committerStake: 0,
    supervisorStake: 0,
    supervisorRewardRatio: 10,
    checkInterval: 1,
    checkIntervalUnit: 'days',
    checkWindow: 1,
    checkWindowUnit: 'hours',
    checkThresholdPercent: 60,
    maxSupervisorMisses: 3,
    maxCommitterFailures: 3,
    startTime: getCurrentDateTime(),
    endTime: getDateTimeAfter30Days(),
    tokenAddress: ''
  });
  
  // 处理表单字段变化
  const handleInputChange = (field: keyof OathFormData, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 时间单位转换为秒
  const convertToSeconds = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return value;
      case 'minutes': return value * 60;
      case 'hours': return value * 3600;
      case 'days': return value * 86400;
      case 'weeks': return value * 604800;
      default: return value;
    }
  };
  
  // 帮助提示组件
  const HelpTooltip = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {children}
      <Tooltip title={title} placement="top">
        <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
      </Tooltip>
    </Box>
  );
  
  // 处理监督者变化
  const handleSupervisorChange = (index: number, value: string) => {
    const newSupervisors = [...formData.supervisors];
    newSupervisors[index] = value;
    handleInputChange('supervisors', newSupervisors);
  };
  
  // 添加新监督者
  const addSupervisor = () => {
    if (formData.supervisors.length < 10) { // 限制最多10个监督者
      handleInputChange('supervisors', [...formData.supervisors, '']);
    } else {
      alert('最多只能添加10个监督者');
    }
  };
  
  // 删除监督者
  const removeSupervisor = (index: number) => {
    if (formData.supervisors.length > 1) { // 至少保留一个监督者
      const newSupervisors = formData.supervisors.filter((_, i) => i !== index);
      handleInputChange('supervisors', newSupervisors);
    } else {
      alert('至少需要一个监督者');
    }
  };
  
  // 提交表单
  const handleSubmit = () => {
    // 数据验证
    if (!formData.title || !formData.description) {
      alert('请填写誓约标题和描述');
      return;
    }
    
    if (!formData.committer || formData.committer.length !== 42 || !formData.committer.startsWith('0x')) {
      alert('请输入有效的守约人地址');
      return;
    }
    
    if (formData.supervisors.some(addr => !addr || addr.length !== 42 || !addr.startsWith('0x'))) {
      alert('请输入有效的监督者地址');
      return;
    }
    
    if (!formData.tokenAddress || formData.tokenAddress.length !== 42 || !formData.tokenAddress.startsWith('0x')) {
      alert('请输入有效的代币合约地址');
      return;
    }
    
    if (!formData.startTime || !formData.endTime) {
      alert('请设置开始时间和结束时间');
      return;
    }
    
    const startTimestamp = new Date(formData.startTime).getTime() / 1000;
    const endTimestamp = new Date(formData.endTime).getTime() / 1000;
    
    if (startTimestamp <= Date.now() / 1000) {
      alert('开始时间必须在未来');
      return;
    }
    
    if (endTimestamp <= startTimestamp) {
      alert('结束时间必须晚于开始时间');
      return;
    }
    
    // 构造合约调用数据
     const oathData = {
       title: formData.title,
       description: formData.description,
       committer: formData.committer,
       supervisors: formData.supervisors.filter(addr => addr.trim() !== ''),
       totalReward: formData.totalReward,
       committerStake: formData.committerStake,
       supervisorStake: formData.supervisorStake,
       supervisorRewardRatio: formData.supervisorRewardRatio,
       checkInterval: convertToSeconds(formData.checkInterval, formData.checkIntervalUnit),
       checkWindow: convertToSeconds(formData.checkWindow, formData.checkWindowUnit),
       checkThresholdPercent: formData.checkThresholdPercent,
       maxSupervisorMisses: formData.maxSupervisorMisses,
       maxCommitterFailures: formData.maxCommitterFailures,
       startTime: Math.floor(startTimestamp),
       endTime: Math.floor(endTimestamp),
       checkRoundsCount: 0, // 将由合约计算
       createTime: 0, // 将由合约设置
       creator: '0x0000000000000000000000000000000000000000', // 将由合约设置
       token: formData.tokenAddress,
       status: 0 // Pending
     };
    
    console.log('提交的誓约数据:', oathData);
    console.log('代币地址:', formData.tokenAddress);
    
    // TODO: 这里需要调用智能合约的 createOath 函数
    // 示例调用：
    // await contract.createOath(oathData, formData.tokenAddress);
    
    alert('誓约数据已准备完成！请连接钱包并确认交易。');
    // 提交后可以跳转到首页或誓约详情页
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
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button 
            component={RouterLink}
            to="/"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            返回首页
          </Button>
        </Toolbar>
      </AppBar>
      
      <Toolbar /> {/* Spacer for fixed AppBar */}
      
      {/* Main Content */}
      <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
            创建新誓约
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                基本信息
              </Typography>
              
              <HelpTooltip title="为您的誓约起一个简洁明了的标题，让其他人能够快速了解誓约内容">
                <TextField
                  fullWidth
                  label="誓约标题"
                  placeholder="例如：每天跑步5公里"
                  variant="outlined"
                  margin="normal"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </HelpTooltip>
              
              <HelpTooltip title="详细描述誓约的具体内容、目标和要求，这将帮助监督者更好地评估您的履约情况">
                <TextField
                  fullWidth
                  label="誓约描述"
                  placeholder="详细描述您的誓约内容和目标"
                  variant="outlined"
                  margin="normal"
                  multiline
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </HelpTooltip>
              
              <HelpTooltip title="誓约正式开始的时间，从这个时间开始计算履约期限和监督周期">
                <TextField
                  fullWidth
                  label="开始时间"
                  type="datetime-local"
                  variant="outlined"
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                />
              </HelpTooltip>
              
              <HelpTooltip title="誓约结束的时间，到达这个时间后将进行最终的履约评估和奖励分配">
                <TextField
                  fullWidth
                  label="结束时间"
                  type="datetime-local"
                  variant="outlined"
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                />
              </HelpTooltip>
              
              <HelpTooltip title="指定用于奖励分配和质押的ERC20代币合约地址，确保地址正确有效">
                <TextField
                  fullWidth
                  label="代币合约地址"
                  placeholder="ERC20代币合约地址"
                  variant="outlined"
                  margin="normal"
                  required
                  value={formData.tokenAddress}
                  onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
                />
              </HelpTooltip>
            </Box>
          )}
          
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                参与者设置
              </Typography>
              
              <HelpTooltip title="需要履行誓约的人的钱包地址，这个人将负责完成誓约承诺的任务">
                <TextField
                  fullWidth
                  label="守约人地址"
                  placeholder="守约人的钱包地址"
                  variant="outlined"
                  margin="normal"
                  required
                  value={formData.committer}
                  onChange={(e) => handleInputChange('committer', e.target.value)}
                />
              </HelpTooltip>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    监督者列表
                  </Typography>
                  <Button 
                    startIcon={<AddCircleOutlineIcon />} 
                    sx={{ ml: 2 }}
                    size="small"
                    onClick={addSupervisor}
                    disabled={formData.supervisors.length >= 10}
                  >
                    添加监督者
                  </Button>
                </Box>
                
                {formData.supervisors.map((supervisor, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                    <HelpTooltip title="负责监督和评估守约人履约情况的监督者钱包地址">
                      <TextField
                        fullWidth
                        label={`监督者 ${index + 1} 地址`}
                        placeholder="监督者的钱包地址"
                        variant="outlined"
                        margin="normal"
                        value={supervisor}
                        onChange={(e) => handleSupervisorChange(index, e.target.value)}
                        required
                      />
                    </HelpTooltip>
                    <IconButton 
                      size="small" 
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                      onClick={() => removeSupervisor(index)}
                      disabled={formData.supervisors.length <= 1}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
              
              <HelpTooltip title="创建者质押的总奖励金额，将在誓约完成后分配给守约人和监督者">
                <TextField
                  fullWidth
                  label="总奖励金额"
                  placeholder="创建者质押的总奖励金额"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Token</InputAdornment>,
                  }}
                  value={formData.totalReward === 0 ? '' : formData.totalReward.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      handleInputChange('totalReward', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                />
              </HelpTooltip>
              
              <HelpTooltip title="守约人需要质押的保证金，如果违约将被扣除">
                <TextField
                  fullWidth
                  label="守约人质押金额"
                  placeholder="守约人需要质押的金额"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Token</InputAdornment>,
                  }}
                  value={formData.committerStake === 0 ? '' : formData.committerStake.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      handleInputChange('committerStake', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                />
              </HelpTooltip>
              
              <HelpTooltip title="每位监督者需要质押的保证金，如果失职将被扣除">
                <TextField
                  fullWidth
                  label="监督者质押金额"
                  placeholder="每位监督者需要质押的金额"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Token</InputAdornment>,
                  }}
                  value={formData.supervisorStake === 0 ? '' : formData.supervisorStake.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      handleInputChange('supervisorStake', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                />
              </HelpTooltip>
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                监督配置
              </Typography>
              
              <HelpTooltip title="监督者从总奖励中获得的比例，剩余部分将分配给守约人">
                <TextField
                  fullWidth
                  label="监督者奖励比例 (%)"
                  placeholder="监督者获得的奖励比例"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  inputProps={{ min: 0, max: 100 }}
                  value={formData.supervisorRewardRatio === 0 ? '' : formData.supervisorRewardRatio.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100)) {
                      handleInputChange('supervisorRewardRatio', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                />
              </HelpTooltip>
              
              <HelpTooltip title="监督者进行检查的时间间隔，决定了监督的频率">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="检查间隔"
                    placeholder="间隔值"
                    variant="outlined"
                    margin="normal"
                    type="text"
                    sx={{ flex: 2 }}
                    value={formData.checkInterval === 0 ? '' : formData.checkInterval.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange('checkInterval', value === '' ? 0 : parseFloat(value));
                      }
                    }}
                  />
                  <FormControl sx={{ flex: 1, mt: 1 }}>
                    <InputLabel>单位</InputLabel>
                    <Select
                      value={formData.checkIntervalUnit}
                      label="单位"
                      onChange={(e) => handleInputChange('checkIntervalUnit', e.target.value)}
                    >
                      <MenuItem value="seconds">秒</MenuItem>
                      <MenuItem value="minutes">分钟</MenuItem>
                      <MenuItem value="hours">小时</MenuItem>
                      <MenuItem value="days">天</MenuItem>
                      <MenuItem value="weeks">周</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </HelpTooltip>
              
              <HelpTooltip title="监督者提交检查结果的时间窗口，超过此时间将视为失职">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="检查窗口"
                    placeholder="窗口值"
                    variant="outlined"
                    margin="normal"
                    type="text"
                    sx={{ flex: 2 }}
                    value={formData.checkWindow === 0 ? '' : formData.checkWindow.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange('checkWindow', value === '' ? 0 : parseFloat(value));
                      }
                    }}
                  />
                  <FormControl sx={{ flex: 1, mt: 1 }}>
                    <InputLabel>单位</InputLabel>
                    <Select
                      value={formData.checkWindowUnit}
                      label="单位"
                      onChange={(e) => handleInputChange('checkWindowUnit', e.target.value)}
                    >
                      <MenuItem value="seconds">秒</MenuItem>
                      <MenuItem value="minutes">分钟</MenuItem>
                      <MenuItem value="hours">小时</MenuItem>
                      <MenuItem value="days">天</MenuItem>
                      <MenuItem value="weeks">周</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </HelpTooltip>
              
              <HelpTooltip title="判定守约成功所需的监督者同意比例，达到此比例即视为履约成功">
                <TextField
                  fullWidth
                  label="成功阈值 (%)"
                  placeholder="判定守约成功的监督者签名比例"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  inputProps={{ min: 0, max: 100 }}
                  value={formData.checkThresholdPercent === 0 ? '' : formData.checkThresholdPercent.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100)) {
                      handleInputChange('checkThresholdPercent', value === '' ? 0 : parseFloat(value));
                    }
                  }}
                />
              </HelpTooltip>
              
              <HelpTooltip title="监督者允许的最大失职次数，超过此次数将被取消监督资格">
                <TextField
                  fullWidth
                  label="监督者最大失职次数"
                  placeholder="监督者允许的最大失职次数"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  value={formData.maxSupervisorMisses === 0 ? '' : formData.maxSupervisorMisses.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('maxSupervisorMisses', value === '' ? 0 : parseInt(value));
                    }
                  }}
                />
              </HelpTooltip>
              
              <HelpTooltip title="守约人允许的最大失约次数，超过此次数将被判定为违约">
                <TextField
                  fullWidth
                  label="守约人最大失约次数"
                  placeholder="守约人允许的最大失约次数"
                  variant="outlined"
                  margin="normal"
                  type="text"
                  value={formData.maxCommitterFailures === 0 ? '' : formData.maxCommitterFailures.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('maxCommitterFailures', value === '' ? 0 : parseInt(value));
                    }
                  }}
                />
              </HelpTooltip>
            </Box>
          )}
          
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                确认提交
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  誓约摘要
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      标题
                    </Typography>
                    <Typography variant="body1">
                      {formData.title}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      守约人地址
                    </Typography>
                    <Typography variant="body1">
                      {formData.committer}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      监督者数量
                    </Typography>
                    <Typography variant="body1">
                      {formData.supervisors.length} 人
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      开始时间
                    </Typography>
                    <Typography variant="body1">
                      {formData.startTime}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      结束时间
                    </Typography>
                    <Typography variant="body1">
                      {formData.endTime}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      总奖励金额
                    </Typography>
                    <Typography variant="body1">
                      {formData.totalReward} Token
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      守约人质押金额
                    </Typography>
                    <Typography variant="body1">
                      {formData.committerStake} Token
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      监督者质押金额
                    </Typography>
                    <Typography variant="body1">
                      {formData.supervisorStake} Token
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                提交后，您的誓约将被记录在区块链上，并且质押金额将被锁定直到誓约完成或失败。
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              上一步
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              endIcon={activeStep === steps.length - 1 ? <SaveIcon /> : undefined}
            >
              {activeStep === steps.length - 1 ? '提交誓约' : '下一步'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CreateOath;
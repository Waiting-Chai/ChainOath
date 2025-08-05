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
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputAdornment,
  Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon
} from '@mui/icons-material';

const CreateOath: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = ['基本信息', '誓约条款', '奖惩设置', '确认提交'];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
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
              
              <TextField
                fullWidth
                label="誓约标题"
                placeholder="例如：每天跑步5公里"
                variant="outlined"
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="誓约描述"
                placeholder="详细描述您的誓约内容和目标"
                variant="outlined"
                margin="normal"
                multiline
                rows={4}
                required
              />
              
              <FormControl component="fieldset" sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  誓约类型
                </Typography>
                <RadioGroup row defaultValue="personal">
                  <FormControlLabel value="personal" control={<Radio />} label="个人誓约" />
                  <FormControlLabel value="group" control={<Radio />} label="团队誓约" />
                  <FormControlLabel value="challenge" control={<Radio />} label="挑战誓约" />
                </RadioGroup>
              </FormControl>
              
              <TextField
                fullWidth
                label="截止日期"
                type="date"
                variant="outlined"
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
          )}
          
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                誓约条款
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    条款列表
                  </Typography>
                  <Button 
                    startIcon={<AddCircleOutlineIcon />} 
                    sx={{ ml: 2 }}
                    size="small"
                  >
                    添加条款
                  </Button>
                </Box>
                
                {[1, 2].map((item) => (
                  <Paper key={item} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                    <TextField
                      fullWidth
                      label={`条款 ${item}`}
                      placeholder="描述具体的誓约条款内容"
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={2}
                    />
                    <IconButton 
                      size="small" 
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
              
              <TextField
                fullWidth
                label="验证方式"
                placeholder="描述如何验证誓约的完成情况"
                variant="outlined"
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                奖惩设置
              </Typography>
              
              <TextField
                fullWidth
                label="质押金额"
                placeholder="设置违约时的惩罚金额"
                variant="outlined"
                margin="normal"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">ETH</InputAdornment>,
                }}
              />
              
              <FormControl component="fieldset" sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  违约处理方式
                </Typography>
                <RadioGroup row defaultValue="donate">
                  <FormControlLabel value="donate" control={<Radio />} label="捐赠慈善" />
                  <FormControlLabel value="burn" control={<Radio />} label="销毁" />
                  <FormControlLabel value="distribute" control={<Radio />} label="分配给其他参与者" />
                </RadioGroup>
              </FormControl>
              
              <TextField
                fullWidth
                label="奖励描述"
                placeholder="描述完成誓约后的奖励"
                variant="outlined"
                margin="normal"
                multiline
                rows={3}
              />
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
                      每天跑步5公里
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      类型
                    </Typography>
                    <Typography variant="body1">
                      个人誓约
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      截止日期
                    </Typography>
                    <Typography variant="body1">
                      2023-12-31
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      质押金额
                    </Typography>
                    <Typography variant="body1">
                      0.1 ETH
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
              onClick={activeStep === steps.length - 1 ? undefined : handleNext}
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
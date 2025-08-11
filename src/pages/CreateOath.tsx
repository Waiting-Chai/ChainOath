import React, { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import BigNumber from "bignumber.js";
import { contractService } from "../services/contractService";
import { notificationService } from "../services/notificationService";
import { getCurrentNetworkConfig, getCurrentTestTokens } from "../contracts/config";
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
  InputLabel,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";

interface OathFormData {
  title: string;
  description: string;
  committer: string;
  supervisors: string[];
  totalReward: number | string;
  committerStake: number | string;
  supervisorStake: number | string;
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
  const navigator = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    //   从sessionStorage中获取currentUserAddr, 如果获取为空， 校验失败， 跳转到error页面
    const currentUserAddr = sessionStorage.getItem("currentUserAddr");
    if (!currentUserAddr) {
      navigator("/error");
    }
  }, [navigator]);

  const [activeStep, setActiveStep] = React.useState(0);
  const steps = ["基本信息", "参与者设置", "监督配置", "确认提交"];

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

  const [formData, setFormData] = React.useState<OathFormData>(() => ({
    title: "",
    description: "",
    committer: "",
    supervisors: [""],
    totalReward: 0,
    committerStake: 0,
    supervisorStake: 0,
    supervisorRewardRatio: 10,
    checkInterval: 1,
    checkIntervalUnit: "days",
    checkWindow: 1,
    checkWindowUnit: "hours",
    checkThresholdPercent: 60,
    maxSupervisorMisses: 3,
    maxCommitterFailures: 3,
    startTime: getCurrentDateTime(),
    endTime: getDateTimeAfter30Days(),
    tokenAddress: "",
  }));

  // 处理表单字段变化
  const handleInputChange = React.useCallback(
    (field: keyof OathFormData, value: string | number | string[]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // 帮助提示组件
  const HelpTooltip = React.useCallback(
    ({ title, children }: { title: string; children: React.ReactNode }) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {children}
        <Tooltip title={title} placement="top">
          <HelpOutlineIcon
            sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }}
          />
        </Tooltip>
      </Box>
    ),
    []
  );

  // 处理监督者变化
  const handleSupervisorChange = React.useCallback(
    (index: number, value: string) => {
      const newSupervisors = [...formData.supervisors];
      newSupervisors[index] = value;
      handleInputChange("supervisors", newSupervisors);
    },
    [formData.supervisors, handleInputChange]
  );

  // 添加新监督者
  const addSupervisor = React.useCallback(() => {
    if (formData.supervisors.length < 10) {
      // 限制最多10个监督者
      handleInputChange("supervisors", [...formData.supervisors, ""]);
    } else {
      alert("最多只能添加10个监督者");
    }
  }, [formData.supervisors, handleInputChange]);

  // 删除监督者
  const removeSupervisor = React.useCallback(
    (index: number) => {
      if (formData.supervisors.length > 1) {
        // 至少保留一个监督者
        const newSupervisors = formData.supervisors.filter(
          (_, i) => i !== index
        );
        handleInputChange("supervisors", newSupervisors);
      } else {
        alert("至少需要一个监督者");
      }
    },
    [formData.supervisors, handleInputChange]
  );

  // 提交表单
  const handleSubmit = async () => {
    // 验证表单数据
    if (!formData.title || formData.title.length < 5) {
      alert("誓约标题至少需要5个字符");
      return;
    }

    if (!formData.description || formData.description.length < 20) {
      alert("誓约描述至少需要20个字符");
      return;
    }

    if (
      !formData.committer ||
      formData.committer.length !== 42 ||
      !formData.committer.startsWith("0x")
    ) {
      alert("请输入有效的守约人地址");
      return;
    }

    // 验证监督者地址
    for (const supervisor of formData.supervisors) {
      if (
        !supervisor ||
        supervisor.length !== 42 ||
        !supervisor.startsWith("0x")
      ) {
        alert("请输入有效的监督者地址");
        return;
      }
    }

    // 检查监督者地址是否重复
    const uniqueSupervisors = new Set(formData.supervisors.map(addr => addr.toLowerCase()));
    if (uniqueSupervisors.size !== formData.supervisors.length) {
        alert("监督者地址不能重复");
        return;
    }

    // 新增：守约人地址不能与任何监督者重复
    if (formData.supervisors.some(addr => addr.toLowerCase() === formData.committer.toLowerCase())) {
      alert("守约人地址不能与监督者地址相同");
      return;
    }

    if (
      !formData.tokenAddress ||
      formData.tokenAddress.length !== 42 ||
      !formData.tokenAddress.startsWith("0x")
    ) {
      alert("请输入有效的代币合约地址");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      alert("请设置开始时间和结束时间");
      return;
    }

    const startTimestamp = new Date(formData.startTime).getTime() / 1000;
    const endTimestamp = new Date(formData.endTime).getTime() / 1000;

    if (startTimestamp <= Date.now() / 1000) {
      alert("开始时间必须在未来");
      return;
    }

    if (endTimestamp <= startTimestamp) {
      alert("结束时间必须晚于开始时间");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. 初始化合约服务
      await contractService.initialize();

      // 2. 连接钱包
      const userAddress = await contractService.connectWallet();
      console.log("钱包连接成功:", userAddress);

      // 3. 获取代币信息（若需限制输入小数位可用 tokenInfo.decimals）
      const tokenInfo = await contractService.getTokenInfo(formData.tokenAddress);

      // 基于代币精度进行质押金额的小数位校验与合法性校验
      const committerStakeValue = typeof formData.committerStake === 'string' 
        ? formData.committerStake.trim() 
        : formData.committerStake.toString();
      if (!committerStakeValue || Number(committerStakeValue) <= 0) {
        alert("守约人质押金额需大于0");
        return;
      }
      const decimalPart = committerStakeValue.split('.')[1];
      if (decimalPart && decimalPart.length > tokenInfo.decimals) {
        alert(`代币最多支持 ${tokenInfo.decimals} 位小数，请调整质押金额`);
        return;
      }

      // 4. 构造合约调用数据（不需要shiftedBy转换，createOath方法接收原始字符串）
      const oathData = {
        title: formData.title,
        description: formData.description,
        committers: [formData.committer], // 转换为数组
        supervisors: formData.supervisors.filter((addr) => addr.trim() !== ""),
        committerStakeAmount: committerStakeValue,
        supervisorStakeAmount: typeof formData.supervisorStake === 'string' 
          ? formData.supervisorStake 
          : formData.supervisorStake.toString(),
        duration: Math.floor((endTimestamp - startTimestamp) / 86400), // 转换为天数
        penaltyRate: formData.supervisorRewardRatio, // 使用监督者奖励比例作为惩罚率
      };

      console.log("提交的誓约数据:", oathData);
      console.log("代币地址:", formData.tokenAddress);

      // 5. 检查代币余额
      const balance = await contractService.getTokenBalance(
        formData.tokenAddress,
        userAddress
      );
      console.log("代币余额:", balance);

      // 移除重复定义：committerStakeValue 已在上方定义
      if (new BigNumber(balance).isLessThan(committerStakeValue)) {
        throw new Error(
          `代币余额不足，需要 ${committerStakeValue}，当前余额 ${balance}`
        );
      }

      // 6. 检查并授权代币
      const networkConfig = getCurrentNetworkConfig();
      const allowance = await contractService.getTokenAllowance(
        formData.tokenAddress,
        userAddress,
        networkConfig.chainOathAddress
      );

      if (new BigNumber(allowance).isLessThan(committerStakeValue)) {
        console.log("需要授权代币...");
        const approveTx = await contractService.approveToken(
          formData.tokenAddress,
          networkConfig.chainOathAddress,
          committerStakeValue  // 传递用户输入的金额，不是wei
        );

        console.log("等待授权交易确认...");
        await approveTx.wait();
        console.log("代币授权成功");
      }

      // 7. 创建誓约
      console.log("创建誓约中...");
      const { tx, oathId } = await contractService.createOath(
        oathData,
        formData.tokenAddress
      );

      console.log("等待誓约创建交易确认...");
      await tx.wait();
      console.log("誓约创建成功，ID:", oathId);

      // 8. 创建者进行质押
      console.log("创建者质押中...");
      const stakeTx = await contractService.committerStake(
        oathId,
        committerStakeValue  // 传递用户输入的金额，不是wei
      );

      console.log("等待质押交易确认...");
      await stakeTx.wait();
      console.log("创建者质押成功");

      // 9. 发送通知给所有参与者
      const allParticipants = [
        formData.committer,
        ...formData.supervisors,
      ].filter((addr) => addr !== userAddress);

      // 发送誓约创建通知
      await notificationService.sendOathCreatedNotification(
        oathId,
        formData.title,
        allParticipants
      );

      // 发送质押提醒给守约者（如果不是创建者）
      if (formData.committer !== userAddress) {
        await notificationService.sendStakeReminderWithLink(
          oathId,
          formData.title,
          [formData.committer],
          "committer"
        );
      }

      // 发送质押提醒给监督者
      await notificationService.sendStakeReminderWithLink(
        oathId,
        formData.title,
        formData.supervisors,
        "supervisor"
      );

      // 10. 设置合约事件监听
      contractService.setupEventListeners({
        onOathCreated: (oathId: string, creator: string, title: string) => {
          console.log("监听到誓约创建事件:", { oathId, creator, title });
        },
        onStakeDeposited: (
          oathId: string,
          staker: string,
          amount: string,
          token: string
        ) => {
          console.log("监听到质押事件:", { oathId, staker, amount, token });
        },
        onOathAccepted: (oathId: string) => {
          console.log("监听到誓约接受事件:", oathId);
          // 发送誓约激活通知
          notificationService.sendOathActivatedNotification(
            oathId,
            formData.title,
            allParticipants
          );
        },
      });

      alert(`誓约创建成功！\n誓约ID: ${oathId}\n已发送通知给所有参与者`);

      // 跳转到誓约详情页或首页
      navigator("/");
    } catch (error: unknown) {
      console.error("创建誓约失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`创建誓约失败: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: "background.default",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
              }}
            >
              <LinkIcon sx={{ color: "white" }} />
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: "bold",
                background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
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
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 4, fontWeight: "bold" }}
          >
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
                  onChange={(e) => handleInputChange("title", e.target.value)}
                />
              </HelpTooltip>

              <HelpTooltip title="详细描述誓约的具体内容、目标和要求，这将帮助监督者更好地评估您的履约情况（限制500字以内）">
                <TextField
                  fullWidth
                  label="誓约描述"
                  placeholder="详细描述您的誓约内容和目标（限制500字以内）"
                  variant="outlined"
                  margin="normal"
                  multiline
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      handleInputChange("description", value);
                    }
                  }}
                  helperText={`${formData.description.length}/500 字符`}
                  error={formData.description.length > 500}
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
                  onChange={(e) =>
                    handleInputChange("startTime", e.target.value)
                  }
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
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                />
              </HelpTooltip>

              <HelpTooltip title="选择用于奖励分配和质押的ERC20代币类型">
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>代币类型</InputLabel>
                  <Select
                    value={formData.tokenAddress}
                    label="代币类型"
                    onChange={(e) =>
                      handleInputChange("tokenAddress", e.target.value)
                    }
                  >
                    {Object.entries(getCurrentTestTokens()).map(([tokenSymbol, address]) => (
                      <MenuItem key={tokenSymbol} value={address}>
                        {tokenSymbol} ({address.slice(0, 6)}...{address.slice(-4)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  onChange={(e) =>
                    handleInputChange("committer", e.target.value)
                  }
                />
              </HelpTooltip>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
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
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2, mb: 2, position: "relative" }}
                  >
                    <HelpTooltip title="负责监督和评估守约人履约情况的监督者钱包地址">
                      <TextField
                        fullWidth
                        label={`监督者 ${index + 1} 地址`}
                        placeholder="监督者的钱包地址"
                        variant="outlined"
                        margin="normal"
                        value={supervisor}
                        onChange={(e) =>
                          handleSupervisorChange(index, e.target.value)
                        }
                        required
                      />
                    </HelpTooltip>
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: "error.main",
                      }}
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
                    startAdornment: (
                      <InputAdornment position="start">
                        {(() => {
                          const found = Object.entries(getCurrentTestTokens()).find(
                            (entry) => entry[1] === formData.tokenAddress
                          );
                          return found ? found[0] : "Token";
                        })()}
                      </InputAdornment>
                    ),
                  }}
                  value={
                    formData.totalReward === 0
                      ? ""
                      : formData.totalReward.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$|^0\.$/.test(value)) {
                      handleInputChange(
                        "totalReward",
                        value === "" ? 0 : value
                      );
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
                    startAdornment: (
                      <InputAdornment position="start">
                        {(() => {
                          const found = Object.entries(getCurrentTestTokens()).find(
                            (entry) => entry[1] === formData.tokenAddress
                          );
                          return found ? found[0] : "Token";
                        })()}
                      </InputAdornment>
                    ),
                  }}
                  value={
                    formData.committerStake === 0
                      ? ""
                      : formData.committerStake.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$|^0\.$/.test(value)) {
                      handleInputChange(
                        "committerStake",
                        value === "" ? 0 : value
                      );
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
                    startAdornment: (
                      <InputAdornment position="start">
                        {(() => {
                          const found = Object.entries(getCurrentTestTokens()).find(
                            (entry) => entry[1] === formData.tokenAddress
                          );
                          return found ? found[0] : "Token";
                        })()}
                      </InputAdornment>
                    ),
                  }}
                  value={
                    formData.supervisorStake === 0
                      ? ""
                      : formData.supervisorStake.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$|^0\.$/.test(value)) {
                      handleInputChange(
                        "supervisorStake",
                        value === "" ? 0 : value
                      );
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
                  value={
                    formData.supervisorRewardRatio === 0
                      ? ""
                      : formData.supervisorRewardRatio.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "" ||
                      (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100)
                    ) {
                      handleInputChange(
                        "supervisorRewardRatio",
                        value === "" ? 0 : parseFloat(value)
                      );
                    }
                  }}
                />
              </HelpTooltip>

              <HelpTooltip title="监督者进行检查的时间间隔，决定了监督的频率">
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    label="检查间隔"
                    placeholder="间隔值"
                    variant="outlined"
                    margin="normal"
                    type="text"
                    sx={{ flex: 2 }}
                    value={
                      formData.checkInterval === 0
                        ? ""
                        : formData.checkInterval.toString()
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange(
                          "checkInterval",
                          value === "" ? 0 : parseFloat(value)
                        );
                      }
                    }}
                  />
                  <FormControl sx={{ flex: 1, mt: 1 }}>
                    <InputLabel>单位</InputLabel>
                    <Select
                      value={formData.checkIntervalUnit}
                      label="单位"
                      onChange={(e) =>
                        handleInputChange("checkIntervalUnit", e.target.value)
                      }
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
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    label="检查窗口"
                    placeholder="窗口值"
                    variant="outlined"
                    margin="normal"
                    type="text"
                    sx={{ flex: 2 }}
                    value={
                      formData.checkWindow === 0
                        ? ""
                        : formData.checkWindow.toString()
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange(
                          "checkWindow",
                          value === "" ? 0 : parseFloat(value)
                        );
                      }
                    }}
                  />
                  <FormControl sx={{ flex: 1, mt: 1 }}>
                    <InputLabel>单位</InputLabel>
                    <Select
                      value={formData.checkWindowUnit}
                      label="单位"
                      onChange={(e) =>
                        handleInputChange("checkWindowUnit", e.target.value)
                      }
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
                  value={
                    formData.checkThresholdPercent === 0
                      ? ""
                      : formData.checkThresholdPercent.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "" ||
                      (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100)
                    ) {
                      handleInputChange(
                        "checkThresholdPercent",
                        value === "" ? 0 : parseFloat(value)
                      );
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
                  value={
                    formData.maxSupervisorMisses === 0
                      ? ""
                      : formData.maxSupervisorMisses.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      handleInputChange(
                        "maxSupervisorMisses",
                        value === "" ? 0 : parseInt(value)
                      );
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
                  value={
                    formData.maxCommitterFailures === 0
                      ? ""
                      : formData.maxCommitterFailures.toString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      handleInputChange(
                        "maxCommitterFailures",
                        value === "" ? 0 : parseInt(value)
                      );
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

              <Paper
                variant="outlined"
                sx={{ p: 3, mb: 3, bgcolor: "grey.50" }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 2 }}
                >
                  誓约摘要
                </Typography>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      标题
                    </Typography>
                    <Typography variant="body1">{formData.title}</Typography>
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
                    <Typography variant="body1">{formData.endTime}</Typography>
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

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              上一步
            </Button>
            <Button
              variant="contained"
              onClick={
                activeStep === steps.length - 1 ? handleSubmit : handleNext
              }
              endIcon={
                activeStep === steps.length - 1 ? <SaveIcon /> : undefined
              }
              disabled={activeStep === steps.length - 1 ? isSubmitting : false}
            >
              {activeStep === steps.length - 1
                ? isSubmitting
                  ? "提交中..."
                  : "提交誓约"
                : "下一步"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CreateOath;

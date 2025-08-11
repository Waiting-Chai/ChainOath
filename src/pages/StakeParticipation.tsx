import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
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
  Typography,
  Toolbar,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  AccountBalanceWallet as WalletIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";

interface OathInfo {
  id: string;
  title: string;
  description: string;
  committers: string[];
  supervisors: string[];
  committerStakeAmount: string;
  supervisorStakeAmount: string;
  tokenAddress: string;
  status: number;
  creator: string;
  startTime: number;
  endTime: number;
}

const StakeParticipation: React.FC = () => {
  const { oathId } = useParams<{ oathId: string }>();
  const navigate = useNavigate();
  const [oathInfo, setOathInfo] = useState<OathInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userRole, setUserRole] = useState<"committer" | "supervisor" | "none">("none");
  const [hasStaked, setHasStaked] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  useEffect(() => {
    const initializeData = async () => {
      if (!oathId) {
        navigate("/error");
        return;
      }

      try {
        // 初始化合约服务
        await contractService.initialize();
        
        // 连接钱包
        const address = await contractService.connectWallet();
        setUserAddress(address);

        // 获取誓约信息
        const oath = await contractService.getOath(oathId);
        setOathInfo(oath);

        // 读取代币信息（decimals & symbol）
        const tokenInfo = await contractService.getTokenInfo(oath.tokenAddress);
        setTokenDecimals(tokenInfo.decimals);

        // 确定用户角色
        let role: "committer" | "supervisor" | "none" = "none";
        if (oath.committers.includes(address)) {
          role = "committer";
        } else if (oath.supervisors.includes(address)) {
          role = "supervisor";
        }
        setUserRole(role);

        // 检查是否已质押
        if (role !== "none") {
          const staked = await contractService.hasStaked(oathId, address);
          setHasStaked(staked);
        }

        // 获取余额（formatUnits 后的可读值）
        const balance = await contractService.getTokenBalance(oath.tokenAddress, address);
        setTokenBalance(balance);

        // 获取代币符号（先从配置匹配，否则回退到链上 symbol）
        const tokens = getCurrentTestTokens();
        const symbol = Object.keys(tokens).find(key => tokens[key as keyof typeof tokens] === oath.tokenAddress) || tokenInfo.symbol || "Unknown";
        setTokenSymbol(symbol);

      } catch (error) {
        console.error("初始化失败:", error);
        alert("加载誓约信息失败，请重试");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [oathId, navigate]);

  const handleStake = async () => {
    if (!oathInfo || !userAddress || userRole === "none") {
      return;
    }

    try {
      setStaking(true);

      const stakeAmount = userRole === "committer" 
        ? oathInfo.committerStakeAmount 
        : oathInfo.supervisorStakeAmount;

      const stakeAmountInTokens = new BigNumber(stakeAmount).shiftedBy(-tokenDecimals).toString();

      // 检查余额（tokenBalance已是formatUnits后的可读值）
      if (new BigNumber(tokenBalance).isLessThan(stakeAmountInTokens)) {
        throw new Error(`代币余额不足，需要 ${stakeAmountInTokens} ${tokenSymbol}，当前余额 ${tokenBalance} ${tokenSymbol}`);
      }

      // 检查并授权代币（传用户单位，approve内部会parseUnits）
      const networkConfig = getCurrentNetworkConfig();
      const allowance = await contractService.getTokenAllowance(
        oathInfo.tokenAddress,
        userAddress,
        networkConfig.chainOathAddress
      );

      if (new BigNumber(allowance).isLessThan(stakeAmountInTokens)) {
        console.log("需要授权代币...");
        const approveTx = await contractService.approveToken(
          oathInfo.tokenAddress,
          networkConfig.chainOathAddress,
          stakeAmountInTokens
        );

        console.log("等待授权交易确认...");
        await approveTx.wait();
        console.log("代币授权成功");
      }

      // 执行质押（传用户单位，后端parseUnits）
      console.log(`${userRole}质押中...`);
      const stakeTx = userRole === 'committer'
          ? await contractService.committerStake(oathId!, stakeAmountInTokens)
          : await contractService.supervisorStake(oathId!, stakeAmountInTokens);

      console.log("等待质押交易确认...");
      await stakeTx.wait();
      console.log("质押成功");

      setHasStaked(true);
      alert(`质押成功！已质押 ${stakeAmountInTokens} ${tokenSymbol}`);

      // 发送质押成功通知
      await notificationService.sendStakeSuccessNotification(
        oathId!,
        oathInfo.title,
        [userAddress],
        userRole
      );

    } catch (error: unknown) {
      console.error("质押失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`质押失败: ${errorMessage}`);
    } finally {
      setStaking(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string) => {
    return new BigNumber(amount).shiftedBy(-tokenDecimals).toString();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!oathInfo) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Typography variant="h6">誓约信息加载失败</Typography>
      </Box>
    );
  }

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
            质押参与誓约
          </Typography>

          {/* 誓约信息卡片 */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {oathInfo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {oathInfo.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={`誓约ID: ${oathId}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`代币: ${tokenSymbol}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>

          {/* 用户角色和状态 */}
          {userRole !== "none" ? (
            <Alert
              severity={hasStaked ? "success" : "info"}
              sx={{ mb: 4 }}
              icon={
                userRole === "committer" ? <SecurityIcon /> : <VisibilityIcon />
              }
            >
              <Typography variant="body1">
                您在此誓约中的角色是：
                <strong>
                  {userRole === "committer" ? "守约人" : "监督者"}
                </strong>
                {hasStaked ? " - 已完成质押" : " - 需要完成质押"}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 4 }}>
              <Typography variant="body1">
                您不是此誓约的参与者，无法进行质押操作。
              </Typography>
            </Alert>
          )}

          {/* 质押信息 */}
          {userRole !== "none" && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  质押信息
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography>需要质押金额:</Typography>
                    <Typography fontWeight="bold">
                      {formatAmount(
                        userRole === "committer"
                          ? oathInfo.committerStakeAmount
                          : oathInfo.supervisorStakeAmount
                      )}{" "}
                      {tokenSymbol}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography>您的余额:</Typography>
                    <Typography
                      color={
                        new BigNumber(tokenBalance).isGreaterThanOrEqualTo(
                          formatAmount(
                            userRole === "committer"
                              ? oathInfo.committerStakeAmount
                              : oathInfo.supervisorStakeAmount
                          )
                        )
                          ? "success.main"
                          : "error.main"
                      }
                    >
                      {tokenBalance} {tokenSymbol}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography>钱包地址:</Typography>
                    <Typography>{formatAddress(userAddress)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* 质押按钮 */}
          {userRole !== "none" && !hasStaked && (
            <Box sx={{ textAlign: "center" }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<WalletIcon />}
                onClick={handleStake}
                disabled={staking || new BigNumber(tokenBalance).isLessThan(
                  formatAmount(
                    userRole === "committer"
                      ? oathInfo.committerStakeAmount
                      : oathInfo.supervisorStakeAmount
                  )
                )}
                sx={{ px: 4, py: 1.5 }}
              >
                {staking ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    质押中...
                  </>
                ) : (
                  "确认质押"
                )}
              </Button>
              {new BigNumber(tokenBalance).isLessThan(
                formatAmount(
                  userRole === "committer"
                    ? oathInfo.committerStakeAmount
                    : oathInfo.supervisorStakeAmount
                )
              ) && (
                <Typography
                  variant="body2"
                  color="error"
                  sx={{ mt: 2 }}
                >
                  余额不足，请先获取足够的 {tokenSymbol} 代币
                </Typography>
              )}
            </Box>
          )}

          {hasStaked && (
            <Box sx={{ textAlign: "center" }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  您已成功完成质押！可以返回首页查看誓约详情。
                </Typography>
              </Alert>
              <Button
                variant="outlined"
                component={RouterLink}
                to={`/oath/${oathId}`}
                sx={{ mr: 2 }}
              >
                查看誓约详情
              </Button>
              <Button
                variant="contained"
                component={RouterLink}
                to="/"
              >
                返回首页
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default StakeParticipation;
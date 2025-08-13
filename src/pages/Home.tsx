import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import * as ethers from "ethers";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
  Snackbar,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Link as LinkIcon,
  List as ListIcon,
  Wallet as WalletIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { publicContractService } from "../services/publicContractService";
import OathCard from "../components/OathCard"; // 导入新的 OathCard 组件
import type { Oath } from "../components/OathCard"; // 导入 Oath 类型

const Home: React.FC = () => {
  const navigator = useNavigate();

  const [openConnectWalletWarn, setOpenConnectWalletWarn] = React.useState(false);
  const handleConnectWalletSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenConnectWalletWarn(false);
    setWarningMessage("");
  };

  const [warningMessage, setWarningMessage] = React.useState("");
  const pleaseConnectWallet = "请连接数字钱包";

  // 最近誓约（只读获取）
  const [recentOaths, setRecentOaths] = React.useState<
    Array<{
      id: string;
      title: string;
      description: string;
      creator: string;
      status: number;
      startTime: number;
      endTime: number;
      committerStakeAmount: string;
      supervisorStakeAmount: string;
    }>
  >([]);
  const [loadingOaths, setLoadingOaths] = React.useState(false);
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  // 平台统计数据
  const [platformStats, setPlatformStats] = React.useState<{
    active: number;
    successRate: number;
    users: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const loadRecent = async () => {
      try {
        setLoadingOaths(true);
        const data = await publicContractService.getRecentOaths(10);
        console.log("加载誓约数据：", data);
        console.log("数据类型：", typeof data);
        console.log("数据长度：", Array.isArray(data) ? data.length : 'not array');
        if (Array.isArray(data) && data.length > 0) {
          console.log("第一个誓约数据：", data[0]);
          console.log("第一个誓约的字段：", {
            id: data[0].id,
            title: data[0].title,
            description: data[0].description,
            creator: data[0].creator,
            startTime: data[0].startTime,
            endTime: data[0].endTime,
            status: data[0].status
          });
        }
        if (!mounted) return;
        setRecentOaths(data as Oath[]);
      } catch (e) {
        console.error("加载最新誓约失败", e);
      } finally {
        if (mounted) setLoadingOaths(false);
      }
    };

    const loadPlatformStats = async () => {
      try {
        setLoadingStats(true);
        const stats = await publicContractService.getPlatformStats();
        if (mounted) {
          setPlatformStats(stats);
        }
      } catch (error) {
        console.error("获取平台统计失败:", error);
      } finally {
        if (mounted) {
          setLoadingStats(false);
        }
      }
    };

    loadRecent();
    loadPlatformStats();

    return () => {
      mounted = false;
    };
  }, []);

  //   点击链接钱包按钮出发
  const connectWallet = async () => {
    if (!window.ethereum) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    console.log("钱包已连接:", addr);
  };

  //  检查当前授权状态
  const checkWalletAuthorized = async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    // v6 里 listAccounts 会返回已授权的地址列表
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  };

  //  点击创建誓约
  const handleClickCreate = async (): Promise<void> => {
    const ok = await checkWalletAuthorized();
    if (!ok) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      connectWallet().then(() => {
        navigator("/create");
      });
    } else {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      console.log("继续执行业务逻辑，当前地址：", addr);
      navigator("/create");
      sessionStorage.setItem("currentUserAddr", addr);
    }
  };

  //  点击查看我的誓约（必须连接过钱包）
  const handleClickMyOaths = async (): Promise<void> => {
    const ok = await checkWalletAuthorized();
    if (!ok) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      connectWallet().then(() => {
        navigator("/my-oaths");
      });
    } else {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      sessionStorage.setItem("currentUserAddr", addr);
      navigator("/my-oaths");
    }
  };

  // 轮播控制
  const showPrev = () => {
    if (recentOaths.length === 0) return;
    setCarouselIndex((prev) => (prev - 1 + recentOaths.length) % recentOaths.length);
  };

  const showNext = () => {
    if (recentOaths.length === 0) return;
    setCarouselIndex((prev) => (prev + 1) % recentOaths.length);
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
      <Snackbar
        open={openConnectWalletWarn}
        autoHideDuration={6000}
        onClose={handleConnectWalletSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleConnectWalletSnackbarClose} severity="warning" variant="filled" sx={{ width: "100%" }}>
          {warningMessage}
        </Alert>
      </Snackbar>
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

          <Box
            sx={{
              flexGrow: 1,
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
            }}
          >
            <Button color="inherit" sx={{ mx: 1 }} component={RouterLink} to="/">
              首页
            </Button>
            <Button color="inherit" sx={{ mx: 1 }}>
              探索
            </Button>
            <Button color="inherit" sx={{ mx: 1 }}>
              文档
            </Button>
            <Button color="inherit" sx={{ mx: 1 }}>
              关于
            </Button>
          </Box>

          <IconButton
            color="inherit"
            sx={{ mr: 1 }}
            component="a"
            href="https://github.com/Waiting-Chai/ChainOath"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <GitHubIcon />
          </IconButton>

          <Button
            variant="contained"
            color="primary"
            startIcon={<WalletIcon />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
            }}
            onClick={connectWallet}
          >
            连接钱包
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed AppBar */}
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            background: "linear-gradient(135deg, #F8FAFC, #F1F5F9, #F8FAFC)",
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <Box sx={{ mb: { xs: 5, lg: 0 }, maxWidth: "lg" }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: "bold",
                    mb: 2,
                    fontSize: { xs: "2.5rem", md: "3.5rem" },
                  }}
                >
                  链上誓约，可信履约
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: "md", mx: "auto" }}>
                  去中心化的链上誓约系统，让承诺可验证、可执行、可追溯。
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      py: 1.5,
                      boxShadow: 4,
                      "&:hover": { boxShadow: 8 },
                    }}
                    onClick={handleClickCreate}
                  >
                    创建誓约
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    startIcon={<ListIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      py: 1.5,
                    }}
                    onClick={handleClickMyOaths}
                  >
                    查看我的誓约
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Explore Oaths Carousel (Uiverse 风格卡片) */}
        <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg">
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                社区誓约
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton onClick={showPrev} disabled={recentOaths.length === 0}>
                  <ArrowBackIosNewIcon />
                </IconButton>
                <IconButton onClick={showNext} disabled={recentOaths.length === 0}>
                  <ArrowForwardIosIcon />
                </IconButton>
              </Stack>
            </Stack>

            {loadingOaths ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : recentOaths.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography color="text.secondary">暂时没有可展示的誓约</Typography>
              </Box>
            ) : (
              <Box 
                sx={{ 
                  display: "flex", 
                  gap: 3, 
                  justifyContent: "center",
                  flexWrap: "wrap",
                  alignItems: "stretch" 
                }}
              >
                {/* 在不同屏幕下展示 1~2 张卡片，核心卡片是当前索引 */}
                <Box sx={{ flex: { xs: "1 1 100%", md: "0 1 48%" }, maxWidth: 500 }}>
                  <OathCard oath={recentOaths[carouselIndex]} />
                </Box>
                {recentOaths.length > 1 && (
                  <Box sx={{ 
                    flex: { xs: "1 1 100%", md: "0 1 48%" },
                    maxWidth: 500,
                    display: { xs: "none", md: "block" } 
                  }}>
                    <OathCard oath={recentOaths[(carouselIndex + 1) % recentOaths.length]} />
                  </Box>
                )}
              </Box>
            )}

          </Container>
        </Box>

        {/* Stats Section（简化保留，避免过多介绍） */}
        <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: "background.paper" }}>
          <Container maxWidth="lg">
            {loadingStats ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box 
                sx={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: 4, 
                  justifyContent: "center" 
                }}
              >
                <Box sx={{ textAlign: "center", minWidth: 150 }}>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 1,
                    }}
                  >
                    {platformStats?.active ?? "--"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    活跃誓约
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center", minWidth: 150 }}>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 1,
                    }}
                  >
                    {platformStats?.successRate ? `${platformStats.successRate}%` : "--"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    履约成功率
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center", minWidth: 150 }}>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 1,
                    }}
                  >
                    {platformStats?.users ?? "--"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    注册用户
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center", minWidth: 150 }}>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 1,
                    }}
                  >
                    24/7
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    链上监控
                  </Typography>
                </Box>
              </Box>
            )}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;

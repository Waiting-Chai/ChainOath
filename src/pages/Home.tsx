import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Link as LinkIcon,
  List as ListIcon,
  Wallet as WalletIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { walletService } from "../services/walletService";

const Home: React.FC = () => {
  const navigator = useNavigate();

  // 钱包状态管理
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

  React.useEffect(() => {




  }, []);

  // 连接钱包
  const connectWallet = async () => {
    try {
      await walletService.connect();
      console.log("钱包连接成功");
    } catch (error) {
      console.error("钱包连接失败:", error);
      setWarningMessage(error instanceof Error ? error.message : pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
    }
  };

  // 检查钱包是否已连接
  const checkWalletConnected = (): boolean => {
    return walletService.isConnected();
  };

  // 点击创建誓约
  const handleClickCreate = async (): Promise<void> => {
    if (!checkWalletConnected()) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      try {
        await connectWallet();
        const address = await walletService.getCurrentAddress();
        if (address) {
          sessionStorage.setItem("currentUserAddr", address);
          navigator("/create");
        }
      } catch (error) {
        console.error("连接钱包失败:", error);
      }
    } else {
      const address = await walletService.getCurrentAddress();
      if (address) {
        console.log("继续执行业务逻辑，当前地址：", address);
        sessionStorage.setItem("currentUserAddr", address);
        navigator("/create");
      }
    }
  };

  // 点击查看我的誓约（必须连接过钱包）
  const handleClickMyOaths = async (): Promise<void> => {
    if (!checkWalletConnected()) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      try {
        await connectWallet();
        const address = await walletService.getCurrentAddress();
        if (address) {
          sessionStorage.setItem("currentUserAddr", address);
          navigator("/my-oaths");
        }
      } catch (error) {
        console.error("连接钱包失败:", error);
      }
    } else {
      const address = await walletService.getCurrentAddress();
      if (address) {
        sessionStorage.setItem("currentUserAddr", address);
        navigator("/my-oaths");
      }
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
            <Button color="inherit" sx={{ mx: 1 }} component={RouterLink} to="/achievements">
              成就中心
            </Button>
            <Button color="inherit" sx={{ mx: 1 }} component={RouterLink} to="/notifications">
              通知中心
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

        {/* Stats Section（简化保留，避免过多介绍） */}

      </Box>
    </Box>
  );
};

export default Home;

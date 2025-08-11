import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import * as ethers from "ethers";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Toolbar,
  Typography,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  GitHub as GitHubIcon,
  Link as LinkIcon,
  List as ListIcon,
  RemoveRedEye as EyeIcon,
  Twitter as TwitterIcon,
  Wallet as WalletIcon,
  Message as MessageIcon,
} from "@mui/icons-material";

const Home: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const navigator = useNavigate();

  const [openConnectWalletWarn, setOpenConnectWalletWarn] = React.useState(false);
  const handleConnectWalletSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenConnectWalletWarn(false);
    setWarningMessage('');
  };

  const [warningMessage, setWarningMessage] = React.useState('');
  const pleaseConnectWallet = '请连接数字钱包';
  const withoutMateMask = "没有检测到 MeteMask";

  //   点击链接钱包按钮出发
  const connectWallet = async () => {
    // 检测 MetaMask 注入
    if (!window.ethereum) {
      setWarningMessage(withoutMateMask);
      throw new Error("请先安装 MetaMask");
    }
    // v6 里叫 BrowserProvider
    const provider = new ethers.BrowserProvider(window.ethereum);
    // 请求账户授权
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    console.log("当前地址：", addr);
    sessionStorage.setItem("currentUserAddr", addr);
  };

  //  检查当前授权状态
  const checkWalletAuthorized = async () : Promise<boolean> => {
    if (!window.ethereum) return false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    // v6 里 listAccounts 会返回已授权的地址列表
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  };

  //  点击誓约， 跳转到对应的页面， 但是如果没有连接钱包的话弹窗处理
  const handleClickCreate = async () : Promise<void> => {
    const ok = await checkWalletAuthorized();
    if (!ok) {
      setWarningMessage(pleaseConnectWallet);
      setOpenConnectWalletWarn(true);
      connectWallet().then(() => {
        navigator("/create")
      });
    } else {
      //   用户已经授权，可以直接用 signer 去做后续操作
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      //   …比如调用合约、签名消息
      const addr = await signer.getAddress()
      console.log("继续执行业务逻辑，当前地址：", addr);
      navigator("/create");
      sessionStorage.setItem("currentUserAddr", addr);
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
      <Snackbar open={openConnectWalletWarn} autoHideDuration={6000} onClose={handleConnectWalletSnackbarClose}   anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleConnectWalletSnackbarClose}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
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
            <Button color="inherit" sx={{ mx: 1 }}>
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
            <Grid container spacing={4} alignItems="center">
              <Grid size={{ xs: 12, lg: 6 }}>
                <Box sx={{ mb: { xs: 5, lg: 0 } }}>
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      fontSize: { xs: "2.5rem", md: "3.5rem" },
                    }}
                  >
                    Chain
                    <Box
                      component="span"
                      sx={{
                        background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Oath
                    </Box>
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ mb: 4, maxWidth: "sm" }}
                  >
                    去中心化的链上誓约系统，让承诺可验证、可执行、可追溯。
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
                      component={RouterLink}
                      to="/my-oaths"
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        py: 1.5,
                      }}
                    >
                      查看我的誓约
                    </Button>
                  </Stack>
                </Box>
              </Grid>
              <Grid
                size={{ xs: 12, lg: 6 }}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <Box
                  component="img"
                  src="https://design.gemcoder.com/staticResource/echoAiSystemImages/93e09b3ab4b7676b75fea67e88f1c482.png"
                  alt="ChainOath 区块链誓约系统"
                  sx={{
                    width: "100%",
                    maxWidth: 500,
                    height: "auto",
                    borderRadius: 4,
                    boxShadow: 8,
                    transition: "transform 0.3s ease-in-out",
                    "&:hover": {
                      transform: "scale(1.02)",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: "background.paper" }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                为什么选择 ChainOath
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ maxWidth: "md", mx: "auto" }}
              >
                我们的去中心化誓约系统为您提供安全、透明且激励驱动的承诺履行解决方案
              </Typography>
            </Box>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "grey.50",
                    borderRadius: 4,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: 6,
                      borderColor: "primary.light",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: "primary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        opacity: 0.2,
                      }}
                    >
                      <EyeIcon
                        sx={{ fontSize: 28, color: "primary.main", opacity: 5 }}
                      />
                    </Box>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: "bold", mb: 1.5 }}
                    >
                      公开透明
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      所有誓约内容和执行记录均存储在区块链上，确保信息公开透明，不可篡改。
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "grey.50",
                    borderRadius: 4,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: 6,
                      borderColor: "primary.light",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: "primary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        opacity: 0.2,
                      }}
                    >
                      <CheckCircleIcon
                        sx={{ fontSize: 28, color: "primary.main", opacity: 5 }}
                      />
                    </Box>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: "bold", mb: 1.5 }}
                    >
                      可验证履约
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      通过智能合约自动验证誓约履行情况，消除人为干预，确保履约过程公正可信。
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "grey.50",
                    borderRadius: 4,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: 6,
                      borderColor: "primary.light",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: "primary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        opacity: 0.2,
                      }}
                    >
                      <TrophyIcon
                        sx={{ fontSize: 28, color: "primary.main", opacity: 5 }}
                      />
                    </Box>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: "bold", mb: 1.5 }}
                    >
                      奖励驱动
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      内置激励机制，完成誓约可获得奖励，违约则面临惩罚，有效提高承诺履行率。
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
      {/* Footer */}
      <Box
        component="footer"
        sx={{ bgcolor: "grey.900", color: "white", py: 6 }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
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
                  sx={{ fontWeight: "bold" }}
                >
                  ChainOath
                </Typography>
              </Box>
              <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>
                去中心化的链上誓约系统，让承诺可验证、可执行、可追溯。
              </Typography>
              <Stack direction="row" spacing={2}>
                <IconButton
                  size="small"
                  sx={{ color: "grey.500", "&:hover": { color: "white" } }}
                >
                  <TwitterIcon />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: "grey.500", "&:hover": { color: "white" } }}
                >
                  <GitHubIcon />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: "grey.500", "&:hover": { color: "white" } }}
                >
                  <MessageIcon />
                </IconButton>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                产品
              </Typography>
              <Stack spacing={1}>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  功能
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  使用案例
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  定价
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  路线图
                </Link>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                资源
              </Typography>
              <Stack spacing={1}>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  文档
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  API
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  教程
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  社区
                </Link>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                公司
              </Typography>
              <Stack spacing={1}>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  关于我们
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  博客
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  招聘
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="grey.400"
                  sx={{ "&:hover": { color: "white" } }}
                >
                  联系我们
                </Link>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: "grey.800", my: 4 }} />

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "center", sm: "flex-start" },
            }}
          >
            <Typography variant="body2" color="grey.500">
              &copy; {currentYear} ChainOath. 保留所有权利。
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mt: { xs: 2, sm: 0 } }}>
              <Link
                href="#"
                underline="hover"
                color="grey.500"
                sx={{ "&:hover": { color: "white" } }}
                variant="body2"
              >
                隐私政策
              </Link>
              <Link
                href="#"
                underline="hover"
                color="grey.500"
                sx={{ "&:hover": { color: "white" } }}
                variant="body2"
              >
                服务条款
              </Link>
              <Link
                href="#"
                underline="hover"
                color="grey.500"
                sx={{ "&:hover": { color: "white" } }}
                variant="body2"
              >
                Cookie 政策
              </Link>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;

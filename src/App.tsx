import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import Home from './pages/Home';
import Error from './pages/Error';
import Achievement from './pages/Achievement';
import OathDetail from './pages/OathDetail';
import MyOaths from './pages/MyOaths';
import UserSearch from './pages/UserSearch';
import Notifications from './pages/Notifications';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/error" element={<Error />} />
          <Route path="/achievements" element={<Achievement />} />
          <Route path="/oath/:id" element={<OathDetail />} />
          <Route path="/my-oaths" element={<MyOaths />} />
          <Route path="/search" element={<UserSearch />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

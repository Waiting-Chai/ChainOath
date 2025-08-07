import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import Home from './pages/Home';
import CreateOath from './pages/CreateOath';
import Error from './pages/Error';
import MyOaths from './pages/MyOaths';
import OathDetail from './pages/OathDetail';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateOath />} />
          <Route path="/error" element={<Error/>} />
          <Route path="/my-oaths" element={<MyOaths />} />
          <Route path="/oath/:id" element={<OathDetail />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

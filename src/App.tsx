import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateOath from './pages/CreateOath';
import MyOaths from './pages/MyOaths';
import OathDetail from './pages/OathDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateOath />} />
        <Route path="/my-oaths" element={<MyOaths />} />
        <Route path="/oath/:id" element={<OathDetail />} />
      </Routes>
    </Router>
  );
}

export default App;

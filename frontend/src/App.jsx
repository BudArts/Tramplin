import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/login'; 
import Candidate from './pages/Candidate'; 
import Curator from './pages/Curator'; 
import Employer from './pages/Employer'; 
import TaskCard from './components/card';

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', background: '#f4f4f4' }}>
        <Link to="/">Главная</Link> | <Link to="/login">Перейти к логину</Link>
      </nav>

      <Routes>
        <Route path="/" element={<h1 className="text-4xl font-extrabold text-red-900">Добро пожаловать в It Planet!</h1>} />
        <Route path="/login" element={<Login />} />
        <Route path="/candidate" element={<Candidate />} />
        <Route path="/employer" element={<Employer />} />
        <Route path="/curator" element={<Curator />} />
        <Route path="/card" element={<TaskCard />} />
      </Routes>
    </Router>
  );
}

export default App;
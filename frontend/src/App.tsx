import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ScrollProgressBar from './components/ScrollProgressBar';

function App() {
  return (
    <BrowserRouter>
      <ScrollProgressBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Будущие маршруты для ЛК */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
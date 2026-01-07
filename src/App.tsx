import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/HeaderPage/Header';
import Home from './components/HomePage/Home';
import Events from './components/EventsPage/Events';
import Reels from './components/ReelsPage/Reels';
import Auth from './components/AuthPage/Auth';

function App() {
  const bodyStyle = {
    background: `
      radial-gradient(circle, rgba(231, 225, 225, 0.49) 40%, rgba(236, 231, 192, 0.8) 80%),
      url(${process.env.PUBLIC_URL}/Africa-image-final.png)
    `,
    backgroundSize: '100% 100%, 50% auto',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat, no-repeat',
    minHeight: '100vh'
  };

  return (
    <AuthProvider>
      <Router>
        <div className="whole">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

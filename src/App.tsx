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

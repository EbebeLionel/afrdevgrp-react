import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './components/common/Feedback';
import Header from './components/HeaderPage/Header';
import Home from './components/HomePage/Home';
import Events from './components/EventsPage/Events';
import Reels from './components/ReelsPage/Reels';
import Auth from './components/AuthPage/Auth';

function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <Router>
          <div className="whole">
            <a href="#main-content" className="skip-link">Skip to content</a>
            <Header />
            <main id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/reels" element={<Reels />} />
                <Route path="/auth" element={<Auth />} />
              </Routes>
            </main>
          </div>
        </Router>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;

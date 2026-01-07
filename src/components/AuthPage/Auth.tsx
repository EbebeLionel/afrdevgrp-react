import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

interface AuthFormData {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  birthday?: string;
  school?: string;
}

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signup, login } = useAuth();
  
  // Scroll animation
  const authBoxAnim = useScrollAnimation();
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<AuthFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthday: '',
    school: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const getErrorMessage = (error: any): string => {
    const errorCode = error.code;
    
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please log in instead.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Sign up validation
        if (!formData.name?.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match!');
          setLoading(false);
          return;
        }
        
        if (formData.password.length < 6) {
          setError('Password should be at least 6 characters.');
          setLoading(false);
          return;
        }
        
        if (!formData.birthday) {
          setError('Please enter your birthday.');
          setLoading(false);
          return;
        }
        
        if (!formData.school?.trim()) {
          setError('Please enter your school name.');
          setLoading(false);
          return;
        }
        
        // Sign up user
        await signup(
          formData.email,
          formData.password,
          formData.name,
          formData.birthday,
          formData.school
        );
        
        // Navigate to home page after successful signup
        navigate('/');
      } else {
        // Log in user
        await login(formData.email, formData.password);
        
        // Navigate to home page after successful login
        navigate('/');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    // Clear form when switching modes
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      birthday: '',
      school: ''
    });
  };

  return (
    <div className="auth-container">
      <div
        ref={authBoxAnim.elementRef}
        className={`auth-box animate-on-scroll slide-up ${authBoxAnim.isVisible ? 'is-visible' : ''}`}
      >
        <div className="adg-logo">
          <img
            src="/images/adg-logo.jpeg"
            alt="ADG Logo"
            className="adg-photo"
          />
        </div>
        
        <h2>{isSignUp ? 'Join ADG' : 'Welcome Back'}</h2>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              disabled={loading}
              minLength={6}
            />
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm your password"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthday">Birthday</label>
                <input
                  type="date"
                  id="birthday"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="school">School</label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your school name"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (isSignUp ? 'Signing Up...' : 'Logging In...') : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span onClick={toggleMode} className="toggle-link" style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}>
              {isSignUp ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
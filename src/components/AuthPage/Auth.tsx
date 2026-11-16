import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import './Auth.css';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

/**
 * Sign up and sign in are the same step: "Continue with Google".
 * A first-time Google account gets an ADG account created automatically.
 */
const Auth: React.FC = () => {
  usePageTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signInWithGoogle } = useAuth();
  const authBoxAnim = useScrollAnimation();

  const returnTo = (location.state as { from?: string } | null)?.from || '/';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    // Google/Supabase report a failed or cancelled sign-in in the URL.
    const params = new URLSearchParams(window.location.search);
    return params.get('error_description') || '';
  });

  // Already signed in (or just came back from Google): leave this page.
  useEffect(() => {
    if (currentUser) navigate(returnTo, { replace: true });
  }, [currentUser, navigate, returnTo]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle(returnTo);
      // The browser now redirects to Google; nothing more to do here.
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err?.message || 'Could not start Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div
        ref={authBoxAnim.elementRef}
        className={`auth-box animate-on-scroll slide-up ${authBoxAnim.isVisible ? 'is-visible' : ''}`}
      >
        <div className="adg-logo">
          <img src="/images/adg-logo.jpeg" alt="ADG Logo" className="adg-photo" />
        </div>

        <h2>Welcome to ADG</h2>

        {error && <div className="auth-error">{error}</div>}
        {!isSupabaseConfigured && (
          <div className="auth-error">Sign-in is not configured for this deployment yet.</div>
        )}

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogle}
          disabled={loading || !isSupabaseConfigured}
        >
          <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
            <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {loading ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <div className="toggle-mode">
          <p>
            New here? Continuing with Google creates your account. ADG board members should use
            their board email to manage events and reels.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

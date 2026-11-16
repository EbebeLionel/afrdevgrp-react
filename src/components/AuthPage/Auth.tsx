import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import './Auth.css';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

const MIN_PASSWORD_LENGTH = 8;

/** Turn Supabase auth errors into messages a person can act on. */
function describeAuthError(err: any): string {
  const code: string = err?.code || '';
  const message: string = err?.message || '';
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Email or password is incorrect.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Please confirm your email first. Check your inbox for the link.';
  }
  if (code === 'weak_password') {
    return message || 'That password is too weak. Try a longer one.';
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (/invalid email/i.test(message)) {
    return 'Please enter a valid email address.';
  }
  return message || 'Something went wrong. Please try again.';
}

const Auth: React.FC = () => {
  usePageTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const authBoxAnim = useScrollAnimation();

  const returnTo = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(() => {
    // Google/Supabase report a failed or cancelled sign-in in the URL.
    const params = new URLSearchParams(window.location.search);
    return params.get('error_description') || '';
  });

  // Already signed in (or just came back from a sign-in link): leave this page.
  useEffect(() => {
    if (currentUser) navigate(returnTo, { replace: true });
  }, [currentUser, navigate, returnTo]);

  const switchMode = (next: 'signup' | 'signin') => {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle(returnTo);
      // The browser now redirects to Google; nothing more to do here.
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(describeAuthError(err));
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'signup') {
      if (!name.trim()) return setError('Please enter your name.');
      if (password.length < MIN_PASSWORD_LENGTH) {
        return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (password !== confirmPassword) return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithEmail(email, password, name, returnTo);
        if (needsConfirmation) {
          setNotice(`We sent a confirmation link to ${email.trim()}. Open it to finish creating your account.`);
          setPassword('');
          setConfirmPassword('');
        }
        // If no confirmation is needed, the auth listener signs the user in
        // and the effect above sends them to returnTo.
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="auth-container">
      <div
        ref={authBoxAnim.elementRef}
        className={`auth-box animate-on-scroll slide-up ${authBoxAnim.isVisible ? 'is-visible' : ''}`}
      >
        <div className="adg-logo">
          <img src="/images/adg-logo.jpeg" alt="ADG Logo" className="adg-photo" />
        </div>

        <h2>{isSignup ? 'Join ADG' : 'Welcome back'}</h2>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
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
          {loading ? 'Please wait…' : 'Continue with Google'}
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleEmailSubmit} className="email-auth-form">
          {isSignup && (
            <div className="form-group">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Enter your password'}
              required
              minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
              disabled={loading}
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label htmlFor="auth-confirm">Confirm password</label>
              <input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading || !isSupabaseConfigured}>
            {loading
              ? 'Please wait…'
              : isSignup
                ? 'Create account with email'
                : 'Sign in with email'}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              className="toggle-link"
              role="button"
              tabIndex={0}
              onClick={() => !loading && switchMode(isSignup ? 'signin' : 'signup')}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                  switchMode(isSignup ? 'signin' : 'signup');
                }
              }}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </span>
          </p>
          <p className="auth-fine-print">
            ADG board members should use their board email to manage events and reels.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

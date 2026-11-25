import { useState } from 'react';
import { db } from '../db/database';
import { renderIcon } from '../engine/isoEngine';

export default function AuthView({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [username, setUsername] = useState('CryptoStudent');
  const [role, setRole] = useState<'student' | 'cryptographer'>('student');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    const currentUser = db.getUser();
    // Update active username in database
    currentUser.username = username.trim();
    currentUser.role = role;
    db.updateUserProgress(currentUser.currentMissionId, 0); // saves user

    onAuthenticated();
  };

  if (mode === 'landing') {
    return (
      <div className="landing-shell">
        <header className="landing-hero">
          <div className="landing-badge">
            <span
              dangerouslySetInnerHTML={{ __html: renderIcon('shield', { size: 14, stroke: 2.2 }) }}
            />
            <span>Interactive Cryptography & Security Masterclass</span>
          </div>
          <h1 className="landing-title">
            Master Modern Cryptography <span>Through Hands-On Warfare & Practice</span>
          </h1>
          <p className="landing-subtitle">
            An immersive 5-stage workshop and crypto lab designed to take you from plaintext basics to AES-GCM, Argon2id, Diffie-Hellman, Ed25519 HSMs, and AEAD Nonce ledgers with Prof. Ada voice guidance.
          </p>

          <div className="landing-cta-row">
            <button
              type="button"
              className="btn-pop btn-next landing-primary-btn"
              onClick={() => setMode('login')}
            >
              <span>Get Started / Sign In</span>
              <span
                dangerouslySetInnerHTML={{ __html: renderIcon('play', { size: 14, stroke: 2.5 }) }}
              />
            </button>
            <button
              type="button"
              className="btn-ghost landing-secondary-btn"
              onClick={() => setMode('register')}
            >
              Create Free Account
            </button>
          </div>

          <div className="landing-features">
            <div className="landing-feature-card">
              <span
                className="landing-feature-ico"
                dangerouslySetInnerHTML={{ __html: renderIcon('lock', { size: 20, stroke: 2 }) }}
              />
              <h3>5 Guided Workshops</h3>
              <p>Step-by-step interactive scenarios with live cause-and-effect packet flows.</p>
            </div>
            <div className="landing-feature-card">
              <span
                className="landing-feature-ico"
                dangerouslySetInnerHTML={{ __html: renderIcon('cpu', { size: 20, stroke: 2 }) }}
              />
              <h3>4 Crypto Lab Workbenches</h3>
              <p>Test byte flips, 256-bit hash avalanche diffs, DH key exchange, and X-ray ECB leaks.</p>
            </div>
            <div className="landing-feature-card">
              <span
                className="landing-feature-ico"
                dangerouslySetInnerHTML={{ __html: renderIcon('volume2', { size: 20, stroke: 2 }) }}
              />
              <h3>Prof. Ada Voice Tutor</h3>
              <p>Context-aware voice narration and smart hints whenever you get stuck.</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay">
      <div className="card auth-card animate-scale-in">
        <div className="auth-card__header">
          <div className="crumb">CryptoScale Security Auth</div>
          <h2>{mode === 'login' ? 'Welcome Back, Cryptographer' : 'Create Your Student Account'}</h2>
          <p>Sign in to sync your mastery tracker, XP, and completed security missions.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && <div className="step-feedback is-bad">{error}</div>}

          <div className="lab-field">
            <label>Username / Handle</label>
            <input
              type="text"
              className="lab-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="e.g. AliceSec"
              required
            />
          </div>

          <div className="lab-field">
            <label>Role / Focus Area</label>
            <div className="lab-algo-list">
              <button
                type="button"
                className={`lab-pill ${role === 'student' ? 'is-active' : ''}`}
                onClick={() => setRole('student')}
              >
                Security Student
              </button>
              <button
                type="button"
                className={`lab-pill ${role === 'cryptographer' ? 'is-active' : ''}`}
                onClick={() => setRole('cryptographer')}
              >
                Professional Cryptographer
              </button>
            </div>
          </div>

          <div className="auth-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode('landing')}
            >
              ← Back to Home
            </button>
            <button type="submit" className="btn-pop">
              {mode === 'login' ? 'Sign In to Dashboard →' : 'Complete Registration →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

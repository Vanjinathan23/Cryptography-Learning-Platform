import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X,
  Zap,
  Award,
} from 'lucide-react';
import { db } from '../db/database';
import { UserRecord } from '../db/schema';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserRecord) => void;
}

type AuthTab = 'signin' | 'register' | 'session';

async function computeSha256Hex(text: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateHexSalt(bytes = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(16).substring(2, 18).padStart(32, '0');
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const currentUser = db.getUser();

  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign In fields
  const [loginIdentifier, setLoginIdentifier] = useState('CryptoStudent');
  const [loginPassword, setLoginPassword] = useState('supersecret123');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [activeSalt] = useState(() => generateHexSalt(16));

  // Live cryptographic preview state
  const [liveDigest, setLiveDigest] = useState('');

  useEffect(() => {
    const pwd = activeTab === 'signin' ? loginPassword : regPassword;
    const saltToUse = activeTab === 'signin' ? currentUser.salt || '7a9f1b2c3d4e5f60' : activeSalt;
    if (pwd) {
      computeSha256Hex(`${pwd}:${saltToUse}`).then((hex) => setLiveDigest(hex));
    } else {
      setLiveDigest('');
    }
  }, [loginPassword, regPassword, activeTab, currentUser.salt, activeSalt]);

  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [activeTab]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your username or email address.');
      return;
    }

    const result = db.authenticate(loginIdentifier);
    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    setSuccessMsg(`Welcome back, ${result.user.username}!`);
    setTimeout(() => {
      onLoginSuccess(result.user!);
      onClose();
    }, 500);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regUsername.trim() || regUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Please enter a valid email.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const computedHash = await computeSha256Hex(`${regPassword}:${activeSalt}`);
    const result = db.register(regUsername, regEmail, computedHash, activeSalt, 'student');

    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'Failed to create account.');
      return;
    }

    setSuccessMsg(`Account created! Logged in as ${result.user.username}.`);
    setTimeout(() => {
      onLoginSuccess(result.user!);
      onClose();
    }, 500);
  };

  const handleFastLogin = () => {
    const user = db.getUser();
    setSuccessMsg(`Fast Login successful! Welcome back, ${user.username}.`);
    setTimeout(() => {
      onLoginSuccess(user);
      onClose();
    }, 350);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(20, 18, 16, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--sheet)',
          borderRadius: 20,
          border: '2px solid var(--line-strong)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            background: 'var(--paper-2)',
            borderBottom: '1.5px solid var(--line-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--green-tile)',
                border: '1.5px solid var(--green-3)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                CryptoScale Login
              </h2>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                Single Secure Account &amp; Progress Session
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: 'var(--paper)',
            borderBottom: '1px solid var(--line)',
            padding: '4px 8px 0',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            style={{
              padding: '10px 8px',
              background: activeTab === 'signin' ? 'var(--sheet)' : 'transparent',
              border: 0,
              borderBottom: activeTab === 'signin' ? '2.5px solid var(--ink)' : '2.5px solid transparent',
              fontWeight: 800,
              fontSize: 12.5,
              color: activeTab === 'signin' ? 'var(--ink)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            style={{
              padding: '10px 8px',
              background: activeTab === 'register' ? 'var(--sheet)' : 'transparent',
              border: 0,
              borderBottom: activeTab === 'register' ? '2.5px solid var(--ink)' : '2.5px solid transparent',
              fontWeight: 800,
              fontSize: 12.5,
              color: activeTab === 'register' ? 'var(--ink)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            style={{
              padding: '10px 8px',
              background: activeTab === 'session' ? 'var(--sheet)' : 'transparent',
              border: 0,
              borderBottom: activeTab === 'session' ? '2.5px solid var(--ink)' : '2.5px solid transparent',
              fontWeight: 800,
              fontSize: 12.5,
              color: activeTab === 'session' ? 'var(--ink)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Profile
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Prominent Fast Login button */}
          {activeTab !== 'session' && (
            <>
              <button
                type="button"
                onClick={handleFastLogin}
                className="btn-pop"
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: 10,
                  fontSize: 14.5,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'var(--green-tile)',
                  color: 'var(--ink)',
                  border: '2px solid var(--green-3)',
                  cursor: 'pointer',
                }}
              >
                <Zap size={18} fill="var(--rust)" color="var(--rust)" />
                <span>Fast Login</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>or with credentials</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
            </>
          )}

          {errorMsg && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(208, 104, 58, 0.15)',
                border: '1.5px solid var(--rust)',
                color: 'var(--rust)',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'var(--green-tile)',
                border: '1.5px solid var(--green-3)',
                color: 'var(--ink)',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={15} color="var(--green-3)" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Handle or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. CryptoStudent"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-pop"
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                Sign In →
              </button>
            </form>
          )}

          {/* REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Handle / Alias
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. Alice"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-pop"
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                Create Account →
              </button>
            </form>
          )}

          {/* PROFILE / SESSION */}
          {activeTab === 'session' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'var(--paper-2)',
                  border: '1.5px solid var(--line-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    color: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: 17,
                  }}
                >
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>
                    {currentUser.username}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Security Score: <b style={{ color: 'var(--rust)' }}>{currentUser.xp} XP</b> · {currentUser.completedScenarios.length} Scenarios
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  db.resetDatabase();
                  const resetUser = db.getUser();
                  onLoginSuccess(resetUser);
                  setSuccessMsg('Progress reset to baseline.');
                }}
                style={{ padding: '10px', fontSize: 12, borderRadius: 8, color: 'var(--rust)', justifyContent: 'center' }}
              >
                Reset Progress to Baseline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { db } from '../db/database';
import { UserRecord } from '../db/schema';

interface LoginPageProps {
  onLoginSuccess: (user: UserRecord) => void;
  onBackToLanding: () => void;
  targetDestination?: string;
}

// Client-side Web Crypto SHA-256
async function hashPassword(text: string): Promise<string> {
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

function generateSalt(bytes = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(16).substring(2, 18).padStart(32, '0');
}

export function validatePasswordPolicy(pwd: string): { valid: boolean; error?: string } {
  if (pwd.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  if (!hasSpecial) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&* etc.).' };
  }
  return { valid: true };
}

export default function LoginPage({
  onLoginSuccess,
  onBackToLanding,
  targetDestination = 'Learning Curriculum',
}: LoginPageProps) {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign In fields
  const [identifier, setIdentifier] = useState('CryptoStudent');
  const [password, setPassword] = useState('Crypto@2026');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSalt] = useState(() => generateSalt(16));

  // Live hash preview
  const [liveDigest, setLiveDigest] = useState('');

  useEffect(() => {
    const pwd = tab === 'signin' ? password : regPassword;
    if (pwd) {
      hashPassword(`${pwd}:${regSalt}`).then((h) => setLiveDigest(h));
    } else {
      setLiveDigest('');
    }
  }, [password, regPassword, tab, regSalt]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Please enter your username or email address.');
      return;
    }

    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error || 'Password must be at least 8 characters with at least one special character.');
      return;
    }

    const res = db.authenticate(identifier);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    setSuccessMsg(`Welcome back, ${res.user.username}! Accessing ${targetDestination}...`);
    setTimeout(() => {
      onLoginSuccess(res.user!);
    }, 450);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regUsername.trim() || regUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const pwdCheck = validatePasswordPolicy(regPassword);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error || 'Password must be at least 8 characters with at least one special character.');
      return;
    }

    const computedHash = await hashPassword(`${regPassword}:${regSalt}`);
    const res = db.register(regUsername, regEmail, computedHash, regSalt, 'student');

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to create account.');
      return;
    }

    setSuccessMsg(`Account created! Entering ${targetDestination}...`);
    setTimeout(() => {
      onLoginSuccess(res.user!);
    }, 500);
  };

  // Single Fast Login Handler
  const handleFastLogin = () => {
    const user = db.getUser();
    setSuccessMsg('Fast Login successful! Entering Learning tab...');
    setTimeout(() => {
      onLoginSuccess(user);
    }, 250);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'calc(100dvh - 54px)',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top back navigation */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBackToLanding}
          className="btn-ghost"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Overview</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
          <ShieldCheck size={14} color="var(--green-3)" />
          <span>Protected by Web Crypto API</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--sheet)',
          borderRadius: 20,
          border: '2px solid var(--line-strong)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Destination Alert Banner */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--green-tile)',
            borderBottom: '1px solid var(--green-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          <Sparkles size={16} color="var(--green-3)" />
          <span>Sign in to unlock: <b>{targetDestination}</b></span>
        </div>

        {/* Card Header */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--green-tile)',
              border: '1.5px solid var(--green-3)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              color: 'var(--ink)',
            }}
          >
            <Lock size={24} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: 'var(--ink)' }}>
            CryptoScale Authentication
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
            Access client-side 3D simulations, real-world cyberattack scenarios, and record your mastery XP.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            padding: '4px',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            style={{
              padding: '10px',
              borderRadius: 8,
              border: 0,
              background: tab === 'signin' ? 'var(--sheet)' : 'transparent',
              color: tab === 'signin' ? 'var(--ink)' : 'var(--muted)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: tab === 'signin' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            style={{
              padding: '10px',
              borderRadius: 8,
              border: 0,
              background: tab === 'register' ? 'var(--sheet)' : 'transparent',
              color: tab === 'register' ? 'var(--ink)' : 'var(--muted)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: tab === 'register' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Create Account
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Prominent Fast Login Button */}
          <div>
            <button
              type="button"
              onClick={handleFastLogin}
              className="btn-pop"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'var(--green-tile)',
                color: 'var(--ink)',
                border: '2px solid var(--green-3)',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
              }}
            >
              <Zap size={20} fill="var(--rust)" color="var(--rust)" />
              <span>Fast Login</span>
              <ArrowRight size={17} />
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 6 }}>
              Instant 1-click access · No password required
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>or with credentials</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(208, 104, 58, 0.15)',
                border: '1.5px solid var(--rust)',
                color: 'var(--rust)',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--green-tile)',
                border: '1.5px solid var(--green-3)',
                color: 'var(--ink)',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color="var(--green-3)" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                  Handle or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. CryptoStudent or student@cryptoscale.edu"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 36px',
                      borderRadius: 10,
                      border: '1.5px solid var(--line-strong)',
                      background: 'var(--paper)',
                      color: 'var(--ink)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />
                  <User
                    size={16}
                    color="var(--muted)"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>Password</label>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Min 8 chars + 1 special char</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 36px',
                      borderRadius: 10,
                      border: '1.5px solid var(--line-strong)',
                      background: 'var(--paper)',
                      color: 'var(--ink)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock
                    size={16}
                    color="var(--muted)"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      color: 'var(--muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Live Policy Indicators */}
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: password.length >= 8 ? 'var(--green-3)' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {password.length >= 8 ? '✓' : '○'} 8+ characters
                  </span>
                  <span style={{ color: /[^a-zA-Z0-9]/.test(password) ? 'var(--green-3)' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} 1+ special char (!@#$...)
                  </span>
                </div>
              </div>

              {/* Cryptographic hash preview */}
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  color: 'var(--ink-2)',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
                  CLIENT-SIDE SHA-256 HASH:
                </div>
                <div style={{ wordBreak: 'break-all', opacity: 0.85 }}>
                  {liveDigest ? `0x${liveDigest.substring(0, 32)}...` : 'Enter password to inspect hash'}
                </div>
              </div>

              <button
                type="submit"
                className="btn-pop"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 10,
                  fontSize: 14.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span>Enter Course →</span>
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                  Handle / Alias
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. Alice_Cyber"
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@university.edu"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>
                    Password
                  </label>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: regPassword.length >= 8 ? 'var(--green-3)' : 'var(--muted)' }}>
                      {regPassword.length >= 8 ? '✓ 8+ chars' : '○ 8+ chars'}
                    </span>
                    <span style={{ color: /[^a-zA-Z0-9]/.test(regPassword) ? 'var(--green-3)' : 'var(--muted)' }}>
                      {/[^a-zA-Z0-9]/.test(regPassword) ? '✓ 1+ special char' : '○ 1+ special char'}
                    </span>
                  </div>
                </div>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 8 chars + special char (e.g. Pass@123)"
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
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>Create Account &amp; Start Course</span>
                <Sparkles size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

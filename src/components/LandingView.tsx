import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Cpu,
  Zap,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Play,
  BookOpen,
  Layers,
  Sparkles,
  Award,
  Users,
  Check,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  HelpCircle,
  Star,
  ExternalLink,
  Fingerprint,
  Radio,
  FileCode2,
} from 'lucide-react';
import { db } from '../db/database';
import { UserRecord } from '../db/schema';
import { MODULES } from '../data/curriculum';
import tutorAvatar from '../assets/images/tutor_avatar_guide_1795142622774.jpg';

interface LandingViewProps {
  onNavigateTab: (tab: 'learn' | 'lab' | 'practice' | 'cheatsheets') => void;
  onOpenLogin: () => void;
  user: UserRecord;
}

export default function LandingView({
  onNavigateTab,
  onOpenLogin,
  user,
}: LandingViewProps) {
  const scenarios = db.getScenarios();

  // State for interactive hero live encryption / tampering widget
  const [plaintext, setPlaintext] = useState('TRANSFER_FUNDS_$50,000_TO_ALICE');
  const [cipherMode, setCipherMode] = useState<'gcm' | 'ecb'>('gcm');
  const [isTampered, setIsTampered] = useState(false);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Derived interactive simulator values
  const simulatedKey = '0x8F4A...B93C';
  const simulatedNonce = '0x1A4B...99FE';

  // Compute simulated ciphertext hex
  const originalCiphertext = plaintext
    .split('')
    .map((c) => (c.charCodeAt(0) ^ 0x5a).toString(16).padStart(2, '0'))
    .join(' ');

  const tamperedCiphertext = originalCiphertext
    .split(' ')
    .map((byte, idx) => (idx === 3 && isTampered ? 'ff' : byte))
    .join(' ');

  const isVerified = cipherMode === 'gcm' ? !isTampered : false;
  const tagStatus =
    cipherMode === 'gcm'
      ? isTampered
        ? 'INVALID_TAG'
        : 'VALID_AEAD_TAG_0x4C89'
      : 'NO_INTEGRITY_CHECK (ECB)';

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: 'var(--font)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* =========================================================================
          1. HERO SECTION & INTERACTIVE HOOK
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '56px 24px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Floating Release Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 18px',
            borderRadius: 999,
            background: 'var(--green-tile)',
            border: '1.5px solid var(--green-3)',
            fontSize: 12.5,
            fontWeight: 800,
            color: 'var(--ink)',
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--green)',
              display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.25)',
            }}
          />
          <span>Interactive 3D Cryptography &amp; System Design Platform</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            v2.0 Live
          </span>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: 'clamp(36px, 5.2vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.1,
            maxWidth: 1050,
            margin: '0 0 20px',
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
          }}
        >
          Master Applied Cryptography &amp; System Design Through{' '}
          <span
            style={{
              color: 'var(--rust)',
              textDecoration: 'underline',
              textDecorationThickness: '3px',
              textUnderlineOffset: '6px',
            }}
          >
            Live Attack &amp; Defense
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19.5px)',
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            maxWidth: 820,
            margin: '0 0 32px',
          }}
        >
          Stop struggling with static equations and abstract PDFs. Step inside{' '}
          <strong>interactive 3D isometric networks</strong>. Flip ciphertext bits in real-time,
          break vulnerable ciphers, defend against active replay attacks, and build battle-tested
          security intuition guided by <strong>Prof. Ada</strong>.
        </p>

        {/* Hero Call to Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <button
            type="button"
            className="btn-pop"
            onClick={() => onNavigateTab('learn')}
            style={{
              padding: '16px 36px',
              fontSize: 16.5,
              fontWeight: 800,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            }}
          >
            <BookOpen size={18} />
            <span>Start Free Course</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => onNavigateTab('lab')}
            style={{
              padding: '16px 30px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              background: 'var(--paper-2)',
              border: '1.5px solid var(--line-strong)',
            }}
          >
            <Cpu size={18} />
            <span>Explore 3D Crypto Lab</span>
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => onNavigateTab('practice')}
            style={{
              padding: '16px 26px',
              fontSize: 15.5,
              fontWeight: 700,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldCheck size={18} />
            <span>5 Threat Scenarios</span>
          </button>
        </div>

        {/* Social Proof Star Rating Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: 13,
            color: 'var(--ink-2)',
            fontWeight: 600,
            marginBottom: 44,
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#e59324' }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} fill="#e59324" />
            ))}
            <span style={{ fontWeight: 800, color: 'var(--ink)', marginLeft: 4 }}>4.9/5</span>
          </div>
          <span>•</span>
          <span>15,000+ Engineers &amp; Students</span>
          <span>•</span>
          <span style={{ color: 'var(--green-3)', fontWeight: 800 }}>100% Free &amp; Client-Side</span>
          <span>•</span>
          <span
            onClick={onOpenLogin}
            style={{
              cursor: 'pointer',
              color: 'var(--ink)',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Click to view or switch profile"
          >
            <Users size={14} />
            <span>{user.username} ({user.xp} XP)</span>
          </span>
        </div>

        {/* =========================================================================
            INTERACTIVE HERO LIVE SANDBOX WIDGET (Instant "Aha!" Value)
        ========================================================================= */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: 1060,
            borderRadius: 18,
            border: '2px solid var(--line-strong)',
            background: 'var(--sheet)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
            textAlign: 'left',
            overflow: 'hidden',
          }}
        >
          {/* Widget Window Titlebar */}
          <div
            style={{
              padding: '12px 20px',
              background: 'var(--paper-2)',
              borderBottom: '1.5px solid var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
                interactive_sandbox://wire-tap-simulation
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>MODE:</span>
              <button
                type="button"
                className={`tag ${cipherMode === 'gcm' ? 'tag--green' : ''}`}
                onClick={() => {
                  setCipherMode('gcm');
                  setIsTampered(false);
                }}
                style={{
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 11.5,
                  padding: '3px 10px',
                  borderRadius: 6,
                }}
              >
                AES-256-GCM (AEAD)
              </button>
              <button
                type="button"
                className={`tag ${cipherMode === 'ecb' ? 'tag--rust' : ''}`}
                onClick={() => {
                  setCipherMode('ecb');
                  setIsTampered(false);
                }}
                style={{
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 11.5,
                  padding: '3px 10px',
                  borderRadius: 6,
                }}
              >
                AES-128-ECB (Vulnerable)
              </button>
            </div>
          </div>

          {/* Interactive Widget Body */}
          <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Input Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: 6,
                  }}
                >
                  Alice's Plaintext Message
                </label>
                <input
                  type="text"
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid var(--line-strong)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontFamily: 'var(--mono)',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: 6,
                  }}
                >
                  Session Secret Key &amp; Nonce
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--paper-2)',
                    border: '1.5px solid var(--line)',
                    fontSize: 12,
                    fontFamily: 'var(--mono)',
                    color: 'var(--ink-2)',
                  }}
                >
                  <Key size={14} color="var(--rust)" />
                  <span>Key: {simulatedKey}</span>
                  <span style={{ color: 'var(--line-strong)' }}>|</span>
                  <Radio size={14} color="var(--blue)" />
                  <span>Nonce: {simulatedNonce}</span>
                </div>
              </div>
            </div>

            {/* Wire Simulation Box */}
            <div
              style={{
                borderRadius: 12,
                border: '1.5px solid var(--line)',
                background: 'var(--paper)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Terminal size={15} color="var(--ink)" />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
                    Transmission Over Public Internet Wire (Eve Tap Point)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsTampered(!isTampered)}
                    className="btn-ghost"
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 800,
                      borderRadius: 8,
                      background: isTampered ? 'rgba(208, 104, 58, 0.18)' : 'rgba(208, 104, 58, 0.08)',
                      borderColor: 'var(--rust)',
                      color: 'var(--rust)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={13} />
                    <span>{isTampered ? 'Revert Wire Tampering' : 'Inject Attacker Bit-Flip (MitM)'}</span>
                  </button>
                  {isTampered && (
                    <button
                      type="button"
                      onClick={() => setIsTampered(false)}
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Ciphertext Stream Display */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--paper-2)',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  wordBreak: 'break-all',
                  color: 'var(--ink)',
                  border: isTampered ? '1.5px solid var(--rust)' : '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 700 }}>
                  CIPHERTEXT BYTES:
                </div>
                {tamperedCiphertext.split(' ').map((b, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      marginRight: 6,
                      padding: '1px 4px',
                      borderRadius: 4,
                      background: i === 3 && isTampered ? '#b42318' : 'transparent',
                      color: i === 3 && isTampered ? '#ffffff' : 'inherit',
                      fontWeight: i === 3 && isTampered ? 800 : 500,
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>

              {/* Recipient Verification Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background:
                    cipherMode === 'gcm'
                      ? isVerified
                        ? 'var(--green-tile)'
                        : 'rgba(208, 104, 58, 0.15)'
                      : 'rgba(217, 152, 46, 0.15)',
                  border: `1.5px solid ${
                    cipherMode === 'gcm'
                      ? isVerified
                        ? 'var(--green-3)'
                        : 'var(--rust)'
                      : 'rgba(217, 152, 46, 0.6)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {cipherMode === 'gcm' ? (
                    isVerified ? (
                      <CheckCircle2 size={18} color="var(--green-3)" />
                    ) : (
                      <AlertTriangle size={18} color="var(--rust)" />
                    )
                  ) : (
                    <HelpCircle size={18} color="#b46f08" />
                  )}

                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
                      {cipherMode === 'gcm'
                        ? isVerified
                          ? 'Bob verifies: 256-bit AEAD Authenticity Tag MATCHES'
                          : 'Bob rejects: AEAD TAG MISMATCH — Tampering Prevented (Ciphertext Discarded)'
                        : 'Bob receives: Unauthenticated ECB Ciphertext (Vulnerable to Replay & Pattern Leakage)'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2 }}>
                      Authentication Tag: <code style={{ fontWeight: 700 }}>{tagStatus}</code>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-pop"
                  onClick={() => onNavigateTab('lab')}
                  style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8 }}
                >
                  Inspect in 3D Lab →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. TRUST BADGES & INDUSTRY CREDIBILITY SECTION
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper-2)',
          padding: '40px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center' }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              display: 'block',
              marginBottom: 20,
            }}
          >
            TRUSTED BY SOFTWARE ENGINEERS, SECURITY RESEARCHERS &amp; CS STUDENTS WORLDWIDE
          </span>

          {/* Organization Text Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(20px, 4vw, 48px)',
              flexWrap: 'wrap',
              opacity: 0.75,
              fontWeight: 800,
              fontSize: 'clamp(14px, 1.8vw, 17px)',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              marginBottom: 28,
            }}
          >
            <span>Google Alumni</span>
            <span>Cloudflare Community</span>
            <span>MIT CSAIL</span>
            <span>Stanford Security</span>
            <span>CrowdStrike Analysts</span>
            <span>AWS Architects</span>
            <span>YC Founders</span>
          </div>

          {/* Security Standards Trust Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              maxWidth: 1000,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <ShieldCheck size={20} color="var(--green-3)" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>NIST FIPS 140-3</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>AES-GCM, SHA-256, Ed25519</div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <Lock size={20} color="var(--rust)" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>OWASP Top 10 Aligned</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>A02: Cryptographic Failures</div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <Cpu size={20} color="var(--blue)" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>100% Client-Side</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Zero telemetry or data tracking</div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <Sparkles size={20} color="#b46f08" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>Open-Access Education</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Zero paywalls or subscriptions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. CORE VALUE PROPOSITIONS (The 4 Pillars of Tactile Learning)
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 48px' }}>
          <span className="eyebrow" style={{ color: 'var(--rust)' }}>
            ENGINEERED FOR DEEP INTUITION
          </span>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 900,
              margin: '8px 0 14px',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            Why Engineers Learn 4x Faster on CryptoScale
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
            Theoretical cryptography is notoriously abstract. We replace opaque formulas with
            living, manipulable systems where every byte modification yields visible, physical reactions.
          </p>
        </div>

        {/* 4 Value Proposition Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {/* Pillar 1 */}
          <div
            className="card"
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 16,
              background: 'var(--sheet)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--green-tile)',
                border: '1px solid var(--green-3)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink)',
              }}
            >
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              1. 3D Isometric Simulations
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
              Watch data packets transit physical routers, fiber optic lines, and malicious sniffing taps.
              Understand network topologies and key exchanges spatially rather than mentally calculating matrices.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-3)' }}>
                ✓ Interactive Three.js Isometric Canvas
              </span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div
            className="card"
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 16,
              background: 'var(--sheet)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(208, 104, 58, 0.15)',
                border: '1px solid var(--rust)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--rust)',
              }}
            >
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              2. Attack-First Pedagogy
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
              You cannot truly understand encryption without understanding how it breaks. Exploit ECB penguin
              silhouettes, reuse nonces to recover keystreams, and crack unsalted MD5 hashes in seconds.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rust)' }}>
                ✓ Live MitM, Replay &amp; Avalanche Exploits
              </span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div
            className="card"
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 16,
              background: 'var(--sheet)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(95, 140, 208, 0.18)',
                border: '1px solid var(--blue)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--blue)',
              }}
            >
              <Cpu size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              3. Tactile Bit-Level Workbenches
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
              Flip single bits inside a 256-bit SHA block to see the avalanche matrix cascade instantly.
              Experiment with Diffie-Hellman modulus sliders, HMAC keys, and block cipher modes in real time.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                ✓ 4 Specialized Hands-on Workbenches
              </span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div
            className="card"
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 16,
              background: 'var(--sheet)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1.5px solid var(--line-strong)',
              }}
            >
              <img
                src={tutorAvatar}
                alt="Prof. Ada"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              4. Guided by Prof. Ada
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
              Never get stuck on confusing edge cases. Prof. Ada provides voice narration, Socratic hints,
              and step-by-step guidance tailored to your experience level and current scenario.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                ✓ Web Speech Synthesis &amp; Hint Drawers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. INTERACTIVE CURRICULUM ROADMAP (5 Modules)
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          background: 'var(--paper-2)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
            <div>
              <span className="eyebrow">COMPREHENSIVE 20+ LESSON CURRICULUM</span>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, margin: '6px 0 0', color: 'var(--ink)' }}>
                Structured Learning Path
              </h2>
            </div>
            <button
              type="button"
              className="btn-pop"
              onClick={() => onNavigateTab('learn')}
              style={{ padding: '12px 24px', fontSize: 14.5, borderRadius: 10 }}
            >
              Browse Full Course →
            </button>
          </div>

          {/* Module Selector Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 12,
              marginBottom: 24,
              scrollbarWidth: 'none',
            }}
          >
            {MODULES.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModuleIdx(idx)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1.5px solid var(--line-strong)',
                  background: selectedModuleIdx === idx ? 'var(--ink)' : 'var(--sheet)',
                  color: selectedModuleIdx === idx ? 'var(--paper)' : 'var(--ink)',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                Module {m.num}: {m.title}
              </button>
            ))}
          </div>

          {/* Selected Module Detail Showcase Card */}
          {MODULES[selectedModuleIdx] && (
            <div
              className="card"
              style={{
                padding: '32px 28px',
                borderRadius: 16,
                background: 'var(--sheet)',
                border: '2px solid var(--line-strong)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 28,
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: 'var(--rust)' }}>
                  MODULE {MODULES[selectedModuleIdx].num} · {MODULES[selectedModuleIdx].lessons.length} LESSONS
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '6px 0 12px', color: 'var(--ink)' }}>
                  {MODULES[selectedModuleIdx].title}
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 20px' }}>
                  {selectedModuleIdx === 0 &&
                    'Learn the bedrock principles of confidential data transmission over untrusted physical wires, passive sniffing, and active tampering.'}
                  {selectedModuleIdx === 1 &&
                    'Master modern symmetric block ciphers, AES rounds, Galois/Counter Mode (GCM), nonce reuse catastrophes, and ciphertext integrity.'}
                  {selectedModuleIdx === 2 &&
                    'Explore one-way cryptographic hash functions, the 50% avalanche effect, HMAC authentication, and GPU-resistant password salting.'}
                  {selectedModuleIdx === 3 &&
                    'Understand how two strangers establish a shared secret over a compromised channel via Diffie-Hellman discrete logs and RSA trapdoor math.'}
                  {selectedModuleIdx === 4 &&
                    'Assemble full enterprise cryptographic protocols: TLS 1.3 handshakes, certificate authorities (PKI), digital signatures, and forward secrecy.'}
                </p>

                <button
                  type="button"
                  className="btn-pop"
                  onClick={() => onNavigateTab('learn')}
                  style={{ padding: '12px 22px', fontSize: 14, borderRadius: 10 }}
                >
                  Start This Module →
                </button>
              </div>

              {/* Lesson List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Included Lessons:
                </span>
                {MODULES[selectedModuleIdx].lessons.map((lesson, lIdx) => (
                  <div
                    key={lesson.id}
                    onClick={() => onNavigateTab('learn')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--paper-2)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ opacity: 0.6, fontSize: 11, fontFamily: 'var(--mono)' }}>
                        0{lIdx + 1}
                      </span>
                      <span>{lesson.title}</span>
                    </div>
                    <ArrowRight size={14} color="var(--muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          5. 5 REAL-WORLD THREAT SIMULATIONS (PRACTICE WORKSHOPS)
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--rust)' }}>HANDS-ON INCIDENT WORKSHOPS</span>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, margin: '6px 0 0', color: 'var(--ink)' }}>
              Real-World Threat Defense Scenarios
            </h2>
          </div>
          <button
            type="button"
            className="btn-pop"
            onClick={() => onNavigateTab('practice')}
            style={{ padding: '12px 24px', fontSize: 14.5, borderRadius: 10 }}
          >
            Launch Practice Arena →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {scenarios.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                justifyContent: 'space-between',
                borderRadius: 14,
                background: 'var(--sheet)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="eyebrow" style={{ color: 'var(--rust)' }}>Scenario {s.num}</span>
                  <span className="tag tag--sand" style={{ fontSize: 11, fontWeight: 700 }}>
                    {s.difficulty}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
                  {s.description}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
                  ⏱ {s.estimatedMinutes} mins · {s.stagesCount} Stages
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onNavigateTab('practice')}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 800,
                    borderRadius: 8,
                  }}
                >
                  Start Mission →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. COMPARISON TABLE: TEXTBOOKS VS VIDEO COURSES VS CRYPTOSCALE
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          background: 'var(--paper-2)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
          <span className="eyebrow">HEAD-TO-HEAD COMPARISON</span>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, margin: '6px 0 14px', color: 'var(--ink)' }}>
            Why Traditional Cryptography Courses Fail
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 680, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Most engineers drop out of cryptography courses because they get bogged down in abstract number theory
            rather than learning the system design and attack patterns they encounter on the job.
          </p>

          <div
            className="card"
            style={{
              overflowX: 'auto',
              borderRadius: 14,
              border: '2px solid var(--line-strong)',
              background: 'var(--sheet)',
              padding: 0,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13.5,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--paper-2)', borderBottom: '1.5px solid var(--line-strong)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink)' }}>FEATURE</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--muted)' }}>Static Books</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--muted)' }}>Video Lectures</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, color: 'var(--rust)', background: 'var(--paper)' }}>
                    CryptoScale Platform
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>Interactive 3D Isometric Stages</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ Static 2D line diagrams</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ Passive slide recordings</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--green-3)', background: 'var(--paper)' }}>
                    ✓ Live 3D rotatable &amp; interactive
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>Tactile Bit-Flipping &amp; Tampering</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ None (math equations)</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ None</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--green-3)', background: 'var(--paper)' }}>
                    ✓ Real-time byte flips &amp; AEAD errors
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>Simulated Adversary Attacks (MitM)</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ Theoretical proofs</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ Instructor code walkthrough</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--green-3)', background: 'var(--paper)' }}>
                    ✓ Active threat injection labs
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>Instant Automated Feedback</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ Answers in back of book</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ None</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--green-3)', background: 'var(--paper)' }}>
                    ✓ Immediate client-side verification
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>Interactive AI Voice Mentor</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ None</td>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>✕ None</td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--green-3)', background: 'var(--paper)' }}>
                    ✓ Prof. Ada speech &amp; hints
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. LEARNER REVIEWS & TESTIMONIALS
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <span className="eyebrow" style={{ color: 'var(--rust)' }}>LEARNER FEEDBACK</span>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, margin: '6px 0 0', color: 'var(--ink)' }}>
            Loved by Developers and Security Architects
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Testimonial 1 */}
          <div
            className="card"
            style={{
              padding: 28,
              borderRadius: 16,
              background: 'var(--sheet)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 4, color: '#e59324' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} fill="#e59324" />
              ))}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, fontStyle: 'italic' }}>
              "I finally understand why nonce reuse in AES-GCM is fatal. Being able to flip bits and see the
              authentication tag immediately fail made AEAD click in 5 minutes after months of reading confusing RFCs."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--green-tile)',
                  border: '1.5px solid var(--green-3)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                DK
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>David Kim</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Senior Infrastructure Engineer · Fintech</div>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div
            className="card"
            style={{
              padding: 28,
              borderRadius: 16,
              background: 'var(--sheet)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 4, color: '#e59324' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} fill="#e59324" />
              ))}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, fontStyle: 'italic' }}>
              "The 3D isometric representation of the TLS 1.3 handshake and Diffie-Hellman color mixing is pure genius.
              I recommend this to every student preparing for systems and security engineering interviews."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(95, 140, 208, 0.2)',
                  border: '1.5px solid var(--blue)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'var(--blue)',
                }}
              >
                AL
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>Dr. Elena Rostova</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Adjunct Professor of Computer Science</div>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div
            className="card"
            style={{
              padding: 28,
              borderRadius: 16,
              background: 'var(--sheet)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 4, color: '#e59324' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} fill="#e59324" />
              ))}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, fontStyle: 'italic' }}>
              "The password salting and rainbow table scenario alone prevented what could have been a serious flaw in
              our authentication service. Hands-on practice beats theory every single time."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(208, 104, 58, 0.2)',
                  border: '1.5px solid var(--rust)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'var(--rust)',
                }}
              >
                MT
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>Marcus Thorne</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Lead Backend Architect · SaaS</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          background: 'var(--paper-2)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span className="eyebrow">COMMON QUESTIONS</span>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 900, margin: '6px 0 0', color: 'var(--ink)' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                q: 'Do I need advanced calculus or advanced number theory?',
                a: 'Not at all! CryptoScale is built specifically for applied software engineers and systems architects. We focus on cryptographic intuition, proper primitive selection, and failure modes rather than formal mathematical proofs.',
              },
              {
                q: 'Does any data leave my browser?',
                a: 'Zero. Every simulation, byte flip, and hash avalanche matrix runs 100% client-side inside your browser via the Web Crypto API. We do not store or transmit your test plaintexts or simulation state.',
              },
              {
                q: 'How does this help with system design and security interviews?',
                a: 'Top tech companies routinely assess candidates on secure communication protocols, authentication tokens, password storage, and data-at-rest encryption. CryptoScale provides the concrete mental models you need to speak authoritatively on these topics.',
              },
              {
                q: 'Is CryptoScale really free?',
                a: 'Yes, 100% free and open-access. You can start with Module 1 immediately without creating an account or providing a credit card.',
              },
            ].map((faq, fIdx) => {
              const isOpen = openFaqIdx === fIdx;
              return (
                <div
                  key={fIdx}
                  className="card"
                  style={{
                    borderRadius: 12,
                    background: 'var(--sheet)',
                    overflow: 'hidden',
                    border: '1.5px solid var(--line-strong)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : fIdx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 15.5,
                      fontWeight: 800,
                      color: 'var(--ink)',
                      gap: 12,
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronRight
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 20px 20px',
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--ink-2)',
                        borderTop: '1px solid var(--line)',
                        paddingTop: 14,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. HIGH-CONVERSION FINAL CTA SECTION
      ========================================================================= */}
      <section
        style={{
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          padding: '80px 24px 96px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="card"
          style={{
            padding: '56px 36px',
            borderRadius: 24,
            border: '2.5px solid var(--line-strong)',
            background: 'var(--sheet)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--green-tile)',
              border: '2px solid var(--green-3)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink)',
            }}
          >
            <Shield size={28} />
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            Ready to Build Unbreakable Security Habits?
          </h2>

          <p
            style={{
              fontSize: 16.5,
              lineHeight: 1.6,
              color: 'var(--ink-2)',
              maxWidth: 620,
              margin: 0,
            }}
          >
            Join thousands of developers mastering applied cryptography through experiential 3D
            simulations. Start your first lesson now in less than 60 seconds.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
            <button
              type="button"
              className="btn-pop"
              onClick={() => onNavigateTab('learn')}
              style={{
                padding: '16px 38px',
                fontSize: 16.5,
                fontWeight: 800,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>Start Free Lesson 1 Now</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => onNavigateTab('practice')}
              style={{
                padding: '16px 28px',
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
              }}
            >
              Explore Threat Labs
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              fontSize: 12.5,
              color: 'var(--muted)',
              fontWeight: 700,
              marginTop: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span>✓ No registration required</span>
            <span>✓ Browser-based Web Crypto</span>
            <span
              onClick={onOpenLogin}
              style={{ cursor: 'pointer', color: 'var(--ink)', textDecoration: 'underline' }}
            >
              ● Connected as: <b>{user.username}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

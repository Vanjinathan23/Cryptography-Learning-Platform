import { useEffect, useMemo, useRef, useState } from 'react';
import {
  block,
  device,
  hackerNode,
  link,
  routerNode,
} from '../data/cryptoHelpers';
import { modPow } from '../data/labData';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';
import TutorGuideCard from './TutorGuideCard';

type StageNum = 1 | 2 | 3 | 4 | 5;

const AMOUNTS = ['500', '1200', '2500'];
const DH_P = 23;
const DH_G = 5;
const BANK_PRIV_B = 15;
const BANK_PUB_B = modPow(DH_G, BANK_PRIV_B, DH_P); // 5^15 mod 23 = 19

const STAGE_META: Array<{ num: StageNum; label: string }> = [
  { num: 1, label: 'Spot Wi-Fi Trap' },
  { num: 2, label: 'Check Cert' },
  { num: 3, label: 'Mix Share A' },
  { num: 4, label: 'Derive Key S' },
  { num: 5, label: 'Forward Secrecy' },
];

export default function Scenario3GuidedPractice({
  theme,
  onSecured,
}: {
  theme: 'light' | 'dark';
  onSecured?: () => void;
}) {
  const [stage, setStage] = useState<StageNum>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<StageNum>(1);

  // Stage 1: Transfer amount on plain HTTP
  const [amount, setAmount] = useState('2500');
  const [stage1Sent, setStage1Sent] = useState(false);

  // Stage 2: Inspect Evil-Twin X.509 certificate
  const [certChoice, setCertChoice] = useState<'pending' | 'trust' | 'reject'>('pending');

  // Stage 3: Manual Diffie-Hellman Public Share A = 5^a mod 23
  const [clientA, setClientA] = useState(2); // Easy choices: 2, 3, 4
  const [shareAInput, setShareAInput] = useState('');
  const [shareASent, setShareASent] = useState(false);

  // Stage 4: Derive Shared Secret S = B^a mod 23
  const [secretSInput, setSecretSInput] = useState('');

  // Stage 5: Harvest Now Decrypt Later -> Ephemeral ECDHE rescue
  const [pfsStep, setPfsStep] = useState<'static-risk' | 'leaked' | 'ecdhe-on' | 'secured'>('static-risk');

  const [tutorOverride, setTutorOverride] = useState<{
    mood: 'neutral' | 'happy' | 'warn' | 'hint';
    msg: string;
    key: string;
  } | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageEngineRef = useRef<StageEngine | null>(null);

  const amtDisplay = `$${amount || '2500'}`;
  const expectedA = modPow(DH_G, clientA, DH_P);
  const expectedS = modPow(BANK_PUB_B, clientA, DH_P);

  const shareACorrect = parseInt(shareAInput, 10) === expectedA;
  const secretSCorrect = parseInt(secretSInput, 10) === expectedS;

  useEffect(() => {
    if (pfsStep === 'secured') {
      onSecured?.();
    }
  }, [pfsStep, onSecured]);

  const unlockAndGo = (next: StageNum) => {
    setMaxUnlocked((prev) => (next > prev ? next : prev));
    setStage(next);
    setTutorOverride(null);
  };

  const handlePickClientA = (a: number) => {
    setClientA(a);
    setShareAInput('');
    setShareASent(false);
    setSecretSInput('');
    setTutorOverride(null);
  };

  const handleShareAInput = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
    setShareAInput(cleaned);
    if (!cleaned) return;
    const n = parseInt(cleaned, 10);
    if (n === expectedA) {
      setTutorOverride({
        mood: 'happy',
        msg: `Spot on! 5^${clientA} mod 23 = ${expectedA}. Even if Eve sees A = ${expectedA} on the airport Wi-Fi, she cannot reverse it to find your secret a = ${clientA}!`,
        key: `s3-a-ok-${expectedA}`,
      });
    } else if (cleaned.length >= String(expectedA).length) {
      const rawPow = Math.pow(DH_G, clientA);
      setTutorOverride({
        mood: 'warn',
        msg: `Not quite ${n}! Compute 5^${clientA} = ${rawPow}, then take the remainder when dividing ${rawPow} by 23 → ${expectedA}.`,
        key: `s3-a-bad-${n}`,
      });
    }
  };

  const handleSecretSInput = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
    setSecretSInput(cleaned);
    if (!cleaned) return;
    const n = parseInt(cleaned, 10);
    if (n === expectedS) {
      setTutorOverride({
        mood: 'happy',
        msg: `Magic! Both your laptop and the bank arrived at the EXACT same secret key S = ${expectedS} — without ever sending ${expectedS} over the Wi-Fi!`,
        key: `s3-s-ok-${expectedS}`,
      });
    } else if (cleaned.length >= String(expectedS).length) {
      setTutorOverride({
        mood: 'warn',
        msg: `Almost! Take Bank’s public share ${BANK_PUB_B} to the power of your secret ${clientA}, then divide by 23. The remainder is ${expectedS}!`,
        key: `s3-s-bad-${n}`,
      });
    }
  };

  const handleRestartAll = () => {
    setStage(1);
    setMaxUnlocked(1);
    setStage1Sent(false);
    setCertChoice('pending');
    setClientA(2);
    setShareAInput('');
    setShareASent(false);
    setSecretSInput('');
    setPfsStep('static-risk');
    setTutorOverride(null);
  };

  const liveScene = useMemo((): StageScene => {
    if (stage === 1) {
      return {
        entities: {
          traveler: device(-15, -2, {
            form: 'laptop',
            label: 'Traveler',
            tags: [{ text: stage1Sent ? `HTTP ${amtDisplay}` : `Transfer ${amtDisplay}`, tone: stage1Sent ? 'red' : 'blue', icon: 'creditCard' }],
          }),
          evil: hackerNode(
            0,
            -2,
            'Evil-Twin Wi-Fi',
            [stage1Sent ? { text: `HIJACKED ${amtDisplay}!`, tone: 'red', icon: 'skull' } : { text: 'Free_Airport_WiFi', tone: 'amber', icon: 'wifi' }],
            { heat: stage1Sent ? 0.9 : 0.3 }
          ),
          bank: block(15, -2, {
            color: 'purple',
            glyph: 'building',
            label: ['bank.example'],
            sub: stage1Sent ? 'wrong account!' : 'waiting…',
          }),
        },
        links: {
          te: link('traveler', 'evil', ['traveler', 'evil'], { label: stage1Sent ? 'plain HTTP' : 'open Wi-Fi', labelTone: stage1Sent ? 'red' : 'blue' }),
          eb: link('evil', 'bank', ['evil', 'bank'], { label: stage1Sent ? 'rewritten!' : 'internet', labelTone: stage1Sent ? 'red' : 'gray' }),
        },
        flows: stage1Sent ? [{ route: ['te', 'eb'], kind: 'poison', rate: 0.95 }] : [],
      };
    }

    if (stage === 2) {
      const rejected = certChoice === 'reject';
      const trusted = certChoice === 'trust';
      return {
        entities: {
          traveler: device(-15, -2, {
            form: 'laptop',
            label: 'Your Browser',
            tags: [
              {
                text: rejected ? 'Blocked Fake Cert ✓' : trusted ? 'Clicked Proceed!' : 'Inspect Cert Below',
                tone: rejected ? 'green' : trusted ? 'red' : 'amber',
                icon: rejected ? 'shield' : 'alert',
              },
            ],
          }),
          evil: hackerNode(
            0,
            -2,
            'Evil-Twin Router',
            [
              {
                text: rejected ? 'Spoof Failed ✕' : trusted ? `Reads ${amtDisplay}!` : 'Sending Self-Signed Cert',
                tone: rejected ? 'green' : 'red',
                icon: rejected ? 'ban' : 'fileKey',
              },
            ],
            { heat: trusted ? 0.9 : rejected ? 0 : 0.4 }
          ),
          bank: block(15, -2, {
            color: 'purple',
            glyph: 'building',
            label: ['Real Bank'],
            sub: rejected ? 'DigiCert Root ✓' : 'impersonated!',
          }),
          ca: block(0, 10, {
            color: rejected ? 'green' : 'slab',
            glyph: 'fileKey',
            s: 3.4,
            h: 34,
            label: ['Trusted', 'Root CA'],
            sub: rejected ? 'verified chain ✓' : trusted ? 'bypassed!' : 'checking…',
          }),
        },
        links: {
          te: link('traveler', 'evil', ['traveler', 'evil'], {
            label: rejected ? 'fake cert dropped' : trusted ? 'MITM TLS tunnel!' : 'X.509 cert',
            labelTone: rejected ? 'green' : 'red',
            fail: rejected ? 0.95 : 0,
          }),
          eb: link('evil', 'bank', ['evil', 'bank'], {
            label: rejected ? 'direct to real bank' : 'MITM proxy',
            labelTone: rejected ? 'green' : 'red',
          }),
          tc: link('traveler', 'ca', ['traveler', 'ca'], {
            style: 'dashed',
            label: rejected ? 'CA check ✓' : 'check issuer',
            labelTone: rejected ? 'green' : 'amber',
          }),
        },
        flows:
          certChoice === 'pending'
            ? [{ route: ['tc'], kind: 'ping', rate: 0.6 }]
            : [
                { route: ['te', 'eb'], kind: rejected ? 'kill' : 'poison', rate: 0.9 },
                { route: ['tc'], kind: rejected ? 'msg' : 'fail', rate: 0.7 },
              ],
      };
    }

    if (stage === 3 || stage === 4) {
      const doneS = stage === 4 && secretSCorrect;
      return {
        entities: {
          traveler: device(-15, -2, {
            form: 'laptop',
            label: 'Your Laptop',
            tags: [
              { text: `Private a=${clientA}`, tone: 'blue', icon: 'key' },
              {
                text: doneS ? `Shared S=${expectedS} ✓` : shareASent || stage === 4 ? `Public A=${expectedA}` : 'Compute A below',
                tone: doneS ? 'green' : shareACorrect ? 'green' : 'amber',
                icon: doneS ? 'lock' : 'hash',
              },
            ],
          }),
          wire: routerNode(0, -2, ['Public Wi-Fi', `p=${DH_P}, g=${DH_G}`], `A=${shareASent || stage === 4 ? expectedA : '?'} ↔ B=${BANK_PUB_B}`, [
            { text: 'Eve cannot find S!', tone: 'green', icon: 'eyeOff' },
          ]),
          bank: block(15, -2, {
            color: 'purple',
            glyph: 'building',
            label: ['Real Bank'],
            sub: doneS ? `Shared S=${expectedS} ✓` : `Public B=${BANK_PUB_B}`,
            tags: [{ text: doneS ? 'Keys Match ✓' : `Private b=${BANK_PRIV_B}`, tone: doneS ? 'green' : 'violet', icon: 'key' }],
          }),
        },
        links: {
          tw: link('traveler', 'wire', ['traveler', 'wire'], {
            heads: 'both',
            label: shareASent || stage === 4 ? `A = ${expectedA}` : 'compute A',
            labelTone: shareASent || stage === 4 ? 'green' : 'blue',
          }),
          wb: link('wire', 'bank', ['wire', 'bank'], {
            heads: 'both',
            label: `B = ${BANK_PUB_B}`,
            labelTone: 'green',
          }),
        },
        flows:
          shareASent || stage === 4
            ? [{ route: ['tw', 'wb'], kind: doneS ? 'msg' : 'write', rate: 0.9, bounce: true }]
            : [],
      };
    }

    // Stage 5: Forward Secrecy (ECDHE)
    const isSecured = pfsStep === 'secured';
    const isEcdhe = pfsStep === 'ecdhe-on' || isSecured;
    const isLeaked = pfsStep === 'leaked';
    return {
      entities: {
        traveler: device(-15, -2, {
          form: 'laptop',
          label: 'TLS 1.3 Client',
          tags: [
            {
              text: isEcdhe ? 'Ephemeral ECDHE ✓' : 'Static RSA (Risk!)',
              tone: isEcdhe ? 'green' : 'red',
              icon: isEcdhe ? 'shield' : 'alert',
            },
          ],
        }),
        bank: block(15, -2, {
          color: 'purple',
          glyph: 'building',
          label: ['bank.example'],
          sub: isEcdhe ? 'Keys Erased After Session' : 'Reused Static Key',
        }),
        eve: hackerNode(
          0,
          9,
          'Harvest-Now Attacker',
          [
            {
              text: isSecured
                ? 'Past Traffic Unbreakable ✓'
                : isLeaked
                  ? `Decrypted Old ${amtDisplay}!`
                  : isEcdhe
                    ? 'Test Key Leak Now!'
                    : 'Recording Ciphertext…',
              tone: isSecured ? 'green' : isLeaked ? 'red' : 'amber',
              icon: isSecured ? 'ban' : 'clock',
            },
          ],
          { heat: isLeaked ? 0.9 : 0 }
        ),
      },
      links: {
        tb: link('traveler', 'bank', ['traveler', 'bank'], {
          label: isEcdhe ? `TLS 1.3 ECDHE (${amtDisplay})` : 'Static RSA TLS',
          labelTone: isEcdhe ? 'green' : 'amber',
        }),
        be: link('bank', 'eve', ['bank', 'eve'], {
          style: 'dashed',
          label: isSecured ? 'leaked cert key useless!' : isLeaked ? 'server key leaked!' : 'recorded pcap',
          labelTone: isSecured ? 'green' : 'red',
          fail: isSecured ? 0.95 : 0,
        }),
      },
      flows: [
        { route: ['tb'], kind: isEcdhe ? 'empty' : 'write', rate: 0.85 },
        { route: ['be'], kind: isSecured ? 'kill' : 'poison', rate: 0.85 },
      ],
    };
  }, [stage, amtDisplay, stage1Sent, certChoice, clientA, expectedA, expectedS, shareACorrect, shareASent, secretSCorrect, pfsStep]);

  useEffect(() => {
    if (!canvasHostRef.current) return;
    const engine = new StageEngine(canvasHostRef.current);
    stageEngineRef.current = engine;
    return () => {
      engine.clear();
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      stageEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!stageEngineRef.current) return;
    stageEngineRef.current.frame([liveScene]);
    stageEngineRef.current.goTo(liveScene);
  }, [liveScene]);

  useEffect(() => {
    stageEngineRef.current?.retheme();
  }, [theme]);

  const tutorState = useMemo(() => {
    const getHint = (): string => {
      if (stage === 1) return 'Pick a transfer amount like $2,500 and click "Send Over Plain HTTP" to watch the fake airport Wi-Fi intercept it.';
      if (stage === 2) return 'Look at the Issuer field: "FreeAirport_SelfSigned" is NOT a trusted Root CA! Click "Reject Fake Cert & Require Trusted Root CA".';
      if (stage === 3) {
        const raw = Math.pow(DH_G, clientA);
        return `Compute 5^${clientA} = ${raw}. Divide ${raw} by 23 — the remainder is ${expectedA}! Type ${expectedA} or click "Help Me Compute A".`;
      }
      if (stage === 4) {
        return `Take the bank’s share B = ${BANK_PUB_B} to the power of your secret a = ${clientA}, then take mod 23. The remainder is ${expectedS}!`;
      }
      if (pfsStep === 'static-risk') return 'Step 1: Click "Simulate Old Static RSA Key Leak" to see how Eve retroactively decrypts old recorded traffic.';
      if (pfsStep === 'leaked') return 'Step 2: Click "Enable Ephemeral ECDHE (Forward Secrecy)" so every session uses a throwaway key.';
      if (pfsStep === 'ecdhe-on') return 'Step 3: Click "Test Server Key Leak Again" to verify past recordings stay permanently unreadable!';
      return 'Scenario 03 complete! Try Scenario 04 next.';
    };

    if (tutorOverride) return { mood: tutorOverride.mood, message: tutorOverride.msg, key: tutorOverride.key, hint: getHint() };

    if (stage === 1) {
      return stage1Sent
        ? {
            mood: 'warn' as const,
            message: `Alert! On plain HTTP, the Evil-Twin airport router read your ${amtDisplay} wire instantly! Click Next to check the bank’s X.509 certificate.`,
            key: `s3-1-sent-${amtDisplay}`,
            hint: getHint(),
          }
        : {
            mood: 'neutral' as const,
            message: `You’re at Terminal 4 on Free Airport Wi-Fi! Pick a bank transfer amount and test what happens over plain HTTP.`,
            key: 's3-1-start',
            hint: getHint(),
          };
    }

    if (stage === 2) {
      if (certChoice === 'trust') {
        return {
          mood: 'warn' as const,
          message: `Trap! Clicking "Proceed Anyway" created an encrypted tunnel straight to the HACKER! Never bypass certificate warnings — click Reject Fake Cert!`,
          key: 's3-2-trust',
          hint: getHint(),
        };
      }
      if (certChoice === 'reject') {
        return {
          mood: 'happy' as const,
          message: `Great catch! Your browser checked the Trusted Root CA, rejected the forged airport certificate, and found the real bank. Next, let’s mix a secret key in public!`,
          key: 's3-2-reject',
          hint: getHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Inspect the certificate below carefully before trusting it! Check who signed it — is it a real Certificate Authority or a self-signed fake?`,
        key: 's3-2-start',
        hint: getHint(),
      };
    }

    if (stage === 3) {
      return shareASent
        ? {
            mood: 'happy' as const,
            message: `Sent Public Share A = ${expectedA} across the airport Wi-Fi! Notice your secret a = ${clientA} stayed on your laptop. Click Next to derive the shared key!`,
            key: `s3-3-sent-${expectedA}`,
            hint: getHint(),
          }
        : {
            mood: 'neutral' as const,
            message: `Let’s do real Diffie-Hellman math with friendly numbers! Pick your secret a = ${clientA}, compute Public Share A = 5^${clientA} mod 23, and type your answer below.`,
            key: `s3-3-start-${clientA}`,
            hint: getHint(),
          };
    }

    if (stage === 4) {
      return secretSCorrect
        ? {
            mood: 'happy' as const,
            message: `You did it! Both you and the real bank now hold identical secret key S = ${expectedS} — even though Eve watched every message! Click Next for the final Forward Secrecy test.`,
            key: `s3-4-done-${expectedS}`,
            hint: getHint(),
          }
        : {
            mood: 'neutral' as const,
            message: `The bank sent back Public Share B = ${BANK_PUB_B}. Now combine it with your private secret a = ${clientA} locally (S = ${BANK_PUB_B}^${clientA} mod 23) to unlock the shared key!`,
            key: `s3-4-start-${clientA}`,
            hint: getHint(),
          };
    }

    if (pfsStep === 'static-risk') {
      return {
        mood: 'warn' as const,
        message: `One final real-world threat: Eve silently recorded today’s encrypted traffic! Click Step 1 below to see what happens if the bank uses Static RSA and leaks its key next year.`,
        key: 's3-5-start',
        hint: getHint(),
      };
    }
    if (pfsStep === 'leaked') {
      return {
        mood: 'warn' as const,
        message: `Uh oh! Because Static RSA reused the bank’s permanent key, leaking it unlocked last year’s ${amtDisplay} session! Click Step 2 to enable Ephemeral ECDHE!`,
        key: 's3-5-leaked',
        hint: getHint(),
      };
    }
    if (pfsStep === 'ecdhe-on') {
      return {
        mood: 'neutral' as const,
        message: `Ephemeral ECDHE is active — session keys are generated fresh and erased right after checkout. Click Step 3 to test a future server key leak!`,
        key: 's3-5-ecdhe',
        hint: getHint(),
      };
    }
    return {
      mood: 'happy' as const,
      message: `Mission complete! Even if the bank’s long-term key leaks years later, Eve’s recordings stay unbreakable forever. You mastered Airport Wi-Fi Banking!`,
      key: 's3-5-done',
      hint: getHint(),
    };
  }, [tutorOverride, stage, stage1Sent, amtDisplay, certChoice, clientA, expectedA, expectedS, shareASent, secretSCorrect, pfsStep]);

  return (
    <div className="guided-layout">
      <section className="guided-main">
        <nav className="journey-bar" aria-label="Scenario 03 guided workout steps">
          {STAGE_META.map((s) => {
            const isCurrent = stage === s.num;
            const isDone = s.num < maxUnlocked || (s.num === 5 && pfsStep === 'secured');
            const isLocked = s.num > maxUnlocked;
            return (
              <button
                key={s.num}
                type="button"
                className={`journey-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
                disabled={isLocked}
                onClick={() => {
                  setStage(s.num);
                  setTutorOverride(null);
                }}
              >
                <span className="journey-step__dot">
                  {isDone ? <span dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} /> : s.num}
                </span>
                <span className="journey-step__label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="card stage guided-stage">
          <div className="stage__hud">
            <div className="chip" data-level="none">
              <span className="chip__label">Step</span>
              <span className="chip__value">
                {stage} / 5 · {STAGE_META[stage - 1].label}
              </span>
            </div>
            <div className="chip" data-level="none">
              <span className="chip__label">Wire Amount</span>
              <span className="chip__value">{amtDisplay}</span>
            </div>
            <div
              className="chip"
              data-level={
                stage === 1
                  ? stage1Sent
                    ? 'bad'
                    : 'none'
                  : stage === 2
                    ? certChoice === 'reject'
                      ? 'good'
                      : certChoice === 'trust'
                        ? 'bad'
                        : 'warn'
                    : stage === 3
                      ? shareACorrect
                        ? 'good'
                        : 'warn'
                      : stage === 4
                        ? secretSCorrect
                          ? 'good'
                          : 'warn'
                        : pfsStep === 'secured'
                          ? 'good'
                          : 'bad'
              }
            >
              <span className="chip__label">Bank Tunnel</span>
              <span className="chip__value">
                {stage === 1
                  ? stage1Sent
                    ? 'HTTP Hijacked!'
                    : 'Ready'
                  : stage === 2
                    ? certChoice === 'reject'
                      ? 'Root CA Verified ✓'
                      : certChoice === 'trust'
                        ? 'MITM Active!'
                        : 'Inspect Cert'
                    : stage === 3
                      ? shareACorrect
                        ? `A = ${expectedA} ✓`
                        : 'Compute A'
                      : stage === 4
                        ? secretSCorrect
                          ? `S = ${expectedS} ✓`
                          : 'Compute S'
                        : pfsStep === 'secured'
                          ? 'Forward Secret ✓'
                          : 'Static RSA Risk'}
              </span>
            </div>
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        <section className="card step-workout-card">
          {stage === 1 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 1 of 5 · Untrusted Public Wi-Fi</span>
                <h2>Try Banking on “Free_Airport_WiFi” Without HTTPS</h2>
                <p>Choose your transfer amount and send it over plain HTTP to see what an Evil-Twin router does.</p>
              </div>
              <div className="word-picker-row">
                <div className="preset-row">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`preset-btn ${amount === a ? 'is-on' : ''}`}
                      onClick={() => {
                        setAmount(a);
                        setStage1Sent(false);
                      }}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
                <input
                  className="lab-input"
                  style={{ maxWidth: 130 }}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 5));
                    setStage1Sent(false);
                  }}
                  aria-label="Transfer amount in dollars"
                />
              </div>
              <div className="step-cta-row">
                <button type="button" className="btn-pop" onClick={() => setStage1Sent(true)}>
                  Send {amtDisplay} Over Plain HTTP
                </button>
                {stage1Sent && (
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(2)}>
                    Next: Inspect the Bank Certificate →
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 2 of 5 · Be the Browser’s Certificate Checker</span>
                <h2>Is This Really Your Bank?</h2>
                <p>Inspect the incoming X.509 certificate carefully before choosing whether to connect.</p>
              </div>
              <div className="cert-workout-card">
                <div className="cert-workout-card__info">
                  <div className="eyebrow">Presented X.509 Certificate</div>
                  <code>Domain (CN): bank.example</code>
                  <code>Signed By (Issuer): FreeAirport_SelfSigned_CA</code>
                  <code>Matches Trusted Root Store? FALSE ✕</code>
                </div>
              </div>
              <div className="step-cta-row">
                <button
                  type="button"
                  className={`lab-toggle ${certChoice === 'trust' ? 'is-bad' : ''}`}
                  onClick={() => {
                    setCertChoice('trust');
                    setTutorOverride(null);
                  }}
                >
                  Ignore Warning &amp; Proceed Anyway
                </button>
                <button
                  type="button"
                  className={`lab-toggle ${certChoice === 'reject' ? 'is-good' : ''}`}
                  onClick={() => {
                    setCertChoice('reject');
                    setTutorOverride(null);
                  }}
                >
                  Reject Fake Cert &amp; Require Root CA ✓
                </button>
                {certChoice === 'reject' && (
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(3)}>
                    Next: Mix a Secret Key in Public →
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 3 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 3 of 5 · Hands-On Diffie-Hellman (Part 1)</span>
                <h2>Compute Your Public Share A = 5^a mod 23</h2>
                <p>
                  Public numbers on the Wi-Fi are <b>p = 23</b> and <b>g = 5</b>. Pick your private secret <b>a</b>, compute <b>5^{clientA} mod 23</b> (remainder after dividing by 23), and send A!
                </p>
              </div>
              <div className="word-picker-row">
                <div className="preset-row">
                  {[2, 3, 4].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`preset-btn ${clientA === val ? 'is-on' : ''}`}
                      onClick={() => handlePickClientA(val)}
                    >
                      Secret a = {val} (5^{val} = {Math.pow(5, val)})
                    </button>
                  ))}
                </div>
              </div>
              <div className="lab-inline">
                <input
                  className="lab-input"
                  style={{ maxWidth: 180 }}
                  value={shareAInput}
                  onChange={(e) => handleShareAInput(e.target.value)}
                  placeholder={`Type 5^${clientA} mod 23…`}
                  aria-label="Computed public share A"
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleShareAInput(String(expectedA))}
                >
                  Help Me Compute A
                </button>
              </div>
              <div className="step-cta-row">
                {shareACorrect && !shareASent && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setShareASent(true);
                      setTutorOverride(null);
                    }}
                  >
                    Send Public Share A = {expectedA} to Bank
                  </button>
                )}
                {shareASent && (
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(4)}>
                    Next: Derive Identical Secret Key S →
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 4 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 4 of 5 · Hands-On Diffie-Hellman (Part 2)</span>
                <h2>Compute Shared Secret S = {BANK_PUB_B}^{clientA} mod 23</h2>
                <p>
                  The bank sent back Public Share <b>B = {BANK_PUB_B}</b>. Raise B to your private secret <b>a = {clientA}</b> and take the remainder mod 23!
                </p>
              </div>
              <div className="lab-box">
                <div className="eyebrow">Quick Arithmetic Helper</div>
                <code className="lab-code">
                  {BANK_PUB_B}^{clientA} = {Math.pow(BANK_PUB_B, clientA)} → divide by 23 → remainder = ?
                </code>
              </div>
              <div className="lab-inline">
                <input
                  className="lab-input"
                  style={{ maxWidth: 180 }}
                  value={secretSInput}
                  onChange={(e) => handleSecretSInput(e.target.value)}
                  placeholder="Type shared key S…"
                  aria-label="Computed shared secret S"
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleSecretSInput(String(expectedS))}
                >
                  Help Me Compute S
                </button>
              </div>
              {secretSCorrect && (
                <div className="step-cta-row">
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(5)}>
                    Next: Defend Against Harvest-Now Attack →
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === 5 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 5 of 5 · Perfect Forward Secrecy Rescue</span>
                <h2>
                  {pfsStep === 'secured'
                    ? 'Forward Secrecy Active! Recorded Traffic Is Permanently Safe ✓'
                    : 'Eve Recorded Today’s Traffic — Upgrade to Ephemeral ECDHE!'}
                </h2>
                <p>
                  {pfsStep === 'secured'
                    ? 'Because ECDHE deletes throwaway session keys the instant you log out, even a future server key breach reveals zero bytes of your past banking sessions.'
                    : 'Complete the 3 steps below to see why modern TLS 1.3 requires Ephemeral ECDHE instead of Static RSA.'}
                </p>
              </div>
              <div className="step-cta-row">
                {pfsStep === 'static-risk' && (
                  <button type="button" className="btn-pop" onClick={() => { setPfsStep('leaked'); setTutorOverride(null); }}>
                    1. Simulate Old Static RSA Key Leak
                  </button>
                )}
                {pfsStep === 'leaked' && (
                  <button type="button" className="btn-pop" onClick={() => { setPfsStep('ecdhe-on'); setTutorOverride(null); }}>
                    2. Enable Ephemeral ECDHE (Throwaway Keys)
                  </button>
                )}
                {pfsStep === 'ecdhe-on' && (
                  <button type="button" className="btn-pop" onClick={() => { setPfsStep('secured'); setTutorOverride(null); }}>
                    3. Test Server Key Leak Again!
                  </button>
                )}
                {pfsStep === 'secured' && (
                  <div className="victory-summary">
                    <div className="victory-list">
                      <span>✓ Spotted Plain HTTP Hijack</span>
                      <span>✓ Rejected Evil-Twin Self-Signed Cert</span>
                      <span>✓ Computed Diffie-Hellman Share A={expectedA}</span>
                      <span>✓ Derived Shared Key S={expectedS} Locally</span>
                      <span>✓ Enabled Ephemeral ECDHE Forward Secrecy</span>
                    </div>
                    <button type="button" className="btn-ghost" onClick={handleRestartAll}>
                      Practice Scenario 03 Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      <aside className="rail">
        <TutorGuideCard
          stageLabel={`Scenario 03 · Stage ${stage}/5`}
          mood={tutorState.mood}
          message={tutorState.message}
          hintText={tutorState.hint}
          voiceTriggerKey={tutorState.key}
        />

        <section className="card guided-progress-card">
          <div className="eyebrow">Your Scenario 03 Mastery</div>
          <ul className="workout-tasks">
            <li className={stage1Sent ? 'is-done' : ''}>
              <span className={`check ${stage1Sent ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Saw Evil-Twin Wi-Fi hijack plain HTTP</span>
            </li>
            <li className={certChoice === 'reject' ? 'is-done' : ''}>
              <span className={`check ${certChoice === 'reject' ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Inspected &amp; rejected a self-signed fake cert</span>
            </li>
            <li className={shareASent ? 'is-done' : ''}>
              <span className={`check ${shareASent ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Computed DH Public Share A = {expectedA} by hand</span>
            </li>
            <li className={secretSCorrect ? 'is-done' : ''}>
              <span className={`check ${secretSCorrect ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Derived Shared Secret S = {expectedS} locally</span>
            </li>
            <li className={pfsStep === 'secured' ? 'is-done' : ''}>
              <span className={`check ${pfsStep === 'secured' ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Enabled ECDHE Forward Secrecy against key leaks</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

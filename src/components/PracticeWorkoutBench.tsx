import { useMemo } from 'react';
import {
  MissionId,
  WorkoutState,
  buildMission1WireBytes,
  computeMission2Row,
} from '../data/practiceMissions';
import { fnv1aHex, modPow, sha256Hex } from '../data/labData';
import { renderIcon } from '../engine/isoEngine';

interface Props {
  missionId: MissionId;
  config: Record<string, string>;
  workout: WorkoutState;
  onChangeWorkout: (patch: Partial<WorkoutState>, logLabel?: string) => void;
  onCompleteTask: (taskId: string) => void;
  onTriggerAction: (actionId: string, label: string) => void;
}

export default function PracticeWorkoutBench({
  missionId,
  config,
  workout,
  onChangeWorkout,
  onCompleteTask,
  onTriggerAction,
}: Props) {
  // ---------------- MISSION 01: WIRE BYTE WORKOUT ----------------
  const m1WireBytes = useMemo(
    () =>
      buildMission1WireBytes(
        workout.m1Msg,
        workout.m1Key,
        config.cipher || 'plaintext',
        workout.m1TamperedBytes
      ),
    [workout.m1Msg, workout.m1Key, config.cipher, workout.m1TamperedBytes]
  );

  // ---------------- MISSION 02: LIVE LOGIN VERIFIER ----------------
  const m2AliceSalt = useMemo(
    () => fnv1aHex(`alice:${workout.m2SaltSeed}`).slice(0, 6),
    [workout.m2SaltSeed]
  );
  const m2SamSalt = useMemo(
    () => fnv1aHex(`sam:${workout.m2SaltSeed}`).slice(0, 6),
    [workout.m2SaltSeed]
  );

  const runLiveLoginVerify = () => {
    const storage = config.storage || 'plaintext';
    const saltMode = config.saltMode || 'none';
    const storedRow = computeMission2Row(workout.m2AlicePw, storage, saltMode, m2AliceSalt);
    const attemptRow = computeMission2Row(workout.m2LoginAttempt, storage, saltMode, m2AliceSalt);
    const ok = storedRow === attemptRow;
    const detail = ok
      ? `Server fetched Alice’s salt (${saltMode === 'unique' ? m2AliceSalt : 'none'}), recomputed hash, and MATCHED stored row → Session Token Granted ✓`
      : `Server recomputed hash for "${workout.m2LoginAttempt}" → MISMATCH against stored row → 401 Access Denied ✕`;
    onChangeWorkout(
      { m2LoginResult: { ok, detail, computedHash: attemptRow } },
      `Tested live login with "${workout.m2LoginAttempt}" → ${ok ? 'Verified ✓' : 'Denied ✕'}`
    );
    if (storage === 'argon2' && saltMode === 'unique') {
      onCompleteTask('m2-t2');
    }
  };

  // ---------------- MISSION 03: LIVE ECDHE MATH ----------------
  const m3ClientPubA = modPow(5, workout.m3ClientSecretA, 23);
  const m3BankPubB = modPow(5, 15, 23);
  const m3SharedS = modPow(m3BankPubB, workout.m3ClientSecretA, 23);

  // ---------------- MISSION 04: REAL SHA-256 & HSM VERIFIER ----------------
  const handleEditMirrorPayload = (val: string) => {
    onChangeWorkout({ m4MirrorPayload: val, m4VerifyResult: null });
    sha256Hex(val).then((h) => {
      onChangeWorkout({ m4MirrorHash: h });
      if (val !== workout.m4OfficialPayload) {
        onCompleteTask('m4-t1');
      }
    });
  };

  const handleHsmSign = async () => {
    const h = await sha256Hex(workout.m4OfficialPayload);
    onChangeWorkout(
      { m4OfficialHash: h, m4SignedHash: h, m4VerifyResult: null },
      'Signed official release inside Offline HSM → created Ed25519 σ'
    );
  };

  const handleRunOsVerifier = async () => {
    const mirrorH = await sha256Hex(workout.m4MirrorPayload);
    const officialH = await sha256Hex(workout.m4OfficialPayload);
    const usesSig = config.verifyMode === 'ed25519';
    const usesHsm = config.keyLocation === 'hsm';
    const tampered = mirrorH !== officialH;

    if (!tampered) {
      onChangeWorkout(
        {
          m4MirrorHash: mirrorH,
          m4OfficialHash: officialH,
          m4VerifyResult: {
            ok: true,
            detail: `SHA-256 matches (${mirrorH.slice(0, 14)}…) & Ed25519 signature σ is VALID → Safe to install ✓`,
          },
        },
        'Ran OS Verifier on untouched official release → Installed ✓'
      );
      return;
    }

    if (usesSig && usesHsm) {
      onChangeWorkout(
        {
          m4MirrorHash: mirrorH,
          m4OfficialHash: officialH,
          m4VerifyResult: {
            ok: true,
            detail: `BLOCKED ✓ Mirror SHA-256 (${mirrorH.slice(0, 12)}…) ≠ HSM-signed hash (${officialH.slice(0, 12)}…). Trojan quarantined before execution!`,
          },
        },
        'Ran OS Signature Verifier on tampered mirror → Trojan BLOCKED ✓'
      );
      onCompleteTask('m4-t3');
    } else {
      onChangeWorkout(
        {
          m4MirrorHash: mirrorH,
          m4OfficialHash: officialH,
          m4VerifyResult: {
            ok: false,
            detail:
              config.verifyMode === 'none'
                ? 'VULNERABLE ✕ OS has verification disabled — your tampered binary executed immediately!'
                : config.verifyMode === 'mirror-hash'
                  ? 'VULNERABLE ✕ Without a Publisher Signature, an attacker on the mirror overwrites the checksum file!'
                  : 'VULNERABLE ✕ Private key was left on the CDN mirror — attacker signed your Trojan validly!',
          },
        },
        'Ran OS Verifier → Defense incomplete, Trojan bypassed check!'
      );
    }
  };

  // ---------------- MISSION 05: MINI 6x6 X-RAY & LIVE POS TERMINAL ----------------
  const m5EncryptedCells = useMemo(() => {
    const mode = config.cipherMode || 'ecb';
    const ecbColors: Record<number, string> = { 0: '#3b4a6b', 1: '#d97736', 2: '#5fa876' };
    const gcmPalette = ['#2f4858', '#52657a', '#7c6f9c', '#9e5d52', '#4c7c66', '#b8863b', '#3f6a8a', '#6d5d7a'];
    return workout.m5Grid.map((val, idx) => {
      if (mode === 'ecb') return ecbColors[val] || ecbColors[0];
      const h = parseInt(fnv1aHex(`m5:${idx}:${val}`).slice(0, 2), 16);
      return gcmPalette[h % gcmPalette.length];
    });
  }, [workout.m5Grid, config.cipherMode]);

  const handleToggleMiniPixel = (idx: number) => {
    const next = [...workout.m5Grid];
    next[idx] = (next[idx] + 1) % 3;
    onChangeWorkout({ m5Grid: next });
    if (config.cipherMode === 'gcm' && config.keyArch === 'kms') {
      onCompleteTask('m5-t1');
    }
  };

  const handleSendGenuineTap = () => {
    const newNonce = fnv1aHex(`tap:${Date.now()}:${workout.m5PayAmount}`).slice(0, 8);
    const amt = Math.max(1, Number(workout.m5PayAmount) || 50);
    onChangeWorkout(
      {
        m5ActiveNonce: newNonce,
        m5TotalCharged: amt,
        m5AcceptedTaps: 1,
        m5BlockedReplays: 0,
        m5LastTerminalEvent: `Genuine Tap #1 ($${amt}) accepted with fresh nonce ${newNonce} ✓`,
      },
      `Sent fresh Tap-to-Pay ($${amt}, nonce ${newNonce})`
    );
  };

  const handleReplayTap = () => {
    const amt = Math.max(1, Number(workout.m5PayAmount) || 50);
    const guarded = config.replayGuard === 'nonce-ledger';
    if (guarded) {
      const nextBlocked = workout.m5BlockedReplays + 1;
      onChangeWorkout(
        {
          m5BlockedReplays: nextBlocked,
          m5LastTerminalEvent: `REPLAY #${nextBlocked} BLOCKED ✓ Nonce ${workout.m5ActiveNonce} already spent in ledger ($0 charged)`,
        },
        `Replayed captured packet (${workout.m5ActiveNonce}) → BLOCKED by Nonce Ledger ✓`
      );
      onCompleteTask('m5-t3');
    } else {
      const nextAccepted = workout.m5AcceptedTaps + 1;
      const nextTotal = workout.m5TotalCharged + amt;
      onChangeWorkout(
        {
          m5AcceptedTaps: nextAccepted,
          m5TotalCharged: nextTotal,
          m5LastTerminalEvent: `REPLAY ACCEPTED ✕ Charged +$${amt} AGAIN (Total drained: $${nextTotal} across ${nextAccepted}× taps!)`,
        },
        `Replayed captured packet → DRAINED +$${amt} (Total: $${nextTotal}!)`
      );
      onCompleteTask('m5-t2');
    }
  };

  return (
    <section className="card workout-bench">
      <div className="workout-bench__head">
        <span
          className="workout-bench__ico"
          dangerouslySetInnerHTML={{ __html: renderIcon('flask', { size: 16, stroke: 2 }) }}
        />
        <div>
          <div className="eyebrow">Your Hands-On Workout Bench · Try It Yourself</div>
          <div className="lab-meta">
            Edit inputs, click bytes, verify logins, or replay packets directly — the 3D diagram above reacts live.
          </div>
        </div>
      </div>

      {/* ===================== MISSION 01 WORKOUT ===================== */}
      {missionId === 'm1-chat' && (
        <div className="workout-body">
          <div className="workout-row-2">
            <div className="lab-field">
              <label htmlFor="m1-msg-input">Type Alice’s Message</label>
              <input
                id="m1-msg-input"
                className="lab-input"
                value={workout.m1Msg}
                onChange={(e) => {
                  onChangeWorkout({ m1Msg: e.target.value, m1TamperedBytes: [] });
                  if (config.cipher === 'plaintext' || config.cipher === 'base64') {
                    onCompleteTask('m1-t1');
                  }
                }}
              />
            </div>
            <div className="lab-field">
              <label htmlFor="m1-key-input">Shared Secret Key</label>
              <input
                id="m1-key-input"
                className="lab-input"
                value={workout.m1Key}
                onChange={(e) => onChangeWorkout({ m1Key: e.target.value })}
              />
            </div>
          </div>

          <div className="lab-wire-head">
            <span className="eyebrow">Click Any Wire Byte Below to Flip 1 Bit as Mallory</span>
            {workout.m1TamperedBytes.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onChangeWorkout({ m1TamperedBytes: [] }, 'Repaired wire bytes')}
              >
                Repair Wire
              </button>
            )}
          </div>

          <div className="wire-bytes">
            {m1WireBytes.map((tok) => (
              <button
                key={tok.index}
                type="button"
                className={`wire-byte ${tok.tampered ? 'is-tampered' : ''}`}
                onClick={() => {
                  const next = workout.m1TamperedBytes.includes(tok.index)
                    ? workout.m1TamperedBytes.filter((i) => i !== tok.index)
                    : [...workout.m1TamperedBytes, tok.index];
                  onChangeWorkout(
                    { m1TamperedBytes: next },
                    `Flipped wire byte #${tok.index} (${tok.origHex} → ${tok.wireHex})`
                  );
                  if (next.length > 0 && config.cipher === 'aes-ctr' && config.keyDelivery === 'ecdhe') {
                    onCompleteTask('m1-t2');
                  }
                  if (next.length > 0 && config.cipher === 'aes-gcm' && config.keyDelivery === 'ecdhe') {
                    onCompleteTask('m1-t3');
                  }
                }}
                title={`Click to flip 1 bit in byte #${tok.index}`}
              >
                <span className="wire-byte__idx">{tok.index}</span>
                <span className="wire-byte__hex">{tok.wireHex}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== MISSION 02 WORKOUT ===================== */}
      {missionId === 'm2-portal' && (
        <div className="workout-body">
          <div className="workout-row-2">
            <div className="lab-field">
              <label htmlFor="m2-alice">Alice’s Signup Password</label>
              <input
                id="m2-alice"
                className="lab-input"
                value={workout.m2AlicePw}
                onChange={(e) => onChangeWorkout({ m2AlicePw: e.target.value, m2LoginResult: null })}
              />
            </div>
            <div className="lab-field">
              <label htmlFor="m2-sam">Sam’s Signup Password</label>
              <input
                id="m2-sam"
                className="lab-input"
                value={workout.m2SamPw}
                onChange={(e) => onChangeWorkout({ m2SamPw: e.target.value })}
              />
            </div>
          </div>

          <div className="workout-verifier">
            <div className="lab-field" style={{ flex: 1 }}>
              <label htmlFor="m2-login-try">Live Server Login Verifier (Try Logging In as Alice)</label>
              <div className="lab-inline">
                <input
                  id="m2-login-try"
                  className="lab-input"
                  value={workout.m2LoginAttempt}
                  onChange={(e) => onChangeWorkout({ m2LoginAttempt: e.target.value })}
                  placeholder="Type a right or wrong password…"
                />
                <button type="button" className="btn-pop" onClick={runLiveLoginVerify}>
                  Test Login
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    onChangeWorkout(
                      { m2SaltSeed: workout.m2SaltSeed + 1, m2LoginResult: null },
                      `Rotated random per-user salts (${m2AliceSalt} / ${m2SamSalt})`
                    )
                  }
                >
                  New Salts
                </button>
              </div>
            </div>
            {workout.m2LoginResult && (
              <div className={`workout-result ${workout.m2LoginResult.ok ? 'is-good' : 'is-bad'}`}>
                <strong>{workout.m2LoginResult.detail}</strong>
                <code>Computed: {workout.m2LoginResult.computedHash}</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MISSION 03 WORKOUT ===================== */}
      {missionId === 'm3-bank' && (
        <div className="workout-body">
          <div className="workout-row-2">
            <div className="lab-field">
              <label htmlFor="m3-amt">Your Bank Transfer Amount ($)</label>
              <input
                id="m3-amt"
                className="lab-input"
                value={workout.m3Amount}
                onChange={(e) => onChangeWorkout({ m3Amount: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>
            <div className="lab-field">
              <label htmlFor="m3-dh">
                Your Ephemeral ECDHE Secret (a = {workout.m3ClientSecretA}) → A={m3ClientPubA}, S={m3SharedS}
              </label>
              <input
                id="m3-dh"
                type="range"
                min={2}
                max={20}
                value={workout.m3ClientSecretA}
                onChange={(e) => {
                  const nextA = Number(e.target.value);
                  onChangeWorkout({ m3ClientSecretA: nextA });
                  if (config.transport === 'tls13' && config.caCheck === 'strict') {
                    onCompleteTask('m3-t2');
                  }
                }}
                className="lab-slider"
              />
            </div>
          </div>

          <div className="cert-workout-card">
            <div className="cert-workout-card__info">
              <div className="eyebrow">Incoming Airport Wi-Fi Certificate Prompt</div>
              <code>Subject: CN=bank.example · Issuer: EvilTwin_FreeWiFi_SelfSigned · Root CA Match: FALSE</code>
            </div>
            <div className="lab-inline">
              <button
                type="button"
                className={`lab-toggle ${workout.m3CertDecision === 'trust' ? 'is-bad' : ''}`}
                onClick={() => {
                  onChangeWorkout(
                    { m3CertDecision: 'trust' },
                    `Clicked "Trust Anyway" on Evil-Twin fake cert for $${workout.m3Amount || '2500'}`
                  );
                  onTriggerAction('eviltwin', 'Evil-Twin Fake Cert');
                  onCompleteTask('m3-t1');
                }}
              >
                Trust Anyway (Risky!)
              </button>
              <button
                type="button"
                className={`lab-toggle ${workout.m3CertDecision === 'reject' ? 'is-good' : ''}`}
                onClick={() => {
                  onChangeWorkout(
                    { m3CertDecision: 'reject' },
                    'Rejected untrusted self-signed Evil-Twin certificate ✓'
                  );
                  onTriggerAction('eviltwin', 'Evil-Twin Fake Cert');
                  if (config.transport === 'tls13' && config.caCheck === 'strict') {
                    onCompleteTask('m3-t2');
                  }
                }}
              >
                Reject Fake Cert ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MISSION 04 WORKOUT ===================== */}
      {missionId === 'm4-update' && (
        <div className="workout-body">
          <div className="lab-field">
            <label htmlFor="m4-mirror-edit">
              Mirror’s `AppInstaller_v4.2.pkg` Payload (Edit Even 1 Character to Inject a Trojan!)
            </label>
            <input
              id="m4-mirror-edit"
              className="lab-input"
              value={workout.m4MirrorPayload}
              onChange={(e) => handleEditMirrorPayload(e.target.value)}
            />
          </div>

          <div className="preset-row">
            <button type="button" className="preset-btn" onClick={handleHsmSign}>
              1. Sign Clean Release in HSM
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                handleEditMirrorPayload(
                  workout.m4OfficialPayload.replace('perm=standard', 'perm=ROOT_BACKDOOR')
                )
              }
            >
              2. Inject Backdoor Byte
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => handleEditMirrorPayload(workout.m4OfficialPayload)}
            >
              Restore Clean Installer
            </button>
            <button type="button" className="btn-pop" onClick={handleRunOsVerifier}>
              3. Run OS Signature Verifier
            </button>
          </div>

          {workout.m4VerifyResult && (
            <div className={`workout-result ${workout.m4VerifyResult.ok ? 'is-good' : 'is-bad'}`}>
              <strong>{workout.m4VerifyResult.detail}</strong>
            </div>
          )}
        </div>
      )}

      {/* ===================== MISSION 05 WORKOUT ===================== */}
      {missionId === 'm5-vault' && (
        <div className="workout-body">
          <div className="workout-m5-grid">
            <div className="m5-scan-box">
              <div className="eyebrow">1. Click Cells to Paint X-Ray ({config.cipherMode === 'gcm' ? 'GCM Noise ✓' : 'ECB Leak!'})</div>
              <div className="m5-mini-pair">
                <div className="mini-px-grid">
                  {workout.m5Grid.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`px-cell px-cell--v${val}`}
                      onClick={() => handleToggleMiniPixel(idx)}
                      aria-label={`Scan pixel ${idx}`}
                    />
                  ))}
                </div>
                <div className="mini-px-grid">
                  {m5EncryptedCells.map((bg, idx) => (
                    <div key={idx} className="px-cell" style={{ backgroundColor: bg, cursor: 'default' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="m5-pos-box">
              <div className="eyebrow">2. Live Tap-to-Pay POS Replay Terminal</div>
              <div className="lab-inline">
                <input
                  className="lab-input"
                  style={{ maxWidth: 96 }}
                  type="number"
                  min={1}
                  max={9999}
                  value={workout.m5PayAmount}
                  onChange={(e) => onChangeWorkout({ m5PayAmount: Number(e.target.value) || 50 })}
                  aria-label="Payment amount in dollars"
                />
                <button type="button" className="btn-ghost" onClick={handleSendGenuineTap}>
                  Send Fresh Tap
                </button>
                <button type="button" className="btn-pop" onClick={handleReplayTap}>
                  Replay Captured Tap
                </button>
              </div>
              <div
                className={`workout-result ${
                  config.replayGuard === 'nonce-ledger' ? 'is-good' : 'is-bad'
                }`}
              >
                <strong>{workout.m5LastTerminalEvent}</strong>
                <code>
                  Total Charged: ${workout.m5TotalCharged} · Accepted: {workout.m5AcceptedTaps}× · Blocked Replays:{' '}
                  {workout.m5BlockedReplays}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

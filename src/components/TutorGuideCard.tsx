import { useCallback, useEffect, useRef, useState } from 'react';
import tutorAvatar from '../assets/images/tutor_avatar_guide_1795142622774.jpg';
import { renderIcon } from '../engine/isoEngine';

export interface TutorGuideProps {
  name?: string;
  stageLabel: string;
  mood: 'neutral' | 'happy' | 'warn' | 'hint';
  message: string;
  hintText: string;
  voiceTriggerKey: string;
  onHintUsed?: () => void;
}

export default function TutorGuideCard({
  name = 'Prof. Ada',
  stageLabel,
  mood,
  message,
  hintText,
  voiceTriggerKey,
  onHintUsed,
}: TutorGuideProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const lastSpokenRef = useRef<string>('');

  const speakText = useCallback(
    (text: string, force = false) => {
      if (!speechSupported) return;
      if (!voiceEnabled && !force) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.98;
        utter.pitch = 1.03;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /en[-_](US|GB)/i.test(v.lang) && /natural|samantha|google|aria|zira/i.test(v.name)) ||
          voices.find((v) => /^en/i.test(v.lang));
        if (preferred) utter.voice = preferred;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [speechSupported, voiceEnabled]
  );

  // Stop speech cleanly on unmount
  useEffect(() => {
    return () => {
      if (speechSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [speechSupported]);

  // Reset hint drawer & speak automatically when message key changes
  useEffect(() => {
    setShowHint(false);
    if (voiceEnabled && voiceTriggerKey !== lastSpokenRef.current) {
      lastSpokenRef.current = voiceTriggerKey;
      speakText(message);
    }
  }, [voiceTriggerKey, message, voiceEnabled, speakText]);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && speechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (next) {
      speakText(showHint ? hintText : message, true);
    }
  };

  const handleReplayVoice = () => {
    speakText(showHint ? `${message} Hint: ${hintText}` : message, true);
  };

  const handleRequestHint = () => {
    setShowHint(true);
    onHintUsed?.();
    if (voiceEnabled) {
      speakText(hintText, true);
    }
  };

  const moodLabel =
    isSpeaking
      ? 'Speaking aloud'
      : mood === 'happy'
        ? 'Great work'
        : mood === 'warn'
          ? 'Heads up'
          : showHint
            ? 'Step-by-step hint'
            : 'Your crypto tutor';

  return (
    <section className={`card tutor-card is-${mood} ${isSpeaking ? 'is-speaking' : ''}`} aria-live="polite">
      <div className="tutor-card__top">
        <div className="tutor-avatar-wrap">
          {!imgFailed ? (
            <img
              src={tutorAvatar}
              alt={`${name}, cryptography tutor`}
              className="tutor-avatar"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="tutor-avatar tutor-avatar--fallback">
              <span dangerouslySetInnerHTML={{ __html: renderIcon('userCheck', { size: 28, stroke: 1.8 }) }} />
            </div>
          )}
        </div>

        <div className="tutor-card__id">
          <div className="tutor-card__name">{name}</div>
          <div className="tutor-card__meta">
            <span>{stageLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{moodLabel}</span>
          </div>
        </div>

        {speechSupported && (
          <div className="tutor-voice-controls">
            <button
              type="button"
              className={`tutor-ico-btn ${voiceEnabled ? 'is-on' : ''}`}
              onClick={toggleVoice}
              title={voiceEnabled ? 'Mute tutor voice' : 'Turn on tutor voice'}
              aria-label={voiceEnabled ? 'Mute tutor voice' : 'Turn on tutor voice'}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: renderIcon(voiceEnabled ? 'volume2' : 'volumeX', { size: 15, stroke: 2 }),
                }}
              />
              <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              className="tutor-ico-btn"
              onClick={handleReplayVoice}
              title="Read guidance aloud"
              aria-label="Read guidance aloud"
            >
              <span dangerouslySetInnerHTML={{ __html: renderIcon('play', { size: 14, stroke: 2 }) }} />
              <span>Listen</span>
            </button>
          </div>
        )}
      </div>

      <div className="tutor-bubble">
        <p>{message}</p>
      </div>

      {showHint ? (
        <div className="tutor-hint-box">
          <div className="tutor-hint-box__head">
            <span dangerouslySetInnerHTML={{ __html: renderIcon('bulb', { size: 14, stroke: 2 }) }} />
            <span>Step-by-Step Hint</span>
          </div>
          <p>{hintText}</p>
        </div>
      ) : (
        <div className="tutor-actions">
          <button type="button" className="tutor-stuck-btn" onClick={handleRequestHint}>
            <span dangerouslySetInnerHTML={{ __html: renderIcon('bulb', { size: 14, stroke: 2 }) }} />
            <span>Stuck? Ask {name} for a Hint</span>
          </button>
        </div>
      )}
    </section>
  );
}

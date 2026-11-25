import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CALLOUT_META,
  CHAPTERS,
  LEGEND_ITEMS,
  LEVELS,
  METRICS,
} from './data/cryptoHelpers';
import {
  LESSON_MAP,
  LESSON_META_LIST,
  MODULES,
  getLessonMeta,
  getNextLessonMeta,
  searchCurriculum,
} from './data/curriculum';
import {
  StageEngine,
  renderFolderIcon,
  renderIcon,
} from './engine/isoEngine';
import CryptoLabView from './components/CryptoLabView';
import AttackLabView from './components/AttackLabView';
import CheatsheetsView from './components/CheatsheetsView';
import LandingView from './components/LandingView';
import LoginModal from './components/LoginModal';
import LoginPage from './components/LoginPage';
import { db } from './db/database';
import { UserRecord } from './db/schema';

type TabId = 'landing' | 'login' | 'learn' | 'lab' | 'practice' | 'cheatsheets';

const NAV_TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'landing', label: 'Overview', icon: 'shield' },
  { id: 'learn', label: 'Learn', icon: 'book' },
  { id: 'lab', label: 'Crypto Lab', icon: 'settings' },
  { id: 'practice', label: 'Practice', icon: 'shield' },
  { id: 'cheatsheets', label: 'Cheatsheets', icon: 'sheets' },
];

const DESKTOP_REF = { w: 1672, h: 920 };
const STORAGE_PREFIX = 'crypto-sim:';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, val: unknown) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {
    // ignore storage errors
  }
}

function parseHash(): { lessonId: string; step: number } {
  const m = /^#\/([\w-]+)\/(\d+)$/.exec(window.location.hash);
  if (m && LESSON_MAP[m[1]]) {
    const lesson = LESSON_MAP[m[1]];
    return {
      lessonId: m[1],
      step: Math.max(0, Math.min(lesson.steps.length - 1, Number(m[2]) - 1)),
    };
  }
  const saved = readStorage<{ lessonId: string; step: number } | null>('last', null);
  if (saved && LESSON_MAP[saved.lessonId]) {
    const lesson = LESSON_MAP[saved.lessonId];
    return {
      lessonId: saved.lessonId,
      step: Math.max(0, Math.min(lesson.steps.length - 1, saved.step)),
    };
  }
  return { lessonId: 'alice-encryption', step: 0 };
}

const BLOCK_HTML_RE = /^<(p|ul|ol|table|div|figure|pre|h\d)\b/i;

export default function App() {
  const initial = useMemo(() => parseHash(), []);
  const [activeTab, setActiveTab] = useState<TabId>('landing');
  const [lessonId, setLessonId] = useState<string>(initial.lessonId);
  const [step, setStep] = useState<number>(initial.step);
  const [openMods, setOpenMods] = useState<Set<string>>(() => {
    const meta = getLessonMeta(initial.lessonId);
    return new Set([meta ? meta.module.id : 'alice-bob']);
  });
  const [doneLessons, setDoneLessons] = useState<Set<string>>(
    () => new Set(readStorage<string[]>('done', []))
  );
  const [progressOpen, setProgressOpen] = useState<boolean>(() =>
    readStorage<boolean>('progressOpen', false)
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Database User & Authentication State
  const [user, setUser] = useState<UserRecord>(() => db.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    readStorage<boolean>('isAuthenticated', false)
  );
  const [targetTabAfterLogin, setTargetTabAfterLogin] = useState<TabId>('learn');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleNavigateTab = useCallback(
    (tab: TabId) => {
      if (!isAuthenticated && (tab === 'learn' || tab === 'lab' || tab === 'practice')) {
        setTargetTabAfterLogin(tab);
        setActiveTab('login');
      } else {
        setActiveTab(tab);
      }
    },
    [isAuthenticated]
  );

  // Search modal state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const windowRef = useRef<HTMLDivElement | null>(null);
  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<StageEngine | null>(null);
  const prevLessonRef = useRef<string | null>(null);
  const stepRef = useRef<number>(step);
  const lessonIdRef = useRef<string>(lessonId);

  stepRef.current = step;
  lessonIdRef.current = lessonId;

  const lesson = LESSON_MAP[lessonId] || LESSON_MAP['alice-encryption'];
  const lessonMeta = getLessonMeta(lesson.id) || LESSON_META_LIST[0];
  const currentStep = lesson.steps[step] || lesson.steps[0];
  const nextLesson = getNextLessonMeta(lesson.id);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  const navigateTo = useCallback((targetLessonId: string, targetStep: number) => {
    const target = LESSON_MAP[targetLessonId];
    if (!target) return;
    const clamped = Math.max(0, Math.min(target.steps.length - 1, targetStep));
    setActiveTab('learn');
    setLessonId(targetLessonId);
    setStep(clamped);
    setDrawerOpen(false);
    const meta = getLessonMeta(targetLessonId);
    if (meta) {
      setOpenMods(new Set([meta.module.id]));
    }
    const newHash = `#/${targetLessonId}/${clamped + 1}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
    writeStorage('last', { lessonId: targetLessonId, step: clamped });
  }, []);

  // Listen to browser hashchange
  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash();
      setLessonId(parsed.lessonId);
      setStep(parsed.step);
      const meta = getLessonMeta(parsed.lessonId);
      if (meta) setOpenMods(new Set([meta.module.id]));
      setDrawerOpen(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Mark lesson complete when reaching final step
  useEffect(() => {
    if (step === lesson.steps.length - 1) {
      setDoneLessons((prev) => {
        if (prev.has(lesson.id)) return prev;
        const next = new Set(prev);
        next.add(lesson.id);
        writeStorage('done', [...next]);
        return next;
      });
      db.updateUserProgress(lesson.id, 50);
      setUser({ ...db.getUser() });
    }
    document.title = `${lesson.title} · CryptoScale`;
  }, [lesson.id, lesson.title, lesson.steps.length, step]);

  // Responsive desktop zoom & layout mode (exact designed-to-scale math)
  useEffect(() => {
    const fitWindow = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const layout = w >= 1200 && h >= 560 ? 'desktop' : w >= 960 && h >= 600 ? 'tablet' : 'stack';
      document.documentElement.dataset.layout = layout;
      const winEl = windowRef.current;
      if (winEl) {
        if (layout === 'desktop') {
          const z = Math.min(1, w / DESKTOP_REF.w, h / DESKTOP_REF.h);
          (winEl.style as unknown as Record<string, string>).zoom = String(z);
          winEl.style.width = `${w / z}px`;
          winEl.style.height = `${h / z}px`;
          setDrawerOpen(false);
        } else {
          (winEl.style as unknown as Record<string, string>).zoom = '';
          winEl.style.width = '';
          winEl.style.height = '';
        }
      }
      stageRef.current?.refit();
    };
    fitWindow();
    window.addEventListener('resize', fitWindow);
    return () => window.removeEventListener('resize', fitWindow);
  }, []);

  // Sync drawer & fullscreen root classes
  useEffect(() => {
    document.documentElement.classList.toggle('is-drawer', drawerOpen);
  }, [drawerOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle('has-full', isFullscreen);
  }, [isFullscreen]);

  // Initialize StageEngine when on Learn tab
  useEffect(() => {
    if (activeTab !== 'learn' || !stageHostRef.current) return;
    const engine = new StageEngine(stageHostRef.current);
    engine.onView = (zoomed) => setIsZoomed(zoomed);
    engine.onCards = (show) => document.documentElement.classList.toggle('cards-inline', !show);
    engine.onSwipe = (dir) => {
      const cur = LESSON_MAP[lessonIdRef.current];
      const nextStep = stepRef.current + dir;
      if (cur && nextStep >= 0 && nextStep < cur.steps.length) {
        navigateTo(lessonIdRef.current, nextStep);
      }
    };
    stageRef.current = engine;
    prevLessonRef.current = null;

    return () => {
      engine.clear();
      if (stageHostRef.current) stageHostRef.current.innerHTML = '';
      stageRef.current = null;
      prevLessonRef.current = null;
    };
  }, [activeTab, navigateTo]);

  // Animate isometric SVG diagram on lesson/step changes
  useEffect(() => {
    if (activeTab !== 'learn' || !stageRef.current) return;
    const engine = stageRef.current;
    if (prevLessonRef.current !== lesson.id) {
      prevLessonRef.current = lesson.id;
      engine.clear();
      engine.frame(lesson.steps.map((s) => s.scene));
      engine.goTo(currentStep.scene);
    } else {
      engine.goTo(currentStep.scene);
    }
  }, [activeTab, lesson, currentStep]);

  // Sync pause state to engine
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.paused = isPaused;
    }
  }, [isPaused]);

  const handleReplay = useCallback(() => {
    if (!stageRef.current) return;
    const prev = lesson.steps[step - 1];
    if (prev) stageRef.current.goTo(prev.scene, { instant: true });
    else stageRef.current.clear();
    stageRef.current.goTo(currentStep.scene);
  }, [lesson, step, currentStep]);

  // Theme switch with circular View Transition
  const applyTheme = useCallback((nextTheme: 'light' | 'dark') => {
    document.documentElement.dataset.theme = nextTheme;
    writeStorage('theme', nextTheme);
    setTheme(nextTheme);
    stageRef.current?.retheme();
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f4ebe0';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
  }, []);

  const toggleTheme = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> };
      };
      if (!doc.startViewTransition || reduced) {
        applyTheme(next);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      doc.startViewTransition(() => applyTheme(next)).ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
          },
          {
            duration: 520,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    },
    [theme, applyTheme]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (searchOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSearchOpen(false);
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, [contenteditable]')) return;

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (drawerOpen) setDrawerOpen(false);
        return;
      }
      if (activeTab !== 'learn') return;

      if (e.key === 'ArrowRight' && step < lesson.steps.length - 1) {
        navigateTo(lesson.id, step + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        navigateTo(lesson.id, step - 1);
      } else if (e.key === 'r' || e.key === 'R') {
        handleReplay();
      } else if (e.key === '0') {
        stageRef.current?.fit();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, drawerOpen, handleReplay, isFullscreen, lesson, navigateTo, searchOpen, step]);

  // Focus search input when opening search
  useEffect(() => {
    if (searchOpen) {
      setSearchIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 20);
    }
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return LESSON_META_LIST.map((m) => ({
        kind: 'lesson' as const,
        lessonId: m.id,
        step: 0,
        title: m.title,
        subtitle: LESSON_MAP[m.id]?.summary || '',
        moduleLabel: `${m.module.num} · ${m.module.title}`,
        score: 100,
      }));
    }
    return searchCurriculum(searchQuery);
  }, [searchQuery]);

  const toggleModule = (modId: string) => {
    setOpenMods((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const toggleProgress = () => {
    setProgressOpen((prev) => {
      writeStorage('progressOpen', !prev);
      return !prev;
    });
  };

  const totalLessons = LESSON_META_LIST.length;
  const donePct = Math.round((doneLessons.size / totalLessons) * 100);
  const chapterMeta = CHAPTERS[currentStep.chapter];
  const isLastStep = step === lesson.steps.length - 1;
  const nextLabel = isLastStep
    ? nextLesson
      ? nextLesson.title.length <= 18
        ? `Next: ${nextLesson.title}`
        : nextLesson.title
      : 'Open Crypto Lab'
    : `Next: ${lesson.steps[step + 1].short}`;

  return (
    <>
      <div className="window" ref={windowRef}>
        {/* TOPBAR */}
        <header className="topbar">
          <button
            className="menu-btn"
            type="button"
            aria-label="Open the course menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            dangerouslySetInnerHTML={{ __html: renderIcon('menu', { size: 19, stroke: 2.2 }) }}
          />

          <a
            className="brand"
            href="#/landing"
            aria-label="CryptoScale — Interactive Cryptography Course"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('landing');
            }}
          >
            <svg className="logo" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M16 11V16M8.5 19.5V16H23.5V19.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <rect
                x="9.5"
                y="3"
                width="13"
                height="9.2"
                rx="2.6"
                fill="#fcd4ad"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="16" cy="7.6" r="1.6" fill="currentColor" />
              <rect
                x="2.2"
                y="19.5"
                width="12.2"
                height="9"
                rx="2.6"
                fill="#a9c5e8"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <rect
                x="17.6"
                y="19.5"
                width="12.2"
                height="9"
                rx="2.6"
                fill="#cfe3b2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <span className="brand__name">
              Crypto <span>Scale</span>
            </span>
          </a>

          <nav className="nav" aria-label="Primary navigation">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nav__item ${activeTab === tab.id ? 'btn-pop is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span dangerouslySetInnerHTML={{ __html: renderIcon(tab.icon, { size: 17 }) }} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <button
            className="search"
            type="button"
            aria-label="Search lessons and cryptography concepts"
            onClick={() => setSearchOpen(true)}
          >
            <span dangerouslySetInnerHTML={{ __html: renderIcon('search', { size: 16, stroke: 2 }) }} />
            <span className="search__hint">Search ciphers, attacks &amp; protocols…</span>
            <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <button
            className="theme-btn"
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            onClick={toggleTheme}
            dangerouslySetInnerHTML={{
              __html: renderIcon(theme === 'dark' ? 'sun' : 'moon', { size: 16, stroke: 2 }),
            }}
          />

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="credit"
                title="Student Profile & Security Clearance"
                onClick={() => setLoginModalOpen(true)}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  className="credit__x"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: renderIcon('user', { size: 14, stroke: 2.2 }) }}
                />
                <span className="credit__text" style={{ textAlign: 'left' }}>
                  <b>
                    <span>{user.username} ({user.xp} XP)</span>
                  </b>
                </span>
              </button>
              <button
                type="button"
                className="btn-ghost"
                title="Log out of CryptoScale"
                onClick={() => {
                  setIsAuthenticated(false);
                  writeStorage('isAuthenticated', false);
                  setActiveTab('landing');
                }}
                style={{ padding: '5px 10px', fontSize: 11.5, borderRadius: 6, color: 'var(--rust)', fontWeight: 700 }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-pop"
              onClick={() => {
                setTargetTabAfterLogin('learn');
                setActiveTab('login');
              }}
              style={{
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 800,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: renderIcon('user', { size: 14, stroke: 2.2 }) }} />
              <span>Sign In</span>
            </button>
          )}
        </header>

        {/* BODY */}
        <div className={`body ${activeTab === 'landing' || activeTab === 'login' ? 'body--landing' : ''}`}>
          {/* SIDEBAR (Only rendered for non-landing and non-login tabs) */}
          {activeTab !== 'landing' && activeTab !== 'login' && (
            <aside className="sidebar" id="sidebar" aria-label="Course scenarios">
              <nav className="drawer-nav">
                {NAV_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`nav__item ${activeTab === tab.id ? 'btn-pop is-active' : ''}`}
                    onClick={() => {
                      handleNavigateTab(tab.id);
                      setDrawerOpen(false);
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon(tab.icon, { size: 16 }) }} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>

              <div className="tree-root">
                <svg width="22" height="18" viewBox="0 0 20 16" aria-hidden="true">
                  <path
                    d="M1 3a2 2 0 0 1 2-2h4.3l2 2.2H17a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2Z"
                    fill="currentColor"
                  />
                </svg>
                <span>Scenarios</span>
                <span className="tree-root__meta">{totalLessons} lessons</span>
                <button
                  className="drawer-close"
                  type="button"
                  aria-label="Close the course menu"
                  onClick={() => setDrawerOpen(false)}
                  dangerouslySetInnerHTML={{ __html: renderIcon('close', { size: 18, stroke: 2.2 }) }}
                />
              </div>

              <nav className="course" id="course">
                {MODULES.map((mod) => {
                  const isOpen = openMods.has(mod.id);
                  const modDone = mod.lessons.filter((l) => doneLessons.has(l.id)).length;
                  return (
                    <section
                      key={mod.id}
                      className={`mod ${isOpen ? 'is-open' : ''}`}
                      data-mod={mod.id}
                    >
                      <button
                        type="button"
                        className="mod__head"
                        aria-expanded={isOpen}
                        onClick={() => toggleModule(mod.id)}
                      >
                        <span
                          dangerouslySetInnerHTML={{
                            __html: renderIcon('chevronRight', { size: 15, stroke: 2.2, cls: 'mod__chev' }),
                          }}
                        />
                        <span dangerouslySetInnerHTML={{ __html: renderFolderIcon(mod.color) }} />
                        <span className="mod__title" title={mod.title}>
                          {mod.num}. {mod.title}
                        </span>
                        <span className="mod__count">
                          {modDone}/{mod.lessons.length}
                        </span>
                      </button>

                      <div className="mod__body">
                        <div className="mod__clip">
                          <ul className="mod__lessons">
                            {mod.lessons.map((l) => {
                              const isCurrent = activeTab === 'learn' && lesson.id === l.id;
                              const isDone = doneLessons.has(l.id);
                              return (
                                <li
                                  key={l.id}
                                  className={`lesson ${isCurrent ? 'is-current' : ''}`}
                                  data-done={String(isDone)}
                                >
                                  <a
                                    href={`#/${l.id}/1`}
                                    className={isCurrent ? 'btn-pop' : ''}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigateTo(l.id, 0);
                                    }}
                                  >
                                    <span
                                      className="lesson__markbox"
                                      dangerouslySetInnerHTML={{
                                        __html: isDone
                                          ? renderIcon('circleCheck', {
                                              size: 16,
                                              stroke: 2,
                                              cls: 'lesson__mark lesson__mark--done',
                                            })
                                          : renderIcon('file', {
                                              size: 15,
                                              stroke: 1.5,
                                              cls: 'lesson__mark',
                                            }),
                                      }}
                                    />
                                    <span className="lesson__title" title={l.title}>
                                      {l.title}
                                    </span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </nav>

              <section className={`card progress ${progressOpen ? 'is-open' : ''}`} id="progress">
                <button
                  className="progress__head"
                  type="button"
                  aria-expanded={progressOpen}
                  onClick={toggleProgress}
                >
                  <span className="eyebrow">Progress</span>
                  <span className="progress__pct">
                    {doneLessons.size} / {totalLessons}
                  </span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderIcon('chevronRight', { size: 14, stroke: 2.2, cls: 'progress__chev' }),
                    }}
                  />
                </button>
                <div className="progress__body">
                  <div className="progress__clip">
                    <div className="bar">
                      <span style={{ width: `${Math.max(donePct, 4)}%` }} />
                    </div>
                    <ul className="progress__list">
                      {MODULES.map((m) => {
                        const d = m.lessons.filter((l) => doneLessons.has(l.id)).length;
                        const full = d === m.lessons.length;
                        return (
                          <li key={m.id}>
                            <span
                              className={`check ${full ? 'is-on' : d > 0 ? 'is-part' : ''}`}
                              dangerouslySetInnerHTML={{
                                __html: renderIcon('check', { size: 11, stroke: 3 }),
                              }}
                            />
                            <span className="progress__label">{m.title}</span>
                            <span className="progress__count">
                              {d}/{m.lessons.length}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>
            </aside>
          )}

          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
          />

          {/* ACTIVE VIEW */}
          {activeTab === 'landing' && (
            <main
              style={{
                gridColumn: '1 / -1',
                width: '100%',
                minWidth: 0,
                flex: 1,
                overflowY: 'auto',
                background: 'var(--paper)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <LandingView
                user={user}
                onNavigateTab={(tab) => handleNavigateTab(tab)}
                onOpenLogin={() => {
                  setTargetTabAfterLogin('learn');
                  setActiveTab('login');
                }}
              />
            </main>
          )}

          {activeTab === 'login' && (
            <main
              style={{
                gridColumn: '1 / -1',
                width: '100%',
                minWidth: 0,
                flex: 1,
                overflowY: 'auto',
                background: 'var(--paper)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <LoginPage
                targetDestination="Applied Cryptography Learning Curriculum"
                onBackToLanding={() => setActiveTab('landing')}
                onLoginSuccess={(loggedUser) => {
                  setUser(loggedUser);
                  setIsAuthenticated(true);
                  writeStorage('isAuthenticated', true);
                  setActiveTab('learn');
                }}
              />
            </main>
          )}

          {activeTab === 'learn' && (
            <>
              <main className="sheet">
                <div className="lesson-head is-fresh" key={`head-${lesson.id}`}>
                  <div className="crumb">
                    {lessonMeta.module.num}. {lessonMeta.module.title} <span>/</span> Lesson{' '}
                    {lessonMeta.index} of {lessonMeta.of}
                  </div>
                  <div className="lesson-head__row">
                    <h1 className="title">{lesson.title}</h1>
                    <div className="tags">
                      <span className="tag tag--sand">
                        <span dangerouslySetInnerHTML={{ __html: renderIcon('clock', { size: 13, stroke: 2 }) }} />
                        {lesson.minutes} min
                      </span>
                      <span className="tag tag--mint">
                        <span dangerouslySetInnerHTML={{ __html: renderIcon('signal', { size: 13, stroke: 2 }) }} />
                        {LEVELS[lesson.level] || lesson.level}
                      </span>
                      <span className="tag tag--violet">
                        <span
                          dangerouslySetInnerHTML={{ __html: renderIcon('listOrdered', { size: 13, stroke: 2 }) }}
                        />
                        {lesson.steps.length} steps
                      </span>
                    </div>
                  </div>
                  <p className="subtitle" title={lesson.summary}>
                    {lesson.summary}
                  </p>
                </div>

                <section className={`card stage ${isFullscreen ? 'is-full' : ''}`}>
                  <div className="stage__hud" id="hud">
                    {lesson.metrics.map((metricKey) => {
                      const def = METRICS[metricKey];
                      if (!def) return null;
                      const val = currentStep.metrics[metricKey] ?? null;
                      const level = def.level ? def.level(val) : 'none';
                      return (
                        <div className="chip" key={metricKey} data-k={metricKey} data-level={level}>
                          <span className="chip__label">
                            <span
                              dangerouslySetInnerHTML={{
                                __html: renderIcon(def.icon, { size: 12, stroke: 2 }),
                              }}
                            />
                            {def.label}
                          </span>
                          <span className="chip__value">{def.fmt(val)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="stage__tools">
                    {isZoomed && (
                      <button
                        className="tool tool--fit"
                        type="button"
                        title="Back to the whole diagram (0)"
                        onClick={() => stageRef.current?.fit()}
                      >
                        <span
                          dangerouslySetInnerHTML={{ __html: renderIcon('zoomOut', { size: 15, stroke: 2 }) }}
                        />
                        <span>Fit</span>
                      </button>
                    )}
                    <button
                      className="tool"
                      type="button"
                      title="Replay this step (R)"
                      onClick={handleReplay}
                    >
                      <span
                        dangerouslySetInnerHTML={{ __html: renderIcon('replay', { size: 15, stroke: 2 }) }}
                      />
                      <span>Replay</span>
                    </button>
                    <button
                      className={`tool ${isPaused ? 'is-on' : ''}`}
                      type="button"
                      title={isPaused ? 'Play traffic (Space)' : 'Pause traffic (Space)'}
                      onClick={() => setIsPaused((p) => !p)}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderIcon(isPaused ? 'play' : 'pause', { size: 15, stroke: 2 }),
                        }}
                      />
                      <span>{isPaused ? 'Play' : 'Pause'}</span>
                    </button>
                    <button
                      className="tool tool--expand"
                      type="button"
                      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                      aria-label={isFullscreen ? 'Exit full screen' : 'Show the diagram full screen'}
                      onClick={() => setIsFullscreen((f) => !f)}
                      dangerouslySetInnerHTML={{
                        __html: renderIcon(isFullscreen ? 'collapse' : 'expand', { size: 15, stroke: 2 }),
                      }}
                    />
                  </div>

                  <div className="stage__canvas" ref={stageHostRef} />

                  <div className="stage__legend">
                    {lesson.legend.map((entry, idx) => {
                      const [kind, customLabel] = Array.isArray(entry)
                        ? entry
                        : [entry, LEGEND_ITEMS[entry]?.[1] || entry];
                      const glyph = LEGEND_ITEMS[kind]?.[0] || '<i class="lg lg--req"></i>';
                      return (
                        <span
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: `${glyph}${customLabel}` }}
                        />
                      );
                    })}
                  </div>
                </section>

                <section className="card timeline">
                  <div className="timeline__head">
                    <span className="eyebrow">In this scenario</span>
                    <span className="timeline__count">
                      Step {step + 1} of {lesson.steps.length}
                    </span>
                  </div>
                  <div
                    className="timeline__track"
                    style={{ '--n': lesson.steps.length } as React.CSSProperties}
                  >
                    <div className="timeline__rail">
                      <span
                        style={{
                          width: `${
                            lesson.steps.length > 1
                              ? (step / (lesson.steps.length - 1)) * 100
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                    <ol className="timeline__steps">
                      {lesson.steps.map((s, idx) => (
                        <li
                          key={idx}
                          className={
                            idx === step ? 'is-current' : idx < step ? 'is-done' : ''
                          }
                        >
                          <button
                            type="button"
                            title={s.title}
                            onClick={() => navigateTo(lesson.id, idx)}
                          >
                            <span
                              className={`timeline__dot chapter-dot--${CHAPTERS[s.chapter].tone}`}
                            >
                              {idx + 1}
                            </span>
                            <span className="timeline__label">{s.short}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              </main>

              {/* RIGHT GUIDE + LEARNING GOALS RAIL */}
              <aside className="rail">
                <section className="card guide">
                  <div className="guide__meta">
                    <span className="eyebrow">
                      Step {step + 1} / {lesson.steps.length}
                    </span>
                    <div className="guide__meta-end">
                      <span className={`chapter chapter--${chapterMeta.tone}`}>
                        {chapterMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="guide__content is-in" key={`${lesson.id}-${step}`}>
                    <h2 className="guide__title">{currentStep.title}</h2>
                    <div className="guide__body">
                      {currentStep.body.map((chunk, i) =>
                        BLOCK_HTML_RE.test(chunk.trim()) ? (
                          <div key={i} dangerouslySetInnerHTML={{ __html: chunk }} />
                        ) : (
                          <p key={i} dangerouslySetInnerHTML={{ __html: chunk }} />
                        )
                      )}
                    </div>

                    {currentStep.callout && (
                      <div className={`callout callout--${currentStep.callout.kind}`}>
                        <div
                          className="callout__icon"
                          dangerouslySetInnerHTML={{
                            __html: renderIcon(CALLOUT_META[currentStep.callout.kind].icon, {
                              size: 16,
                              stroke: 2,
                            }),
                          }}
                        />
                        <div>
                          <div className="callout__title">
                            {CALLOUT_META[currentStep.callout.kind].title}
                          </div>
                          <p dangerouslySetInnerHTML={{ __html: currentStep.callout.text }} />
                        </div>
                      </div>
                    )}

                    {currentStep.changes && currentStep.changes.length > 0 && (
                      <div className="changes">
                        <div className="eyebrow">What changed</div>
                        <ul>
                          {currentStep.changes.map((chg, idx) => {
                            const kind = chg.startsWith('+')
                              ? 'add'
                              : chg.startsWith('−') || chg.startsWith('-')
                                ? 'del'
                                : 'mod';
                            const symbol = kind === 'add' ? '+' : kind === 'del' ? '−' : '~';
                            return (
                              <li key={idx} className={`chg chg--${kind}`}>
                                <b>{symbol}</b>
                                <span>{chg.slice(2)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="guide__nav">
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={step === 0}
                      onClick={() => navigateTo(lesson.id, step - 1)}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderIcon('arrowLeft', { size: 15, stroke: 2.2 }),
                        }}
                      />
                      Back
                    </button>
                    <button
                      type="button"
                      className={`btn-pop btn-next ${nextLabel.length > 21 ? 'is-long' : ''}`}
                      onClick={() => {
                        if (!isLastStep) navigateTo(lesson.id, step + 1);
                        else if (nextLesson) navigateTo(nextLesson.id, 0);
                        else setActiveTab('lab');
                      }}
                    >
                      <span className="btn-next__label">{nextLabel}</span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderIcon(
                            isLastStep && !nextLesson ? 'settings' : 'arrowRight',
                            { size: 15, stroke: 2.2 }
                          ),
                        }}
                      />
                    </button>
                  </div>

                  <div className="guide__hint">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderIcon('keyboard', { size: 14, stroke: 1.8 }),
                      }}
                    />
                    <span>
                      <kbd>←</kbd> <kbd>→</kbd> step · <kbd>R</kbd> replay · <kbd>Space</kbd> pause
                    </span>
                  </div>
                </section>

                <section className="card goals">
                  <div className="eyebrow">You’ll learn</div>
                  <ul>
                    {lesson.goals.map((g, idx) => {
                      const hit = step >= g.step;
                      return (
                        <li key={idx} className={hit ? 'is-hit' : ''}>
                          <button
                            type="button"
                            onClick={() => navigateTo(lesson.id, g.step)}
                            title={`Jump to step ${g.step + 1}`}
                          >
                            <span
                              className={`check ${hit ? 'is-on' : ''}`}
                              dangerouslySetInnerHTML={{
                                __html: renderIcon('check', { size: 11, stroke: 3 }),
                              }}
                            />
                            <span>{g.text}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </aside>
            </>
          )}

          {activeTab === 'lab' && <CryptoLabView theme={theme} />}
          {activeTab === 'practice' && <AttackLabView theme={theme} />}
          {activeTab === 'cheatsheets' && <CheatsheetsView />}
        </div>
      </div>

      {/* LOGIN MODAL */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(updatedUser) => {
          setUser(updatedUser);
          setIsAuthenticated(true);
          writeStorage('isAuthenticated', true);
          setActiveTab('learn');
        }}
      />

      {/* SEARCH MODAL (⌘K) */}
      {searchOpen && (
        <div className="sx is-open">
          <div className="sx__backdrop" onClick={() => setSearchOpen(false)} />
          <div className="sx__dialog" role="dialog" aria-modal="true" aria-label="Search cryptography course">
            <div className="sx__bar">
              <span
                dangerouslySetInnerHTML={{
                  __html: renderIcon('search', { size: 19, stroke: 2.2, cls: 'sx__glass' }),
                }}
              />
              <input
                ref={searchInputRef}
                className="sx__input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchIndex((i) => (searchResults.length ? (i + 1) % searchResults.length : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchIndex((i) =>
                      searchResults.length ? (i - 1 + searchResults.length) % searchResults.length : 0
                    );
                  } else if (e.key === 'Enter' && searchResults[searchIndex]) {
                    e.preventDefault();
                    const picked = searchResults[searchIndex];
                    navigateTo(picked.lessonId, picked.step);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search Alice, Salt, Argon2id, TLS, SHA-256, KMS, Replay…"
                spellCheck={false}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className="sx__clear"
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="sx__esc"
                type="button"
                onClick={() => setSearchOpen(false)}
              >
                esc
              </button>
            </div>

            <div className="sx__list" role="listbox">
              {searchResults.length === 0 ? (
                <div className="sx__empty">
                  <div className="sx__empty-title">Nothing matches “{searchQuery.trim()}”</div>
                  <p>Try searching for one of these cryptography topics:</p>
                  <div className="sx__chips">
                    {['Alice', 'Salt', 'Argon2id', 'Certificate', 'TLS', 'SHA-256', 'KMS', 'Replay'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSearchQuery(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <a
                    key={`${item.kind}-${item.lessonId}-${item.step}-${idx}`}
                    href={`#/${item.lessonId}/${item.step + 1}`}
                    className={`sx__item ${idx === searchIndex ? 'is-sel' : ''}`}
                    onMouseEnter={() => setSearchIndex(idx)}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(item.lessonId, item.step);
                      setSearchOpen(false);
                    }}
                  >
                    <div className="sx__item-icon">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderIcon(
                            item.kind === 'lesson' ? 'book' : 'shield',
                            { size: 16, stroke: 2 }
                          ),
                        }}
                      />
                    </div>
                    <div className="sx__item-body">
                      <div className="sx__item-title">{item.title}</div>
                      <div className="sx__item-sub">{item.subtitle}</div>
                    </div>
                    <div className="sx__item-mod">{item.moduleLabel}</div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

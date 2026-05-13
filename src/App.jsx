import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// ─────────────────────────────────────────────
// GAME DATA
// ─────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 1,
    level: 'NIVEAU 1',
    location: '🏠 La Maison',
    emoji: '🏠',
    story: 'Tu as cassé le vase. Maman arrive.',
    question: "Qu'est-ce que tu fais ?",
    choices: [
      { emoji: '🙋', text: "C'est moi maman, pardon !", correct: true },
      { emoji: '🫣', text: "C'est pas moi !", correct: false },
    ],
    hadith: 'La vérité mène vers le Paradis.',
    hadithSource: 'Bukhārī',
    blockColor: '#2ecc71',
  },
  {
    id: 2,
    level: 'NIVEAU 2',
    location: '🏫 L\'École',
    emoji: '🏫',
    story: "Tu n'as pas fait ton devoir. La maîtresse demande qui.",
    question: 'Que fais-tu ?',
    choices: [
      { emoji: '🙋', text: "Moi maîtresse, j'ai oublié.", correct: true },
      { emoji: '🫥', text: 'Je me cache derrière mon ami.', correct: false },
    ],
    hadith: "Dis la vérité même si c'est dur.",
    hadithSource: 'at-Tirmidhī',
    blockColor: '#3498db',
  },
  {
    id: 3,
    level: 'NIVEAU 3',
    location: '🌳 Le Parc',
    emoji: '🌳',
    story: 'Tu as pris le jouet de ta sœur. Elle pleure. Papa arrive.',
    question: "Qu'est-ce que tu dis ?",
    choices: [
      { emoji: '🤲', text: "Papa c'est moi, je lui rends.", correct: true },
      { emoji: '😤', text: "C'est elle qui l'a perdu !", correct: false },
    ],
    hadith: "Sois honnête, c'est la voie du Prophète ﷺ.",
    hadithSource: 'Hadīth',
    blockColor: '#9b59b6',
  },
  {
    id: 4,
    level: 'NIVEAU 4',
    location: '🕌 La Mosquée',
    emoji: '🕌',
    story: "Tu n'as pas appris la sourate. L'imam demande.",
    question: 'Que fais-tu ?',
    choices: [
      { emoji: '🤍', text: "Je sais pas encore, j'apprends.", correct: true },
      { emoji: '🙋', text: 'Je lève la main pour faire semblant.', correct: false },
    ],
    hadith: 'Les anges écrivent tout ce que tu fais.',
    hadithSource: 'Coran 50:18',
    blockColor: '#e67e22',
  },
  {
    id: 5,
    level: 'NIVEAU 5',
    location: '🛍️ Le Magasin',
    emoji: '🛍️',
    story: "Tu as pris un bonbon sans payer. Le vendeur te regarde.",
    question: 'Que fais-tu ?',
    choices: [
      { emoji: '😇', text: "Excusez-moi, je l'ai pas payé.", correct: true },
      { emoji: '😰', text: 'Je mets le bonbon dans ma poche.', correct: false },
    ],
    hadith: "Le menteur, Allah ne l'aime pas.",
    hadithSource: 'Bukhārī',
    blockColor: '#f1c40f',
  },
];

const PATH_NODES = ['🏠', '🏫', '🌳', '🕌', '🛍️', '✨'];

// ─────────────────────────────────────────────
// WEB AUDIO API SOUND ENGINE
// ─────────────────────────────────────────────
function getOrCreateAudioCtx(ref) {
  if (!ref.current) {
    try {
      ref.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ref.current.state === 'suspended') ref.current.resume();
  return ref.current;
}

function playTone(ctx, freq, start, duration, type, gain) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type || 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain || 0.3, start + 0.02);
  g.gain.linearRampToValueAtTime(0, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playCorrect(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, 523.25, t, 0.15, 'triangle', 0.3);
  playTone(ctx, 659.25, t + 0.15, 0.15, 'triangle', 0.3);
  playTone(ctx, 783.99, t + 0.30, 0.30, 'triangle', 0.35);
}
function playWrong(ctx) {
  const t = ctx.currentTime;
  playTone(ctx, 293.66, t, 0.20, 'sawtooth', 0.18);
  playTone(ctx, 261.63, t + 0.20, 0.35, 'sawtooth', 0.13);
}
function playLevelStart(ctx) {
  const t = ctx.currentTime;
  [392, 523.25, 659.25, 783.99].forEach((f, i) =>
    playTone(ctx, f, t + i * 0.1, 0.1 + (i === 3 ? 0.15 : 0), 'triangle', 0.25)
  );
}
function playVictory(ctx) {
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 880, 1046.50].forEach((f, i) =>
    playTone(ctx, f, t + i * 0.18, 0.3, 'triangle', 0.3)
  );
}
function playCombo(ctx) {
  const t = ctx.currentTime;
  [880, 1046.50, 1318.51].forEach((f, i) =>
    playTone(ctx, f, t + i * 0.1, 0.2, 'triangle', 0.3)
  );
}

// ─────────────────────────────────────────────
// NIGHT SKY
// ─────────────────────────────────────────────
const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 23 + 5) % 68,
  size: (i % 3) + 1,
  delay: (i * 0.3) % 4,
  dur: 2 + (i % 3),
}));

function NightSky() {
  return (
    <div className="night-sky" aria-hidden="true">
      {STARS.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.x + '%',
            top: s.y + '%',
            width: s.size,
            height: s.size,
            animationDelay: s.delay + 's',
            animationDuration: s.dur + 's',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MOSQUE SILHOUETTE (pure CSS/SVG)
// ─────────────────────────────────────────────
function MosqueSilhouette() {
  return (
    <div className="mosque-silhouette" aria-hidden="true">
      <svg width="100%" height="120" viewBox="0 0 480 120" preserveAspectRatio="xMidYMax meet">
        <ellipse cx="240" cy="60" rx="60" ry="50" fill="#0a1628" />
        <ellipse cx="160" cy="75" rx="35" ry="35" fill="#0a1628" />
        <ellipse cx="320" cy="75" rx="35" ry="35" fill="#0a1628" />
        <ellipse cx="80" cy="85" rx="25" ry="25" fill="#0a1628" />
        <ellipse cx="400" cy="85" rx="25" ry="25" fill="#0a1628" />
        <rect x="202" y="10" width="10" height="52" fill="#0a1628" />
        <ellipse cx="207" cy="10" rx="5" ry="9" fill="#0a1628" />
        <rect x="268" y="10" width="10" height="52" fill="#0a1628" />
        <ellipse cx="273" cy="10" rx="5" ry="9" fill="#0a1628" />
        <rect x="60" y="90" width="360" height="30" fill="#0a1628" />
        <ellipse cx="180" cy="105" rx="18" ry="13" fill="#0d1f3c" />
        <ellipse cx="240" cy="105" rx="18" ry="13" fill="#0d1f3c" />
        <ellipse cx="300" cy="105" rx="18" ry="13" fill="#0d1f3c" />
        <text x="207" y="7" fontSize="7" fill="#f1c40f" textAnchor="middle">✦</text>
        <text x="273" y="7" fontSize="7" fill="#f1c40f" textAnchor="middle">✦</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// FIREWORKS
// ─────────────────────────────────────────────
const FW_DATA = [
  { left: '18%', top: '28%', cls: 'fw1', emoji: '🌟', sz: 28 },
  { left: '50%', top: '18%', cls: 'fw2', emoji: '✨', sz: 32 },
  { left: '78%', top: '32%', cls: 'fw3', emoji: '💫', sz: 24 },
  { left: '30%', top: '48%', cls: 'fw4', emoji: '⭐', sz: 26 },
  { left: '68%', top: '52%', cls: 'fw5', emoji: '🌠', sz: 30 },
  { left: '12%', top: '60%', cls: 'fw1', emoji: '🎆', sz: 22 },
  { left: '88%', top: '22%', cls: 'fw3', emoji: '🎇', sz: 28 },
];

function Fireworks() {
  return (
    <div className="fireworks-container" aria-hidden="true">
      {FW_DATA.map((f, i) => (
        <span
          key={i}
          className={`firework ${f.cls}`}
          style={{ left: f.left, top: f.top, fontSize: f.sz }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// PARADISE HOUSE
// ─────────────────────────────────────────────
const HOUSE_ROWS = [
  { cols: [null, null, '#f1c40f', '#f1c40f', '#f1c40f', null, null], minScore: 5 },
  { cols: [null, '#f1c40f', '#f1c40f', '#f1c40f', '#f1c40f', '#f1c40f', null], minScore: 4 },
  { cols: ['#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71'], minScore: 3 },
  { cols: ['#2ecc71', '#2ecc71', null, '#27ae60', null, '#2ecc71', '#2ecc71'], minScore: 2 },
  { cols: ['#2ecc71', '#2ecc71', '#2ecc71', '#3498db', '#2ecc71', '#2ecc71', '#2ecc71'], minScore: 1 },
];

function ParadiseHouse({ score }) {
  return (
    <div className="paradise-house" aria-label="Maison du Paradis">
      {HOUSE_ROWS.map((row, ri) => (
        <div key={ri} className="house-row">
          {row.cols.map((color, ci) => {
            if (!color) return <div key={ci} style={{ width: 24, height: 24 }} />;
            const filled = score >= row.minScore;
            return (
              <div
                key={ci}
                className={`house-block ${filled ? 'filled' : 'empty'}`}
                style={filled ? { background: color, animationDelay: `${(ri * 7 + ci) * 0.04}s` } : {}}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS PATH
// ─────────────────────────────────────────────
function ProgressPath({ currentLevel }) {
  return (
    <div className="progress-path">
      {PATH_NODES.map((node, i) => (
        <span key={i} className={`path-node ${i <= currentLevel ? 'reached' : 'not-reached'}`}>
          {node}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('title');
  const [playerName, setPlayerName] = useState('');
  const [levelIdx, setLevelIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [charState, setCharState] = useState('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [comboMega, setComboMega] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [locked, setLocked] = useState(false);

  const audioRef = useRef(null);
  const countdownRef = useRef(null);

  const ctx = useCallback(() => getOrCreateAudioCtx(audioRef), []);

  const scenario = SCENARIOS[levelIdx];

  // Countdown
  useEffect(() => {
    if (screen !== 'levelcard') return;
    const ac = ctx();
    if (ac) playLevelStart(ac);
    let n = 3;
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownRef.current);
        setScreen('gameplay');
        setLocked(false);
        setSelectedChoice(null);
        setCharState('idle');
      } else {
        setCountdownNum(n);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [screen, ctx]);

  const handleChoice = useCallback((i) => {
    if (locked) return;
    setLocked(true);
    const choice = scenario.choices[i];
    setSelectedChoice(i);

    if (choice.correct) {
      setLastCorrect(true);
      setCharState('correct');
      setScore((s) => s + 1);
      setXp((x) => Math.min(100, x + 20));
      const newCombo = combo + 1;
      setCombo(newCombo);
      const ac = ctx();
      if (ac) playCorrect(ac);
      if (newCombo >= 3) {
        if (ac) playCombo(ac);
        setComboMega(true);
        setTimeout(() => setComboMega(false), 1500);
      }
    } else {
      setLastCorrect(false);
      setCharState('wrong');
      setCombo(0);
      setLives((l) => Math.max(0, l - 1));
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      const ac = ctx();
      if (ac) playWrong(ac);
    }

    setTimeout(() => setScreen('consequence'), 800);
  }, [locked, scenario, combo, ctx]);

  const handleContinue = useCallback(() => {
    const next = levelIdx + 1;
    if (next >= SCENARIOS.length) {
      setStreak((s) => s + 1);
      setCharState('celebrating');
      const ac = ctx();
      if (ac) playVictory(ac);
      setScreen('victory');
    } else {
      setLevelIdx(next);
      setCountdownNum(3);
      setScreen('levelcard');
    }
  }, [levelIdx, ctx]);

  const handleReplay = useCallback(() => {
    setScreen('title');
    setLevelIdx(0);
    setLives(3);
    setScore(0);
    setXp(0);
    setCombo(0);
    setLastCorrect(null);
    setSelectedChoice(null);
    setCharState('idle');
    setLocked(false);
    setComboMega(false);
  }, []);

  const handleShare = useCallback(() => {
    const name = playerName || 'La Gardienne';
    const text = `${name} a collecté ${score}/5 lumières dans "La Gardienne de la Vérité" ! 🌟 Māshā'Allāh ! #IslamicGame`;
    navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {});
  }, [playerName, score]);

  // ── TITLE ──
  if (screen === 'title') return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <div className="screen title-screen" role="main">
        <span className="crescent-moon" aria-hidden="true">🌙</span>
        <h1 className="game-title">LA GARDIENNE<br />DE LA VÉRITÉ</h1>
        <p className="game-subtitle">✨ Une aventure islamique ✨</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['⭐', '🌟', '💫', '✨', '⭐', '🌟', '💫'].map((s, i) => (
            <span key={i} aria-hidden="true" style={{ fontSize: 20, animation: `twinkle ${2 + i * 0.2}s ease-in-out ${i * 0.2}s infinite` }}>{s}</span>
          ))}
        </div>
        {streak > 0 && <div className="streak-badge">🔥 Série : {streak} partie{streak > 1 ? 's' : ''} !</div>}
        <button className="btn-start" onClick={() => setScreen('charselect')} aria-label="Commencer">▶ JOUER !</button>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Pour les enfants · Langue française · Thème islamique</p>
      </div>
    </div>
  );

  // ── CHAR SELECT ──
  if (screen === 'charselect') return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <div className="screen char-screen" role="main">
        <div className="character-display" aria-hidden="true" role="img" aria-label="Fille avec hijab">👧</div>
        <h2>C&apos;est toi ! 👧</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>La gardienne courageuse de la vérité</p>
        <label htmlFor="nameInput" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Comment tu t&apos;appelles ?</label>
        <input
          id="nameInput"
          className="name-input"
          type="text"
          placeholder="Ton prénom..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
          maxLength={20}
          autoComplete="off"
        />
        <button
          className="btn-primary"
          onClick={() => { setLevelIdx(0); setLives(3); setScore(0); setXp(0); setCombo(0); setCountdownNum(3); setScreen('levelcard'); }}
        >
          C&apos;est parti ! 🚀
        </button>
        <button
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, marginTop: 4 }}
          onClick={() => setScreen('title')}
        >← Retour</button>
      </div>
    </div>
  );

  // ── LEVEL CARD ──
  if (screen === 'levelcard') return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <div className="screen" role="main" aria-live="polite">
        <div className="level-card-screen">
          <div className="level-card-bg" />
          <p className="level-number">{scenario.level}</p>
          <p className="level-title">{scenario.location}</p>
          <span className="level-emoji-big" aria-hidden="true">{scenario.emoji}</span>
          <p className="level-ready">Es-tu prête{playerName ? `, ${playerName}` : ''} ?</p>
          <span key={countdownNum} className="countdown-number" aria-label={String(countdownNum)}>
            {countdownNum}
          </span>
        </div>
      </div>
    </div>
  );

  // ── GAMEPLAY ──
  if (screen === 'gameplay') return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <div className={`screen gameplay-screen${shaking ? ' screen-shake' : ''}`} role="main">
        {/* HUD */}
        <div className="hud">
          <div className="hud-top">
            <div className="hearts" aria-label={`${lives} vie${lives !== 1 ? 's' : ''}`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`heart${i >= lives ? ' lost' : ''}`} aria-hidden="true">❤️</span>
              ))}
            </div>
            <div className="xp-bar-container" aria-label={`${xp} XP`}>
              <div className="xp-bar-fill" style={{ width: xp + '%' }} />
              <span className="xp-label">{xp} XP</span>
            </div>
            <div className="lumieres-display" aria-label={`${score} lumières`}>✨{score}</div>
          </div>
          {combo >= 2 && (
            <div style={{ textAlign: 'center' }}>
              <span className="combo-badge">🔥 COMBO ×{combo}</span>
            </div>
          )}
        </div>

        <ProgressPath currentLevel={levelIdx} />

        {/* Character */}
        <div className="character-area">
          <span className={`character-emoji ${charState}`} aria-hidden="true" role="img" aria-label="Personnage">
            {charState === 'correct' ? '🤩' : charState === 'wrong' ? '😢' : charState === 'celebrating' ? '🥳' : '😇'}
          </span>
          {playerName && <span className="character-name">{playerName}</span>}
        </div>

        {comboMega && <div className="combo-mega" aria-live="assertive">COMBO VÉRITÉ 🔥</div>}

        {/* Story */}
        <div className="story-card">
          <p className="scenario-text">{scenario.story}</p>
          <p style={{ color: 'rgba(241,196,15,0.8)', fontSize: 16, marginTop: 8, fontStyle: 'italic' }}>{scenario.question}</p>
        </div>

        {/* Choices */}
        <div className="choices" role="group" aria-label="Tes choix">
          {scenario.choices.map((choice, i) => {
            let cls = 'choice-btn';
            if (selectedChoice !== null) {
              if (i === selectedChoice) cls += choice.correct ? ' correct-choice' : ' wrong-choice';
              else if (choice.correct) cls += ' correct-choice';
            }
            return (
              <button key={i} className={cls} onClick={() => handleChoice(i)} disabled={locked}>
                <span style={{ fontSize: 28 }} aria-hidden="true">{choice.emoji}</span>
                <span>{choice.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── CONSEQUENCE ──
  if (screen === 'consequence') return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <div
        className={`screen consequence-screen${lastCorrect ? ' correct-bg' : ''}`}
        onClick={handleContinue}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleContinue(); }}
        role="main"
        tabIndex={0}
        aria-live="polite"
        style={{ cursor: 'pointer' }}
      >
        <span
          className={`character-emoji ${lastCorrect ? 'correct' : 'wrong'}`}
          style={{ fontSize: 90, display: 'block', marginBottom: 8 }}
          aria-hidden="true"
        >
          {lastCorrect ? '🤩' : '😢'}
        </span>

        <div className={`consequence-big-text ${lastCorrect ? 'correct-text' : 'wrong-text'}`} aria-live="assertive">
          {lastCorrect ? "MĀSHĀ'ALLAH ! ✨" : 'Aïe...'}
        </div>

        <p className="consequence-message">
          {lastCorrect
            ? `WAOUW ! 🌟 Tu as choisi la vérité${playerName ? `, ${playerName}` : ''} !`
            : 'Mais Allah pardonne ! 💛 Tu peux recommencer !'}
        </p>

        {lastCorrect && (
          <div className="hadith-scroll" aria-label="Hadith">
            <p className="hadith-text">« {scenario.hadith} »</p>
            <p className="hadith-source">— {scenario.hadithSource}</p>
          </div>
        )}

        {lastCorrect && (
          <div style={{ textAlign: 'center' }}>
            <div className="paradise-block" aria-label="Bloc du Paradis">🧱</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
              +1 bloc sur ta Maison du Paradis !
            </p>
          </div>
        )}

        {!lastCorrect && lives <= 2 && (
          <p style={{ color: '#e74c3c', fontSize: 16, fontWeight: 700 }}>
            ❤️ Il te reste {lives} vie{lives !== 1 ? 's' : ''} !
          </p>
        )}

        <p className="tap-continue">👆 Touche l&apos;écran pour continuer</p>
      </div>
    </div>
  );

  // ── VICTORY ──
  return (
    <div className="game-wrapper">
      <NightSky />
      <MosqueSilhouette />
      <div className="islamic-border" aria-hidden="true" />
      <div className="islamic-border islamic-border-bottom" aria-hidden="true" />
      <Fireworks />
      <div className="screen victory-screen" role="main" aria-live="polite">
        <span className="victory-character" aria-hidden="true">🥳</span>
        <h1 className="victory-title">FÉLICITATIONS !<br />🌟 Māshā&apos;Allāh ! 🌟</h1>
        <div className="victory-score">
          <span className="score-lumiere">✨ {score} / 5 lumières collectées ✨</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <p style={{ color: 'rgba(241,196,15,0.8)', fontSize: 14, marginBottom: 8, fontWeight: 700 }}>
            🏡 TA MAISON DU PARADIS
          </p>
          <ParadiseHouse score={score} />
        </div>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>
            <span>XP total</span><span>{xp} pts</span>
          </div>
          <div className="xp-bar-container" style={{ height: 20 }}>
            <div className="xp-bar-fill" style={{ width: xp + '%' }} />
          </div>
        </div>
        <div className="angel-letter" aria-label="Lettre des anges">
          <p className="angel-letter-title">📜 Lettre des Anges</p>
          <p>
            Chère {playerName || 'gardienne'} ✨<br />
            Tu as choisi la vérité {score} fois aujourd&apos;hui.<br />
            {score === 5
              ? "Les anges ont tout écrit. Māshā'Allāh !"
              : score >= 3
              ? "Continue à pratiquer l'honnêteté, c'est bien !"
              : "La vérité s'apprend. Ré-essaie, tu vas y arriver !"}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
          <button className="btn-primary" onClick={handleReplay} style={{ flex: 1 }} aria-label="Rejouer">🔄 Rejouer</button>
          <button
            className="btn-primary"
            onClick={handleShare}
            style={{ flex: 1, background: '#3498db', boxShadow: '0 4px 0 #1a5f8a' }}
            aria-label="Partager le score"
          >📤 Partager</button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>
          🔥 Série : {streak} partie{streak > 1 ? 's' : ''} consécutive{streak > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

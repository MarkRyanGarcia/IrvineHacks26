import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SCOPE_CLASS = "chatting-page-isolated";

export default function ChattingPage() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Override global theme when this page is active (avoids black screen from index.css dark theme)
  useEffect(() => {
    document.documentElement.classList.add(SCOPE_CLASS);
    document.body.classList.add(SCOPE_CLASS);
    return () => {
      document.documentElement.classList.remove(SCOPE_CLASS);
      document.body.classList.remove(SCOPE_CLASS);
    };
  }, []);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      // TODO: pass input to analyze/chat flow
      navigate("/analyze");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Jost:wght@300;400&display=swap');

        /* Isolated theme override – only when ChattingPage is mounted */
        html.${SCOPE_CLASS},
        body.${SCOPE_CLASS},
        body.${SCOPE_CLASS} #root {
          background: #FDF6EE !important;
          min-height: 100vh !important;
        }

        .${SCOPE_CLASS} *, .${SCOPE_CLASS} *::before, .${SCOPE_CLASS} *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Blob drift animations ── */
        @keyframes drift-a {
          0%   { transform: translate(0px,   0px)  scale(1);    }
          50%  { transform: translate(28px, -22px) scale(1.05); }
          100% { transform: translate(-12px, 18px) scale(0.97); }
        }
        @keyframes drift-b {
          0%   { transform: translate(0px,   0px)  scale(1);    }
          50%  { transform: translate(-30px, 20px) scale(1.07); }
          100% { transform: translate(15px, -28px) scale(0.95); }
        }
        @keyframes drift-c {
          0%   { transform: translate(0px,  0px)  scale(1);    }
          50%  { transform: translate(22px, 30px) scale(0.96); }
          100% { transform: translate(-18px,-15px) scale(1.04); }
        }
        @keyframes drift-d {
          0%   { transform: translate(0px,   0px)  scale(1);    }
          50%  { transform: translate(-25px,-18px) scale(1.06); }
          100% { transform: translate(20px,  25px) scale(0.94); }
        }
        @keyframes drift-e {
          0%   { transform: translate(0px,  0px);  }
          50%  { transform: translate(16px,-12px); }
          100% { transform: translate(-20px, 8px); }
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        /* ── Sun rise animation ── */
        @keyframes sun-rise {
          0%   { clip-path: circle(48px at 50% 50%); }
          60%  { clip-path: circle(80vmax at 50% 50%); }
          100% { clip-path: circle(150vmax at 50% 50%); }
        }

        @keyframes face-fade {
          0%   { opacity: 1; }
          30%  { opacity: 1; }
          60%  { opacity: 0; }
          100% { opacity: 0; }
        }

        .${SCOPE_CLASS} .sun-overlay {
          position: absolute;
          inset: 0;
          background: #FF6200;
          clip-path: circle(48px at 50% 50%);
          animation: sun-rise 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
          z-index: 1;
          pointer-events: none;
        }

        .${SCOPE_CLASS} .sun-face {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 96px;
          height: 96px;
          z-index: 2;
          animation: face-fade 1.8s ease 0.3s forwards;
          pointer-events: none;
        }

        /* ── Root (scoped to isolate from global theme) ── */
        .${SCOPE_CLASS} .page-root {
          min-height: 100vh;
          background: #FDF6EE !important;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: 'Jost', sans-serif;
        }

        /* ── Background canvas ── */
        .${SCOPE_CLASS} .bg-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .${SCOPE_CLASS} .blob-a { animation: drift-a 18s ease-in-out infinite; transform-origin: center; }
        .${SCOPE_CLASS} .blob-b { animation: drift-b 22s ease-in-out infinite; transform-origin: center; }
        .${SCOPE_CLASS} .blob-c { animation: drift-c 16s ease-in-out infinite; transform-origin: center; }
        .${SCOPE_CLASS} .blob-d { animation: drift-d 20s ease-in-out infinite; transform-origin: center; }
        .${SCOPE_CLASS} .blob-e { animation: drift-e 14s ease-in-out infinite; transform-origin: center; }

        /* ── Nav ── */
        .${SCOPE_CLASS} .nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 52px;
        }

        .${SCOPE_CLASS} .nav-logo {
          font-family: 'Fraunces', serif;
          font-size: 0.9rem;
          font-weight: 400;
          color: #fff !important;
          letter-spacing: -0.01em;
          text-decoration: none;
        }

        .${SCOPE_CLASS} .nav-links {
          display: flex;
          align-items: center;
          gap: 40px;
          list-style: none;
        }

        .${SCOPE_CLASS} .nav-links a {
          font-family: 'Jost', sans-serif;
          font-size: 0.82rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.75) !important;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .${SCOPE_CLASS} .nav-links a:hover { color: #fff !important; }

        .${SCOPE_CLASS} .nav-cta {
          font-family: 'Jost', sans-serif;
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: #FF6200 !important;
          background: #fff !important;
          border: none;
          border-radius: 100px;
          padding: 10px 26px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .${SCOPE_CLASS} .nav-cta:hover { opacity: 0.82; }

        /* ── Main ── */
        .${SCOPE_CLASS} .main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 8vh 24px 100px;
        }

        /* ── Greeting ── */
        .${SCOPE_CLASS} .greeting {
          font-family: 'Fraunces', serif;
          font-size: clamp(3rem, 5vw, 5.5rem);
          font-weight: 300;
          font-style: italic;
          color: #fff !important;
          line-height: 1.15;
          letter-spacing: -0.02em;
          max-width: 900px;
          animation: fade-up 1s ease 2.2s forwards;
          opacity: 0;
        }

        .${SCOPE_CLASS} .greeting em {
          font-style: normal;
          font-size: clamp(2rem, 3.5vw, 4rem);
          color: rgba(255,255,255,0.75) !important;
          display: block;
          margin-top: 0.2em;
        }

        /* ── Input zone ── */
        .${SCOPE_CLASS} .input-zone {
          margin-top: 80px;
          width: 100%;
          max-width: 520px;
          animation: fade-up 1s ease 2.5s forwards;
          opacity: 0;
          cursor: text;
        }

        .${SCOPE_CLASS} .input-line-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
          padding-bottom: 0;
          border-bottom: none;
        }

        .${SCOPE_CLASS} .input-line-wrapper.focused {
          border-color: transparent;
        }

        /* Hidden textarea for real input */
        .${SCOPE_CLASS} .input-textarea {
          width: 100%;
          background: transparent !important;
          border: none;
          outline: none;
          resize: none;
          overflow: hidden;
          min-height: 30px;
          font-family: 'Jost', sans-serif;
          font-size: 1rem;
          font-weight: 300;
          color: #fff !important;
          line-height: 1.7;
          letter-spacing: 0.01em;
          caret-color: #fff;
          position: relative;
          z-index: 1;
        }

        .${SCOPE_CLASS} .input-textarea::placeholder {
          color: transparent;
        }

        /* Ghost placeholder row: just the blinking cursor when empty */
        .${SCOPE_CLASS} .placeholder-ghost {
          position: absolute;
          top: 2px;
          left: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          font-family: 'Jost', sans-serif;
          font-size: 1rem;
          font-weight: 300;
          color: rgba(255,255,255,0.55) !important;
          line-height: 1.7;
          transition: opacity 0.15s;
          z-index: 0;
        }

        .${SCOPE_CLASS} .placeholder-ghost.hidden {
          opacity: 0;
        }

        .${SCOPE_CLASS} .cursor-line {
          display: inline-block;
          width: 3px;
          height: 2.5rem;
          background: #fff;
          vertical-align: middle;
          animation: blink 1.05s step-start infinite;
        }

        .${SCOPE_CLASS} .hint-text {
          margin-top: 16px;
          font-family: 'Jost', sans-serif;
          font-size: 0.72rem;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6) !important;
          opacity: 0.55;
        }
      `}</style>

      <div
        className="page-root"
        style={{ position: "fixed", inset: 0, background: "#FDF6EE", minHeight: "100vh", overflow: "auto", zIndex: 9999 }}
      >
        {/* ── Sun rise overlay ── */}
        <div className="sun-overlay" />

        {/* ── Logo face (visible while circle is small, fades as it expands) ── */}
        <svg className="sun-face" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M33 40 Q36 36 39 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M57 40 Q60 36 63 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M30 56 Q48 70 66 56" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </svg>

        {/* ── Animated background blobs (behind everything) ── */}
        <svg
          className="bg-canvas"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <filter id="big-blur">
              <feGaussianBlur stdDeviation="65" />
            </filter>
            <filter id="med-blur">
              <feGaussianBlur stdDeviation="42" />
            </filter>
          </defs>

          {/* Warm drifting blobs */}
          <g className="blob-a">
            <ellipse cx="170" cy="210" rx="370" ry="290" fill="#F9C89A" opacity="0.55" filter="url(#big-blur)" />
          </g>
          <g className="blob-b">
            <ellipse cx="1310" cy="155" rx="330" ry="270" fill="#F4A26A" opacity="0.46" filter="url(#big-blur)" />
          </g>
          <g className="blob-c">
            <ellipse cx="230" cy="810" rx="350" ry="230" fill="#FBBD7A" opacity="0.5" filter="url(#big-blur)" />
          </g>
          <g className="blob-d">
            <ellipse cx="1360" cy="760" rx="310" ry="250" fill="#F2A090" opacity="0.4" filter="url(#big-blur)" />
          </g>
          <g className="blob-e">
            <ellipse cx="720" cy="870" rx="270" ry="150" fill="#FBC88A" opacity="0.35" filter="url(#big-blur)" />
          </g>

          {/* ── Picasso / Matisse abstract shapes ── */}

          {/* Top-right: two overlapping circles, like a Matisse cutout */}
          <circle cx="1210" cy="75" r="46" fill="#E8845A" opacity="0.16" />
          <circle cx="1248" cy="68" r="30" fill="#D4621E" opacity="0.11" />

          {/* Bottom-left: organic arc, Matisse leaf-like */}
          <path
            d="M 45 825 Q 150 715 230 792 Q 308 865 195 928"
            fill="none"
            stroke="#E8845A"
            strokeWidth="2.5"
            opacity="0.18"
            strokeLinecap="round"
          />

          {/* Mid-left: leaf / almond shape */}
          <path
            d="M 78 475 Q 135 420 165 475 Q 135 530 78 475 Z"
            fill="#F4A26A"
            opacity="0.2"
          />

          {/* Top center: loose brushstroke arc */}
          <path
            d="M 560 28 Q 720 -18 882 32"
            fill="none"
            stroke="#D4621E"
            strokeWidth="2"
            opacity="0.1"
            strokeLinecap="round"
          />

          {/* Bottom-right: small filled circle */}
          <circle cx="1385" cy="855" r="52" fill="#F4B98A" opacity="0.22" />

          {/* Left side: small squiggle */}
          <path
            d="M 55 605 Q 105 575 128 607 Q 152 638 202 615"
            fill="none"
            stroke="#E8845A"
            strokeWidth="2"
            opacity="0.16"
            strokeLinecap="round"
          />

          {/* Right side: vertical soft arch */}
          <path
            d="M 1365 360 Q 1425 455 1365 545"
            fill="none"
            stroke="#D4621E"
            strokeWidth="3"
            opacity="0.12"
            strokeLinecap="round"
          />

          {/* Top-left: small circle pair */}
          <circle cx="345" cy="118" r="19" fill="#F4A26A" opacity="0.18" />
          <circle cx="370" cy="106" r="11" fill="#E8845A" opacity="0.13" />

          {/* Center-right: half-circle cutout */}
          <path
            d="M 1100 440 A 50 50 0 0 1 1100 540"
            fill="none"
            stroke="#F4A26A"
            strokeWidth="2.5"
            opacity="0.15"
            strokeLinecap="round"
          />
        </svg>

        {/* ── Nav ── */}
        <nav className="nav">
          <a href="/" className="nav-logo">realease.</a>
          <ul className="nav-links">
            <li><a href="/analyze">How it works</a></li>
            <li><a href="/report">My report</a></li>
            <li><a href="#">About</a></li>
          </ul>
          <button className="nav-cta">Sign in</button>
        </nav>

        {/* ── Hero ── */}
        <main className="main">
          <h1 className="greeting">
            I'm Realease. Ask me anything about homes<br />
            <em>what's on your mind?</em>
          </h1>

          <div
            className="input-zone"
            onClick={() => textareaRef.current?.focus()}
          >
            <div className={`input-line-wrapper${isFocused ? " focused" : ""}`}>
              {/* Blinking cursor placeholder — hides once user types */}
              <div className={`placeholder-ghost${input.length > 0 ? " hidden" : ""}`}>
                <span className="cursor-line" />
              </div>

              <textarea
                ref={textareaRef}
                className="input-textarea"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                spellCheck={false}
                aria-label="Ask Release anything about home buying"
              />
            </div>

          </div>
        </main>
      </div>
    </>
  );
}

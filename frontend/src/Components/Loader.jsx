import { useEffect } from 'react'

export default function Loader() {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  return (
    <>
      <style>{`
        .loader-container {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(to bottom, #000000, #1a1a1a, #000000);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 9999;
        }

        .projector-beam {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(24rem, 80vw);
          height: 100%;
          opacity: 0.1;
          animation: beamPulse 2s ease-in-out infinite;
        }

        .projector-beam-inner {
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, #fef08a, transparent, transparent);
          filter: blur(80px);
        }

        .spotlight {
          position: absolute;
          top: 0;
          width: min(16rem, 40vw);
          height: min(16rem, 40vw);
          border-radius: 50%;
          filter: blur(150px);
          animation: spotlightPulse 3s ease-in-out infinite;
        }

        .spotlight-left {
          left: 10%;
          background: #dc2626;
        }

        .spotlight-right {
          right: 10%;
          background: #b91c1c;
          animation-delay: 1s;
        }

        .curtain {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .curtain-left {
          left: 0;
          background: linear-gradient(to right, #7f1d1d, #991b1b, #b91c1c);
          animation: curtainSway 4s ease-in-out infinite;
        }

        .curtain-right {
          right: 0;
          background: linear-gradient(to left, #7f1d1d, #991b1b, #b91c1c);
          animation: curtainSway 4s ease-in-out infinite;
        }

        .curtain-texture {
          position: absolute;
          inset: 0;
          opacity: 0.2;
          background-image: repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px);
        }

        .film-strip-border {
          position: absolute;
          left: 0;
          width: 100%;
          height: clamp(1.5rem, 5vw, 2rem);
          background: #1f2937;
          border-top: clamp(2px, 0.5vw, 4px) solid #ca8a04;
          border-bottom: clamp(2px, 0.5vw, 4px) solid #ca8a04;
          overflow: hidden;
        }

        .film-strip-top {
          top: 0;
        }

        .film-strip-bottom {
          bottom: 0;
        }

        .film-strip-content {
          display: flex;
          height: 100%;
          animation: filmScroll 2s linear infinite;
        }

        .film-strip-pattern {
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          background-image: repeating-linear-gradient(90deg, transparent, transparent 15px, #eab308 15px, #eab308 18px);
        }

        .cinema-seats {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: clamp(4rem, 15vw, 8rem);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .seats-row {
          display: flex;
          justify-content: center;
          gap: clamp(0.25rem, 1vw, 0.5rem);
          padding: 0 1rem;
          flex-wrap: nowrap;
        }

        .seat {
          width: clamp(1rem, 3vw, 1.5rem);
          height: clamp(3rem, 10vw, 5rem);
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .seat-red {
          background: linear-gradient(to bottom, #991b1b, #450a0a);
        }

        .seat-dark {
          background: linear-gradient(to bottom, #7f1d1d, #000000);
        }

        .main-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 1rem;
          width: 100%;
          max-width: 90%;
        }

        .screen-frame {
          position: relative;
          background: linear-gradient(to bottom, #1f2937, #111827);
          padding: clamp(1rem, 4vw, 2rem);
          border-radius: 0.5rem;
          box-shadow: 0 0 50px rgba(229, 9, 20, 0.3);
          border: clamp(2px, 0.5vw, 4px) solid #374151;
          max-width: 600px;
          margin: 0 auto;
        }

        .screen-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(127, 29, 29, 0.2), transparent);
          border-radius: 0.5rem;
        }

        .screen-inner {
          position: relative;
          background: #000000;
          padding: clamp(1.5rem, 5vw, 3rem);
          border-radius: 0.25rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
        }

        .logo {
          margin-bottom: clamp(1rem, 3vw, 2rem);
          animation: logoSlideDown 1s ease-out;
        }

        .logo-text {
          font-size: clamp(2rem, 8vw, 4.5rem);
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1.2;
        }

        .logo-qfx {
          color: #dc2626;
          filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.8));
          animation: flicker 0.15s ease-in-out infinite;
        }

        .logo-cinemas {
          color: #ffffff;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        }

        .film-reel-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: clamp(1rem, 3vw, 1.5rem);
        }

        .film-reel {
          position: relative;
          width: clamp(4rem, 12vw, 6rem);
          height: clamp(4rem, 12vw, 6rem);
        }

        .reel-outer {
          position: absolute;
          inset: 0;
          border: clamp(4px, 1.5vw, 8px) solid #374151;
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }

        .reel-hole {
          position: absolute;
          width: clamp(0.5rem, 1.5vw, 0.75rem);
          height: clamp(0.5rem, 1.5vw, 0.75rem);
          background: #dc2626;
          border-radius: 50%;
        }

        .reel-center-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(0.375rem, 1vw, 0.5rem);
          height: clamp(0.375rem, 1vw, 0.5rem);
          background: #dc2626;
          border-radius: 50%;
        }

        .reel-hole-top {
          top: clamp(0.375rem, 1vw, 0.5rem);
          left: 50%;
          transform: translateX(-50%);
        }

        .reel-hole-bottom {
          bottom: clamp(0.375rem, 1vw, 0.5rem);
          left: 50%;
          transform: translateX(-50%);
        }

        .reel-hole-left {
          left: clamp(0.375rem, 1vw, 0.5rem);
          top: 50%;
          transform: translateY(-50%);
        }

        .reel-hole-right {
          right: clamp(0.375rem, 1vw, 0.5rem);
          top: 50%;
          transform: translateY(-50%);
        }

        .reel-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(1.25rem, 4vw, 2rem);
          height: clamp(1.25rem, 4vw, 2rem);
          background: #dc2626;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
          animation: pulse 2s ease-in-out infinite;
        }

        .loading-text {
          color: #9ca3af;
          font-size: clamp(0.875rem, 2.5vw, 1.125rem);
          letter-spacing: 0.3em;
          font-weight: 700;
        }

        .loading-dots {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .progress-bar {
          margin-top: clamp(1rem, 3vw, 1.5rem);
          width: min(16rem, 80%);
          height: 0.25rem;
          background: #1f2937;
          border-radius: 9999px;
          margin-left: auto;
          margin-right: auto;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          width: 60%;
          background: linear-gradient(to right, #dc2626, #ef4444);
          border-radius: 9999px;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
          animation: progressPulse 1.5s ease-in-out infinite;
        }

        .exit-sign {
          position: absolute;
          top: clamp(-2.5rem, -8vw, -3rem);
          right: 0;
          background: #16a34a;
          padding: clamp(0.25rem, 1vw, 0.5rem) clamp(0.5rem, 2vw, 0.75rem);
          color: white;
          font-size: clamp(0.625rem, 1.5vw, 0.75rem);
          font-weight: 700;
          border-radius: 0.25rem;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
        }

        .stage-light {
          position: absolute;
          bottom: clamp(5rem, 20vw, 10rem);
          width: clamp(0.5rem, 2vw, 1rem);
          height: clamp(2rem, 8vw, 4rem);
          background: linear-gradient(to bottom, #facc15, transparent);
          filter: blur(4px);
          opacity: 0.4;
        }

        .stage-light-left {
          left: clamp(1rem, 5vw, 2.5rem);
        }

        .stage-light-right {
          right: clamp(1rem, 5vw, 2.5rem);
        }

        /* Mobile Specific Adjustments */
        @media (max-width: 640px) {
          .spotlight {
            filter: blur(100px);
          }

          .curtain {
            width: 40%;
          }

          .seats-row {
            gap: 0.25rem;
          }

          .seat {
            min-width: 0.75rem;
          }

          .exit-sign {
            font-size: 0.625rem;
            padding: 0.25rem 0.5rem;
          }
        }

        /* Tablet Adjustments */
        @media (min-width: 641px) and (max-width: 1024px) {
          .spotlight-left {
            left: 15%;
          }

          .spotlight-right {
            right: 15%;
          }
        }

        /* Landscape Mobile */
        @media (max-height: 500px) {
          .cinema-seats {
            height: 3rem;
          }

          .seat {
            height: 2.5rem;
          }

          .logo-text {
            font-size: clamp(1.5rem, 6vw, 3rem);
          }

          .film-reel {
            width: clamp(3rem, 10vw, 4.5rem);
            height: clamp(3rem, 10vw, 4.5rem);
          }

          .screen-inner {
            padding: 1.5rem;
          }

          .exit-sign {
            top: -2rem;
          }
        }

        @keyframes beamPulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }

        @keyframes spotlightPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes curtainSway {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.98); }
        }

        @keyframes filmScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-100px); }
        }

        @keyframes logoSlideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div className="loader-container">
        
        {/* Projector Beam Effect */}
        <div className="projector-beam">
          <div className="projector-beam-inner"></div>
        </div>
        
        {/* Spotlights */}
        <div className="spotlight spotlight-left"></div>
        <div className="spotlight spotlight-right"></div>
        
        {/* Red Curtains */}
        <div className="curtain curtain-left">
          <div className="curtain-texture"></div>
        </div>
        <div className="curtain curtain-right">
          <div className="curtain-texture"></div>
        </div>
        
        {/* Film Strip Border Top */}
        <div className="film-strip-border film-strip-top">
          <div className="film-strip-content">
            <div className="film-strip-pattern"></div>
            <div className="film-strip-pattern"></div>
          </div>
        </div>
        
        {/* Film Strip Border Bottom */}
        <div className="film-strip-border film-strip-bottom">
          <div className="film-strip-content">
            <div className="film-strip-pattern"></div>
            <div className="film-strip-pattern"></div>
          </div>
        </div>
        
        {/* Cinema Seats at Bottom */}
        <div className="cinema-seats">
          <div className="seats-row">
            <div className="seat seat-red"></div>
            <div className="seat seat-red"></div>
            <div className="seat seat-red"></div>
            <div className="seat seat-dark"></div>
            <div className="seat seat-dark"></div>
            <div className="seat seat-dark"></div>
            <div className="seat seat-red"></div>
            <div className="seat seat-red"></div>
            <div className="seat seat-red"></div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="main-content">
          {/* Screen Frame */}
          <div className="screen-frame">
            {/* Inner Screen Glow */}
            <div className="screen-glow"></div>
            
            <div className="screen-inner">
              {/* Logo */}
              <div className="logo">
                <h1 className="logo-text">
                  <span className="logo-qfx">QFX</span>
                  <span className="logo-cinemas">Cinemas</span>
                </h1>
              </div>
              
              {/* Film Reel Loader */}
              <div className="film-reel-container">
                <div className="film-reel">
                  {/* Outer Reel */}
                  <div className="reel-outer">
                    <div className="reel-center-dot"></div>
                    <div className="reel-hole reel-hole-top"></div>
                    <div className="reel-hole reel-hole-bottom"></div>
                    <div className="reel-hole reel-hole-left"></div>
                    <div className="reel-hole reel-hole-right"></div>
                  </div>
                  {/* Center */}
                  <div className="reel-center"></div>
                </div>
              </div>
              
              {/* Loading Text */}
              <p className="loading-text">
                LOADING<span className="loading-dots">...</span>
              </p>
              
              {/* Progress Bar */}
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
          
          {/* Exit Sign */}
          <div className="exit-sign">EXIT</div>
        </div>
        
        {/* Stage Lights */}
        <div className="stage-light stage-light-left"></div>
        <div className="stage-light stage-light-right"></div>
      </div>
    </>
  );
}

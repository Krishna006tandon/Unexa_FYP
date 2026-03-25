import React, { useEffect, useRef, useState } from 'react';
import { generateRoomId } from '../utils/callUtils'; // Optional

const THEME = {
  colors: {
    background: '#0F0F1A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    danger: '#FF4B4B',
    success: '#00C853',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
  }
};

const VideoCall = ({ roomId, isVideo = true, myName = "User", onHangup }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // 1. Load Jitsi script dynamically
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initializeJitsi;
      document.head.appendChild(script);
    } else {
      initializeJitsi();
    }

    // 2. Timer for duration
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeJitsi = () => {
    if (!window.JitsiMeetExternalAPI) return;

    const domain = 'meet.jit.si';
    
    // Hide standard UI elements, keep it clean for our custom controls
    const options = {
      roomName: roomId,
      width: '100%',
      height: '100%',
      parentNode: containerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: !isVideo,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        toolbarButtons: [], // Hide default Jitsi toolbar
        disableRemoteMute: true,
        // Optional: force custom layout strategies
        // disableTileView: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [], // Backup for older jitsi clients
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        DEFAULT_BACKGROUND: THEME.colors.background,
        DEFAULT_LOCAL_DISPLAY_NAME: myName,
        VIDEO_LAYOUT_FIT: 'both',
      },
      userInfo: {
        displayName: myName
      }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    apiRef.current = api;

    // Listeners for UI sync
    api.addEventListener('videoConferenceJoined', () => {
      setCallStatus('Ongoing');
    });

    api.addEventListener('videoConferenceLeft', () => {
      setCallStatus('Ended');
      if (onHangup) onHangup();
    });

    api.addEventListener('audioMuteStatusChanged', (payload) => {
      setIsMuted(payload.muted);
    });

    api.addEventListener('videoMuteStatusChanged', (payload) => {
      setIsVideoOff(payload.muted);
    });
  };

  // Commands
  const handleToggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const handleToggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  const handleToggleScreenShare = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleShareScreen');
    }
  };

  const handleHangup = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    if (onHangup) onHangup();
  };

  // Icons Helper
  const MicIcon = ({ muted }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={muted ? "#000" : "#FFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {muted ? (
        <><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>
      ) : (
        <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>
      )}
    </svg>
  );

  const VideoIcon = ({ videoOff }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={videoOff ? "#000" : "#FFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {videoOff ? (
        <><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" /></>
      ) : (
        <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>
      )}
    </svg>
  );

  const PhoneOffIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );

  const MonitorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={styles.container}>
      {/* 
        Jitsi Meet mounts the iframe here. 
        Because we disable their toolbar, it is purely a video canvas. 
      */}
      <div 
        ref={containerRef} 
        style={styles.jitsiContainer} 
      />

      {/* Glassmorphism Custom UI Overlay */}
      <div style={styles.overlay}>
        
        {/* Top Info Bar */}
        <div style={styles.topBar}>
          <div style={styles.infoBadge}>
            <span style={styles.statusDot(callStatus === 'Ongoing')}></span>
            <span style={styles.callStatusText}>{callStatus}</span>
            {callStatus === 'Ongoing' && (
              <span style={styles.timerText}>&bull; {formatTime(callDuration)}</span>
            )}
          </div>
        </div>

        {/* Bottom Custom Controls Bar */}
        <div style={styles.controlsContainer}>
          <button 
            style={isMuted ? { ...styles.controlBtn, ...styles.controlBtnActive } : styles.controlBtn}
            onClick={handleToggleAudio}
          >
            <MicIcon muted={isMuted} />
          </button>

          <button 
            style={isVideoOff ? { ...styles.controlBtn, ...styles.controlBtnActive } : styles.controlBtn}
            onClick={handleToggleVideo}
          >
            <VideoIcon videoOff={isVideoOff} />
          </button>

          <button 
            style={styles.controlBtn}
            onClick={handleToggleScreenShare}
          >
            <MonitorIcon />
          </button>

          <button 
            style={styles.endCallBtn}
            onClick={handleHangup}
          >
            <PhoneOffIcon />
          </button>
        </div>

      </div>
    </div>
  );
};

// Layout: Fullscreen remote video, Small floating self-video handled via Jitsi API options natively,
// We overlay these elements on top.
const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh', 
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Inter", "system-ui", sans-serif'
  },
  jitsiContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    border: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Critical: Let clicks reach Jitsi iframe for double-click full screen, etc.
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  topBar: {
    padding: '30px 24px',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  infoBadge: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '24px',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  statusDot: (isActive) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isActive ? THEME.colors.success : THEME.colors.secondary,
    boxShadow: `0 0 10px ${isActive ? THEME.colors.success : THEME.colors.secondary}`,
  }),
  callStatusText: {
    color: '#FFF',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.3px',
  },
  timerText: {
    color: THEME.colors.textDim,
    fontSize: '15px',
    fontWeight: '500',
  },
  controlsContainer: {
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    background: 'linear-gradient(to top, rgba(15, 15, 26, 0.95) 0%, rgba(15, 15, 26, 0) 100%)',
    pointerEvents: 'auto',
  },
  controlBtn: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  controlBtnActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  endCallBtn: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: THEME.colors.danger,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 6px 20px rgba(255, 75, 75, 0.35)',
    transition: 'transform 0.2s ease',
  }
};

export default VideoCall;

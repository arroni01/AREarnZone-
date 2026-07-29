import React, { useState, useEffect, useRef } from 'react';
import { User, GlobalConfig, AdViewLog, Ad } from '../types';
import { 
  ShieldAlert, 
  Clock, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Play, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  RefreshCw, 
  Globe, 
  Image as ImageIcon,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
  RotateCcw
} from 'lucide-react';

interface AdManagerOverlayProps {
  currentUser: User | null;
  globalConfig: GlobalConfig;
  adViewLogs?: AdViewLog[];
  setAdViewLogs?: React.Dispatch<React.SetStateAction<AdViewLog[]>>;
  isSocialPopupActive?: boolean;
}

const AdManagerOverlay: React.FC<AdManagerOverlayProps> = ({ 
  currentUser, 
  globalConfig, 
  adViewLogs = [],
  setAdViewLogs, 
  isSocialPopupActive 
}) => {
  const isEnabled = !!globalConfig.enableAdManager;
  const adSkipTimeConfig = globalConfig.adSkipSeconds !== undefined ? globalConfig.adSkipSeconds : 15;
  const adIntervalMinutesConfig = globalConfig.adIntervalMinutes || 5;
  const loginDelaySecondsConfig = globalConfig.adLoginDelaySeconds !== undefined ? globalConfig.adLoginDelaySeconds : 30;

  const [showAd, setShowAd] = useState(false);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(adSkipTimeConfig);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(true);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [linkOpened, setLinkOpened] = useState(false);
  const [tiktokVideoId, setTiktokVideoId] = useState<string | null>(null);
  
  // Ref tracking to avoid stale state in timers
  const showAdRef = useRef(showAd);
  const isSocialPopupActiveRef = useRef(isSocialPopupActive);
  const currentUserRef = useRef(currentUser);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasTriggeredFirstAdAfterLogin = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const hasOpenedLink = useRef(false);

  const hasCountdownStartedRef = useRef(false);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdownWithDelay = () => {
    if (hasCountdownStartedRef.current) return;
    hasCountdownStartedRef.current = true;
    console.log("[Ad Countdown] Ad content playing/loaded. Scheduling skip countdown start in 1 second...");
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
    }
    countdownTimeoutRef.current = setTimeout(() => {
      console.log("[Ad Countdown] 1 second elapsed! Starting countdown timer.");
      setCountdownStarted(true);
    }, 1000);
  };

  useEffect(() => { showAdRef.current = showAd; }, [showAd]);
  useEffect(() => { isSocialPopupActiveRef.current = isSocialPopupActive; }, [isSocialPopupActive]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // URL Validator helper
  const isValidUrl = (urlStr: string): boolean => {
    if (!urlStr) return false;
    const cleanUrl = urlStr.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) return false;
    try {
      new URL(cleanUrl);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Helper to extract YouTube video ID supporting watch, shorts, embeds, youtu.be, etc.
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    
    // 1. Check Shorts format: youtube.com/shorts/VIDEO_ID
    const shortsMatch = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    
    // 2. Check embed format: youtube.com/embed/VIDEO_ID
    const embedMatch = cleanUrl.match(/\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    // 3. Check general watch/v/youtu.be formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }
    
    // 4. Check query param v=
    try {
      const urlObj = new URL(cleanUrl);
      const vParam = urlObj.searchParams.get('v');
      if (vParam && vParam.length === 11) {
        return vParam;
      }
    } catch (e) {
      // ignore
    }
    
    return null;
  };

  // Helper to extract Vimeo video ID
  const getVimeoId = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
    return match ? match[1] : null;
  };

  // Helper to extract Google Drive Video ID
  const getGoogleDriveId = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
    
    const idParamMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
    
    return null;
  };

  // Helper to detect direct video file URLs
  const isDirectVideo = (url: string) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(url.trim());
  };

  const isTikTokUrl = (url: string): boolean => {
    if (!url) return false;
    return /tiktok\.com/i.test(url);
  };

  const getTikTokIdClient = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    const match = trimmed.match(/\/video\/(\d+)/) || trimmed.match(/\/v\/(\d+)/) || trimmed.match(/\/embed\/(\d+)/);
    return match ? match[1] : null;
  };

  // Helper to check if a site forces X-Frame-Options / blocks iframes
  const forcesXFrameOptions = (url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    
    // List of domains known to reject embedding in general iframes
    const blacklistedHosts = [
      'google.com',
      'facebook.com',
      'instagram.com',
      'x.com',
      'twitter.com',
      'linkedin.com',
      'github.com',
      'wikipedia.org',
      'amazon.com',
      'blogger.com',
      't.me',
      'telegram.org',
      'bka.sh',
      'bkash.com',
      'shurjopay.com.bd',
      'gpay.com',
      'pay.google.com',
      'apple.com'
    ];

    return blacklistedHosts.some(host => lower.includes(host));
  };

  // Safe launcher to open external pages (simulating WebView Sandbox tab)
  const openExternalSponsorPage = (adUrl: string) => {
    if (!adUrl || !isValidUrl(adUrl)) return;
    const targetUrl = adUrl.trim();
    console.log("Opening Secure WebView Target:", targetUrl);

    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setLinkOpened(true);
      setCountdownStarted(true);
      if (win) {
        win.focus();
      } else {
        // Fallback if browser blocked immediate opening
        console.warn("Popup blocked. Manual trigger available.");
      }
    } catch (e) {
      console.error("Failed to open sponsor URL:", e);
    }
  };

  // Retrieve list of active ads (with fallback to legacy adLinks if empty)
  const getActiveAds = (): Ad[] => {
    const list = (globalConfig.adsList || []).filter(ad => {
      if (!ad.isActive) return false;
      if (typeof ad.viewLimit === 'number' && ad.viewLimit > 0) {
        const viewsCount = adViewLogs.filter(log => log.adLink === ad.url).length;
        if (viewsCount >= ad.viewLimit) {
          return false; // Skip ad because limit was reached
        }
      }
      return true;
    });
    if (list.length > 0) {
      return list.sort((a, b) => a.orderNumber - b.orderNumber);
    }

    // Fallback if structured adsList is empty
    const legacyLinks = globalConfig.adLinks || [];
    return legacyLinks.map((link, idx) => {
      const type = (link.includes('youtube.com') || link.includes('youtu.be') || isDirectVideo(link)) ? 'Video' : 'Web Link';
      return {
        id: `legacy-${idx}`,
        name: `Sponsor Ad ${idx + 1}`,
        type: type,
        url: link,
        isActive: true,
        orderNumber: idx + 1
      };
    });
  };

  // Trigger next ad in sequential sequence rotation
  const triggerAd = () => {
    if (!currentUser || currentUser.role === 'admin') return;
    const activeAds = getActiveAds();
    if (activeAds.length === 0) return;

    // Sequential index retrieval using last_ad_seen inside localStorage per user
    const lastAdKey = `arez_last_ad_seen_${currentUser.id}`;
    const lastAdId = localStorage.getItem(lastAdKey) || '';
    
    let targetIndex = 0;
    if (lastAdId) {
      const indexInList = activeAds.findIndex(ad => ad.id === lastAdId);
      if (indexInList !== -1) {
        // Sequentially rotate through ads list: Ad1 → Ad2 → Ad3 → ... → Last Ad → again Ad1
        targetIndex = (indexInList + 1) % activeAds.length;
      }
    }

    const nextAd = activeAds[targetIndex];
    if (!nextAd) return;

    // Store rotation tracking markers instantly
    localStorage.setItem(lastAdKey, nextAd.id);
    localStorage.setItem(`arez_last_ad_time_${currentUser.id}`, Date.now().toString());

    // Reset playback states
    setIsMuted(true);
    setAutoplayFailed(false);
    setVideoPlaying(false);
    setIframeLoaded(false);
    setIsAdLoading(true);
    hasOpenedLink.current = false;
    setCountdownStarted(false);
    setLinkOpened(false);
    setTiktokVideoId(null);
    hasCountdownStartedRef.current = false;
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }

    setCurrentAd(nextAd);
    setSecondsLeft(adSkipTimeConfig);
    setCanSkip(false);
    setShowAd(true);

    // Register log view
    if (setAdViewLogs) {
      const newLog: AdViewLog = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11),
        userId: currentUser.id,
        userName: currentUser.name || 'User',
        userEmail: currentUser.email || 'user@arez.com',
        adLink: nextAd.url,
        viewedAt: new Date().toISOString()
      };
      setAdViewLogs(prev => [...prev, newLog]);
    }
  };

  // Rotate to next active ad in sequence if a specific ad fails to load
  const triggerNextAdFallback = () => {
    console.warn("Ad content blocked or failed to load. Initiating next active rotation fallback...");
    if (!currentUser || currentUser.role === 'admin') return;
    
    const activeAds = getActiveAds();
    if (activeAds.length <= 1) {
      // No alternate ads to fallback to, just dismiss loading
      setIsAdLoading(false);
      setIframeLoaded(true);
      return;
    }

    const lastAdKey = `arez_last_ad_seen_${currentUser.id}`;
    const lastAdId = localStorage.getItem(lastAdKey) || '';
    const indexInList = activeAds.findIndex(ad => ad.id === lastAdId);
    const nextIndex = (indexInList !== -1) ? (indexInList + 1) % activeAds.length : 0;
    
    const nextAd = activeAds[nextIndex];
    if (nextAd) {
      localStorage.setItem(lastAdKey, nextAd.id);
      localStorage.setItem(`arez_last_ad_time_${currentUser.id}`, Date.now().toString());
      
      setCurrentAd(nextAd);
      setSecondsLeft(adSkipTimeConfig);
      setCanSkip(false);
      setIsAdLoading(true);
      setIsMuted(true);
      setAutoplayFailed(false);
      setVideoPlaying(false);
      setIframeLoaded(false);
      hasOpenedLink.current = false;
      setCountdownStarted(false);
      setLinkOpened(false);
      setTiktokVideoId(null);
      hasCountdownStartedRef.current = false;
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }

      if (setAdViewLogs) {
        const newLog: AdViewLog = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11),
          userId: currentUser.id,
          userName: currentUser.name || 'User',
          userEmail: currentUser.email || 'user@arez.com',
          adLink: nextAd.url,
          viewedAt: new Date().toISOString()
        };
        setAdViewLogs(prev => [...prev, newLog]);
      }
    }
  };



  // Automatically turn off loader for static/link portals, and force YouTube loader to stop after 1.2s
  useEffect(() => {
    let ytTimer: NodeJS.Timeout;
    if (showAd && currentAd) {
      const url = currentAd.url || '';
      const isYt = !!getYouTubeId(url);
      const isVid = isDirectVideo(url);
      const isImg = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(url.trim());

      // If it is a web link, do not let our spinner stay active for more than 1.0 second to allow the proxy iframe to load smoothly
      if (currentAd.type === 'Web Link' && !isYt && !isVid && !isImg) {
        ytTimer = setTimeout(() => {
          setIsAdLoading(false);
          setIframeLoaded(true);
        }, 1000);
      }
      
      // If it is YouTube, do not let our spinner stay active for more than 1.2 seconds to allow native YT loading to show smoothly
      if (isYt) {
        ytTimer = setTimeout(() => {
          setIsAdLoading(false);
          setIframeLoaded(true);
        }, 1200);
      }
    }
    return () => {
      if (ytTimer) clearTimeout(ytTimer);
    };
  }, [showAd, currentAd?.id]);

  // Loading safety latch - prevent infinite loader spinner (max 2.5 seconds threshold)
  useEffect(() => {
    if (showAd && isAdLoading) {
      const loadingLatch = setTimeout(() => {
        if (isAdLoading) {
          console.log("Unified ad loading safety threshold reached. Unlocking view.");
          setIsAdLoading(false);
          setIframeLoaded(true); // Treat as loaded to prevent fallback loops
        }
      }, 2500); // 2.5 seconds maximum grace period for everything
      return () => clearTimeout(loadingLatch);
    }
  }, [showAd, currentAd?.id, isAdLoading]);

  // Resolves TikTok redirects and extracts numeric video ID
  useEffect(() => {
    if (showAd && currentAd && isTikTokUrl(currentAd.url)) {
      setIsAdLoading(true);
      setTiktokVideoId(null);
      
      const targetUrl = currentAd.url;
      console.log("[Client TikTok] Fetching ID from API for:", targetUrl);
      
      fetch(`/api/tiktok-id?url=${encodeURIComponent(targetUrl)}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to resolve TikTok on server");
          return res.json();
        })
        .then(data => {
          if (data.videoId) {
            console.log("[Client TikTok] Successfully resolved ID:", data.videoId);
            setTiktokVideoId(data.videoId);
            setIsAdLoading(false);
            setIframeLoaded(true);
          } else {
            console.warn("[Client TikTok] Resolved empty ID. Falling back.");
            triggerNextAdFallback();
          }
        })
        .catch(err => {
          console.error("[Client TikTok] Error resolving:", err);
          const localId = getTikTokIdClient(targetUrl);
          if (localId) {
            console.log("[Client TikTok] Client-side extraction fallback success:", localId);
            setTiktokVideoId(localId);
            setIsAdLoading(false);
            setIframeLoaded(true);
          } else {
            setIsAdLoading(false);
            setIframeLoaded(true);
          }
        });
    } else {
      setTiktokVideoId(null);
    }
  }, [showAd, currentAd?.id]);

  // 1. App Startup Delay, Return Detection, and Interval Checks
  useEffect(() => {
    if (!currentUser || !isEnabled || currentUser.role === 'admin') {
      setShowAd(false);
      return;
    }

    // If logged-in user changed, reset the login-delay ad trigger state
    if (prevUserIdRef.current !== currentUser.id) {
      prevUserIdRef.current = currentUser.id;
      hasTriggeredFirstAdAfterLogin.current = false;
    }

    const lastAdTimeKey = `arez_last_ad_time_${currentUser.id}`;
    const lastTimeStr = localStorage.getItem(lastAdTimeKey);
    const lastTime = lastTimeStr ? parseInt(lastTimeStr, 10) : 0;
    
    const intervalMs = adIntervalMinutesConfig * 60 * 1000;
    const loginDelayMs = loginDelaySecondsConfig * 1000;

    let loginTimeoutId: NodeJS.Timeout;

    if (!hasTriggeredFirstAdAfterLogin.current) {
      // Every single session or reload, start 30-seconds delay timer immediately
      console.log(`Setting first-login delayed ad viewer trigger for ${loginDelaySecondsConfig} seconds.`);
      loginTimeoutId = setTimeout(() => {
        if (!showAdRef.current && !isSocialPopupActiveRef.current) {
          triggerAd();
          hasTriggeredFirstAdAfterLogin.current = true;
        }
      }, loginDelayMs);
    } else {
      // Session Continuation (App Reload/Navigation): Check if previous delay expired while away
      const elapsed = Date.now() - lastTime;
      if (elapsed >= intervalMs) {
        triggerAd();
      }
    }

    // Interval Loop checking every 2 seconds to launch screen overlay on time
    const cronId = setInterval(() => {
      if (showAdRef.current) return;
      if (isSocialPopupActiveRef.current) return;

      const dynamicLastTimeStr = localStorage.getItem(`arez_last_ad_time_${currentUser.id}`);
      const dynamicLastTime = dynamicLastTimeStr ? parseInt(dynamicLastTimeStr, 10) : 0;

      if (dynamicLastTime) {
        const dynamicElapsed = Date.now() - dynamicLastTime;
        if (dynamicElapsed >= intervalMs) {
          console.log(`Ad display interval timer (${adIntervalMinutesConfig} minutes) expired! Presenting next sequential ad.`);
          triggerAd();
        }
      } else {
        localStorage.setItem(`arez_last_ad_time_${currentUser.id}`, Date.now().toString());
      }
    }, 2000);

    return () => {
      clearTimeout(loginTimeoutId);
      clearInterval(cronId);
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
    };
  }, [currentUser?.id, isEnabled, adIntervalMinutesConfig, loginDelaySecondsConfig]);

  // 2. Countdown Lock manager
  useEffect(() => {
    if (!showAd || !countdownStarted) return;

    if (secondsLeft <= 0) {
      setCanSkip(true);
      return;
    }

    const counterId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(counterId);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(counterId);
  }, [showAd, countdownStarted, secondsLeft]);

  // 1. Automatic Link Opener for Web Link ads
  useEffect(() => {
    if (showAd && currentAd && currentAd.type === 'Web Link') {
      openExternalSponsorPage(currentAd.url);
    }
  }, [showAd, currentAd?.id]);

  // 1.1 Automatic HTML5 Video Autoplay Force Trigger
  useEffect(() => {
    let playTimer: NodeJS.Timeout;
    if (showAd && currentAd && videoRef.current) {
      const isVid = isDirectVideo(currentAd.url) || currentAd.type === 'Video';
      const isYt = !!getYouTubeId(currentAd.url);
      const isVim = !!getVimeoId(currentAd.url);
      const isGd = !!getGoogleDriveId(currentAd.url);
      const isTk = isTikTokUrl(currentAd.url);

      if (isVid && !isYt && !isVim && !isGd && !isTk) {
        console.log("[Video Autoplay] Forcing muted autoplay via ref...");
        const videoElement = videoRef.current;
        videoElement.muted = true;
        setIsMuted(true);
        
        playTimer = setTimeout(() => {
          videoElement.play()
            .then(() => {
              console.log("[Video Autoplay] Autoplay started successfully!");
              setVideoPlaying(true);
              setAutoplayFailed(false);
              setIsAdLoading(false);
              startCountdownWithDelay();
            })
            .catch((err) => {
              console.warn("[Video Autoplay] Autoplay blocked, trying again...", err);
              videoElement.muted = true;
              videoElement.play()
                .then(() => {
                  setVideoPlaying(true);
                  setAutoplayFailed(false);
                  setIsAdLoading(false);
                  startCountdownWithDelay();
                })
                .catch((mutedErr) => {
                  console.error("[Video Autoplay] All autoplay blocked. Setting manual fallback.", mutedErr);
                  setAutoplayFailed(true);
                  setIsAdLoading(false);
                });
            });
        }, 150);
      }
    }
    return () => {
      if (playTimer) clearTimeout(playTimer);
    };
  }, [showAd, currentAd?.id]);

  // 2. Synchronize isMuted state with video element property to bypass React's muted rendering bug
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 3. Autoplay safety timer: If HTML5 direct video doesn't start playing within 3 seconds, show manual play fallback button
  useEffect(() => {
    let safetyTimer: NodeJS.Timeout;
    if (showAd && currentAd) {
      const isVid = isDirectVideo(currentAd.url) || currentAd.type === 'Video';
      const isYt = !!getYouTubeId(currentAd.url);
      const isVim = !!getVimeoId(currentAd.url);
      const isGd = !!getGoogleDriveId(currentAd.url);
      const isTk = isTikTokUrl(currentAd.url);
      
      if (isVid && !isYt && !isVim && !isGd && !isTk) {
        setAutoplayFailed(false); // Reset failure state on load
        safetyTimer = setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            console.log("[Video Autoplay] Safety timeout reached (3s) and video is still paused. Displaying manual play button.");
            setAutoplayFailed(true);
          }
        }, 3000);
      }
    }
    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [showAd, currentAd?.id]);

  // 3. Keep user focused, block back button reload
  useEffect(() => {
    if (showAd) {
      window.history.pushState(null, '', window.location.href);
      const handleBackButtonLock = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handleBackButtonLock);

      const handleEscapeLock = (e: KeyboardEvent) => {
        if (e.key === 'Escape') e.preventDefault();
      };
      window.addEventListener('keydown', handleEscapeLock);

      return () => {
        window.removeEventListener('popstate', handleBackButtonLock);
        window.removeEventListener('keydown', handleEscapeLock);
      };
    }
  }, [showAd]);

  // 4. Return user back to their original page state on close/skip
  const handleAdClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Close the ad screen. The user stays exactly on their previous sub-tab, state, or scroll position!
    setShowAd(false);

    // Save updated timestamp immediately
    if (currentUser) {
      localStorage.setItem(`arez_last_ad_time_${currentUser.id}`, Date.now().toString());
    }
  };

  // Safe manual audio activator
  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetMuted = !isMuted;
    setIsMuted(targetMuted);
    
    if (videoRef.current) {
      videoRef.current.muted = targetMuted;
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      // 1. YouTube postMessage controls
      const ytCmd = targetMuted ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(`{"event":"command","func":"${ytCmd}","args":""}`, '*');
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');

      // 2. Vimeo postMessage controls
      const vVolume = targetMuted ? 0 : 1;
      iframeRef.current.contentWindow.postMessage(`{"method":"setVolume","value":${vVolume}}`, '*');
      iframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
    }
  };

  // Force play button trigger if autoplay fails
  const handleManualPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoElementPlay(videoRef.current);
    }
  };

  const videoElementPlay = (videoElement: HTMLVideoElement) => {
    videoElement.play()
      .then(() => {
        setAutoplayFailed(false);
        setVideoPlaying(true);
      })
      .catch(err => console.error("Video play call failed:", err));
  };

  if (!showAd || !currentAd) return null;

  const urlCheck = currentAd.url || '';
  const isUrlValid = isValidUrl(urlCheck);
  const isWebBlockedByXFrame = forcesXFrameOptions(urlCheck);
  const ytVideoId = getYouTubeId(urlCheck);

  // Dynamic Media Viewport Core renderer
  const getUrlBrandingInfo = (url: string) => {
    const lower = url.toLowerCase();
    const isThisUrlValid = isValidUrl(url);
    if (lower.includes('t.me') || lower.includes('telegram.org') || lower.includes('telegram.me')) {
      return {
        provider: 'Telegram Channel / Group',
        banglaTitle: 'টেলিগ্রাম গ্রুপ / চ্যানেল',
        banglaDesc: 'স্পন্সর অফার এবং ফ্রি আপডেট পেতে আমাদের টেলিগ্রাম চ্যানেলে জয়েন করুন।',
        btnText: 'JOIN TELEGRAM CHANNEL ➜',
        gradient: 'from-sky-500/10 via-sky-500/20 to-blue-600/15 border-sky-400/30',
        textColor: 'text-sky-400',
        btnBg: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20 border-sky-700'
      };
    }
    if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('messenger.com')) {
      return {
        provider: 'Facebook Stream & Page',
        banglaTitle: 'ফেসবুক পেজ / ভিডিও অফার',
        banglaDesc: 'স্পন্সরের অফিসিয়াল ফেসবুক পেজ ভিজিট করুন এবং লেটেস্ট কন্টেন্ট দেখুন।',
        btnText: 'VISIT FACEBOOK CAMPAIGN ➜',
        gradient: 'from-blue-600/10 via-blue-500/20 to-indigo-600/15 border-blue-500/30',
        textColor: 'text-blue-400',
        btnBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 border-blue-800'
      };
    }
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return {
        provider: 'YouTube Sponsored Offer',
        banglaTitle: 'ইউটিউব ভিডিও প্রমোশন',
        banglaDesc: 'অফারটির বিস্তারিত ভিডিও দেখতে সরাসরি স্পন্সরের ইউটিউব চ্যানেল ভিজিট করুন।',
        btnText: 'WATCH ON YOUTUBE ➜',
        gradient: 'from-red-500/10 via-red-500/20 to-rose-600/15 border-red-500/30',
        textColor: 'text-rose-400',
        btnBg: 'bg-red-500 hover:bg-red-600 shadow-red-500/20 border-red-700'
      };
    }
    if (lower.includes('tiktok.com')) {
      return {
        provider: 'TikTok Content Portal',
        banglaTitle: 'টিকটক অফার ভিডিও',
        banglaDesc: 'স্পন্সরের চমৎকার টিকটক ভিডিও অফারটি দেখতে নিচের বাটনে ক্লিক করুন।',
        btnText: 'WATCH ON TIKTOK ➜',
        gradient: 'from-neutral-900 via-zinc-800 to-neutral-900 border-cyan-500/30 shadow-cyan-500/10',
        textColor: 'text-cyan-400',
        btnBg: 'bg-slate-950 hover:bg-neutral-900 shadow-cyan-500/20 border-neutral-700'
      };
    }
    if (lower.includes('bka.sh') || lower.includes('bkash.com')) {
      return {
        provider: 'bKash Merchant Portal',
        banglaTitle: 'বিকাশ পেমেন্ট গেটওয়ে',
        banglaDesc: 'রিওয়ার্ড পয়েন্ট ও ক্যাশব্যাক ভেরিফাই করতে বিকাশ গেটওয়ে পেজে যান।',
        btnText: 'OPEN BKASH PORTAL ➜',
        gradient: 'from-pink-500/10 via-pink-500/20 to-rose-600/15 border-pink-500/30',
        textColor: 'text-pink-400',
        btnBg: 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/20 border-pink-800'
      };
    }
    // General
    const hostname = isThisUrlValid ? new URL(url).hostname : 'sponsor-campaign.net';
    return {
      provider: hostname.toUpperCase(),
      banglaTitle: 'সুরক্ষিত স্পন্সর কানেকশন',
      banglaDesc: 'আপনার ব্রাউজিং সেশনটি নিরাপদ রাখতে এবং ফ্রি পয়েন্ট নিশ্চিত করতে সরাসরি অফার পেজে যান।',
      btnText: 'VISIT SPONSOR OFFER ➜',
      gradient: 'from-slate-900 via-emerald-950/25 to-slate-900 border-emerald-500/25',
      textColor: 'text-emerald-400',
      btnBg: 'bg-[#10b981] hover:bg-emerald-600 shadow-emerald-500/25 border-emerald-700'
    };
  };

  const renderViewportContent = () => {
    if (!isUrlValid) {
      return (
        <div className="w-full p-8 flex flex-col items-center justify-center text-center bg-slate-950/60 rounded-2xl border border-rose-500/20 text-rose-400 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 animate-pulse">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-sm uppercase tracking-wider">Invalid Ad URL (ত্রুটিপূর্ণ বিজ্ঞাপন লিঙ্ক)</h4>
            <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed uppercase tracking-wider">
              The target link assigned to this ad campaign has an incorrect address or invalid protocol.
            </p>
          </div>
        </div>
      );
    }

    const vimVideoId = getVimeoId(urlCheck);
    const gdVideoId = getGoogleDriveId(urlCheck);
    const hasDirectVid = isDirectVideo(urlCheck) || (currentAd.type === 'Video' && !ytVideoId && !vimVideoId && !gdVideoId && !tiktokVideoId);
    const hasDirectImg = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(urlCheck.trim());

    // 1. YouTube Player
    if (ytVideoId) {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&rel=0&playsinline=1&enablejsapi=1&version=3`}
            title="YouTube Sponsored Stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              setIsAdLoading(false);
              setIframeLoaded(true);
              startCountdownWithDelay();
            }}
            onError={triggerNextAdFallback}
            className="w-full h-full absolute inset-0"
          />
        </div>
      );
    }

    // 1.5 TikTok Player
    if (tiktokVideoId) {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
          <iframe
            ref={iframeRef}
            src={`https://www.tiktok.com/embed/v2/${tiktokVideoId}`}
            title="TikTok Sponsored Stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              setIsAdLoading(false);
              setIframeLoaded(true);
              startCountdownWithDelay();
            }}
            onError={triggerNextAdFallback}
            className="w-full h-full absolute inset-0"
          />
        </div>
      );
    }

    // 2. Vimeo Player
    if (vimVideoId) {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
          <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${vimVideoId}?autoplay=1&muted=${isMuted ? 1 : 0}&loop=1&transparent=0`}
            title="Vimeo Sponsored Stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              setIsAdLoading(false);
              setIframeLoaded(true);
              startCountdownWithDelay();
            }}
            onError={triggerNextAdFallback}
            className="w-full h-full absolute inset-0"
          />
        </div>
      );
    }

    // 3. Google Drive Video Player
    if (gdVideoId) {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
          <iframe
            ref={iframeRef}
            src={`https://drive.google.com/file/d/${gdVideoId}/preview`}
            title="Google Drive Video Offer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              setIsAdLoading(false);
              setIframeLoaded(true);
              startCountdownWithDelay();
            }}
            onError={triggerNextAdFallback}
            className="w-full h-full absolute inset-0"
          />
        </div>
      );
    }

    // 4. Direct MP4/WebM Video Player
    if (hasDirectVid) {
      return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            src={urlCheck}
            autoPlay
            preload="auto"
            muted={isMuted}
            playsInline
            controls
            loop
            onCanPlay={(e) => {
              setIsAdLoading(false);
              const videoElement = e.currentTarget;
              videoElement.muted = true;
              videoElement.play()
                .then(() => {
                  setVideoPlaying(true);
                  setAutoplayFailed(false);
                })
                .catch((err) => {
                  console.log("Autoplay fallback play check:", err);
                });
            }}
            onPlay={() => {
              setAutoplayFailed(false);
              setVideoPlaying(true);
              setIsAdLoading(false);
              startCountdownWithDelay();
            }}
            onError={triggerNextAdFallback}
            className="w-full h-full absolute inset-0 object-contain"
          />
          {autoplayFailed && (
            <div className="absolute inset-0 z-30 bg-black/70 flex flex-col items-center justify-center p-4">
              <button
                onClick={handleManualPlay}
                className="w-14 h-14 rounded-full bg-[#10b981] hover:bg-emerald-600 text-slate-950 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-115 active:scale-90"
                title="Play Video"
              >
                <Play size={24} className="ml-1 fill-current" />
              </button>
              <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-3">Click to start streaming</span>
            </div>
          )}
        </div>
      );
    }

    // 5. Direct Image ad
    if (hasDirectImg || currentAd.type === 'Image') {
      return (
        <a 
          href={urlCheck}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setIsAdLoading(false);
            startCountdownWithDelay();
          }}
          className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl flex items-center justify-center cursor-pointer group"
        >
          <img 
            src={urlCheck} 
            alt={currentAd.name}
            onError={triggerNextAdFallback}
            onLoad={() => {
              setIsAdLoading(false);
              startCountdownWithDelay();
            }}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain transition-all duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-all flex items-center justify-center">
            <span className="px-3.5 py-2 bg-slate-900/90 text-[#10b981] text-[9px] font-black uppercase rounded-xl tracking-widest border border-emerald-500/20 shadow-xl opacity-0 group-hover:opacity-100 transition-all">
              🚀 CLICK TO VISIT OFFER
            </span>
          </div>
        </a>
      );
    }

    // 6. Default Web Page Iframe Player (via our server bypass proxy) or a beautifully rendered brand link portal
    // Since external links like bKash, Telegram channels, and Facebook frequently block being loaded inside iframes (X-Frame-Options),
    // rendering a high-fidelity interactive portal card is 1000% more reliable, fast, and secure.
    if (currentAd.type === 'Web Link' || isWebBlockedByXFrame) {
      const branding = getUrlBrandingInfo(urlCheck);
      return (
        <div className={`w-full p-6 md:p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b ${branding.gradient} rounded-2xl border border-white/10 shadow-2xl space-y-4 min-h-[180px]`}>
          <div className="w-14 h-14 rounded-full bg-slate-950/60 flex items-center justify-center border border-white/10 text-emerald-400 animate-bounce">
            <Globe size={28} className={branding.textColor} />
          </div>
          <div className="space-y-1">
            <span className={`text-[9px] font-black uppercase tracking-widest ${branding.textColor}`}>{branding.provider}</span>
            <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">{branding.banglaTitle}</h4>
            <p className="text-[10px] text-slate-300 font-bold max-w-xs leading-relaxed">
              {branding.banglaDesc}
            </p>
          </div>
          
          <a
            href={urlCheck}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setIsAdLoading(false);
              startCountdownWithDelay();
              setLinkOpened(true);
            }}
            className={`w-full py-3 px-4 rounded-xl text-slate-950 font-black text-[10px] tracking-widest uppercase transition-all duration-300 transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border-b-4 shadow-xl select-none ${branding.btnBg}`}
          >
            {branding.btnText}
          </a>
        </div>
      );
    }

    const proxiedIframeSrc = `/api/proxy?url=${encodeURIComponent(urlCheck)}`;
    
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-white border border-white/5 shadow-2xl">
        <iframe
          ref={iframeRef}
          src={proxiedIframeSrc}
          title="Sponsored Offer Page"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => {
            setIsAdLoading(false);
            setIframeLoaded(true);
            startCountdownWithDelay();
          }}
          onError={triggerNextAdFallback}
          className="w-full h-full absolute inset-0"
        />
      </div>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // If the click is on a button or an anchor tag or video controls, let them handle it themselves
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('video')) {
      return;
    }

    // 1. If it's a web link, automatically open the link in a new tab on first overlay click (user gesture bypasses popup blocker)
    if (showAd && currentAd && currentAd.type === 'Web Link' && !hasOpenedLink.current) {
      openExternalSponsorPage(currentAd.url);
      hasOpenedLink.current = true;
    }

    // 2. Play direct video and unmute if it was blocked by autoplay or muted
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.muted = false;
      setIsMuted(false);
      videoElement.play()
        .then(() => {
          setVideoPlaying(true);
          setAutoplayFailed(false);
        })
        .catch(err => console.log("Overlay play trigger caught/blocked:", err));
    }

    // 3. Unmute and play YouTube / Vimeo iframes
    if (iframeRef.current && iframeRef.current.contentWindow) {
      setIsMuted(false);
      // YouTube Play & Unmute
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      // Vimeo Play & Unmute
      iframeRef.current.contentWindow.postMessage('{"method":"setVolume","value":1}', '*');
      iframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
    }
  };

  return (
    <div 
      id="arez-ad-manager-overlay-container" 
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[999999] bg-slate-950/98 flex h-screen w-screen items-center justify-center overflow-hidden select-none font-sans"
    >
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-[380px] h-[380px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top countdown timeline progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-900 z-[1000001]">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 via-[#10b981] to-sky-500 transition-all duration-1000"
          style={{ width: `${((adSkipTimeConfig - secondsLeft) / adSkipTimeConfig) * 100}%` }}
        />
      </div>

      {/* Primary Browser/WebView Mock Card Container */}
      <div className="relative z-[1000000] max-w-lg w-full mx-4 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500 hover:border-emerald-500/20 transition-all">
        
        {/* Mock Browser Header Options Bar */}
        <div className="bg-slate-950 p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 opacity-80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 opacity-80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-80"></span>
          </div>

          {/* Secure Padlock & Address Bar Mockup */}
          <a 
            href={urlCheck}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsAdLoading(false)}
            className="flex-1 bg-slate-900 px-4 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 justify-center text-center cursor-pointer hover:bg-slate-800 transition-all no-underline"
            title="Click to visit site in separate tab"
          >
            <Lock size={10} className="text-emerald-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-xs block leading-none">
              {isUrlValid ? new URL(urlCheck).hostname : 'arez-secure-sandbox.net'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[6px] font-black tracking-wide leading-none uppercase shrink-0 border border-emerald-500/20">
              SSL SECURE
            </span>
          </a>

          {/* Browser utility actions icons */}
          <div className="flex items-center gap-2 shrink-0 text-slate-500">
            <ArrowLeft size={12} className="opacity-40" />
            <ArrowRight size={12} className="opacity-40" />
            <RotateCcw size={11} className="hover:text-[#10b981] transition-all cursor-pointer" onClick={triggerNextAdFallback} title="Load next sequence ad" />
          </div>
        </div>

        {/* Campaign Label Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-amber-400 text-[9px] font-black uppercase tracking-wider">
            <ShieldAlert size={11} />
            Sponsor Ad: {currentAd.name}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Sequence #{currentAd.orderNumber}</span>
          </div>
        </div>

        {/* Modal Main Body Context */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Dynamic Bengali instructions */}
          <div className="space-y-1.5 text-center">
            <h2 className="text-base md:text-lg font-black text-white tracking-tight leading-none uppercase italic flex items-center justify-center gap-2">
              {canSkip ? (
                <>
                  <Check size={16} className="text-[#10b981] animate-bounce" />
                  বিজ্ঞাপন সম্পূর্ণ হয়েছে!
                </>
              ) : (
                <>
                  <Clock size={16} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                  বিজ্ঞাপন লোড হচ্ছে...
                </>
              )}
            </h2>
            <p className="text-[10px] text-slate-300 font-bold leading-relaxed">
              {canSkip 
                ? "বিজ্ঞাপন সম্পন্ন হয়েছে। পয়েন্ট নিতে নিচে ডানপাশের স্কিপ বাটনে ক্লিক করুন।" 
                : "পয়েন্ট যোগ হতে দয়া করে নিচের বিজ্ঞাপনটি মনোযোগ দিয়ে সম্পূর্ণ সময় দেখুন।"
              }
            </p>
          </div>

          {/* ACTIVE AD VIEWER GRAPHICS STAGE */}
          <div className="relative z-10 w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 min-h-[160px] flex items-center justify-center">
            {isAdLoading && (
              <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="text-[#10b981] animate-spin" size={24} />
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verifying Connection Sandbox...</span>
              </div>
            )}
            
            {renderViewportContent()}

            {/* Inline volume trigger button for direct raw HTML5 video elements */}
            {currentAd.type === 'Video' && !isAdLoading && (
              <button
                onClick={handleAudioToggle}
                className="absolute bottom-3 left-3 z-30 p-2 bg-slate-950/85 hover:bg-slate-950 border border-white/10 text-white rounded-lg flex items-center gap-1.5 transition-all active:scale-90"
                title="Audio Switcher"
              >
                {isMuted ? (
                  <>
                    <VolumeX size={11} className="text-rose-400 animate-pulse" />
                    <span className="text-[7px] font-black tracking-widest uppercase text-rose-400 leading-none">TAP TO PLAY AUDIO</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={11} className="text-[#10b981]" />
                    <span className="text-[7px] font-black tracking-widest uppercase text-[#10b981] leading-none">AUDIO ACTIVE</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Manual Link Opener Utility shortcut */}
          {isUrlValid && (
            <div className="flex flex-col">
              <a
                href={urlCheck}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsAdLoading(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/20 text-slate-300 hover:text-white font-bold text-[9px] transition-all active:scale-95 text-center no-underline"
              >
                <ExternalLink size={11} className="text-[#10b981]" />
                <span>নতুন উইন্ডোতে সরাসরি অফার পেইজটি দেখুন (Click here if blank)</span>
              </a>
            </div>
          )}

          {/* Footer Action buttons with live Skip trigger */}
          <div className="flex items-center justify-between border-t border-white/5 pt-5 pb-1">
            <div className="text-left font-sans">
              <span className="text-[8px] text-slate-500 uppercase block font-bold leading-none mb-1">Rotation Type</span>
              <span className="text-[10px] font-black text-[#10b981] uppercase tracking-wider flex items-center gap-1 leading-none">
                {currentAd.type === 'Video' ? <Play size={10} className="text-amber-400" /> : <Globe size={10} className="text-sky-400" />}
                {currentAd.type} Format
              </span>
            </div>

            {/* Countdown or Skip execution */}
            <div>
              {!canSkip ? (
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/5 font-mono text-amber-400 font-black text-xs leading-none">
                  <Clock size={12} className="text-amber-400 animate-pulse" />
                  {secondsLeft}s
                </div>
              ) : (
                <button
                  onClick={handleAdClose}
                  className="px-5 py-2 bg-[#10b981] text-slate-950 hover:bg-emerald-600 font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center gap-1.5 animate-bounce shadow-lg shadow-emerald-500/10"
                >
                  SKIP AD <Sparkles size={11} />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Overlay right-centered persistent skip shortcut button for user convenience */}
      {canSkip && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[1000002] hidden md:block">
          <button
            onClick={handleAdClose}
            className="py-4 px-6 bg-gradient-to-r from-[#10b981] to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-[10px] tracking-widest uppercase rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-b-4 border-emerald-800"
          >
            <span>SKIP AD ➜</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdManagerOverlay;

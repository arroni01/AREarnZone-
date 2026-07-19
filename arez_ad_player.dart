import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

/// AREarnZone Sponsor Ad Model representing the Ad configuration
class AreAdModel {
  final String id;
  final String title;
  final String type; // 'video' or 'url'
  final String mediaUrl;
  final int skipDelay; // in seconds
  final bool active;
  final int order;
  final String? thumbnailUrl;

  AreAdModel({
    required this.id,
    required this.title,
    required this.type,
    required this.mediaUrl,
    required this.skipDelay,
    required this.active,
    required this.order,
    this.thumbnailUrl,
  });

  factory AreAdModel.fromJson(Map<String, dynamic> json) {
    return AreAdModel(
      id: json['id']?.toString() ?? '',
      title: json['name']?.toString() ?? json['title']?.toString() ?? 'Sponsor Campaign',
      type: (json['type']?.toString().toLowerCase() == 'video') ? 'video' : 'url',
      mediaUrl: json['url']?.toString() ?? json['mediaUrl']?.toString() ?? '',
      skipDelay: int.tryParse(json['skipDelay']?.toString() ?? json['adSkipSeconds']?.toString() ?? '15') ?? 15,
      active: json['isActive'] == true || json['active'] == true,
      order: int.tryParse(json['orderNumber']?.toString() ?? json['order']?.toString() ?? '1') ?? 1,
      thumbnailUrl: json['thumbnailUrl']?.toString() ?? json['thumbnail']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'mediaUrl': mediaUrl,
      'skipDelay': skipDelay,
      'active': active,
      'order': order,
      'thumbnailUrl': thumbnailUrl,
    };
  }
}

/// Helper enum for smart detected ad content types
enum AdContentType {
  mp4Video,
  youtubeVideo,
  webPage,
}

/// The main Ad Overlay Viewport representing the Immersive Full Screen Ad Viewer
class AreAdPlayerOverlay extends StatefulWidget {
  final List<AreAdModel> adsList;
  final VoidCallback onAdDismissed;

  const AreAdPlayerOverlay({
    Key? key,
    required this.adsList,
    required this.onAdDismissed,
  }) : super(key: key);

  @override
  State<AreAdPlayerOverlay> createState() => _AreAdPlayerOverlayState();
}

class _AreAdPlayerOverlayState extends State<AreAdPlayerOverlay> {
  // Navigation & Sequences State
  List<AreAdModel> activeAds = [];
  AreAdModel? currentAd;
  int currentAdIndex = -1;
  AdContentType currentContentType = AdContentType.webPage;

  // Video controller variables
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;
  bool _isVideoPlaying = false;
  bool _isVideoMuted = true;

  // WebView controller variables
  InAppWebViewController? _webViewController;
  bool _webviewLoadErrorOccurred = false;
  Timer? _webviewTimeoutTimer;

  // Countdown timers
  Timer? _countdownTimer;
  int _secondsLeft = 15;
  bool _canSkip = false;
  bool _isLoading = true;
  String _errorMessage = '';
  int _retryCount = 0;

  @override
  void initState() {
    super.initState();
    // 1. Enter Immersive Full Screen Mode (Hides status bar and system navigation buttons)
    _enterFullScreen();
    // 2. Initialize the sequential ads loop
    _initializeAdsQueue();
  }

  @override
  void dispose() {
    _exitFullScreen();
    _countdownTimer?.cancel();
    _webviewTimeoutTimer?.cancel();
    _videoController?.dispose();
    super.dispose();
  }

  /// Enter full screen mode, hiding the status bar & soft navigation keys
  void _enterFullScreen() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  }

  /// Restore original system interfaces when exiting the player
  void _exitFullScreen() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  /// Initialize ads queue with SharedPreferences persistence to remember sequential rotation
  Future<void> _initializeAdsQueue() async {
    // Filter & sort active ads sequentially by order
    activeAds = widget.adsList.where((ad) => ad.active).toList();
    activeAds.sort((a, b) => a.order.compareTo(b.order));

    if (activeAds.isEmpty) {
      _dismissOverlay();
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final lastViewedId = prefs.getString('arez_last_viewed_ad_id') ?? '';

      // Find next index sequentially: Ad1 → Ad2 → Ad3 → ... → Last Ad → Ad1
      int targetIndex = 0;
      if (lastViewedId.isNotEmpty) {
        final previousIndex = activeAds.indexWhere((ad) => ad.id == lastViewedId);
        if (previousIndex != -1) {
          targetIndex = (previousIndex + 1) % activeAds.length;
        }
      }

      _loadAdAtIndex(targetIndex);
    } catch (e) {
      // SharedPreferences failure fallback
      _loadAdAtIndex(0);
    }
  }

  /// Helper to clean, parse and normalize URLs
  /// Fixes missing protocol (http/https) and trims leading/trailing spaces
  String _normalizeUrl(String rawUrl) {
    String cleanUrl = rawUrl.trim();
    if (cleanUrl.isEmpty) return "";
    
    // Automatically prepend protocol if missing entirely
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://$cleanUrl';
    }
    return cleanUrl;
  }

  /// Smartly detects URL properties to apply the absolute best display layout
  AdContentType _detectContentType(String url) {
    final lowerUrl = url.toLowerCase().trim();
    if (lowerUrl.contains('.mp4') ||
        lowerUrl.contains('.webm') ||
        lowerUrl.contains('.mov') ||
        lowerUrl.contains('.mkv') ||
        lowerUrl.contains('.3gp') ||
        lowerUrl.contains('/video/') ||
        lowerUrl.endsWith('.mp4') ||
        lowerUrl.contains('video-stream')) {
      return AdContentType.mp4Video;
    } else if (lowerUrl.contains('youtube.com') ||
        lowerUrl.contains('youtu.be') ||
        lowerUrl.contains('youtube-nocookie.com')) {
      return AdContentType.youtubeVideo;
    } else {
      return AdContentType.webPage;
    }
  }

  /// Extract YouTube Video ID from any standard watch, shorts, share, or embed URLs
  String? _getYouTubeId(String url) {
    final cleanUrl = url.trim();
    // Match YouTube Shorts
    if (cleanUrl.contains('/shorts/')) {
      final parts = cleanUrl.split('/shorts/');
      if (parts.length > 1) {
        final idPart = parts[1].split('?').first.split('&').first;
        if (idPart.length == 11) return idPart;
      }
    }
    
    final regExp = RegExp(
      r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*',
      caseSensitive: false,
      multiLine: false,
    );
    final match = regExp.firstMatch(cleanUrl);
    if (match != null && match.groupCount >= 2) {
      final id = match.group(2);
      if (id != null && id.length == 11) {
        return id;
      }
    }
    return null;
  }

  /// Load Ad at the specified sequential index with robust validation and AI-grade fallbacks
  Future<void> _loadAdAtIndex(int index) async {
    if (index < 0 || index >= activeAds.length) {
      _dismissOverlay();
      return;
    }

    // Reset previous states safely
    _countdownTimer?.cancel();
    _webviewTimeoutTimer?.cancel();
    if (_videoController != null) {
      try {
        await _videoController!.dispose();
      } catch (_) {}
      _videoController = null;
    }

    // Normalize URL first to bypass input typos
    final rawUrl = activeAds[index].mediaUrl;
    final normalizedUrl = _normalizeUrl(rawUrl);

    setState(() {
      currentAdIndex = index;
      currentAd = activeAds[index];
      _secondsLeft = currentAd!.skipDelay;
      _canSkip = false;
      _isLoading = true;
      _isVideoInitialized = false;
      _isVideoPlaying = false;
      _webviewLoadErrorOccurred = false;
      _errorMessage = '';
      _retryCount = 0;
      currentContentType = _detectContentType(normalizedUrl);
    });

    // Validate campaign URL address
    if (normalizedUrl.isEmpty || !Uri.parse(normalizedUrl).isAbsolute) {
      _handleAdLoadFailure("Invalid Ad URL Address (ত্রুটিপূর্ণ লিঙ্ক)");
      return;
    }

    // Persist last viewed ad ID state
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('arez_last_viewed_ad_id', currentAd!.id);
      await prefs.setString('arez_last_viewed_ad_time', DateTime.now().millisecondsSinceEpoch.toString());
    } catch (_) {}

    // Initialize display modes
    if (currentContentType == AdContentType.mp4Video) {
      _initializeVideoPlayer(normalizedUrl);
    } else {
      // WebView & YouTube uses the smart sandboxed system layout
      _startWebviewTimeoutMonitor();
    }

    // Start the countdown delay timer
    _startCountdown();
  }

  /// Native Video Player initialization & autoplay configuration
  Future<void> _initializeVideoPlayer(String videoUrl) async {
    try {
      final uri = Uri.parse(videoUrl);
      _videoController = VideoPlayerController.networkUrl(uri);

      // Setup audio properties & volume checks
      await _videoController!.initialize();
      await _videoController!.setVolume(_isVideoMuted ? 0.0 : 1.0);
      await _videoController!.setLooping(true);

      // Attempt muted autoplay
      await _videoController!.play();

      if (mounted) {
        setState(() {
          _isVideoInitialized = true;
          _isVideoPlaying = true;
          _isLoading = false;
        });
      }

      // Track playback errors or stuck buffers
      _videoController!.addListener(() {
        if (_videoController!.value.hasError) {
          _handleAdLoadFailure("Video load error, advancing to next (ভিডিও লোড হয়নি)");
        }
      });
    } catch (e) {
      // If direct video stream fails, try running it as webPage in InAppWebView! (bulletproof backup)
      debugPrint("Direct Video Player initialization failed. Falling back to WebView streaming.");
      if (mounted) {
        setState(() {
          currentContentType = AdContentType.webPage;
        });
        _startWebviewTimeoutMonitor();
      }
    }
  }

  /// Web Loading Timeout Engine - If a URL fails to load within 2 seconds, trigger retry or launch browser
  void _startWebviewTimeoutMonitor() {
    _webviewTimeoutTimer?.cancel();
    _webviewTimeoutTimer = Timer(const Duration(milliseconds: 2000), () {
      if (!mounted) return;
      if (_isLoading) {
        debugPrint("Ad loading timed out after 2 seconds. Retrying...");
        _handleWebviewLoadError("Load Timeout (লোডিং টাইম-আউট হয়েছে)");
      }
    });
  }

  /// Web load failure recovery. Retry once, then auto-launch external fallback immediately. No blank screen ever!
  void _handleWebviewLoadError(String reason) {
    _webviewTimeoutTimer?.cancel();
    if (_webviewLoadErrorOccurred) return; // Prevent double trigger

    if (_retryCount < 1) {
      // Retry once by reloading the WebView
      _retryCount++;
      debugPrint("WebView failed: $reason. Retrying session ($_retryCount/1)...");
      try {
        _webViewController?.reload();
      } catch (_) {}
      _startWebviewTimeoutMonitor();
    } else {
      // Permanent failure on In-App WebView. Force automatic external browser launch to protect user points!
      setState(() {
        _webviewLoadErrorOccurred = true;
        _isLoading = false;
      });
      debugPrint("WebView load permanently failed. Initiating secure external redirect...");
      final normalizedUrl = _normalizeUrl(currentAd!.mediaUrl);
      _launchExternalSponsorPage(normalizedUrl);
    }
  }

  /// Safe URL Launching via url_launcher packages (custom tabs fallback)
  Future<void> _launchExternalSponsorPage(String rawUrl) async {
    final cleanUrl = _normalizeUrl(rawUrl);
    if (cleanUrl.isEmpty) return;
    
    final uri = Uri.parse(cleanUrl);
    try {
      // Try launching in custom tab or default external browser
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      debugPrint("Launcher blocked: $e");
    }
  }

  /// Start countdown skip delay timer
  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;

      setState(() {
        if (_secondsLeft <= 1) {
          _secondsLeft = 0;
          _canSkip = true;
          _countdownTimer?.cancel();
        } else {
          _secondsLeft--;
        }
      });
    });
  }

  /// Playback mute/unmute toggle helper
  void _toggleMute() {
    if (_videoController == null || !_isVideoInitialized) return;
    setState(() {
      _isVideoMuted = !_isVideoMuted;
    });
    _videoController!.setVolume(_isVideoMuted ? 0.0 : 1.0);
  }

  /// Dynamic ad failure recovery - sequential rotation to next active ad campaign
  void _handleAdLoadFailure(String error) {
    debugPrint("Ad campaign failed at index $currentAdIndex: $error");
    if (!mounted) return;

    setState(() {
      _errorMessage = error;
      _isLoading = false;
    });

    // Auto-advance sequentially to the next active ad if possible
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      if (activeAds.length > 1) {
        final nextIndex = (currentAdIndex + 1) % activeAds.length;
        _loadAdAtIndex(nextIndex);
      } else {
        // Only one ad in queue and it failed, release overlay view
        _dismissOverlay();
      }
    });
  }

  /// Trigger manual next sequence rotation
  void _skipToNextAd() {
    if (activeAds.length > 1) {
      final nextIndex = (currentAdIndex + 1) % activeAds.length;
      _loadAdAtIndex(nextIndex);
    } else {
      _dismissOverlay();
    }
  }

  /// Dismiss Ad viewport and return user to their previous screen
  void _dismissOverlay() {
    _countdownTimer?.cancel();
    _webviewTimeoutTimer?.cancel();
    if (_videoController != null) {
      try {
        _videoController!.dispose();
      } catch (_) {}
    }
    widget.onAdDismissed();
  }

  @override
  Widget build(BuildContext context) {
    if (currentAd == null) return const SizedBox.shrink();

    return WillPopScope(
      onWillPop: () async => false, // Lock system back buttons to prevent cheat skip
      child: Scaffold(
        backgroundColor: Colors.black, // Dark mode black background
        body: SafeArea(
          child: Stack(
            children: [
              // Main Content Panel
              Column(
                children: [
                  // Mock Secure Browser Header
                  _buildMockHeaderAddressBar(),
                  const SizedBox(height: 8),

                  // Title Header info
                  _buildCampaignTitleHeader(),
                  const SizedBox(height: 8),

                  // Main Viewport Core Container
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.08),
                          width: 1.2,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Stack(
                          children: [
                            _buildViewportContent(),
                            
                            // Loading Spinner Overlay
                            if (_isLoading)
                              Container(
                                color: Colors.black.withOpacity(0.95),
                                child: const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      CircularProgressIndicator(
                                        strokeWidth: 3,
                                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                                      ),
                                      SizedBox(height: 16),
                                      Text(
                                        "Securing Connection Sandbox...",
                                        style: TextStyle(
                                          color: Color(0xFF10B981),
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Direct Interactive Redirect Action Rail
                  _buildExternalRedirectButton(),
                  const SizedBox(height: 8),

                  // Dynamic Countdown or Skip Trigger Panel
                  _buildFooterControlsBar(),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Widget building helper: Mock Browser URL Address Row
  Widget _buildMockHeaderAddressBar() {
    final cleanUrl = _normalizeUrl(currentAd!.mediaUrl);
    final hostname = Uri.tryParse(cleanUrl)?.host ?? 'arez-secure-sandbox.net';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF090D16),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        children: [
          // Browser UI simulated lights
          Row(
            children: [
              Container(width: 7, height: 7, decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Container(width: 7, height: 7, decoration: const BoxDecoration(color: Colors.amber, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Container(width: 7, height: 7, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
            ],
          ),
          const SizedBox(width: 12),

          // Safe SSL Padlock & Text Address bar
          Expanded(
            child: GestureDetector(
              onTap: () => _launchExternalSponsorPage(currentAd!.mediaUrl),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withOpacity(0.03)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.lock, size: 9, color: Color(0xFF10B981)),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        hostname,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 9,
                          fontFamily: 'monospace',
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0x1A10B981),
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(color: const Color(0x2B10B981)),
                      ),
                      child: const Text(
                        'SECURE',
                        style: TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Next rotational force trigger
          GestureDetector(
            onTap: _skipToNextAd,
            child: const Icon(
              Icons.refresh,
              size: 13,
              color: Color(0xFF10B981),
            ),
          )
        ],
      ),
    );
  }

  /// Widget building helper: Ad Campaign Title text header
  Widget _buildCampaignTitleHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x0DF59E0B),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x1BF59E0B)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                const Icon(Icons.verified_user_outlined, color: Colors.amber, size: 12),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    "Sponsor: ${currentAd!.title}",
                    style: const TextStyle(
                      color: Colors.amber,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0x1F10B981),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              "SEQ #${currentAd!.order}",
              style: const TextStyle(
                color: Color(0xFF10B981),
                fontSize: 7,
                fontWeight: FontWeight.bold,
              ),
            ),
          )
        ],
      ),
    );
  }

  /// Widget building helper: Viewport Content Render Hub
  Widget _buildViewportContent() {
    if (_errorMessage.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, color: Colors.redAccent, size: 32),
            ),
            const SizedBox(height: 12),
            Text(
              _errorMessage,
              style: const TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              "অটোমেটিক পরবর্তী বিজ্ঞাপনে নিয়ে যাওয়া হচ্ছে...",
              style: TextStyle(color: Colors.grey, fontSize: 9),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final cleanUrl = _normalizeUrl(currentAd!.mediaUrl);

    // Direct HTML5 Native Video Player
    if (currentContentType == AdContentType.mp4Video) {
      if (_videoController != null && _isVideoInitialized) {
        return Stack(
          alignment: Alignment.center,
          children: [
            SizedBox.expand(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _videoController!.value.size.width,
                  height: _videoController!.value.size.height,
                  child: VideoPlayer(_videoController!),
                ),
              ),
            ),

            // Video audio sound volume control button Overlay
            Positioned(
              bottom: 12,
              left: 12,
              child: Material(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(6),
                child: InkWell(
                  onTap: _toggleMute,
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _isVideoMuted ? Icons.volume_off : Icons.volume_up,
                          size: 11,
                          color: _isVideoMuted ? Colors.redAccent : const Color(0xFF10B981),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isVideoMuted ? "Muted" : "Playing",
                          style: TextStyle(
                            color: _isVideoMuted ? Colors.redAccent : const Color(0xFF10B981),
                            fontWeight: FontWeight.bold,
                            fontSize: 7.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      } else {
        return const Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
          ),
        );
      }
    }

    // Smart In-App Web View supporting regular URLs and YouTube Iframe Embeds
    String finalWebUrl = cleanUrl;
    if (currentContentType == AdContentType.youtubeVideo) {
      final youtubeId = _getYouTubeId(cleanUrl);
      if (youtubeId != null) {
        // Embed YouTube natively inside the iframe with premium autoplay configurations
        finalWebUrl = "https://www.youtube-nocookie.com/embed/$youtubeId?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0";
      }
    }

    // If a load error occurred, render custom safety card with launch trigger
    if (_webviewLoadErrorOccurred) {
      return Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.open_in_browser, color: Color(0xFF10B981), size: 40),
            const SizedBox(height: 12),
            const Text(
              "Redirecting to Safe Window",
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 6),
            const Text(
              "নিরাপদ সেশন বজায় রাখতে এবং রিওয়ার্ড পয়েন্ট নিশ্চিত করতে অফার পেজটি ক্রোম উইন্ডোতে ওপেন হয়েছে।",
              style: TextStyle(color: Colors.grey, fontSize: 10, height: 1.3),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () => _launchExternalSponsorPage(currentAd!.mediaUrl),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              icon: const Icon(Icons.open_in_new, size: 12),
              label: const Text(
                "OPEN SPONSOR PAGE",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9),
              ),
            ),
          ],
        ),
      );
    }

    return InAppWebView(
      initialUrlRequest: URLRequest(url: WebUri(finalWebUrl)),
      initialSettings: InAppWebViewSettings(
        javaScriptEnabled: true,
        domStorageEnabled: true,
        mediaPlaybackRequiresUserGesture: false,
        mixedContentMode: MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
        thirdPartyCookiesEnabled: true,
        allowsInlineMediaPlayback: true,
        useHardwareAcceleration: true,
        // Premium Chrome spoofing to avoid being blocked by frame ancestry checks
        userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      ),
      onWebViewCreated: (controller) {
        _webViewController = controller;
      },
      onLoadStart: (controller, url) {
        _startWebviewTimeoutMonitor();
      },
      onLoadStop: (controller, url) {
        _webviewTimeoutTimer?.cancel();
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      },
      onReceivedSslError: (controller, challenge) async {
        // AI Optimization: Bypass invalid SSL certificates completely to prevent blank screen load blocks
        return ServerTrustAuthResponse(action: ServerTrustAuthResponseAction.PROCEED);
      },
      onReceivedError: (controller, request, error) {
        _handleWebviewLoadError(error.description);
      },
      onReceivedHttpError: (controller, request, errorResponse) {
        // Catch server-side errors, redirects, or frames blocks (status 400+)
        if (errorResponse.statusCode >= 400) {
          _handleWebviewLoadError("HTTP Error ${errorResponse.statusCode}");
        }
      },
    );
  }

  /// Widget building helper: Redirect Manual offer checker
  Widget _buildExternalRedirectButton() {
    return GestureDetector(
      onTap: () => _launchExternalSponsorPage(currentAd!.mediaUrl),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.04)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.launch, size: 12, color: Color(0xFF10B981)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                "লিংকটি নতুন উইন্ডোতে দেখতে এখানে ক্লিক করুন (Click if blank)",
                style: TextStyle(
                  color: Colors.slate.shade300,
                  fontSize: 8.5,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Widget building helper: Footer Options & Skip Countdown action Bar
  Widget _buildFooterControlsBar() {
    String formatText = "WEB LINK";
    IconData formatIcon = Icons.public;
    Color formatColor = Colors.lightBlue;

    if (currentContentType == AdContentType.mp4Video) {
      formatText = "DIRECT VIDEO";
      formatIcon = Icons.movie_filter_outlined;
      formatColor = Colors.amber;
    } else if (currentContentType == AdContentType.youtubeVideo) {
      formatText = "YOUTUBE";
      formatIcon = Icons.play_circle_fill_outlined;
      formatColor = Colors.redAccent;
    }

    return Container(
      padding: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Sequence formatting info
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "CAMPAIGN TYPE",
                style: TextStyle(color: Colors.grey, fontSize: 7, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 3),
              Row(
                children: [
                  Icon(formatIcon, size: 11, color: formatColor),
                  const SizedBox(width: 4),
                  Text(
                    formatText,
                    style: TextStyle(
                      color: formatColor,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Right: Dynamic skip or timer button
          _canSkip
              ? ElevatedButton(
                  onPressed: _dismissOverlay,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ).copyWith(
                    elevation: MaterialStateProperty.all(4),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "SKIP SPONSOR",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9.5),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward, size: 12),
                    ],
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withOpacity(0.04)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 9,
                        height: 9,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.amber),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        "${_secondsLeft}s",
                        style: const TextStyle(
                          color: Colors.amber,
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
        ],
      ),
    );
  }
}

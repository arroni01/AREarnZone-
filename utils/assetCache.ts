/**
 * Dynamic Asset & Image Caching Utility
 * 
 * Provides proactive preloading and browser CacheStorage caching for
 * dynamic assets such as task thumbnails, user profile photos, and avatars
 * to ensure instant loading on repeated visits.
 */

const DYNAMIC_IMAGE_CACHE_NAME = 'arearnzone-dynamic-images-v1';

// In-memory cache set for loaded URLs during the current session
const memoryCachedUrls = new Set<string>();

/**
 * Preloads an individual image URL into browser memory and CacheStorage
 */
export async function preloadImage(url: string | undefined | null): Promise<boolean> {
  if (!url || typeof url !== 'string' || !url.trim() || url.startsWith('data:')) {
    return false;
  }

  const cleanUrl = url.trim();

  if (memoryCachedUrls.has(cleanUrl)) {
    return true;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      memoryCachedUrls.add(cleanUrl);

      // Attempt to cache in CacheStorage if supported
      if ('caches' in window) {
        caches.open(DYNAMIC_IMAGE_CACHE_NAME).then((cache) => {
          cache.add(cleanUrl).catch(() => {
            // Silently ignore CORS cache restrictions if no-cors
          });
        }).catch(() => {});
      }

      resolve(true);
    };

    img.onerror = () => {
      // Retry without crossOrigin attribute for strict CORS images
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        memoryCachedUrls.add(cleanUrl);
        resolve(true);
      };
      fallbackImg.onerror = () => resolve(false);
      fallbackImg.src = cleanUrl;
    };

    img.src = cleanUrl;
  });
}

/**
 * Preloads a list of task thumbnails and user profile photos in bulk
 */
export function preloadTaskAssetsAndUserPhotos(
  taskThumbnails: (string | undefined | null)[],
  userPhotoUrls: (string | undefined | null)[]
): void {
  const allUrls = [...taskThumbnails, ...userPhotoUrls].filter(Boolean) as string[];

  if (allUrls.length === 0) return;

  // Process in batches of 4 to avoid saturating network connections
  const uniqueUrls = Array.from(new Set(allUrls));
  let index = 0;

  const processBatch = () => {
    const batch = uniqueUrls.slice(index, index + 4);
    if (batch.length === 0) return;

    batch.forEach((url) => preloadImage(url));
    index += 4;

    if (index < uniqueUrls.length) {
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(processBatch);
      } else {
        setTimeout(processBatch, 200);
      }
    }
  };

  processBatch();
}

/**
 * Helper hook or check if an image URL is cached
 */
export function isImageCachedLocally(url: string | undefined | null): boolean {
  if (!url) return false;
  return memoryCachedUrls.has(url.trim());
}

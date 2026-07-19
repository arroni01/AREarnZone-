/**
 * Safely downscales and compresses an image file using HTML Canvas.
 * This yields dramatically smaller Base64 payloads (15KB - 40KB) compared to 
 * raw high-res camera outputs (2MB - 10MB), preventing QuotaExceededError in localStorage.
 */
export function compressImage(file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.90): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // fallback to original readAsDataURL if ctx isn't available
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (e) {
          // Fallback if dataURL generation throws
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(event.target?.result as string); // fallback on image error
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

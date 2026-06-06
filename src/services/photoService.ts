/**
 * Professional Image Processing for Emergency Systems
 */
export const photoService = {
  /**
   * Compresses a file or base64 into a compact JPEG Blob
   */
  async compressForSOS(file: File | string, maxWidth = 1000, quality = 0.7): Promise<Blob> {
    // Adaptive compression for exceptionally slow connection types (e.g., rural 2G/3G)
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    let finalMaxWidth = maxWidth;
    let finalQuality = quality;

    if (conn) {
      if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
        finalMaxWidth = 320; // 320px bento-thumbnail for 2G constraints
        finalQuality = 0.3;
        console.log('[PhotoService] 2G Connection detected. Extreme compression active.');
      } else if (conn.effectiveType === '3g') {
        finalMaxWidth = 640; // 640px compressed thumbnail for 3G constraints
        finalQuality = 0.5;
        console.log('[PhotoService] 3G Connection detected. Standard low-bandwidth compression active.');
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > finalMaxWidth) {
          height = Math.round((height * finalMaxWidth) / width);
          width = finalMaxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failure'));

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failure'));
          },
          'image/jpeg',
          finalQuality
        );
        
        if (typeof file !== 'string') URL.revokeObjectURL(img.src);
      };
      
      img.onerror = (err) => reject(err);
    });
  },

  /**
   * Converts a Blob to a Base64 string for transmission or preview
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};

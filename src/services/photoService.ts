/**
 * Professional Image Processing for Emergency Systems
 */
export const photoService = {
  /**
   * Compresses a file or base64 into a compact JPEG Blob
   */
  async compressForSOS(file: File | string, maxWidth = 1000, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
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
          quality
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

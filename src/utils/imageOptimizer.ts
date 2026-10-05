/**
 * Utility to compress and optimize images before uploading.
 * Handles high-resolution mobile camera pictures (10MB+) by downscaling them client-side
 * to crisp web dimensions (e.g. max 1600px width/height, 0.85 JPEG quality).
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<{ base64: string; fileName: string; size: number }> {
  // If it's a PDF, we don't compress via canvas; just read base64 directly
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve({ base64, fileName: file.name, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // If not an image, try direct FileReader
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve({ base64, fileName: file.name, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        // Calculate scaling ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context is unavailable
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({ base64: e.target?.result as string, fileName: file.name, size: file.size });
          };
          reader.readAsDataURL(file);
          return;
        }

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG
        const outputFormat = file.type === 'image/png' && file.size < 1.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputFormat, quality);

        // Estimate size from base64 length
        const sizeEstimate = Math.round((compressedBase64.length * 3) / 4);

        resolve({
          base64: compressedBase64,
          fileName: file.name.replace(/\.[^/.]+$/, '') + (outputFormat === 'image/png' ? '.png' : '.jpg'),
          size: sizeEstimate
        });
      } catch (err) {
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ base64: e.target?.result as string, fileName: file.name, size: file.size });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ base64: e.target?.result as string, fileName: file.name, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

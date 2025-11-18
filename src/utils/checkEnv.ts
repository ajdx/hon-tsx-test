export const checkEnvironmentVariables = () => {
  const apiKeys = {
    'VITE_ELEVEN_LABS_API_KEY': import.meta.env.VITE_ELEVEN_LABS_API_KEY,
    'VITE_CLOUDINARY_CLOUD_NAME': import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    'VITE_CLOUDINARY_UPLOAD_PRESET': import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  };

  // Environment check (console output removed for production security)
  
  // Count missing keys for validation
  let missingKeys = 0;
  const requiredKeys = ['VITE_ELEVEN_LABS_API_KEY', 'VITE_CLOUDINARY_CLOUD_NAME', 'VITE_CLOUDINARY_UPLOAD_PRESET'];
  
  requiredKeys.forEach(key => {
    if (!apiKeys[key]) {
      missingKeys++;
    }
  });

  if (missingKeys > 0) {
    // Only warn for critical missing keys (silent for production)
    console.warn('Some environment variables are missing');
  }
}; 
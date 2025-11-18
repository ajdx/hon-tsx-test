/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string;
  readonly VITE_CLOUDINARY_API_KEY: string;
  readonly VITE_ELEVEN_LABS_API_KEY: string;
  readonly VITE_FAL_API_KEY: string;
  readonly VITE_RUNWAY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

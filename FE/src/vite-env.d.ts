/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_RESTAURANT_NAME?: string;
  readonly VITE_RESTAURANT_ADDRESS?: string;
  readonly VITE_RESTAURANT_PHONE?: string;
  readonly VITE_RESTAURANT_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

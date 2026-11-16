import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  CustomProvider,
  ReCaptchaEnterpriseProvider
} from 'firebase/app-check';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode
} from 'firebase/ai';
import { SCHEMA } from './structured.js';

const CLOUD_MODEL = 'gemini-3.5-flash-lite';

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

function readConfig() {
  const env = import.meta.env;
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error('Missing values in .env.local: ' + missing.join(', '));
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };
}

function createAppCheckProvider() {
  if (import.meta.env.DEV) {
    return new CustomProvider({
      getToken: () => Promise.reject(new Error('Debug mode only'))
    });
  }
  const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
  if (!key) {
    throw new Error('Missing VITE_RECAPTCHA_ENTERPRISE_KEY for the production build');
  }
  return new ReCaptchaEnterpriseProvider(key);
}

export function init() {
  const app = initializeApp(readConfig());

  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: createAppCheckProvider(),
    isTokenAutoRefreshEnabled: false
  });

  const ai = getAI(app, { backend: new GoogleAIBackend() });

  return {
    app,
    onDevice: getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE }),
    cloud: getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD }),
    structuredOnDevice: getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { promptOptions: { responseConstraint: SCHEMA } }
    }),
    structuredCloud: getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: SCHEMA,
          temperature: 0
        }
      }
    })
  };
}

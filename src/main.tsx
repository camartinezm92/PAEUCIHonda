import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DictionaryProvider } from './contexts/DictionaryContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DictionaryProvider>
      <App />
    </DictionaryProvider>
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { I18n } from './lib/i18n';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><I18n><App /></I18n></React.StrictMode>);

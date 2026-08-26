import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// ルート要素の取得
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Reactアプリケーションのレンダリング開始
// StrictModeは開発中の潜在的な問題を検知するためのラッパーです
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
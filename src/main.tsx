import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
// Pretendard Variable (SIL OFL 1.1): 한글 유니코드 범위별 분할 → 화면에 쓰인 글자 묶음만 받는다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

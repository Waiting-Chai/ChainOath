import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 在开发环境中导入XMTP测试函数
if (import.meta.env.DEV) {
  import('./test/xmtpTest');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

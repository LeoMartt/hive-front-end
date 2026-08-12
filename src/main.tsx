import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import { msalConfig } from './config/authConfig'

const msalInstance = new PublicClientApplication(msalConfig)

// Garante que, após login, a conta ativa fica setada (necessário em multi-conta)
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const account = (event.payload as { account?: unknown }).account
    if (account) {
      msalInstance.setActiveAccount(account as Parameters<typeof msalInstance.setActiveAccount>[0])
    }
  }
})

await msalInstance.initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
)

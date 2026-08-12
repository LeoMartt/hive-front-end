import './App.css'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './config/authConfig'

export default function App() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
  }

  const handleLogout = () => {
    instance.logoutRedirect()
  }

  return (
    <main className="container py-5">
      <h1 className="text-primary">HIVE — teste de login (Entra ID)</h1>

      {isAuthenticated ? (
        <>
          <p className="mt-3">
            Logado como: <strong>{accounts[0]?.name}</strong> ({accounts[0]?.username})
          </p>
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Sair
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={handleLogin}>
          Entrar com conta FUMEP
        </button>
      )}
    </main>
  )
}

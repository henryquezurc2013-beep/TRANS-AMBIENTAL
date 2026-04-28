import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CadastroRapido from './pages/CadastroRapido'
import Controle from './pages/Controle'
import Estoque from './pages/Estoque'
import Atrasados from './pages/Atrasados'
import Containers from './pages/Containers'
import Clientes from './pages/Clientes'
import TrocaContainer from './pages/TrocaContainer'
import Manutencao from './pages/Manutencao'
import LancamentoManutencao from './pages/LancamentoManutencao'
import Relatorios from './pages/Relatorios'
import Logs from './pages/Logs'
import Motoristas from './pages/Motoristas'
import TrocasPendentes from './pages/TrocasPendentes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={
              <ProtectedRoute pagina="Dashboard"><Dashboard /></ProtectedRoute>
            } />
            <Route path="/cadastro-rapido" element={
              <ProtectedRoute pagina="Cadastro_Rapido"><CadastroRapido /></ProtectedRoute>
            } />
            <Route path="/controle" element={
              <ProtectedRoute pagina="Controle"><Controle /></ProtectedRoute>
            } />
            <Route path="/estoque" element={
              <ProtectedRoute pagina="Estoque"><Estoque /></ProtectedRoute>
            } />
            <Route path="/atrasados" element={
              <ProtectedRoute pagina="Atrasados"><Atrasados /></ProtectedRoute>
            } />
            <Route path="/containers" element={
              <ProtectedRoute pagina="Cadastro_Containers"><Containers /></ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute pagina="Clientes"><Clientes /></ProtectedRoute>
            } />
            <Route path="/troca-container" element={
              <ProtectedRoute pagina="Troca_Container"><TrocaContainer /></ProtectedRoute>
            } />
            <Route path="/manutencao" element={
              <ProtectedRoute pagina="Manutencao"><Manutencao /></ProtectedRoute>
            } />
            <Route path="/lancamento-manutencao" element={
              <ProtectedRoute pagina="Lancamento_Manutencao"><LancamentoManutencao /></ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute pagina="Relatorios"><Relatorios /></ProtectedRoute>
            } />
            <Route path="/logs" element={
              <ProtectedRoute pagina="Logs"><Logs /></ProtectedRoute>
            } />
            <Route path="/motoristas" element={
              <ProtectedRoute pagina="Motoristas"><Motoristas /></ProtectedRoute>
            } />
            <Route path="/trocas-pendentes" element={
              <ProtectedRoute pagina="Trocas_Pendentes"><TrocasPendentes /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

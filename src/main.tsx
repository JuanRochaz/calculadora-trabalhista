import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import './index.css'
import Decimo from './pages/Decimo'
import Ferias from './pages/Ferias'
import Home from './pages/Home'
import HoraExtra from './pages/HoraExtra'
import NaoEncontrada from './pages/NaoEncontrada'
import Rescisao from './pages/Rescisao'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="rescisao" element={<Rescisao />} />
          <Route path="ferias" element={<Ferias />} />
          <Route path="decimo-terceiro" element={<Decimo />} />
          <Route path="horas-extras" element={<HoraExtra />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

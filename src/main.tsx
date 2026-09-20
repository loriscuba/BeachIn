import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { DemoDataProvider } from './context/DemoDataContext'
import { ModuliProvider } from './context/ModuliContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ModuliProvider>
      <DemoDataProvider>
        <RouterProvider router={router} />
      </DemoDataProvider>
    </ModuliProvider>
  </React.StrictMode>
)

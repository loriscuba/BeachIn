import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { DemoDataProvider } from './context/DemoDataContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoDataProvider>
      <RouterProvider router={router} />
    </DemoDataProvider>
  </React.StrictMode>
)

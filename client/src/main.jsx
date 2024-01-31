import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { RecoilRoot } from 'recoil';
import { RouterProvider } from "react-router";
import { router } from './routes/allRoutes.jsx';


ReactDOM.createRoot(document.getElementById('root')).render(
  <RecoilRoot>
    <RouterProvider router={router}>
      <React.StrictMode>
        {/* <App /> */}
      </React.StrictMode>,
    </RouterProvider>
  </RecoilRoot>
)

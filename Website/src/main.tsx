import React from 'react'
import App from './App'
import './custom.css'
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
const rootElement = document.getElementById('root');

ReactDOM.render(<React.StrictMode>
  
  <BrowserRouter basename='base'>
      <App />
  </BrowserRouter></React.StrictMode>,
  rootElement
);

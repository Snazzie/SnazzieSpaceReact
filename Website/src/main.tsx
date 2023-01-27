import React from 'react'
import App from './App'
import './custom.css'
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {

  apiKey: "AIzaSyBDe7uC6_EvpiCb5HcNaNSEi5Z5x2YKojI",

  authDomain: "snazzie-space.firebaseapp.com",

  projectId: "snazzie-space",

  storageBucket: "snazzie-space.appspot.com",

  messagingSenderId: "588360938634",

  appId: "1:588360938634:web:a8a64cd83a93239e76a973",

  measurementId: "G-FDCWB5RXMW"

};
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const rootElement = document.getElementById('root');

ReactDOM.render(<React.StrictMode>
  
  <BrowserRouter basename='base'>
      <App />
  </BrowserRouter></React.StrictMode>,
  rootElement
);

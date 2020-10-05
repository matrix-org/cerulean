import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const client = new Client();
const ClientContext = React.createContext(client);

ReactDOM.render(
    <React.StrictMode>
        <ClientContext.Provider>
            <App />
        </ClientContext.Provider>
    </React.StrictMode>,
    document.getElementById('root')
);

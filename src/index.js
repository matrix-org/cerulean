import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import Client from './Client';

const client = new Client(window.localStorage);
const ClientContext = React.createContext(client);

ReactDOM.render(
    <React.StrictMode>
        <ClientContext.Provider>
            <App client={client}/>
        </ClientContext.Provider>
    </React.StrictMode>,
    document.getElementById('root')
);

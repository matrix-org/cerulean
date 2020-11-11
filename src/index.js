import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { ClientContext, client } from "./ClientContext";

ReactDOM.render(
    <React.StrictMode>
        <ClientContext.Provider value={client}>
            <App client={client} />
        </ClientContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);

import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Reputation from "./Reputation";
import { ClientContext, client } from "./ClientContext";

const reputation = new Reputation();
reputation.loadWeights(window.localStorage, client);

ReactDOM.render(
    <React.StrictMode>
        <ClientContext.Provider
            value={{
                client: client,
                reputation: reputation,
            }}
        >
            <App client={client} />
        </ClientContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);

import React from "react";
import Client from "./Client";

const client = new Client(window.localStorage);
const ClientContext = React.createContext(client);

export { ClientContext, client };

import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import Client from './Client';

// if you want to run these tests you need to configure these constants first.
const username = "foo";
const password = "barbarbar";
const existingRoomAlias = "#example2:localhost";

xit("loginAsGuest works", async () => {
    const client = new Client({});
    await client.loginAsGuest("http://localhost:8008/_matrix/client", false);
    expect(client.accessToken).toBeDefined();
});

xit("login works", async () => {
    const client = new Client({});
    await client.login("http://localhost:8008/_matrix/client", username, password, false);
    expect(client.accessToken).toBeDefined();
});

it("join room works", async () => {
    const client = new Client({});
    await client.login("http://localhost:8008/_matrix/client", username, password, false);
    let roomId = await client.joinRoom(existingRoomAlias);
    expect(roomId).toBeDefined();
    // should be idempotent
    roomId = await client.joinRoom(existingRoomAlias);
    expect(roomId).toBeDefined();
});

it("sendMessage works", async () => {
    const client = new Client({});
    await client.login("http://localhost:8008/_matrix/client", username, password, false);
    await client.joinRoom(existingRoomAlias);
    const eventID = await client.sendMessage(existingRoomAlias, {
        msgtype: "m.text",
        body: "Hello World!",
    });
    expect(eventID).toBeDefined();
});
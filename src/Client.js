class Client {

    // we deliberately don't use js-sdk as we want flexibility on
    // how we model the data (i.e. not as normal rooms + timelines
    // given everything is threaded)

    constructor(config) {
        this.serverUrl = config.serverUrl;
        this.userId = config.userId;
        this.accessToken = config.accessToken;
        this.guest = config.guest;
        this.serverName = config.serverName;
        this.joinedRooms = new Map(); // room alias -> room ID
    }

    saveAuthState() {
        window.localStorage.serverUrl = this.serverUrl;
        window.localStorage.userId = this.userId;
        window.localStorage.accessToken = this.accessToken;
        window.guest = this.guest;
        window.localStorage.serverName = this.serverName;
    }

    async loginAsGuest(serverUrl, saveToStorage) {
        const data = await this.fetchJson(`${serverUrl}/r0/register?kind=guest`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
        this.serverUrl = serverUrl;
        this.userId = data.user_id;
        this.accessToken = data.access_token;
        this.guest = true;
        this.serverName = data.home_server;
        if (saveToStorage) {
            this.saveAuthState();
        }
    }

    async login(serverUrl, username, password, saveToStorage) {
        const data = await this.fetchJson(`${serverUrl}/r0/login`, {
            method: 'POST',
            body: JSON.stringify({
                type: "m.login.password",
                identifier: {
                    type: "m.id.user",
                    user: username,
                },
                password: password,
            }),
        });
        this.serverUrl = serverUrl;
        this.userId = data.user_id;
        this.accessToken = data.access_token;
        this.guest = true;
        this.serverName = data.home_server;
        if (saveToStorage) {
            this.saveAuthState();
        }
    }

    async sendMessage(roomAlias, content) {
        const roomId = await this.joinRoom(roomAlias);
        const txnId = Date.now();
        const data = await this.fetchJson(`${this.serverUrl}/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${encodeURIComponent(txnId)}`, {
            method: 'PUT',
            body: JSON.stringify(content),
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        return data.event_id;
    }

    getMsgs(userId, withReplies, eventId) {
        if (!this.accessToken) {
            console.error("No access token");
            return;
        }

        const roomId = this.peekRoom(`#${userId}`);

        let msgs = [];
        if (eventId) {
            fetch(`${this.serverUrl}/r0/rooms/${roomId}/context/${eventId}`, {
                headers: { Authorization: `Bearer: ${this.accessToken}` },
            }).then(
                response => response.json()
            ).then(data => {
                msgs.push(data.event);
            });
        }
        else {
            const filter = {
                'user_id': userId, // we just want this user's messages
            };
            // only grab unlabelled messages if we don't want the user's replies.
            if (!withReplies) filter['m.label'] = '';

            fetch(`${this.serverUrl}/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`, {
                headers: { Authorization: `Bearer: ${this.accessToken}` },
            }).then(
                response => response.json()
            ).then(data => {
                for (const event of data.chunk) {
                    msgs.push(event);
                }
            });
        }

        return msgs;
    }

    getSubthreadMsgs(userId, threadId) {
        if (!this.accessToken) {
            console.error("No access token");
            return;
        }

        const roomId = this.peekRoom(`#${userId}`);
        let msgs = [];
        const filter = {
            'm.label': threadId,
        };

        fetch(`${this.serverUrl}/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`, {
            headers: { Authorization: `Bearer: ${this.accessToken}` },
        }).then(
            response => response.json()
        ).then(data => {
            for (const event of data.chunk) {
                msgs.push(event);
            }
        });

        return msgs;
    }

    peekRoom(roomAlias) {
        // For now join the room instead.
        // Once MSC2753 is available, to allow federated peeking
        return this.joinRoom(roomAlias);
    }

    async joinRoom(roomAlias) {
        const roomId = this.joinedRooms.get(roomAlias);
        if (roomId) {
            return roomId;
        }
        const data = await this.fetchJson(`${this.serverUrl}/r0/join/${encodeURIComponent(roomAlias)}`, {
            method: 'POST',
            body: '{}',
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        this.joinedRooms.set(roomAlias, data.room_id);
        return data.room_id;
    }

    async fetchJson(fullUrl, fetchParams) {
        const response = await fetch(fullUrl, fetchParams);
        const data = await response.json();
        if (!response.ok) {
            throw data;
        }
        return data;
    }
}

export default Client;
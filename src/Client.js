class Client {

    // we deliberately don't use js-sdk as we want flexibility on
    // how we model the data (i.e. not as normal rooms + timelines
    // given everything is threaded)

    serverUrl;
    userId;
    accessToken;
    guest;
    serverName;

    constructor() {
        this.loadAuthState();
    }

    loadAuthState() {
        this.serverUrl = window.localStorage.serverUrl;
        this.userId = window.localStorage.userId;
        this.accessToken = window.localStorage.accessToken;
        this.guest = window.localStorage.guest;
        this.serverName = window.localStorage.serverName;
    }

    saveAuthState() {
        window.localStorage.serverUrl = this.serverUrl;
        window.localStorage.userId = this.userId;
        window.localStorage.accessToken = this.accessToken;
        window.guest = this.guest;
        window.localStorage.serverName = this.serverName;
    }

    loginAsGuest(serverUrl) {
        fetch(`${serverUrl}/r0/register`, {
            method: 'POST',
            body: JSON.stringify({ kind: "guest" }),
        }).then(
            response => response.json()
        ).then(data => {
            this.serverUrl = serverUrl;
            this.userId = data.user_id;
            this.accessToken = data.access_token;
            this.guest = true;
            this.serverName = data.home_server;
            this.saveAuthState();
        });
    }

    login(serverUrl, username, password) {

    }

    sendMessage(roomAlias, content) {
        // XXX: only join if we're not already
        const roomId = this.joinRoom(roomAlias);
        const txnId = Date.now();
        let eventId;

        fetch(`${serverUrl}/r0/room/${roomId}/send/m.room.message/${txnId}`, {
            method: 'POST',
            body: JSON.stringify(content),
        }).then(
            response => response.json()
        ).then(data => {
            eventId = data.event_id;
        });
    }

    getMsgs(userId, withReplies, eventId) {
        if (!this.accessToken) {
            console.error("No access token");
            return;
        }

        const roomId = this.peekRoom(`#${userId}`);

        let msgs = [];
        if (eventId) {
            fetch(`${serverUrl}/r0/rooms/${roomId}/context/${eventId}`, {
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

            fetch(`${serverUrl}/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`, {
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

        fetch(`${serverUrl}/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`, {
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
        let roomId;

        /*
        // Once MSC2753 is available, to allow federated peeking
        fetch(`${serverUrl}/r0/peek/${roomAlias}`, {
            method: 'POST',
            body: '{}',
            headers: { Authorization: `Bearer: ${this.accessToken}` },
        }).then(
            response => response.json()
        ).then(data => {
            roomId = data.room_id;
        });
        */

        fetch(`${serverUrl}/r0/directory/room/${roomAlias}`, {
        }).then(
            response => response.json()
        ).then(data => {
            roomId = data.room_id;
        });

        return roomId;
    }

    joinRoom(roomAlias) {
        let roomId;

        fetch(`${serverUrl}/r0/join/${roomAlias}`, {
            method: 'POST',
            body: '{}',
            headers: { Authorization: `Bearer: ${this.accessToken}` },
        }).then(
            response => response.json()
        ).then(data => {
            roomId = data.room_id;
        });

        return roomId;
    }
}
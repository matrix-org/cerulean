class Client {
    // we deliberately don't use js-sdk as we want flexibility on
    // how we model the data (i.e. not as normal rooms + timelines
    // given everything is threaded)

    constructor(storage) {
        this.joinedRooms = new Map(); // room alias -> room ID
        if (!storage) {
            return;
        }
        this.storage = storage;
        this.serverUrl = storage.getItem("serverUrl");
        this.userId = storage.getItem("userId");
        this.accessToken = storage.getItem("accessToken");
        this.guest = storage.getItem("guest");
        this.serverName = storage.getItem("serverName");
    }

    saveAuthState() {
        if (!this.storage) {
            return;
        }
        this.storage.setItem("serverUrl", this.serverUrl);
        this.storage.setItem("userId", this.userId);
        this.storage.setItem("accessToken", this.accessToken);
        this.storage.setItem("serverName", this.serverName);
        this.storage.setItem("guest", this.guest);
    }

    async loginAsGuest(serverUrl, saveToStorage) {
        const data = await this.fetchJson(
            `${serverUrl}/r0/register?kind=guest`,
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );
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
            method: "POST",
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
        const data = await this.fetchJson(
            `${this.serverUrl}/r0/rooms/${encodeURIComponent(
                roomId
            )}/send/m.room.message/${encodeURIComponent(txnId)}`,
            {
                method: "PUT",
                body: JSON.stringify(content),
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        return data.event_id;
    }

    /**
     * Post to several user's timelines.
     * @param {string[]} users a list of user IDs to post on their timeline
     * @param {*} content the message to post
     */
    async postToUsers(users, content) {
        // @foo:bar => #@foo:bar
        const promises = users.map((userId) => {
            return this.sendMessage("#" + userId, content);
        });
        await Promise.all(promises);
    }

    getMsgs(userId, withReplies, eventId) {
        return [
            {
                foo: "bar",
            },
            {
                baz: "quuz",
            },
        ];
        if (!this.accessToken) {
            console.error("No access token");
            return;
        }

        const roomId = this.peekRoom(`#${userId}`);

        let msgs = [];
        if (eventId) {
            fetch(`${this.serverUrl}/r0/rooms/${roomId}/context/${eventId}`, {
                headers: { Authorization: `Bearer: ${this.accessToken}` },
            })
                .then((response) => response.json())
                .then((data) => {
                    msgs.push(data.event);
                });
        } else {
            const filter = {
                user_id: userId, // we just want this user's messages
            };
            // only grab unlabelled messages if we don't want the user's replies.
            if (!withReplies) filter["m.label"] = "";

            fetch(
                `${
                    this.serverUrl
                }/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`,
                {
                    headers: { Authorization: `Bearer: ${this.accessToken}` },
                }
            )
                .then((response) => response.json())
                .then((data) => {
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
            "m.label": threadId,
        };

        fetch(
            `${
                this.serverUrl
            }/r0/rooms/${roomId}/messages?filter=${JSON.stringify(filter)}`,
            {
                headers: { Authorization: `Bearer: ${this.accessToken}` },
            }
        )
            .then((response) => response.json())
            .then((data) => {
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

    /**
     * Join a room by alias. If already joined, no-ops. If joining our own timeline room,
     * attempts to create it.
     * @param {string} roomAlias The room alias to join
     * @returns {string} The room ID of the joined room.
     */
    async joinRoom(roomAlias) {
        const roomId = this.joinedRooms.get(roomAlias);
        if (roomId) {
            return roomId;
        }
        const isMyself = roomAlias.substr(1) === this.userId;

        try {
            let data = await this.fetchJson(
                `${this.serverUrl}/r0/join/${encodeURIComponent(roomAlias)}`,
                {
                    method: "POST",
                    body: "{}",
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                }
            );
            this.joinedRooms.set(roomAlias, data.room_id);
            return data.room_id;
        } catch (err) {
            // try to make our timeline room
            if (isMyself) {
                let data = await this.fetchJson(
                    `${this.serverUrl}/r0/createRoom`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            preset: "public_chat",
                            name: `${this.userId}'s timeline`,
                            topic: "Cerulean",
                            room_alias_name: "@" + localpart(this.userId),
                        }),
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                        },
                    }
                );
                this.joinedRooms.set(roomAlias, data.room_id);
                return data.room_id;
            } else {
                throw err;
            }
        }
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

// maps '@foo:localhost' to 'foo'
function localpart(userId) {
    return userId.split(":")[0].substr(1);
}

export default Client;

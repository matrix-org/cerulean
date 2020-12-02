// Client contains functions for making Matrix Client-Server API requests
// https://matrix.org/docs/spec/client_server/r0.6.0
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
        setOrDelete(this.storage, "serverUrl", this.serverUrl);
        setOrDelete(this.storage, "userId", this.userId);
        setOrDelete(this.storage, "accessToken", this.accessToken);
        setOrDelete(this.storage, "serverName", this.serverName);
        setOrDelete(this.storage, "guest", this.guest);
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

    async getRelationships(eventId, maxBreadth, maxDepth) {
        const body = {
            event_id: eventId,
            max_depth: maxDepth || 6,
            max_breadth: maxBreadth || 5,
            limit: 50,
            depth_first: false,
            recent_first: true,
            include_parent: true,
            include_children: true,
            direction: "down",
        };

        const data = await this.fetchJson(
            `${this.serverUrl}/unstable/event_relationships`,
            {
                method: "POST",
                body: JSON.stringify(body),
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        return data.events;
    }

    /**
     * Post a message.
     * @param {*} content the message to post
     */
    async post(content) {
        const eventId = await this.sendMessage("#" + this.userId, content);
        return eventId;
    }

    /**
     * Follow a user by subscribing to their room.
     * @param {string} userId
     */
    followUser(userId) {
        return this.joinRoom("#" + userId);
    }

    async logout() {
        try {
            await this.fetchJson(`${this.serverUrl}/r0/logout`, {
                method: "POST",
                body: "{}",
                headers: { Authorization: `Bearer ${this.accessToken}` },
            });
        } finally {
            console.log("Removing login credentials");
            this.serverUrl = undefined;
            this.userId = undefined;
            this.accessToken = undefined;
            this.guest = undefined;
            this.serverName = undefined;
            this.saveAuthState();
        }
    }

    // getAggregatedTimeline returns all events from all timeline rooms being followed.
    // This is done by calling `/sync` and keeping messages for all rooms that have an #@ alias.
    async getAggregatedTimeline() {
        if (!this.accessToken) {
            console.error("No access token");
            return [];
        }
        const filterJson = JSON.stringify({
            room: {
                timeline: {
                    limit: 20,
                },
            },
        });
        let syncData = await this.fetchJson(
            `${this.serverUrl}/r0/sync?filter=${filterJson}`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        // filter only @# rooms then add in all timeline events
        const roomIds = Object.keys(syncData.rooms.join).filter((roomId) => {
            // try to find an #@ alias
            let foundAlias = false;
            for (let ev of syncData.rooms.join[roomId].state.events) {
                if (ev.type === "m.room.aliases" && ev.content.aliases) {
                    for (let alias of ev.content.aliases) {
                        if (alias.startsWith("#@")) {
                            foundAlias = true;
                            break;
                        }
                    }
                }
                if (foundAlias) {
                    break;
                }
            }
            return foundAlias;
        });
        let events = [];
        for (let roomId of roomIds) {
            for (let ev of syncData.rooms.join[roomId].timeline.events) {
                events.push(ev);
            }
        }
        // sort by origin_server_ts
        return events.sort((a, b) => {
            if (a.origin_server_ts === b.origin_server_ts) {
                return 0;
            }
            if (a.origin_server_ts < b.origin_server_ts) {
                return 1;
            }
            return -1;
        });
    }

    async getTimeline(roomId) {
        if (!this.accessToken) {
            console.error("No access token");
            return [];
        }

        // get a pagination token
        const filterJson = JSON.stringify({
            room: {
                timeline: {
                    limit: 1,
                },
            },
        });
        let syncData = await this.fetchJson(
            `${this.serverUrl}/r0/sync?filter=${filterJson}`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        let room = syncData.rooms.join[roomId];
        if (!room) {
            console.error("not joined to room " + roomId);
            return [];
        }
        let from = room.timeline.prev_batch;
        let recentMsg = room.timeline.events[0];

        let data = await this.fetchJson(
            `${this.serverUrl}/r0/rooms/${roomId}/messages?from=${from}&dir=b`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        data.chunk.unshift(recentMsg);
        return data.chunk;
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

function setOrDelete(storage, key, value) {
    if (value) {
        storage.setItem(key, value);
    } else {
        storage.removeItem(key, value);
    }
}

export default Client;

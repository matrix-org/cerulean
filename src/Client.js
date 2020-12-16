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
        this.isGuest = (this.userId || "").indexOf("@cerulean_guest_") === 0;
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
    }

    async registerAsGuest(serverUrl) {
        function generateToken(len) {
            var arr = new Uint8Array(len / 2);
            window.crypto.getRandomValues(arr);
            return Array.from(arr, (num) => {
                return num.toString(16).padStart(2, "0");
            }).join("");
        }
        let username = "cerulean_guest_" + Date.now();
        let password = generateToken(32);

        const data = await this.fetchJson(`${serverUrl}/r0/register`, {
            method: "POST",
            body: JSON.stringify({
                auth: {
                    type: "m.login.dummy",
                },
                username: username,
                password: password,
            }),
        });
        this.serverUrl = serverUrl;
        this.userId = data.user_id;
        this.accessToken = data.access_token;
        this.serverName = data.home_server;
        this.isGuest = true;
        this.saveAuthState();
        console.log("Registered as guest ", username);

        /*
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
        } */
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
        this.isGuest = false;
        this.serverName = data.home_server;
        if (saveToStorage) {
            this.saveAuthState();
        }
    }

    async register(serverUrl, username, password) {
        const data = await this.fetchJson(`${serverUrl}/r0/register`, {
            method: "POST",
            body: JSON.stringify({
                auth: {
                    type: "m.login.dummy",
                },
                username: username,
                password: password,
            }),
        });
        this.serverUrl = serverUrl;
        this.userId = data.user_id;
        this.accessToken = data.access_token;
        this.isGuest = false;
        this.serverName = data.home_server;
        this.saveAuthState();
    }

    async sendMessage(roomId, content) {
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

    async getRelationships(eventId, roomId, maxBreadth, maxDepth) {
        const body = {
            event_id: eventId,
            room_id: roomId,
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
    async postToMyTimeline(content) {
        const roomId = await this.joinTimelineRoom("#" + this.userId);
        const eventId = await this.sendMessage(roomId, content);
        return eventId;
    }

    /**
     * Follow a user by subscribing to their room.
     * @param {string} userId
     */
    followUser(userId) {
        return this.joinTimelineRoom("#" + userId);
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
            this.isGuest = undefined;
            this.serverName = undefined;
            this.saveAuthState();
        }
    }

    // getAggregatedTimeline returns all events from all timeline rooms being followed.
    // This is done by calling `/sync` and keeping messages for all rooms that have an #@ alias.
    async getAggregatedTimeline() {
        let info = {
            timeline: [],
            from: null,
        };
        if (!this.accessToken) {
            console.error("No access token");
            return info;
        }
        const filterJson = JSON.stringify({
            room: {
                timeline: {
                    limit: 100,
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
                ev.room_id = roomId;
                events.push(ev);
            }
        }
        // sort by origin_server_ts
        info.timeline = events.sort((a, b) => {
            if (a.origin_server_ts === b.origin_server_ts) {
                return 0;
            }
            if (a.origin_server_ts < b.origin_server_ts) {
                return 1;
            }
            return -1;
        });
        info.from = syncData.next_batch;
        return info;
    }

    async getTimeline(roomId) {
        if (!this.accessToken) {
            console.error("No access token");
            return [];
        }

        let data = await this.fetchJson(
            `${this.serverUrl}/r0/rooms/${roomId}/messages?dir=b&limit=100`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        return data.chunk.map((ev) => {
            ev.room_id = roomId;
            return ev;
        });
    }

    async waitForMessageEventInRoom(roomIds, from) {
        if (this.isGuest) {
            // don't live poll for guests
            await sleep(24 * 60 * 60 * 1000);
            return from;
        }
        console.log("waitForMessageEventInRoom", roomIds);

        const filterJson = JSON.stringify({
            room: {
                timeline: {
                    limit: 5,
                },
            },
        });
        if (!from) {
            if (roomIds && roomIds.length > 0) {
                // use /messages to snaffle an event rather than /sync which is slow
                let data = await this.fetchJson(
                    `${this.serverUrl}/r0/rooms/${roomIds[0]}/messages?dir=b&limit=1`,
                    {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                        },
                    }
                );
                from = data.start_stream; // NOTSPEC
            }
            if (!from) {
                // fallback to slow /sync
                let syncData = await this.fetchJson(
                    `${this.serverUrl}/r0/sync?filter=${filterJson}`,
                    {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                        },
                    }
                );
                from = syncData.next_batch;
            }
        }
        while (true) {
            try {
                let syncData = await this.fetchJson(
                    `${this.serverUrl}/r0/sync?filter=${filterJson}&since=${from}&timeout=20000`,
                    {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                        },
                    }
                );
                from = syncData.next_batch;
                for (let i = 0; i < roomIds.length; i++) {
                    const roomId = roomIds[i];
                    let room = syncData.rooms.join[roomId];
                    if (!room || !room.timeline || !room.timeline.events) {
                        continue;
                    }
                    for (let i = 0; i < room.timeline.events.length; i++) {
                        let ev = room.timeline.events[i];
                        if (ev.type === "m.room.message") {
                            return from;
                        }
                    }
                }
            } catch (err) {
                console.warn(
                    "waitForMessageEventInRoom: request failed, waiting then retrying: ",
                    err
                );
                await sleep(10 * 1000); // wait before retrying
            }
        }
    }

    peekRoom(roomAlias) {
        // For now join the room instead.
        // Once MSC2753 is available, to allow federated peeking
        return this.joinTimelineRoom(roomAlias);
    }

    async joinRoomById(roomID, serverName) {
        const cachedRoomId = this.joinedRooms.get(roomID);
        if (cachedRoomId) {
            return cachedRoomId;
        }
        let data = await this.fetchJson(
            `${this.serverUrl}/r0/join/${encodeURIComponent(
                roomID
            )}?server_name=${encodeURIComponent(serverName)}`,
            {
                method: "POST",
                body: "{}",
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        this.joinedRooms.set(roomID, data.room_id);
        return data.room_id;
    }

    async postNewThread(text, dataUri) {
        // create a new room
        let data = await this.fetchJson(`${this.serverUrl}/r0/createRoom`, {
            method: "POST",
            body: JSON.stringify({
                preset: "public_chat",
                name: `${this.userId}'s thread`,
                topic: "Cerulean",
            }),
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });
        text = text || "";
        let content = {
            msgtype: "m.text",
            body: text,
        };
        if (dataUri) {
            content = {
                msgtype: "m.image",
                body: text,
                url: dataUri,
            };
        }
        // post the message into this new room
        const eventId = await this.sendMessage(data.room_id, content);

        // add metadata for linking to thread room
        content["org.matrix.cerulean.room_id"] = data.room_id;
        content["org.matrix.cerulean.event_id"] = eventId;
        content["org.matrix.cerulean.root"] = true;

        // post a copy into our timeline
        await this.postToMyTimeline(content);
    }

    // replyToEvent replies to the given event by sending 2 events: one into the timeline room of the logged in user
    // and one into the thread room for this event.
    async replyToEvent(text, event, isTimelineEvent, dataUri) {
        let eventIdReplyingTo;
        let roomIdReplyingIn;
        if (isTimelineEvent) {
            eventIdReplyingTo = event.content["org.matrix.cerulean.event_id"];
            roomIdReplyingIn = event.content["org.matrix.cerulean.room_id"];
        } else {
            eventIdReplyingTo = event.event_id;
            roomIdReplyingIn = event.room_id;
        }
        if (!eventIdReplyingTo || !roomIdReplyingIn) {
            console.error(
                "cannot reply to event, unknown event ID for parent:",
                event
            );
            return;
        }
        // ensure we're joined to the room
        // extract server name from sender who we know must be in the thread room:
        // @alice:domain.com -> [@alice, domain.com] -> [domain.com] -> domain.com
        // @bob:foobar.com:8448 -> [@bob, foobar.com, 8448] -> [foobar.com, 8448] -> foobar.com:8448
        let domain = event.sender.split(":").splice(1).join(":");
        await this.joinRoomById(roomIdReplyingIn, domain);

        // TODO: should we be checking that the two events `event` and `eventIdReplyingTo` match content-wise?

        // we're uploading an image and some text
        if (dataUri) {
            const eventId = await this.sendMessage(roomIdReplyingIn, {
                body: text,
                msgtype: "m.image",
                url: dataUri,
                "m.relationship": {
                    rel_type: "m.reference",
                    event_id: eventIdReplyingTo,
                },
            });

            // send another message into our timeline room
            await this.postToMyTimeline({
                msgtype: "m.image",
                body: text,
                url: dataUri,
                "org.matrix.cerulean.event_id": eventId,
                "org.matrix.cerulean.room_id": roomIdReplyingIn,
            });

            return eventId;
        }

        // text only upload
        const eventId = await this.sendMessage(roomIdReplyingIn, {
            body: text,
            msgtype: "m.text",
            "m.relationship": {
                rel_type: "m.reference",
                event_id: eventIdReplyingTo,
            },
        });

        // send another message into our timeline room
        await this.postToMyTimeline({
            msgtype: "m.text",
            body: text,
            "org.matrix.cerulean.event_id": eventId,
            "org.matrix.cerulean.room_id": roomIdReplyingIn,
        });

        return eventId;
    }

    /**
     * Join a reputation room
     * @param {string} roomAlias The alias to join e.g #cat-lovers:matrix.org
     */
    joinReputationRoom(roomAlias) {
        // just join the room alias and cache it.
        return this.joinTimelineRoom(roomAlias);
    }

    /**
     * Get reputation state events from the given room ID.
     * @param {string} roomId
     */
    async getReputationState(roomId) {
        let roomData = await this.fetchJson(
            `${this.serverUrl}/r0/rooms/${encodeURIComponent(roomId)}/state`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            }
        );
        // Keep only reputation events
        return roomData.filter((ev) => {
            return ev.type === "org.matrix.fama.rule.basic" && ev.state_key;
        });
    }

    /**
     * Join a room by alias. If already joined, no-ops. If joining our own timeline room,
     * attempts to create it.
     * @param {string} roomAlias The room alias to join
     * @returns {string} The room ID of the joined room.
     */
    async joinTimelineRoom(roomAlias) {
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

    async uploadFile(file) {
        const fileName = file.name;
        const mediaUrl = this.serverUrl.slice(0, -1 * "/client".length);
        const res = await fetch(
            `${mediaUrl}/media/r0/upload?filename=${encodeURIComponent(
                fileName
            )}`,
            {
                method: "POST",
                body: file,
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            }
        );
        const data = await res.json();
        if (!res.ok) {
            throw data;
        }
        return data.content_uri;
    }

    downloadLink(mxcUri) {
        if (!mxcUri) {
            return;
        }
        if (mxcUri.indexOf("mxc://") !== 0) {
            return;
        }
        const mediaUrl = this.serverUrl.slice(0, -1 * "/client".length);
        return mediaUrl + "/media/r0/download/" + mxcUri.split("mxc://")[1];
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default Client;

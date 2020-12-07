class ReputationList {
    /*
     Construct a reputation list.
     @param tag {string} A human-readable identifier for this list, e.g a room alias.
     */
    constructor(tag) {
        this.tag = tag;
        // shared map of entity -> score. No namespacing as the entities are namespaced already e.g
        // users   -> @foo
        // rooms   -> !bar
        // servers -> baz
        this.rules = new Map();
    }

    /**
     * Load a reputation list from an alias.
     * @param {Client} client The matrix client to make CS API calls from.
     * @param {string} alias The alias which points to a room which has reputation room state.
     * @returns {ReputationList}
     */
    static async loadFromAlias(client, alias) {
        const roomId = await client.joinReputationRoom(alias);
        const events = await client.getReputationState(roomId);
        const list = new ReputationList(alias);
        events.forEach((ev) => {
            // map state_key: "user:@alice.matrix.org" to "@alice:matrix.org"
            if (ev.state_key.indexOf("user:") === 0) {
                list.addRule(
                    ev.state_key.slice("user:".length),
                    ev.content.reputation,
                    ev.content.reason
                );
            } else if (ev.state_key.indexOf("room:") === 0) {
                list.addRule(
                    ev.state_key.slice("room:".length),
                    ev.content.reputation,
                    ev.content.reason
                );
            } else if (ev.state_key.indexOf("server:") === 0) {
                list.addRule(
                    ev.state_key.slice("server:".length),
                    ev.content.reputation,
                    ev.content.reason
                );
            } else {
                console.warn("reputation rule has unknown state_key: ", ev);
            }
        });
        return list;
    }

    /**
     * Add a reputation rule.
     * @param {string} entity The entity involved, either a room ID, user ID or server domain.
     * @param {number} reputation The reputation value, a number between -100 and +100.
     * @param {string?} reason The reason for this reputation, optional.
     */
    addRule(entity, reputation, reason) {
        if (reputation < -100 || reputation > 100) {
            console.error(
                "addRule: invalid reputation value:",
                reputation,
                entity
            );
            return;
        }
        let rep = this.rules.get(entity);
        if (!rep) {
            rep = 0;
        }
        rep += reputation;
        this.rules.set(entity, rep);
    }

    /**
     * Return the reputation score for this event for this list. This is the sum of the user|room|server reputations.
     * @param {object} event The event to test.
     * @returns {number} Returns the score of this event.
     */
    getReputationScore(event) {
        // check room
        let roomRep = this.rules.get(event.room_id);
        if (!roomRep) {
            roomRep = 0;
        }

        // check user
        let userRep = this.rules.get(event.sender);
        if (!userRep) {
            userRep = 0;
        }

        // extract server name from user:
        // @alice:domain.com -> [@alice, domain.com] -> [domain.com] -> domain.com
        // @bob:foobar.com:8448 -> [@bob, foobar.com, 8448] -> [foobar.com, 8448] -> foobar.com:8448
        let domain = event.sender.split(":").splice(1).join(":");

        let serverRep = this.rules.get(domain);
        if (!serverRep) {
            serverRep = 0;
        }

        return userRep + serverRep + roomRep;
    }
}

export default ReputationList;

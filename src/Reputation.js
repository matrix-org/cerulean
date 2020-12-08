import ReputationList from "./ReputationList";

class Reputation {
    constructor() {
        // map of list tag -> filter weightings between -1 and +1.
        this.listWeightings = new Map();
        // map of list tag -> ReputationList
        this.lists = new Map();
    }

    async loadWeights(localStorage, client) {
        let ser = localStorage.getItem("weights") || "{}";
        let weights = JSON.parse(ser);
        for (const tag in weights) {
            try {
                let list = await ReputationList.loadFromAlias(client, tag);
                this.listWeightings.set(tag, weights[tag]);
                this.lists.set(tag, list);
            } catch (err) {
                console.error("failed to load weights for list", tag, err);
            }
        }
        console.log("Finished loading weightings:", weights);
    }

    saveWeights(localStorage) {
        let ser = {};
        for (let [tag] of this.lists) {
            ser[tag] = this.listWeightings.get(tag) || 0;
        }
        localStorage.setItem("weights", JSON.stringify(ser));
    }

    deleteList(tag) {
        this.lists.delete(tag);
        this.listWeightings.delete(tag);
    }

    /**
     * Modify the weight of a list.
     * @param {string} tag The tag for the list
     * @param {number} weight The weighting for this list. Between -100 and +100.
     */
    modifyWeight(tag, weight) {
        this.listWeightings.set(tag, weight);
    }

    /**
     * Return a list of { name: $tag, weight: number }
     */
    getWeightings() {
        let weights = [];
        for (let [tag] of this.lists) {
            weights.push({
                name: tag,
                weight: this.listWeightings.get(tag) || 0,
            });
        }
        return weights;
    }

    /**
     * Add a reputation list. The weighting should be 100 to fully match on it, 0 to ignore the list and -100
     * to do the opposite of the list.
     * @param {ReputationList} list
     * @param {number} weighting The weighting for this list. Between -100 and +100.
     */
    addList(list, weighting) {
        // store weight between -1 and +1 as they are %s.
        this.listWeightings.set(list.tag, weighting / 100);
        this.lists.set(list.tag, list);
    }

    /**
     * Check if an event is filtered by the reputation lists. A negative value indicates it should be filtered.
     * @param {object} event The event to check.
     * @returns {number} The score for this event, unbounded.
     */
    getScore(event) {
        let sum = 0;
        for (let [tag, list] of this.lists) {
            let weight = this.listWeightings.get(tag);
            if (!weight) {
                weight = 0;
            }
            let score = list.getReputationScore(event);
            sum += score * weight;
        }
        return sum;
    }
}

export default Reputation;

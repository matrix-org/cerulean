import React from "react";
import "./StatusPage.css";
import Message from "./Message";

const maxBreath = 5;
const maxDepth = 10;

class StatusPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            parent: null,
            parentOfParent: null,
            parentToChildren: new Map(),
            eventMap: new Map(),
            children: [],
            error: null,
        };
    }

    async componentDidMount() {
        await this.refresh();
    }

    async refresh() {
        // fetch the event we're supposed to display, along with a bunch of other events which are the replies
        // and the replies to those replies. We go up to 6 wide and 6 deep, and stop showing >5 items (instead having)
        // a 'see more'.
        const events = await this.props.client.getRelationships(
            this.props.eventId,
            maxBreath + 1,
            maxDepth + 1
        );
        // store in a map for easy references and to find the parent
        let eventMap = new Map();
        let parentToChildren = new Map();
        for (let ev of events) {
            eventMap.set(ev.event_id, ev);
        }
        const parent = eventMap.get(this.props.eventId);
        if (!parent) {
            // this could be a bogus event, bail
            this.setState({
                error: "Unknown event",
            });
            return;
        }
        // find all events which have a relationship and store the reverse mapping
        for (let ev of events) {
            if (
                ev.content["m.relationship"] &&
                ev.content["m.relationship"].rel_type === "m.reference"
            ) {
                const parentId = ev.content["m.relationship"].event_id;
                let existing = parentToChildren.get(parentId);
                if (!existing) {
                    existing = [];
                }
                existing.push(ev);
                parentToChildren.set(parentId, existing);
            }
        }

        // if the parent has a parent include it so you can go up the tree
        let parentOfParent;
        if (
            parent.content["m.relationship"] &&
            parent.content["m.relationship"].rel_type === "m.reference"
        ) {
            parentOfParent = eventMap.get(
                parent.content["m.relationship"].event_id
            );
        }

        this.setState({
            parent: parent,
            children: parentToChildren.get(parent.event_id) || [],
            parentToChildren: parentToChildren,
            parentOfParent: parentOfParent,
            eventMap: eventMap,
        });
    }

    renderChild(ev) {
        // walk the graph depth first, we want to convert graphs like:
        //   A
        //  / \
        // B   C
        //     |
        //     D
        //     |
        //     E
        // into:
        // [ Message A ]
        //  | [ Message B ]
        //  | [ Message C ]
        //    | [ Message D ]
        //      | [ Message E ]
        const maxItems = 200;
        // which item to render next, we store the event ID and the depth so we
        // know how much to indent by
        const toProcess = [
            {
                eventId: ev.event_id,
                depth: 0,
            },
        ];
        const rendered = [];
        while (toProcess.length > 0 && rendered.length < maxItems) {
            const procInfo = toProcess.pop();
            const eventId = procInfo.eventId;
            const depth = procInfo.depth;
            const style = {
                marginLeft: 20 * (1 + depth) + "px",
            };
            const event = this.state.eventMap.get(eventId);
            if (!event) {
                continue;
            }
            if (procInfo.seeMore) {
                rendered.push(
                    <div className="child" style={style} key={event.event_id}>
                        <a href={`/${event.sender}/status/${event.event_id}`}>
                            See more...
                        </a>
                    </div>
                );
                continue;
            }
            // this array is in the order from POST /event_relationships which is
            // recent first
            const children = this.state.parentToChildren.get(eventId);
            if (children) {
                if (children.length > maxBreath) {
                    // only show the first 5 then add a 'see more' link which permalinks you
                    // to the parent which has so many children (we only display all children
                    // on the permalink for the parent). We inject this first as it's a LIFO stack
                    toProcess.push({
                        eventId: eventId,
                        depth: depth + 1,
                        seeMore: true,
                    });
                }
                for (let i = 0; i < children.length && i < maxBreath; i++) {
                    toProcess.push({
                        eventId: children[i].event_id,
                        depth: depth + 1,
                    });
                }
            }
            rendered.push(
                <div className="child" style={style} key={event.event_id}>
                    <Message event={event} onPost={this.onPost.bind(this)} />
                </div>
            );
        }
        return <div key={ev.event_id}>{rendered}</div>;
    }

    onPost(parent, eventId) {
        this.refresh();
        //window.location.href = `/${this.props.client.userId}/status/${parent}`;
    }

    render() {
        let backButton;
        let parent;
        if (this.state.parentOfParent) {
            const link = `/${this.state.parentOfParent.sender}/status/${this.state.parentOfParent.event_id}`;
            backButton = (
                <a href={link}>
                    <img className="BackButton" src="/chevron.svg" alt="back" />
                </a>
            );
            parent = (
                <Message
                    event={this.state.parentOfParent}
                    onPost={this.onPost.bind(this)}
                />
            );
        }
        // display the main event this hyperlink refers to then load ALL level 1 children beneath
        return (
            <div className="StatusPageWrapper">
                {backButton}
                <div className="StatusPage">
                    {parent}
                    <div className="StatusMessage">
                        <Message
                            event={this.state.parent}
                            onPost={this.onPost.bind(this)}
                            noLink={true}
                        />
                    </div>
                    {this.state.children.map((ev) => {
                        return this.renderChild(ev);
                    })}
                </div>
            </div>
        );
    }
}

export default StatusPage;

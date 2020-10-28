import React from "react";
import "./StatusPage.css";
import Message from "./Message";

class StatusPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            parent: null,
            parentToChildren: new Map(),
            eventMap: new Map(),
            children: [],
            error: null,
        };
    }

    async componentDidMount() {
        // fetch the event we're supposed to display, along with a bunch of other events which are the replies
        // and the replies to those replies.
        const events = await this.props.client.getRelationships(
            this.props.eventId
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

        // second sweep, find lv2 children
        this.setState({
            parent: parent,
            children: parentToChildren.get(parent.event_id),
            parentToChildren: parentToChildren,
            eventMap: eventMap,
        });
    }

    renderChild(ev) {
        // walk the graph depth first, so conversation threads begin to form.
        // if we have more than 1 child (grandchild to the main event) we'll arbitrarily
        // pick one to go down. In the future we could go for the longest chain (more convo)
        // or the most recent or something.
        const maxItems = 20;
        const toProcess = [ev.event_id];
        let isFirst = true;
        const rendered = [];
        while (toProcess.length > 0 && rendered.length < maxItems) {
            const eventId = toProcess.pop();
            const event = this.state.eventMap.get(eventId);
            if (!event) {
                continue;
            }
            const children = this.state.parentToChildren.get(eventId);
            if (children) {
                // arbitratily pick one
                toProcess.push(children[0].event_id);
            }
            if (isFirst) {
                rendered.push(
                    <div class="firstChild">
                        {event.sender} says: {JSON.stringify(event.content)}
                    </div>
                );
                isFirst = false;
            } else {
                rendered.push(
                    <div class="child">
                        {event.sender} replied: {JSON.stringify(event.content)}
                    </div>
                );
            }
        }
        return <div class="replyBlock">{rendered}</div>;
    }

    render() {
        // display the main event this hyperlink refers to then load level 1 children beneath
        return (
            <div class="StatusPage">
                {this.props.userId}'s Status Page for event {this.props.eventId}
                <Message event={this.state.parent} />
                <br />
                {this.state.children.map((ev) => {
                    return this.renderChild(ev);
                })}
            </div>
        );
    }
}

export default StatusPage;

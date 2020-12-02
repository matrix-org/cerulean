import React from "react";
import "./StatusPage.css";
import Message from "./Message";

const maxBreadth = 5;
const maxDepth = 10;

// StatusPage renders a thread of conversation based on a single anchor event.
// Props:
//  - eventId: The anchor event. The parent of this event and a tree of children will be obtained from this point.
//  - client: Client
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
            horizontalThreading: false,
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
            maxBreadth + 1,
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
            // we want older messages on top (rendered first) so we need to flip the array at is recent_first
            children: (parentToChildren.get(parent.event_id) || []).reverse(),
            parentToChildren: parentToChildren,
            parentOfParent: parentOfParent,
            eventMap: eventMap,
        });
    }

    renderHorizontalChild(ev) {
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
                    <div className="child" style={style} key="seeMore">
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
                if (children.length > maxBreadth) {
                    // only show the first 5 then add a 'see more' link which permalinks you
                    // to the parent which has so many children (we only display all children
                    // on the permalink for the parent). We inject this first as it's a LIFO stack
                    toProcess.push({
                        eventId: eventId,
                        depth: depth + 1,
                        seeMore: true,
                    });
                }
                for (let i = 0; i < children.length && i < maxBreadth; i++) {
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

    renderVerticalChild(ev, sibling, numSiblings) {
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
        //  |-[ Message B ]
        //  |-[ Message C ]
        //    [ Message D ]
        //    [ Message E ]
        // Indentation and thread lines occur on events which have siblings.
        const maxItems = 200;
        // which item to render next, we store the event ID and the siblingNum so we
        // know how much to indent by
        const toProcess = [
            {
                eventId: ev.event_id,
                siblingDepth: 0, // how many parents have siblings up to the root node
                numSiblings: numSiblings, // total number of sibling this node has (incl. itself)
                sibling: sibling, // the 0-based index of this sibling
                depthsOfParentsWhoHaveMoreSiblings: [],
            },
        ];
        const rendered = [];
        while (toProcess.length > 0 && rendered.length < maxItems) {
            const procInfo = toProcess.pop();
            const eventId = procInfo.eventId;
            const siblingDepth = procInfo.siblingDepth;
            const numSiblings = procInfo.numSiblings;
            const sibling = procInfo.sibling;
            const isLastSibling = sibling === 0;
            const depthsOfParentsWhoHaveMoreSiblings =
                procInfo.depthsOfParentsWhoHaveMoreSiblings;
            const style = {
                marginLeft: 20 * (1 + siblingDepth) + "px",
            };
            // continue the thread line down to the next sibling,
            const msgStyle = {
                borderLeft: !isLastSibling ? "1px solid #8D99A5" : undefined,
            };
            const event = this.state.eventMap.get(eventId);
            if (!event) {
                continue;
            }

            let parentThreadLines = [];
            for (let i = 0; i <= siblingDepth; i++) {
                let cn = "blankThreadLine";
                if (depthsOfParentsWhoHaveMoreSiblings.indexOf(i) !== -1) {
                    // add a thread line
                    cn = "threadLine";
                }
                parentThreadLines.push(<div className={cn} key={"" + i}></div>);
            }
            let threadLines = (
                <div className="threadLineHolder">{parentThreadLines}</div>
            );
            console.log(event.content.body + " ", procInfo);
            if (procInfo.seeMore) {
                rendered.push(
                    <div className="verticalChild" style={style} key="seeMore">
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
                // Copy depthsOfParentsWhoHaveMoreSiblings and add in this depth if we have more
                // siblings to render; this determines whether to draw outer thread lines
                const newDepthsOfParents = isLastSibling
                    ? [...depthsOfParentsWhoHaveMoreSiblings]
                    : [siblingDepth, ...depthsOfParentsWhoHaveMoreSiblings];
                const newSiblingDepth =
                    siblingDepth + (children.length > 1 ? 1 : 0);
                if (children.length > maxBreadth) {
                    // only show the first 5 then add a 'see more' link which permalinks you
                    // to the parent which has so many children (we only display all children
                    // on the permalink for the parent). We inject this first as it's a LIFO stack
                    toProcess.push({
                        eventId: eventId,
                        siblingDepth: newSiblingDepth,
                        seeMore: true,
                        numSiblings: children.length,
                        sibling: maxBreadth,
                        depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                    });
                }
                for (let i = 0; i < children.length && i < maxBreadth; i++) {
                    toProcess.push({
                        eventId: children[i].event_id,
                        siblingDepth: newSiblingDepth,
                        numSiblings: children.length,
                        sibling: i,
                        parentIsLastSibling: isLastSibling,
                        depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                    });
                }
            }

            // if there's multiple siblings then they all get corners to fork off from the parent
            // if there's only 1 sibling then we just put the reply directly beneath without a corner
            let threadCorner;
            if (numSiblings > 1) {
                let threadCornerType = "/thread-line.svg";
                let threadCornerClass = "threadFork";
                if (isLastSibling) {
                    threadCornerType = "/thread-corner.svg";
                    threadCornerClass = "threadCorner";
                }
                threadCorner = (
                    <img
                        src={threadCornerType}
                        alt="line"
                        className={threadCornerClass}
                    />
                );
            }

            rendered.push(
                <div className="verticalChild" key={event.event_id}>
                    {threadLines}
                    <div style={msgStyle} className="messageHolder">
                        {threadCorner}
                        <Message
                            event={event}
                            onPost={this.onPost.bind(this)}
                        />
                    </div>
                </div>
            );
        }
        return <div key={ev.event_id}>{rendered}</div>;
    }

    onPost(parent, eventId) {
        this.refresh();
        //window.location.href = `/${this.props.client.userId}/status/${parent}`;
    }

    onToggleClick() {
        this.setState({
            horizontalThreading: !this.state.horizontalThreading,
        });
    }

    renderButtons() {
        let backButton = <div />;
        if (this.state.parentOfParent) {
            const link = `/${this.state.parentOfParent.sender}/status/${this.state.parentOfParent.event_id}`;
            backButton = (
                <img
                    className="BackButton"
                    src="/chevron.svg"
                    alt="back"
                    onClick={() => {
                        window.location.href = link;
                    }}
                />
            );
        }

        return (
            <div className="statusButtons">
                {backButton}
                <div className="viewButtonWrapper">
                    <div
                        className={
                            this.state.horizontalThreading
                                ? "viewButton"
                                : "darkButton"
                        }
                        onClick={this.onToggleClick.bind(this)}
                    >
                        Vertical view
                    </div>
                    <div
                        className={
                            this.state.horizontalThreading
                                ? "darkButton"
                                : "viewButton"
                        }
                        onClick={this.onToggleClick.bind(this)}
                    >
                        Horizontal view
                    </div>
                </div>
            </div>
        );
    }

    render() {
        let parent;
        if (this.state.parentOfParent) {
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
                {this.renderButtons()}
                <div className="StatusPage">
                    {parent}
                    <div className="StatusMessage">
                        <Message
                            event={this.state.parent}
                            onPost={this.onPost.bind(this)}
                            noLink={true}
                        />
                    </div>
                    {this.state.children.map((ev, i) => {
                        if (this.state.horizontalThreading) {
                            return this.renderHorizontalChild(ev);
                        } else {
                            return this.renderVerticalChild(
                                ev,
                                this.state.children.length - 1 - i, // rendering relies on a stack so invert the sibling order
                                this.state.children.length
                            );
                        }
                    })}
                </div>
            </div>
        );
    }
}

export default StatusPage;

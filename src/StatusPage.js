import React from "react";
import "./StatusPage.css";
import Message from "./Message";
import { createPermalinkForThreadEvent } from "./routing";

const maxBreadth = 5;
const maxDepth = 10;

// StatusPage renders a thread of conversation based on a single anchor event.
// Props:
//  - eventId: The anchor event. The parent of this event and a tree of children will be obtained from this point.
//  - roomId: The room ID this event belongs to. Required in case the server doesn't have this event so it knows where to look.
//  - userId: The user who posted the event. Required for the server name in case the logged in user needs to join the room.
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
        if (this.props.roomId) {
            // extract server name from user being viewed:
            // @alice:domain.com -> [@alice, domain.com] -> [domain.com] -> domain.com
            // @bob:foobar.com:8448 -> [@bob, foobar.com, 8448] -> [foobar.com, 8448] -> foobar.com:8448
            let domain = this.props.userId.split(":").splice(1).join(":");
            await this.props.client.joinRoomById(this.props.roomId, domain);
        }
        await this.refresh();
        this.listenForNewEvents();
    }

    listenForNewEvents(from) {
        let f = from;
        this.props.client
            .waitForMessageEventInRoom([this.props.roomId], from)
            .then((newFrom) => {
                f = newFrom;
                return this.refresh();
            })
            .then(() => {
                this.listenForNewEvents(f);
            });
    }

    async refresh() {
        // fetch the event we're supposed to display, along with a bunch of other events which are the replies
        // and the replies to those replies. We go up to 6 wide and 6 deep, and stop showing >5 items (instead having)
        // a 'see more'.
        const events = await this.props.client.getRelationships(
            this.props.eventId,
            this.props.roomId,
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
            children: parentToChildren.get(parent.event_id) || [],
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
                const link = createPermalinkForThreadEvent(event);
                rendered.push(
                    <div
                        className="child"
                        style={style}
                        key={"seeMore" + eventId}
                    >
                        <a href={link}>See more...</a>
                    </div>
                );
                continue;
            }
            // this array is in the order from POST /event_relationships which is
            // recent first
            const children = this.state.parentToChildren.get(eventId);
            if (children) {
                // we only render children if we aren't going to go over (hence +1) the max depth, else
                // we permalink to the parent with a "see more" link. Inject this first as it's a LIFO stack
                if (depth + 1 >= maxDepth) {
                    toProcess.push({
                        eventId: eventId,
                        depth: depth + 1,
                        seeMore: true,
                    });
                } else {
                    // render up to maxBreadth children
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
                    // The array is recent first, but we want to display the most recent message at the top of the screen
                    // so loop backwards from our cut-off to 0 (as it's LIFO we want the most recent message pushed last)
                    for (
                        let i = Math.min(children.length, maxBreadth) - 1;
                        i >= 0;
                        i--
                    ) {
                        //for (let i = 0; i < children.length && i < maxBreadth; i++) {
                        toProcess.push({
                            eventId: children[i].event_id,
                            depth: depth + 1,
                        });
                    }
                }
            } else {
                // just because we don't have the children doesn't mean they don't exist,
                // check the event for children
                let remoteChildCount =
                    event.unsigned?.children?.["m.reference"];
                if (remoteChildCount > 0) {
                    toProcess.push({
                        eventId: eventId,
                        depth: depth + 1,
                        seeMore: true,
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
        // which item to render next
        const toProcess = [
            {
                eventId: ev.event_id,
                siblingDepth: 0, // how many parents have siblings up to the root node
                numSiblings: numSiblings, // total number of sibling this node has (incl. itself)
                sibling: sibling, // the 0-based index of this sibling
                depthsOfParentsWhoHaveMoreSiblings: [], // depth values
                depth: 0, // the depth of this event
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
            const depth = procInfo.depth;
            const depthsOfParentsWhoHaveMoreSiblings =
                procInfo.depthsOfParentsWhoHaveMoreSiblings;
            // continue the thread line down to the next sibling,
            const msgStyle = {
                borderLeft: !isLastSibling ? "1px solid #8D99A5" : undefined,
            };
            const event = this.state.eventMap.get(eventId);
            if (!event) {
                continue;
            }

            // We draw tube lines going down past nested events so we need to continue
            // the line first before we even handle the event we're processing.
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

            if (procInfo.seeMore) {
                const link = createPermalinkForThreadEvent(event);
                let seeMoreStyle = {};
                // If we're "seeing more" due to capping the breadth we want the link to be left-aligned
                // with the thread line, else we want to indent it so it appears as a child (depth see more)
                if (procInfo.seeMoreDepth) {
                    seeMoreStyle = { marginLeft: "20px" };
                }
                rendered.push(
                    <div className="verticalChild" key={"seeMore" + eventId}>
                        {parentThreadLines}
                        <a href={link} style={seeMoreStyle}>
                            See more...
                        </a>
                    </div>
                );
                continue;
            }

            // Copy depthsOfParentsWhoHaveMoreSiblings and add in this depth if we have more
            // siblings to render; this determines whether to draw outer thread lines
            const newDepthsOfParents = isLastSibling
                ? [...depthsOfParentsWhoHaveMoreSiblings]
                : [siblingDepth, ...depthsOfParentsWhoHaveMoreSiblings];

            // this array is in the order from POST /event_relationships which is
            // recent first
            const children = this.state.parentToChildren.get(eventId);
            if (children) {
                // we only render children if we aren't going to go over (hence +1) the max depth, else
                // we permalink to the parent with a "see more" link.
                if (depth + 1 >= maxDepth) {
                    toProcess.push({
                        eventId: eventId,
                        siblingDepth: siblingDepth,
                        seeMore: true,
                        seeMoreDepth: true,
                        numSiblings: children.length,
                        sibling: maxBreadth,
                        // we render the "see more" link directly underneath
                        depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                        depth: depth + 1,
                    });
                } else {
                    const newSiblingDepth =
                        siblingDepth + (children.length > 1 ? 1 : 0);
                    if (children.length > maxBreadth) {
                        // only show the first maxBreadth then add a 'see more' link which permalinks you
                        // to the parent which has so many children (we only display all children
                        // on the permalink for the parent). We inject this first as it's a LIFO stack
                        toProcess.push({
                            eventId: eventId,
                            siblingDepth: newSiblingDepth,
                            seeMore: true,
                            numSiblings: children.length,
                            sibling: maxBreadth,
                            depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                            depth: depth + 1,
                        });
                    }

                    // The array is recent first, but we want to display the most recent message at the top of the screen
                    // so loop backwards from our cut-off to 0
                    for (
                        let i = Math.min(children.length, maxBreadth) - 1;
                        i >= 0;
                        i--
                    ) {
                        //for (let i = 0; i < children.length && i < maxBreadth; i++) {
                        toProcess.push({
                            eventId: children[i].event_id,
                            siblingDepth: newSiblingDepth,
                            numSiblings: children.length,
                            // rendering relies on a stack so invert the sibling order, pretending the middle of the array is sibling 0
                            sibling:
                                Math.min(children.length, maxBreadth) - 1 - i,
                            parentIsLastSibling: isLastSibling,
                            depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                            depth: depth + 1,
                        });
                    }
                }
            } else {
                // just because we don't have the children doesn't mean they don't exist,
                // check the event for children
                let remoteChildCount =
                    event.unsigned?.children?.["m.reference"];
                if (remoteChildCount > 0) {
                    toProcess.push({
                        eventId: eventId,
                        siblingDepth: siblingDepth,
                        seeMore: true,
                        seeMoreDepth: true,
                        numSiblings: remoteChildCount,
                        sibling: maxBreadth,
                        // we render the "see more" link directly underneath
                        depthsOfParentsWhoHaveMoreSiblings: newDepthsOfParents,
                        depth: depth + 1,
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

    onPost(parentEvent, eventId) {
        this.refresh();
    }

    onToggleClick() {
        this.setState({
            horizontalThreading: !this.state.horizontalThreading,
        });
    }

    renderButtons() {
        let backButton = <div />;
        if (this.state.parentOfParent) {
            const link = createPermalinkForThreadEvent(
                this.state.parentOfParent
            );
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
                    noReply={true}
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

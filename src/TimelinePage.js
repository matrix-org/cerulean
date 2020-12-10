import React from "react";
import "./TimelinePage.css";
import Message from "./Message";
import { createPermalinkForTimelineEvent } from "./routing";

// TimelinePage renders an aggregated feed of all timelines the logged in user is following.
// Props:
//  - withReplies: True to show replies in addition to posts.
//  - client: Client
class TimelinePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: null,
            withReplies: this.props.withReplies,
            timeline: [],
            fromToken: null,
            trackingRoomIds: [],
        };
    }

    async componentDidMount() {
        await this.loadEvents();
        this.listenForNewEvents(this.state.fromToken);
    }

    listenForNewEvents(from) {
        let f = from;
        this.props.client
            .waitForMessageEventInRoom(this.state.trackingRoomIds, from)
            .then((newFrom) => {
                f = newFrom;
                return this.loadEvents();
            })
            .then(() => {
                this.listenForNewEvents(f);
            });
    }

    async loadEvents() {
        this.setState({
            loading: true,
        });
        try {
            let timelineInfo = await this.props.client.getAggregatedTimeline();
            if (timelineInfo.timeline.length === 0) {
                window.location.href = "/" + this.props.client.userId;
            }
            let roomSet = new Set();
            for (let ev of timelineInfo.timeline) {
                roomSet.add(ev.room_id);
            }
            this.setState({
                timeline: timelineInfo.timeline,
                fromToken: timelineInfo.from,
                trackingRoomIds: Array.from(roomSet),
            });
        } catch (err) {
            this.setState({
                error: JSON.stringify(err),
            });
        } finally {
            this.setState({
                loading: false,
            });
        }
    }

    onPostsClick() {
        this.setState({
            withReplies: false,
        });
    }

    onPostsAndRepliesClick() {
        this.setState({
            withReplies: true,
        });
    }

    onReplied(parentEvent, eventId) {
        const link = createPermalinkForTimelineEvent(parentEvent);
        if (!link) {
            return;
        }
        window.location.href = link;
    }

    render() {
        let timelineBlock;
        let errBlock;
        if (this.state.error) {
            errBlock = (
                <div className="errblock">
                    Whoops! Something went wrong: {this.state.error}
                </div>
            );
        } else {
            if (this.state.loading) {
                timelineBlock = <div> Loading timeline.... </div>;
            } else {
                let hasEntries = false;
                timelineBlock = (
                    <div>
                        {this.state.timeline
                            .filter((ev) => {
                                // only messages
                                if (ev.type !== "m.room.message") {
                                    return false;
                                }
                                // only messages with cerulean fields
                                if (
                                    !ev.content["org.matrix.cerulean.event_id"]
                                ) {
                                    return false;
                                }
                                // all posts and replies
                                if (this.state.withReplies) {
                                    return true;
                                }
                                // only posts
                                if (ev.content["org.matrix.cerulean.root"]) {
                                    return true;
                                }
                                return false;
                            })
                            .map((ev) => {
                                hasEntries = true;
                                return (
                                    <Message
                                        key={ev.event_id}
                                        event={ev}
                                        isTimelineEvent={true}
                                        onPost={this.onReplied.bind(this)}
                                    />
                                );
                            })}
                    </div>
                );
                if (!hasEntries) {
                    timelineBlock = (
                        <div className="emptyList">Nothing to see yet.</div>
                    );
                }
            }
        }

        let postTab = " tab";
        let postAndReplyTab = " tab";
        if (this.state.withReplies) {
            postAndReplyTab += " tabSelected";
        } else {
            postTab += " tabSelected";
        }

        let userPageBody = (
            <div>
                <div className="tabGroup">
                    <span
                        className={postTab}
                        onClick={this.onPostsClick.bind(this)}
                    >
                        Posts
                    </span>
                    <span
                        className={postAndReplyTab}
                        onClick={this.onPostsAndRepliesClick.bind(this)}
                    >
                        Posts and replies
                    </span>
                </div>
                <div className=" UserPageBody">{timelineBlock}</div>
            </div>
        );

        return (
            <div className="UserPage">
                {errBlock}
                {userPageBody}
            </div>
        );
    }
}

export default TimelinePage;

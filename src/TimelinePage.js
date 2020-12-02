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
        };
    }

    componentDidMount() {
        this.loadEvents();
    }

    async loadEvents() {
        this.setState({
            loading: true,
        });
        try {
            let timeline = await this.props.client.getAggregatedTimeline();
            if (timeline.length === 0) {
                window.location.href = "/" + this.props.client.userId;
            }
            this.setState({
                timeline: timeline,
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

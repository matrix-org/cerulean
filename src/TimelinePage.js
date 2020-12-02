import React from "react";
import "./TimelinePage.css";
import Message from "./Message";

// TimelinePage renders the logged in user's timeline room.
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

    handleInputChange(event) {
        const target = event.target;
        const value =
            target.type === "checkbox" ? target.checked : target.value;
        const name = target.name;
        this.setState({
            [name]: value,
        });
    }

    handleKeyDown(event) {
        if (event.key === "Enter") {
            this.onPostClick(event);
        }
    }

    async onPostClick(ev) {
        await this.props.client.post({
            msgtype: "m.text",
            body: this.state.inputPost,
        });
        this.setState({ inputPost: "" });
        await this.loadEvents();
    }

    postButton() {
        if (!this.props.client.accessToken) {
            return <div />;
        }
        return (
            <img
                src="/send.svg"
                alt="send"
                className="sendButton"
                onClick={this.onPostClick.bind(this)}
            />
        );
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

    onReplied(parent, eventId) {
        window.location.href = `/${this.props.client.userId}/status/${parent}`;
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
                                if (ev.type !== "m.room.message") {
                                    return false;
                                }
                                if (this.state.withReplies) {
                                    return true;
                                }
                                if (
                                    (ev.content["m.relationship"] || {})
                                        .rel_type === "m.reference"
                                ) {
                                    return false;
                                }
                                return true;
                            })
                            .map((ev) => {
                                return (
                                    <Message
                                        key={ev.event_id}
                                        event={ev}
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

import React from "react";
import "./UserPage.css";
import Message from "./Message";
import { createPermalinkForTimelineEvent } from "./routing";

// UserPage renders an arbitrary user's timeline room. If the user is the logged-in user
// then an input box is also displayed.
// Props:
//  - userId: The user's timeline room to view.
//  - withReplies: True to show replies in addition to posts.
//  - client: Client
class UserPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: null,
            withReplies: this.props.withReplies,
            timeline: [],
            isMe: props.userId === props.client.userId,
            inputPost: "",
        };
    }

    componentDidMount() {
        this.loadEvents();
    }

    async loadEvents() {
        this.setState({
            loading: true,
        });
        // ensure we are following this user. In the future we can view without following
        // by using /peek but we don't have that for now.
        let roomId;
        try {
            roomId = await this.props.client.followUser(this.props.userId);
        } catch (err) {
            this.setState({
                error: JSON.stringify(err),
            });
        } finally {
            this.setState({
                loading: false,
            });
        }
        let timeline = await this.props.client.getTimeline(roomId);
        this.setState({
            timeline: timeline,
        });
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
        if (this.state.inputPost.length > 0) {
            await this.props.client.postNewThread(this.state.inputPost);
        }
        this.setState({ inputPost: "" });
        await this.loadEvents();
    }

    postButton() {
        if (!this.props.client.accessToken) {
            return <div />;
        }
        let imgSrc = "/send.svg";
        let classes = "sendButton";
        if (this.state.inputPost.length > 0) {
            imgSrc = "/send-active.svg";
            classes = "sendButtonActive";
        }
        return (
            <img
                src={imgSrc}
                alt="send"
                className={classes}
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
                                // only messages sent by this user
                                if (
                                    ev.type !== "m.room.message" ||
                                    ev.sender !== this.props.userId
                                ) {
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

        let inputMessage;
        if (this.state.isMe) {
            inputMessage = (
                <div className="inputPostWithButton">
                    <input
                        name="inputPost"
                        className="inputPost"
                        type="text"
                        placeholder="What's happening?"
                        onKeyDown={this.handleKeyDown.bind(this)}
                        onChange={this.handleInputChange.bind(this)}
                        value={this.state.inputPost}
                    ></input>
                    {this.postButton()}
                </div>
            );
        }

        let userPageHeader = (
            <div className="UserPageHeader">
                <div className="userName">{this.props.userId}</div>
                {inputMessage}
                {errBlock}
            </div>
        );

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
                {userPageHeader}
                {userPageBody}
            </div>
        );
    }
}

export default UserPage;

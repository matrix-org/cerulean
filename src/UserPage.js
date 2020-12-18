import React from "react";
import "./UserPage.css";
import Message from "./Message";
import InputPost from "./InputPost";
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
            roomId: null,
            userProfile: null,
        };
    }

    async componentDidMount() {
        await this.loadEvents();
        this.listenForNewEvents();
    }

    listenForNewEvents(from) {
        let f = from;
        this.props.client
            .waitForMessageEventInRoom([this.state.roomId], from)
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
        // ensure we are following this user. In the future we can view without following
        // by using /peek but we don't have that for now.
        let roomId;
        try {
            roomId = await this.props.client.followUser(this.props.userId);
            try {
                const userProfile = await this.props.client.getProfile(
                    this.props.userId
                );
                this.setState({
                    userProfile,
                });
                if (userProfile.avatar_url) {
                    userProfile.avatar_url = this.props.client.thumbnailLink(
                        userProfile.avatar_url,
                        "scale",
                        64,
                        64
                    );
                }
            } catch (ex) {
                console.warn(
                    `Failed to fetch user profile, might not be set yet`,
                    ex
                );
            }

            let timeline = await this.props.client.getTimeline(roomId);
            console.log("Set timeline with ", timeline.length, " items");
            this.setState({
                timeline: timeline,
                roomId: roomId,
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
                timelineBlock = <div className="loader">Loading posts...</div>;
            } else {
                let hasEntries = false;
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
                    // the default page is / which is TimelinePage which then directs them to
                    // their UserPage if there are no events, so we want to suggest some content
                    let emptyListText;
                    if (this.state.isMe) {
                        emptyListText = (
                            <span>
                                No posts yet. Check the{" "}
                                <a
                                    href={
                                        "/@matthew:dendrite.matrix.org/!k1vs5pdsUeTpGOYd:dendrite.matrix.org/$OFpdqr-ZMaCRN68pcNaAZULhR-MOTi7f8_9fUxTHpKg"
                                    }
                                >
                                    welcome post
                                </a>
                                .
                            </span>
                        );
                    } else {
                        emptyListText = (
                            <span>This user hasn't posted anything yet.</span>
                        );
                    }

                    timelineBlock = (
                        <div className="emptyList">{emptyListText}</div>
                    );
                }
            }
        }

        let inputMessage;
        if (this.state.isMe && !this.props.client.isGuest) {
            inputMessage = (
                <InputPost
                    client={this.props.client}
                    onPost={this.loadEvents.bind(this)}
                />
            );
        }

        let userPageHeader;

        if (!this.props.client.isGuest) {
            userPageHeader = (
                <div className="UserPageHeader">
                    <div className="userSection">
                        {this.state.userProfile?.avatar_url && (
                            <img
                                alt="User avatar"
                                className="userAvatar"
                                src={this.state.userProfile?.avatar_url}
                            ></img>
                        )}
                        <div className="userInfo">
                            {this.state.userProfile?.displayname && (
                                <div className="displayName">
                                    {this.state.userProfile?.displayname}
                                </div>
                            )}
                            <div className="userName">{this.props.userId}</div>
                        </div>
                    </div>
                    {inputMessage}
                    {errBlock}
                </div>
            );
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
                {userPageHeader}
                {userPageBody}
            </div>
        );
    }
}

export default UserPage;

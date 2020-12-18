import React from "react";
import "./Message.css";
import { ClientContext } from "./ClientContext";
import Modal from "./Modal";
import {
    createPermalinkForTimelineEvent,
    createPermalinkForThreadEvent,
} from "./routing";

// Message renders a single event and contains the reply Modal.
// Props:
//  - event: The matrix event to render.
//  - isTimelineEvent: True if this event is in a timeline room. False if in a thread room.
//  - numReplies: Optional number of replies to this event, to display on the UI.
//  - noLink: Optional boolean whether to hyperlink to the event when clicked.
//  - onPost: Optional callback invoked when a reply is sent. Called as onPost(parentEvent, childId)
//  - noReply: Optional boolean whether to show reply button or not.
class Message extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            showReplyModal: false,
            inputReply: "",
            reputationScore: 0,
            hidden: false,
            uploadFile: null,
            noReply: this.props.noReply,
        };
    }

    componentDidMount() {
        if (!this.props.event) {
            return;
        }
        this.context.reputation.trackScore(
            this.props.event,
            (eventId, score) => {
                this.setState({
                    reputationScore: score,
                    hidden: score < 0,
                });
            }
        );
    }

    componentDidUpdate(oldProps) {
        if (
            oldProps.event &&
            this.props.event &&
            oldProps.event.event_id !== this.props.event.event_id
        ) {
            this.context.reputation.removeTrackScoreListener(
                oldProps.event.event_id
            );
        }
        if (
            this.props.event &&
            (oldProps.event || {}).event_id !== this.props.event.event_id
        ) {
            this.context.reputation.trackScore(
                this.props.event,
                (eventId, score) => {
                    this.setState({
                        reputationScore: score,
                        hidden: score < 0,
                    });
                }
            );
        }
    }

    componentWillUnmount() {
        if (!this.props.event) {
            return;
        }
        this.context.reputation.removeTrackScoreListener(
            this.props.event.event_id
        );
    }

    onReplyClick() {
        console.log(
            "onReplyClick timeline=",
            this.props.isTimelineEvent,
            " for event ",
            this.props.event
        );
        this.setState({
            showReplyModal: true,
        });
    }

    onReplyClose() {
        this.setState({
            inputReply: "",
            showReplyModal: false,
        });
    }

    async onSubmitReply() {
        const reply = this.state.inputReply;
        this.setState({
            loading: true,
            inputReply: "",
        });

        let dataUri;
        if (this.state.uploadFile) {
            dataUri = await this.context.client.uploadFile(
                this.state.uploadFile
            );
            console.log(dataUri);
        }

        let postedEventId;
        try {
            postedEventId = await this.context.client.replyToEvent(
                reply,
                this.props.event,
                this.props.isTimelineEvent,
                dataUri
            );
        } catch (err) {
            console.error(err);
            this.setState({
                error: err,
            });
        } finally {
            this.setState({
                loading: false,
                showReplyModal: false,
                uploadFile: null,
            });
        }
        if (postedEventId && this.props.onPost) {
            this.props.onPost(this.props.event, postedEventId);
        }
    }

    onAuthorClick(author) {
        window.location.href = `/${author}`;
    }

    onUnhideClick() {
        this.setState({
            hidden: false,
        });
    }

    renderTime(ts) {
        if (!ts) {
            return <span className="dateString">Now</span>;
        }
        const d = new Date(ts);
        const dateStr = `${d.getDate()}/${d.getMonth()}/${d.getFullYear()} · ${d.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit", hour12: false }
        )} (score: ${this.state.reputationScore.toFixed(1)})`;
        return <div className="DateString">{dateStr}</div>;
    }

    renderEvent(noLink) {
        const event = this.props.event;
        if (!event) {
            return <div></div>;
        }
        let handler;
        let classes = " MessageBody";
        if (!noLink) {
            handler = this.onMessageClick.bind(this);
            classes += " MessageBodyWithLink";
        }
        let blurStyle = {};
        let hiddenTooltip;
        if (this.state.hidden) {
            // 0 -> -10 = 1px blur
            // -10 -> -20 = 2px blur
            // -20 -> -30 = 3px blur, etc
            let blur = 5;
            // it should be
            if (this.state.reputationScore < 0) {
                // make score positive, look at 10s and add 1.
                // we expect -100 to be the highest value, resulting in:
                //   -100 * -1 = 100
                //   100 / 10 = 10
                //    10 + 1 = 11px blur
                blur = Math.round((this.state.reputationScore * -1) / 10) + 1;
                if (blur > 11) {
                    blur = 11;
                }
            }
            blurStyle = {
                filter: "blur(" + blur + "px)",
                opacity: 0.8,
            };
            handler = this.onUnhideClick.bind(this);
            hiddenTooltip = "Reveal filtered message";
        }

        let image;
        if (event.content.msgtype === "m.image" && event.content.url) {
            image = (
                <img
                    alt="user upload"
                    style={blurStyle}
                    className="userImage"
                    src={this.context.client.downloadLink(event.content.url)}
                />
            );
        }
        return (
            <div className={classes} onClick={handler}>
                <div className="MessageHeader">
                    <div
                        className="MessageAuthor"
                        onClick={this.onAuthorClick.bind(this, event.sender)}
                    >
                        {event.sender}{" "}
                    </div>
                    {this.renderTime(event.origin_server_ts)}
                </div>
                <div
                    className="MessageText"
                    style={blurStyle}
                    title={hiddenTooltip}
                >
                    {"" + event.content.body}
                </div>
                {image}
            </div>
        );
    }

    onMessageClick() {
        if (!this.props.event || this.state.loading) {
            return;
        }
        let link;
        if (this.props.isTimelineEvent) {
            link = createPermalinkForTimelineEvent(this.props.event);
        } else {
            link = createPermalinkForThreadEvent(this.props.event);
        }
        if (!link) {
            return;
        }
        window.location.href = link;
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
            this.onSubmitReply();
        }
    }

    async onUploadFileClick(event) {
        const file = event.target.files[0];
        console.log(file);
        this.setState({
            uploadFile: file,
        });
    }

    render() {
        let replies;
        if (this.props.numReplies > 1) {
            replies = "\uD83D\uDDE8" + (this.props.numReplies - 1);
        }

        let sendSrc = "/send.svg";
        const hasEnteredText = this.state.inputReply.length > 0;
        if (hasEnteredText) {
            sendSrc = "/send-active.svg";
        }

        let modal;
        if (this.state.showReplyModal) {
            let inputBox;
            let uploadBox;
            if (this.state.loading) {
                inputBox = <div className="loader">Loading...</div>;
            } else {
                inputBox = (
                    <div className="inputReplyWithButton">
                        <input
                            name="inputReply"
                            className="inputReply"
                            type="text"
                            placeholder="Post your reply"
                            autoFocus
                            onKeyDown={this.handleKeyDown.bind(this)}
                            onChange={this.handleInputChange.bind(this)}
                            value={this.state.inputReply}
                        ></input>
                        <img
                            src={sendSrc}
                            alt="send"
                            className="sendButton"
                            onClick={this.onSubmitReply.bind(this)}
                        />
                    </div>
                );
                uploadBox = (
                    <input
                        type="file"
                        name="file"
                        accept="image/*"
                        onChange={this.onUploadFileClick.bind(this)}
                    />
                );
            }
            modal = (
                <Modal
                    show={this.state.showReplyModal}
                    handleClose={this.onReplyClose.bind(this)}
                >
                    {this.renderEvent(true)}
                    {inputBox}
                    {uploadBox}
                </Modal>
            );
        }

        let replyButton;
        if (!this.context.client.isGuest && !this.state.noReply) {
            replyButton = (
                <button
                    className="darkButton"
                    onClick={this.onReplyClick.bind(this)}
                    disabled={this.state.loading}
                >
                    Reply
                </button>
            );
        }

        return (
            <div className="Message">
                {modal}
                {this.renderEvent(this.props.noLink)}
                <div className="MessageButtons">
                    <span className="moreCommentsButton">{replies}</span>
                    {replyButton}

                    {this.state.error ? (
                        <div>Error: {JSON.stringify(this.state.error)}</div>
                    ) : (
                        <div />
                    )}
                </div>
            </div>
        );
    }
}
Message.contextType = ClientContext;

export default Message;

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
        if (oldProps.event) {
            this.context.reputation.removeTrackScoreListener(
                oldProps.event.event_id
            );
        }
        if (this.props.event) {
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
            showReplyModal: false,
            inputReply: "",
        });

        let postedEventId;
        try {
            postedEventId = await this.context.client.replyToEvent(
                reply,
                this.props.event,
                this.props.isTimelineEvent
            );
        } catch (err) {
            console.error(err);
            this.setState({
                error: err,
            });
        } finally {
            this.setState({
                loading: false,
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
        return <span className="DateString">{dateStr}</span>;
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
        let bodyClasses = " MessageText";
        let hiddenTooltip;
        if (this.state.hidden) {
            bodyClasses += " MessageTextHidden";
            handler = this.onUnhideClick.bind(this);
            hiddenTooltip = "Reveal filtered message";
        }
        return (
            <div className={classes} onClick={handler}>
                <span className="MessageHeader">
                    <span
                        className="MessageAuthor"
                        onClick={this.onAuthorClick.bind(this, event.sender)}
                    >
                        {event.sender}{" "}
                    </span>
                    {this.renderTime(event.origin_server_ts)}
                </span>
                <div className={bodyClasses} title={hiddenTooltip}>
                    {"" + event.content.body}
                </div>
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
            modal = (
                <Modal
                    show={this.state.showReplyModal}
                    handleClose={this.onReplyClose.bind(this)}
                >
                    {this.renderEvent(true)}
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
                </Modal>
            );
        }

        return (
            <div className="Message">
                {modal}
                {this.renderEvent(this.props.noLink)}
                <div className="MessageButtons">
                    <span className="moreCommentsButton">{replies}</span>
                    <button
                        className="darkButton"
                        onClick={this.onReplyClick.bind(this)}
                        disabled={this.state.loading}
                    >
                        Reply
                    </button>

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

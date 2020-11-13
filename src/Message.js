import React from "react";
import "./Message.css";
import { ClientContext } from "./ClientContext";
import Modal from "./Modal";

class Message extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            showReplyModal: false,
            inputReply: "",
        };
    }
    async onReplyClick() {
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
            postedEventId = await this.context.post({
                body: reply,
                msgtype: "m.text",
                "m.relationship": {
                    rel_type: "m.reference",
                    event_id: this.props.event.event_id,
                },
            });
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
            this.props.onPost(this.props.event.event_id, postedEventId);
        }
    }

    onAuthorClick(author) {
        window.location.href = `/${author}`;
    }

    renderTime(ts) {
        if (!ts) {
            return <span className="dateString">Now</span>;
        }
        const d = new Date(ts);
        const dateStr = `${d.getDate()}/${d.getMonth()}/${d.getFullYear()} · ${d.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit", hour12: false }
        )}`;
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
                <div className="MessageText">{"" + event.content.body}</div>
            </div>
        );
    }

    onMessageClick() {
        if (!this.props.event || this.state.loading) {
            return;
        }
        window.location.href = `/${this.props.event.sender}/status/${this.props.event.event_id}`;
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

import React from "react";
import "./Message.css";
import { ClientContext } from "./ClientContext";

class Message extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
        };
    }
    async onReplyClick() {
        this.setState({
            loading: true,
        });
        const replyTargets = this.getReplyTargets();
        let reply = prompt(
            `Enter your reply (replying to ${replyTargets.join(", ")})`
        );
        // reply = reply + " " + replyTargets.join(" ");

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

    getReplyTargets() {
        const body = this.props.event.content.body;
        let targets = Array.from(body.matchAll(/(@.*?:.*?)\b/g));
        const targetHash = {};
        for (let target of targets) {
            targetHash[target]++;
        }
        targetHash[this.props.event.sender]++;
        return Object.keys(targetHash);
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

    renderEvent() {
        const event = this.props.event;
        if (!event) {
            return <div></div>;
        }
        let handler;
        let classes = " MessageBody";
        if (!this.props.noLink) {
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
                <div className="MessageText">{event.content.body}</div>
            </div>
        );
    }

    onMessageClick() {
        if (!this.props.event || this.state.loading) {
            return;
        }
        window.location.href = `/${this.props.event.sender}/status/${this.props.event.event_id}`;
    }

    render() {
        let replies;
        if (this.props.numReplies > 1) {
            replies = "\uD83D\uDDE8" + (this.props.numReplies - 1);
        }

        return (
            <div className="Message">
                {this.renderEvent()}
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

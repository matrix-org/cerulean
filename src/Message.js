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

        const content = {
            body: reply,
            msgtype: "m.text",
            "m.relationship": {
                rel_type: "m.reference",
                event_id: this.props.event.event_id,
            },
        };

        let posted = false;
        try {
            await this.context.postToUsers([this.context.userId], content);
            posted = true;
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
        if (posted && this.props.onPost) {
            this.props.onPost();
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

    renderTime(ts) {
        if (!ts) {
            return <span>Now</span>;
        }
        return <span>{new Date(ts).toLocaleString()}</span>;
    }

    renderEvent() {
        const event = this.props.event;
        if (!event) {
            return <div></div>;
        }
        return (
            <div
                className="MessageBody"
                onClick={this.onMessageClick.bind(this)}
            >
                <span className="MessageHeader">
                    {event.sender} · {this.renderTime(event.origin_server_ts)}
                </span>
                <div>{event.content.body}</div>
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
                <button
                    onClick={this.onReplyClick.bind(this)}
                    disabled={this.state.loading}
                >
                    Reply
                </button>
                <span className="MessageFooter">{replies}</span>
                {this.state.error ? (
                    <div>Error: {JSON.stringify(this.state.error)}</div>
                ) : (
                    <div />
                )}
            </div>
        );
    }
}
Message.contextType = ClientContext;

export default Message;

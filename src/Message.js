import React from "react";
import "./Message.css";

class Message extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
        };
    }
    async onReplyClick() {
        const replyTargets = this.getReplyTargets();

        const reply = prompt(
            `Enter your reply (replying to ${replyTargets.join(", ")})`
        );
        reply = reply + " " + replyTargets.join(" ");

        const content = {
            body: reply,
            msgtype: "m.text",
            "m.relates_to": {
                rel_type: "m.reference",
                event_id: this.props.event.raw.event_id,
            },
        };

        this.setState({
            loading: true,
        });
        try {
            await this.props.client.postToUsers(
                [this.props.client.userId],
                content
            );
        } catch (err) {
            this.setState({
                error: err,
            });
        } finally {
            this.setState({
                loading: false,
            });
        }
    }

    getReplyTargets() {
        const body = this.props.event.content.body;
        let targets = Array.from(body.matchAll(/(@.*?:.*?)\b/g));
        const targetHash = {};
        for (let target of targets) {
            targetHash[target]++;
        }
        return Object.keys(targetHash);
    }

    render() {
        return (
            <div class="Message">
                {JSON.stringify(this.props.event)}
                <button
                    onClick={this.onReplyClick}
                    disabled={this.state.loading}
                >
                    Reply
                </button>
                {this.state.error ? (
                    <div>Error: {this.state.error}</div>
                ) : (
                    <div />
                )}
            </div>
        );
    }
}

export default Message;

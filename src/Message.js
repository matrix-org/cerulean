import React from 'react';
import './Message.css';

class Message extends React.Component {
    onReplyClick() {
        const replyTargets = this.getReplyTargets();

        const reply = prompt(`Enter your reply (replying to ${ replyTargets.join(", ") })`);
        reply = reply + " " + replyTargets.join(" ");

        const content = {
            body: reply,
            msgtype: 'm.text',
            'm.relates_to': {
                'rel_type': 'm.reference',
                'event_id': this.props.event.raw.event_id,
            }
        };

        // we send it to our own timeline...
        client.sendMessage(`#${client.userId}`, content);

        // ...and then to the timelines we're replying to...
        // XXX: ideally we'd do this in one request, and factor out the event for efficency
        for (target of replyTargets) {
            client.sendMessage(`#${target}`, content);
        }
    }

    getReplyTargets() {
        const body = this.props.event.raw.content.body;
        let targets = Array.from(body.matchAll(/(@.*?:.*?)\b/g));
        const targetHash = {};
        for (target of targets) {
            targetHash[target]++;
        }
        return Object.keys(targetHash);
    }

    render() {
        return (
            <div class="Message">
                { JSON.stringify(this.props.event.raw) }
                <button onClick={ this.onReplyClick } >Reply</button>
                { this.props.event.subthreads.map(
                    subthread => {
                        <MessageThread thread={ subthread } />
                    }
                  )
                }
            </div>
        );
    }
}
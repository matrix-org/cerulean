import React from 'react';
//import './MessageThread.css';

class MessageThread extends React.Component {

    renderEvent(event) {
        return (
            <div>
                Event: { JSON.stringify(event) }
            </div>
        );
    }

    render() {
        return (
            <div class="MessageThread">
                { this.props.events.map(event => this.renderEvent(event)) }
            </div>
        );
    }
}

export default MessageThread;
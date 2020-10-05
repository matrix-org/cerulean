import React from 'react';
import './MessageThread.css';

class MessageThread extends React.Component {
    render() {
        return (
            <div class="MessageThread">
                { this.props.events.map(event => <Message event={ event }/>) }
            </div>
        );
    }
}
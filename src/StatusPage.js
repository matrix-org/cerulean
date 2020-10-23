import React from "react";
//import './MessageThread.css';

class StatusPage extends React.Component {
    render() {
        return (
            <div class="StatusPage">
                {this.props.userId}'s Status Page for event{" "}
                {this.props.statusId}
            </div>
        );
    }
}

export default StatusPage;

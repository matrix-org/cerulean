import React from "react";
//import './MessageThread.css';

class UserPage extends React.Component {
    render() {
        return (
            <div class="UserPage">
                {" "}
                {this.props.userId}'s' Page --
                {this.props.withReplies ? "with replies" : "without replies"}
            </div>
        );
    }
}

/*
if (path[1] === undefined) {
            msgs = this.props.client.getMsgs(userId, false, null);
            this.state.page = "user";
        } else if (path[1] === "with_replies") {
            msgs = this.props.client.getMsgs(userId, true, null);
            this.state.page = "user";
        } else if (path[1] === "status") {
            msgs = this.props.client.getMsgs(userId, true, path[2]);
            this.state.page = "status";
            // FIXME: as well as looking for replies to this
            // message, we also need to hunt for parents,
            // particularly if they are in other rooms.
        }
        */

export default UserPage;

import React from "react";
// import logo from './logo.svg';
import "./App.css";
import MessageThread from "./MessageThread";

// TODO: Input boxes
const serverUrl = "http://localhost:8008/_matrix/client";
const username = "foo";
const password = "barbarbar";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            thread: [],
        };
    }

    onComponentMount() {
        /*
            /username
            /username/with_replies  --> timeline with replies
            /username/status/id  --> permalink
            /hashtag/foo
        */

        let msgs = [];
        const path = window.location.pathname.split("/");
        const userId = path[0];
        if (path[1] === undefined) {
            msgs = this.props.client.getMsgs(userId, false, null);
            this.setState({ page: "user" });
        } else if (path[1] === "with_replies") {
            msgs = this.props.client.getMsgs(userId, true, null);
        } else if (path[1] === "status") {
            msgs = this.props.client.getMsgs(userId, true, path[2]);
            // FIXME: as well as looking for replies to this
            // message, we also need to hunt for parents,
            // particularly if they are in other rooms.
        }
        this.setState({
            thread: msgs,
        });
    }

    async onLoginClick(ev) {
        await this.props.client.login(serverUrl, username, password, true);
        this.forceUpdate();
    }

    loginButton() {
        if (this.props.client.accessToken) {
            return <div />;
        }
        return <button onClick={this.onLoginClick.bind(this)}>Login</button>;
    }

    async onPostClick(ev) {
        let msg = "Hello world";
        await this.props.client.postToUsers([this.props.client.userId], {
            msgtype: "m.text",
            body: msg,
        });
        this.forceUpdate();
    }

    postButton() {
        if (!this.props.client.accessToken) {
            return <div />;
        }
        return <button onClick={this.onPostClick.bind(this)}>Post</button>;
    }

    render() {
        return (
            <div className="App">
                <header className="AppHeader">
                    <a href="#">View Messages</a> |{" "}
                    <a href="#">View Messages and Replies</a>
                    {this.loginButton()}
                    {this.postButton()}
                </header>
                <main className="AppMain">
                    <MessageThread events={this.state.thread} />
                </main>
                <footer className="AppFooter"></footer>
            </div>
        );
    }
}

export default App;

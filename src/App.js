import React from "react";
// import logo from './logo.svg';
import "./App.css";
// import MessageThread from "./MessageThread";
import UserPage from "./UserPage";
import StatusPage from "./StatusPage";

class App extends React.Component {
    constructor(props) {
        super(props);

        /*
        Possible Cerulean paths:
            /username
            /username/with_replies  --> timeline with replies
            /username/status/id  --> permalink
        Examples:
        http://localhost:3000/@really:bigstuff.com/with_replies
        http://localhost:3000/@really:bigstuff.com
        http://localhost:3000/@really:bigstuff.com/status/$foobar
        */

        // sensible defaults
        this.state = {
            page: "user",
            viewingUserId: this.props.client.userId,
            withReplies: false,
            statusId: null,
        };

        // parse out state from path
        const path = window.location.pathname.split("/");
        console.log("input path: " + window.location.pathname);
        if (path.length < 2) {
            return;
        }
        const userId = path[1];
        if (!userId.startsWith("@")) {
            console.log("unknown user ID in path: " + path);
            return;
        }
        this.state.viewingUserId = userId;
        this.state.withReplies = path[2] === "with_replies";
        if (path[2] === "status" && path[3]) {
            this.state.page = "status";
            this.state.statusId = path[3];
        }
    }

    componentDidMount() {
        // TODO: auto-register as a guest if not logged in
    }

    async onLoginClick(ev) {
        let serverUrl = prompt("Homeserver URL?", "http://localhost:8008");
        serverUrl += "/_matrix/client";
        let username = prompt("User ID?", "@cerulean:localhost");
        let password = prompt("Password?", "");
        await this.props.client.login(serverUrl, username, password, true);
        this.setState({
            page: "user",
            viewingUserId: this.props.client.userId,
        });
    }

    async onLogoutClick(ev) {
        try {
            await this.props.client.logout();
        } finally {
            // regardless of whether the HTTP hit worked, we'll remove creds so UI needs a kick
            this.forceUpdate();
        }
    }

    onLogoClick() {
        window.location.href = "/";
    }

    loginLogoutButton() {
        if (this.props.client.accessToken) {
            return (
                <div className="topRightNav">
                    <span className="loggedInUser">
                        {this.props.client.userId}
                    </span>
                    <button
                        className=" headerButton lightButton"
                        onClick={this.onLogoutClick.bind(this)}
                    >
                        Logout
                    </button>
                </div>
            );
        }
        return (
            <button
                className=" lightButton topRightNav"
                onClick={this.onLoginClick.bind(this)}
            >
                Login
            </button>
        );
    }

    /**
     * Render a main content page depending on this.state.page
     * Possible options are:
     *  - user: The user's timeline, with replies optionally hidden.
     *  - status: A permalink to a single event with replies beneath
     */
    renderPage() {
        if (!this.props.client.accessToken) {
            return <div>You need to login first for now!</div>;
        }
        if (this.state.page === "user") {
            return (
                <UserPage
                    client={this.props.client}
                    userId={this.state.viewingUserId}
                    withReplies={this.state.withReplies}
                />
            );
        } else if (this.state.page === "status") {
            return (
                <StatusPage
                    client={this.props.client}
                    userId={this.state.viewingUserId}
                    eventId={this.state.statusId}
                />
            );
        } else {
            return <div>Whoops, how did you get here?</div>;
        }
    }

    render() {
        return (
            <div className="App">
                <header className="AppHeader">
                    <div
                        className="titleAndLogo"
                        onClick={this.onLogoClick.bind(this)}
                    >
                        <img src="/icon.svg" alt="logo" />
                        <div className="title">CERULEAN</div>
                    </div>
                    {this.loginLogoutButton()}
                </header>
                <main className="AppMain">{this.renderPage()}</main>
            </div>
        );
    }
}

export default App;

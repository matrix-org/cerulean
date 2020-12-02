import React from "react";
import "./App.css";
import UserPage from "./UserPage";
import StatusPage from "./StatusPage";
import TimelinePage from "./TimelinePage";
import Modal from "./Modal";

// Main entry point for Cerulean.
// - Reads the address bar and loads the correct page.
// - Loads and handles the top bar which is present on every page.
class App extends React.Component {
    constructor(props) {
        super(props);

        /*
        Possible Cerulean paths:
            /                       --> aggregated feed of all timelines followed
            /username               --> user's timeline
            /username/with_replies  --> timeline with replies
            /username/room_id/id     --> permalink
        Examples:
        http://localhost:3000/@really:bigstuff.com/with_replies
        http://localhost:3000/@really:bigstuff.com
        http://localhost:3000/@really:bigstuff.com/!cURbafjkfsMDVwdRDQ:matrix.org/$foobar
        */

        // sensible defaults
        this.state = {
            page: "timeline",
            viewingUserId: this.props.client.userId,
            withReplies: false,
            statusId: null,
            showLoginModal: false,
            inputLoginUrl: "",
            inputLoginUsername: "",
            inputLoginPassword: "",
        };

        // parse out state from path
        const path = window.location.pathname.split("/");
        console.log("input path: " + window.location.pathname);
        if (path.length < 2) {
            console.log("viewing timeline");
            return;
        }
        const userId = path[1];
        if (!userId) {
            console.log("viewing timeline");
            this.state.page = "timeline";
            return;
        } else if (!userId.startsWith("@")) {
            console.log("unknown user ID in path: " + path);
            return;
        }
        this.state.page = "user";
        this.state.viewingUserId = userId;
        this.state.withReplies = path[2] === "with_replies";
        if ((path[2] || "").startsWith("!") && path[3]) {
            this.state.page = "status";
            this.state.statusId = path[3];
            this.state.roomId = path[2];
        }
    }

    componentDidMount() {
        // TODO: auto-register as a guest if not logged in
    }

    handleInputChange(event) {
        const target = event.target;
        const value =
            target.type === "checkbox" ? target.checked : target.value;
        const name = target.name;
        this.setState({
            [name]: value,
        });
    }

    onLoginClose() {
        this.setState({ showLoginModal: false });
    }

    onLoginClick(ev) {
        this.setState({
            showLoginModal: true,
            inputLoginUrl: "",
            inputLoginUsername: "",
            inputLoginPassword: "",
        });
    }

    async onSubmitLogin() {
        this.setState({
            showLoginModal: false,
        });
        let serverUrl = this.state.inputLoginUrl + "/_matrix/client";
        await this.props.client.login(
            serverUrl,
            this.state.inputLoginUsername,
            this.state.inputLoginPassword,
            true
        );
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

    onUserClick() {
        window.location.href = "/" + this.props.client.userId;
    }

    loginLogoutButton() {
        if (this.props.client.accessToken) {
            return (
                <div className="topRightNav">
                    <span
                        className="loggedInUser"
                        onClick={this.onUserClick.bind(this)}
                    >
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
     *  - status: A permalink to a single event with replies beneath
     *  - timeline: The aggregated feed of all users the logged in user is following.
     *  - user: An arbitrary user's timeline. If the user is the logged in user, an input box to post a message is also displayed.
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
                    roomId={this.state.roomId}
                />
            );
        } else if (this.state.page === "timeline") {
            return <TimelinePage client={this.props.client} />;
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
                <Modal
                    show={this.state.showLoginModal}
                    handleClose={this.onLoginClose.bind(this)}
                >
                    <span className="modalSignIn">Sign in</span>
                    <form onSubmit={this.onSubmitLogin.bind(this)}>
                        <div>
                            <input
                                name="inputLoginUrl"
                                className="inputLogin"
                                type="text"
                                placeholder="Homeserver URL e.g https://matrix.org"
                                onChange={this.handleInputChange.bind(this)}
                                value={this.state.inputLoginUrl}
                            ></input>
                        </div>
                        <div>
                            <input
                                name="inputLoginUsername"
                                className="inputLogin"
                                type="text"
                                placeholder="Username e.g @cerulean:localhost"
                                onChange={this.handleInputChange.bind(this)}
                                value={this.state.inputLoginUsername}
                            ></input>
                        </div>
                        <div>
                            <input
                                name="inputLoginPassword"
                                className="inputLogin"
                                type="password"
                                placeholder="Password"
                                onChange={this.handleInputChange.bind(this)}
                                value={this.state.inputLoginPassword}
                            ></input>
                        </div>
                        <div>
                            <input
                                type="button"
                                className="darkButton modalSignInButton"
                                onClick={this.onSubmitLogin.bind(this)}
                                value="Login"
                            ></input>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }
}

export default App;

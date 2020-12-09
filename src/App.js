import React from "react";
import "./App.css";
import UserPage from "./UserPage";
import StatusPage from "./StatusPage";
import TimelinePage from "./TimelinePage";
import Modal from "./Modal";
import ReputationPane from "./ReputationPane";

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
        http://localhost:3000/#/@really:bigstuff.com/with_replies
        http://localhost:3000/#/@really:bigstuff.com
        http://localhost:3000/#/@really:bigstuff.com/!cURbafjkfsMDVwdRDQ:matrix.org/$foobar
        */

        // sensible defaults
        this.state = {
            page: "timeline",
            viewingUserId: this.props.client.userId,
            withReplies: false,
            statusId: null,
            showLoginModal: false,
            showRegisterModal: false,
            showFilterPane: false,
            inputLoginUrl: "",
            inputLoginUsername: "",
            inputLoginPassword: "",
        };

        // parse out state from path
        const path = window.location.hash.split("/");
        console.log("input path: " + window.location.hash);
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

    onHashChange() {
        const path = window.location.hash.split("/");
        console.log("input path: " + window.location.hash);
        if (path.length < 2) {
            console.log("viewing timeline");
            this.setState({
                page: "timeline",
            });
            return;
        }
        const userId = path[1];
        if (!userId) {
            console.log("viewing timeline");
            this.setState({
                page: "timeline",
            });
            return;
        } else if (!userId.startsWith("@")) {
            console.log("unknown user ID in path: " + path);
            this.setState({
                page: "timeline",
            });
            return;
        }
        let page = "user";
        this.setState({
            viewingUserId: userId,
            withReplies: path[2] === "with_replies",
        });
        if ((path[2] || "").startsWith("!") && path[3]) {
            page = "status";
            this.setState({
                statusId: path[3],
                roomId: path[2],
            });
        }
        this.setState({
            page: page,
        });
    }

    componentDidMount() {
        window.onhashchange = this.onHashChange.bind(this);
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

    onRegisterClose() {
        this.setState({ showRegisterModal: false });
    }

    onLoginClick(ev) {
        this.setState({
            showLoginModal: true,
            showRegisterModal: false,
            inputLoginUrl: "",
            inputLoginUsername: "",
            inputLoginPassword: "",
        });
    }

    onRegisterClick(ev) {
        this.setState({
            showLoginModal: false,
            showRegisterModal: true,
            inputLoginUrl: "",
            inputLoginUsername: "",
            inputLoginPassword: "",
        });
    }

    onFilterClick(ev) {
        this.setState({
            showFilterPane: !this.state.showFilterPane,
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

    async onSubmitRegister() {
        this.setState({
            showRegisterModal: false,
        });
        let serverUrl = this.state.inputLoginUrl + "/_matrix/client";
        await this.props.client.register(
            serverUrl,
            this.state.inputLoginUsername,
            this.state.inputLoginPassword
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
        window.location.href = "/#/";
    }

    onUserClick() {
        window.location.href = "/#/" + this.props.client.userId;
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
                    <img
                        src="/filter.svg"
                        alt="filter"
                        className="filterButton"
                        onClick={this.onFilterClick.bind(this)}
                    />
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
            <div>
                <button
                    className=" lightButton topRightNav"
                    onClick={this.onRegisterClick.bind(this)}
                >
                    Register
                </button>
                <button
                    className=" lightButton topRightNav"
                    onClick={this.onLoginClick.bind(this)}
                >
                    Login
                </button>
            </div>
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
        let filterPane;
        if (this.state.showFilterPane) {
            filterPane = (
                <ReputationPane onClose={this.onFilterClick.bind(this)} />
            );
        }
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
                {filterPane}
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
                                placeholder="Username e.g alice"
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
                <Modal
                    show={this.state.showRegisterModal}
                    handleClose={this.onRegisterClose.bind(this)}
                >
                    <span className="modalSignIn">Register a new account</span>
                    <form onSubmit={this.onSubmitRegister.bind(this)}>
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
                                placeholder="Username e.g alice"
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
                                onClick={this.onSubmitRegister.bind(this)}
                                value="Register"
                            ></input>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }
}

export default App;

import React from "react";
import "./App.css";
import UserPage from "./UserPage";
import StatusPage from "./StatusPage";
import TimelinePage from "./TimelinePage";
import Modal from "./Modal";
import ReputationPane from "./ReputationPane";

const constDendriteServer = "https://dendrite.matrix.org";

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
            showRegisterModal: false,
            showFilterPane: false,
            inputLoginUrl: constDendriteServer,
            inputLoginUsername: "",
            inputLoginPassword: "",
            error: null,
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
        // auto-register as a guest if not logged in
        if (!this.props.client.accessToken) {
            this.registerAsGuest();
        }
    }

    async registerAsGuest(recaptchaToken) {
        try {
            let serverUrl = this.state.inputLoginUrl + "/_matrix/client";
            if (recaptchaToken) {
                await this.props.client.registerWithCaptcha(
                    serverUrl,
                    recaptchaToken
                );
            } else {
                await this.props.client.registerAsGuest(serverUrl);
            }
            if (this.props.client.recaptcha) {
                console.log("recaptcha is required");
                this.setState(
                    {
                        recaptchaGuest: this.props.client.recaptcha,
                    },
                    () => {
                        window.recaptchaCallback = (token) => {
                            this.registerAsGuest(token);
                        };
                        window.grecaptcha.render("recaptchaguest", {
                            sitekey: this.props.client.recaptcha.response
                                .public_key,
                        });
                    }
                );
                return;
            }
            window.location.reload();
        } catch (err) {
            console.error("Failed to register as guest:", err);
            this.setState({
                error: "Failed to register as guest: " + JSON.stringify(err),
            });
        }
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
        this.setState({ showLoginModal: false, error: null });
    }

    onRegisterClose() {
        this.setState({ showRegisterModal: false, error: null });
    }

    onLoginClick(ev) {
        this.setState({
            showLoginModal: true,
            showRegisterModal: false,
            inputLoginUrl: constDendriteServer,
            inputLoginUsername: "",
            inputLoginPassword: "",
        });
    }

    onRegisterClick(ev) {
        this.setState({
            showLoginModal: false,
            showRegisterModal: true,
            inputLoginUrl: constDendriteServer,
            inputLoginUsername: "",
            inputLoginPassword: "",
        });
    }

    onFilterClick(ev) {
        this.setState({
            showFilterPane: !this.state.showFilterPane,
        });
    }

    onKeyDown(formType, event) {
        if (event.key !== "Enter") {
            return;
        }
        if (formType === "login") {
            this.onSubmitLogin();
        } else if (formType === "register") {
            this.onSubmitRegister();
        } else {
            console.warn("onKeyDown for unknown form type:", formType);
        }
    }

    async onSubmitLogin() {
        let serverUrl = this.state.inputLoginUrl + "/_matrix/client";
        try {
            await this.props.client.login(
                serverUrl,
                this.state.inputLoginUsername,
                this.state.inputLoginPassword,
                true
            );
            this.setState({
                page: "user",
                viewingUserId: this.props.client.userId,
                showLoginModal: false,
            });
        } catch (err) {
            console.error("Failed to login:", err);
            this.setState({
                error: "Failed to login: " + JSON.stringify(err),
            });
        }
    }

    async onSubmitRegister(ev, recaptchaToken) {
        try {
            let serverUrl = this.state.inputLoginUrl + "/_matrix/client";
            if (recaptchaToken) {
                await this.props.client.registerWithCaptcha(
                    serverUrl,
                    recaptchaToken
                );
            } else {
                await this.props.client.register(
                    serverUrl,
                    this.state.inputLoginUsername,
                    this.state.inputLoginPassword
                );
            }
            if (this.props.client.recaptcha) {
                console.log("recaptcha is required for registration");
                this.setState(
                    {
                        recaptcha: this.props.client.recaptcha,
                    },
                    () => {
                        window.recaptchaCallback = (token) => {
                            this.onSubmitRegister(null, token);
                        };
                        window.grecaptcha.render("recaptchareg", {
                            sitekey: this.props.client.recaptcha.response
                                .public_key,
                        });
                    }
                );
                return;
            }
            this.setState({
                page: "user",
                viewingUserId: this.props.client.userId,
                showRegisterModal: false,
            });
        } catch (err) {
            console.error("Failed to register:", err);
            this.setState({
                error: "Failed to register: " + JSON.stringify(err),
            });
        }
    }

    async onLogoutClick(ev) {
        try {
            await this.props.client.logout();
        } finally {
            // regardless of whether the HTTP hit worked, we'll remove creds so UI needs a kick
            this.forceUpdate(() => {
                this.registerAsGuest();
            });
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
            let logoutButton = (
                <button
                    className=" headerButton lightButton"
                    onClick={this.onLogoutClick.bind(this)}
                >
                    Logout
                </button>
            );
            let loginButton;
            let myUser;
            if (this.props.client.isGuest) {
                logoutButton = (
                    <button
                        className=" lightButton headerButton"
                        onClick={this.onRegisterClick.bind(this)}
                    >
                        Register
                    </button>
                );
                loginButton = (
                    <button
                        className=" lightButton headerButton spacer"
                        onClick={this.onLoginClick.bind(this)}
                    >
                        Login
                    </button>
                );
            } else {
                myUser = (
                    <div
                        className="loggedInUser"
                        onClick={this.onUserClick.bind(this)}
                    >
                        {this.props.client.userId}
                    </div>
                );
            }

            return (
                <div className="topRightNav">
                    {myUser}
                    <img
                        src="/filter.svg"
                        alt="filter"
                        className="filterButton"
                        onClick={this.onFilterClick.bind(this)}
                    />
                    {logoutButton}
                    {loginButton}
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
            if (this.state.recaptchaGuest) {
                return (
                    <div
                        id="recaptchaguest"
                        data-callback="recaptchaCallback"
                    ></div>
                );
            } else {
                return <div>Please wait....</div>;
            }
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
        let errMsg;
        if (this.state.error) {
            errMsg = <div className="errblock">{this.state.error}</div>;
        }
        let recaptchaReg;
        if (this.state.recaptcha) {
            recaptchaReg = (
                <div id="recaptchareg" data-callback="recaptchaCallback"></div>
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
                                onKeyDown={this.onKeyDown.bind(this, "login")}
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
                                onKeyDown={this.onKeyDown.bind(this, "login")}
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
                                onKeyDown={this.onKeyDown.bind(this, "login")}
                                value={this.state.inputLoginPassword}
                            ></input>
                        </div>
                        {errMsg}
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
                                placeholder="Dendrite Homeserver URL e.g https://dendrite.matrix.org"
                                onChange={this.handleInputChange.bind(this)}
                                onKeyDown={this.onKeyDown.bind(
                                    this,
                                    "register"
                                )}
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
                                onKeyDown={this.onKeyDown.bind(
                                    this,
                                    "register"
                                )}
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
                                onKeyDown={this.onKeyDown.bind(
                                    this,
                                    "register"
                                )}
                                value={this.state.inputLoginPassword}
                            ></input>
                        </div>
                        {errMsg}
                        {recaptchaReg}
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

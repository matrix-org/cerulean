import React from 'react';
import logo from './logo.svg';
import './App.css';

class App extends React.Component {

    onComponentMount() {
        /*
            /username
            /username/with_replies  --> timeline with replies
            /username/status/id  --> permalink
            /hashtag/foo
        */

        let msgs = [];
        const path = window.location.pathname.split('/');
        const userId = path[0];
        if (path[1] == undefined) {
            msgs = client.getMsgs(userId, false, null);
            this.setState({ page: "user" });
        }
        else if (path[1] == 'with_replies') {
            msgs = client.getMsgs(userId, true, null);
        }
        else if (path[1] == 'status') {
            msgs = client.getMsgs(userId, true, path[2]);
            // FIXME: as well as looking for replies to this
            // message, we also need to hunt for parents,
            // particularly if they are in other rooms.
        }

        let thread = new Thread(msgs, client, null);
        this.setState(thread);
    }

    render() {
        return (
            <div className="App">
                <header className="AppHeader">
                    <a href="#">View Messages</a> | <a href="#">View Messages and Replies</a>

                    <button>Login</button>

                    <button>Post></button>
                </header>
                <main className="AppMain">
                    <MessageThread thread={this.state.thread}/>
                </main>
                <footer className="AppFooter">
                </footer>
            </div>
        );
    }
}

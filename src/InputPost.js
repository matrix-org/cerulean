import React from "react";

// Input box for posts
// Props:
//  - client: Matrix client
//  - onPost: function() called when a post is sent.
class InputPost extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inputPost: "",
        };
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

    handleKeyDown(event) {
        if (event.key === "Enter") {
            this.onPostClick(event);
        }
    }

    async onPostClick(ev) {
        if (this.state.inputPost.length > 0) {
            await this.props.client.postNewThread(this.state.inputPost);
        }
        this.setState({ inputPost: "" });
        if (this.props.onPost) {
            this.props.onPost();
        }
    }

    postButton() {
        if (!this.props.client.accessToken) {
            return <div />;
        }
        let imgSrc = "/send.svg";
        let classes = "sendButton";
        if (this.state.inputPost.length > 0) {
            imgSrc = "/send-active.svg";
            classes = "sendButtonActive";
        }
        return (
            <img
                src={imgSrc}
                alt="send"
                className={classes}
                onClick={this.onPostClick.bind(this)}
            />
        );
    }

    render() {
        return (
            <div className="inputPostWithButton">
                <input
                    name="inputPost"
                    className="inputPost"
                    type="text"
                    placeholder="What's happening?"
                    onKeyDown={this.handleKeyDown.bind(this)}
                    onChange={this.handleInputChange.bind(this)}
                    value={this.state.inputPost}
                ></input>
                {this.postButton()}
            </div>
        );
    }
}

export default InputPost;

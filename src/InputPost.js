import React from "react";
import "./InputPost.css";

// Input box for posts
// Props:
//  - client: Matrix client
//  - onPost: function() called when a post is sent.
class InputPost extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inputPost: "",
            uploadFile: null,
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
        let dataUri;
        if (this.state.uploadFile) {
            dataUri = await this.props.client.uploadFile(this.state.uploadFile);
            console.log(dataUri);
        }
        this.setState({
            uploadFile: null,
        });

        if (this.state.inputPost.length > 0) {
            await this.props.client.postNewThread(
                this.state.inputPost,
                dataUri
            );
        }
        this.setState({ inputPost: "" });
        if (this.props.onPost) {
            this.props.onPost();
        }
    }

    onUploadFileClick(event) {
        const file = event.target.files[0];
        console.log(file);
        this.setState({
            uploadFile: file,
        });
    }

    postButton() {
        if (!this.props.client.accessToken) {
            return <div />;
        }
        let imgSrc = "/send.svg";
        let classes = "inputPostSendButton";
        if (this.state.inputPost.length > 0) {
            imgSrc = "/send-active.svg";
            classes = "inputPostSendButtonActive";
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
            <div>
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
                <input
                    className="inputPostUploadButton"
                    type="file"
                    name="file"
                    accept="image/*"
                    onChange={this.onUploadFileClick.bind(this)}
                />
            </div>
        );
    }
}

export default InputPost;

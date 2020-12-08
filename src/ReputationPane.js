import React from "react";
import "./ReputationPane.css";

class ReputationPane extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            showReplyModal: false,
            inputReply: "",
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
        }
    }

    render() {
        let entries = [];
        return (
            <div className="ReputationPane">
                <div>
                    <img
                        src="/close.svg"
                        alt="close"
                        className="closeButton"
                        onClick={this.props.onClose}
                    />
                </div>
                <div className="repTitle">Filter List</div>
                <div className="repDescription">
                    Filter lists and decide on the importance of each one
                </div>
                {entries}
                <div>
                    <input type="button" value="Add Filter" />
                </div>
                <button className="darkButton">Save Changes</button>
            </div>
        );
    }
}

export default ReputationPane;

import React from "react";
import ReputationList from "./ReputationList";
import "./ReputationPane.css";

// ReputationPane renders the filter list popup.
// Props:
//  - onClose: a function called when this dialog should be dismissed.
class ReputationPane extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            weightings: new Map(), // tag => number
            addingFilter: false,
            addFilterInput: "",
        };
        this._list = new ReputationList(
            "#hello-world:possibly.a.long.domain.name"
        );
        this._list.addRule("@alice:localhost", -10, "nope");
    }

    handleWeightChange(event) {
        const target = event.target;
        const name = target.name;
        const weightings = this.state.weightings;
        weightings.set(name, target.value);
        this.setState({
            weightings: weightings,
        });
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

    onDeleteClick(list, ev) {
        // leave the room
        // persist the new list
        console.log("delete ", list);
    }

    onSaveClick(ev) {
        // persist new weightings
        for (let [tag, weight] of this.state.weightings) {
            console.log(tag, weight);
        }

        this.props.onClose();
    }

    onAddFilterClick(ev) {
        this.setState({
            addingFilter: true,
        });
    }

    onCancelAddFilterClick(ev) {
        this.setState({
            addingFilter: false,
            addFilterInput: "",
        });
    }

    onCreateFilterClick(ev) {
        const val = this.state.addFilterInput;
        // persist the new weighting
        console.log(val);
        this.setState({
            addingFilter: false,
            addFilterInput: "",
        });
    }

    renderFilterList(list) {
        return (
            <div key={list.tag} className="listEntry">
                <div className="listEntryLeft">
                    <img
                        src="/delete.svg"
                        alt="delete"
                        className="listDelete"
                        onClick={this.onDeleteClick.bind(this, list)}
                    />
                    <div className="listTitle">{list.tag}</div>
                </div>
                <div className="listEntryRight">
                    <input
                        type="range"
                        className="range"
                        name={list.tag}
                        min="-100"
                        max="100"
                        step="1"
                        value={this.state.weightings.get(list.tag) || "100"}
                        onChange={this.handleWeightChange.bind(this)}
                    />
                    <div className="rangeLabels">
                        <span className="rangeLabel">Dislike</span>
                        <span className="rangeLabel">Neutral</span>
                        <span className="rangeLabel">Like</span>
                    </div>
                </div>
            </div>
        );
    }

    renderAddFilter() {
        if (this.state.addingFilter) {
            return (
                <div key="add" className="listEntry listEntryBottom">
                    <input
                        type="input"
                        name="addFilterInput"
                        placeholder="Enter room alias"
                        value={this.state.addFilterInput}
                        onChange={this.handleInputChange.bind(this)}
                    />
                    <div>
                        <input
                            className="cancelButton"
                            type="button"
                            value="Cancel"
                            onClick={this.onCancelAddFilterClick.bind(this)}
                        />
                        <input
                            className="darkButton"
                            type="button"
                            value="Create"
                            onClick={this.onCreateFilterClick.bind(this)}
                        />
                    </div>
                </div>
            );
        }
        return (
            <div key="add" className="listEntry">
                <input
                    className="addFilter"
                    type="button"
                    value="Add Filter"
                    onClick={this.onAddFilterClick.bind(this)}
                />
            </div>
        );
    }

    render() {
        let entries = [this.renderFilterList(this._list)];
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
                {this.renderAddFilter()}
                <button
                    className="darkButton saveChanges"
                    onClick={this.onSaveClick.bind(this)}
                >
                    Save Changes
                </button>
            </div>
        );
    }
}

export default ReputationPane;

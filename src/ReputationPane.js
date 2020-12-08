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

    onDeleteClick(list, ev) {
        console.log("delete ", list);
    }

    onSaveClick(ev) {
        for (let [tag, weight] of this.state.weightings) {
            console.log(tag, weight);
        }

        this.props.onClose();
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
        return (
            <div key="add" className="listEntry">
                <input className="addFilter" type="button" value="Add Filter" />
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

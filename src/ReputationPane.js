import React from "react";
import ReputationList from "./ReputationList";
import "./ReputationPane.css";
import { ClientContext } from "./ClientContext";

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
            error: null,
        };
    }

    componentDidMount() {
        this.loadWeightings();
    }

    loadWeightings() {
        let w = this.state.weightings;
        this.context.reputation.getWeightings().forEach((obj) => {
            w.set(obj.name, obj.weight);
        });
        this.setState({
            weightings: w,
        });
    }

    handleWeightChange(event) {
        const target = event.target;
        const name = target.name;
        const weightings = this.state.weightings;
        weightings.set(name, target.value);
        this.setState({
            weightings: weightings,
        });
        // persist new weightings
        for (let [tag, weight] of this.state.weightings) {
            this.context.reputation.modifyWeight(tag, weight);
        }
        this.context.reputation.saveWeights(window.localStorage);
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

    onDeleteClick(tag, ev) {
        // leave the room
        // persist the new list
        console.log("delete ", tag);
        this.context.reputation.deleteList(tag);
        this.loadWeightings();
    }

    onAddFilterClick(ev) {
        this.setState({
            addingFilter: true,
            error: null,
        });
    }

    onCancelAddFilterClick(ev) {
        this.setState({
            addingFilter: false,
            addFilterInput: "",
        });
    }

    async onCreateFilterClick(ev) {
        const val = this.state.addFilterInput;

        console.log("adding filter:", val);
        try {
            // join the room
            await this.context.client.joinReputationRoom(val);
            const list = await ReputationList.loadFromAlias(
                this.context.client,
                val
            );
            // persist the new weighting
            this.context.reputation.addList(list, 100);
            this.context.reputation.saveWeights(window.localStorage);
            this.loadWeightings();
        } catch (err) {
            console.error("failed to add filter: ", err);
            this.setState({
                error: "Unable to add filter: " + JSON.stringify(err),
            });
        }

        this.setState({
            addingFilter: false,
            addFilterInput: "",
        });
    }

    renderFilterLists() {
        return this.context.reputation.getWeightings().map((obj) => {
            return this.renderFilterList(obj.name);
        });
    }

    renderFilterList(tag) {
        return (
            <div key={tag} className="listEntry">
                <div className="listEntryLeft">
                    <img
                        src="/delete.svg"
                        alt="delete"
                        className="listDelete"
                        onClick={this.onDeleteClick.bind(this, tag)}
                    />
                    <div className="listTitle">{tag}</div>
                </div>
                <div className="listEntryRight">
                    <input
                        type="range"
                        className="range"
                        name={tag}
                        min="-100"
                        max="100"
                        step="1"
                        value={this.state.weightings.get(tag) || "100"}
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
                            className="darkButton"
                            type="button"
                            value="Create"
                            onClick={this.onCreateFilterClick.bind(this)}
                        />
                        <input
                            className="cancelButton"
                            type="button"
                            value="Cancel"
                            onClick={this.onCancelAddFilterClick.bind(this)}
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
        let errorBox;
        if (this.state.error) {
            errorBox = <div className="errblock">{this.state.error}</div>;
        }
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
                <div className="repTitle">Filter your view</div>
                <div className="repDescription">
                    Apply these filters to your view of Matrix
                </div>
                {this.renderFilterLists()}
                {this.renderAddFilter()}
                {errorBox}
            </div>
        );
    }
}
ReputationPane.contextType = ClientContext;

export default ReputationPane;

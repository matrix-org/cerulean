// createPermalinkForTimelineEvent links to the thread event given by this timeline event
function createPermalinkForTimelineEvent(event) {
    // extract cerulean fields
    const sender = event.sender;
    const eventId = event.content["org.matrix.cerulean.event_id"];
    const roomId = event.content["org.matrix.cerulean.room_id"];
    if (!roomId || !eventId || !sender) {
        console.log(
            "event missing cerulean fields, cannot create hyperlink:",
            event
        );
        return;
    }
    return `/#/${sender}/${roomId}/${eventId}`;
}

// createPermalinkForThreadEvent links to the thread event given.
function createPermalinkForThreadEvent(event) {
    if (!event.sender || !event.room_id || !event.event_id) {
        console.log("event missing fields, cannot create hyperlink:", event);
        return;
    }
    return `/#/${event.sender}/${event.room_id}/${event.event_id}`;
}

export { createPermalinkForTimelineEvent, createPermalinkForThreadEvent };

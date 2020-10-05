class Thread {

    // this should always be the event ID of the first event in the events list
    thread_id;

    // the events in this thread
    events;

    constructor(msgs, client, threadId) {
        this.events = [];
        this.threadId = threadId;

        for (const msg of msgs) {
            const event = new Event(msg);
            events.push(event);
            const refs = msg.unsigned["m.relations"]["m.reference"]["chunk"];
            for (const ref of refs) {
                subthreadMsgs = client.getSubthreadMsgs(userId, ref.event_id);
                const subthread = new Thread(subthreadMsgs, client, subthreadMsgs[0].event_id);
                event.subthreads.push(subthread);
            }
        }
    }
}

class Event {
    // any subthreads of this event
    subthreads;

    // the actual JSON of the underlying event
    raw;

    constructor(raw) {
        this.raw = raw;
        this.subthreads = [];
    }
}

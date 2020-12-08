import React from "react";
import { render } from "@testing-library/react";
import ReputationList from "./ReputationList";
import { Reputation } from "./Reputation";

it("ReputationList combines rules", () => {
    let list = new ReputationList("test");
    list.addRule("@alice:localhost", 100);
    list.addRule("@bob:localhost", -100);
    list.addRule("@zero:localhost", 0);
    list.addRule("!foo:localhost", 50);
    list.addRule("evil.domain", -100);
    let score = list.getReputationScore({
        type: "m.room.message",
        content: {
            body: "trustworthy comment",
        },
        sender: "@alice:localhost",
        room_id: "!foo:localhost",
    });
    expect(score).toEqual(150);
    score = list.getReputationScore({
        type: "m.room.message",
        content: {
            body: "untrustworthy comment",
        },
        sender: "@bob:localhost",
        room_id: "!foo:localhost",
    });
    expect(score).toEqual(-50);
    score = list.getReputationScore({
        type: "m.room.message",
        content: {
            body: "very evil comment",
        },
        sender: "@someone:evil.domain",
        room_id: "!foo:localhost",
    });
    expect(score).toEqual(-50);
    score = list.getReputationScore({
        type: "m.room.message",
        content: {
            body: "very evil comment",
        },
        sender: "@zero:localhost",
        room_id: "!foo:localhost",
    });
    expect(score).toEqual(50);
});

it("ReputationList produces a score of 0 for no matches", () => {
    let list = new ReputationList("test2");
    list.addRule("evil.domain.com", -100);
    list.addRule("!foo:localhostaaaaaaa", -100);
    let score = list.getReputationScore({
        type: "m.room.message",
        content: {
            body: "very evil comment",
        },
        sender: "@someone:evil.domain",
        room_id: "!foo:localhost",
    });
    expect(score).toEqual(0);
});

it("Reputation combines lists and weightings correctly when calling getScore", () => {
    let dogList = new ReputationList("#dog-lovers:localhost");
    dogList.addRule("@sheltie:localhost", 100);
    dogList.addRule("@ihatedogs:localhost", -100);
    dogList.addRule("!lovedogs:localhost", 50);
    dogList.addRule("dogs.should.d.ie", -100);
    dogList.addRule("animals.should.d.ie", -100); // intersects with catList
    let catList = new ReputationList("#cat-lovers:localhost");
    catList.addRule("@meow:localhost", 100);
    catList.addRule("@ihatecats:localhost", -100);
    catList.addRule("!lovecats:localhost", 50);
    catList.addRule("cats.should.d.ie", -100);
    catList.addRule("animals.should.d.ie", -100); // intersects with dogList
    let rep = new Reputation();
    rep.addList(dogList, 100);
    rep.addList(catList, 50);

    // domain=animals.should.d.ie, dogList contributes (1*-100), catList contributes (0.5*-100) = -150
    expect(
        rep.getScore({
            type: "m.room.messsage",
            content: {
                body: "he he he animals suck",
            },
            sender: "@someone:animals.should.d.ie",
            room_id: "!somewhere:localhost",
        })
    ).toBe(-150);

    // some negatives, some positives
    // domain=animals.should.d.ie, dogList contributes (1*-100), catList contributes (0.5*-100) = -150
    // room=!lovecats:localhost, catList contributes (0.5*50)=25
    // total: -125
    expect(
        rep.getScore({
            type: "m.room.messsage",
            content: {
                body: "he he he cats suck",
            },
            sender: "@someone:animals.should.d.ie",
            room_id: "!lovecats:localhost",
        })
    ).toBe(-125);

    // no matches = no filters
    expect(
        rep.getScore({
            type: "m.room.messsage",
            content: {
                body: "anything",
            },
            sender: "@someone:localhost",
            room_id: "!somewhere:localhost",
        })
    ).toBe(0);

    // a single zero value should not prevent other filters from matching
    rep.modifyWeight("#cat-lovers:localhost", 0);
    // sender contributes nothing,  room ID contributes 50*1
    expect(
        rep.getScore({
            type: "m.room.messsage",
            content: {
                body: "he he he cats suck",
            },
            sender: "@meow:localhost",
            room_id: "!lovedogs:localhost",
        })
    ).toBe(50);
});

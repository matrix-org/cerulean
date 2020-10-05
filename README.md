# Cerulean

Cerulean is a highly experimental [Matrix](https://matrix.org) client intended to
demonstrate the viability of freestyle public threaded conversations a la Twitter.

As such, it is built as simply as possible, in order to demonstrate to someone
unfamiliar with Matrix how the Client Server API can be used in this manner.
It has no dependencies (other than create-react-app) and has no optimisations.
It uses a naive View+Model architecture for legibility (although ideally it'd
grow to be MVVM in future).

**Cerulean does not currently work, or indeed build; this initial check-in is
a snapshot WIP for future reference, which has been blindly written down without
trying to build in order to get the below ideas onto disk as rapidly as possible.**

## Design

The way Cerulean works is:
 * Messages are sent into the 'user timeline' rooms of their recipients.
    * For instance, my user timeline room would be #@matthew:matrix.org
    * So a message sent by me which @-mentions @Amandine:matrix.org would
      be sent by me in both #@matthew:matrix.org and #@Amandine:matrix.org.
    * (Ideally the message contents would be factored out between the two rooms,
      and an API would be available to send to both locations at the same time,
      but that's just an optimisation which can be added in future if this overall
      model looks plausible.)
 * Messages are viewed in the context of a given 'user timeline' room.
    * e.g. https://cerulean/#/@matthew:matrix.org/status/$nqeHq7lJyFp4UZNlE3rN4xPVsez0vZnIcaM6SQB9waw
      is a given message that I've sent in my timeline.
 * Messages are threaded using a combination of `m.reference` aggregations
  (to indicate subthreads forking off the current thread)
  and `m.label` fields (which contain the event ID of the head of the subthread).
    * As such, walking threads is a question of following bundled `m.reference`
      aggregations, and then filtering on the label for the subthread in question.
 * Users should only `/join` other's timeline rooms to post in them; otherwise they should `/peek`.
 * Users start off as guests on their chosen homeserver, and then login if they want to post.

Cerulean uses the following experimental [MSCs](https://matrix.org/docs/spec/proposals):
 * `m.reference` aggregations from [MSC1849](https://github.com/matrix-org/matrix-doc/pull/1849)
 * `m.label` label-based filtering from [MSC2326](https://github.com/matrix-org/matrix-doc/pull/2326)
 * `#@user:domain` user profile/timeline rooms from [MSC1769](https://github.com/matrix-org/matrix-doc/pull/1769)
 * peeking via `/sync` [MSC2753](https://github.com/matrix-org/matrix-doc/pull/2753) - optional
 * peeking over federation [MSC2444](https://github.com/matrix-org/matrix-doc/pull/2444) - optional

## Features

 * [x] User timelines
 * [x] User timelines with replies
 * [x] Individual messages with surrounding threaded conversation

Pending UI:
 * [ ] Ability to expand out threads to explore further
 * [ ] Ability to display parent rather than child threads if the parent started on a different timeline
 * [ ] Live updates as messages arrive (i.e. a `/sync` loop)
 * [ ] HTML messages
 * [ ] Likes
 * [ ] RTs

Pending serverside work:
 * [ ] Search. We don't currently have a fast search across all public rooms, but it could of course be added.
 * [ ] Hashtags. These are effectively a subset of search.

This test jig could also be used for experimenting with other threaded conversation formats, e.g:
 * Mailing lists
 * Newsgroups
 * HN/Reddit style forums

## To build

```
yarn install
yarn start
```

## License

All files in this repository are licensed as follows:

```
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
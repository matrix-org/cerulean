# Cerulean

Cerulean is a highly experimental [Matrix](https://matrix.org) client intended to
demonstrate the viability of freestyle public threaded conversations a la Twitter.

As such, it is built as simply as possible, in order to demonstrate to someone
unfamiliar with Matrix how the Client Server API can be used in this manner.
It has no dependencies (other than create-react-app) and has no optimisations.
It uses a naive View+Model architecture for legibility (although ideally it'd
grow to be MVVM in future).

## Design

The way Cerulean works is:
 * Messages are sent into 2 rooms: the 'user timeline' room and a 'thread' room.
    * For instance, my user timeline room would be #@matthew:matrix.org
    * A thread room is created for each unique post. Replies to the thread are sent into this room.
 * Messages are viewed in the context of a given 'thread' room.
    * e.g. https://cerulean/#/@matthew:matrix.org/!3ZQVDsZgx8SbUF:matrix.org/$nqeHq7lJyFp4UZNlE3rN4xPVsez0vZnIcaM6SQB9waw
      is a given message that I've sent, and that is a permalink to the message with surrounding replies.
 * User timelines are viewed in the context of a given 'user timeline' room.
    * e.g https://cerulean/#/@matthew:matrix.org is my user timeline which has all my posts and all my replies.
 * Messages are threaded in 'thread' rooms using MSC2836.
 * Users **should** only `/join` other's timeline rooms to 'follow' them and get updates whenever they make a post/reply.
 * Users **should** only `/join` a thread room to reply to a post in that room, otherwise they should `/peek` to get a read-only view of the thread.
 * Users **should** start off as guests on their chosen homeserver, and then login if they want to post.

Cerulean uses the following experimental [MSCs](https://matrix.org/docs/spec/proposals):
 * Threading from [MSC2836](https://github.com/matrix-org/matrix-doc/pull/2836)
 * `#@user:domain` user profile/timeline rooms from [MSC1769](https://github.com/matrix-org/matrix-doc/pull/1769)
 * peeking via `/sync` [MSC2753](https://github.com/matrix-org/matrix-doc/pull/2753) - optional
 * peeking over federation [MSC2444](https://github.com/matrix-org/matrix-doc/pull/2444) - optional

## Features

 * [x] User timelines
 * [x] User timelines with replies
 * [x] Individual messages with surrounding threaded conversation
 * [x] Ability to expand out threads to explore further
 * [x] Ability to display parent rather than child threads if the parent started on a different timeline
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

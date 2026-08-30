'use strict';
const assert = require('assert');
const player = require('./hosts.js');

assert.ok(player.supportedUrl('https://music.youtube.com/watch?v=x'));
assert.ok(player.supportedUrl('https://open.spotify.com/playlist/1'));
assert.ok(player.supportedUrl('https://play.spotify.com/'));
assert.ok(player.supportedUrl('https://music.apple.com/us/album/foo/1'));
assert.ok(!player.supportedUrl('https://www.youtube.com/watch?v=x'));
assert.ok(!player.supportedUrl('https://spotify.com/'));
assert.ok(player.tabQueryUrls.length >= 3);
console.log('PASS  hosts  supported URLs');

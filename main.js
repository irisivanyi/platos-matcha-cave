'use strict';

/** Are.na channel: https://www.are.na/world-of-eyeris/live-gently-with-intensity */
const ARENA_CHANNEL_SLUG = 'live-gently-with-intensity';
const ARENA_API = 'https://api.are.na/v2';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function formatArenaDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function blockSortDate(block) {
  const raw = block.connected_at || block.created_at;
  return new Date(raw).getTime();
}

/**
 * @returns {Promise<object[]>}
 */
async function fetchChannelContentsPaginated(slug) {
  const per = 50;
  let page = 1;
  const all = [];
  for (;;) {
    const url = `${ARENA_API}/channels/${encodeURIComponent(slug)}/contents?per=${per}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Are.na request failed (${res.status})`);
    }
    const data = await res.json();
    const batch = Array.isArray(data.contents) ? data.contents : [];
    all.push(...batch);
    if (batch.length < per) break;
    page += 1;
  }
  return all;
}

async function fetchChannel(slug) {
  const res = await fetch(`${ARENA_API}/channels/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    throw new Error(`Are.na channel failed (${res.status})`);
  }
  return res.json();
}

function isTextBlock(block) {
  return block.class === 'Text' && typeof block.content === 'string' && block.content.trim() !== '';
}

function setMastheadUpdated(channel) {
  const el = document.getElementById('channel-updated');
  if (!el || !channel.updated_at) return;
  el.dateTime = channel.updated_at;
  el.textContent = `last updated ${formatArenaDate(channel.updated_at)}`;
}

function appendTextLines(article, text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.className = 'post__body';
    p.textContent = line.length ? line : '\u00A0';
    article.appendChild(p);
  }
}

function renderPosts(container, blocks) {
  container.textContent = '';
  for (const block of blocks) {
    const when = block.connected_at || block.created_at;
    const article = document.createElement('article');
    article.className = 'post';

    const dateP = document.createElement('p');
    dateP.className = 'post__date';
    const time = document.createElement('time');
    time.dateTime = when;
    time.textContent = formatArenaDate(when);
    dateP.appendChild(time);
    article.appendChild(dateP);

    appendTextLines(article, block.content);
    container.appendChild(article);
  }
}

async function init() {
  const postsEl = document.getElementById('posts');
  const statusEl = document.getElementById('posts-status');
  if (!postsEl) return;

  try {
    const [channel, contents] = await Promise.all([
      fetchChannel(ARENA_CHANNEL_SLUG),
      fetchChannelContentsPaginated(ARENA_CHANNEL_SLUG),
    ]);

    setMastheadUpdated(channel);

    if (statusEl) statusEl.remove();

    const textBlocks = contents.filter(isTextBlock);
    textBlocks.sort((a, b) => blockSortDate(b) - blockSortDate(a));

    if (textBlocks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'posts__status';
      empty.textContent = 'No text posts in this channel yet.';
      postsEl.appendChild(empty);
      return;
    }

    renderPosts(postsEl, textBlocks);
  } catch (err) {
    if (statusEl) statusEl.remove();
    const errP = document.createElement('p');
    errP.className = 'posts__error';
    errP.textContent =
      'Could not load posts from Are.na. Open this page over http(s), or try again later.';
    postsEl.appendChild(errP);
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', init);

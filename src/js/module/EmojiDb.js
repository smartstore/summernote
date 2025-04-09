const supportedLocales = ['da', 'de', 'en', 'es', 'et', 'fi', 'fr', 'hu', 'it', 'ja', 'ko', 'lt', 'ms', 'nb', 'nl', 'pl', 'pt', 'ru', 'th', 'uk', 'zh'];

export default class EmojiDb {
  static #instance = null;
  static #loading = false;

  #data = [];
  #emojiMap = new Map();
  #groupMap = new Map();

  static async #fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  }

  static isReady() {
    return this.#instance !== null;
  }

  static async create(context, fn) {
    const finalize = () => {
      fn?.apply(this, [this.#instance]);
      return this.#instance;
    }

    if (this.#instance) return finalize();

    if (!context.options.emojiCdnUrl) {
      throw new Error('Emoji CDN URL is not set in options. Please set it in the summernote options.');
    }
 
    while (this.#loading) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (this.#instance) return finalize();
    }

    const lang = context.options.lang.split('-')[0].toLowerCase();
    const locale = supportedLocales.includes(lang) ? lang : 'en';
    const baseUrl = context.options.emojiCdnUrl.endsWith('/') ? context.options.emojiCdnUrl.slice(0, -1) : context.options.emojiCdnUrl;

    this.#loading = true;

    try {
      let fetchOpts = { cache: 'default' };

      let data, messages, cldrcodes, gitcodes, groups;
      [data, messages, cldrcodes, gitcodes, groups] = await Promise.all([
        this.#fetchJson(`${baseUrl}/${locale}/data.json`, fetchOpts),
        this.#fetchJson(`${baseUrl}/${locale}/messages.json`, fetchOpts),
        this.#fetchJson(`${baseUrl}/${locale}/shortcodes/cldr.json`, fetchOpts),
        this.#fetchJson(`${baseUrl}/en/shortcodes/github.json`, fetchOpts),
        this.#fetchJson(`${baseUrl}/meta/groups.json`, fetchOpts)
      ]);

      const shortcodes = this.#mergeShortcodes(cldrcodes, gitcodes);
      this.#instance = new this(data, messages, shortcodes, groups);
      return finalize();
    } 
    finally {
      this.#loading = false;
    }
  }

  static #mergeShortcodes(codes1 = {}, codes2 = {}) {
    const merged = { ...codes1 };
  
    for (const [key, newValue] of Object.entries(codes2)) {
      if (key in merged) {
        // Key exists - convert to array if needed, then append
        const existingValue = merged[key];
        if (existingValue === newValue) {
          // Skip if they are the same
          continue; 
        }
        merged[key] = Array.isArray(existingValue) 
          ? [...existingValue, newValue]
          : [existingValue, newValue];
      } 
      else {
        // New key - add directly
        merged[key] = newValue;
      }
    }
  
    return merged;
  }

  constructor(data, messages, shortcodes, groups) {
    if (!data || !groups) throw new Error('Call EmojiDb.create() first');
    this.#buildIndex(data, messages, shortcodes, groups);
  }

  #buildIndex(data, messages, shortcodes, groups) {
    // 1. Index all emojis
    this.#data = data.filter(emoji => emoji.version < 13);

    const getGroupIcon = (key) => {
      switch (key) {
        case 'smileys-emotion':
          return '😀';
        case 'people-body':
          return '🧑';
        case 'component':
          return '🍔';
        case 'animals-nature':
          return '🐻';
        case 'food-drink':
          return '🍔';
        case 'travel-places':
          return '🚀';
        case 'activities':
          return '⚽';
        case 'objects':
          return '💡';
        case 'symbols':
          return '❤️';
        case 'flags':
          return '🏳️‍🌈';
        default:
          return '❓';
      }
    };

    // 2. Organize groups
    Object.entries(groups.groups).forEach(([groupId, group]) => {
      if (group == 'component') return; // Skip component group as it's not used in the emoji picker
      this.#groupMap.set(Number(groupId), {
        id: groupId,
        key: group,
        name: messages.groups[Number(groupId)]?.message || group,
        icon: getGroupIcon(group),
        emojis: []
      });
    });

    // 3. Create lookup maps
    this.#data.forEach(emoji => {
      const group = emoji.group == 2 ? 8 : emoji.group; // Map components to symbols group

      this.#groupMap.get(group)?.emojis.push(emoji);
      this.#emojiMap.set(emoji.emoji, emoji);

      if (emoji.hexcode) {
        this.#emojiMap.set(emoji.hexcode, emoji);
        const codes = shortcodes[emoji.hexcode];
        if (codes) {
          emoji.shortcodes = Array.isArray(codes) ? codes : [codes];
        }
      }

      emoji.combined = this.isCombinedEmoji(emoji.emoji);

      emoji.shortcodes?.forEach(code => {
        this.#emojiMap.set(`:${code}:`, emoji);
      });
    });
  }

  // Public API
  getGroups() {
    return this.#groupMap.values();
  }

  getEmojis(groupId) {
    return this.#groupMap.get(Number(groupId))?.emojis || [];
  }

  findEmojis(query) {
    const term = query.toLowerCase();
    return this.#data.filter(emoji => 
      emoji.label.toLowerCase().includes(term) ||
      emoji.tags?.some(tag => tag.includes(term)) ||
      emoji.shortcodes?.some(code => code.includes(term))
    );
  }

  isCombinedEmoji(emoji) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const segments = [...segmenter.segment(emoji)];
      return segments.length === 1 && emoji.includes('\u200D');
    }
    catch {
      return emoji.includes('\u200D');
    }
  }

  getEmoji(emojiOrCode) {
    return this.#emojiMap.get(emojiOrCode) || 
           this.#emojiMap.get(emojiOrCode.toLowerCase());
  }
}
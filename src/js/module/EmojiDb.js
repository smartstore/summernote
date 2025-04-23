import Type from '../core/Type';

const maxRecent = 70;
const supportedLocales = ['da', 'de', 'en', 'es', 'et', 'fi', 'fr', 'hu', 'it', 'ja', 'ko', 'lt', 'ms', 'nb', 'nl', 'pl', 'pt', 'ru', 'th', 'uk', 'zh'];
const combinedEmojisMap = new Map([
  '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '🧑‍🦲', '🧑‍⚕️', '🧑‍🏭', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎤', '🧑‍🎨', '🧑‍✈️',
  '🧑‍🎓', '🧑‍🏫', '🧑‍⚖️', '🧑‍🌾', '🧑‍🍳', '🧑‍🔧', '🧑‍🚀', '🧑‍🚒', '🧑‍🦯', '🧑‍🦼', '🧑‍🦽'
].map(x => [x, true]));

const tryFindSkin = (emoji, skinTone) => {
  if (skinTone && emoji?.skins?.length) {
    for (let skin of emoji.skins) {
      if (skin.tone === skinTone) {
        skin.emojiBase = emoji.emoji;
        return skin;
      }
      else if (Array.isArray(skin.tone)) {
        if (skin.tone.some(t => t === skinTone)) {
          skin.emojiBase = emoji.emoji;
          return skin;
        }
      }
    }
  }

  return emoji;
}

const mapSkinToneOption = (emojis, skinTone) => {
  emojis = Array.isArray(emojis) ? emojis : [emojis];

  if (skinTone >>> 0 && skinTone <= 5) {
    emojis = emojis.map(e => tryFindSkin(e, skinTone));
  }

  return emojis;
}

export default class EmojiDb {
  static #instance = null;
  static #loading = false;

  #data = [];
  #emojiMap = new Map();
  #groupMap = new Map();
  #skinTones = [];

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
    this.#data = data.filter(emoji => emoji.version < 13 && Type.isNumber(emoji.group) && !this.isCombinedEmoji(emoji.emoji));

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
      const groupId = emoji.group == 2 ? 8 : emoji.group; // Map components to symbols group
      const group = this.#groupMap.get(groupId);

      if (group) {
        group.emojis.push(emoji);
        this.#emojiMap.set(emoji.emoji, emoji);

        if (emoji.skins?.length) {
          group.hasSkinTones = true;
        }
  
        if (emoji.hexcode) {
          //this.#emojiMap.set(emoji.hexcode, emoji);
          const codes = shortcodes[emoji.hexcode];
          if (codes) {
            emoji.shortcodes = Array.isArray(codes) ? codes : [codes];
          }
        }
  
        emoji.shortcodes?.forEach(code => {
          this.#emojiMap.set(`:${code}:`, emoji);
        });
      }
    });

    // 4. Add skin tones
    this.#skinTones = messages.skinTones;
  }

  // Public API
  getSkinTones() {
    const getColor = (tone) => {
      switch (tone) {
        case 'light':
          return '#FFDBB4';
        case 'medium-light':
          return '#EDB98A';
        case 'medium':
          return '#D08B5B';
        case 'medium-dark':
          return '#AE5D29';
        case 'dark':
          return '#713E1D';
        default:
          return '#FFDC5D';
      }
    }

    return this.#skinTones.map((tone, index) => ({
      id: index + 1,
      key: tone.key,
      label: tone.message,
      color: getColor(tone.key),
    }));
  }

  getGroup(id) {
    return this.#groupMap.get(Number(id));
  }

  getGroups() {
    return this.#groupMap.values();
  }

  getEmojis(groupId, skinTone) {
    if (groupId == -1) {
      // Recent emojis
      const recents = EmojiDb.#getRecentEmojis();
      const emojis = recents.map(e => {
        const parts = e.split(':');
        const tone = parts.length > 1 ? parts[1] || 0 : 0;
        return this.getEmoji(parts[0], Number(tone)); 
      }).filter(Boolean);

      return emojis;
    }

    const group = this.#groupMap.get(Number(groupId));
    if (group) {
      return skinTone && group.hasSkinTones ? mapSkinToneOption(group.emojis, skinTone) : group.emojis;
    }
    return [];
  }

  isCombinedEmoji(emoji) {
    return combinedEmojisMap.has(emoji);
  }

  findEmojis(query, skinTone) {
    const term = query.toLowerCase();
    const emojis = this.#data.filter(emoji => 
      emoji.label.toLowerCase().includes(term) ||
      emoji.tags?.some(tag => tag.includes(term)) ||
      emoji.shortcodes?.some(code => code.includes(term))
    );

    return mapSkinToneOption(emojis, skinTone);
  }

  findEmojisByShortcode(shortcode, skinTone) {
    const emojis = this.#data.filter(emoji =>
      emoji.shortcodes?.some(code => code.includes(shortcode))
    );

    return mapSkinToneOption(emojis, skinTone);
  }

  getEmoji(emojiOrCode, skinTone) {
    const emoji = this.#emojiMap.get(emojiOrCode) || 
                  this.#emojiMap.get(emojiOrCode.toLowerCase());
    return tryFindSkin(emoji, skinTone);
  }

  // Add an emoji to recent emoji list
  addRecentEmoji(emojiBase, skinTone) {
    let recents = EmojiDb.#getRecentEmojis();
    let emoji = !skinTone ? emojiBase : `${emojiBase}:${skinTone}`;
    
    // Remove if already exists
    recents = recents.filter(e => e !== emoji);
    
    // Add to beginning
    recents.unshift(emoji);
    
    // Trim to max length
    if (recents.length > maxRecent) {
      recents = recents.slice(0, maxRecent);
    }
    
    // Save to localStorage
    localStorage.setItem('note:emojis:recent', JSON.stringify(recents));
  }

  hasRecentEmojis() {
    return localStorage.getItem('note:emojis:recent') !== null;
  }

  // Get recent emojis
  static #getRecentEmojis() {
    try {
      return JSON.parse(localStorage.getItem('note:emojis:recent')) || [];
    } 
    catch {
      return []; // In case of corrupted data
    }
  }
}
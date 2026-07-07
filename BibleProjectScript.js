// This plugin abides by Google's style guide for JavaScript.

// Platform information
const platform = {
  title: 'BibleProject',
  regular_url: 'https://bibleproject.com',
  url: 'https://www.bibleproject.com/',
  urlShort: 'bibleproject.com',
  icon: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-icon.jpg',
  banner:
    'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-banner.jpg',
  description:
    'BibleProject is a nonprofit, crowdfunded organization that makes ' +
    'free resources like videos, podcasts, articles, and classes to help ' +
    'people experience the Bible in a way that is approachable and ' +
    'transformative.',
};

// Podcast information
const podcast = {
  title: 'BibleProject Podcast',
  channelUrl:
    'https://www.bibleproject.com/podcasts/shows/the-bible-project-podcast/',
  icon: 'https://ik.imagekit.io/bpweb1/web/media/podcast-shows/BP_Show_Podcast_Icon.jpg',
  banner:
    'https://ik.imagekit.io/bpweb1/web/media/podcast-shows/BP_Show_Podcast_Icon.jpg',
  slug: 'the-bible-project-podcast',
};

// Classroom information
const classroom = {
  overviewName: 'Classroom Overview',
  url: 'https://www.bibleproject.com/classroom/',
};

// Classroom session fetch constants
const CLASSROOM_INITIAL_SESSION_LIMIT = 5;
const CLASSROOM_PAGE_START_OFFSET = 6;
const FALLBACK_CLASSROOM_DURATION = 80;

// Caches
const cache = {
  classroomData: null,
  moduleRanges: {},
  sessionCounts: {},
  descriptions: {},
  sessions: {},
  publishDates: {},
};

// State
let config = {};
let settings = {};

/**
 * Configures the plugin with user settings.
 * @param {Object} conf
 * @param {Object} _settings
 */
source.enable = function (conf, _settings) {
  config = conf;
  settings = _settings;
};

/**
 * Returns the home feed of top featured videos.
 * @returns {BibleProjectVideoPager}
 */
source.getHome = function () {
  return getTopVideosPager();
};

/**
 * BibleProject does not provide search suggestions.
 * @param {string} query
 * @returns {Array}
 */
source.searchSuggestions = function (query) {
  return [];
};

/**
 * Returns the search capabilities supported by this plugin.
 * @returns {Object}
 */
source.getSearchCapabilities = function () {
  return {
    types: [Type.Feed.Mixed],
    sorts: [Type.Order.Chronological, '^release_time'],
    filters: [
      {
        id: 'date',
        name: 'Date',
        isMultiSelect: false,
        filters: [
          { id: Type.Date.Today, name: 'Last 24 hours', value: 'today' },
          { id: Type.Date.LastWeek, name: 'Last week', value: 'thisweek' },
          { id: Type.Date.LastMonth, name: 'Last month', value: 'thismonth' },
          { id: Type.Date.LastYear, name: 'Last year', value: 'thisyear' },
        ],
      },
    ],
  };
};

/**
 * Searches all videos across the platform.
 * @param {string} query
 * @param {string} type
 * @param {string} order
 * @param {Object[]} filters
 * @param {string|null} continuationToken
 * @returns {BibleProjectVideoPager}
 */
source.search = function (query, type, order, filters, continuationToken) {
  return getAllVideosPager(
    platform.url,
    type,
    order,
    filters,
    continuationToken,
    query,
  );
};

/**
 * Returns search capabilities for searching within a channel.
 * @returns {Object}
 */
source.getSearchChannelContentsCapabilities = function () {
  return {
    types: [Type.Feed.Mixed],
    sorts: [Type.Order.Chronological],
    filters: [],
  };
};

/**
 * Searches videos within a specific channel.
 * @param {string} url
 * @param {string} query
 * @param {string} type
 * @param {string} order
 * @param {Object[]} filters
 * @param {string|null} continuationToken
 * @returns {BibleProjectVideoPager}
 */
source.searchChannelContents = function (
  url,
  query,
  type,
  order,
  filters,
  continuationToken,
) {
  // Podcast detection
  if (isPodcastChannelUrl(url)) {
    return getPodcastEpisodesPager(
      url,
      type,
      order,
      filters,
      continuationToken,
      query,
    );
  }

  return getAllVideosPager(
    url,
    type,
    order,
    filters,
    continuationToken,
    query,
  );
};

/**
 * Searches for channels matching a query (main, podcast, and classrooms).
 * @param {string} query
 * @returns {ChannelPager}
 */
source.searchChannels = function (query) {
  try {
    const results = []; // Channels
    const queryLC = query.toLowerCase();

    // BibleProject videos channel detection
    if (platform.title.toLowerCase().includes(queryLC)) {
      results.push(getPlatformChannel());
    }

    // BibleProject Podcasts channel detection
    if (podcast.title.toLowerCase().includes(queryLC)) {
      results.push(getPodcastChannel(podcast.slug));
    }

    // BibleProject classrooms detection
    for (const cls of getClassroomClasses()) {
      if (
        ((cls.name || cls.slug) + ' classroom')
          .toLowerCase()
          .includes(queryLC)
      ) {
        results.push(getClassroomChannelData(cls));
      }
    }

    return new ChannelPager(results, false);
  } catch (error) {
    return new ChannelPager([], false);
  }
};

/**
 * Checks if a URL points to a BibleProject channel
 * (main, podcast, or classroom).
 * @param {string} url
 * @returns {boolean}
 */
source.isChannelUrl = function (stringUrl) {
  try {
    const url = new URL(stringUrl);
    const host = url.hostname;
    return (
      (
        host === platform.urlShort || 
        host.endsWith('.' + platform.urlShort)
      ) &&
      classifyUrlPath(
        url.pathname.replace(
          /\/$/,
          ''
        ) || '/'
      ) === 'channel'
    );
  } catch {
    return false;
  }
};

/**
 * Fetches channel details for the given URL (main, podcast, or classroom).
 * @param {string} url
 * @returns {PlatformChannel}
 */
source.getChannel = function (url) {
  if (isPodcastChannelUrl(url)) {
    return getPodcastChannel(podcast.slug);
  }
  if (isClassroomUrl(url)) {
    const slug = url
      .replace(
        classroom.url,
        ''
      )
      .replace(
        /\/$/,
        ''
      );
    const cls = getClassroomClassBySlug(slug);

    if (cls) {
      return getClassroomChannelData(cls);
    }
  }
  return getPlatformChannel();
};

/**
 * Returns videos for a given channel URL.
 * @param {string} url
 * @param {string} type
 * @param {string} order
 * @param {Object[]} filters
 * @param {string|null} continuationToken
 * @returns {BibleProjectVideoPager}
 */
source.getChannelContents = function (
  url,
  type,
  order,
  filters,
  continuationToken,
) {
  if (isPodcastChannelUrl(url)) {
    return getPodcastEpisodesPager(
      url,
      type,
      order,
      filters,
      continuationToken,
    );
  }
  if (isClassroomUrl(url)) {
    return getClassroomSessionsPager(url);
  }
  return getAllVideosPager(
    url,
    type,
    order,
    filters,
    continuationToken,
  );
};

/**
 * Checks if a URL points to a video, session, overview, or podcast episode.
 * @param {string} stringUrl
 * @returns {boolean}
 */
source.isContentDetailsUrl = function (stringUrl) {
  try {
    const url = new URL(stringUrl);
    const host = url.hostname;
    const contentTypes = ['video', 'podcast', 'classroom-session', 'classroom-overview'];
    return (
      (
        host === platform.urlShort ||
        host.endsWith('.' + platform.urlShort)
      ) &&
      contentTypes.includes(
        classifyUrlPath(
          url.pathname.replace(
            /\/$/,
            ''
          )
        )
      )
    );
  } catch {
    return false;
  }
};

/**
 * Fetches full details for a video, session, overview, or podcast episode.
 * @param {string} stringUrl
 * @returns {PlatformVideoDetails}
 */
source.getContentDetails = function (stringUrl) {
  const url = new URL(stringUrl);
  const pathname = url.pathname.replace(
    /\/$/,
    ''
  );
  const segments = pathname.split('/');
  const slug = segments.pop();
  const type = classifyUrlPath(pathname);

  if (type === 'classroom-session') {
    return getClassroomSessionDetails(
      segments[2],
      Number(slug),
      stringUrl,
    );
  }
  if (type === 'classroom-overview') {
    return getClassroomOverviewDetails(
      segments[2],
      stringUrl
    );
  }
  if (type === 'podcast') {
    return getPodcastEpisodeDetails(
      slug,
      stringUrl
    );
  }
  if (type === 'video') {
    return getVideoDetails(
      slug,
      stringUrl
    );
  }

  throw new ScriptException('Unknown URL type: ' + stringUrl);
};

/**
 * Checks if a URL points to a playlist (collection, series, or module).
 * @param {string} stringUrl
 * @returns {boolean}
 */
source.isPlaylistUrl = function (stringUrl) {
  try {
    const url = new URL(stringUrl);
    const host = url.hostname;
    const playlistTypes = ['video-collection', 'classroom-module', 'podcast-series'];
    return (
      (host === platform.urlShort || host.endsWith('.' + platform.urlShort)) &&
      playlistTypes.includes(
        classifyUrlPath(
          url.pathname.replace(
            /\/$/,
            ''
          )
        )
      )
    );
  } catch {
    return false;
  }
};

/**
 * Fetches playlist details (collection, podcast series, or classroom module).
 * @param {string} stringUrl
 * @returns {PlatformPlaylistDetails}
 */
source.getPlaylist = function (stringUrl) {
  const parsedUrl = new URL(stringUrl);
  const pathname = parsedUrl.pathname.replace(
    /\/$/,
    ''
  );
  const type = classifyUrlPath(pathname);

  if (type === 'podcast-series') {
    return getPodcastSeriesPlaylist(stringUrl);
  }
  if (type === 'classroom-module') {
    return getClassroomModulePlaylist(stringUrl);
  }
  if (type === 'video-collection') {
    const slug = pathname.split('/').pop();
    const apiUrl =
      platform.regular_url +
      '/videos/collections/' +
      encodeURIComponent(slug) +
      '.data?_routes=' +
      encodeURIComponent('routes/videos/collections-detail/route');
    const response = httpGET(apiUrl);

    if (!response.isOk) {
      throw new ScriptException(
        'Failed to fetch playlist ' + stringUrl + ' [' + response.code + ']'
      );
    }

    const data = resolveReactRouterData(response.body);
    if (!data || !data.videos) {
      throw new ScriptException('Failed to parse playlist data from response');
    }

    const videoList = Array.isArray(data.videos)
      ? data.videos
      : Object.values(data.videos);
    const videos = videoList.map(getPlatformVideo);

    const thumbnail =
      upgradeThumbnailUrl(data.videos.thumbnail || data.thumbnail) || platform.icon;
    return new PlatformPlaylistDetails({
      id: getPlatformID(data.id || slug),
      name: data.title || slug,
      thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
      author: getPlatformAuthor(),
      url: stringUrl,
      thumbnail: thumbnail,
      description: data.description
        ? data.description.replace(/<[^>]+>/g, '')
        : '',
      videoCount: videos.length,
      contents: new PlaylistContentsPager(videos, false, null),
    });
  }

  throw new ScriptException('Unrecognized playlist URL: ' + stringUrl);
};

/**
 * Searches for playlists across collections and podcast series.
 * @param {string} query
 * @param {string} type
 * @param {string} order
 * @param {Object[]} filters
 * @param {string|null} continuationToken
 * @returns {SomeSearchPlaylistsPager}
 */
source.searchPlaylists = function (
  query,
  type,
  order,
  filters,
  continuationToken,
) {
  const allCollections = getAllCollections();
  const playlists = [];

  // Collections from video index
  for (const collection of allCollections) {
    if (
      !query ||
      collection.title.toLowerCase().includes(query.toLowerCase())
    ) {
      playlists.push(getPlatformPlaylist(collection));
    }
  }

  // Podcast series
  const showData = getPodcastData(
    podcast.slug,
    'show'
  );
  const seriesList = (showData && showData.podcastSeries) || [];
  for (const series of seriesList) {
    if (
    !query ||
    series.title.toLowerCase().includes(query.toLowerCase())
    ) {
      const thumbnail = upgradeThumbnailUrl(
        (series.images &&
          (
            series.images.artwork ||
            series.images.preview
          )
        ) ||
        podcast.icon
      );
      playlists.push(
        new PlatformPlaylist({
          id: getPlatformID(series.id),
          author: new PlatformAuthorLink(
            getPlatformID(podcast.slug),
            podcast.title,
            podcast.channelUrl,
            podcast.icon,
          ),
          name: series.title,
          thumbnail: thumbnail,
          videoCount: series.episodeCount || 0,
          url: series.href
            ? platform.regular_url + series.href
            : podcast.channelUrl,
        }),
      );
    }
  }

  return new SomeSearchPlaylistsPager(
    playlists,
    false,
    {
      query: query,
      type: type,
      order: order,
      filters: filters,
      continuationToken: continuationToken,
    },
  );
};

/**
 * Returns playlists for a given channel URL
 * (podcast series, collections, or classroom modules).
 * @param {string} url
 * @returns {BibleProjectPlaylistPager}
 */
source.getChannelPlaylists = function (url) {
  if (
    url === podcast.channelUrl ||
    url === podcast.channelUrl.replace(
      /\/$/,
      ''
    )
  ) {
    // Podcast channel: return series as playlists
    const showData = getPodcastData(podcast.slug, 'show');
    const seriesList = (showData && showData.podcastSeries) || [];
    const playlists = [];
    for (const series of seriesList) {
      const thumbnail = upgradeThumbnailUrl(
        (series.images &&
          (series.images.artwork || series.images.preview)) ||
        podcast.icon
      );
      playlists.push(
        new PlatformPlaylist({
          id: getPlatformID(series.id),
          author: new PlatformAuthorLink(
            getPlatformID(podcast.slug),
            podcast.title,
            podcast.channelUrl,
            podcast.icon,
          ),
          name: series.title,
          thumbnail: thumbnail,
          videoCount: series.episodeCount || 0,
          url: series.href
            ? platform.regular_url + series.href
            : podcast.channelUrl,
        }),
      );
    }
    return new BibleProjectPlaylistPager(playlists, false);
  }
  if (url === platform.url) {
    // Main channel: return collections as playlists
    const allCollections = getAllCollections();
    const playlists = [];
    for (const collection of allCollections) {
      playlists.push(getPlatformPlaylist(collection));
    }
    return new BibleProjectPlaylistPager(playlists, false);
  }
  if (isClassroomUrl(url)) {
    // Classroom channel: return modules as playlists
    const slug = url
      .replace(
        classroom.url,
        ''
      )
      .replace(
        /\/$/,
        ''
      );
    const cls = getClassroomClassBySlug(slug);
    if (!cls) {
      return new BibleProjectPlaylistPager([], false);
    }
    const artwork = upgradeThumbnailUrl(
      cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
    );
    const channelName = (cls.name || cls.slug) + ' Classroom';
    const channelId = getPlatformID(cls.slug);
    const modules = getClassroomModuleRanges(slug);
    const playlists = [];
    for (const mod of modules) {
      const moduleUrl =
        platform.regular_url +
        '/classroom/' +
        encodeURIComponent(slug) +
        '/modules/' +
        mod.n +
        '/';
      const videoCount = mod.end - mod.start + 1;
      const firstSessionData = getClassroomSessionData(slug, mod.start);
      const modThumbnail =
        (firstSessionData && firstSessionData.thumbnail) || artwork;
      playlists.push(
        new PlatformPlaylist({
          id: getPlatformID(cls.slug + '-module-' + mod.n),
          author: new PlatformAuthorLink(
            channelId,
            channelName,
            url,
            artwork,
          ),
          name: 'Module ' + mod.n,
          thumbnail: modThumbnail,
          videoCount: videoCount,
          url: moduleUrl,
        }),
      );
    }
    return new BibleProjectPlaylistPager(playlists, false);
  }
  return new BibleProjectPlaylistPager([], false);
};

/**
 * Fetches and caches classroom API data (classes, categories, hero).
 * Uses a mobile User-Agent to bypass AWS WAF.
 * @returns {Object} Resolved classroom data object, or {} on failure
 */
function fetchClassroomData() {
  if (cache.classroomData) {
    return cache.classroomData;
  }
  const apiUrl = platform.regular_url + '/classroom.data';
  const response = httpGET(apiUrl, true);

  if (!response.isOk) {
    cache.classroomData = {};
    return cache.classroomData;
  }
  const resolved = resolveReactRouterData(response.body);

  if (!resolved) {
    cache.classroomData = {};
    return cache.classroomData;
  }

  // Normalize data: the API may return categories at root level (old format)
  // or nested under page.content.classes.categories (new format).
  // Also hero may be at page.hero or page.content.hero.
  if (!resolved.categories && resolved.page?.content?.classes?.categories) {
    resolved.categories = resolved.page.content.classes.categories;
  }
  if (!resolved.page?.hero && resolved.page?.content?.hero) {
    resolved.page.hero = resolved.page.content.hero;
  }

  if (!resolved.categories) {
    cache.classroomData = {};
    return cache.classroomData;
  }
  for (let i = 0; i < resolved.categories.length; ++i) {
    const category = resolved.categories[i];

    if (category.classes) {
      for (let j = 0; j < category.classes.length; ++j) {
        const cls = category.classes[j];

        if (!cls.name && cls.title) {
          cls.name = cls.title;
        }
        if (cls.artwork && cls.artwork[0] && cls.artwork[0].url) {
          cls.artwork[0].url = cls.artwork[0].url.replace(
            '-wide.',
            '-square.'
          );
        }
      }
    }
  }
  cache.classroomData = resolved;
  return cache.classroomData;
}

/**
 * Returns the flat list of all cls classes across all categories.
 * @returns {Object[]}
 */
function getClassroomClasses() {
  const data = fetchClassroomData();
  if (!data.categories) {
    return [];
  }
  const classes = [];
  for (const category of data.categories) {
    if (category.classes) {
      for (const cls of category.classes) {
        classes.push(cls);
      }
    }
  }
  return classes;
}

/**
 * Finds a cls class by its URL slug.
 * @param {string} slug - Class slug
 * @returns {Object|null}
 */
function getClassroomClassBySlug(slug) {
  const classes = getClassroomClasses();
  for (const cls of classes) {
    if (cls.slug === slug) {
      return cls;
    }
  }
  return null;
}

/**
 * Fetches a cls class page and extracts its description.
 * Prefers og:description over meta description for richer text.
 * Results are cached by slug.
 * @param {string} slug - Class slug
 * @returns {string|null}
 */
function getClassroomDescription(slug) {
  if (slug in cache.descriptions) {
    return cache.descriptions[slug];
  }
  const pageUrl =
    platform.regular_url + '/classroom/' + encodeURIComponent(slug) + '/';
  const response = httpGET(pageUrl, true, true);
  if (!response.isOk) {
    cache.descriptions[slug] = null;
    return null;
  }
  const ogMatch = response.body.match(
    /<meta\s+property="og:description"\s+content="([^"]*)"/,
  );
  const metaMatch = response.body.match(
    /<meta\s+name="description"\s+content="([^"]*)"/,
  );
  const desc = (ogMatch && ogMatch[1]) || (metaMatch && metaMatch[1]) || null;
  cache.descriptions[slug] = desc;
  return desc;
}

/**
 * Builds a PlatformChannel for a classroom class.
 * @param {Object} cls - Class object from cls API
 * @returns {PlatformChannel}
 */
function getClassroomChannelData(cls) {
  const artwork = upgradeThumbnailUrl(
    cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
  );
  const teacher = cls.teacher && cls.teacher.name ? cls.teacher.name : '';
  const metaDesc = getClassroomDescription(cls.slug);
  const description =
    metaDesc ||
    (cls.scripture ? cls.scripture + ' \u2014 ' + teacher : teacher);
  return getPlatformChannel({
    id: getPlatformID(cls.slug),
    name: (cls.name || cls.slug) + ' Classroom',
    thumbnail: artwork,
    banner: artwork,
    description: description,
    url: classroom.url + cls.slug + '/',
  });
}

/**
 * Consolidated HTTP GET with configurable Accept and mobile User-Agent.
 * @param {string} url - Request URL
 * @param {boolean} [mobile] - Add mobile User-Agent header
 * @param {boolean} [html] - Use text/html Accept instead of application/json
 * @returns {Object} HTTP response object
 */
function httpGET(url, mobile, html) {
  const headers = { Accept: html ? 'text/html' : 'application/json' };
  if (mobile) {
    headers['User-Agent'] =
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 ' +
      'Chrome/120.0.0.0 Mobile Safari/537.36';
  }

  return http.GET(url, headers);
}

/**
 * Checks if a URL matches the BibleProject Podcast channel URL
 * (with or without trailing slash).
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isPodcastChannelUrl(url) {
  return (
    url === podcast.channelUrl ||
    url === podcast.channelUrl.replace(
      /\/$/,
      ''
    )
  );
}

/**
 * Checks whether a URL points to a classroom page.
 * @param {string} url
 * @returns {boolean}
 */
function isClassroomUrl(url) {
  return url.startsWith(classroom.url);
}

/**
 * Classifies a BibleProject URL pathname by content type.
 * Checks more specific patterns first before falling back to broader types.
 * @param {string} pathname - URL pathname with trailing slash stripped
 * @returns {string|null} 'channel', 'video-collection', 'classroom-module',
 *   'podcast-series', 'classroom-overview', 'podcast', or null for unrecognized paths
 */
function classifyUrlPath(pathname) {
  if (pathname.startsWith('/videos/')) {
    if (
      pathname === '/videos/' ||
      pathname === '/videos/all' ||
      pathname === '/videos/collections'
    ) {
      return null;
    }
    if (pathname.startsWith('/videos/collections/')) {
      return 'video-collection';
    }
    return 'video';
  }
  if (pathname.startsWith('/classroom/')) {
    if (/\/modules\/\d+/.test(pathname)) {
      return 'classroom-module';
    }
    if (/\/sessions\/\d+/.test(pathname)) {
      return 'classroom-session';
    }
    if (pathname.endsWith('/overview')) {
      return 'classroom-overview';
    }
    const afterClassroom = pathname.slice('/classroom/'.length);
    if (afterClassroom && !afterClassroom.includes('/')) {
      return 'channel';
    }
    return null;
  }
  if (pathname.startsWith('/podcasts/')) {
    if (
      pathname === '/podcasts/' ||
      pathname === '/podcasts/series' ||
      pathname === '/podcasts/shows'
    ) {
      return null;
    }
    if (/^\/podcasts\/series\/.+/.test(pathname)) {
      return 'podcast-series';
    }
    if (pathname.startsWith('/podcasts/shows/')) {
      return 'channel';
    }
    return 'podcast';
  }
  if (pathname === '/' || pathname === '') {
    return 'channel';
  }
  return null;
}

/**
 * Parses React Router data endpoint serialization format.
 * @param {string} responseText - Raw JSON from a React Router data endpoint
 * @returns {Object|null} Resolved data object, or null if not found
 */
function resolveReactRouterData(responseText) {
  const RE_REF_KEY = /^_\d+$/;
  // Parse the JSON array — each element is a primitive or a reference object
  const root = JSON.parse(responseText);

  // Recursively resolve numeric references in the array
  function resolve(val) {
    // Arrays: resolve each element, replacing numeric indices with values
    if (Array.isArray(val)) {
      return val.map((v) => {
        if (typeof v === 'number') {
          return resolve(root[v]);
        }
        return resolve(v);
      });
    }
    // Objects: could be a reference map (_N keys) or a regular data object
    if (val !== null && typeof val === 'object') {
      const keys = Object.keys(val);
      // Reference objects use _0, _1, etc. as keys — resolve both keys
      // and values from the root array
      if (keys.length > 0 && keys.every((k) => RE_REF_KEY.test(k))) {
        const obj = {};
        for (const k of keys) {
          const numIdx = Number(k.slice(1));
          const actualKey = resolve(root[numIdx]);
          const actualValue = resolve(root[val[k]]);
          obj[actualKey] = actualValue;
        }
        return obj;
      }
      // Regular object: resolve all values recursively
      const obj = {};
      for (const [k, v] of Object.entries(val)) {
        obj[k] = resolve(v);
      }
      return obj;
    }
    return val;
  }

  // Normalize route names by stripping common prefixes for comparison
  function normalizedRoute(routeName) {
    let name = routeName.replace(
      /^routes\//,
      ''
    );
    name = name.replace(
      /\/route$/,
      ''
    );
    return name;
  }

  // Resolve root[0] which maps all route paths to their data.
  // This is the standard Remix/React Router serialization format.
  const topLevel = resolve(root[0]);

  if (topLevel && typeof topLevel === 'object') {
    for (const routeName in topLevel) {
      if (topLevel.hasOwnProperty(routeName) &&
          normalizedRoute(routeName).indexOf('classroom') !== -1) {
        const routeEntry = topLevel[routeName];
        if (routeEntry && typeof routeEntry === 'object' && routeEntry.data) {
          return routeEntry.data;
        }
      }
    }
  }

  // Fallback: find the first "data" entry in the root array
  for (let i = 1; i < root.length; i++) {
    if (root[i] === 'data' && i + 1 < root.length) {
      const dataObj = root[i + 1];
      if (dataObj !== null && typeof dataObj === 'object') {
        return resolve(dataObj);
      }
    }
  }
  return null;
}

/**
 * Extracts the window.__remixContext JSON payload from an HTML page
 * by tracking brace depth after the known marker string.
 * @param {string} html - Page HTML
 * @returns {Object|null} Parsed context object, or null if not found
 */
function extractRemixContext(html) {
  const startMarker = 'window.__remixContext = ';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    return null;
  }

  const jsonStart = startIdx + startMarker.length;

  // Walk through the JSON string by tracking brace depth to find the
  // matching close-brace of the top-level object.
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') {
      depth++;
    } else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonEnd === -1) {
    return null;
  }

  try {
    return JSON.parse(html.substring(jsonStart, jsonEnd + 1));
  } catch (e) {
    return null;
  }
}

/**
 * Fetches the real module boundaries for a cls class from its HTML page,
 * which embeds the data in window.__remixContext. Falls back to a heuristic
 * based on total session count if the page fetch fails.
 * Results are cached by slug.
 * @param {string} slug - Class slug
 * @returns {Array.<{n: number, start: number, end: number}>}
 */
function getClassroomModuleRanges(slug) {
  if (slug in cache.moduleRanges) {
    return cache.moduleRanges[slug];
  }

  // Attempt to fetch real module boundaries from the cls page HTML.
  try {
    const pageUrl =
      platform.regular_url + '/classroom/' + encodeURIComponent(slug) + '/';

    const response = httpGET(pageUrl, true, true);

    const ctx = extractRemixContext(response.body);
    const cls = ctx.state.loaderData['routes/$class'].class;
    const ranges = [];
    let maxPos = 0;

    // Each module has an ordered list of sessions — the module's range spans
    // from its first session's position to its last.
    for (const node of cls.modules.nodes) {
      const sessions = node.sessions && node.sessions.nodes;
      if (sessions && sessions.length > 0) {
        const end = sessions[sessions.length - 1].position;
        if (end > maxPos) maxPos = end;
        ranges.push({
          n: node.position,
          start: sessions[0].position,
          end: end,
        });
      }
    }

    if (ranges.length > 0) {
      cache.moduleRanges[slug] = ranges;
      cache.sessionCounts[slug] = maxPos;
      return ranges;
    }
  } catch (e) {
    // Network failure or non-cls page — fall through to heuristic
  }

  // Fallback: estimate module ranges from total session count.
  // Try API data first, or check the sessionCounts cache from a prior
  // successful HTML fetch, or probe individual session pages.
  let sessionCount = 0;
  const fallbackCls = getClassroomClassBySlug(slug);
  if (fallbackCls && fallbackCls.sessionCount) {
    sessionCount = fallbackCls.sessionCount;
  } else if (slug in cache.sessionCounts) {
    sessionCount = cache.sessionCounts[slug];
  } else {
    // Probe session positions until we find one that doesn't exist
    for (let i = 1; i <= 50; i++) {
      const data = getClassroomSessionData(slug, i);
      if (!data) break;
      sessionCount = i;
    }
    if (sessionCount > 0) {
      cache.sessionCounts[slug] = sessionCount;
    }
  }

  const fallbackRanges = getClassModuleRanges(sessionCount);
  cache.moduleRanges[slug] = fallbackRanges;
  return fallbackRanges;
}

/**
 * Heuristic module range calculation as fallback when real data is unavailable.
 * Distributes sessions across 4 modules, biasing toward middle modules (2,3)
 * since BibleProject classes typically have smaller intro and wrap-up modules.
 * @param {number} sessionCount - Total number of sessions in the class
 * @returns {Array.<{n: number, start: number, end: number}>}
 */
function getClassModuleRanges(sessionCount) {
  // Zero sessions — nothing to return.
  if (sessionCount <= 0) {
    return [];
  }

  // Fewer than 6 sessions — everything fits in one module.
  if (sessionCount <= 5) {
    return [{ n: 1, start: 1, end: sessionCount }];
  }

  // 6–12 sessions — split into two equal-ish modules.
  if (sessionCount <= 12) {
    const mid = Math.ceil(sessionCount / 2);
    return [
      { n: 1, start: 1, end: mid },
      { n: 2, start: mid + 1, end: sessionCount },
    ];
  }

  // 13+ sessions — distribute across 4 modules, biasing extra sessions
  // toward middle modules (2, 3) since BibleProject classes tend to have
  // smaller intro and wrap-up modules.
  const base = Math.floor(sessionCount / 4);
  const rem = sessionCount % 4;

  const sizes = [
    base + (rem === 3 ? 1 : 0), // module 1 (intro)
    base + (rem >= 1 ? 1 : 0), // module 2 (body)
    base + (rem >= 2 ? 1 : 0), // module 3 (body)
    base, // module 4 (wrap-up)
  ];

  const modules = [];
  let start = 1;
  for (let n = 0; n < 4; n++) {
    modules.push({ n: n + 1, start: start, end: start + sizes[n] - 1 });
    start += sizes[n];
  }
  return modules;
}

/**
 * Fetches the overview page data for a specific class.
 * @param {string} slug - Class slug
 * @returns {Object|null} Class data with media, artwork, etc. from the overview page
 */
function getClassOverviewPageData(slug) {
  const pageUrl =
    platform.regular_url +
    '/classroom/' +
    encodeURIComponent(slug) +
    '/overview/';
  const response = httpGET(pageUrl, true, true);
  if (!response.isOk) return null;
  const ctx = extractRemixContext(response.body);
  if (!ctx) return null;
  return ctx.state?.loaderData?.['routes/$class']?.class || null;
}

/**
 * Fetches the hero video for a cls overview page.
 * @param {string} slug - Class slug
 * @returns {PlatformVideo|null}
 */
function getClassroomOverviewVideo(slug) {
  const classData = slug ? getClassOverviewPageData(slug) : null;
  if (!classData) return null;

  // Find the TRAILER media entry for the Mux playback ID
  const trailer = (classData.media?.nodes || []).find(
    (m) => m.type === 'TRAILER',
  );

  // Use 16:9 artwork as the thumbnail (prefer CloudFront CDN over ImageKit)
  const artwork16x9 = (classData.artwork || []).find(
    (a) => a.aspectRatio === '16:9',
  );
  const thumbSrc = artwork16x9?.url || classData.artwork?.[0]?.url;
  const channelName = (classData.title || slug) + ' Classroom';

  return new PlatformVideo({
    id: getPlatformID(slug + '-overview'),
    name: classData.title || classroom.overviewName,
    thumbnails: thumbSrc
      ? new Thumbnails([new Thumbnail(upgradeThumbnailUrl(thumbSrc), 0)])
      : new Thumbnails([]),
    author: new PlatformAuthorLink(
      getPlatformID(slug),
      channelName,
      classroom.url + slug + '/',
      upgradeThumbnailUrl(classData.artwork?.[0]?.url) || platform.icon,
    ),
    duration: FALLBACK_CLASSROOM_DURATION,
    url: slug
      ? platform.regular_url +
        '/classroom/' +
        encodeURIComponent(slug) +
        '/overview/'
      : null,
    isLive: false,
  });
}

/**
 * Builds PlatformVideoDetails for a cls overview page.
 * Reuses the campus hero video as the stream source,
 * attributed to the class channel.
 * @param {string} slug - Class slug
 * @param {string} stringUrl - Full overview page URL
 * @returns {PlatformVideoDetails}
 */
function getClassroomOverviewDetails(slug, stringUrl) {
  const classData = getClassOverviewPageData(slug);
  if (!classData) {
    throw new ScriptException(
      'Could not retrieve class overview page for ' + slug,
    );
  }

  // Find the TRAILER media entry for the Mux playback ID
  const trailer = (classData.media?.nodes || []).find(
    (m) => m.type === 'TRAILER',
  );
  const playbackId = trailer?.externalId || null;
  if (!playbackId) {
    throw new ScriptException(
      'Could not retrieve video source for cls overview',
    );
  }

  const channelName = (classData.title || slug) + ' Classroom';
  const artwork16x9 = (classData.artwork || []).find(
    (a) => a.aspectRatio === '16:9',
  );
  const thumbSrc = artwork16x9?.url || classData.artwork?.[0]?.url;

  return getPlatformVideoDetails({
    id: getPlatformID(slug + '-overview'),
    name: classData.title || classroom.overviewName,
    thumbnail: upgradeThumbnailUrl(thumbSrc) || platform.icon,
    author: new PlatformAuthorLink(
      getPlatformID(slug),
      channelName,
      classroom.url + slug + '/',
      upgradeThumbnailUrl(classData.artwork?.[0]?.url) || platform.icon,
    ),
    url: stringUrl,
    duration: FALLBACK_CLASSROOM_DURATION,
    description: classData.description
      ? classData.description.replace(/<[^>]+>/g, '')
      : channelName,
    video: getVideoUrlSource(
      'https://stream.mux.com/' + playbackId + '/high.mp4',
      FALLBACK_CLASSROOM_DURATION,
    ),
  });
}

/**
 * Fetches a cls session page and extracts the Mux playback ID(s),
 * title, and duration from the server-rendered HTML.
 * @param {string} slug - Class slug
 * @param {number} n - Session number (1-indexed)
 * @returns {Object|null} {title, playbackId, duration, thumbnail} or null
 */
function getClassroomSessionData(slug, n) {
  const cacheKey = slug + '/' + n;
  if (cacheKey in cache.sessions) {
    return cache.sessions[cacheKey];
  }

  const sessionUrl =
    platform.regular_url +
    '/classroom/' +
    encodeURIComponent(slug) +
    '/sessions/' +
    n +
    '/';
  const response = httpGET(sessionUrl, true, true);

  if (!response.isOk) {
    cache.sessions[cacheKey] = null;
    return null;
  }

  const html = response.body;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || null;
  let duration = null;
  const timeMatch = html.match(
    /"timeRequired"\s*:\s*"PT(\d+H)?(\d+M)?(\d+S)?"/,
  );
  if (timeMatch) {
    duration =
      (parseInt(timeMatch[1], 10) || 0) * 3600 +
        (parseInt(timeMatch[2], 10) || 0) * 60 +
        (parseInt(timeMatch[3], 10) || 0) || null;
  }
  const thumbnail =
    (html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/) || [])[1] ||
    null;

  // Try extracting from __remixContext for authoritative Mux ID.
  // The playlist array has a type:0 entry for the main video and type:1 for
  // slides/graphics, which is more reliable than regex-based ordering.
  let playbackId = null;
  const ctx = extractRemixContext(html);
  if (ctx && ctx.state && ctx.state.loaderData) {
    for (const key of Object.keys(ctx.state.loaderData)) {
      const data = ctx.state.loaderData[key];
      // Playlist may be at the route data root or nested under session.data.
      let playlist_ = data && data.playlist;
      if (!playlist_ && data && data.session && data.session.data) {
        playlist_ = data.session.data.playlist;
      }
      if (playlist_ && Array.isArray(playlist_)) {
        for (let i = 0; i < playlist_.length; i++) {
          if (playlist_[i].type === 0 && playlist_[i].externalId) {
            playbackId = playlist_[i].externalId;
            break;
          }
        }
        if (playbackId) break;
      }
    }
  }

  // Fallback to regex-based Mux ID extraction.
  if (!playbackId) {
    const muxIds = [];
    const muxRegex = /stream\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.|\/)/g;
    let muxMatch;
    while ((muxMatch = muxRegex.exec(html)) !== null) {
      if (muxIds.indexOf(muxMatch[1]) === -1) {
        muxIds.push(muxMatch[1]);
      }
    }
    playbackId = muxIds.length > 1 ? muxIds[1] : muxIds[0] || null;
  }

  const result = { title, playbackId, duration, thumbnail };
  cache.sessions[cacheKey] = result;
  return result;
}

/**
 * Creates a pager for sessions in a cls class or module.
 * For class URLs, fetches the first 5 sessions eagerly; remaining via nextPage.
 * For module URLs, fetches only the sessions in that module range.
 * @param {string} url - Classroom class or module URL
 * @returns {BibleProjectVideoPager}
 */
function getClassroomSessionsPager(url) {
  const pathAfterClassroom = url
    .replace(
      classroom.url,
      ''
    )
    .replace(
      /\/$/,
      ''
    );
  // Detect module URL pattern: /cls/{slug}/modules/{n}
  const moduleMatch = pathAfterClassroom.match(/^([^/]+)\/modules\/(\d+)$/);
  const slug = moduleMatch ? moduleMatch[1] : pathAfterClassroom;
  const cls = getClassroomClassBySlug(slug);
  if (!cls) {
    return new BibleProjectVideoPager([], false, { url });
  }

  // Session count: prefer API data (old format), then cached from HTML page,
  // then trigger HTML page fetch via getClassroomModuleRanges which caches it.
  const sessionCount = cls.sessionCount ||
    cache.sessionCounts[slug] ||
    (getClassroomModuleRanges(slug), cache.sessionCounts[slug]) ||
    0;
  const artwork = upgradeThumbnailUrl(
    cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
  );
  const channelName = (cls.name || cls.slug) + ' Classroom';

  // Determine session range: for module URLs, use module range;
  // otherwise, use all sessions
  let sessionStart = 1;
  let sessionEnd = sessionCount;
  if (moduleMatch) {
    const moduleN = Number(moduleMatch[2]);
    const modules = getClassroomModuleRanges(slug);
    const mod = modules.find((m) => m.n === moduleN);
    if (mod) {
      sessionStart = mod.start;
      sessionEnd = mod.end;
    }
  }

  const videos = [];

  // Only add overview video for the full class view, not for individual modules
  if (!moduleMatch) {
    const overview = getClassroomOverviewVideo(slug);
    if (overview) {
      videos.push(overview);
    }
  }

  const totalToFetch = sessionEnd - sessionStart + 1;
  // For module views, fetch all sessions eagerly (typically ≤7 per module)
  // For full class view, fetch first 5 eagerly; remaining via nextPage
  const fetchCount =
    moduleMatch || totalToFetch <= CLASSROOM_INITIAL_SESSION_LIMIT
      ? sessionEnd
      : Math.min(
          sessionStart + CLASSROOM_INITIAL_SESSION_LIMIT - 1,
          sessionEnd
        );
  for (let i = sessionStart; i <= fetchCount; i++) {
    const data = getClassroomSessionData(slug, i);
    if (!data) {
      continue;
    }
    videos.push(
      getClassroomSessionPlatformVideo({
        slug,
        i,
        session: data,
        artwork,
        author: new PlatformAuthorLink(
          getPlatformID(),
          channelName,
          url,
          artwork,
        ),
      }),
    );
  }

  // For module views, no continuation needed (all sessions fit in one page)
  const hasMore = moduleMatch ? false : sessionEnd > fetchCount;
  const nextCursor = hasMore ? fetchCount + 1 : null;
  return new BibleProjectVideoPager(videos, hasMore, {
    url: url,
    cursor: nextCursor,
    _classroomSlug: slug,
    _classroomCount: sessionCount,
    _isModule: moduleMatch ? true : false,
  });
}

/**
 * Returns PlatformVideoDetails for a cls session by fetching its HTML page
 * and extracting the Mux playback ID, title, and duration.
 * @param {string} classSlug - Class slug
 * @param {number} sessionNum - Session number
 * @param {string} stringUrl - Full session URL
 * @returns {PlatformVideoDetails}
 */
function getClassroomSessionDetails(classSlug, sessionNum, stringUrl) {
  const data = getClassroomSessionData(classSlug, sessionNum);
  if (!data || !data.playbackId) {
    throw new ScriptException(
      'Could not retrieve video source for cls session ' + stringUrl,
    );
  }
  const cls = getClassroomClassBySlug(classSlug);
  const artwork = upgradeThumbnailUrl(
    cls && cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
  );
  const channelName = cls ? (cls.name || cls.slug) + ' Classroom' : classSlug;
  const teacher =
    cls && cls.teacher && cls.teacher.name ? cls.teacher.name : '';
  const videoUrl = 'https://stream.mux.com/' + data.playbackId + '/high.mp4';
  return getPlatformVideoDetails({
    id: getPlatformID(classSlug + '-session-' + sessionNum),
    name: data.title || 'Session ' + sessionNum,
    thumbnail: upgradeThumbnailUrl(data.thumbnail) || artwork,
    author: new PlatformAuthorLink(
      getPlatformID(),
      channelName,
      classroom.url + classSlug + '/',
      artwork,
    ),
    url: stringUrl,
    duration: data.duration,
    description: channelName + (teacher ? ' \u2014 ' + teacher : ''),
    video: getVideoUrlSource(videoUrl, data.duration),
  });
}

/**
 * Returns PlatformPlaylistDetails for a cls module,
 * populated with its sessions.
 * @param {string} stringUrl - Module URL
 * @returns {PlatformPlaylistDetails}
 */
function getClassroomModulePlaylist(stringUrl) {
  const parsedUrl = new URL(stringUrl);
  const pathParts = parsedUrl.pathname
    .replace(
      /\/$/,
      ''
    )
    .split('/');
  const slug = pathParts[2];
  const moduleN = Number(pathParts[4]);
  const cls = getClassroomClassBySlug(slug);
  if (!cls) {
    throw new ScriptException('Class not found: ' + slug);
  }
  const modules = getClassroomModuleRanges(slug);
  const mod = modules.find((m) => m.n === moduleN);
  if (!mod) {
    throw new ScriptException(
      'Module ' + moduleN + ' not found for class ' + slug,
    );
  }
  const artwork = upgradeThumbnailUrl(
    cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
  );
  const channelName = (cls.name || cls.slug) + ' Classroom';
  const videos = [];
  for (let i = mod.start; i <= mod.end; i++) {
    const data = getClassroomSessionData(slug, i);
    if (!data) {
      continue;
    }
    videos.push(
      getClassroomSessionPlatformVideo({
        slug,
        i,
        session: data,
        artwork,
        author: new PlatformAuthorLink(
          getPlatformID(cls.slug),
          channelName,
          classroom.url + slug + '/',
          artwork,
        ),
      }),
    );
  }
  const firstSessionData = getClassroomSessionData(slug, mod.start);
  const modThumbnail =
    upgradeThumbnailUrl(firstSessionData && firstSessionData.thumbnail) || artwork;
  return new PlatformPlaylistDetails({
    id: getPlatformID(slug + '-module-' + moduleN),
    name: 'Module ' + moduleN,
    thumbnails: new Thumbnails([new Thumbnail(modThumbnail, 0)]),
    author: new PlatformAuthorLink(
      getPlatformID(cls.slug),
      channelName,
      classroom.url + slug + '/',
      artwork,
    ),
    url: stringUrl,
    videoCount: videos.length,
    contents: new PlaylistContentsPager(videos, false, null),
  });
}

/**
 * Extracts a video slug from a href path like "/videos/slug-name/".
 * @param {string} href - URL path from an API response entry
 * @returns {string|null}
 */
function extractSlug(href) {
  if (!href) {
    return null;
  }
  return href
    .replace(
      /\/$/,
      ''
    )
    .split('/')
    .pop();
}

/**
 * Upgrades ImageKit CDN thumbnail URLs by stripping low-quality transform parameters.
 * BibleProject's API returns intentionally small thumbnails (e.g. tr:q-65,w-300)
 * for website performance. Stripping the tr: segment gives full original quality.
 * Non-ImageKit URLs are returned unchanged.
 * @param {string} url - Original thumbnail URL from the API
 * @returns {string} High-quality URL
 */
function upgradeThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Only process ImageKit CDN URLs for the BibleProject CDN
  if (!url.includes('ik.imagekit.io/bpweb1')) return url;
  // Strip the tr:... transform segment to get the original uploaded image at full quality
  return url.replace(/\/tr:[^/]*\//, '/');
}

/**
 * Fetches a single video's publish date by making a detail endpoint request.
 * Results are cached by slug.
 * @param {string} slug - Video slug
 * @returns {number|null} Unix timestamp in seconds, or null
 */
function getVideoPublishDate(slug) {
  if (!slug) {
    return null;
  }
  if (slug in cache.publishDates) {
    return cache.publishDates[slug];
  }

  // Fetch the video detail endpoint which includes publishDate
  const apiUrl =
    platform.regular_url +
    '/videos/' +
    encodeURIComponent(slug) +
    '.data?_routes=' +
    encodeURIComponent('routes/videos/detail/route');
  const response = httpGET(apiUrl);

  if (!response.isOk) {
    cache.publishDates[slug] = null;
    return null;
  }

  const date = resolveReactRouterData(response.body)?.video?.publishDate;

  // Convert ISO date string to Unix timestamp in seconds
  const result = (date && Math.round(new Date(date).getTime() / 1000)) || null;
  cache.publishDates[slug] = result;
  return result;
}

/**
 * Fetches real bitrate from a Mux HLS streaming manifest.
 * @param {string} playbackId - Mux playback ID
 * @returns {number|null} Highest bandwidth found, or null
 */
function getMuxBitrate(playbackId) {
  const manifestUrl =
    'https://stream.mux.com/' + encodeURIComponent(playbackId) + '.m3u8';
  const response = http.GET(manifestUrl, {
    Accept: 'application/vnd.apple.mpegurl',
  });

  if (!response.isOk) {
    return null;
  }

  const bwRegex = /BANDWIDTH=(\d+)/g;
  let match;
  let maxBitrate = 0;

  while ((match = bwRegex.exec(response.body)) !== null) {
    const bw = Number(match[1]);
    if (bw > maxBitrate) {
      maxBitrate = bw;
    }
  }

  return maxBitrate || null;
}

/**
 * Fetches paginated video listings from the videos/all endpoint.
 * @param {string} url - Page URL
 * @param {string} type - Feed type
 * @param {string} order - Sort order
 * @param {Object} filters - Active filters
 * @param {string|null} continuationToken - Cursor for pagination
 * @param {string|null} query - Optional text filter
 * @returns {BibleProjectVideoPager}
 */
function getAllVideosPager(
  url,
  type,
  order,
  filters,
  continuationToken,
  query,
) {
  const sort = mapSortOrder(order);
  let apiUrl = platform.regular_url + '/videos/all.data?';
  const params = [];

  if (continuationToken) {
    params.push('cursor=' + encodeURIComponent(continuationToken));
  }

  params.push('sort=' + encodeURIComponent(sort));
  params.push('_routes=' + encodeURIComponent('routes/videos/all/route'));

  apiUrl += params.join('&');

  const response = httpGET(apiUrl);

  if (!response.isOk) {
    throw new ScriptException(`Failed to retrieve videos [${response.code}]`);
  }

  const data = resolveReactRouterData(response.body);

  if (!data || !data.videosRange) {
    throw new ScriptException('Failed to parse video data from response');
  }

  const videosRange = data.videosRange;
  const rawVideos = videosRange.videos || [];
  const hasMore = videosRange.hasMore || false;
  const nextCursor = videosRange.cursor || null;

  const videos = [];

  for (const video of rawVideos) {
    // Client-side filter when searching videos by text query
    if (query && !video.title.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }

    videos.push(getPlatformVideo(video));
  }

  return new BibleProjectVideoPager(videos, hasMore, {
    url,
    type,
    order,
    filters,
    cursor: nextCursor,
    query,
  });
}

/**
 * Fetches top featured videos from the videos index for the home feed.
 * @returns {BibleProjectVideoPager}
 */
function getTopVideosPager() {
  const response = httpGET(
    platform.regular_url +
      '/videos.data?_routes=' +
      encodeURIComponent('routes/videos/index/route'),
  );

  if (!response.isOk) {
    throw new ScriptException(
      `Failed to retrieve home feed [${response.code}]`,
    );
  }

  const data = resolveReactRouterData(response.body);

  if (!data || !data.topVideos) {
    throw new ScriptException('Failed to parse home feed from response');
  }

  return new BibleProjectVideoPager(
    (data.topVideos || []).map(getPlatformVideo),
    true,
    {
      url: platform.url,
      type: Type.Feed.Mixed,
      order: Type.Order.Chronological,
    },
  );
}

/**
 * Creates a PlatformID for BibleProject content.
 * @param {string} [id] - Unique content ID within the platform
 * @returns {PlatformID}
 */
function getPlatformID(id) {
  return new PlatformID(platform.title, id || platform.title, config.id);
}

/**
 * Creates a PlatformAuthorLink for the main BibleProject channel.
 * @returns {PlatformAuthorLink}
 */
function getPlatformAuthor() {
  return new PlatformAuthorLink(
    getPlatformID(),
    platform.title,
    platform.url,
    platform.icon,
  );
}

/**
 * Normalizes a raw video object into Grayjay's PlatformVideo format.
 * @param {Object} video - Raw video data
 * @returns {PlatformVideo}
 */
function getPlatformVideo(video) {
  const slug = video.href ? extractSlug(video.href) : null;
  const thumbSrc = upgradeThumbnailUrl(
    video.artwork?.src ||
    (video.images && (video.images.aspect16x9 || video.images.thumbnail || video.images.artwork)) ||
    null
  );
  return new PlatformVideo({
    id: getPlatformID(slug || video.id || video.href || platform.title),
    name: video.title || 'Unknown',
    thumbnails: thumbSrc
      ? new Thumbnails([new Thumbnail(thumbSrc, 0)])
      : new Thumbnails([]),
    author: getPlatformAuthor(),
    datetime: slug ? getVideoPublishDate(slug) : null,
    duration: video.durationSeconds || null,
    viewCount: null,
    url: video.href ? platform.regular_url + video.href : null,
    isLive: false,
  });
}

/**
 * Normalizes detail fields into Grayjay's PlatformVideoDetails format.
 * Handles thumbnail wrapping, name fallback, and common defaults.
 * @param {Object} opts
 * @param {PlatformID} opts.id
 * @param {string} [opts.name]
 * @param {string} [opts.thumbnail] - URL for the single thumbnail entry
 * @param {PlatformAuthorLink} opts.author
 * @param {string} opts.url
 * @param {number} [opts.uploadDate] - Unix timestamp in seconds
 * @param {number} [opts.duration] - Duration in seconds
 * @param {string} [opts.description]
 * @param {VideoSourceDescriptor} opts.video
 * @returns {PlatformVideoDetails}
 */
function getPlatformVideoDetails(opts) {
  return new PlatformVideoDetails({
    id: opts.id,
    name: opts.name || 'Unknown',
    thumbnails: opts.thumbnail
      ? new Thumbnails([new Thumbnail(opts.thumbnail, 0)])
      : new Thumbnails([]),
    author: opts.author,
    url: opts.url,
    uploadDate: opts.uploadDate || null,
    duration: opts.duration || null,
    description: opts.description || '',
    isLive: false,
    video: opts.video,
  });
}

/**
 * Fetches podcast data from the specified endpoint type.
 * @param {string} slug - Episode, show, or series slug
 * @param {string} type - 'episode', 'show', or 'series'
 * @returns {Object|null} Parsed response data, or null
 */
function getPodcastData(slug, type) {
  const configs = {
    episode: {
      path: '/podcasts/',
      route: 'routes/podcasts/episode-detail/route',
    },
    show: {
      path: '/podcasts/shows/',
      route: 'routes/podcasts/show-detail/route',
    },
    series: {
      path: '/podcasts/series/',
      route: 'routes/podcasts/series-detail/route',
    },
  };
  const apiUrl =
    platform.regular_url +
    configs[type].path +
    encodeURIComponent(slug) +
    '.data?_routes=' +
    encodeURIComponent(configs[type].route);
  const response = httpGET(apiUrl);
  return (response.isOk && resolveReactRouterData(response.body)) || null;
}

/**
 * Builds a PlatformChannel for the BibleProject Podcast using cached show data.
 * @param {string} slug - Podcast show slug
 * @returns {PlatformChannel}
 */
function getPodcastChannel(slug) {
  const data = getPodcastData(slug, 'show');
  const show = data && data.podcastShow;
  return getPlatformChannel({
    id: getPlatformID(show ? show.id : slug),
    name: show ? show.title : podcast.title,
    thumbnail: show?.images?.artwork || podcast.icon,
    banner: show?.images?.preview || podcast.banner,
    description: show?.descriptionHtml
      ? show.descriptionHtml.replace(
          /<[^>]+>/g,
          ''
        )
      : '',
    url: podcast.channelUrl,
  });
}

/**
 * Builds a paginated episode list for the podcast channel.
 * Fetches from the show-detail endpoint with cursor-based pagination.
 * @param {string} url - Channel URL
 * @param {string} type - Feed type
 * @param {string} order - Sort order
 * @param {Object} filters - Active filters
 * @param {string|null} continuationToken - Cursor for pagination
 * @param {string|null} query - Optional text filter
 * @returns {PodcastEpisodesPager}
 */
function getPodcastEpisodesPager(
  url,
  type,
  order,
  filters,
  continuationToken,
  query,
) {
  let apiUrl =
    platform.regular_url +
    '/podcasts/shows/' +
    encodeURIComponent(podcast.slug) +
    '.data?_routes=' +
    encodeURIComponent('routes/podcasts/show-detail/route') +
    '&sort=newest&tab=episodes';

  if (continuationToken) {
    apiUrl += '&cursor=' + encodeURIComponent(continuationToken);
  }

  const response = httpGET(apiUrl);
  if (!response.isOk) {
    throw new ScriptException(
      `Failed to retrieve podcast episodes [${response.code}]`,
    );
  }

  const range = resolveReactRouterData(response.body)?.podcastEpisodesRange;
  if (!range) {
    throw new ScriptException('Failed to parse podcast episodes from response');
  }

  const rawEpisodes = Array.isArray(range)
    ? range
    : range.episodes || range.videos || [];
  const hasMore = range.hasMore || false;
  const nextCursor = range.cursor || null;

  const show = getPodcastData(podcast.slug, 'show')?.podcastShow;
  const showArtwork = show?.images?.artwork || podcast.icon;
  const showTitle = show?.title || podcast.title;
  const authorInfo = { name: showTitle, artwork: showArtwork };

  const episodes = [];
  for (const episode of rawEpisodes) {
    if (query && !episode.title.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }
    episodes.push(getPodcastEpisodePlatformVideo(episode, authorInfo));
  }

  return new PodcastEpisodesPager(episodes, hasMore, {
    url,
    type,
    order,
    filters,
    cursor: nextCursor,
    query,
  });
}

/**
 * Creates a PlatformVideo for a podcast episode listing.
 * @param {Object} episode - Raw podcast episode data
 * @param {Object} authorInfo - Object with {name, artwork}
 * @returns {PlatformVideo}
 */
function getPodcastEpisodePlatformVideo(episode, authorInfo) {
  const publishDate = episode.publishedAt
    ? Math.round(new Date(episode.publishedAt).getTime() / 1000)
    : null;
  const thumbnail = upgradeThumbnailUrl(
    (episode.images && (episode.images.artwork || episode.images.thumbnail)) ||
    platform.icon
  );
  return new PlatformVideo({
    id: getPlatformID(episode.id),
    name: episode.title || 'Unknown',
    thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
    author: new PlatformAuthorLink(
      getPlatformID(podcast.slug),
      authorInfo.name,
      podcast.channelUrl,
      authorInfo.artwork,
    ),
    datetime: publishDate,
    duration: episode.durationSeconds || null,
    viewCount: null,
    url: episode.href ? platform.regular_url + episode.href : null,
    isLive: false,
  });
}

/**
 * Fetches and constructs PlatformVideoDetails for a podcast episode by slug.
 * @param {string} slug - Episode slug from URL
 * @param {string} stringUrl - Full episode URL
 * @returns {PlatformVideoDetails}
 */
function getPodcastEpisodeDetails(slug, stringUrl) {
  const episode = getPodcastData(slug, 'episode')?.podcastEpisode;
  if (!episode) {
    throw new ScriptException(
      `Failed to parse podcast episode data for ${stringUrl}`,
    );
  }

  const show = getPodcastData(podcast.slug, 'show')?.podcastShow;
  const showArtwork = show?.images?.artwork || podcast.icon;
  const showTitle = show?.title || podcast.title;

  const chapters = episode.chapters || [];
  const duration =
    chapters.length > 0
      ? chapters[chapters.length - 1].endSeconds
      : parseFormattedDuration(episode.formattedDuration);
  const thumbnail = upgradeThumbnailUrl(
    (episode.images && (episode.images.artwork || episode.images.thumbnail)) ||
    podcast.icon
  );
  const audioUrl = episode.path || null;
  const uploadDate = episode.formattedPublishDate
    ? Math.round(new Date(episode.formattedPublishDate).getTime() / 1000)
    : null;

  return getPlatformVideoDetails({
    id: getPlatformID(episode.id),
    name: episode.title,
    thumbnail: thumbnail,
    author: new PlatformAuthorLink(
      getPlatformID(podcast.slug),
      showTitle,
      podcast.channelUrl,
      showArtwork,
    ),
    url: stringUrl,
    uploadDate: uploadDate,
    duration: duration,
    description: episode.descriptionHtml
      ? episode.descriptionHtml.replace(
          /<[^>]+>/g,
          ''
        )
      : '',
    video: new UnMuxVideoSourceDescriptor(
      [],
      [
        new AudioUrlSource({
          container: 'audio/mpeg',
          codecs: 'mp3',
          name: 'Podcast Audio',
          bitrate: 128000,
          duration: duration || 999999,
          url: audioUrl,
          language: 'en',
        }),
      ],
    ),
  });
}

/**
 * Creates a PlatformVideo for a classroom session listing.
 * The author link is passed in directly since it varies per caller.
 * @param {Object} opts - Options object
 * @param {string} opts.slug - Class slug
 * @param {number} opts.i - Session number (1-indexed)
 * @param {Object} opts.session - Session data with title, thumbnail, duration
 * @param {string} opts.artwork - Fallback artwork URL
 * @param {PlatformAuthorLink} opts.author - Pre-constructed author link
 * @returns {PlatformVideo}
 */
function getClassroomSessionPlatformVideo(opts) {
  return new PlatformVideo({
    id: getPlatformID(opts.slug + '-session-' + opts.i),
    name: opts.session.title || 'Session ' + opts.i,
    thumbnails: new Thumbnails([
      new Thumbnail(upgradeThumbnailUrl(opts.session.thumbnail) || opts.artwork, 0),
    ]),
    author: opts.author,
    datetime: null,
    duration: opts.session.duration,
    viewCount: null,
    url:
      platform.regular_url +
      '/classroom/' +
      encodeURIComponent(opts.slug) +
      '/sessions/' +
      opts.i +
      '/',
    isLive: false,
  });
}

/**
 * Fetches and constructs PlatformVideoDetails for a BibleProject video by slug.
 * @param {string} slug - Video slug from URL
 * @param {string} stringUrl - Full video URL
 * @returns {PlatformVideoDetails}
 */
function getVideoDetails(slug, stringUrl) {
  const apiUrl =
    platform.regular_url +
    '/videos/' +
    encodeURIComponent(slug) +
    '.data?_routes=' +
    encodeURIComponent('routes/videos/detail/route');
  const response = httpGET(apiUrl);
  if (!response.isOk) {
    throw new ScriptException(
      `Failed to fetch video data for ${stringUrl} [${response.code}]`,
    );
  }

  const data = resolveReactRouterData(response.body);
  if (!data || !data.video) {
    throw new ScriptException('Failed to parse video data from response');
  }

  const video = data.video;
  const playbackId = video.playbackId || data.playbackId;
  const videoSource = playbackId
    ? 'https://stream.mux.com/' + playbackId + '/high.mp4'
    : video.playbackSources?.landscape?.mp4 || null;
  const muxPlaybackId =
    playbackId || video.playbackSources?.landscape?.mux || null;

  if (!videoSource) {
    throw new ScriptException(
      'No video source found for ' + stringUrl +
      ' (missing playbackId or playbackSources)',
    );
  }

  const duration = video.durationSeconds || null;
  const uploadDate = video.publishDate
    ? Math.round(new Date(video.publishDate).getTime() / 1000)
    : null;
  const bitrate = muxPlaybackId ? getMuxBitrate(muxPlaybackId) : null;

  return getPlatformVideoDetails({
    id: getPlatformID(video.id),
    name: video.title,
    thumbnail: upgradeThumbnailUrl(video.images?.aspect16x9),
    author: getPlatformAuthor(),
    url: stringUrl,
    uploadDate: uploadDate,
    duration: duration,
    description: video.descriptionHtml
      ? video.descriptionHtml.replace(
          /<[^>]+>/g,
          ''
        )
      : '',
    video: getVideoUrlSource(videoSource, duration),
  });
}

/**
 * Creates a VideoSourceDescriptor wrapping a VideoUrlSource with standard
 * MP4 parameters (1920x1080, AVC1 codec). Used by PlatformVideoDetails.
 * @param {string} url - URL of the MP4 video
 * @param {number|null} duration - Duration in seconds
 * @returns {VideoSourceDescriptor}
 */
function getVideoUrlSource(url, duration) {
  return new VideoSourceDescriptor([
    new VideoUrlSource({
      width: 1920,
      height: 1080,
      container: 'video/mp4',
      codec: 'avc1.4d401ea',
      name: 'mp4',
      bitrate: 4712400,
      duration: duration || 999999,
      url: url,
    }),
  ]);
}

/**
 * Maps a metadata object to a PlatformChannel.
 * Missing fields fall back to platform defaults.
 * @param {Object} [data] - Channel metadata
 *   with {id, name, thumbnail, banner, description, url}
 * @returns {PlatformChannel}
 */
function getPlatformChannel(data) {
  return new PlatformChannel({
    id: data?.id || getPlatformID(),
    name: data?.name || platform.title,
    thumbnail: data?.thumbnail || platform.icon,
    banner: data?.banner || platform.banner,
    description: data?.description || platform.description,
    url: data?.url || platform.url,
    links: {},
  });
}

/**
 * Fetches all video collections/playlists from the videos index page.
 * @returns {Array} List of collection objects
 */
function getAllCollections() {
  const apiUrl =
    platform.regular_url +
    '/videos.data?_routes=' +
    encodeURIComponent('routes/videos/index/route');
  const response = httpGET(apiUrl);

  if (!response.isOk) {
    throw new ScriptException(
      `Failed to retrieve collections [${response.code}]`,
    );
  }

  const data = resolveReactRouterData(response.body);

  if (!data || !data.collections) {
    throw new ScriptException('Failed to parse collections from response');
  }

  return data.collections;
}

/**
 * Converts a raw collection object into Grayjay's PlatformPlaylist format.
 * @param {Object} collection - Raw collection from index endpoint
 * @returns {PlatformPlaylist}
 */
function getPlatformPlaylist(collection) {
  const thumbnail = upgradeThumbnailUrl(collection.artworkSrc) || platform.icon;
  return new PlatformPlaylist({
    id: getPlatformID(collection.id),
    author: getPlatformAuthor(),
    name: collection.title,
    thumbnail: thumbnail,
    videoCount: parseInt(collection.episodeCountLabel, 10) || 0,
    url: collection.href
      ? platform.regular_url + collection.href
      : platform.url,
  });
}

/**
 * Parses formatted duration strings (e.g. "52 min", "1 hr 5 min") into seconds.
 * @param {string} str - Formatted duration string
 * @returns {number|null} Total seconds, or null
 */
function parseFormattedDuration(str) {
  if (!str) {
    return null;
  }
  let total = 0;
  const hrMatch = str.match(/(\d+)\s*hr/);
  const minMatch = str.match(/(\d+)\s*min/);
  if (hrMatch) {
    total += parseInt(hrMatch[1], 10) * 3600;
  }
  if (minMatch) {
    total += parseInt(minMatch[1], 10) * 60;
  }
  return total || null;
}

/**
 * Maps Grayjay sort order constants to BibleProject API sort parameters.
 * @param {string} order - Grayjay sort order constant
 * @returns {string} BibleProject sort parameter
 */
function mapSortOrder(order) {
  if (order === Type.Order.Chronological || order === '^release_time') {
    return 'PUBLISHED_AT-DESC';
  }
  if (order === 'release_time') {
    return 'PUBLISHED_AT-ASC';
  }
  if (order === '^name') {
    return 'TITLE-DESC';
  }
  if (order === 'name') {
    return 'TITLE-ASC';
  }
  return 'PUBLISHED_AT-DESC';
}

/**
 * Builds a PlatformPlaylistDetails from a podcast series.
 * @param {string} stringUrl - Full series URL
 * @returns {PlatformPlaylistDetails}
 */
function getPodcastSeriesPlaylist(stringUrl) {
  const parsedUrl = new URL(stringUrl);
  const pathname = parsedUrl.pathname.replace(
    /\/$/,
    ''
  );
  const slug = pathname.split('/').pop();
  const series = getPodcastData(slug, 'series')?.podcastSeries;

  if (!series) {
    throw new ScriptException(
      'Failed to fetch podcast series ' + stringUrl,
    );
  }

  const rawEpisodes = series.episodes || [];
  const episodes = [];
  for (const episode of rawEpisodes) {
    const publishDate = episode.publishedAt
      ? Math.round(new Date(episode.publishedAt).getTime() / 1000)
      : null;
    const thumbnail = upgradeThumbnailUrl(
      (episode.images &&
        (episode.images.artwork || episode.images.thumbnail)) ||
      null
    );
    episodes.push(
      new PlatformVideo({
        id: getPlatformID(episode.id),
        name: episode.title || 'Unknown',
        thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
        author: new PlatformAuthorLink(
          getPlatformID(podcast.slug),
          series.title,
          podcast.channelUrl,
          (series.images && series.images.artwork) || podcast.icon,
        ),
        datetime: publishDate,
        duration: episode.durationSeconds || null,
        viewCount: null,
        url: episode.href ? platform.regular_url + episode.href : null,
        isLive: false,
      }),
    );
  }

  const thumbnail = upgradeThumbnailUrl(
    (series.images &&
      (series.images.artwork || series.images.preview)) ||
    podcast.icon
  );

  return new PlatformPlaylistDetails({
    id: getPlatformID(series.id),
    name: series.title || 'Unknown',
    thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
    author: new PlatformAuthorLink(
      getPlatformID(podcast.slug),
      podcast.title,
      podcast.channelUrl,
      podcast.icon,
    ),
    url: stringUrl,
    thumbnail: thumbnail,
    description: series.descriptionHtml
      ? series.descriptionHtml.replace(
          /<[^>]+>/g,
          ''
        )
      : '',
    videoCount: series.episodeCount || episodes.length,
    contents: new PlaylistContentsPager(episodes, false, null),
  });
}

/**
 * Static pager for playlist video contents (single page, no pagination).
 */
class PlaylistContentsPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    this.hasMore = false;
    return this;
  }
}

/**
 * Static pager for the main BibleProject playlist listings (single page).
 */
class BibleProjectPlaylistPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    this.hasMore = false;
    return this;
  }
}

/**
 * Pager for video search results. Delegates to source.search for next page.
 */
class SearchVideoPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    return source.search(
      this.context.query,
      this.context.type,
      this.context.order,
      this.context.filters,
      this.context.continuationToken,
    );
  }
}

/**
 * Alternative search pager — identical to SearchVideoPager.
 */
class SomeSearchVideoPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    return source.search(
      this.context.query,
      this.context.type,
      this.context.order,
      this.context.filters,
      this.context.continuationToken,
    );
  }
}

/**
 * Pager for playlist search results. Delegates to source.searchPlaylists.
 */
class SomeSearchPlaylistsPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    return source.searchPlaylists(
      this.context.query,
      this.context.type,
      this.context.order,
      this.context.filters,
      this.context.continuationToken,
    );
  }
}

/**
 * Pager for podcast episode listings with cursor-based pagination.
 */
class PodcastEpisodesPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    return getPodcastEpisodesPager(
      this.context.url,
      this.context.type,
      this.context.order,
      this.context.filters,
      this.context.cursor,
      this.context.query,
    );
  }
}

/**
 * Pager for video listings with cursor-based pagination.
 */
class BibleProjectVideoPager extends VideoPager {
  constructor(results, hasMore, context) {
    super(results, hasMore, context);
  }

  nextPage() {
    if (this.context._classroomSlug) {
      return loadMoreClassroomSessions(this.context);
    }
    return getAllVideosPager(
      this.context.url,
      this.context.type,
      this.context.order,
      this.context.filters,
      this.context.cursor,
      this.context.query,
    );
  }
}

/**
 * Loads the next page of classroom sessions for cursor-based pagination.
 * @param {Object} context - Pager context with _classroomSlug,
 *   _classroomCount, cursor
 * @returns {BibleProjectVideoPager}
 */
function loadMoreClassroomSessions(context) {
  const slug = context._classroomSlug;
  const sessionCount = context._classroomCount;
  const startFrom = context.cursor || CLASSROOM_PAGE_START_OFFSET;
  const cls = getClassroomClassBySlug(slug);
  const artwork = upgradeThumbnailUrl(
    cls && cls.artwork && cls.artwork[0] ? cls.artwork[0].url : platform.icon
  );
  const pageSize = 10;
  const end = Math.min(startFrom + pageSize - 1, sessionCount);
  const videos = [];

  for (let i = startFrom; i <= end; i++) {
    const data = getClassroomSessionData(slug, i);
    if (!data) {
      continue;
    }
    videos.push(
      getClassroomSessionPlatformVideo({
        slug,
        i,
        session: data,
        artwork,
        author: new PlatformAuthorLink(
          getPlatformID(),
          cls ? (cls.name || cls.slug) + ' Classroom' : slug,
          context.url,
          artwork,
        ),
      }),
    );
  }

  const hasMore = end < sessionCount;
  return new BibleProjectVideoPager(videos, hasMore, {
    url: context.url,
    cursor: hasMore ? end + 1 : null,
    _classroomSlug: slug,
    _classroomCount: sessionCount,
  });
}

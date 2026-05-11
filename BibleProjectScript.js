// Platform information
const platform = {
    title: 'BibleProject',
    regular_url: 'https://www.bibleproject.com',
    url: 'https://www.bibleproject.com/',
    icon: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-icon.jpg',
    banner: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-banner.jpg',
    description: 'BibleProject is a nonprofit, crowdfunded organization that makes free resources like videos, podcasts, articles, and classes to help people experience the Bible in a way that is approachable and transformative.'
};

// Podcast information
const podcast = {
    title: 'BibleProject Podcast',
    channelUrl: 'https://www.bibleproject.com/podcasts/shows/the-bible-project-podcast/',
    icon: 'https://ik.imagekit.io/bpweb1/web/media/podcast-shows/tr:q-65,w-320/BP_Show_Podcast_Icon.jpg',
    banner: 'https://ik.imagekit.io/bpweb1/web/media/podcast-shows/tr:q-65,w-800/BP_Show_Podcast_Icon.jpg',
    slug: 'the-bible-project-podcast'
};


let config = {};
let settings = {};

source.enable = function (conf, _settings) {
    config = conf;
    settings = _settings;
}

source.getHome = function() {
    return getTopVideosPager();
}

source.searchSuggestions = function(query) {
    const suggestions = [];
    return suggestions;
}

source.getSearchCapabilities = function() {
	return {
		types: [Type.Feed.Mixed],
		sorts: [Type.Order.Chronological, "^release_time"],
		filters: [
			{
				id: "date",
				name: "Date",
				isMultiSelect: false,
				filters: [
					{ id: Type.Date.Today, name: "Last 24 hours", value: "today" },
					{ id: Type.Date.LastWeek, name: "Last week", value: "thisweek" },
					{ id: Type.Date.LastMonth, name: "Last month", value: "thismonth" },
					{ id: Type.Date.LastYear, name: "Last year", value: "thisyear" }
				]
			},
		]
	};
}

// Search
source.search = function (query, type, order, filters, continuationToken) {
    return getAllVideosPager(platform.url, type, order, filters, continuationToken, query);
}

source.getSearchChannelContentsCapabilities = function () {
	return {
		types: [Type.Feed.Mixed],
		sorts: [Type.Order.Chronological],
		filters: []
	};
}

// Search channel videos
source.searchChannelContents = function (url, query, type, order, filters, continuationToken) {
    // Podcast detection
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        return getPodcastEpisodesPager(url, type, order, filters, continuationToken, query);
    }

    return getAllVideosPager(url, type, order, filters, continuationToken, query);
}

// Search channels
source.searchChannels = function (query) {
    const results = []; // Channels

    // Check if query matches platform title
    if (platform.title.toLowerCase().includes(query.toLowerCase())) {
        // Return BibleProject channel
        results.push(new PlatformChannel({
            id: getPlatformID(),
            name: platform.title,
            thumbnail: platform.icon,
            banner: platform.banner,
            subscribers: null,
            description: platform.description,
            url: platform.url,
            links: {}
        }));
    }

    // Check if query matches podcast name
    if (!query || podcast.title.toLowerCase().includes(query.toLowerCase())) {
        const data = getPodcastData(podcast.slug, 'show');
        const show = data && data.podcastShow;

        // Return BibleProject Podcast channel
        results.push(new PlatformChannel({
            id: new PlatformID(platform.title, show ? show.id : podcast.slug, config.id),
            name: show ? show.title : podcast.title,
            thumbnail: show && show.images ? show.images.artwork : podcast.icon,
            banner: show && show.images ? show.images.preview : podcast.banner,
            subscribers: null,
            description: show ? show.descriptionHtml.replace(/<[^>]+>/g, '') : '',
            url: podcast.channelUrl,
            links: {}
        }));
    }

    return new ChannelPager(results, false);
}

// Channel URL detection
source.isChannelUrl = function(url) {
    return url == platform.url || url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '');
}

// Get channel details
source.getChannel = function(url) {
    // Detect if it's the BibleProject Podcast channel
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        const slug = podcast.slug;
        const data = getPodcastData(slug, 'show');
        const show = data && data.podcastShow;

        // Return BibleProject Podcast channel details
        return new PlatformChannel({
            id: new PlatformID(platform.title, show ? show.id : slug, config.id),
            name: show ? show.title : podcast.title,
            thumbnail: show && show.images ? show.images.artwork : podcast.icon,
            banner: show && show.images ? show.images.preview : podcast.banner,
            subscribers: null,
            description: show ? show.descriptionHtml.replace(/<[^>]+>/g, '') : '',
            url: podcast.channelUrl,
            links: {}
        });
    }

    // Return BibleProject channel details
    return new PlatformChannel({
        id: getPlatformID(),
        name: platform.title,
        thumbnail: platform.icon,
        banner: platform.banner,
        subscribers: null,
        description: platform.description,
        url: url,
        links: {}
    });
}

// Get channel videos
source.getChannelContents = function(url, type, order, filters, continuationToken) {
    // Detect BibleProject Podcast channel
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        // Return BibleProject Podcast videos
        return getPodcastEpisodesPager(url, type, order, filters, continuationToken);
    }

    // Return BibleProject channel videos
    return getAllVideosPager(url, type, order, filters, continuationToken);
}

// Video URL detection
source.isContentDetailsUrl = function(stringUrl) {
    try {
        // URL details
        const url = new URL(stringUrl);
        const pathname = url.pathname.replace(/\/$/, '');
        const host = url.hostname;

        // Verify url is from BibleProject
        if (host !== 'www.bibleproject.com' && host !== 'bibleproject.com') return false;

        // Check if it has the videos path name 
        if (pathname.startsWith('/videos/')) {
            // Return false if it's a collection type
            return pathname !== '/videos/' && pathname !== '/videos/all' && pathname !== '/videos/collections';
        }

        // Check if it has the podcasts path name
        return pathname.startsWith('/podcasts/') && !pathname.startsWith('/podcasts/shows/') && pathname !== '/podcasts/';
    } catch {
        return false;
    }
}

// Get content details
source.getContentDetails = function(stringUrl) {
    // URL details
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const slug = pathname.split('/').pop();
    const host = parsedUrl.hostname;

    // Check if the content is a podcast
    if (pathname.startsWith('/podcasts/') && !pathname.startsWith('/podcasts/shows/')) {
        // Return podcast details
        return getPodcastEpisodeDetails(slug, stringUrl);
    }

    // Video information
    const apiUrl = platform.regular_url + '/videos/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to fetch video data for ${stringUrl} [${response.code}]`);
    }

    // Parse video data
    const data = resolveReactRouterData(response.body);

    if (!data || !data.video) {
        throw new ScriptException('Failed to parse video data from response');
    }

    // Video details
    const video = data.video;
    const landscape = video.playbackSources && video.playbackSources.landscape;
    const videoSource = landscape && landscape.mp4;
    const muxPlaybackId = landscape && landscape.mux;
    const videoTitle = video.title || 'Unknown';
    const videoDescription = video.description || '';
    const videoThumbnail = video.images && video.images.aspect16x9 || '';
    const duration = video.durationSeconds || null;
    const uploadDate = video.publishDate ? Math.round((new Date(video.publishDate)).getTime() / 1000) : null;
    const bitrate = muxPlaybackId ? getMuxBitrate(muxPlaybackId) : null;

    return new PlatformVideoDetails({
        id: new PlatformID(platform.title, video.id, config.id),
        name: videoTitle,
        thumbnails: new Thumbnails([new Thumbnail(videoThumbnail, 0)]),
        author: new PlatformAuthorLink(
            getPlatformID(),
            platform.title,
            platform.url,
            platform.icon
        ),
        url: stringUrl,
        uploadDate: uploadDate,
        duration: duration,
        description: videoDescription,
        isLive: false,
        video: new VideoSourceDescriptor(
            [new VideoUrlSource({
                width: 1920,
                height: 1080,
                container: 'video/mp4',
                codec: 'avc1.4d401ea',
                name: 'mp4',
                bitrate: bitrate || 4712400,
                duration: duration || 999999,
                url: videoSource
            })]
        )
    });
}

// Playlist URL detection
source.isPlaylistUrl = function(stringUrl) {
    try {
        const url = new URL(stringUrl);
        const pathname = url.pathname.replace(/\/$/, '');
        const host = url.hostname;
        if (host !== 'www.bibleproject.com' && host !== 'bibleproject.com') return false;
        if (pathname.startsWith('/videos/collections/') && pathname !== '/videos/collections') return true;
        if (pathname.startsWith('/podcasts/series/') && pathname !== '/podcasts/series') return true;
        return false;
    } catch {
        return false;
    }
}

// Get playlist details
source.getPlaylist = function(stringUrl) {
    // URL details
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');

    // Check if the playlist is a podcast series
    if (pathname.startsWith('/podcasts/series/')) {
        // Return podcast series playlist
        return getPodcastSeriesPlaylist(stringUrl);
    }

    // Video collection details
    const slug = pathname.split('/').pop();
    const apiUrl = platform.regular_url + '/videos/collections/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/collections-detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to fetch playlist ${stringUrl} [${response.code}]`);
    }

    // Parse video collections details
    const data = resolveReactRouterData(response.body);

    if (!data || !data.videos) {
        throw new ScriptException('Failed to parse playlist data from response');
    }

    // Get data edges
    const edges = data.videos.edges || [];

    // Retrieve videos from edges
    const videos = [];
    for (const edge of edges) {
        const node = edge.node;
        const publishDate = node.slug ? getVideoPublishDate(node.slug) : null;
        videos.push(new PlatformVideo({
            id: new PlatformID(platform.title, node.id, config.id),
            name: node.title || 'Unknown',
            thumbnails: new Thumbnails([new Thumbnail(node.images && node.images.aspect16x9, 0)]),
            author: getPlatformAuthor(),
            datetime: publishDate,
            duration: node.durationSeconds || null,
            viewCount: null,
            url: node.href ? platform.regular_url + node.href : null,
            shareUrl: node.href ? platform.regular_url + node.href : null,
            isLive: false
        }));
    }

    // Playlist details
    const thumbnail = data.images && (data.images.aspect16x9 || data.images.aspect9x16) || platform.icon;
    const videoCount = edges.length;

    // Return playlist
    return new PlatformPlaylistDetails({
        id: new PlatformID(platform.title, data.id, config.id),
        name: data.title || 'Unknown',
        thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
        author: getPlatformAuthor(),
        url: stringUrl,
        thumbnail: thumbnail,
        description: data.description,
        videoCount: videoCount,
        contents: new PlaylistContentsPager(videos, false, null)
    });
}

// Search playlists
source.searchPlaylists = function(query, type, order, filters, continuationToken) {
    // Get all collections
    const allCollections = getAllCollections();

    const playlists = [];

    // Get playlists from video collections
    for (const collection of allCollections) {
        // Check if collection title includes query
        if (!query || collection.title.toLowerCase().includes(query.toLowerCase())) {
            playlists.push(getPlatformPlaylist(collection));
        }
    }

    // Get BibleProject Podcast series list
    const seriesList = getPodcastData(podcast.slug, 'show')?.podcastSeries || [];

    for (const series of seriesList) {
        // Check if podcast series title includes query
        if (!query || series.title.toLowerCase().includes(query.toLowerCase())) {
            const thumbnail = series.images && (series.images.artwork || series.images.preview) || podcast.icon;
            
            playlists.push(new PlatformPlaylist({
                id: new PlatformID(platform.title, series.id, config.id),
                author: new PlatformAuthorLink(
                    new PlatformID(platform.title, podcast.slug, config.id),
                    podcast.title,
                    podcast.channelUrl,
                    podcast.icon
                ),
                name: series.title,
                thumbnail: thumbnail,
                videoCount: series.episodeCount || 0,
                url: series.href ? platform.regular_url + series.href : podcast.channelUrl
            }));
        }
    }

    const hasMore = false;
    const context = { query: query, type: type, order: order, filters: filters, continuationToken: continuationToken };
    return new SomeSearchPlaylistsPager(playlists, hasMore, context);
}

// Get playlists from channel
source.getChannelPlaylists = function(url) {
    // Detect BibleProject Podcast channel, detects trailing slash
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        // Get BibleProject Podcast channel information
        const seriesList = getPodcastData(podcast.slug, 'show')?.podcastSeries || [];

        const playlists = [];

        for (const series of seriesList) {
            const thumbnail = series.images && (series.images.artwork || series.images.preview) || podcast.icon;
            playlists.push(new PlatformPlaylist({
                id: new PlatformID(platform.title, series.id, config.id),
                author: new PlatformAuthorLink(
                    new PlatformID(platform.title, podcast.slug, config.id),
                    podcast.title,
                    podcast.channelUrl,
                    podcast.icon
                ),
                name: series.title,
                thumbnail: thumbnail,
                videoCount: series.episodeCount || 0,
                url: series.href ? platform.regular_url + series.href : podcast.channelUrl
            }));
        }

        return new BibleProjectPlaylistPager(playlists, false);
    } else if (url == platform.url) { // Detect BibleProject channel
        // Get collections
        const allCollections = getAllCollections();

        // Get playlists from collections
        const playlists = [];
        for (const collection of allCollections) {
            playlists.push(getPlatformPlaylist(collection));
        }

        // Return playlists pager
        return new BibleProjectPlaylistPager(playlists, false);
    } else {
        return new BibleProjectPlaylistPager([], false); // Not a valid BibleProject channel, return empty pager
    }
}

const RE_REF_KEY = /^_\d+$/;

/*
 * Parses React Router data endpoint serialization format.
 * @param {string} responseText - Raw JSON from a React Router data endpoint
 * @returns {Object|null} Resolved data object, or null if not found
 */
function resolveReactRouterData(responseText) {
    // Parse the JSON array — each element can be a primitive or a reference object
    const root = JSON.parse(responseText);
    
    // Recursively resolve numeric references in the array
    function resolve(val) {
        // Arrays: resolve each element, replacing numeric indices with their resolved values
        if (Array.isArray(val)) {
            return val.map(v => {
                if (typeof v === 'number') {
                    return resolve(root[v]);
                }
                return resolve(v);
            });
        }
        // Objects: could be a reference map (_N keys) or a regular data object
        if (val !== null && typeof val === 'object') {
            const keys = Object.keys(val);
            // Reference objects use _0, _1, etc. as keys — resolve both keys and values from the root array
            if (keys.length > 0 && keys.every(k => RE_REF_KEY.test(k))) {
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
    
    // Find the "data" entry in the root array and resolve its contents
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

/*
 * Constructs PlatformVideoDetails for a single podcast episode.
 * Derives duration from chapters array and date from formattedPublishDate.
 * @param {string} slug - Episode slug from URL
 * @param {string} stringUrl - Full episode URL
 * @returns {PlatformVideoDetails}
 */
function getPodcastEpisodeDetails(slug, stringUrl) {
    // Get podcast episode
    const episode = getPodcastData(slug, 'episode')?.podcastEpisode;
    
    if (!episode)
        throw new ScriptException(`Failed to parse podcast episode data for ${stringUrl}`);

    // Podcast channel (show) information
    const show = getPodcastData(podcast.slug, 'show')?.podcastShow;
    const showArtwork = show && show.images ? show.images.artwork : podcast.icon;
    const showTitle = show ? show.title : podcast.title;

    // Podcast episode information
    const chapters = episode.chapters || [];
    const duration = chapters.length > 0 ? chapters[chapters.length - 1].endSeconds : parseFormattedDuration(episode.formattedDuration);
    const uploadDate = episode.formattedPublishDate ? Math.round((new Date(episode.formattedPublishDate)).getTime() / 1000) : null;
    const thumbnail = episode.images && (episode.images.artwork || episode.images.thumbnail) || podcast.icon;
    const audioUrl = episode.path || null;

    // Return podcast episode details
    return new PlatformVideoDetails({
        id: new PlatformID(platform.title, episode.id, config.id),
        name: episode.title || 'Unknown',
        thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
        author: new PlatformAuthorLink(
            new PlatformID(platform.title, podcast.slug, config.id),
            showTitle,
            podcast.channelUrl,
            showArtwork
        ),
        url: stringUrl,
        uploadDate: uploadDate,
        duration: duration,
        description: episode.descriptionHtml ? episode.descriptionHtml.replace(/<[^>]+>/g, '') : '',
        isLive: false,
        video: new UnMuxVideoSourceDescriptor(
            [],
            [new AudioUrlSource({
                container: 'audio/mpeg',
                codecs: 'mp3',
                name: 'Podcast Audio',
                bitrate: 128000,
                duration: duration || 999999,
                url: audioUrl,
                language: 'en'
            })]
        )
    });
}

/*
 * Fetches podcast data from the specified endpoint type.
 * @param {string} slug - Episode, show, or series slug
 * @param {string} type - 'episode', 'show', or 'series'
 * @returns {Object|null} Parsed response data, or null
 */
function getPodcastData(slug, type) {
    // Map each type to its URL path prefix and React Router route name
    const configs = {
        episode: { path: '/podcasts/', route: 'routes/podcasts/episode-detail/route' },
        show: { path: '/podcasts/shows/', route: 'routes/podcasts/show-detail/route' },
        series: { path: '/podcasts/series/', route: 'routes/podcasts/series-detail/route' }
    };

    // Build the React Router data endpoint URL
    const apiUrl = platform.regular_url + configs[type].path + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent(configs[type].route);
    
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    // Resolve the indexed reference format and return the full data object
    return response.isOk && resolveReactRouterData(response.body) || null;
}

/*
 * Builds a PlatformPlaylistDetails from a podcast series.
 * @param {string} stringUrl - Full series URL
 * @returns {PlatformPlaylistDetails}
 */
function getPodcastSeriesPlaylist(stringUrl) {
    // URL details
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const slug = pathname.split('/').pop();

    // Fetch series episode list
    const series = getPodcastData(slug, 'series')?.podcastSeries;

    if (!series) 
        throw new ScriptException(`Failed to fetch podcast series ${stringUrl}`);

    const rawEpisodes = series.episodes || [];

    const episodes = [];

    // Convert episodes to PlatformVideo
    for (const episode of rawEpisodes) {
        const publishDate = episode.publishedAt ? Math.round((new Date(episode.publishedAt)).getTime() / 1000) : null;
        episodes.push(new PlatformVideo({
            id: new PlatformID(platform.title, episode.id, config.id),
            name: episode.title || 'Unknown',
            thumbnails: new Thumbnails([new Thumbnail(episode.images && episode.images.thumbnail, 0)]),
            author: new PlatformAuthorLink(
                new PlatformID(platform.title, podcast.slug, config.id),
                series.title,
                podcast.channelUrl,
                series.images && series.images.artwork || podcast.icon
            ),
            datetime: publishDate,
            duration: episode.durationSeconds || null,
            viewCount: null,
            url: episode.href ? platform.regular_url + episode.href : null,
            shareUrl: episode.href ? platform.regular_url + episode.href : null,
            isLive: false
        }));
    }

    const thumbnail = series.images && (series.images.artwork || series.images.preview) || podcast.icon;

    return new PlatformPlaylistDetails({
        id: new PlatformID(platform.title, series.id, config.id),
        name: series.title || 'Unknown',
        thumbnails: new Thumbnails([new Thumbnail(thumbnail, 0)]),
        author: new PlatformAuthorLink(
            new PlatformID(platform.title, podcast.slug, config.id),
            podcast.title,
            podcast.channelUrl,
            podcast.icon
        ),
        url: stringUrl,
        thumbnail: thumbnail,
        description: series.descriptionHtml ? series.descriptionHtml.replace(/<[^>]+>/g, '') : '',
        videoCount: series.episodeCount || episodes.length,
        contents: new PlaylistContentsPager(episodes, false, null)
    });
}

/*
 * Builds a paginated episode list for the podcast channel.
 * @param {string} url - Channel URL
 * @param {string} type - Feed type
 * @param {string} order - Sort order
 * @param {Object} filters - Active filters
 * @param {string|null} continuationToken - Cursor for pagination
 * @param {string|null} query - Optional text filter
 * @returns {PodcastEpisodesPager}
 */
function getPodcastEpisodesPager(url, type, order, filters, continuationToken, query) {
    // Build the show-detail endpoint URL with sort and optional cursor for pagination
    let apiUrl = platform.regular_url + '/podcasts/shows/' + encodeURIComponent(podcast.slug) + '.data?_routes=' + encodeURIComponent('routes/podcasts/show-detail/route') + '&sort=newest&tab=episodes';

    if (continuationToken)
        apiUrl += '&cursor=' + encodeURIComponent(continuationToken);

    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) 
        throw new ScriptException(`Failed to retrieve podcast episodes [${response.code}]`);

    // Extract the paginated episode range from the resolved response
    const range = resolveReactRouterData(response.body)?.podcastEpisodesRange;

    if (!range) 
        throw new ScriptException('Failed to parse podcast episodes from response');

    // The range can be a flat array (all episodes) or an object with episodes/videos, hasMore, cursor
    const rawEpisodes = Array.isArray(range) ? range : (range.episodes || range.videos || []);
    const hasMore = range.hasMore || false;
    const nextCursor = range.cursor || null;

    // Fetch show metadata once (artwork, title) rather than per-episode
    const show = getPodcastData(podcast.slug, 'show')?.podcastShow;
    const showArtwork = show?.images?.artwork || podcast.icon;
    const showTitle = show?.title || podcast.title;

    const episodes = [];

    for (const episode of rawEpisodes) {
        // Client-side filter when searching within the podcast channel
        if (query && !episode.title.toLowerCase().includes(query.toLowerCase()))
            continue;

        const publishDate = episode.publishedAt ? Math.round((new Date(episode.publishedAt)).getTime() / 1000) : null;

        episodes.push(new PlatformVideo({
            id: new PlatformID(platform.title, episode.id, config.id),
            name: episode.title || 'Unknown',
            thumbnails: new Thumbnails([new Thumbnail(episode.images && (episode.images.artwork || episode.images.thumbnail), 0)]),
            author: new PlatformAuthorLink(
                new PlatformID(platform.title, podcast.slug, config.id),
                showTitle,
                podcast.channelUrl,
                showArtwork
            ),
            datetime: publishDate,
            duration: episode.durationSeconds || null,
            viewCount: null,
            url: episode.href ? platform.regular_url + episode.href : null,
            shareUrl: episode.href ? platform.regular_url + episode.href : null,
            isLive: false
        }));
    }

    return new PodcastEpisodesPager(episodes, hasMore, {url, type, order, filters, cursor: nextCursor, query});
}

/*
 * Fetches a single video's publish date by making a detail endpoint request.
 * @param {string} slug - Video slug
 * @returns {number|null} Unix timestamp in seconds, or null
 */
function getVideoPublishDate(slug) {
    // Fetch the video detail endpoint which includes publishDate
    const apiUrl = platform.regular_url + '/videos/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk)
        return null;

    const date = resolveReactRouterData(response.body)?.video?.publishDate;

    // Convert ISO date string to Unix timestamp in seconds
    return date && Math.round((new Date(date)).getTime() / 1000) || null;
}

/*
 * Fetches real bitrate from a Mux HLS streaming manifest.
 * @param {string} playbackId - Mux playback ID
 * @returns {number|null} Highest bandwidth found, or null
 */
function getMuxBitrate(playbackId) {
    const manifestUrl = 'https://stream.mux.com/' + encodeURIComponent(playbackId) + '.m3u8';
    const response = http.GET(manifestUrl, {Accept: 'application/vnd.apple.mpegurl'});

    if (!response.isOk) {
        return null;
    }

    const bwRegex = /BANDWIDTH=(\d+)/g;
    let match;
    let maxBitrate = 0;

    while ((match = bwRegex.exec(response.body)) !== null) {
        const bw = parseInt(match[1], 10);
        if (bw > maxBitrate) {
            maxBitrate = bw;
        }
    }

    return maxBitrate || null;
}

/*
 * Fetches paginated video listings from the videos/all endpoint.
 * @param {string} url - Page URL
 * @param {string} type - Feed type
 * @param {string} order - Sort order
 * @param {Object} filters - Active filters
 * @param {string|null} continuationToken - Cursor for pagination
 * @param {string|null} query - Optional text filter
 * @returns {BibleProjectVideoPager}
 */
function getAllVideosPager(url, type, order, filters, continuationToken, query) {
    const sort = mapSortOrder(order);
    let apiUrl = platform.regular_url + '/videos/all.data?';
    const params = [];
    
    if (continuationToken) {
        params.push('cursor=' + encodeURIComponent(continuationToken));
    }
    
    params.push('sort=' + encodeURIComponent(sort));
    params.push('_routes=' + encodeURIComponent('routes/videos/all/route'));
    
    apiUrl += params.join('&');
    
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to retrieve videos [${response.code}]`);
    };

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

        const publishDate = video.slug ? getVideoPublishDate(video.slug) : null;

        videos.push(getPlatformVideo({
            title: video.title || null,
            thumbnail: video.images && video.images.aspect16x9 ? video.images.aspect16x9 : null,
            url: video.href ? platform.regular_url + video.href : null,
            duration: video.durationSeconds || null,
            datetime: publishDate
        }));
    }

    return new BibleProjectVideoPager(videos, hasMore, {url, type, order, filters, cursor: nextCursor, query});
}

/*
 * Fetches top featured videos from the videos index for the home feed.
 * @returns {BibleProjectVideoPager}
 */
function getTopVideosPager() {
    const apiUrl = platform.regular_url + '/videos.data?_routes=' + encodeURIComponent('routes/videos/index/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to retrieve home feed [${response.code}]`);
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.topVideos) {
        throw new ScriptException('Failed to parse home feed from response');
    }

    const rawVideos = data.topVideos || [];
    const videos = [];

    for (const video of rawVideos) {
        const publishDate = video.slug ? getVideoPublishDate(video.slug) : null;
        videos.push(getPlatformVideo({
            title: video.title || null,
            thumbnail: video.images && video.images.aspect16x9 ? video.images.aspect16x9 : null,
            url: video.href ? platform.regular_url + video.href : null,
            duration: video.durationSeconds || null,
            datetime: publishDate
        }));
    }

    return new BibleProjectVideoPager(videos, true, {url: platform.url, type: Type.Feed.Mixed, order: Type.Order.Chronological, cursor: null, query: null});
}

/*
 * Creates a PlatformID for BibleProject content.
 * @param {Object} [video] - Optional video object with url/title
 * @returns {PlatformID}
 */
function getPlatformID(video) {
    return new PlatformID(video ? video.url : platform.url, video ? video.title : platform.title, config.id);
}

/*
 * Creates a PlatformAuthorLink for the main BibleProject channel.
 * @returns {PlatformAuthorLink}
 */
function getPlatformAuthor() {
    return new PlatformAuthorLink(
        getPlatformID(),
        platform.title,
        platform.url,
        platform.icon
    );
}

/*
 * Normalizes a raw video object into Grayjay's PlatformVideo format.
 * @param {Object} video - Raw video data
 * @returns {PlatformVideo}
 */
function getPlatformVideo(video) {
    return new PlatformVideo({
        id: getPlatformID(video),
        name: video.title || 'Unknown',
        thumbnails: new Thumbnails([new Thumbnail(video.thumbnail, 0)]),
        author: getPlatformAuthor(),
        datetime: video.datetime || null,
        duration: video.duration,
        viewCount: null,
        url: video.url,
        shareUrl: video.url,
        isLive: false
    });
}

/*
 * Fetches all video collections/playlists from the videos index page.
 * @returns {Array} List of collection objects
 */
function getAllCollections() {
    const apiUrl = platform.regular_url + '/videos.data?_routes=' + encodeURIComponent('routes/videos/index/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to retrieve collections [${response.code}]`);
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.collections) {
        throw new ScriptException('Failed to parse collections from response');
    }

    return data.collections;
}

/*
 * Converts a raw collection object into Grayjay's PlatformPlaylist format.
 * @param {Object} collection - Raw collection from index endpoint
 * @returns {PlatformPlaylist}
 */
function getPlatformPlaylist(collection) {
    const thumbnail = collection.images && (collection.images.aspect16x9 || collection.images.aspect9x16) || platform.icon;
    return new PlatformPlaylist({
        id: new PlatformID(platform.title, collection.id, config.id),
        author: getPlatformAuthor(),
        name: collection.title,
        thumbnail: thumbnail,
        videoCount: collection.videos && collection.videos.totalCount || 0,
        url: collection.href ? platform.regular_url + collection.href : platform.url
    });
}

/*
 * Parses formatted duration strings (e.g. "52 min", "1 hr 5 min") into seconds.
 * @param {string} str - Formatted duration string
 * @returns {number|null} Total seconds, or null
 */
function parseFormattedDuration(str) {
    if (!str) return null;
    let total = 0;
    const hrMatch = str.match(/(\d+)\s*hr/);
    const minMatch = str.match(/(\d+)\s*min/);
    if (hrMatch) total += parseInt(hrMatch[1]) * 3600;
    if (minMatch) total += parseInt(minMatch[1]) * 60;
    return total || null;
}

/*
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

/*
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

/*
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

/*
 * Pager for video search results. Delegates to source.search for next page.
 */
class SearchVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

/*
 * Alternative search pager — identical to SearchVideoPager.
 */
class SomeSearchVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

/*
 * Pager for playlist search results. Delegates to source.searchPlaylists.
 */
class SomeSearchPlaylistsPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.searchPlaylists(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

/*
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
            this.context.query
        );
    }
}

/*
 * Pager for video listings with cursor-based pagination.
 */
class BibleProjectVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return getAllVideosPager(
			this.context.url,
			this.context.type,
			this.context.order,
			this.context.filters,
			this.context.cursor,
			this.context.query
		);
	}
}

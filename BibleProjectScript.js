// Platform information
const platform = {
    title: 'BibleProject',
    regular_url: 'https://www.bibleproject.com',
    url: 'https://www.bibleproject.com/',
    icon: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-icon.jpg',
    banner: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/Imgs/channel-banner.jpg',
    description: 'BibleProject is a nonprofit, crowdfunded organization that makes free resources like videos, podcasts, articles, and classes to help people experience the Bible in a way that is approachable and transformative.'
};

const podcast = {
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
    //const homeResponse = http.GET(platform.url + 'videos', {Accept: 'text/html'});
    //const parse = domParser.parseFromString(homeResponse.body, 'text/html')
    //const elements = parse.getElementsByClassName("stack video-block")
    
    //let i = 0
    //for (const e of Object.values(elements)) {
    //    i++
    //    let i2 = 0
    //    for (const o of Object.values(e)) {
    //        i2++
    //        bridge.log(`object ${i} line ${i2}: ${o}`);
    //    };
    //};
    return getAllVideosPager(platform.url, Type.Feed.Mixed, Type.Order.Chronological);
}

source.searchSuggestions = function(query) {
    /**
     * @param query: string
     * @returns: string[]
     */

    const suggestions = []; //The suggestions for a specific search query
    return suggestions;
}

source.getSearchCapabilities = function() {
    //This is an example of how to return search capabilities like available sorts, filters and which feed types are available (see source.js for more details) 
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

source.search = function (query, type, order, filters, continuationToken) {
    return new getAllVideosPager(platform.url, type, order, filters, continuationToken, query);
}

source.getSearchChannelContentsCapabilities = function () {
    //This is an example of how to return search capabilities on a channel like available sorts, filters and which feed types are available (see source.js for more details)
	return {
		types: [Type.Feed.Mixed],
		sorts: [Type.Order.Chronological],
		filters: []
	};
}

source.searchChannelContents = function (url, query, type, order, filters, continuationToken) {
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        return getPodcastEpisodesPager(url, type, order, filters, continuationToken, query);
    }
    return getAllVideosPager(url, type, order, filters, continuationToken, query);
}

source.searchChannels = function (query) {
    const results = [];
    if (platform.title.toLowerCase().includes(query.toLowerCase())) {
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
    if (!query || 'bibleproject podcast'.includes(query.toLowerCase())) {
        const data = getPodcastShowData(podcast.slug);
        const show = data && data.podcastShow;
        results.push(new PlatformChannel({
            id: new PlatformID(platform.title, show ? show.id : podcast.slug, config.id),
            name: show ? show.title : 'BibleProject Podcast',
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

source.isChannelUrl = function(url) {
    return url == platform.url || url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '');
}

source.getChannel = function(url) {
    const isPodcast = url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '');
    if (isPodcast) {
        const slug = podcast.slug;
        const data = getPodcastShowData(slug);
        const show = data && data.podcastShow;
        return new PlatformChannel({
            id: new PlatformID(platform.title, show ? show.id : slug, config.id),
            name: show ? show.title : 'BibleProject Podcast',
            thumbnail: show && show.images ? show.images.artwork : podcast.icon,
            banner: show && show.images ? show.images.preview : podcast.banner,
            subscribers: null,
            description: show ? show.descriptionHtml.replace(/<[^>]+>/g, '') : '',
            url: podcast.channelUrl,
            links: {}
        });
    }
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

source.getChannelContents = function(url, type, order, filters, continuationToken) {
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        return getPodcastEpisodesPager(url, type, order, filters, continuationToken);
    }
    return getAllVideosPager(url, type, order, filters, continuationToken);
}

source.isContentDetailsUrl = function(stringUrl) {
    try {
        const url = new URL(stringUrl);
        const pathname = url.pathname.replace(/\/$/, '');
        const host = url.hostname;
        if (host !== 'www.bibleproject.com' && host !== 'bibleproject.com') return false;
        if (pathname.startsWith('/videos/')) {
            return pathname !== '/videos/' && pathname !== '/videos/all' && pathname !== '/videos/collections';
        }
        if (pathname.startsWith('/podcasts/') && !pathname.startsWith('/podcasts/shows/') && pathname !== '/podcasts/') {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

source.getContentDetails = function(stringUrl) {
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const slug = pathname.split('/').pop();
    const host = parsedUrl.hostname;

    if (pathname.startsWith('/podcasts/') && !pathname.startsWith('/podcasts/shows/')) {
        return getPodcastEpisodeDetails(slug, stringUrl);
    }

    const apiUrl = platform.regular_url + '/videos/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to fetch video data for ${stringUrl} [${response.code}]`);
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.video) {
        throw new ScriptException('Failed to parse video data from response');
    }

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

function getPodcastEpisodeDetails(slug, stringUrl) {
    const data = getPodcastEpisodeData(slug);
    if (!data || !data.podcastEpisode) {
        throw new ScriptException(`Failed to parse podcast episode data for ${stringUrl}`);
    }

    const episode = data.podcastEpisode;
    const showData = getPodcastShowData(podcast.slug);
    const show = showData && showData.podcastShow;
    const chapters = episode.chapters || [];
    const duration = chapters.length > 0 ? chapters[chapters.length - 1].endSeconds : parseFormattedDuration(episode.formattedDuration);
    const uploadDate = episode.formattedPublishDate ? Math.round((new Date(episode.formattedPublishDate)).getTime() / 1000) : null;
    const thumbnail = episode.images && (episode.images.artwork || episode.images.thumbnail) || podcast.icon;
    const audioUrl = episode.path || null;
    const showArtwork = show && show.images ? show.images.artwork : podcast.icon;
    const showTitle = show ? show.title : 'BibleProject Podcast';

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

// Helper: Fetch upload date from video detail endpoint
function getVideoPublishDate(slug) {
    const apiUrl = platform.regular_url + '/videos/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        return null;
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.video || !data.video.publishDate) {
        return null;
    }

    return Math.round((new Date(data.video.publishDate)).getTime() / 1000);
}

// Helper: Fetch real bitrate from Mux HLS manifest
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

// Helper: Fetch podcast show data
function getPodcastShowData(slug) {
    const apiUrl = platform.regular_url + '/podcasts/shows/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/podcasts/show-detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});
    if (!response.isOk) return null;
    const data = resolveReactRouterData(response.body);
    if (!data || !data.podcastShow) return null;
    return data;
}

// Helper: Fetch podcast series data
function getPodcastSeriesData(slug) {
    const apiUrl = platform.regular_url + '/podcasts/series/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/podcasts/series-detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});
    if (!response.isOk) return null;
    const data = resolveReactRouterData(response.body);
    if (!data || !data.podcastSeries) return null;
    return data;
}

// Helper: Fetch podcast episode data
function getPodcastEpisodeData(slug) {
    const apiUrl = platform.regular_url + '/podcasts/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/podcasts/episode-detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});
    if (!response.isOk) return null;
    const data = resolveReactRouterData(response.body);
    if (!data || !data.podcastEpisode) return null;
    return data;
}

// Helper: Get podcast episodes pager
function getPodcastEpisodesPager(url, type, order, filters, continuationToken, query) {
    const parsedUrl = new URL(url);
    const slug = podcast.slug;
    let apiUrl = platform.regular_url + '/podcasts/shows/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/podcasts/show-detail/route') + '&sort=newest&tab=episodes';

    if (continuationToken) {
        apiUrl += '&cursor=' + encodeURIComponent(continuationToken);
    }

    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to retrieve podcast episodes [${response.code}]`);
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.podcastEpisodesRange) {
        throw new ScriptException('Failed to parse podcast episodes from response');
    }

    const range = data.podcastEpisodesRange;
    const rawEpisodes = Array.isArray(range) ? range : (range.episodes || range.videos || []);
    const hasMore = range.hasMore || false;
    const nextCursor = range.cursor || null;

    const episodes = [];

    for (const episode of rawEpisodes) {
        if (query && !episode.title.toLowerCase().includes(query.toLowerCase())) {
            continue;
        }

        const publishDate = episode.publishedAt ? Math.round((new Date(episode.publishedAt)).getTime() / 1000) : null;
        const showData = getPodcastShowData(podcast.slug);
        const show = showData && showData.podcastShow;
        const showArtwork = show && show.images ? show.images.artwork : podcast.icon;

        episodes.push(new PlatformVideo({
            id: new PlatformID(platform.title, episode.id, config.id),
            name: episode.title || 'Unknown',
            thumbnails: new Thumbnails([new Thumbnail(episode.images && (episode.images.artwork || episode.images.thumbnail), 0)]),
            author: new PlatformAuthorLink(
                new PlatformID(platform.title, podcast.slug, config.id),
                show ? show.title : 'BibleProject Podcast',
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

source.getPlaylist = function(stringUrl) {
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');

    if (pathname.startsWith('/podcasts/series/')) {
        return getPodcastSeriesPlaylist(stringUrl);
    }

    const slug = pathname.split('/').pop();
    const apiUrl = platform.regular_url + '/videos/collections/' + encodeURIComponent(slug) + '.data?_routes=' + encodeURIComponent('routes/videos/collections-detail/route');
    const response = http.GET(apiUrl, {Accept: 'application/json'});

    if (!response.isOk) {
        throw new ScriptException(`Failed to fetch playlist ${stringUrl} [${response.code}]`);
    }

    const data = resolveReactRouterData(response.body);

    if (!data || !data.videos) {
        throw new ScriptException('Failed to parse playlist data from response');
    }

    const edges = data.videos.edges || [];
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

    const thumbnail = data.images && (data.images.aspect16x9 || data.images.aspect9x16) || platform.icon;
    const videoCount = edges.length;

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

function getPodcastSeriesPlaylist(stringUrl) {
    const parsedUrl = new URL(stringUrl);
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const slug = pathname.split('/').pop();

    const data = getPodcastSeriesData(slug);

    if (!data || !data.podcastSeries) {
        throw new ScriptException(`Failed to fetch podcast series ${stringUrl}`);
    }

    const series = data.podcastSeries;
    const rawEpisodes = series.episodes || [];
    const episodes = [];

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
            'BibleProject Podcast',
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

source.searchPlaylists = function(query, type, order, filters, continuationToken) {
    const playlists = [];

    const allCollections = getAllCollections();
    for (const collection of allCollections) {
        if (!query || collection.title.toLowerCase().includes(query.toLowerCase())) {
            playlists.push(getPlatformPlaylist(collection));
        }
    }

    const podcastData = getPodcastShowData(podcast.slug);
    const seriesList = podcastData && podcastData.podcastSeries || [];
    for (const series of seriesList) {
        if (!query || series.title.toLowerCase().includes(query.toLowerCase())) {
            const thumbnail = series.images && (series.images.artwork || series.images.preview) || podcast.icon;
            playlists.push(new PlatformPlaylist({
                id: new PlatformID(platform.title, series.id, config.id),
                author: new PlatformAuthorLink(
                    new PlatformID(platform.title, podcast.slug, config.id),
                    'BibleProject Podcast',
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

source.getChannelPlaylists = function(url) {
    if (url == podcast.channelUrl || url == podcast.channelUrl.replace(/\/$/, '')) {
        const data = getPodcastShowData(podcast.slug);
        const seriesList = data && data.podcastSeries || [];
        const playlists = [];

        for (const series of seriesList) {
            const thumbnail = series.images && (series.images.artwork || series.images.preview) || podcast.icon;
            playlists.push(new PlatformPlaylist({
                id: new PlatformID(platform.title, series.id, config.id),
                author: new PlatformAuthorLink(
                    new PlatformID(platform.title, podcast.slug, config.id),
                    'BibleProject Podcast',
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
    }
    if (url !== platform.url) {
        return new BibleProjectPlaylistPager([], false);
    }

    const allCollections = getAllCollections();
    const playlists = [];

    for (const collection of allCollections) {
        playlists.push(getPlatformPlaylist(collection));
    }

    return new BibleProjectPlaylistPager(playlists, false);
}

// Helper: Parse React Router data endpoint serialization format
function resolveReactRouterData(responseText) {
    const root = JSON.parse(responseText);
    
    function resolve(val) {
        if (Array.isArray(val)) {
            return val.map(v => {
                if (typeof v === 'number') {
                    return resolve(root[v]);
                }
                return resolve(v);
            });
        }
        if (val !== null && typeof val === 'object') {
            const keys = Object.keys(val);
            if (keys.length > 0 && keys.every(k => /^_\d+$/.test(k))) {
                const obj = {};
                for (const k of keys) {
                    const actualKey = resolve(root[parseInt(k.slice(1))]);
                    const actualValue = resolve(root[val[k]]);
                    obj[actualKey] = actualValue;
                }
                return obj;
            }
            const obj = {};
            for (const [k, v] of Object.entries(val)) {
                obj[k] = resolve(v);
            }
            return obj;
        }
        return val;
    }
    
    for (let i = 1; i < root.length; i++) {
        if (typeof root[i] === 'string' && root[i] === 'data' && i + 1 < root.length) {
            const dataObj = root[i + 1];
            if (dataObj !== null && typeof dataObj === 'object') {
                return resolve(dataObj);
            }
        }
    }
    return null;
}

// Helper: Parse formatted duration strings like "52 min" or "1 hr 5 min"
function parseFormattedDuration(str) {
    if (!str) return null;
    let total = 0;
    const hrMatch = str.match(/(\d+)\s*hr/);
    const minMatch = str.match(/(\d+)\s*min/);
    if (hrMatch) total += parseInt(hrMatch[1]) * 3600;
    if (minMatch) total += parseInt(minMatch[1]) * 60;
    return total || null;
}

// Helper: Map Grayjay sort order to BibleProject sort param
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

// Helper: Get all videos from BibleProject, returns a Pager
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

// Helper: Get PlatformID
function getPlatformID(video) {
    return new PlatformID(video ? video.url : platform.url, video ? video.title : platform.title, config.id);
}

// Helper: Get PlatformAuthor of BibleProject
function getPlatformAuthor() {
    return new PlatformAuthorLink(
        getPlatformID(),
        platform.title,
        platform.url,
        platform.icon
    );
}

// Helper: Format video to PlatformVideo
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

// Helper: Get all collections from the videos index page
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

// Helper: Create a PlatformPlaylist from collection data
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

class PlaylistContentsPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        this.hasMore = false;
        return this;
    }
}

class BibleProjectPlaylistPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        this.hasMore = false;
        return this;
    }
}

class HomePager extends VideoPager {
	constructor(initialResults, hasMore) {
		super(initialResults, hasMore);
        this.page = 0;
	}
	
	nextPage() {
        this.page++;
        this.results = (this.page);
        this.hasMore = false;
		return this;
	}
}

class SearchVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

class SomeSearchVideoPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

class SomeSearchPlaylistsPager extends VideoPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.searchPlaylists(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
	}
}

class SomeChannelPager extends ChannelPager {
	constructor(results, hasMore, context) {
		super(results, hasMore, context);
	}
	
	nextPage() {
		return source.searchChannelContents(this.context.query, this.context.continuationToken);
	}
}

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
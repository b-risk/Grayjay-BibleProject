// Platform information
const platform = {
    title: 'BibleProject',
    regular_url: 'https://www.bibleproject.com',
    url: 'https://www.bibleproject.com/',
    icon: 'https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/BibleProjectIcon.png',
    description: 'BibleProject is a nonprofit, crowdfunded organization that makes free resources like videos, podcasts, articles, and classes to help people experience the Bible in a way that is approachable and transformative.'
};

// Regex variables for extracting metadata
const regexVariables = {
    video_url: /^https:\/\/bibleproject\.com\/videos\/[a-zA-Z0-9._~%()-]+\/?$/,
    video_title: /data-label="Full Video"\s+data-title="([^"]+)"\s+data-type-label="Video"/,
    video_description: /<div class="raw-html video-details-description"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/,
    source_mp4: /<a\s+class="link unstyled-link rich-link"\s+href="([^"]+)"\s+rel="noreferrer"\s+target="_blank"\s+data-size="default"\s+data-label="Full Video"\s+data-title="[^"]*"\s+data-type-label="Video"\s+download="">/,
    video_thumbnail: /<meta\s+property="og:image"\s+content="([^"]+)"/,
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
    return getAllVideosPager(url, type, order, filters, continuationToken, query);
}

source.searchChannels = function (query) {
    if (platform.title.toLowerCase().includes(query.toLowerCase())) {
        return new ChannelPager([
            new PlatformChannel({
                id: getPlatformID(),
                name: platform.title,
                thumbnail: platform.icon,
                banner: null,
                subscribers: null,
                description: platform.description,
                url: platform.url,
                links: {}
            })], false);
    }
    return new ChannelPager([], false);
}

source.isChannelUrl = function(url) {
    return url == platform.url;
}

source.getChannel = function(url) {
    return new PlatformChannel({
        id: getPlatformID(),
        name: platform.title,
        thumbnail: platform.icon,
        banner: null,
        subscribers: null,
        description: platform.description,
        url: url,
        links: {}
    });
}

source.getChannelContents = function(url, type, order, filters, continuationToken) {
    return getAllVideosPager(url, type, order, filters, continuationToken);
}

source.isContentDetailsUrl = function(stringUrl) {
    try {
        const url = new URL(stringUrl);
        const pathname = url.pathname.replace(/\/$/, ''); // Remove trailing slash
        return (
        url.hostname === 'www.bibleproject.com' &&
        pathname.startsWith('/videos/') &&
        pathname !== '/videos/' &&
        pathname !== '/videos/all' &&
        pathname !== '/videos/collections'
        );
    } catch {
        return false;
    }
}

source.getContentDetails = function(url) {
    // Request video
    const videoResponse = http.GET(url, {});

    if (!videoResponse.isOk) {
        throw new ScriptException(`Failed to fetch video ${url} with code [${videoResponse.code}]`);
    };

    // Extract video details from html
    const videoSource = extractDetail(videoResponse.body, regexVariables.source_mp4);
    const videoTitle = extractDetail(videoResponse.body, regexVariables.video_title) || 'Unknown';
    const videoDescription = extractDetail(videoResponse.body, regexVariables.video_description) || 'Unknown';
    const videoThumbnail = extractDetail(videoResponse.body, regexVariables.video_thumbnail) || '';

    // Return the video details
    return new PlatformVideoDetails({
        id: new PlatformID(platform.title, videoTitle, config.id),
        name: videoTitle,
        thumbnails: new Thumbnails([new Thumbnail(videoThumbnail, 0)]),
        author: new PlatformAuthorLink(
            getPlatformID(),
            platform.title,
            platform.url,
            platform.icon
        ),
        url: url,
        uploadDate: null,
        duration: 9999,
        description: videoDescription,
        isLive: false,
        video: new VideoSourceDescriptor(
            [new VideoUrlSource({
                width: 1920,
                height: 1080,
                container: 'video/mp4',
                codec: 'avc1.4d401ea',
                name: 'mp4',
                bitrate: 13219201,
                duration: 999999,
                url: videoSource
            })]
        )
    });
}

// Helper: Parse React Router data endpoint serialization format
function parseReactRouterResponse(responseText) {
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
    
    for (let i = 0; i < root.length; i++) {
        const item = root[i];
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            const resolved = resolve(item);
            if (resolved && typeof resolved === 'object' && 'videosRange' in resolved) {
                return resolved;
            }
        }
    }
    return null;
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

    const data = parseReactRouterResponse(response.body);
    
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

        videos.push(getPlatformVideo({
            title: video.title || null,
            thumbnail: video.images && video.images.aspect16x9 ? video.images.aspect16x9 : null,
            url: video.href ? platform.regular_url + video.href : null,
            duration: video.durationSeconds || null
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
        datetime: null,
        duration: video.duration,
        viewCount: null,
        url: video.url,
        shareUrl: video.url,
        isLive: false
    });
}

// Helper: Convert duration to seconds for video duration
function durationToSeconds(duration) {
    if (duration) {
        const [minutes, seconds] = duration.split(':').map(Number);
        return minutes * 60 + seconds;
    }
}

// Helper: Extract detail using regex
function extractDetail(html, regex) {
    const match = html.match(regex);

    if (match) {
        return match[1];
    } else {
        return null;
    };
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
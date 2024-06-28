import {
  DiscoverListing,
  DiscoverListingOrientationType,
  DiscoverListingType,
  Paging,
  Playlist,
  PlaylistItem,
  PlaylistGroup,
  PlaylistDetails,
  PlaylistEpisodeServer,
  PlaylistEpisodeServerFormatType,
  PlaylistEpisodeServerQualityType,
  PlaylistEpisodeServerRequest,
  PlaylistEpisodeServerResponse,
  PlaylistEpisodeSource,
  PlaylistEpisodeSourcesRequest,
  PlaylistItemsResponse,
  PlaylistStatus,
  PlaylistType,
  SearchFilter,
  SearchQuery,
  SourceModule,
} from "@mochiapp/js";
import * as cheerio from "cheerio";
import { load } from "cheerio"

export default class Turkish123 extends SourceModule {

  metadata = {
    id: "Turkish123",
    name: "Turkish123",
    version: "1.1.3",
    icon: "https://turkish123.ac/wp-content/themes/TurkishSeries/assets/css/img/favicon.png"
  };

  async searchFilters(): Promise<SearchFilter[]> {
    // TODO
    return [];
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    let encodedURI: string;

      encodedURI = encodeURI(`https://turkish123.ac/?s=${query.query}`);
    

    const response = await request.get(encodedURI);

    const $ = cheerio.load(response.text());
    //console.log(response.text());
    return parsePageListing($);
  }

  async discoverListings(): Promise<DiscoverListing[]> {
 
    const response = await request.get(`https://turkish123.ac/genre/history/`);
    const $ = cheerio.load(response.text());

    const carousels = $("div.movies-list")
      .toArray()
      .map((carousel) => {
        return {
          id: "Featured",
          title: "Featured",
          type: DiscoverListingType.featured,
          orientation: DiscoverListingOrientationType.landscape,
          paging: {
            id: "0",
            items: $(carousel)
              .find("div.ml-item")
              .toArray()
              .map((a) => {
                return {
                  id: $(a).find('a.jt').attr('href')!,
                  title: $(a).find("span.mli-info").text(),
                  posterImage:`${$(a).find("img").attr("src")!.replace("english", 'with-english')}`,
                  bannerImage: undefined,
                  url: `${$(a).find('a.jt').attr('href')}`,
                  status: PlaylistStatus.unknown,
                  type: PlaylistType.video,
                } satisfies Playlist;
              }),
          },
        } satisfies DiscoverListing;
      });

    return [...carousels];
  }
  async playlistDetails(id: String): Promise<PlaylistDetails> {
    const response = await request.get(id.toString());
    const $ = cheerio.load(response.text());
    const genre = $("div.mvici-left").find("a").toArray().map((genre) => $(genre).text());
    const about = $('p.f-desc').text();
    return {
      synopsis: about,
      altTitles: [],
      altPosters: [],
      altBanners: [],
      genres: genre,
      previews: [],
    };
  }
  

  async playlistEpisodes(
    playlistId: string
  ): Promise<PlaylistItemsResponse> {
    const html = await request.get(playlistId).then(resp => resp.text());
    const $ = load(html);
    var id = ""

    const playlistGroups: PlaylistGroup[] = $("div.les-content").map(() => {
      const items: PlaylistItem[] = $("a.episodi")
      .toArray()
      .map((a) => {
        console.log(parseInt($(a).text().match(/Episode (\d+)/)![1]));
        let id = `${$(a).attr("href")!}-${parseInt($(a).text().match(/Episode (\d+)/)![1])}`
        return {
          id: $(a).attr("href")!,
          number: parseInt($(a).text().match(/Episode (\d+)/)![1]),
          tags: []
        } satisfies PlaylistItem
  
      })
      return {
        id: id,
        number: 1,
        variants: [{
          id: id,
          title: "Episodes",
          pagings: [{
            id: id,
            items
          }]
        }]
      }
    }).get()

    return playlistGroups;
  }


  async playlistEpisodeSources(req: PlaylistEpisodeSourcesRequest): Promise<PlaylistEpisodeSource[]> {
    //console.log(req.episodeId);
    const url = req.episodeId;
    const html = await request.get(url).then(resp => resp.text());
    const $ = load(html);
    const jsSnippet = $('div.movieplay script').toString();
    const serverurl = jsSnippet.indexOf('https://tukipasti.com');
    const urlStartIndex = jsSnippet.indexOf('https://tukipasti.com');
    var streamurl = "";
    if (serverurl !== -1) {
      const urlEndIndex = jsSnippet.indexOf('"', serverurl);
      const extractedURL = jsSnippet.substring(urlStartIndex, urlEndIndex);
      const html2 = await request.get(extractedURL).then(resp => resp.text());
      const $2 = load(html2);
      const scripts = $2('script');
      scripts.each((_, script) => {
          const scriptContent = $(script).html()!;
          if (scriptContent.includes('urlPlay =')) {
            const urlPlayValue = scriptContent
            ? scriptContent
                .split('\n')
                .find(line => line.includes('urlPlay ='))
                ?.split('=')[1]
                ?.trim()
                ?.replace(/[';]/g, '') ?? ''
            : '';
            streamurl = urlPlayValue
          }
      });
      }
    return [{
      id: "servers",
      description: "Turkish123 Servers",
      servers: [{
        id: streamurl,
        displayName: `Default`
      } satisfies PlaylistEpisodeServer],
      displayName: "TukiPasti"
    }];
  }

  async playlistEpisodeServer(req: PlaylistEpisodeServerRequest): Promise<PlaylistEpisodeServerResponse> {

    const mainUrl = req.serverId;
    const referer = 'https://tukipasti.com';
    const html = await request.get(mainUrl, { headers: { referer } }).then(resp => resp.text());
    console.log(html.split('\n')[html.split('\n').length - 2]);

    return {
      links:  [{
        url: req.serverId,
        // url: `https://m3u8-proxy-cors-wl83.onrender.com/cors?url=${req.serverId.substring(0, req.serverId.length - 11)}${html.split('\n')[html.split('\n').length - 2]}&headers={"referer":"https://tukipasti.com"}`,
        quality: PlaylistEpisodeServerQualityType.auto,
        format: PlaylistEpisodeServerFormatType.hsl
      }],
      subtitles: [],
      skipTimes: [],
      headers: {"referer":"https://tukipasti.com"}
    }
  }
}



export const parsePageListing = ($: cheerio.CheerioAPI): Paging<Playlist> => {
  const items: Playlist[] = [];

  $('div.ml-item').each((_, element) => {
      const id = $(element).find('a.jt').attr('href')!;
      const title = $(element).find('span.mli-info').text();
      const image = `${$(element).find("img").attr("src")!.replace("english", 'with-english')}`;
      console.log(title);    

          items.push({
              id: id,
              title: title,
              posterImage: image,
              url: `https://turkish123.ac/${id}`,
              status: PlaylistStatus.ongoing,
              type: PlaylistType.video
          });
      
  });

  return {
      id: "1",
      previousPage: undefined,
      nextPage: undefined,
      title: 'Page 1',
      items: items
  };
};


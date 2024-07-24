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
    name: "Streamed",
    version: "1.1.2",
    icon: "https://streamed.su/favicon.png"
  };

  async searchFilters(): Promise<SearchFilter[]> {
    // TODO
    return [];
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    throw new Error("Method not implemented.");
  }

  async discoverListings(): Promise<DiscoverListing[]> {
    const response = await request.get(`https://streamed.su/`);
    const $ = cheerio.load(response.text());

    const categories = $("div.grid.grid-cols-2.gap-2.w-full a.transition-all");

    const carousels = await Promise.all(categories.toArray().map(async (category) => {
        const title = $(category).find("h2").text();
        const url = `https://streamed.su${$(category).attr('href')!}`;
        const categoryResponse = await request.get(url);
        const category$ = cheerio.load(categoryResponse.text());
        const items = category$("div.w-full > a").toArray().map((item) => ({
            id: `https://streamed.su${category$(item).attr('href')!}`,
            title: category$(item).find("h1").text(),
            posterImage: `https://es.ignores.top/thumb/${category$(item).attr('href')!.substring(6)}/1`,
            bannerImage: undefined,
            url: `https://streamed.su${category$(item).attr('href')!}`,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video,
        }));

        return {
            id: title,
            title: title,
            type: DiscoverListingType.default,
            orientation: DiscoverListingOrientationType.landscape,
            paging: {
                id: "0",
                items: items,
            },
        } satisfies DiscoverListing;
    }));

    return carousels;
}

  async playlistDetails(id: String): Promise<PlaylistDetails> {
    // const response = await request.get(id.toString());
    // const $ = cheerio.load(response.text());
    return {
      synopsis: id.toString(),
      altTitles: [],
      altPosters: [],
      altBanners: [],
      genres: [],
      previews: [],
    };
  }
  

  async playlistEpisodes(
    playlistId: string
  ): Promise<PlaylistItemsResponse> {
    const html = await request.get(playlistId).then(resp => resp.text());
    const $ = load(html);
  
    let counter = 1; // Initialize counter variable
  
    const playlistGroups: PlaylistGroup[] = $("div.container").map(() => {
      const items: PlaylistItem[] = $("div.w-full")
        .find("a.rounded-lg")
        .toArray()
        .map((a) => {
          const playlistItem: PlaylistItem = {
            id: `https://streamed.su${$(a).attr('href')!}`,
            title: `${$(a).find("h1").text()}`,
            number: counter++, // Increment counter and assign its value
            tags: []
          };
          return playlistItem;
        });
  
      return {
        id: "1",
        number: 1,
        variants: [{
          id: "1",
          title: "",
          pagings: [{
            id: "",
            items
          }]
        }]
      };
    }).get();

    return playlistGroups;
  }


  async playlistEpisodeSources(req: PlaylistEpisodeSourcesRequest): Promise<PlaylistEpisodeSource[]> {
    //console.log(req.episodeId);
    const url = req.episodeId.substring(26);
    //console.log(url);
    return [{
      id: "servers",
      description: "TVEmbed",
      servers: [{
        id: `https://rr.vipstreams.in/js/${url}/playlist.m3u8`,
        displayName: `TVEmbed`
      } satisfies PlaylistEpisodeServer],
      displayName: "TVEmbed"
    }];
  }

  async playlistEpisodeServer(req: PlaylistEpisodeServerRequest): Promise<PlaylistEpisodeServerResponse> {
    var accessibleUrl = "";

    const headers = {
    'Referer':'https://embedme.top'
    };
    
    const html = await request.get(req.serverId, { headers }).then(resp => resp.text());
    console.log(req.serverId)
    if (html.includes('#EXTM3U')) {
      accessibleUrl = req.serverId
      
    }
    else
    {
      accessibleUrl = "https://babyyoda777.github.io/down.m3u8"
    }

    return {
      links:  [{
        url: req.serverId,
        quality: PlaylistEpisodeServerQualityType.auto,
        format: PlaylistEpisodeServerFormatType.hsl
      }],
      subtitles: [],
      skipTimes: [],
      headers: {"Referer" : "https://embedme.top/"}
    }
  }
}

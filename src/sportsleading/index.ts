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
  SourceModule
} from "@mochiapp/js";
import * as cheerio from "cheerio";
import { load } from "cheerio"
import { data } from "cheerio/lib/api/attributes";

export default class Sportsleading extends SourceModule {
  metadata = {
    name: "Sportsleading",
    version: "0.0.1",
  };

  async searchFilters(): Promise<SearchFilter[]> {
    throw new Error("Method not implemented.");
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    throw new Error("Method not implemented.");
  }

  async discoverListings(): Promise<DiscoverListing[]> {
    const response = await request.get(`https://sports-tv-channels.click`);
    const $ = cheerio.load(response.text());

    const categories = $("div.col-sm-9 > div.row");
    const carousels = await Promise.all(categories.toArray().map(async (category) => {
      
      const title = "Live TV";
      const url = `https://sports-tv-channels.click`;
      const categoryResponse = await request.get(url);
      const category$ = cheerio.load(categoryResponse.text());
      const items = category$("div.col-md-4").toArray().map((item) => ({
          id: `${category$(item).find("a").attr('href')!}`,
          title: category$(item).find("h2").text(),
          bannerImage: `https://sports-tv-channels.click${category$(item).find("img").attr('src')!}`,
          url: `${category$(item).attr('href')!}`,
          status: PlaylistStatus.ongoing,
          type: PlaylistType.video,
      }));
      return {
          id: title,
          title: title,
          type: DiscoverListingType.featured,
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
    const key =  await request.get($('main > script').html()!.match(/https?:\/\/[^\s'"]+/g)![0].toString())
    .then(resp => resp.text())
    // Initialize the counter variable
     let counter = 1;

    const playlistGroups: PlaylistGroup[] = $("main").map(() => {
      const items: PlaylistItem[] = $('main > script')
        .last()
        .toArray()
        .map( (a) => {
          const urls = $(a).html()!.match(/https?:\/\/[^\s'"]+/g);
          console.log(urls![1] + key.toString().replace(/\s+/g, '').substring(12, key.toString().replace(/\s+/g, '').length - 2));
   
          const playlistItem: PlaylistItem = {
            id: `${urls![1] + key.toString().replace(/\s+/g, '').substring(12, key.toString().replace(/\s+/g, '').length - 2)}`,
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
    const url = req.episodeId;
    return [{
      id: "servers",
      description: "Sportsleading",
      servers: [{
        id: `${url}`,
        displayName: `Sportsleading`
      } satisfies PlaylistEpisodeServer],
      displayName: "Sportsleading"
    }];
  }

  async playlistEpisodeServer(req: PlaylistEpisodeServerRequest): Promise<PlaylistEpisodeServerResponse> {
    return {
      links:  [{
        url: req.serverId,
        quality: PlaylistEpisodeServerQualityType.auto,
        format: PlaylistEpisodeServerFormatType.hsl
      }],
      subtitles: [],
      skipTimes: [],
      headers: {
        "Accept": "*/*",
        }}
  }
}
 

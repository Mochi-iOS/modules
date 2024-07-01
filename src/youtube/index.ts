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

const api = "pipedapi.kavin.rocks"

export default class Youtube extends SourceModule {
  metadata = {
    name: "YouTube",
    version: "1.0.0",
    icon: "https://i.ibb.co/25tW4sZ/youtube.png"
  };

  async searchFilters(): Promise<SearchFilter[]> {
    throw new Error("Method not implemented.");
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    let encodedURI: string;

    encodedURI = encodeURI(`https://${api}/search?q=${query.query}&filter=all`);
  

    const response = await request.get(encodedURI);

  //const $ = cheerio.load(response.text());
    // console.log(response.text());
    return parsePageListing(response.json());
  }

  async discoverListings(): Promise<DiscoverListing[]> {
    const response1 = await request.get(`https://${api}/trending?region=US`);
    const response2 = await request.get(`https://${api}/trending?region=GB`);
    const response3 = await request.get(`https://${api}/trending?region=IN`);
    const response4 = await request.get(`https://${api}/trending?region=NZ`);
    const data1 = response1.json() as any;
    const data2 = response2.json() as any;
    const data3 = response3.json() as any;
    const data4 = response4.json() as any;
    const count = 47
    const items1: Playlist[] = [];
    const items2: Playlist[] = [];
    const items3: Playlist[] = [];
    const items4: Playlist[] = [];
    for (let i = 0; i < count; i++){
      items1.push(
        
          {
            id: data1[i].uploaderUrl ?? "",
            title: data1[i].uploaderName,
            posterImage: data1[i].thumbnail,
            bannerImage: undefined,
            url: data1[i].url,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video,
         } satisfies Playlist
        
      )
    }

    for (let i = 0; i < count; i++){
      items2.push(
        
          {
            id: data2[i].uploaderUrl ?? "",
            title: data2[i].uploaderName,
            posterImage: data2[i].thumbnail,
            bannerImage: undefined,
            url: data2[i].url,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video,
         } satisfies Playlist
        
      )
    }

    for (let i = 0; i < count; i++){
      items3.push(
        
          {
            id: data3[i].uploaderUrl ?? "",
            title: data3[i].uploaderName,
            posterImage: data3[i].thumbnail,
            bannerImage: undefined,
            url: data3[i].url,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video,
         } satisfies Playlist
        
      )
    }

    for (let i = 0; i < count; i++){
      items4.push(
        
          {
            id: data4[i].uploaderUrl ?? "",
            title: data4[i].uploaderName,
            posterImage: data4[i].thumbnail,
            bannerImage: undefined,
            url: data4[i].url,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video,
         } satisfies Playlist
        
      )
    }

return [ {
    id: "Featured",
    title: "Featured",
    type: DiscoverListingType.featured,
    orientation: DiscoverListingOrientationType.landscape,
    paging: {
      id: "0",
      items: items1
    } 
  },
  {
    id: "Featured UK",
    title: "UK",
    type: DiscoverListingType.default,
    orientation: DiscoverListingOrientationType.landscape,
    paging: {
      id: "0",
      items: items2
    } 
  },
  {
    id: "Featured India",
    title: "India",
    type: DiscoverListingType.default,
    orientation: DiscoverListingOrientationType.landscape,
    paging: {
      id: "0",
      items: items3
    } 
  },
  {
    id: "Featured New Zealand",
    title: "New Zealand",
    type: DiscoverListingType.default,
    orientation: DiscoverListingOrientationType.landscape,
    paging: {
      id: "0",
      items: items4
    } 
  } satisfies DiscoverListing
]


  }

  async playlistDetails(id: String): Promise<PlaylistDetails> {
    const response = await request.get(`https://${api}${id.toString()}`);
    const data = await response.json() as any;


    return {
      synopsis: data.description ?? "",
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
    const response = await request.get(`https://${api}${playlistId.toString()}`);
    const data = await response.json() as any;
  
    let counter = 1; // Initialize counter variable
  
    // Map over the relatedStreams array to create PlaylistItem objects
    const items = data.relatedStreams.map(stream => {
      return {
        id: stream.url,
        title: limitText(stream.title.toString(), 23),
        thumbnail: stream.thumbnail.toString(),
        number: counter++, // Increment counter and assign its value
        tags: []
      };
    });

    
  
    // Create the PlaylistGroup object
    const playlistGroup = {
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
  
    return [playlistGroup];
  }


  async playlistEpisodeSources(req: PlaylistEpisodeSourcesRequest): Promise<PlaylistEpisodeSource[]> { 
    const videoid = req.episodeId.toString().substring(req.episodeId.indexOf('/watch?v=') + '/watch?v='.length)
    console.log(videoid)
    return [{
      id: "servers",
      description: "YouTube",
      servers: [{
        id: videoid,
        displayName: `Piped`
      } satisfies PlaylistEpisodeServer],
      displayName: "YouTube"
    }
  ];
  }

  async playlistEpisodeServer(req: PlaylistEpisodeServerRequest): Promise<PlaylistEpisodeServerResponse> {
    const pipedresponse = await request.get(`https://${api}/streams/${req.serverId.toString()}`);
    const pipeddata = await pipedresponse.json() as any;
    console.log(`https://${api}/streams/${req.serverId.toString()}`)
    console.log(pipeddata.hls)
    return {
      links:  [
        {
        url: pipeddata.hls,
        quality: PlaylistEpisodeServerQualityType.auto,
        format: PlaylistEpisodeServerFormatType.hsl
      }
    ],
      subtitles: [],
      skipTimes: [],
      headers: {}
    }
  }

}
interface JsonItem {
  url: string;
  type: string;
  title: string;
  thumbnail: string;
  name?: string;
  uploaderName?: string;
  uploaderUrl?: string;
  uploaderAvatar?: string;
  uploadedDate?: string;
  shortDescription?: string;
  duration?: number;
  views?: number;
  uploaded?: number;
  uploaderVerified?: boolean;
  isShort?: boolean;
}

interface JsonData {
  currentPage: number;
  hasNextPage: boolean;
  items: JsonItem[];
}

export const parsePageListing = (jsonData: JsonData): Paging<Playlist> => {
  const items: Playlist[] = [];

  // Filter items to only include those where type is "channel"
  const filteredItems = jsonData.items.filter(item => item.type === "channel");

  filteredItems.forEach(item => {
    const id = item.uploaderUrl ?? item.url; // Using URL as ID
    const title = item.title ?? item.name;
    const image = item.thumbnail;
    const url = item.url;

    items.push({
      id: id,
      title: title,
      posterImage: image,
      url: url,
      status: PlaylistStatus.ongoing, // Adjust status based on your logic
      type: PlaylistType.video // Adjust type based on your logic
    });
  });

  return {
    id: "1",
    previousPage: undefined,
    nextPage: jsonData.hasNextPage ? "2" : undefined, // Adjust page ID as needed
    title: `Page ${jsonData.currentPage}`,
    items: items
  };
};


function limitText(text, maxLength) {
  if (text.length > maxLength) {
      return text.slice(0, maxLength) + '...';
  } else {
      return text;
  }
}

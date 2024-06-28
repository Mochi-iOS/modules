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

export default class VidSrc extends SourceModule {
  metadata = {
    name: "VidSrc",
    version: "0.0.1",
  };

  async searchFilters(): Promise<SearchFilter[]> {
    return []
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    return {
      id: "",
      items: []
    }
  }

  
  async discoverListings(): Promise<DiscoverListing[]> {
    try {
      const movie = await request.get("https://vidsrc.to/vapi/movie/new");
      const tv = await request.get("https://vidsrc.to/vapi/tv/new");
      // Check if the response status is successful
      if (movie.status && tv.status === 200) {
        const moviedata = movie.json() as any;
        const tvdata = tv.json() as any;
        
        const items = await Promise.all(moviedata.result.items.map(async (item: any) => {
          const movieDataResponse = await request.get(`https://consumet.azlan.works/meta/tmdb/info/${item.tmdb_id}?type=movie`);
          const movieData = await movieDataResponse.json() as any;
  
          return {
            id: item.imdb_id,
            title: item.title,
            posterImage: movieData.image,
            bannerImage: undefined,
            url: item.embed_url_imdb,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video
          };
        }));

        const items2 = await Promise.all(tvdata.result.items.map(async (item: any) => {
          const tvDataResponse = await request.get(`https://consumet.azlan.works/meta/tmdb/info/${item.tmdb_id}?type=tv`);
          const tvData = await tvDataResponse.json() as any;
  
          return {
            id: item.imdb_id,
            title: item.title,
            posterImage: tvData.image,
            bannerImage: undefined,
            url: item.embed_url_imdb,
            status: PlaylistStatus.unknown,
            type: PlaylistType.video
          };
        }));
        

        
        const carousel: DiscoverListing = {
          id: "Movies",
          title: "Movies",
          type: DiscoverListingType.featured,
          orientation: DiscoverListingOrientationType.landscape,
          paging: {
            id: "0",
            items: items
          }
        };

        const carousel2: DiscoverListing = {
          id: "TV",
          title: "TV",
          type: DiscoverListingType.featured,
          orientation: DiscoverListingOrientationType.landscape,
          paging: {
            id: "1",
            items: items2
          }
        };
        
        return [carousel, carousel2];
      } else {
        throw new Error(`Request failed with status code ${movie.status}`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
    
  }
  

  async playlistDetails(id: string): Promise<PlaylistDetails> {
    
    try {
      // Try fetching movie details
      const movieResponse = await request.get(`https://consumet.azlan.works/meta/tmdb/info/${id}?type=movie`);
      const movieData = await movieResponse.json() as any;
  
      // If movie details are available, return the synopsis
      if (movieData && movieData.description) {
        return {
          synopsis: movieData.description,
          altTitles: [],
          altPosters: [],
          altBanners: [],
          genres: [],
          previews: []
        };
      }
    } catch (error) {
      try {
        // If movie details couldn't be fetched, try fetching TV show details
        const tvResponse = await request.get(`https://consumet.azlan.works/meta/tmdb/info/${id}?type=tv`);
        const tvData = await tvResponse.json() as any;
    
        // If TV show details are available, return the synopsis
        if (tvData && tvData.description) {
          return {
            synopsis: tvData.description,
            altTitles: [],
            altPosters: [],
            altBanners: [],
            genres: [],
            previews: []
          };
        }
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      }
    }
  

  
    // If both movie and TV show details couldn't be fetched or didn't contain a description, return an empty synopsis
    return {
      synopsis: "",
      altTitles: [],
      altPosters: [],
      altBanners: [],
      genres: [],
      previews: []
    };
  }
}
  
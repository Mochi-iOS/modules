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

export default class Braflix extends SourceModule {
  metadata = {
    name: "uFlix",
    icon: "",
    version: "1.0.3",
  };

  async searchFilters(): Promise<SearchFilter[]> {
    // TODO
    return [];
  }

  async search(query: SearchQuery): Promise<Paging<Playlist>> {
    const response = await request.get(`https://uflix.cc/search?keyword=${query.query}`);
    const $ = cheerio.load(response.text());

    return parsePageListing($);
  }

  async discoverListings(): Promise<DiscoverListing[]> {
    const response = await request.get(`https://uflix.cc/trending-movies`);
    const $ = cheerio.load(response.text());
    const response2 = await request.get(`https://uflix.cc/trending-series`);
    const $2 = cheerio.load(response2.text());

    const items1: Playlist[] = [];
    const items2: Playlist[] = [];


        $("div.row")
        .find("div.col-lg-2")
        .toArray()
        .map((a) => {
          items1.push(
            
            {
              id: `https://uflix.cc${$(a).find('a').attr('href')}`,
              title: $(a).find("h3").text(),
              posterImage: `https://uflix.cc${$(a).find("img").attr("src")!}`,
              bannerImage: undefined,
              url: `https://uflix.cc${$(a).find('a').attr('href')}`,
              status: PlaylistStatus.unknown,
              type: PlaylistType.video,
          } satisfies Playlist
          )
        })


        $2("div.row")
        .find("div.col-lg-2")
        .toArray()
        .map((a) => {
          items2.push(
            
            {
              id: `https://uflix.cc${$2(a).find('a').attr('href')}`,
              title: $2(a).find("h3").text(),
              posterImage: `https://uflix.cc${$2(a).find("img").attr("src")!}`,
              bannerImage: undefined,
              url: `https://uflix.cc${$2(a).find('a').attr('href')}`,
              status: PlaylistStatus.unknown,
              type: PlaylistType.video,
          } satisfies Playlist
          )
        })

        return [ {
          id: "Trending Movies",
          title: "Trending Movies",
          type: DiscoverListingType.default,
          orientation: DiscoverListingOrientationType.portrait,
          paging: {
            id: "0",
            items: items1
          } 
        },
        {
          id: "Trending Series",
          title: "Trending Series",
          type: DiscoverListingType.default,
          orientation: DiscoverListingOrientationType.portrait,
          paging: {
            id: "0",
            items: items2
          } 
        } satisfies DiscoverListing
      ]
}


  async playlistDetails(id: String): Promise<PlaylistDetails> {
    const response = await request.get(id.toString());
    const $ = cheerio.load(response.text());
    var textArray = $("div.card-tag a").map(function() {
      return $(this).text();
  }).get();

    return {
      synopsis: $("p.text-muted").text() ?? "",
      altTitles: [],
      altPosters: [],
      altBanners: [],
      genres: textArray,
      previews: [],
    };
  }


  async playlistEpisodes(
    playlistId: string
  ): Promise<PlaylistItemsResponse> {
    const html = await request.get(playlistId).then(resp => resp.text());
    const $ = load(html);
    var playlistGroups: PlaylistGroup[] = [];
    
    if ($('li.breadcrumb-item a').text() == "Movie") {
      playlistGroups = [{
        id: "1",
        number: 1,
        variants: [{
          id: "1",
          title: "Movie",
          pagings: [{
            id: "",
            items: [{
              id: `https://uflix.cc${$("iframe").attr('src')}`,
              title: $("h1.h3").first().text(),
              number: 1,
              tags: []
            }]
          }]
        }]
      }];
    } else {
      // Define an async function to be able to use await inside map
      const processSeason = async (season) => {
        const seasonTitle = $(season).find("div.accordion-header").text();
        return {
          id: seasonTitle,
          number: parseInt(extractIntegersFromString(seasonTitle)),
          variants: [{
            id: seasonTitle,
            title: seasonTitle,
            pagings: [{
              id: "1",
              items: await Promise.all($(season).find("div.card-episode").toArray().map(async (episode) => {
                const html2 = await request.get(`https://uflix.cc${$(episode).find("a.name").attr('href')}`).then(resp => resp.text());
                const $2 = load(html2);
    
                return {
                  id: `https://uflix.cc${$2("iframe").attr('src')}`,
                  title: $(episode).find("a.name").text(),
                  number: parseInt(extractIntegersFromString($(episode).find("a.episode").text())),
                  tags: []
                };
              }))
            }]
          }]
        };
      };
    
      // Use Promise.all to wait for all async mappings to complete
      const variants = await Promise.all($("div.accordion-item").toArray().map(processSeason));
    
      playlistGroups = variants;
    }
    
    return playlistGroups;    
  }

  async playlistEpisodeSources(req: PlaylistEpisodeSourcesRequest): Promise<PlaylistEpisodeSource[]> {
    console.log(req.episodeId)
    const html = await request.get(req.episodeId).then(resp => resp.text());
    const $ = load(html);
    
    let id = getIMDB($("div").attr("data-movie-id")?.toString()!)

    return [{
      id: "servers",
      description: "Vidsrc",
      servers: [{
        id: id,
        displayName: `VIDSRC`
      } satisfies PlaylistEpisodeServer],
      displayName: "VIDSRC"
    }];
  }

  async playlistEpisodeServer(req: PlaylistEpisodeServerRequest): Promise<PlaylistEpisodeServerResponse> {

    var response;

    if (req.serverId.includes("|S")) {
      let imdb = episodeData(req.serverId).imdbID;
      let episode = episodeData(req.serverId).episodeNumber;
      let season = episodeData(req.serverId).seasonNumber;
      response = (await request.get(`https://vidsrc-api-js-two.vercel.app/vidsrc/${imdb}?s=${season}&e=${episode}`)).text();
    } else {
      response = (await request.get(`https://vidsrc-api-js-two.vercel.app/vidsrc/${req.serverId}`)).text();
    }

  
    
    try {
      const json = JSON.parse(response);
      const subtitles = json.vidsrc.subtitles
      console.log(subtitles[12])
      var fhd = "";
      var hd = "";
      var low = "";
      
      await parseM3U8(json.vidsrc.source).then(parser => {
        fhd = parser['1920x1080'];
        hd = parser['1280x720'];
        low = parser['640x360'];
      }).catch(error => {
        console.error('Error fetching or parsing M3U8:', error);
      });
      
      return {
        links: [
          {
            url: fhd,
            quality: PlaylistEpisodeServerQualityType.q1080p,
            format: PlaylistEpisodeServerFormatType.hsl
          },
          {
            url: hd,
            quality: PlaylistEpisodeServerQualityType.q720p,
            format: PlaylistEpisodeServerFormatType.hsl
          },
          {
            url: low,
            quality: PlaylistEpisodeServerQualityType.q360p,
            format: PlaylistEpisodeServerFormatType.hsl
          }
        ],
        subtitles: [],
        skipTimes: [],
        headers: {}
      };
    
    } catch (error) {
      console.error('Error parsing JSON:', error);
      // Handle JSON parsing error gracefully
      return {
        links: [],
        subtitles: [],
        skipTimes: [],
        headers: {}
      };
    }
    
  }

}
  

export const parsePageListing = ($: cheerio.CheerioAPI): Paging<Playlist> => {
  const items: Playlist[] = [];

  $("div.row")
  .find("div.col-lg-2")
  .toArray()
  .map((a) => {
    items.push(
      
      {
        id: `https://uflix.cc${$(a).find('a').attr('href')}`,
        title: $(a).find("h3").text(),
        posterImage: `https://uflix.cc${$(a).find("img").attr("src")!}`,
        bannerImage: undefined,
        url: `https://uflix.cc${$(a).find('a').attr('href')}`,
        status: PlaylistStatus.unknown,
        type: PlaylistType.video,
    } satisfies Playlist
    )
  })

  return {
      id: "1",
      previousPage: undefined,
      nextPage: undefined,
      title: 'Page 1',
      items: items
  };
};

function extractIntegersFromString(str) {
  // Use regex to find all sequences of digits in the string
  const matches = str.match(/\d+/g);
  
  // Convert the matched sequences into integers
  const integers = matches ? matches.map(Number) : [];
  
  return integers;
}
function getIMDB(str) {
  // Split the string at 'imdb:'
  const parts = str.split('imdb:');
  
  // If 'imdb:' is found, return the part after it, otherwise return an empty string
  return parts.length > 1 ? parts[1].trim() : '';
}

function episodeData(input) {
  // Split the input string by '|'
  const parts = input.split('|');
  
  // IMDb ID is the first part
  const imdbID = parts[0];
  
  // Second part contains season and episode information
  const seasonEpisode = parts[1];
  
  // Find the position of 'S' and 'E'
  const indexS = seasonEpisode.indexOf('S');
  const indexE = seasonEpisode.indexOf('E');
  
  // Extract season number and episode number
  let seasonNumberStr = seasonEpisode.substring(indexS + 1, indexE);
  let episodeNumberStr = seasonEpisode.substring(indexE + 1);
  
  // Parse season number and episode number as integers
  const seasonNumber = parseInt(seasonNumberStr, 10);
  const episodeNumber = parseInt(episodeNumberStr, 10);
  
  // Return an object with the parsed values
  return {
      imdbID: imdbID,
      seasonNumber: seasonNumber,
      episodeNumber: episodeNumber
  };
}



async function parseM3U8(url) {
  try {
      // Fetch the M3U8 playlist
      const response = await request.get(url);
      const playlistText = await response.text();

      // Split the playlist into lines
      const lines = playlistText.trim().split('\n');
      
      let videoUrls = {};

      // Process each line of the playlist
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Check if it's an EXT-X-STREAM-INF line (indicating a video quality)
          if (line.startsWith('#EXT-X-STREAM-INF')) {
              // Extract BANDWIDTH and RESOLUTION information
              const regexBandwidth = /BANDWIDTH=(\d+)/;
              const regexResolution = /RESOLUTION=(\d+x\d+)/;
              
              const bandwidthMatch = line.match(regexBandwidth);
              const resolutionMatch = line.match(regexResolution);

              if (bandwidthMatch && resolutionMatch) {
                  const bandwidth = parseInt(bandwidthMatch[1]);
                  const resolution = resolutionMatch[1];
                  
                  // Extract the URL of the video file for this quality
                  const nextLineUrl = lines[i + 1].trim();
                  videoUrls[resolution] = url.substring(0, url.lastIndexOf('/') + 1) + nextLineUrl;
              }
          }
      }

      // Define a proxy to handle property access dynamically
      const handler = {
          get: function(target, prop, receiver) {
              // Check if the property is a resolution like '1080p'
              if (target.hasOwnProperty(prop)) {
                  return target[prop];
              }
              // If the property is a method to get by resolution (e.g., '1080p')
              if (prop in target) {
                  return function() {
                      return target[prop]();
                  };
              }
              return undefined;
          }
      };

      // Return a Proxy object that dynamically resolves property access
      return new Proxy(videoUrls, handler);

  } catch (error) {
      console.error('Error parsing M3U8 playlist:', error);
      return null;
  }
}

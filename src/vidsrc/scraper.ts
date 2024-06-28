// A typescript written extractor for vidsrc.me based on ciarands and movie-web extractors to deploy as cloudflare workers.
// Written by: cool-dev-guy
// Github : https://github.com/cool-dev-guy
// Note:This project is written as a proof of concept and as a study material,So the author is not responsible for any issues caused by this.Use this at your own risk,This Project dosent have warranty.
import cheerio from "cheerio";
import { decodeHunter } from './hunter';
import { string } from "zod";
// BLACKLISTED due to server down.
const BLACKLISTED = ['VidSrc Hydrax','2Embed']
export interface Env {

}

async function hexToBytes(hex: string): Promise<Uint8Array> {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

async function GETStreamServer(name:string,server:string,base:string):Promise<{name:string,url:string,referer:string}>{
  const VIDSRC_SERVER_URL = `https://rcp.vidsrc.me/rcp/${server}`;
  const VIDSRC_SERVER_RESP = await fetch(VIDSRC_SERVER_URL, {
      headers: { Referer: base }
  });
  // console.log(await VIDSRC_SERVER_RESP.text());
  const $ = await cheerio.load(await VIDSRC_SERVER_RESP.text());
  const encodedStreamServer:string = await $("div#hidden").attr('data-h')?.toString()!;
  const subtitleSeed:string = await $("body").attr("data-i")?.toString()!;
  // GET THE STREAMING SERVER URLS
  let decodedStreamServer:string = '';
  const encodedStreamServerBuffer = await hexToBytes(encodedStreamServer);
  for (let i=0;i<encodedStreamServerBuffer.length;i++){
      decodedStreamServer += String.fromCharCode(encodedStreamServerBuffer[i] ^ subtitleSeed.charCodeAt(i % subtitleSeed.length));
  }
  decodedStreamServer = decodedStreamServer.startsWith('//')?'https:'+decodedStreamServer:decodedStreamServer;
  const SERVER_API_RESP = await fetch(decodedStreamServer, {
      redirect: 'manual',
      headers: { Referer: VIDSRC_SERVER_URL }
  });
  const SERVERIdentifier:string = await SERVER_API_RESP.headers.get('location')?.toString()!;
  return {name:name,url:SERVERIdentifier,referer:VIDSRC_SERVER_URL};
}

async function handleVidsrc(url: string, referer: string): Promise<{Hls:string|null,Subtitle:{lang:string,file:string}[]|null}> {
  const MAX_TRIES = 5;
  try {
    const VIDSRC_PRO_BASE = await fetch(url, {
      headers: { Referer: referer }
    });
    const responseText = await VIDSRC_PRO_BASE.text();
    const regex = /file:"([^"]*)"/;
    const match = regex.exec(responseText);
    if (match) {
      let hlsUrl = match[1].replace(/\/\/\S+?=/g, '').substring(2);
      for (let i = 0; i < MAX_TRIES; i++) {
        hlsUrl = hlsUrl.replace(/\/@#@\/[^=\/]+==/, "");
        if (!hlsUrl.match(/\/@#@\/[^=\/]+==/)) break;
      }
  
      hlsUrl = hlsUrl.replace(/_/g, '/').replace(/-/g, '+');
      const decodedUrl = atob(hlsUrl);
      return {Hls:decodedUrl,Subtitle:null};
    } 
    else{
      return {Hls:null,Subtitle:null};
    }
  }
  catch (error){
    console.log(error);
    return {Hls:null,Subtitle:null};
  }
}

async function handleSuperEmbed(url:string,referer:string):Promise<{Hls:string|null,Subtitle:{lang:string,file:string}[]|null}>{
	console.log(url)
  try{
    const SUPER_EMB_BASE = await fetch(url, {
      headers: {
        Referer: referer,
        "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    const responseText = await SUPER_EMB_BASE.text()
    // GET HUNTER function.
    const regex = /eval\(function\(h,u,n,t,e,r\).*?\("(.*?)",\d*?,"(.*?)",(\d*?),(\d*?),\d*?\)\)/;
    const linkRegex = /file:"(.*?)"/;
    const match = responseText.match(regex);
    
    if (match) {
      const encoded = match[1];
      const mask = match[2];
      const charCodeOffset = Number(match[3]);
      const delimiterOffset = Number(match[4]);

      const decoded = await decodeHunter(encoded, mask, charCodeOffset, delimiterOffset);
      const hlsUrl = decoded.match(linkRegex)![1];

      const subtitles: { lang: string, file: string }[] = [];
      const subtitleMatch = decoded.match(/subtitle:\"([^\"]*)\"/);
      if (subtitleMatch) {
        const subtitlesList = subtitleMatch[1].split(",");
        for (const subtitle of subtitlesList) {
          const subtitleData = subtitle.match(/^\[(.*?)\](.*$)/);
          
          if(!subtitleData)continue;
          
          const lang = subtitleData[1];
          const file = subtitleData[2];
          subtitles.push({ lang, file });
        }
      }
      return {Hls:hlsUrl,Subtitle:subtitles};
    }
    else{
      return {Hls:null,Subtitle:null}
    }
  }
  catch (error){
    console.log(error);
    return {Hls:null,Subtitle:null};
  }
}

async function GETStreams(name: string, url: string, referer: string): Promise<{ name: string, Data: { Hls: string | null, Subtitle: { lang: string, file: string }[] | null } }> {
  const responseData = url.includes('vidsrc.stream') ? await handleVidsrc(url, referer) : url.includes('multiembed.mov') && await handleSuperEmbed(url, referer);

  let data: { Hls: string | null; Subtitle: { lang: string; file: string; }[] | null; } = { Hls: null, Subtitle: null };
  
  if (typeof responseData !== 'boolean') {
      data = responseData;
  } else {
      // Handle the case where responseData is false
  }
  return { name: name, Data: data }  
}


export async function getPlayableStream(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/source') {
      const id = 'tt4574334';
      const param = {
          s: 1,
          e: 1
      };
      const provider = id.includes("tt") ? "imdb" : "tmdb";
      const type = param.e !== 0 && param.s !== 0 ? "tv" : "movie";
      const SERVERS = { id: id, list: [] as { name: string; hash: string; }[] };


      // Make the first request and get available servers.
      const VIDSRC_API_URL = `https://vidsrc.me/embed/${id}` + (type === 'tv' ? `/${param.s}-${param.e}` : '');
      const VIDSRC_API_RESP = await fetch(VIDSRC_API_URL, {
          headers: {
              'Referer': VIDSRC_API_URL,
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'TE': 'trailers',
              'Connection': 'keep-alive'
          }
      });
      const htmlText = await VIDSRC_API_RESP.text();
      const $ = cheerio.load(htmlText);
      const serverDivs = $('div.server');

      serverDivs.each((index, element) => {
        const hash = $(element).attr("data-hash") || ''; // Ensure hash is always a string
        if (BLACKLISTED.includes($(element).text())) return;
        else SERVERS.list.push({ name: $(element).text(), hash: hash });
    });

      // STEP 2: GET each server all at once.
      const promises = SERVERS.list.map((server) => GETStreamServer(server.name, server.hash, VIDSRC_API_URL));
      const STREAMING_SERVERS = await Promise.all(promises)
          .then(results => {
              return results;
          })
          .catch(error => {
              console.log(error);
              return [];
          });

      const STREAMING_HLS = await Promise.all(STREAMING_SERVERS.map((streaming_server) => GETStreams(streaming_server.name, streaming_server.url, streaming_server.referer)))
          .then(results => {
              return results;
          })
          .catch(error => {
              console.log(error);
              return [];
          });

      return new Response(JSON.stringify(STREAMING_HLS), {
          status: 200,
          headers: {
              "Content-Type": "application/json",
          },
      });
  }
  return new Response('Hello World!');
}

export default {
  async fetch(request, env, ctx) {
      return await getPlayableStream(request, env, ctx);
  },
};

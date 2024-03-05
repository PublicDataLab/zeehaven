/**
 * Parse all data looking for Twitter model based on 4cat. 
 */
function parseTwitter (header, data) {
  let lines = [];
  flatten(data[0], header)
    data.forEach(function (row) { 
          const timestamp = Date.parse(row["data"]["legacy"]["created_at"]);
          const dt = new Date(row["data"]["legacy"]["created_at"]);
          const retweet = row["data"]["legacy"]["retweeted"]
          if (retweet) { 
            retweet["result"] = retweet["result"]["tweet"] 
            const rt_text = "RT @" + row["data"]["result"]["core"]["user_results"]["result"]["legacy"]["screen_name"] +
                     ": " + row["data"]["result"]["legacy"]["full_text"]
            row['data']["legacy"]["full_text"] = escapeHTML(rt_text);
          }

          const quote_tweet = row['data']["is_quote_status"];
          if (quote_tweet) {
            console.log(quote_tweet);
          }

		
          let mentions = [];
	        if (row["data"]["legacy"]["entities"]["user_mentions"]) {
		        row["data"]["legacy"]["entities"]["user_mentions"].forEach(m => mentions.push(m["screen_name"]))
	        }
		      let videos = [];
		      let photos = [];
		      if (row["data"]["legacy"]["entities"]["media"]) {
			      row["data"]["legacy"]["entities"]["media"].forEach(function(img) {
			        if (img["type"] == "photo") { photos.push(img["media_url_https"]) }
				      if (img["type"] == "video") { videos.push(img["media_url_https"]) }
			      });
		      }
          let tags = []
          if (row["data"]["legacy"]["entities"]["hashtags"]) {
            row["data"]["legacy"]["entities"]["hashtags"].forEach( t => tags.push(t.text))
          }
          const rows = {"id": row["data"]["rest_id"],
            "thread_id": row["data"]["legacy"]["conversation_id_str"],
            "timestamp": dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds(), 
            "unix_timestamp": timestamp,
            "link": "https://twitter.com/"+row["data"]['core']['user_results']['result']['legacy']['screen_name']+"/status/"+row['id'],
	          "body": `"${escapeHTML(row["data"]["legacy"]["full_text"])}"`,
            "author": `"${row["data"]["core"]["user_results"]["result"]["legacy"]["screen_name"]}"`,
            "author_fullname": `"${row["data"]["core"]["user_results"]["result"]["legacy"]["name"]}"`,
            "author_id": row["data"]["legacy"]["user_id_str"],
            "source": row["source"],
            "language_guess": row["data"]["legacy"]["lang"],
            "possibly_sensitive": (row["data"]["possibly_sensitive"])? "yes" : "no",
            "retweet_count": row["data"]["legacy"]["retweet_count"],
            "reply_count": row["data"]["legacy"]["reply_count"],
            "like_count": row["data"]["legacy"]["favorite_count"],
            "quote_count": row["data"]["legacy"]["quote_count"],
            "impression_count": row["data"]["views"]["count"],
            "is_retweet": (retweet)? "yes": "no",
            "retweeted_user": (retweet) ? row["data"]["result"]["core"]["user_results"]["result"]["legacy"]["screen_name"]: "",
            "is_quote_tweet": (quote_tweet)? "yes": "no",
            "quoted_user": (quote_tweet) ? quote_tweet["result"]["core"]["user_results"]["result"]["legacy"]["screen_name"]: "",
            "is_reply": (row["data"]["legacy"]["conversation_id_str"].toString()  != row["data"]["rest_id"].toString()) ? "yes" : "no",
            "replied_user": (row["data"]["legacy"]["in_reply_to_screen_name"])? row["data"]["legacy"]["in_reply_to_screen_name"]: "",
            "hashtags": (tags.length > 0) ? tags.join(";") : "",
            "urls": (row["data"]["legacy"]["entities"]["urls"]["expanded_url"]) ? row["data"]["legacy"]["entities"]["urls"]["expanded_url"].join(';').toString():"",
            "images": (photos.length > 0) ? photos.join(";") : "",
            "videos": (videos.length > 0) ? videos.join(";") : "",
            "mentions": (mentions.length > 0) ? mentions.join(";") : "",
            "place_name": (row["data"]["legacy"]["place"])? row['data']["legacy"]["place"]["full_name"] : ""}
          lines.push(Object.values(rows).join(','))
          if (header.length == 0) { header = Object.keys(rows);}
        } );

        const csv = [
          header.join(','), // header row first
          lines.join('\n')
        ].join('\n');

        return csv;
}

/**
 * Parse all data looking for Instagram model based on 4cat. 
 */
function parseInstagram (header, data) {
  let lines = [];
  const MEDIA_TYPE_PHOTO = 1;
  const MEDIA_TYPE_VIDEO = 2;
  const MEDIA_TYPE_CAROUSEL = 8;

  flatten(data[0], header);
  //let's create the regex once as const and call over each row
  const re = /#([^\s!@#$%ˆ&*()_+{}:\"|<>?\[\];'\,.\`~']+)/g;
    data.forEach(function (row) { 
      let dt = new Date(row["data"]["taken_at"]*1000);

      const caption = (row['data']["caption"] != null) ? escapeHTML(row['data']["caption"]["text"]):"";
      let num_comments = -1;
      if (row['data']['comment_counts']) {
        num_comments = row['data']['comment_counts']
      } else if (row['data']['comments'] && (typeof row['data']['comments'] == 'list')) {
        num_comments = row['data']['comments'].length();
      }
        /* get media url
        # for carousels, get the first media item, for videos, get the video
        # url, for photos, get the highest resolution */
      let media_node = "";
      let media_url = "";
      let display_url = "";

      let num_media = (row['data']["media_type"] != MEDIA_TYPE_CAROUSEL)? 1 : row['data']["carousel_media"].length;
      let media_type = "unknown";
      try {
      
      const type_map = {MEDIA_TYPE_PHOTO: "photo", MEDIA_TYPE_VIDEO: "video"}
      if (row['data']["media_type"] != MEDIA_TYPE_CAROUSEL) {
        media_type = (type_map[row['data']["media_type"]])?  type_map[row['data']["media_type"]]: "unknown";
      } else {
        let media_types = new Set();
        if (row['data']["carousel_media"] != undefined) {
          row['data']["carousel_media"].forEach(x => media_types.add(x));
        }
        if (media_types.size > 1) { media_type = "mixed" };
      }

      if (row['data']["media_type"] == MEDIA_TYPE_CAROUSEL) { 
        media_node = row['data']["media_type"][0]
      } else if (row['data']["media_type"] == MEDIA_TYPE_VIDEO) {
        media_url = row['data']["video_versions"][0]["url"];
        if (row["data"]["image_versions2"]) {
          display_url = row["data"]["image_versions2"]["candidates"][0]["url"]
        } else {
          display_url = row['data']["video_versions"][0]["url"]
        }
      } else if (row['data']["media_type"] == MEDIA_TYPE_PHOTO) {
        media_url = row["data"]["image_versions2"]["candidates"][0]["url"]
        display_url = media_url;
      }
 
      let location = {"name": "", "latlong": "", "city": ""}

      if (row['data']["location"]) {
        location["name"] = row['data']["location"]["name"].toString();
        // Leaving this though it does not appear to be used in this type; maybe we'll be surprised in the future...
        location["latlong"] = (row['data']["location"]["lat"]) ? row['data']["location"]["lat"] + "," + row['data']["location"]["lng"] : "";
        location["city"] = row['data']["location"]["city"]
      }
      const _id = row['data']["code"];

      let tags = [];
      [...caption.matchAll(re)].forEach(function(_tag){ 
        //getting both bash and no-hash. Remove the latter. 
        const t = _tag.toString().split(',')
        if (t[0].charAt(0) == "#") tags.push(t[0]); 
      });

      const rows = {
            "id": _id,
            "thread_id": _id,
            "parent_id": _id,
            "body" : `"${caption}"`, 
            "author": `"${row['data']["owner"]["username"]}"`,
            "timestamp": dt.getFullYear() + "-" + (dt.getMonth()  + 1) + "-" + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds(), 
            "author_fullname": (row["data"]["user"]["full_name"])? `"${row["data"]["user"]["full_name"]}"`:"",
            "author_avatar_url": (row['data']['user']["profile_pic_url"])? row['data']['user']["profile_pic_url"]: "",
            "type": media_type,
            "url": "https://www.instagram.com/p/" + _id,
            "image_url": display_url,
            "media_url": media_url,
            "hashtags": (tags.length > 0) ? `"${tags.join()}"` : "",
            "num_likes": row["data"]["like_count"],
            "num_comments": num_comments,
            "num_media": num_media,
            "location_name": `"${location["name"]}"`,
            "location_latlong": `"${location["latlong"]}"`,
            "location_city": `"${location["city"]}"`,
            "unix_timestamp": row['data']["taken_at"]
          }
          lines.push(Object.values(rows).join(','))
          if (header.length == 0) { header = Object.keys(rows);}
        } catch (error) {
          console.log(error)
        }
          
        } );

        const csv = [
          header.join(','), // header row first
          lines.join('\n')
        ].join('\n');

        return csv;
}
/** Need to parse graphs
 * function parseInstagramGraph (header, data)
 * type_map = {"GraphSidecar": "photo", "GraphVideo": "video"}
      if (row['data']["__typename"] != "GraphSidecar") {
        media_type = type_map.get(row['data']["__typename"], "unknown")
      } else {
        media_types = set()
        row['data']["edge_sidecar_to_children"]["edges"].forEach(x => media_types.push(x["node"]["__typename"]))
        media_type = (len(media_types) > 1) ? "mixed" : type_map.get(media_types.pop(), "unknown");
      }
 */

      /**
       * Parse Zeeschuimer Tiktok
       */
function parseTiktok (header, data) {
  let lines = [];
  flatten(data[0], header)
  data.forEach(function(row) {
    //challenges = [[challenge["title"] for challenge in post.get("challenges", [])]]
    challenges = []
    if (row['data']['challenges'] != null) {
      row['data']['challenges'].forEach(challenge => challenges.push(challenge.title));
    }

    hashtags = []
    if (row['data']['contents'] != null) {
      row['data']['contents'].forEach(function (r) {
        if (r['textExtra'] != null) {
          r['textExtra'].forEach(function (tag) {
            if (tag['hashtagName'] != "") { hashtags.push(tag['hashtagName']) }
          });
        }
      }
  )}
  
    labels = []
    if ((row['data']["diversificationLabels"] != null && 
        typeof (row['data']["diversificationLabels"] == 'list'))) {
          labels = row['data']["diversificationLabels"]
    }

    user_nickname = ""
    user_fullname = ""
    user_id = ""

    
    if (typeof(row['data']['author']) == Object) {
      const _u = JSON.parse(row['data']['author'])
      console.log(_u)
      user_nickname = row['data']["author"]["uniqueId"]
      user_fullname = row['data']["author"]["nickname"]
      user_id = row['data']["author"]["id"]
    } else {
      user_nickname = row['data']["author"]["uniqueId"]
      user_fullname = row['data']["author"]["nickname"]
      user_id = ""
    }

    thumbnail_options = []
    if (row['data']["video"]!= null) {
      if (JSON.parse(JSON.stringify(row['data']["video"]))["shareCover"] != " ") {
      thumbnail_options.push(JSON.parse(JSON.stringify(row['data']["video"]))["shareCover"]);
      }
    }

    if (row['data']["video"] != null) {
      if (JSON.parse(JSON.stringify(row['data']["video"]))["cover"] != " ") {
      thumbnail_options.push(JSON.parse(JSON.stringify(row['data']["video"]))["cover"]);
      }
    }

    thumbnail_url = []
    const now = new Date()/1000;
    
    thumbnail_url = []
    thumbnail_options.forEach(function (thumb)  {
      if ( parseInt(parse_qs(thumb)['x-expires']) >= now) {
        if (thumb != " ") { thumbnail_url.push(thumb); }
      }
    } 
    
    )

    let effects = []
    if(row['data']["effectStickers"] != null) { 
      row['data']["effectStickers"].forEach(e => effects.push(escapeHTML(e["name"])));
    }

    let warnings = []
    if(row['data']["warning Info"] != null) {
      row['data']["warningInfo"].forEach(w => warnings.push(escapeHTML(w["text"])));
    }

    let stickers = []
    if( row['data']["stickersOnItem"] != null) {
      row['data']["stickersOnItem"].forEach(
        w => w["stickerText"].forEach(y => stickers.push(escapeHTML(y))));
    }
    const rows = {
      "id": row['data']["id"],
      "thread_id": row['data']["id"],
      "author": `"${user_nickname}"`,
      "author_full": `"${user_fullname}"`,
      "author_followers": row['data']["authorStats"]["followerCount"],
      "author_likes": row['data']["authorStats"]["diggCount"],
      "author_videos": row['data']["authorStats"]["videoCount"],
      "author_avatar": row['data']['author']["avatarThumb"],
      "body": `"${row['data']["desc"]}"`,
      "timestamp": new Date(parseInt(row['data']["createTime"] *1000)).toDateString(),
      "unix_timestamp": row['data']["createTime"],
      "is_duet":  (row['data']["duetInfo"]["duetFromId"] != "0") ? "yes" :"no",
      "is_ad": (row['data']["isAd"] == "yes")? "yes" : "no",
      "music_name": `"${row['data']["music"]["title"]}"`,
      "music_id": row['data']["music"]["id"],
      "music_url": (row['data']["music"]["playUrl"] != null) ? row['data']["music"]["playUrl"] : "",
      "music_thumbnail": (row['data']["music"]["coverLarge"] != null) ? row['data']["music"]["coverLarge"] : "",
      "music_author": (row['data']["music"]["authorName"] != null) ? `"${row['data']["music"]["authorName"]}"` : "",
      "video_url": (row['data']["video"]["downloadAddr"] != null) ? row['data']["video"]["downloadAddr"] : "",
      "tiktok_url": "https://www.tiktok.com/" + user_nickname + "/video/" + row['data']['id'],
      "thumbnail_url": `"${thumbnail_url}"`,
      "likes": row['data']["stats"]["diggCount"],
      "comments": row['data']["stats"]["commentCount"],
      "shares": row['data']["stats"]["shareCount"],
      "plays": row['data']["stats"]["playCount"],
      "hashtags": `"${hashtags.join(',')}"`,
      "challenges": `"${challenges.join(',')}"`,
      "diversification_labels": `"${labels}"`,
      "location_created": (row['data']["locationCreated"] != null) ? row['data']["locationCreated"] : "",
      "stickers": `"${stickers.join(',')}"`,
      "effects": `"${effects.join(',')}"`,
      "warning": `"${warnings.join(',')}"`
  }
    lines.push(Object.values(rows).join(','))
    if (header.length == 0) { header = Object.keys(rows);}
  })

  const csv = [
    header.join(','), // header row first
    lines.join('\n')
  ].join('\n');

  return csv;

}
/**
 * Parse all data. We will not look for certain columns. 
 */
function parseAll (header, result) {

  flatten(result[0], header)

    const _csv = [
                Object.keys(header).join(','), // header row first
                ...Object.values(result).map(function(r) { 
			        const row = {}
			        flatten(r, row)
			        return Object.keys(header).map(fieldName => JSON.stringify(row[fieldName]) ).join(',')
		        })
            ].join('\r\n')
            console.log(_csv);
    return _csv;
}

function flatten(object, target, path) {
  path = path || '';
  Object.keys(object).forEach(function (key) {
      if (object[key] && typeof object[key] === 'object') {
          flatten(object[key], target, path + key);
          return;
      }
      target[path + key] = object[key];
  });
}

function escapeHTML(str){
  return str.replaceAll("\n","  ").replace(/(['",])/g, "\$1").replaceAll(',', '‚');
}

function parse_qs (urlArray){ 
  const q = {}

  if (typeof(urlArray) == 'string') {
    let _url = urlArray.split("?")[1];
    const splitq = _url.split('=')
    q[splitq[0]] = splitq[1]
  } else {
    urlArray.forEach(function (url) {
      if (url != "") {
        let _url = url.split("?")[1];
        _url.split('&').forEach(function(_q) {
          const splitq = _q.split('=')
          q[splitq[0]] = splitq[1]
        });
      }
    });
  }
  return q;
 };
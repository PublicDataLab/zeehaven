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
            console.log(retweet);
            const rt_text = "RT @" + row["data"]["result"]["core"]["user_results"]["result"]["legacy"]["screen_name"] +
                     ": " + row["data"]["result"]["legacy"]["full_text"]
            row["legacy"]["full_text"] = rt_text
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
	          "body": `\"${row["data"]["legacy"]["full_text"]}\"`,
            "author": row["data"]["core"]["user_results"]["result"]["legacy"]["screen_name"],
            "author_fullname": row["data"]["core"]["user_results"]["result"]["legacy"]["name"],
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
            "place_name": (row["data"]["legacy"]["place"])? row["legacy"]["place"]["full_name"] : ""}
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

  MEDIA_TYPE_PHOTO = 1
  MEDIA_TYPE_VIDEO = 2
  MEDIA_TYPE_CAROUSEL = 8

  flatten(data[0], header);
  //let's create the regex once as const and call over each row
  const re = new RegExp("#([^\s!@#$%ˆ&*()_+{}:\"|<>?\[\];'\,./`~']+)");
    data.forEach(function (row) { 
      const caption = (row['data']["caption"]["text"]) ? row['data']["caption"]["text"]:"";
      //if node["media_type"] != SearchInstagram.MEDIA_TYPE_CAROUSEL else len(node["carousel_media"])
      //let num_media = (row["__typename"] != "GraphSidecar")? 1 : row['data']["edge_sidecar_to_children"]["edges"].length;
      let num_media = (row['data']["media_type"] != MEDIA_TYPE_CAROUSEL)? 1 : row['data']["carousel_media"].length;

        /* get media url
        # for carousels, get the first media item, for videos, get the video
        # url, for photos, get the highest resolution */
      //let media_node = (row['data']["__typename"] == "GraphSidecar") ? row['data']["edge_sidecar_to_children"]["edges"][0]["node"] : row
      let media_node = "";
      let media_url = "";
      let display_url = "";

      if (row['data']["media_type"] == MEDIA_TYPE_CAROUSEL) { 
        row['data']["media_type"][0]
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
 
      location = {"name": "", "latlong": "", "city": ""}

      if (row['data']["location"]) {
        location["name"] = row['data']["location"]["name"];
        // Leaving this though it does not appear to be used in this type; maybe we'll be surprised in the future...
        location["latlong"] = (row['data']["location"]["lat"]) ? row['data']["location"]["lat"] + "," + row['data']["location"]["lng"] : "";
        location["city"] = row['data']["location"]["city"]
      }
      const _id = row['data']["id"];
      const rows = {
            "id": _id,
            "thread_id": _id,
            "parent_id": _id,
            "body" : caption, 
            "author": row["owner"]["username"],
            "timestamp": dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds(), 
            "author_fullname": (row["data"]["user"]["full_name"])? row["data"]["user"]["full_name"]:"",
            //row["owner"].get("profile_pic_url", ""),
            "author_avatar_url": (row['data']['user']['caption']["profile_pic_url"])? "profile_pic_url": "",
            "type": media_type,
            "url": "https://www.instagram.com/p/" + _id,
            "image_url": node["display_url"],
            "media_url": media_url,
            "hashtags": caption.matchAll(re).join(),
            "num_likes": row["data"]["like_count"],
            "num_comments": row.get("edge_media_preview_comment", {}).get("count", 0),
            "num_media": num_media,
            "location_name": location["name"],
            "location_latlong": location["latlong"],
            "location_city": location["city"],
            "unix_timestamp": node["taken_at"]
          }
        lines.push(Object.values(rows).join(','))
          if (header.length == 0) { header = Object.keys(rows);}
        } );

        const csv = [
          header.join(','), // header row first
          lines.join('\n')
        ].join('\n');

        return csv;
}
/** Need to parse graphs
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
 * Parse all data. We will not look for certain columns. 
 */
function parseAll (header, result) {

  flatten(result[0], header)
    console.log(result)
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
  return new Option(str).innerHTML.replace(/\n/g,'\\n').replace(/\"/g, "\"\"");
}
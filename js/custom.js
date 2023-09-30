const maindata = {
  grant_type: "client_credentials",
  client_id: "ca50887d25574b2fa3dfc59d08602698",
  client_secret: "e557238d9b2b476e9c5db4cd90044997",
};

async function userspotifyapi() {
  const auth_data =
    "ca50887d25574b2fa3dfc59d08602698" +
    ":" +
    "e557238d9b2b476e9c5db4cd90044997";
  let response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: window.localStorage.getItem("refresh_token"),
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(auth_data),
    },
  });
  let data = await response.json();
  window.localStorage.setItem("user_token", data.access_token);
}

async function spotifyapi() {
  let response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams(maindata),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  let data = await response.json();
  window.localStorage.setItem("token", data.access_token);
}

function generateRandomState() {
  const state =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  window.localStorage.setItem("state", state);
  return state;
}

const oauthState = generateRandomState();

const signInWithSpotify = () => {
  window.location.href =
    "https://accounts.spotify.com/authorize?response_type=code&client_id=ca50887d25574b2fa3dfc59d08602698&scope=playlist-modify-public playlist-modify-private playlist-read-private&redirect_uri=https://elijah127.github.io/authorize.html&state=" +
    generateRandomState();
};

async function getUserSpotifyData(url, func) {
  if (localStorage.getItem("user_token")) {
    let response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("user_token"),
      },
    });
    let data = await response.json();
    console.log(data);
    if (data?.error?.status == 401) {
      console.log("401 occured");
      await userspotifyapi();

      getUserSpotifyData(url, func);
    }
    func(data);
  } else {
    await userspotifyapi();

    getUserSpotifyData(url, func);
  }
}

async function getSpotifyData(url, func) {
  if (localStorage.getItem("token")) {
    let response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });
    let data = await response.json();
    console.log(data);
    if (data?.error?.status == 401) {
      console.log("401 occured");
      await spotifyapi();

      getSpotifyData(url, func);
    }
    func(data);
  } else {
    await spotifyapi();

    getSpotifyData(url, func);
  }
}
var embedController;
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById("embed-iframe");
  const options = {
    uri: "",
  };
  callback = (EmbedController) => {
    embedController = EmbedController;
  };
  IFrameAPI.createController(element, options, callback);
 
};

var playlist_id;
var album_id;
var artistProfile_id;
routie({
  "playlist_id/:id": function (id) {
    playlist_id = id;
  },
  "album_id/:id": function (id) {
    album_id = id;
  },
  "artistProfile_id/:id": function (id) {
    artistProfile_id = id;
  },
});

function convertMillisecondsToMinutesAndSeconds(milliseconds) {
  // Calculate the total seconds
  const totalSeconds = Math.floor(milliseconds / 1000);

  // Calculate minutes and remaining seconds
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    minutes,
    seconds,
  };
}

document.addEventListener("alpine:init", () => {
  if (window.localStorage.getItem("logged_in") === "yes") {
    getUserSpotifyData("https://api.spotify.com/v1/me", function (data) {
      window.localStorage.setItem("user_id", data.id);
    });
  }
});

// new releases
document.addEventListener("alpine:init", () => {
  Alpine.data("music", () => ({
    tracks: [],
    init() {
      var current = this;
      getSpotifyData(
        "https://api.spotify.com/v1/browse/new-releases?limit=50",
        function (data) {
          let releases = data.albums.items;
          console.log(releases);

          releases = releases.filter(function (release) {
            return release.album_type === "single";
          });
          console.log(releases);
          current.tracks = releases.slice(0, 4);
          console.log(current.tracks);

          let loader = document.getElementById("loader");
          loader.style.display = "none";
        }
      );
    },
  }));
});

// new album releases
document.addEventListener("alpine:init", () => {
  Alpine.data("albums", () => ({
    tracks: [],
    init() {
      var current = this;
      getSpotifyData(
        "https://api.spotify.com/v1/browse/new-releases?limit=50",
        function (data) {
          let releases = data.albums.items;
          releases = releases.filter(function (release) {
            return release.album_type === "album";
          });
          current.tracks = releases.slice(0, 4);
          console.log(current.tracks, "worked");
        }
      );
    },
    playMusic(uri) {
      console.log(uri);
      embedController.loadUri(uri);
      let openModel = document.getElementById("open-modal");
      openModel.style.display = "block";
    },
  }));
});

// playlists
document.addEventListener("alpine:init", () => {
  Alpine.data("Playlists", () => ({
    playlists: {},
    init() {
      var current = this;
      getSpotifyData(
        "https://api.spotify.com/v1/browse/featured-playlists?limit=4",
        function (data) {
          current.playlists = data.playlists.items;
          console.log(current.playlists);
        }
      );
    },
  }));
});

// artist profile
document.addEventListener("alpine:init", () => {
  Alpine.data("artists", () => ({
    artist: {},
    init() {
      var current = this;
      getSpotifyData(
        `https://api.spotify.com/v1/artists/${artistProfile_id}`,
        function (data) {
          current.artist = data;
          // console.log(data)
          let loader = document.getElementById("loader");
          loader.style.display = "none";
        }
      );
    },
  }));
});

// artistMusics
document.addEventListener("alpine:init", () => {
  Alpine.data("artistInfo", () => ({
    items: [],
    title: "Tracks",
    init() {
      this.alltracks();
    },

    alltracks() {
      var current = this;
      let loader = document.getElementById("loader");
      loader.style.display = "block";
      this.title = "TRACKS";
      getSpotifyData(
        `https://api.spotify.com/v1/artists/${artistProfile_id}/albums?limit=50`,
        function (data) {
          current.items = data.items;
          console.log(data.items);
          let allTracks = data.items;
          allTracks = allTracks.filter(function (allTracks) {
            return allTracks.album_type === "single";
          });
          current.items = allTracks;

          loader.style.display = "none";
        }
      );
    },

    toptracks() {
      var current = this;
      this.title = "TOP TRACKS";
      let loader = document.getElementById("loader");
      loader.style.display = "block";
      getSpotifyData(
        `https://api.spotify.com/v1/artists/${artistProfile_id}/top-tracks?market=NG`,
        function (data) {
          console.log(data.tracks, "workeds");
          current.items = data.tracks;
          loader.style.display = "none";

          let tracks = data.tracks;
          tracks.forEach((track) => {
            track.id = track.album.id;
            track.images = track.album.images;
          });
        }
      );
    },

    appearsOn() {
      var current = this;
      this.title = "ALBUMS APPEARED ON";
      let loader = document.getElementById("loader");
      loader.style.display = "block";
      getSpotifyData(
        `https://api.spotify.com/v1/artists/${artistProfile_id}/albums?limit=50`,
        function (data) {
          current.items = data.items;

          let AppearsOn = data.items;
          AppearsOn = AppearsOn.filter(function (AppearsOn) {
            return AppearsOn.album_group === "appears_on";
          });
          current.items = AppearsOn;

          // console.log(data);
          loader.style.display = "none";
        }
      );
    },

    ArtistAblum() {
      var current = this;
      this.title = "ALBUMS";
      let loader = document.getElementById("loader");
      loader.style.display = "block";
      getSpotifyData(
        `https://api.spotify.com/v1/artists/${artistProfile_id}/albums?limit=50`,
        function (data) {
          current.items = data.items;

          let artistALBUM = data.items;
          artistALBUM = artistALBUM.filter(function (artistALBUM) {
            return artistALBUM.album_group === "album";
          });
          current.items = artistALBUM;

          // console.log(data);
          loader.style.display = "none";
        }
      );
    },
  }));
});

// search All
document.addEventListener("alpine:init", () => {
  Alpine.data("searchOptions", () => ({
    items: {},
    query: "",
    searchType: "Search Tracks",
    init() {
      let current = this;
      this.$watch("query", function () {
        if (current.searchType === "Search Tracks") {
          current.searchTracks();
        } else if (current.searchType === "Search Albums") {
          current.searchAlbum();
        } else if (current.searchType === "Search Artists") {
          current.searchArtist();
        } else if (current.searchType === "Search Playlists") {
          current.searchPlaylists();
        }
      });
    },

    searchTracks() {
      let current = this;
      if (current.query.length < 1) {
        search_dropdown.style.display = "none";
      } else {
        getSpotifyData(
          `https://api.spotify.com/v1/search?q=${current.query}&type=track&limit=20`,
          function (data) {
            let tracks = data.tracks.items;
            let items = [];
            tracks.forEach(function (item) {
              items.push({
                name: item.name,
                image_url: item.album.images[1].url,
                artist_name: item.artists[0].name,
                url: `/album-tracks.html#album_id/${item.album.id}`,
              });
            });
            current.items = items;
            console.log(current.items);
          }
        );
      }
    },
    searchAlbum() {
      let current = this;
      if (current.query.length < 1) {
        search_dropdown.style.display = "none";
      } else {
        getSpotifyData(
          `https://api.spotify.com/v1/search?q=${current.query}&type=album&limit=20`,
          function (data) {
            let albums = data.albums.items;
            console.log(albums);
            let items = [];
            albums.forEach(function (item) {
              items.push({
                name: item.name,
                image_url: item.images[1].url,
                artist_name: item.artists[0].name,
                url: `/album-tracks.html#album_id/${item.id}`,
              });
            });
            current.items = items;
          }
        );
      }
    },
    searchArtist() {
      let current = this;

      if (current.query.length < 1) {
        search_dropdown.style.display = "none";
      } else {
        getSpotifyData(
          `https://api.spotify.com/v1/search?q=${current.query}&type=artist&limit=20`,
          function (data) {
            let artists = data.artists.items;
            console.log(artists);
            let items = [];
            artists.forEach(function (item) {
              items.push({
                name: item.name,
                image_url: item.images[1].url,
                artist_name: "",
                url: `/artistprofile.html#artistProfile_id/${item.id}`,
              });
            });
            current.items = items;
          }
        );
      }
    },
    searchPlaylists() {
      let current = this;

      if (current.query.length < 1) {
        search_dropdown.style.display = "none";
      } else {
        getSpotifyData(
          `https://api.spotify.com/v1/search?q=${current.query}&type=playlist&limit=20`,
          function (data) {
            let playlists = data.playlists.items;
            console.log(playlists);
            let items = [];
            playlists.forEach(function (item) {
              items.push({
                name: item.name,
                image_url: item.images[0].url,
                artist_name: "",
                url: `/playlistTracks.html#playlist_id/${item.id}`,
              });
            });
            current.items = items;
          }
        );
      }
    },
  }));
});

// search tracks
document.addEventListener("alpine:init", () => {
  Alpine.data("searchTrack", () => ({
    tracks: [],
    query: "",

    init() {
      let current = this;
      this.$watch("query", function () {
        if (current.query.length < 1) {
          search_dropdown.style.display = "none";
        } else {
          getSpotifyData(
            `https://api.spotify.com/v1/search?q=${current.query}&type=track&limit=20`,
            function (data) {
              current.tracks = data.tracks.items;
              console.log(data);
            }
          );
        }
      });
    },
  }));
});

// search artist
document.addEventListener("alpine:init", () => {
  Alpine.data("searchArtist", () => ({
    artists: {},
    query: "",

    init() {
      let current = this;
      this.$watch("query", function () {
        if (current.query.length < 1) {
          search_dropdown.style.display = "none";
        } else {
          getSpotifyData(
            `https://api.spotify.com/v1/search?q=${current.query}&type=artist&limit=20`,
            function (data) {
              current.artists = data.artists.items;
              console.log(data);
            }
          );
        }
      });
    },
  }));
});

// search album
document.addEventListener("alpine:init", () => {
  Alpine.data("searchAlbum", () => ({
    albums: [],
    query: "",

    init() {
      let current = this;
      this.$watch("query", function () {
        if (current.query.length < 1) {
          search_dropdown.style.display = "none";
        } else {
          getSpotifyData(
            `https://api.spotify.com/v1/search?q=${current.query}&type=album&limit=20`,
            function (data) {
              current.albums = data.albums.items;
              console.log(data);
            }
          );
        }
      });
    },
  }));
});

// search playlist
document.addEventListener("alpine:init", () => {
  Alpine.data("searchPlaylist", () => ({
    playlists: {},
    query: "",
    init() {
      let current = this;
      this.$watch("query", function () {
        if (current.query.length < 1) {
          search_dropdown.style.display = "none";
        } else {
          getSpotifyData(
            `https://api.spotify.com/v1/search?q=${current.query}&type=playlist&limit=20`,
            function (data) {
              current.playlists = data.playlists.items;
              console.log(data);
            }
          );
        }
      });
    },
  }));
});

// album tracks
document.addEventListener("alpine:init", () => {
  Alpine.data("AlbumTracks", () => ({
    artistAlbumtrack: [],
    init() {
      var current = this;
      getSpotifyData(
        `https://api.spotify.com/v1/albums/${album_id}/tracks?limit=50`,
        function (data) {
          current.artistAlbumtrack = data.items;
          console.log(data);

          //track duration

          for (let i = 0; i < current.artistAlbumtrack.length; i++) {
            let albumtrack = current.artistAlbumtrack[i];
            let trackTime = albumtrack.duration_ms;

            const { minutes, seconds } =
              convertMillisecondsToMinutesAndSeconds(trackTime);

            // console.log(trackSec);
            albumtrack.trackMins = minutes;
            albumtrack.trackSec = seconds;
          }

          let loader = document.getElementById("loader");
          loader.style.display = "none";
        }
      );
    },
    playMusic(uri) {
      if (uri != this.current_uri) {
        embedController.loadUri(uri);
      }
      let openModel = document.getElementById("open-modal");
      openModel.style.display = "block";
      this.current_uri = uri;
      console.log(openModel, "displayed");
    },
  }));
});

// album info
document.addEventListener("alpine:init", () => {
  Alpine.data("Albuminfo", () => ({
    artistAlbum: {},
    current_uri: "",
    init() {
      var current = this;
      getSpotifyData(
        `https://api.spotify.com/v1/albums/${album_id}`,
        function (data) {
          current.artistAlbum = data;
          console.log(data);
          if (current.artistAlbum.album_type === "single") {
            let album_play_btn = document.getElementById("album-play-btn");
            album_play_btn.style.display = "none";
            console.log(album_play_btn);
          }
        }
      );
    },
    playMusic(uri) {
      if (uri != this.current_uri) {
        embedController.loadUri(uri);
      }
      let openModel = document.getElementById("open-modal");
      openModel.style.display = "block";
      this.current_uri = uri;
      console.log(openModel, "displayed");
    },
  }));
});

// playlists tracks
document.addEventListener("alpine:init", () => {
  Alpine.data("PlaylistsTracks", () => ({
    track: {},
    playlist: {},
    cover_image: "",
    checkUserOwnedPlaylist(){
      return this.playlist.owner.id === localStorage.getItem("user_id");
    },
   
    init() {
      console.log("Playlist tracks");
      var current = this;
      getSpotifyData(
        `https://api.spotify.com/v1/playlists/${playlist_id}`,
        function (data) {
          current.track = data.tracks.items;
          current.playlist = data;
          console.log(current.playlist);
          console.log(current.track);

          //track duration
          for (let i = 0; i < current.track.length; i++) {
            let albumtrack = current.track[i];
            albumtrack = albumtrack.track;
            let trackTime = albumtrack.duration_ms;
            const { minutes, seconds } =
              convertMillisecondsToMinutesAndSeconds(trackTime);

            // console.log(trackSec);
            albumtrack.trackMins = minutes;
            albumtrack.trackSec = seconds;
          }

          let loader = document.getElementById("loader");
          loader.style.display = "none";
        }
      );

      // For cover image
      getSpotifyData(
        `https://api.spotify.com/v1/playlists/${playlist_id}/images`,
        function (data) {
          console.log(data);
          current.cover_image = data[0].url;
        }
      );
    },
    playMusic(uri) {
      
      if (uri != this.current_uri) {
        embedController.loadUri(uri);
        
      }
      let openModel = document.getElementById("open-modal");
      openModel.style.display = "block";
      this.current_uri = uri;
      console.log(openModel, "displayed");
      
    },
  }));
});

// track
document.addEventListener("alpine:init", () => {
  Alpine.data("Songtracks", () => ({
    album: {},
    init() {
      var current = this;
      getSpotifyData(
        "https://api.spotify.com/v1/tracks/741UUVE2kuITl0c6zuqqbO",
        function (data) {
          current.album = data.album;
          console.log(data);
        }
      );
    },
  }));
});

function searchplaytrackDP() {
  var custom_search_form = document.getElementById("custom-search-form");
var custom_search_dropdown = document.getElementById("custom-search-dropdown");
custom_search_form.onkeyup= function() {
  custom_search_dropdown.style.height = "500px";
  if(custom_search_form.value < 1){
    custom_search_dropdown.style.height = "0px"
  }
}
}




// remove songs from playlist
function RemoveSongFromPlaylist(playlisttrackURI) {
  console.log(playlisttrackURI);
  const removeSOngs = {
    tracks: [
      {
        uri: `${playlisttrackURI}`,
      },
    ],
  };

  console.log(JSON.stringify(removeSOngs));
  // data-mdb-toggle="modal"

  fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("user_token"),
    },
    // data-mdb-toggle="modal"
    body: JSON.stringify(removeSOngs),
  })
    .then((response) => response.json())
    .then((Removesong) => {
      console.log(Removesong);
         if (Removesong.error) {
            iziToast.error({
              title: "Error",
              message: "Cannot add to playlist.",
            });
          } else {
            iziToast.success({
              title: "Successful",
              message: "Playlist has been removed.",
            });
          }
        })
        .catch((error) => {
          iziToast.error({
            title: "Error",
            message: "An error occured. Check internet and try again",
          });
    });
    setTimeout(function() {
      window.location.reload();
    }, 3000); // 3000 milliseconds = 3 seconds
}

//my playlists
document.addEventListener("alpine:init", () => {
  Alpine.data("MyPlaylists", () => ({
    items: [],
    init() {
      var current = this;
      getUserSpotifyData(
        "https://api.spotify.com/v1/me/playlists?limit=50",
        function (data) {
          current.items = data.items;
          console.log(data, "myplaylist");
        }
      );
    },
    addToPlaylist(PlayListID, TrackURI) {
      console.log(TrackURI);
      
      // add song to playlist
      function AddPlaylistSong() {
        const addedSongs = {
          uris: [`${TrackURI}`],
          position: 0,
        };
        fetch(`https://api.spotify.com/v1/playlists/${PlayListID}/tracks`, {
          method: "post",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("user_token"),
          },
          body: JSON.stringify(addedSongs),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
            if (data.error) {
              iziToast.error({
                title: "Error",
                message: "Cannot add to playlist.",
              });
            } else {
              iziToast.success({
                title: "Successful",
                message: "Playlist has been added.",
              });
            }
          })
          .catch((error) => {
            iziToast.error({
              title: "Error",
              message: "An error occured. Check internet and try again",
            });
          });
      }
      AddPlaylistSong();
    },
    
  }));
});

// search track add to playlist
document.addEventListener("alpine:init", () => {
  Alpine.data("Addsearchtoplaylist", () => ({
    items: [],
    init() {
      var current = this;
      getUserSpotifyData(
        "https://api.spotify.com/v1/me/playlists?limit=50",
        function (data) {
          current.items = data.items;
          console.log(data, "myplaylist");
        }
      );
    },
    addSearchTrackToPL(TrackURI) {
      console.log(TrackURI);

      // add song to playlist
      const addedSongs = {
        uris: [`${TrackURI}`],
        position: 0,
      };
      setTimeout(function() {
        window.location.reload();
      }, 2000); // 2000 milliseconds = 2 seconds
      fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
        method: "post",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("user_token"),
        },
        body: JSON.stringify(addedSongs),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          if (data.error) {
            iziToast.error({
              title: "Error",
              message: "Cannot add to playlist.",
            });
          } else {
            iziToast.success({
              title: "Successful",
              message: "Playlist has been added.",
            });
          }
        })
        .catch((error) => {
          iziToast.error({
            title: "Error",
            message: "An error occured. Check internet and try again",
          });
        });

    },
  }));
});

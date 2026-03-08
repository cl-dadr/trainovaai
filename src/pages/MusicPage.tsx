import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Heart, Loader2, Youtube, ChevronRight, ChevronDown, Shuffle, SkipBack, SkipForward, MoreHorizontal, X, ListMusic, Flame, Zap, Dumbbell, Wind, Plus, Trash2, FolderPlus, RotateCcw, RotateCw, Repeat, Repeat1 } from "lucide-react";
import { searchYouTube, searchYouTubeWithSource, type YouTubeVideo } from "@/lib/youtubeService";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { usePlaylists, type PlaylistSong } from "@/hooks/usePlaylists";
import { toast } from "@/hooks/use-toast";

const categories = [
  { name: "All", icon: Flame },
  { name: "Workout", icon: Dumbbell },
  { name: "Phonk", icon: Zap },
  { name: "Funk", icon: Music },
  { name: "Running", icon: Wind },
  { name: "High Energy", icon: Flame },
  { name: "Chill", icon: Wind },
  { name: "EDM", icon: Zap },
  { name: "Hardstyle", icon: Flame },
  { name: "Trap", icon: Zap },
  { name: "Hip Hop", icon: Music },
  { name: "Rock", icon: Flame },
];

// Curated playlists
const curatedPlaylists = [
  { id: "gym-beast", name: "Gym Beast Mode", emoji: "💪", category: "Workout", color: "from-red-500/30 to-orange-500/30" },
  { id: "phonk-drift", name: "Phonk & Drift", emoji: "🏎️", category: "Phonk", color: "from-purple-500/30 to-pink-500/30" },
  { id: "funk-groove", name: "Funk & Groove", emoji: "🕺", category: "Funk", color: "from-yellow-500/30 to-green-500/30" },
  { id: "cardio-run", name: "Cardio Runner", emoji: "🏃", category: "Running", color: "from-blue-500/30 to-cyan-500/30" },
  { id: "chill-recovery", name: "Chill Recovery", emoji: "🧘", category: "Chill", color: "from-teal-500/30 to-emerald-500/30" },
  { id: "edm-drop", name: "EDM Drops", emoji: "🎧", category: "EDM", color: "from-violet-500/30 to-indigo-500/30" },
];

// Global iconic artists - India & USA
const favoriteArtists = [
  { name: "Arijit Singh", image: "https://ui-avatars.com/api/?name=Arijit+Singh&background=e74c3c&color=fff&size=128&bold=true", query: "Arijit Singh best songs" },
  { name: "A.R. Rahman", image: "https://ui-avatars.com/api/?name=AR+Rahman&background=f39c12&color=fff&size=128&bold=true", query: "AR Rahman top hits" },
  { name: "Honey Singh", image: "https://ui-avatars.com/api/?name=Honey+Singh&background=9b59b6&color=fff&size=128&bold=true", query: "Yo Yo Honey Singh top songs" },
  { name: "Badshah", image: "https://ui-avatars.com/api/?name=Badshah&background=1abc9c&color=fff&size=128&bold=true", query: "Badshah latest songs" },
  { name: "Shreya Ghoshal", image: "https://ui-avatars.com/api/?name=Shreya+G&background=e91e63&color=fff&size=128&bold=true", query: "Shreya Ghoshal best songs" },
  { name: "Diljit Dosanjh", image: "https://ui-avatars.com/api/?name=Diljit+D&background=ff5722&color=fff&size=128&bold=true", query: "Diljit Dosanjh top songs" },
  { name: "Drake", image: "https://ui-avatars.com/api/?name=Drake&background=2c3e50&color=fff&size=128&bold=true", query: "Drake top hits" },
  { name: "The Weeknd", image: "https://ui-avatars.com/api/?name=The+Weeknd&background=c0392b&color=fff&size=128&bold=true", query: "The Weeknd best songs" },
  { name: "Eminem", image: "https://ui-avatars.com/api/?name=Eminem&background=34495e&color=fff&size=128&bold=true", query: "Eminem greatest hits" },
  { name: "Taylor Swift", image: "https://ui-avatars.com/api/?name=Taylor+S&background=8e44ad&color=fff&size=128&bold=true", query: "Taylor Swift popular songs" },
  { name: "Post Malone", image: "https://ui-avatars.com/api/?name=Post+M&background=2980b9&color=fff&size=128&bold=true", query: "Post Malone best songs" },
  { name: "Travis Scott", image: "https://i.ytimg.com/vi/eb2dJmSEaps/mqdefault.jpg", query: "Travis Scott top hits" },
];

const playlistEmojis = ["🎵", "🔥", "💪", "🎧", "🏋️", "🎶", "⚡", "🎸", "🥁", "🎤"];

const trendingSuggestions = [
  "Shape of You", "Blinding Lights", "Starboy", "Levitating", "Stay",
  "Heat Waves", "As It Was", "Bad Guy", "Sunflower", "Believer",
  "Phonk Mix 2025", "Lofi Beats", "Gym Motivation", "Bollywood Hits",
  "Drake Top Hits", "Arijit Singh", "Travis Scott", "EDM Festival Mix",
];

const MusicPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeVideoAuthor, setActiveVideoAuthor] = useState("");
  const [activeVideoThumb, setActiveVideoThumb] = useState("");
  const [activeVideoDuration, setActiveVideoDuration] = useState("");
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [ytProgress, setYtProgress] = useState(0);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDurationSec, setYtDurationSec] = useState(0);
  const ytPlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onEndedRef = useRef<() => void>(() => {});
  const [repeatMode, setRepeatMode] = useState<'off' | 'one'>('off');
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>(() => {
    try { return JSON.parse(localStorage.getItem("yt_recent") || "[]"); } catch { return []; }
  });
  const [activeCuratedPlaylist, setActiveCuratedPlaylist] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Playlist states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [songToSave, setSongToSave] = useState<{ id: string; title: string; author: string; thumbnail: string; duration: string } | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistEmoji, setNewPlaylistEmoji] = useState("🎵");
  const [showPlaylistView, setShowPlaylistView] = useState(false);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [playlistSongsLoading, setPlaylistSongsLoading] = useState(false);
  const [showMyPlaylists, setShowMyPlaylists] = useState(false);

  const { likedSongs, toggleLike, isLiked, loading: likesLoading } = useLikedSongs();
  const { playlists: userPlaylists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, getPlaylistSongs, loading: playlistsLoading } = usePlaylists();

  const loadCategory = useCallback(async (cat: string) => {
    setLoading(true);
    const query = cat === "All" ? "gym workout music mix 2025" : `${cat} gym workout music`;
    const results = await searchYouTube(query, cat === "All" ? "Workout" : cat);
    setYtVideos(results);
    setLoading(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setIsSearchMode(true);
    const result = await searchYouTubeWithSource(searchQuery);
    
    // If server returned curated fallback, try client-side search
    if (result.source === 'curated') {
      console.log("Server returned curated, trying client-side fallback...");
      const { clientSideYouTubeSearch } = await import("@/lib/youtubeClientSearch");
      const clientResults = await clientSideYouTubeSearch(searchQuery);
      if (clientResults.length > 0) {
        setYtVideos(clientResults);
        setLoading(false);
        return;
      }
      // Both failed, show curated with toast
      toast({
        title: "YouTube API quota exceeded",
        description: "Showing curated results instead. Try again later for live search.",
        variant: "destructive",
      });
    }
    
    setYtVideos(result.items);
    setLoading(false);
  }, [searchQuery]);

  const handleArtistClick = useCallback(async (artist: typeof favoriteArtists[0]) => {
    setLoading(true);
    setSearchQuery(artist.name);
    const results = await searchYouTube(artist.query, "Workout");
    setYtVideos(results);
    setLoading(false);
  }, []);

  const handleCuratedPlaylistClick = useCallback(async (playlist: typeof curatedPlaylists[0]) => {
    setActiveCuratedPlaylist(playlist.id);
    setActiveCategory(playlist.category);
    setLoading(true);
    const results = await searchYouTube(`${playlist.name} music mix`, playlist.category);
    setYtVideos(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory, loadCategory]);

  useEffect(() => { localStorage.setItem("yt_recent", JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);

  // Load YouTube IFrame API & create player container outside React DOM
  useEffect(() => {
    // Create a container div outside React's managed DOM
    const container = document.createElement('div');
    container.id = 'yt-player-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;opacity:0;pointer-events:none;overflow:hidden;z-index:-1';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-hidden-player';
    container.appendChild(playerDiv);
    document.body.appendChild(container);

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (ytPlayerRef.current?.destroy) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      container.remove();
    };
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (player?.getCurrentTime && player?.getDuration) {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        setYtCurrentTime(current);
        setYtDurationSec(total);
        setYtProgress(total > 0 ? current / total : 0);
      }
    }, 500);
  }, []);

  const loadYtVideo = useCallback((videoId: string) => {
    const createPlayer = () => {
      if (ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(videoId);
        return;
      }
      // If player was destroyed or div replaced, recreate the target div
      let target = document.getElementById('yt-hidden-player');
      if (!target) {
        const container = document.getElementById('yt-player-container');
        if (container) {
          target = document.createElement('div');
          target.id = 'yt-hidden-player';
          container.innerHTML = '';
          container.appendChild(target);
        }
      }
      ytPlayerRef.current = new (window as any).YT.Player('yt-hidden-player', {
        height: '0',
        width: '0',
        videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onStateChange: (event: any) => {
            if (event.data === 1) { setIsYtPlaying(true); startProgressTracking(); }
            else if (event.data === 2) { setIsYtPlaying(false); }
            else if (event.data === 0) { setIsYtPlaying(false); if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); onEndedRef.current(); }
          },
          onReady: () => { startProgressTracking(); },
        },
      });
    };

    if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    }
  }, [startProgressTracking]);

  const handleToggleLike = (video: { id: string; title: string; author: string; thumbnail: string; duration: string }) => {
    toggleLike(video);
  };

  const handleYtPlay = useCallback((video: YouTubeVideo) => {
    setActiveVideoId(video.id);
    setActiveVideoTitle(video.title);
    setActiveVideoAuthor(video.author);
    setActiveVideoThumb(video.thumbnail);
    setActiveVideoDuration(video.duration);
    setYtProgress(0);
    setYtCurrentTime(0);
    setYtDurationSec(0);
    loadYtVideo(video.id);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      return [video, ...filtered].slice(0, 15);
    });
  }, [loadYtVideo]);

  // Auto-play next or repeat when current ends
  useEffect(() => {
    onEndedRef.current = () => {
      if (repeatMode === 'one' && activeVideoId) {
        // Replay current song
        const player = ytPlayerRef.current;
        if (player?.seekTo) {
          player.seekTo(0, true);
          player.playVideo?.();
        }
        return;
      }
      const idx = ytVideos.findIndex(v => v.id === activeVideoId);
      if (idx >= 0 && idx < ytVideos.length - 1) {
        const next = ytVideos[idx + 1];
        setActiveVideoId(next.id);
        setActiveVideoTitle(next.title);
        setActiveVideoAuthor(next.author);
        setActiveVideoThumb(next.thumbnail);
        setActiveVideoDuration(next.duration);
        setYtProgress(0); setYtCurrentTime(0); setYtDurationSec(0);
        loadYtVideo(next.id);
        setRecentlyPlayed(prev => [next, ...prev.filter(v => v.id !== next.id)].slice(0, 15));
      }
    };
  }, [ytVideos, activeVideoId, loadYtVideo, repeatMode]);

  const handlePlayLikedSong = (song: { video_id: string; title: string; author: string | null; thumbnail: string | null; duration: string | null }) => {
    setActiveVideoId(song.video_id);
    setActiveVideoTitle(song.title);
    setActiveVideoAuthor(song.author || "");
    setActiveVideoThumb(song.thumbnail || "");
    setActiveVideoDuration(song.duration || "");
    setYtProgress(0); setYtCurrentTime(0); setYtDurationSec(0);
    loadYtVideo(song.video_id);
  };

  const handlePlayPlaylistSong = (song: PlaylistSong) => {
    setActiveVideoId(song.video_id);
    setActiveVideoTitle(song.title);
    setActiveVideoAuthor(song.author || "");
    setActiveVideoThumb(song.thumbnail || "");
    setActiveVideoDuration(song.duration || "");
    setYtProgress(0); setYtCurrentTime(0); setYtDurationSec(0);
    loadYtVideo(song.video_id);
  };

  const togglePlayPause = () => {
    const player = ytPlayerRef.current;
    if (!player) return;
    if (isYtPlaying) {
      player.pauseVideo?.();
    } else {
      player.playVideo?.();
    }
  };

  const handleSkipNext = () => {
    const idx = ytVideos.findIndex(v => v.id === activeVideoId);
    if (idx >= 0 && idx < ytVideos.length - 1) {
      handleYtPlay(ytVideos[idx + 1]);
    }
  };

  const handleSkipPrev = () => {
    const idx = ytVideos.findIndex(v => v.id === activeVideoId);
    if (idx > 0) {
      handleYtPlay(ytVideos[idx - 1]);
    }
  };

  const seekForward = () => {
    const player = ytPlayerRef.current;
    if (!player?.getCurrentTime) return;
    player.seekTo(player.getCurrentTime() + 10, true);
  };

  const seekBackward = () => {
    const player = ytPlayerRef.current;
    if (!player?.getCurrentTime) return;
    player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
  };

  const handleProgressSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const player = ytPlayerRef.current;
    if (!player?.getDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seekTo(ratio * player.getDuration(), true);
  };

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const openSaveModal = (video: { id: string; title: string; author: string; thumbnail: string; duration: string }) => {
    setSongToSave(video);
    setShowSaveModal(true);
  };

  const handleSaveToPlaylist = async (playlistId: string) => {
    if (!songToSave) return;
    await addSongToPlaylist(playlistId, songToSave);
    toast({ title: "Saved!", description: "Song added to playlist" });
    setShowSaveModal(false);
    setSongToSave(null);
  };

  const handleCreateAndSave = async () => {
    if (!newPlaylistName.trim()) return;
    const pl = await createPlaylist(newPlaylistName.trim(), newPlaylistEmoji);
    if (pl && songToSave) {
      await addSongToPlaylist(pl.id, songToSave);
      toast({ title: "Created!", description: `Playlist "${pl.name}" created and song added` });
    }
    setNewPlaylistName("");
    setNewPlaylistEmoji("🎵");
    setShowCreatePlaylist(false);
    setShowSaveModal(false);
    setSongToSave(null);
  };

  const openPlaylistView = async (playlistId: string) => {
    setViewingPlaylistId(playlistId);
    setShowPlaylistView(true);
    setPlaylistSongsLoading(true);
    const songs = await getPlaylistSongs(playlistId);
    setPlaylistSongs(songs);
    setPlaylistSongsLoading(false);
  };

  const handleRemoveFromPlaylist = async (playlistId: string, videoId: string) => {
    await removeSongFromPlaylist(playlistId, videoId);
    setPlaylistSongs(prev => prev.filter(s => s.video_id !== videoId));
  };

  const viewingPlaylist = userPlaylists.find(p => p.id === viewingPlaylistId);

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      {/* Save to Playlist Modal */}
      <AnimatePresence>
        {showSaveModal && songToSave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => { setShowSaveModal(false); setSongToSave(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-card border border-border/20 rounded-t-3xl p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Save to Playlist</h3>
              <p className="text-xs text-muted-foreground mb-4 truncate">{songToSave.title}</p>

              {showCreatePlaylist ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {playlistEmojis.map(e => (
                      <button key={e} onClick={() => setNewPlaylistEmoji(e)}
                        className={`text-xl p-1.5 rounded-lg transition-all ${newPlaylistEmoji === e ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-secondary/50"}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Playlist name..."
                    autoFocus
                    className="w-full bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 outline-none border border-border/20 focus:border-primary/40"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreatePlaylist(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-secondary/30">Cancel</button>
                    <button onClick={handleCreateAndSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold gradient-primary text-primary-foreground">Create & Save</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-primary">Create New Playlist</span>
                  </button>

                  {userPlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => handleSaveToPlaylist(pl.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-lg">
                        {pl.emoji}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{pl.name}</p>
                        <p className="text-[10px] text-muted-foreground">{pl.song_count || 0} songs</p>
                      </div>
                    </button>
                  ))}

                  {userPlaylists.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No playlists yet. Create one above!</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist View Overlay */}
      <AnimatePresence>
        {showPlaylistView && viewingPlaylist && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-border/20">
              <button onClick={() => setShowPlaylistView(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-6 w-6 text-foreground" />
              </button>
              <div className="text-center">
                <span className="text-2xl">{viewingPlaylist.emoji}</span>
                <h2 className="text-lg font-bold text-foreground">{viewingPlaylist.name}</h2>
              </div>
              <button onClick={async () => {
                await deletePlaylist(viewingPlaylist.id);
                setShowPlaylistView(false);
                toast({ title: "Deleted", description: "Playlist removed" });
              }} className="p-2 rounded-full hover:bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </button>
            </div>

            {/* Shuffle Button */}
            {playlistSongs.length > 1 && (
              <div className="px-4 pt-3">
                <button
                  onClick={() => {
                    const shuffled = [...playlistSongs].sort(() => Math.random() - 0.5);
                    if (shuffled[0]) handlePlayPlaylistSong(shuffled[0]);
                    toast({ title: "Shuffle Play", description: `Playing ${shuffled.length} songs in random order` });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm neon-glow"
                >
                  <Shuffle className="h-4 w-4" />
                  Shuffle Play
                </button>
              </div>
            )}

            <div className="flex-1 px-4 pt-4 pb-24">
              {playlistSongsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : playlistSongs.length === 0 ? (
                <div className="text-center py-16">
                  <ListMusic className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No songs in this playlist</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Search for songs and tap "Save" to add them</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {playlistSongs.map((song, i) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(0.03 * i, 0.3) }}
                      onClick={() => handlePlayPlaylistSong(song)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                        activeVideoId === song.video_id ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                      }`}
                    >
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10">
                        {song.thumbnail ? (
                          <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${activeVideoId === song.video_id ? "text-primary" : "text-foreground"}`}>{song.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{song.author || "Unknown"}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFromPlaylist(viewingPlaylist.id, song.video_id); }} className="shrink-0 p-1">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                      <span className="text-[10px] text-muted-foreground shrink-0">{song.duration || ""}</span>
                      <button className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                        <Play className="h-3.5 w-3.5 ml-0.5 text-primary" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Playlists Full Screen */}
      <AnimatePresence>
        {showMyPlaylists && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-border/20">
              <button onClick={() => setShowMyPlaylists(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-6 w-6 text-foreground" />
              </button>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-primary" /> My Playlists
              </h2>
              <span className="text-sm text-muted-foreground">{userPlaylists.length}</span>
            </div>
            <div className="flex-1 px-4 pt-4 pb-24">
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-16">
                  <FolderPlus className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No playlists yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tap "Save" on any song to create your first playlist</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPlaylists.map((pl) => (
                    <motion.div
                      key={pl.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setShowMyPlaylists(false); openPlaylistView(pl.id); }}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <div className="h-14 w-14 rounded-xl bg-secondary/50 flex items-center justify-center text-2xl shrink-0">
                        {pl.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{pl.name}</p>
                        <p className="text-[11px] text-muted-foreground">{pl.song_count || 0} songs</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Favorites Screen */}
      <AnimatePresence>
        {showFavorites && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-border/20">
              <button onClick={() => setShowFavorites(false)} className="p-2 rounded-full hover:bg-secondary/50">
                <ChevronDown className="h-6 w-6 text-foreground" />
              </button>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive fill-current" /> My Favorites
              </h2>
              <span className="text-sm text-muted-foreground">{likedSongs.length}</span>
            </div>
            {/* Shuffle Button */}
            {likedSongs.length > 1 && (
              <div className="px-4 pt-3">
                <button
                  onClick={() => {
                    const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
                    if (shuffled[0]) handlePlayLikedSong(shuffled[0]);
                    toast({ title: "Shuffle Play", description: `Playing ${shuffled.length} favorites in random order` });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm neon-glow"
                >
                  <Shuffle className="h-4 w-4" />
                  Shuffle Play
                </button>
              </div>
            )}

            <div className="flex-1 px-4 pt-4 pb-24">
              {likesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : likedSongs.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No liked songs yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tap the ❤️ on any song to add it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {likedSongs.map((song, i) => (
                    <motion.div
                      key={song.video_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(0.03 * i, 0.3) }}
                      onClick={() => handlePlayLikedSong(song)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                        activeVideoId === song.video_id ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                      }`}
                    >
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10">
                        {song.thumbnail ? (
                          <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-destructive/10 flex items-center justify-center">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${activeVideoId === song.video_id ? "text-primary" : "text-foreground"}`}>{song.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{song.author || "Unknown"}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleLike({ id: song.video_id, title: song.title, author: song.author || "", thumbnail: song.thumbnail || "", duration: song.duration || "" }); }} className="shrink-0 p-1">
                        <Heart className="h-3.5 w-3.5 text-destructive fill-current" />
                      </button>
                      <span className="text-[10px] text-muted-foreground shrink-0">{song.duration || ""}</span>
                      <button className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                        <Play className="h-3.5 w-3.5 ml-0.5 text-primary" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Youtube className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">GYM BEATS</h1>
            <p className="text-[10px] text-muted-foreground">Play any YouTube song 🎵</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMyPlaylists(true)} className="relative h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <ListMusic className="h-5 w-5 text-primary" />
            {userPlaylists.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">{userPlaylists.length}</span>
            )}
          </button>
          <button onClick={() => setShowFavorites(true)} className="relative h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors">
            <Heart className="h-5 w-5 text-destructive" />
            {likedSongs.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">{likedSongs.length}</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative z-20 mb-4">
        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl border border-border/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleSearch(); setSearchFocused(false); } }}
            onFocus={() => { setIsSearchMode(true); setSearchFocused(true); }}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search any song, artist, genre..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setIsSearchMode(false); setSearchFocused(false); loadCategory(activeCategory); }} className="p-1">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => { handleSearch(); setSearchFocused(false); }} className="gradient-primary px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground">GO</button>
        </div>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {searchFocused && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1.5 glass-card border border-border/20 rounded-xl overflow-hidden shadow-lg max-h-64 overflow-y-auto"
            >
              <div className="px-3 pt-3 pb-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🔥 Trending</p>
              </div>
              <div className="px-2 pb-2 flex flex-wrap gap-1.5">
                {trendingSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setSearchFocused(false);
                      setIsSearchMode(true);
                      setLoading(true);
                      searchYouTubeWithSource(suggestion).then((result) => {
                        setYtVideos(result.items);
                        if (result.source === 'curated') {
                          toast({ title: "YouTube API quota exceeded", description: "Showing curated results instead.", variant: "destructive" });
                        }
                        setLoading(false);
                      });
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 text-foreground hover:bg-primary/20 hover:text-primary transition-all border border-border/10"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {recentlyPlayed.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1.5 border-t border-border/10">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">⏱ Recently Played</p>
                  </div>
                  <div className="px-2 pb-2 space-y-0.5">
                    {recentlyPlayed.slice(0, 5).map((song) => (
                      <button
                        key={song.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery(song.title);
                          setSearchFocused(false);
                          setIsSearchMode(true);
                          setLoading(true);
                          searchYouTubeWithSource(song.title).then((result) => {
                            setYtVideos(result.items);
                            setLoading(false);
                          });
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <img src={song.thumbnail} alt="" className="h-8 w-8 rounded-md object-cover" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-medium text-foreground truncate">{song.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{song.author}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Categories */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => { setActiveCategory(cat.name); setActiveCuratedPlaylist(null); setSearchQuery(""); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === cat.name ? "gradient-primary text-primary-foreground neon-glow" : "glass-card text-muted-foreground"
            }`}
          >
            <cat.icon className="h-3 w-3" />
            {cat.name}
          </button>
        ))}
      </motion.div>

      {/* Curated Playlists */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-primary" /> Gym Playlists
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {curatedPlaylists.map((pl) => (
            <motion.div
              key={pl.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCuratedPlaylistClick(pl)}
              className={`shrink-0 w-32 p-3 rounded-2xl cursor-pointer border transition-all ${
                activeCuratedPlaylist === pl.id ? "border-primary/40 neon-glow" : "border-border/10"
              } glass-card`}
            >
              <div className={`h-16 w-full rounded-xl bg-gradient-to-br ${pl.color} flex items-center justify-center mb-2`}>
                <span className="text-2xl">{pl.emoji}</span>
              </div>
              <p className="text-[11px] font-bold text-foreground line-clamp-1">{pl.name}</p>
              <p className="text-[9px] text-muted-foreground">{pl.category}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* My Playlists Quick Row */}
      {userPlaylists.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="relative z-10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-primary" /> My Playlists
            </h2>
            <button onClick={() => setShowMyPlaylists(true)} className="text-[10px] text-primary font-semibold">View All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {userPlaylists.slice(0, 6).map((pl) => (
              <motion.div
                key={pl.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => openPlaylistView(pl.id)}
                className="shrink-0 w-28 cursor-pointer"
              >
                <div className="h-20 w-28 rounded-xl bg-secondary/30 border border-border/20 flex items-center justify-center mb-1.5">
                  <span className="text-3xl">{pl.emoji}</span>
                </div>
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">{pl.name}</p>
                <p className="text-[9px] text-muted-foreground">{pl.song_count || 0} songs</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Favorite Artists */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" /> 🇮🇳 🇺🇸 Global Icons
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {favoriteArtists.map((artist) => (
            <motion.div
              key={artist.name}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleArtistClick(artist)}
              className="shrink-0 w-20 cursor-pointer flex flex-col items-center"
            >
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/20 mb-1.5">
                <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
              </div>
              <p className="text-[10px] font-semibold text-foreground text-center line-clamp-1">{artist.name}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Recently Played</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {recentlyPlayed.slice(0, 8).map((video) => (
              <motion.div
                key={video.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleYtPlay(video)}
                className="shrink-0 w-28 cursor-pointer"
              >
                <div className="h-20 w-28 rounded-xl overflow-hidden mb-1.5 border border-border/20 relative">
                  <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-background/80 px-1 py-0.5 rounded text-[8px] font-bold text-foreground">{video.duration}</div>
                  <div className="absolute inset-0 bg-background/0 hover:bg-background/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-foreground" />
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">{video.title}</p>
                <p className="text-[9px] text-muted-foreground truncate">{video.author}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Liked Songs Quick Preview */}
      {likedSongs.length > 0 && !showFavorites && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-destructive fill-current" /> Liked Songs
            </h2>
            <button onClick={() => setShowFavorites(true)} className="text-[10px] text-primary font-semibold">View All ({likedSongs.length})</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {likedSongs.slice(0, 6).map((song) => (
              <motion.div key={song.video_id} whileTap={{ scale: 0.95 }} onClick={() => handlePlayLikedSong(song)} className="shrink-0 w-24 cursor-pointer">
                <div className="h-24 w-24 rounded-xl overflow-hidden mb-1.5 border border-destructive/20">
                  {song.thumbnail ? <img src={song.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-destructive/10 flex items-center justify-center"><Heart className="h-6 w-6 text-destructive" /></div>}
                </div>
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">{song.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Finding tracks...</span>
        </div>
      )}

      {/* Track List */}
      {!loading && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">
              {searchQuery ? `Results for "${searchQuery}"` : activeCuratedPlaylist ? curatedPlaylists.find(p => p.id === activeCuratedPlaylist)?.name : `${activeCategory} Tracks`}
            </h2>
            <span className="text-[10px] text-muted-foreground">{ytVideos.length} tracks</span>
          </div>

          <div className="space-y-1">
            {ytVideos.map((video, i) => {
              const isActive = activeVideoId === video.id;
              const videoLiked = isLiked(video.id);
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.03 * i, 0.3) }}
                  onClick={() => handleYtPlay(video)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isActive ? "glass-card border border-primary/20" : "hover:bg-secondary/30"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-border/10">
                    <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-4">
                          {[1,2,3].map(j => (
                            <motion.div key={j} className="w-[2px] bg-primary rounded-full"
                              animate={{ height: [4, 12, 4] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: j * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{video.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{video.author}</p>
                  </div>

                  {/* Like */}
                  <button onClick={(e) => { e.stopPropagation(); handleToggleLike(video); }} className="shrink-0 p-1">
                    <Heart className={`h-3.5 w-3.5 transition-colors ${videoLiked ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                  </button>

                  {/* Save to playlist */}
                  <button onClick={(e) => { e.stopPropagation(); openSaveModal(video); }} className="shrink-0 p-1">
                    <ListMusic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                  </button>

                  {/* Duration & Play */}
                  <span className="text-[10px] text-muted-foreground shrink-0">{video.duration}</span>
                  <button className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? "gradient-primary neon-glow" : "bg-primary/10"
                  }`}>
                    <Play className={`h-3.5 w-3.5 ml-0.5 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                  </button>
                </motion.div>
              );
            })}
          </div>

          {ytVideos.length === 0 && (
            <div className="text-center py-12">
              <Youtube className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tracks found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different category or search</p>
            </div>
          )}
        </div>
      )}


      {/* Bottom Mini Player */}
      <AnimatePresence>
        {activeVideoId && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-40 px-3"
          >
            <div
              className="max-w-md mx-auto glass-card p-3 rounded-2xl border border-primary/20"
              style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" }}
            >
              {/* Waveform animation */}
              <div className="flex items-end gap-[2px] h-4 justify-center mb-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] rounded-full bg-primary"
                    animate={isYtPlaying ? {
                      height: [3, 5 + Math.random() * 11, 3],
                    } : { height: 3 }}
                    transition={{
                      repeat: isYtPlaying ? Infinity : 0,
                      duration: 0.3 + Math.random() * 0.4,
                      delay: i * 0.02,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border/10">
                  <img src={activeVideoThumb} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{activeVideoTitle}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-muted-foreground truncate">{activeVideoAuthor}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleToggleLike({ id: activeVideoId!, title: activeVideoTitle, author: activeVideoAuthor, thumbnail: activeVideoThumb, duration: activeVideoDuration }); }} className="p-1">
                  <Heart className={`h-3.5 w-3.5 ${isLiked(activeVideoId!) ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                </button>
                <div className="flex items-center gap-0.5">
                  <button onClick={handleSkipPrev} className="p-1">
                    <SkipBack className="h-3.5 w-3.5 text-foreground" />
                  </button>
                  <button onClick={seekBackward} className="p-1" title="-10s">
                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button onClick={togglePlayPause} className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center neon-glow">
                    {isYtPlaying ? (
                      <Pause className="h-3.5 w-3.5 text-primary-foreground" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
                    )}
                  </button>
                  <button onClick={seekForward} className="p-1" title="+10s">
                    <RotateCw className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button onClick={handleSkipNext} className="p-1">
                    <SkipForward className="h-3.5 w-3.5 text-foreground" />
                  </button>
                  <button onClick={() => setRepeatMode(prev => prev === 'off' ? 'one' : 'off')} className="p-1" title={repeatMode === 'one' ? 'Repeat: On' : 'Repeat: Off'}>
                    {repeatMode === 'one' ? (
                      <Repeat1 className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] text-muted-foreground w-7 text-right shrink-0">{formatSec(ytCurrentTime)}</span>
                <div
                  className="flex-1 h-1.5 rounded-full bg-secondary cursor-pointer relative group"
                  onClick={handleProgressSeek}
                >
                  <motion.div
                    className="h-full rounded-full gradient-primary absolute left-0 top-0"
                    style={{ width: `${ytProgress * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${ytProgress * 100}% - 6px)` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground w-7 shrink-0">{formatSec(ytDurationSec)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicPage;

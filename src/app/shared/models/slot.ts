import { Dance } from './dance';
import { PlaylistItem } from './playlist-item';
import { SortOrder } from './sort-order';
import { Playlist } from './playlist';

export class Slot {
    public dance: Dance;
    public playlist: Playlist;
    public items: PlaylistItem[];
    public currentSongIndex = 0;
    public sortOrder = SortOrder.Random;
    public playbackRate = 1;

    constructor(dance: Dance, playlist: Playlist) {
        this.dance = dance;
        this.playlist = playlist;
        this.items = [];
    }
}
import { Dance } from './dance';
import { PlaylistItem } from './playlist-item';
import { SortOrder } from './sort-order';

export class Slot {
    public dance: Dance;
    public playlistName: string;
    public items: PlaylistItem[];
    public currentSongIndex = 0;
    public sortOrder = SortOrder.Random;

    constructor(dance: Dance, playlistName: string) {
        this.dance = dance;
        this.playlistName = playlistName;
        this.items = [];
    }
}
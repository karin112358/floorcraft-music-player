import { Dance } from './dance';
import { PlaylistItem } from './playlist-item';

export class PracticeDancePlaylist {
    public dance: Dance;
    public items: PlaylistItem[];

    constructor(dance: Dance) {
        this.dance = dance;
        this.items = [];
    }
}
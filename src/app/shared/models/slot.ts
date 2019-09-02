import { Dance } from './dance';
import { PlaylistItem } from './playlist-item';

export class Slot {
    public dance: Dance;
    public playlist: string;
    public items: PlaylistItem[];

    constructor(dance: Dance, playlist: string) {
        this.dance = dance;
        this.playlist = playlist;
        this.items = [];
    }
}
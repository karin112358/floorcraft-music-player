
import { PlaylistItem } from './playlist-item';
import { Category } from './category';
import { Dance } from './dance';

export class Playlist {
    public name: string;
    public title: string;
    public items: PlaylistItem[] = [];

    constructor(name: string, title: string = '', items: PlaylistItem[] = []) {
        this.name = name;
        this.title = title;
        this.items = items;
    }
}
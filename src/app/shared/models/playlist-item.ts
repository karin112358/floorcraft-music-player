export class PlaylistItem {
    public configuration: any;
    public progress: number = 0;
    public duration: number = 0;
    public error = '';

    constructor(configuration: any, duration: number) {
        this.configuration = configuration;
        this.duration = duration;
    }
}
export class PlaylistItem {
    // TODO: remove configuration
    public absolutePath: string;
    public configuration: any;
    public progress: number = 0;
    public duration: number = 0;
    public playbackRate: number = 1;
    public isDisabled: boolean;
    public error = '';

    constructor(configuration: any, duration: number, isDisabled = false, playbackRate = 1) {
        this.configuration = configuration;
        this.duration = duration;
        this.isDisabled = isDisabled;
        this.playbackRate = playbackRate;
    }
}
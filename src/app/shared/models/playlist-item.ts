export class PlaylistItem {
    public configuration: any;
    public progress: number = 0;
    public duration: number = 0;
    public isDisabled: boolean;
    public error = '';

    constructor(configuration: any, duration: number, isDisabled = false) {
        this.configuration = configuration;
        this.duration = duration;
        this.isDisabled = isDisabled;
    }
}
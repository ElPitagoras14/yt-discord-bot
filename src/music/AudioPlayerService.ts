import {
  createAudioPlayer,
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
} from "@discordjs/voice";

export class AudioPlayerService {
  readonly player: AudioPlayer;

  constructor() {
    this.player = createAudioPlayer();
  }

  play(resource: AudioResource): void {
    this.player.play(resource);
  }

  pause(): boolean {
    return this.player.pause();
  }

  resume(): boolean {
    return this.player.unpause();
  }

  stop(): boolean {
    return this.player.stop(true);
  }

  get status(): AudioPlayerStatus {
    return this.player.state.status;
  }

  get isPlaying(): boolean {
    return this.player.state.status === AudioPlayerStatus.Playing;
  }

  get isIdle(): boolean {
    return this.player.state.status === AudioPlayerStatus.Idle;
  }
}

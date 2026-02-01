import { AudioPlayer } from "@discordjs/voice";

export interface Song {
  title: string;
  url: string;
  requestedBy?: string;
  sessionId?: string;
}

export interface Queue {
  songs: Song[];
  player: AudioPlayer;
  playing: boolean;
  idleTimer: NodeJS.Timeout | null;
}

import { create } from "zustand";
import type { Channel, Video, Persona } from "@/types";

interface YouTubeStore {
    channel: Channel | null;
    videos: Video[];
    personas: Persona[];
    isChannelFetched: boolean;
    isVideosFetched: boolean;
    isPersonasFetched: boolean;
    setChannel: (channel: Channel | null) => void;
    setVideos: (videos: Video[]) => void;
    setPersonas: (personas: Persona[]) => void;
}

export const useYouTubeStore = create<YouTubeStore>((set) => ({
    channel: null,
    videos: [],
    personas: [],
    isChannelFetched: false,
    isVideosFetched: false,
    isPersonasFetched: false,
    setChannel: (channel) => set({ channel, isChannelFetched: true }),
    setVideos: (videos) => set({ videos, isVideosFetched: true }),
    setPersonas: (personas) => set({ personas, isPersonasFetched: true }),
}));

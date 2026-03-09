export interface FeedPerformanceSample {
    mediaStartLatencyMs: number;
    scrollFrameDrops: number;
    warning: boolean;
}

export function measureMediaStartLatency(startedAtMs: number, playAtMs: number) {
    return Math.max(0, playAtMs - startedAtMs);
}

export function createFeedPerformanceSample(mediaStartLatencyMs: number, scrollFrameDrops: number): FeedPerformanceSample {
    const warning = mediaStartLatencyMs > 450 || scrollFrameDrops > 8;
    return { mediaStartLatencyMs, scrollFrameDrops, warning };
}

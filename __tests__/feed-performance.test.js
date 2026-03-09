import { createFeedPerformanceSample, measureMediaStartLatency } from '../src/services/feed-performance';

describe('feed performance checks', () => {
    test('measures media start latency', () => {
        expect(measureMediaStartLatency(1000, 1225)).toBe(225);
    });

    test('flags warning thresholds for slow media or janky scroll', () => {
        expect(createFeedPerformanceSample(500, 2).warning).toBe(true);
        expect(createFeedPerformanceSample(200, 10).warning).toBe(true);
        expect(createFeedPerformanceSample(200, 2).warning).toBe(false);
    });
});

import { handleCommentAction } from '../packages/ui/src/components/vertical-feed-utils';

describe('vertical video feed comment action', () => {
    test('opens room chat when room is available', () => {
        const setChatItem = jest.fn();
        const onMissingRoom = jest.fn();
        const item = { id: '1', roomId: '!room:matrix.org' };

        const opened = handleCommentAction(item, { setChatItem, onMissingRoom });

        expect(opened).toBe(true);
        expect(setChatItem).toHaveBeenCalledWith(item);
        expect(onMissingRoom).not.toHaveBeenCalled();
    });

    test('falls back when room is missing', () => {
        const setChatItem = jest.fn();
        const onMissingRoom = jest.fn();
        const item = { id: '1', roomId: '' };

        const opened = handleCommentAction(item, { setChatItem, onMissingRoom });

        expect(opened).toBe(false);
        expect(setChatItem).not.toHaveBeenCalled();
        expect(onMissingRoom).toHaveBeenCalledWith(item);
    });
});

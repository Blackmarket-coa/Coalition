type AsyncStorageValue = string | null;

const memoryStorage = new Map<string, string>();

const hasBrowserStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const read = (key: string): AsyncStorageValue => {
    if (hasBrowserStorage) {
        return window.localStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
};

const write = (key: string, value: string) => {
    if (hasBrowserStorage) {
        window.localStorage.setItem(key, value);
        return;
    }

    memoryStorage.set(key, value);
};

const remove = (key: string) => {
    if (hasBrowserStorage) {
        window.localStorage.removeItem(key);
        return;
    }

    memoryStorage.delete(key);
};

const AsyncStorage = {
    async getItem(key: string): Promise<AsyncStorageValue> {
        return read(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        write(key, value);
    },

    async removeItem(key: string): Promise<void> {
        remove(key);
    },

    async multiSet(entries: Array<[string, string]>): Promise<void> {
        for (const [key, value] of entries) {
            write(key, value);
        }
    },

    async multiRemove(keys: string[]): Promise<void> {
        for (const key of keys) {
            remove(key);
        }
    },
};

export default AsyncStorage;

const RNFS = {
    DocumentDirectoryPath: '/tmp',
    CachesDirectoryPath: '/tmp',
    writeFile: async () => {},
    readFile: async () => '',
    unlink: async () => {},
    exists: async () => false,
    mkdir: async () => {},
    downloadFile: () => ({ promise: Promise.resolve({ statusCode: 200 }) }),
};

export default RNFS;

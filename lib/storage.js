import { put, del, head, get, list } from '@vercel/blob';

export function getBlobClient() {
    return {
        async get(path) {
            return await get(path);
        },
        async getUploadUrl(path) {
            const { url } = await put(path, null, {
                access: 'public',
                addRandomSuffix: false
            });
            return url;
        },
        async delete(path) {
            await del(path);
        },
        async list() {
            return await list();
        },
        async head(path) {
            return await head(path);
        }
    };
}

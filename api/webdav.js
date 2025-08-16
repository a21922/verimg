import { WebDAVServer } from 'webdav-server';
import { SimpleUserManager } from 'webdav-server/lib/manager/v2/user/SimpleUserManager';
import { getBlobClient } from '../../../lib/storage';

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = [
    // 图片
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.bmp', '.tiff', '.tif', '.svg', '.heic', '.heif', '.avif',
    // 视频
    '.mp4', '.mov', '.avi', '.mkv', '.webm', 
    '.flv', '.wmv', '.m4v', '.3gp', '.mpeg', '.mpg'
];

export default async function handler(req, res) {
    if (!process.env.WEBDAV_USERNAME || !process.env.WEBDAV_PASSWORD) {
        return res.status(500).send('WebDAV 认证未配置');
    }

    const blobClient = getBlobClient();
    
    const server = new WebDAVServer({
        port: 0,
        requireAuthentification: true,
        httpAuthentication: new SimpleUserManager({
            [process.env.WEBDAV_USERNAME]: process.env.WEBDAV_PASSWORD
        }),
        maxRequestDepth: 1,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS, PROPFIND',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth'
        }
    });

    server.setFileSystem('/blob', {
        async _getBlobPath(path) {
            return path.replace(/^\/blob\//, '');
        },
        
        async createReadStream(path, callback) {
            try {
                const blobPath = this._getBlobPath(path);
                const blob = await blobClient.get(blobPath);
                const response = await fetch(blob.url);
                callback(null, response.body);
            } catch (error) {
                callback(error);
            }
        },
        
        async createWriteStream(path, callback) {
            try {
                const blobPath = this._getBlobPath(path);
                
                // 验证文件扩展名
                const ext = blobPath.substring(blobPath.lastIndexOf('.')).toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    throw new Error('不支持的文件类型');
                }
                
                const { url: uploadUrl } = await blobClient.getUploadUrl(blobPath);
                callback(null, {
                    write: async (chunk, enc, cb) => {
                        try {
                            await fetch(uploadUrl, {
                                method: 'PUT',
                                body: chunk
                            });
                            cb();
                        } catch (error) {
                            cb(error);
                        }
                    },
                    end: (cb) => cb()
                });
            } catch (error) {
                callback(error);
            }
        },
        
        async deletePath(path, callback) {
            try {
                await blobClient.delete(this._getBlobPath(path));
                callback();
            } catch (error) {
                callback(error);
            }
        },
        
        async getProperties(path, callback) {
            try {
                const blobPath = this._getBlobPath(path);
                if (blobPath === '') {
                    // 根目录
                    callback(null, {
                        isDirectory: true
                    });
                    return;
                }

                const blob = await blobClient.head(blobPath);
                callback(null, {
                    creationDate: new Date(),
                    lastModified: new Date(blob.uploadedAt),
                    size: blob.size,
                    isFile: true
                });
            } catch (error) {
                // 如果找不到文件，假设是目录
                callback(null, {
                    isDirectory: true
                });
            }
        },
        
        async readDir(path, callback) {
            try {
                const { blobs } = await blobClient.list();
                callback(null, blobs.map(blob => blob.pathname));
            } catch (error) {
                callback(error);
            }
        }
    });

    await server.executeRequest(req, res);
}

export const config = {
    api: {
        bodyParser: false
    }
};

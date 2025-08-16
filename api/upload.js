import { put } from '@vercel/blob';

// 允许的 MIME 类型
const ALLOWED_MIME_TYPES = [
    // 图片
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/tiff', 'image/svg+xml', 'image/heic', 'image/avif',
    // 视频
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'video/webm', 'video/x-flv', 'video/x-ms-wmv', 'video/mp2t'
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const file = req.body;
    const filename = req.headers['x-vercel-filename'] || `file_${Date.now()}`;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return res.status(400).json({ error: '不支持的文件类型' });
    }

    try {
        // 获取文件扩展名
        let extension = '';
        if (contentType.startsWith('image/')) {
            extension = `.${contentType.split('/')[1]}`;
        } else if (contentType.startsWith('video/')) {
            extension = `.${contentType.split('/')[1]}`;
            // 特殊处理一些视频类型
            if (contentType === 'video/quicktime') extension = '.mov';
            if (contentType === 'video/x-msvideo') extension = '.avi';
            if (contentType === 'video/x-matroska') extension = '.mkv';
            if (contentType === 'video/x-flv') extension = '.flv';
            if (contentType === 'video/x-ms-wmv') extension = '.wmv';
            if (contentType === 'video/mp2t') extension = '.mpeg';
        }

        const finalFilename = filename.includes('.') ? filename : `${filename}${extension}`;

        const { url } = await put(finalFilename, file, {
            access: 'public',
            contentType
        });

        return res.status(200).json({ url });
    } catch (error) {
        console.error('上传错误:', error);
        return res.status(500).json({ error: '上传失败' });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '100mb'
        }
    }
};

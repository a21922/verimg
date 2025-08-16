import { useState } from 'react';
import { list } from '@vercel/blob';

// 支持的媒体类型
const ALLOWED_MIME_TYPES = [
    // 图片
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/tiff', 'image/svg+xml', 'image/heic', 'image/avif',
    // 视频
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'video/webm', 'video/x-flv', 'video/x-ms-wmv', 'video/mp2t'
];

export default function Home({ initialBlobs }) {
    const [blobs, setBlobs] = useState(initialBlobs || []);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 重置文件输入
        e.target.value = '';
        
        // 验证文件类型
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            setError(`不支持的文件类型: ${file.type}`);
            return;
        }
        
        setError('');
        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Vercel-Filename': file.name,
                    'Content-Type': file.type
                }
            });

            if (!response.ok) {
                throw new Error('上传失败');
            }

            // 刷新文件列表
            const { blobs } = await list();
            setBlobs(blobs);
        } catch (err) {
            console.error('上传错误:', err);
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ 
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ color: '#333' }}>WebDAV 媒体托管</h1>
            
            <div style={{ 
                margin: '30px 0',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h2 style={{ marginTop: 0 }}>上传文件</h2>
                <input 
                    type="file"
                    id="file-upload"
                    onChange={handleUpload}
                    accept={ALLOWED_MIME_TYPES.join(',')}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                />
                <label
                    htmlFor="file-upload"
                    style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: isUploading ? '#ccc' : '#0070f3',
                        color: 'white',
                        borderRadius: '4px',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isUploading ? '上传中...' : '选择文件'}
                </label>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    支持格式: {ALLOWED_MIME_TYPES.map(t => t.split('/')[1]).join(', ')}
                </p>
                {error && (
                    <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
                )}
            </div>
            
            <h2>文件列表</h2>
            {blobs.length === 0 ? (
                <p>暂无文件</p>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '20px',
                    marginTop: '20px'
                }}>
                    {blobs.map(blob => (
                        <div 
                            key={blob.url}
                            style={{
                                border: '1px solid #eaeaea',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s',
                                ':hover': {
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                }
                            }}
                        >
                            {blob.pathname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                <img
                                    src={blob.url}
                                    alt={blob.pathname}
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover',
                                        borderBottom: '1px solid #eaeaea'
                                    }}
                                />
                            ) : (
                                <video
                                    src={blob.url}
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover',
                                        borderBottom: '1px solid #eaeaea'
                                    }}
                                    controls
                                />
                            )}
                            <div style={{ padding: '15px' }}>
                                <a
                                    href={blob.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'block',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: '#0070f3',
                                        textDecoration: 'none',
                                        ':hover': {
                                            textDecoration: 'underline'
                                        }
                                    }}
                                >
                                    {blob.pathname}
                                </a>
                                <p style={{ 
                                    margin: '5px 0 0',
                                    fontSize: '12px',
                                    color: '#666'
                                }}>
                                    {new Date(blob.uploadedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div style={{ 
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h2 style={{ marginTop: 0 }}>WebDAV 访问</h2>
                <p>您可以使用任何 WebDAV 客户端连接到:</p>
                <div style={{ 
                    backgroundColor: '#fff',
                    padding: '15px',
                    borderRadius: '4px',
                    margin: '10px 0',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                }}>
                    <p><strong>服务器地址:</strong> https://{typeof window !== 'undefined' ? window.location.host : 'your-domain.vercel.app'}/api/webdav</p>
                    <p><strong>用户名:</strong> {process.env.NEXT_PUBLIC_WEBDAV_USERNAME || '需设置环境变量'}</p>
                    <p><strong>密码:</strong> ********</p>
                </div>
                <p style={{ fontSize: '14px', color: '#666' }}>
                    推荐客户端: Windows资源管理器、Mac Finder、Cyberduck、FileZilla等
                </p>
            </div>
        </div>
    );
}

export async function getServerSideProps() {
    try {
        const { blobs } = await list();
        return {
            props: {
                initialBlobs: blobs || []
            }
        };
    } catch (error) {
        console.error('Error fetching blobs:', error);
        return {
            props: {
                initialBlobs: []
            }
        };
    }
}

import crypto from 'crypto';

const parseCloudinaryUrl = () => {
    const raw = String(process.env.CLOUDINARY_URL || '').trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);
        const cloudName = url.hostname;
        const apiKey = decodeURIComponent(url.username || '');
        const apiSecret = decodeURIComponent(url.password || '');
        if (!cloudName || !apiKey || !apiSecret) return null;
        return { cloudName, apiKey, apiSecret };
    } catch {
        return null;
    }
};

const buildSignature = (params, apiSecret) => {
    const payload = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
};

export const uploadProfileImageToCloudinary = async (imageDataUrl) => {
    const credentials = parseCloudinaryUrl();
    if (!credentials) {
        throw new Error('Cloudinary is not configured on server');
    }
    if (!String(imageDataUrl || '').startsWith('data:image/')) {
        throw new Error('Invalid image payload');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'qfx-profiles';
    const signature = buildSignature({ folder, timestamp }, credentials.apiSecret);

    const formData = new FormData();
    formData.append('file', imageDataUrl);
    formData.append('api_key', credentials.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'Cloudinary upload failed');
    }

    return payload.secure_url;
};

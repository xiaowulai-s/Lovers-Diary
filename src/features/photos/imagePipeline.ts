import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

const MAX_EDGE = 1920;
const MAX_BYTES = 500 * 1024;
const THUMB_EDGE = 480;
const QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4, 0.35];

export type ProcessedPhoto = {
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
  sizeBytes: number;
};

async function renderJpeg(uri: string, maxEdge: number, compress: number) {
  const context = ImageManipulator.manipulate(uri, {
    maxWidth: maxEdge,
    maxHeight: maxEdge,
  });
  const image = await context.renderAsync();
  return image.saveAsync({ compress, format: SaveFormat.JPEG });
}

function fileSize(uri: string): number {
  return new File(uri).size;
}

export async function processPhotoAsset(asset: ImagePickerAsset): Promise<ProcessedPhoto> {
  const sourceEdge = Math.max(asset.width, asset.height);
  let edge = Math.min(MAX_EDGE, sourceEdge > 0 ? sourceEdge : MAX_EDGE);

  let result = await renderJpeg(asset.uri, edge, QUALITIES[0] ?? 0.8);
  let size = fileSize(result.uri);

  for (const quality of QUALITIES.slice(1)) {
    if (size <= MAX_BYTES) {
      break;
    }
    result = await renderJpeg(asset.uri, edge, quality);
    size = fileSize(result.uri);
  }

  while (size > MAX_BYTES && edge > 720) {
    edge = Math.round(edge * 0.85);
    result = await renderJpeg(asset.uri, edge, 0.35);
    size = fileSize(result.uri);
  }

  if (size > MAX_BYTES) {
    throw new Error('这张照片压缩后仍超过 500KB，请换一张试试。');
  }

  const thumb = await renderJpeg(result.uri, THUMB_EDGE, 0.6);

  return {
    uri: result.uri,
    thumbUri: thumb.uri,
    width: result.width,
    height: result.height,
    sizeBytes: size,
  };
}

const AVATAR_MAX_EDGE = 512;
const AVATAR_MAX_BYTES = 300 * 1024;

export type ProcessedAvatar = {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export async function processAvatarAsset(asset: ImagePickerAsset): Promise<ProcessedAvatar> {
  const sourceEdge = Math.max(asset.width, asset.height);
  let edge = Math.min(AVATAR_MAX_EDGE, sourceEdge > 0 ? sourceEdge : AVATAR_MAX_EDGE);

  let result = await renderJpeg(asset.uri, edge, 0.8);
  let size = fileSize(result.uri);

  for (const quality of QUALITIES.slice(1)) {
    if (size <= AVATAR_MAX_BYTES) {
      break;
    }
    result = await renderJpeg(asset.uri, edge, quality);
    size = fileSize(result.uri);
  }

  while (size > AVATAR_MAX_BYTES && edge > 160) {
    edge = Math.round(edge * 0.85);
    result = await renderJpeg(asset.uri, edge, 0.35);
    size = fileSize(result.uri);
  }

  if (size > AVATAR_MAX_BYTES) {
    throw new Error('头像压缩后仍然太大，请换一张图片试试。');
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    sizeBytes: size,
  };
}
